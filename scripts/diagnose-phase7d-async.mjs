/** Isolated causal diagnostics; never changes the formal acceptance oracle or product sources. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const group=process.env.DIAGNOSTIC_GROUP||'A',engines=(process.env.BROWSERS||'chromium,webkit').split(','),cases=(process.env.DIAGNOSTIC_CASES||'swipe,status').split(','),repeats=Number(process.env.DIAGNOSTIC_REPEATS||3);
assert.ok(['A','B','C'].includes(group));assert.ok(engines.length&&engines.every(x=>['chromium','webkit'].includes(x)));assert.ok(cases.length&&cases.every(x=>['swipe','status'].includes(x)));assert.equal(new Set(engines).size,engines.length);assert.equal(new Set(cases).size,cases.length);assert.ok(Number.isInteger(repeats)&&repeats>=1&&repeats<=20);
const buildDir=path.resolve(process.env.DIAGNOSTIC_BUILD_DIR||'out'),dest=path.resolve(process.env.EVIDENCE_DIR||'work/phase7d-causal',`${group}-${new Date().toISOString().replaceAll(':','-')}`);
await fs.mkdir(dest,{recursive:true});const hash=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const report={schemaVersion:1,group,status:'RUNNING',head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:git('status','--porcelain'),os:{platform:process.platform,release:os.release(),arch:process.arch},nodeVersion:process.version,playwrightVersion:require((process.env.PLAYWRIGHT_MODULE||'playwright')+'/package.json').version,runnerSha256:hash(await fs.readFile(new URL(import.meta.url))),buildDir,buildManifest:null,started:new Date().toISOString(),expected:engines.length*cases.length*repeats,expectedTrials:engines.length*cases.length*repeats,trials:[],files:[],limitations:['Diagnostic completion is not product acceptance.','Fresh browser/context per trial; original per-work prefix retained, navigation/other-work prefixes omitted because original used fresh contexts per work.','A has no added in-page instrumentation, but tracing, screenshots and original DOM assertions are shared observations. A internal boundaries are UNKNOWN.','B/C observations can change scheduling. Pairing is not proof of causal noninterference.','Browser captured-native Date is a pre-install function reference; host monotonic time is separate and not a synchronized clock.','Timer registration probe is after native registration. Its timestamp plus delay is a calculated deadline approximation, not native deadline measurement.','Physical Safari, VoiceOver and physical input NOT_TESTED.']};
if(process.env.DIAGNOSTIC_BUILD_MANIFEST){const b=await fs.readFile(process.env.DIAGNOSTIC_BUILD_MANIFEST);report.buildManifest={sha256:hash(b),data:JSON.parse(b)};assert.equal(report.buildManifest.data.group,group,'build group');assert.equal(report.buildManifest.data.success,true,'build success');assert.equal(report.buildManifest.data.originalSourcePreserved,true,'product preservation');}
assert.ok(report.buildManifest,'DIAGNOSTIC_BUILD_MANIFEST is required');
const provenance=report.buildManifest.data;
assert.equal(provenance.head,report.head,'build HEAD');assert.equal(provenance.tree,report.tree,'build tree');
assert.ok(Object.keys(provenance.sourceHashes||{}).length>0,'source hashes required');
for(const [file,digest] of Object.entries(provenance.sourceHashes)){
 assert.equal(hash(await fs.readFile(file)),digest,`source changed since build: ${file}`);
 if(file.startsWith('app/'))assert.equal(hash(execFileSync('git',['show',`181dd9710fbb04e49081bb64761b533e061cc28c:${file}`])),digest,`product baseline changed: ${file}`);
}
const walk=async(dir,prefix='')=>{const all=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const n=prefix+e.name;if(e.isDirectory())all.push(...await walk(path.join(dir,e.name),n+'/'));else{assert.ok(e.isFile(),`unexpected output type ${n}`);all.push(n);}}return all.sort();};
assert.deepEqual(await walk(buildDir),Object.keys(provenance.outputHashes||{}).sort(),'output file inventory');
for(const [file,digest] of Object.entries(provenance.outputHashes))assert.equal(hash(await fs.readFile(path.join(buildDir,file))),digest,`output hash: ${file}`);
report.provenanceVerified=true;
const save=async(name,b)=>{await fs.writeFile(path.join(dest,name),b);const item={kind:name.endsWith('.png')?'png':name.endsWith('.zip')?'trace':'json',name,sha256:hash(b)};report.files.push(item);return item;};
const server=spawn(process.execPath,['scripts/serve-static-export.mjs',buildDir],{stdio:['ignore','pipe','pipe']});let serverError='';server.stderr.on('data',b=>serverError+=String(b));
let url;
try{const [b]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`server exited ${code}: ${serverError}`);})]);url=String(b).trim();
for(const engine of engines)for(const kind of cases)for(let iteration=1;iteration<=repeats;iteration++){
 const id=`${engine}-${kind}-${group}-${iteration}`,width=kind==='swipe'?765:375,expected=kind==='swipe'?'dismissed':'Error';
 const t={id,engine,browserVersion:null,group,case:kind,iteration,viewport:{width,height:1000},motion:'no-preference',clock:'playwright-virtual',targetOperationId:`${id}:target`,diagnosticStatus:'INCOMPLETE',productStatus:'NOT_TESTED',targetReached:false,expected,observed:null,internalObservability:group==='A'?'UNKNOWN':group==='B'?'MINIMAL':'DETAILED',steps:[],events:[],errors:[],files:[]};report.trials.push(t);
 let browser,context,page,root,stage;let traceStarted=false;
 const step=async(phase,extra={})=>{const row={seq:t.steps.length+1,phase,hostMonotonicMs:performance.now(),hostUtc:new Date().toISOString(),...extra};if(group!=='A'&&page){row.browser=await page.evaluate(({phase,kind})=>{const d=window.__PHASE7D_DIAGNOSTIC__;if(d&&phase==='target-input-before')d.operationId=d.trialId+':target';return {virtualDateMs:Date.now(),virtualPerformanceMs:performance.now(),domState:document.querySelector(`[data-testid="${kind==='swipe'?'swipe-to-dismiss':'status-morph'}"]`)?.getAttribute('data-state')??null};},{phase,kind});}t.steps.push(row);};
 const advance=async(ms,label)=>{await step(`${label}-runFor-before`,{milliseconds:ms});await page.clock.runFor(ms);await step(`${label}-runFor-after`,{milliseconds:ms});};
 const check=async(value,label)=>{const actual=await root.getAttribute('data-state');await step(`${label}:assert`,{expected:value,observed:actual});assert.equal(actual,value,label);};
 try{
  await step('launch');browser=await pw[engine].launch({headless:true,...(engine==='webkit'&&process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{})});t.browserVersion=browser.version();
  context=await browser.newContext({viewport:t.viewport,reducedMotion:t.motion,hasTouch:true});await context.tracing.start({screenshots:true,snapshots:true});traceStarted=true;page=await context.newPage();page.setDefaultTimeout(9000);page.on('pageerror',e=>t.errors.push(String(e)));
  if(group!=='A')await page.addInitScript(({group,trialId})=>{const nativeDateNow=Date.now.bind(Date);const d={group,trialId,operationId:'setup',events:[],overflow:false};window.__PHASE7D_DIAGNOSTIC__=d;window.__phase7dDiagnosticEmit=event=>{if(d.events.length>=20000){d.overflow=true;return;}d.events.push({...event,seq:d.events.length+1,operationId:d.operationId,virtualDateMs:Date.now(),virtualPerformanceMs:performance.now(),capturedNativeDateMs:nativeDateNow()});};if(group==='C')for(const name of ['pointerdown','pointerup','pointercancel','lostpointercapture','keydown','keyup','click','change'])document.addEventListener(name,e=>{window.__phase7dDiagnosticEmit({work:'delivery',phase:'event-delivery',event:name,trusted:e.isTrusted,target:e.target instanceof Element?e.target.getAttribute('aria-label')||e.target.textContent?.slice(0,100):null});},true);},{group,trialId:id});
  await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
  const exhibit=kind==='swipe'?'swipe-dismiss':'status-morph';await page.goto(url+`#modern-exhibit-${exhibit}`);stage=page.locator(`#modern-exhibit-${exhibit}`);root=stage.getByTestId(kind==='swipe'?'swipe-to-dismiss':'status-morph');await root.waitFor();await root.scrollIntoViewIfNeeded();
  assert.equal(await stage.locator('details[open]').count(),0);await stage.locator('summary').first().click();await stage.getByText('仕組みを見る',{exact:true}).click();assert.equal(await stage.locator('details[open]').count(),2);
  const button=name=>stage.getByRole('button',{name,exact:true});
  await step('clock-install-before');await page.clock.install();await step('clock-install-after');const pauseAt=await page.evaluate(()=>Date.now()+1000);await step('clock-pause-before',{requestedVirtualDateMs:pauseAt});await page.clock.pauseAt(pauseAt);await step('clock-pause-after');
  if(kind==='swipe'){
   const target=stage.getByRole('button',{name:'スワイプするカード'});await step('keyboard-prefix-before');await target.focus();await page.keyboard.press('ArrowRight');await advance(500,'keyboard-prefix');await check('dismissed','keyboard-prefix');await button('Undo').click();await check('idle','undo-prefix');await advance(300,'css-return-prefix');await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();assert.ok(b);await step('target-input-before',{rectangle:b});await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+130,b.y+b.height/2,{steps:8});await page.mouse.up();await step('target-input-after');await advance(500,'target');
  }else{
   await step('keyboard-prefix-before');await button('模擬処理を開始').focus();await page.keyboard.press('Enter');await check('Loading','prefix-start');await button('取消').click();await advance(4000,'cancel-prefix');await check('Cancelled','cancel-prefix');await button('Replay').click();await advance(3000,'success-prefix');await check('Success','success-prefix');await stage.getByLabel('模擬結果',{exact:true}).selectOption('Error');await step('target-input-before');await button('Replay').click();await step('target-replay-2-before');await button('Replay').click();await step('target-input-after');await advance(3000,'target');
  }
  // No polling or extra virtual-clock advancement: preserve the immediate formal assertion.
  await step('final-read-before');t.observed=await root.getAttribute('data-state');t.targetReached=true;await step('final-read-after',{expected,observed:t.observed});t.productStatus=t.observed===expected&&t.errors.length===0?'PASS':'FAIL';
 }catch(e){t.error=String(e.stack||e);if(t.targetReached)t.productStatus='FAIL';}
 finally{
  if(page){if(group!=='A'){try{const d=await page.evaluate(()=>window.__PHASE7D_DIAGNOSTIC__);t.events=d?.events??[];t.observerOverflow=d?.overflow??false;}catch(e){t.evidenceError=String(e);}}
   try{t.files.push(await save(`${id}.png`,await page.screenshot()));}catch(e){t.screenshotError=String(e);}
  }
  if(context&&traceStarted){try{const name=`${id}-trace.zip`;await context.tracing.stop({path:path.join(dest,name)});const b=await fs.readFile(path.join(dest,name));const f={kind:'trace',name,sha256:hash(b)};report.files.push(f);t.files.push(f);}catch(e){t.traceError=String(e);}}
  await context?.close().catch(e=>{t.closeError=String(e);});await browser?.close().catch(e=>{t.closeError=String(e);});
  t.diagnosticStatus=t.targetReached&&!t.traceError&&!t.screenshotError&&!t.evidenceError&&!t.observerOverflow?'COMPLETE':'INCOMPLETE';
  if(t.diagnosticStatus==='INCOMPLETE'&&t.productStatus==='PASS')t.productStatus='NOT_TESTED';
  await save(`${id}.json`,JSON.stringify(t,null,2));await fs.writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2));console.log(`${id}: diagnostic=${t.diagnosticStatus} product=${t.productStatus} ${t.observed??t.error??''}`);
 }
}
report.status=report.trials.length===report.expected&&report.trials.every(t=>t.diagnosticStatus==='COMPLETE')?'COMPLETE':'PARTIAL';
}catch(e){report.status='FAILED';report.error=String(e.stack||e);process.exitCode=1;}finally{server.kill();report.finished=new Date().toISOString();await fs.writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2));const raw=await fs.readFile(path.join(dest,'report.json'));await fs.writeFile(path.join(dest,'manifest.json'),JSON.stringify({schemaVersion:1,report:{name:'report.json',sha256:hash(raw)},files:report.files},null,2));console.log(`Evidence ${dest}`);}
if(report.status!=='COMPLETE')process.exitCode=1;
