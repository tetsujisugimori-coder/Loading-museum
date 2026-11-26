import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {writeFileSync,appendFileSync,readFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import {boundaryContract,chooseValidationTrials,digest} from './phase7d-boundary-contract.mjs';
import {boundaryInitScript} from './phase7d-boundary-instrument.mjs';
/** Immutable retry binding includes every previous evidence file, not only its registration. */
export async function captureBoundaryRetry(previous) {
 const root=path.resolve(previous),inventory={};
 assert.ok((await fs.lstat(root)).isDirectory(),'retry predecessor must be a directory');
 async function walk(dir,prefix='') {
  for(const name of (await fs.readdir(dir)).sort()) {
   const absolute=path.join(dir,name),relative=prefix+name,stat=await fs.lstat(absolute);
   assert.ok(!stat.isSymbolicLink(),'retry evidence symlink rejected: '+relative);
   if(stat.isDirectory())await walk(absolute,relative+'/');
   else {assert.ok(stat.isFile(),'retry evidence must be regular file: '+relative);inventory[relative]=digest(await fs.readFile(absolute));}
  }
 }
 await walk(root);
 assert.ok(inventory['registration.json'],'retry predecessor registration missing');
 const registrationBytes=await fs.readFile(path.join(root,'registration.json'));assert.equal(digest(registrationBytes),inventory['registration.json'],'retry registration changed while snapshotting');
 const registration=JSON.parse(registrationBytes);
 assert.equal(registration.mode,'validation','retry predecessor mode');
 assert.equal(registration.productionTrialsExecuted,0,'retry predecessor production forbidden');
 return {path:root,registrationSha256:inventory['registration.json'],inventory,inventorySha256:digest(JSON.stringify(inventory))};
}
export function recoverBoundaryAttempts(dest) {
 if(!existsSync(dest))return [];
 return readdirSync(dest,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.startsWith('attempt-')).map(e=>{
  const dir=path.join(dest,e.name),read=n=>existsSync(path.join(dir,n))?JSON.parse(readFileSync(path.join(dir,n),'utf8')):null;
  return {attempt:e.name,registration:read('attempt.json'),primary:read('primary.json'),completion:read('trial.json'),status:existsSync(path.join(dir,'trial.json'))?'RECORDED':'INTERRUPTED'};
 });
}
export function reserveBoundaryAttempt(dest,registration) {
 mkdirSync(dest,{recursive:true});
 for(let n=1;n<100000;n++){const name=`attempt-${String(n).padStart(5,'0')}`;try{mkdirSync(path.join(dest,name));writeFileSync(path.join(dest,name,'attempt.json'),JSON.stringify(registration,null,2),{flag:'wx'});return {name,dir:path.join(dest,name)};}catch(e){if(e.code!=='EEXIST')throw e;}}
 throw Error('attempt limit exceeded');
}
async function main(){
 if(process.env.BOUNDARY_MODE!=='validation')throw Error('Production108 disabled. BOUNDARY_MODE=validation required.');
 const group=process.env.BOUNDARY_GROUP??'A';assert.ok(['A','B','C'].includes(group));
 const ids=JSON.parse(process.env.BOUNDARY_VALIDATION_IDS??'[]'),plan=chooseValidationTrials(ids,group);
 const require=createRequire(import.meta.url),modulePath=process.env.PLAYWRIGHT_MODULE||'playwright',pw=require(modulePath);
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
 const buildDir=path.resolve(process.env.BOUNDARY_BUILD_DIR),manifestPath=path.resolve(process.env.BOUNDARY_BUILD_MANIFEST);
 const dest=path.resolve(process.env.BOUNDARY_EVIDENCE_DIR);assert.ok(path.basename(dest).startsWith('validation-'),'explicit validation-* output required');
 if(process.env.BOUNDARY_RETRY_OF){const prior=path.resolve(process.env.BOUNDARY_RETRY_OF);assert.ok(dest!==prior&&!dest.startsWith(prior+path.sep)&&!prior.startsWith(dest+path.sep),'retry output and predecessor must be separate non-nested directories');}
 await fs.mkdir(dest,{recursive:true});
 const manifestBytes=await fs.readFile(manifestPath),build=JSON.parse(manifestBytes),head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
 assert.equal(build.group,group);assert.equal(build.head,head);assert.equal(build.tree,tree);assert.equal(build.success,true);assert.equal(build.originalSourcePreserved,true);
 assert.ok(Object.keys(build.outputHashes??{}).length,'nonempty build outputs');
 for(const [file,hash] of Object.entries(build.sourceHashes??{}))assert.equal(digest(await fs.readFile(file)),hash,'source bytes: '+file);
 for(const [file,hash] of Object.entries(build.outputHashes))assert.equal(digest(await fs.readFile(path.join(buildDir,file))),hash,'build bytes: '+file);
 const sourceHashes={};for(const file of ['scripts/phase7d-boundary-plan.mjs','scripts/phase7d-boundary-contract.mjs','scripts/phase7d-boundary-instrument.mjs','scripts/diagnose-phase7d-boundary.mjs','scripts/phase7d-api-plan.mjs','scripts/phase7d-api-trace-spec.mjs','scripts/audit-phase7d-boundary.mjs','scripts/prepare-phase7d-boundary.mjs'])sourceHashes[file]=digest(await fs.readFile(file));
 const registration={schemaVersion:1,mode:'validation',head,tree,validationPlan:plan.map((p,i)=>({...p,validationId:`validation-${p.id}`,attempt:`attempt-${String(i+1).padStart(5,'0')}`})),expectedAttempts:plan.length,retryOf:process.env.BOUNDARY_RETRY_OF?await captureBoundaryRetry(process.env.BOUNDARY_RETRY_OF):null,contract:boundaryContract,contractSha256:digest(JSON.stringify(boundaryContract)),sourceHashes,buildManifestSha256:digest(manifestBytes),slots:boundaryContract.allocation.map(p=>({...p,status:'NOT_EXECUTED'})),productionTrialsExecuted:0};
 const regBytes=JSON.stringify(registration,null,2),regPath=path.join(dest,'registration.json');
 assert.ok(!existsSync(regPath),'existing registration cannot be rerun: recover existing evidence; retry uses a new validation output with BOUNDARY_RETRY_OF');writeFileSync(regPath,regBytes,{flag:'wx'});
 const reserved=plan.map((p,i)=>{const a=reserveBoundaryAttempt(dest,{mode:'validation',plannedId:p.id,validationId:`validation-${p.id}`,head,tree,registeredAt:new Date().toISOString(),contractSha256:registration.contractSha256,buildManifestSha256:registration.buildManifestSha256});assert.equal(a.name,registration.validationPlan[i].attempt);return a;});
 if(!existsSync(path.join(dest,'build-manifest.json')))writeFileSync(path.join(dest,'build-manifest.json'),manifestBytes,{flag:'wx'});
 const server=spawn(process.execPath,['scripts/serve-static-export.mjs',buildDir],{stdio:['ignore','pipe','pipe'],windowsHide:true});let serverError='';server.stderr.on('data',x=>serverError+=x);let url;let incomplete=false;
 try{
 const [bytes]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`server exited ${code}: ${serverError}`);})]);url=String(bytes).trim();
 for(const [plannedIndex,planned] of plan.entries()){
 const {engine,case:kind,id}=planned,target=boundaryContract.targets[kind];
 const attempt=reserved[plannedIndex];
 const t={...planned,id:`validation-${id}`,plannedId:id,attempt:attempt.name,mode:'validation',head,tree,expected:target.expected,viewport:{width:target.width,height:1000},motion:target.motion,primary:null,evidenceStatus:'INCOMPLETE',diagnosticStatus:'INCOMPLETE',apis:[],pageErrors:[],files:[],started:new Date().toISOString(),contractSha256:registration.contractSha256,buildSha256:registration.buildManifestSha256};
 let browser,context,page,root,stage,traceStarted=false,virtualDate=null;
 const journal=(kind,data)=>appendFileSync(path.join(attempt.dir,'journal.jsonl'),JSON.stringify({kind,hostUtc:new Date().toISOString(),hostMs:performance.now(),...data})+'\n');
 const api=async(name,fn,extra={})=>{const a={seq:t.apis.length+1,name,hostStartMs:performance.now(),hostUtcStart:new Date().toISOString(),commandedVirtualDateMs:virtualDate,...extra};t.apis.push(a);journal('api-start',a);try{const result=await fn();a.status='OK';if(result===null||['string','number','boolean'].includes(typeof result))a.result=result;return result;}catch(e){a.status='ERROR';a.error=String(e);throw e;}finally{a.hostEndMs=performance.now();journal('api-end',a);}};
 const advance=async(ms,label)=>{const before=virtualDate;await api(`${label}.clock.runFor`,()=>page.clock.runFor(ms),{milliseconds:ms,virtualBeforeMs:before,virtualAfterMs:before+ms});virtualDate+=ms;};
 const check=async(expected,label)=>{const observed=await api(`${label}.getAttribute`,()=>root.getAttribute('data-state'));if(observed!==expected)t.prefixFailure={apiSeq:t.apis.length,label,expected,observed};assert.equal(observed,expected,label);};
 try{
      browser=await api('browser.launch',()=>pw[engine].launch({headless:true,...(engine==='webkit'&&process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{})}));t.browserVersion=browser.version();
      context=await api('browser.newContext',()=>browser.newContext({viewport:t.viewport,reducedMotion:t.motion,hasTouch:true}));
      await api('context.tracing.start',()=>context.tracing.start(boundaryContract.trace));traceStarted=true;
      page=await api('context.newPage',()=>context.newPage());page.setDefaultTimeout(9000);page.on('pageerror',e=>t.pageErrors.push({error:String(e),hostMonotonicMs:performance.now(),commandedVirtualDateMs:virtualDate}));
      await api('page.addInitScript',()=>page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen')));
      if(group!=='A')await api('boundary.addInitScript',()=>page.addInitScript(boundaryInitScript,{trialId:t.id,operationId:'whole-trial',limit:4096}));
      const exhibit=kind==='swipe'?'swipe-dismiss':'status-morph';
      t.url=url+`#modern-exhibit-${exhibit}`;await api('page.goto',()=>page.goto(t.url));stage=page.locator(`#modern-exhibit-${exhibit}`);root=stage.getByTestId(kind==='swipe'?'swipe-to-dismiss':'status-morph');
      await api('root.waitFor',()=>root.waitFor());await api('root.scrollIntoViewIfNeeded',()=>root.scrollIntoViewIfNeeded());
      assert.equal(await api('details.closed.count',()=>stage.locator('details[open]').count()),0);
      await api('summary.click',()=>stage.locator('summary').first().click());await api('mechanism.click',()=>stage.getByText('仕組みを見る',{exact:true}).click());assert.equal(await api('details.open.count',()=>stage.locator('details[open]').count()),2);
      const button=name=>stage.getByRole('button',{name,exact:true});
      await api('clock.install',()=>page.clock.install());const pauseAt=await api('clock.origin.evaluate',()=>page.evaluate(()=>Date.now()+1000));t.clockOrigin={requestedPauseAtMs:pauseAt,browserDateObservedMs:pauseAt-1000};
      await api('clock.pauseAt',()=>page.clock.pauseAt(pauseAt),{requestedVirtualDateMs:pauseAt});virtualDate=pauseAt;
      if(kind==='swipe') {
        const card=stage.getByRole('button',{name:'スワイプするカード'});
        await api('prefix.card.focus',()=>card.focus());await api('prefix.keyboard.ArrowRight',()=>page.keyboard.press('ArrowRight'));await advance(500,'keyboard-prefix');await check('dismissed','keyboard-prefix');
        await api('prefix.Undo.click',()=>button('Undo').click());await check('idle','undo-prefix');await advance(300,'css-return-prefix');await api('prefix.card.scrollIntoViewIfNeeded',()=>card.scrollIntoViewIfNeeded());
        const rect=await api('target.card.boundingBox',()=>card.boundingBox());assert.ok(rect);t.inputRectangle=rect;
        await api('target.mouse.move.start',()=>page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2));await api('target.mouse.down',()=>page.mouse.down());await api('target.mouse.move.drag',()=>page.mouse.move(rect.x+rect.width/2+130,rect.y+rect.height/2,{steps:8}));await api('target.mouse.up',()=>page.mouse.up());
      } else {
        await api('prefix.start.focus',()=>button('模擬処理を開始').focus());await api('prefix.keyboard.Enter',()=>page.keyboard.press('Enter'));await check('Loading','prefix-start');await api('prefix.cancel.click',()=>button('取消').click());await advance(4000,'cancel-prefix');await check('Cancelled','cancel-prefix');
        await api('prefix.Replay.click',()=>button('Replay').click());await advance(3000,'success-prefix');await check('Success','success-prefix');await api('target.result.selectOption',()=>stage.getByLabel('模擬結果',{exact:true}).selectOption('Error'));
        await api('target.Replay.first.click',()=>button('Replay').click());await api('target.Replay.second.click',()=>button('Replay').click());
      }
      await advance(target.advance,'target');
      // Same original getAttribute API in ALL groups. No clock sampling, extra browser API or await between these two calls.
      const state=await api('primary.getAttribute',()=>root.getAttribute('data-state'));
 t.primary=Object.freeze({apiSeq:t.apis.length,state,verdict:state===target.expected?'PASS':'FAIL'});
 const primaryBytes=JSON.stringify({id:t.id,plannedId:id,attempt:attempt.name,head,tree,contractSha256:t.contractSha256,primary:t.primary},null,2);
 writeFileSync(path.join(attempt.dir,'primary.json'),primaryBytes,{flag:'wx'});
 t.primaryFile={name:'primary.json',sha256:digest(primaryBytes)};journal('primary-persisted',{sha256:t.primaryFile.sha256});
 if(group!=='A'){t.instrumentation=await api('boundary.collect',()=>page.evaluate(()=>window.__phase7dBoundary));if(!t.instrumentation?.installed||t.instrumentation.overflow||t.instrumentation.errors?.length)throw Error('instrumentation missing/overflow/error');}
 }catch(e){t.error=String(e.stack||e);}finally{
 if(context&&traceStarted)try{await api('context.tracing.stop',()=>context.tracing.stop({path:path.join(attempt.dir,'trace.zip')}));t.files.push({name:'trace.zip',kind:'trace',sha256:digest(await fs.readFile(path.join(attempt.dir,'trace.zip')))});}catch(e){t.error??=String(e);}
 if(context)try{await api('context.close',()=>context.close());}catch(e){t.error??=String(e);}
 if(browser)try{await api('browser.close',()=>browser.close());}catch(e){t.error??=String(e);}
 t.evidenceStatus=t.primary&&!t.error&&!t.pageErrors.length&&t.apis.every(a=>a.status==='OK')?'COMPLETE':'INCOMPLETE';t.diagnosticStatus=t.evidenceStatus;t.productStatus=t.pageErrors.length?'FAIL':t.primary?.verdict??'NOT_TESTED';t.finished=new Date().toISOString();
 if(t.evidenceStatus!=='COMPLETE')incomplete=true;
 writeFileSync(path.join(attempt.dir,'trial.json'),JSON.stringify(t,null,2),{flag:'wx'});
 const hashes={};for(const file of await fs.readdir(attempt.dir))hashes[file]=digest(await fs.readFile(path.join(attempt.dir,file)));writeFileSync(path.join(attempt.dir,'manifest.json'),JSON.stringify({schemaVersion:1,files:hashes},null,2),{flag:'wx'});
 console.log(JSON.stringify({attempt:attempt.name,id:t.id,primary:t.productStatus,evidence:t.evidenceStatus,error:t.error}));
 }
 }
 }finally{server.kill();}
 if(incomplete)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1;});
