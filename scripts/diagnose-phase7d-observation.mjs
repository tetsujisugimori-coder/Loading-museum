/** A1/A2/A3 follow-up to diagnose-phase7d-async. Product and formal oracle are unchanged. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import {observationPlan,observationPolicy,targets} from './phase7d-observation-plan.mjs';
import {digest} from './phase7d-observation-contract.mjs';
const require=createRequire(import.meta.url),modulePath=process.env.PLAYWRIGHT_MODULE||'playwright',pw=require(modulePath);
const engines=(process.env.BROWSERS||'webkit,chromium').split(','),plan=observationPlan(engines),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const buildDir=path.resolve(process.env.DIAGNOSTIC_BUILD_DIR||'out');
const dest=path.resolve(process.env.EVIDENCE_DIR||'work/phase7d-observation',`${engines.join('-')}-${new Date().toISOString().replaceAll(':','-')}`);
await fs.mkdir(path.dirname(dest),{recursive:true});await fs.mkdir(dest); // Never overwrite a prior attempt.
const manifestBytes=await fs.readFile(process.env.DIAGNOSTIC_BUILD_MANIFEST);
const report={schemaVersion:2,status:'RUNNING',head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:git('status','--porcelain'),os:{platform:process.platform,release:os.release(),arch:process.arch},nodeVersion:process.version,playwrightVersion:require(modulePath+'/package.json').version,runnerId:process.env.GITHUB_RUN_ID?`github:${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT}:${process.env.GITHUB_JOB}:${engines.join(',')}`:`local:${os.hostname()}:${process.pid}`,runnerSha256:digest(await fs.readFile(new URL(import.meta.url))),buildDir,buildManifest:{sha256:digest(manifestBytes),data:JSON.parse(manifestBytes)},policy:observationPolicy,plan,planSha256:digest(JSON.stringify(plan)),expectedTrials:plan.length,trials:[],files:[],started:new Date().toISOString(),limitations:['Diagnostic COMPLETE is not product PASS or causal identification.','A1/A2/A3 all use unmodified A product build. No timer/React/commit probe is installed. H1/H2/H3 remain unobserved in failed trials.','Host monotonic time and browser commanded virtual-date ledger are distinct; no cross-clock conversion. Browser clock is directly read only at the original pause-origin operation.','Shared trace records API calls only, without automatic screencast, DOM snapshots, or sources. This differs from old A/B/C trace policy; do not pool those failure rates.','A1 has no post-primary DOM or image acquisition. Trace finalization and browser closure remain shared lifecycle operations.','A2/A3 secondary API calls may advance real-browser processing. No additional virtual advance or arbitrary wait. Group differences are not automatically causal proof.','Within-engine groups share one runner/build and balanced order; engine comparisons may be across separate runners. Fresh browser/context each trial does not imply OS caches are reset.','Physical Safari, VoiceOver and physical input NOT_TESTED.']};
const b=report.buildManifest.data;assert.equal(b.group,'A');assert.equal(b.success,true);assert.equal(b.originalSourcePreserved,true);assert.equal(b.head,report.head);assert.equal(b.tree,report.tree);
for(const [file,sha] of Object.entries(b.sourceHashes)) {assert.equal(digest(await fs.readFile(file)),sha,`source binding ${file}`);if(file.startsWith('app/'))assert.equal(digest(execFileSync('git',['show',`6653ec725ba61ab3c47c5725678ad25f0479e375:${file}`])),sha,`unchanged product ${file}`);}
async function walk(dir,prefix=''){const names=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const n=prefix+e.name;if(e.isDirectory())names.push(...await walk(path.join(dir,e.name),n+'/'));else{assert.ok(e.isFile());names.push(n);}}return names.sort();}
assert.deepEqual(await walk(buildDir),Object.keys(b.outputHashes).sort());for(const [file,sha]of Object.entries(b.outputHashes))assert.equal(digest(await fs.readFile(path.join(buildDir,file))),sha,`output binding ${file}`);
const save=async(name,bytes,kind='json')=>{await fs.writeFile(path.join(dest,name),bytes);const f={name,kind,sha256:digest(bytes)};report.files.push(f);return f;};
const flush=async()=>{const bytes=JSON.stringify(report,null,2);await fs.writeFile(path.join(dest,'report.json'),bytes);await fs.writeFile(path.join(dest,'manifest.json'),JSON.stringify({schemaVersion:2,report:{name:'report.json',sha256:digest(bytes)},files:report.files},null,2));};
await save('diagnostic-build.json',manifestBytes);
await save('plan.json',JSON.stringify({schemaVersion:2,head:report.head,tree:report.tree,policy:observationPolicy,plan,planSha256:report.planSha256},null,2));await flush();
const server=spawn(process.execPath,['scripts/serve-static-export.mjs',buildDir],{stdio:['ignore','pipe','pipe']});let serverError='';server.stderr.on('data',x=>serverError+=x);let url;
try {
  const [bytes]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`server exited ${code}: ${serverError}`);})]);url=String(bytes).trim();
  for(const planned of plan) {
    const {engine,case:kind,group,id}=planned,target=targets[kind];
    const t={...planned,head:report.head,tree:report.tree,planSha256:report.planSha256,buildSha256:report.buildManifest.sha256,expected:target.expected,viewport:{width:target.width,height:1000},motion:'no-preference',browserVersion:null,primary:null,diagnosticStatus:'INCOMPLETE',productStatus:'NOT_TESTED',apis:[],pageErrors:[],files:[],started:new Date().toISOString()};report.trials.push(t);
    let browser,context,page,root,stage,traceStarted=false,virtualDate=null,png=null;
    const api=async(name,fn,extra={})=>{const a={seq:t.apis.length+1,name,hostStartMs:performance.now(),hostUtcStart:new Date().toISOString(),commandedVirtualDateMs:virtualDate,...extra};t.apis.push(a);try{const result=await fn();a.status='OK';if(result===null||['string','number','boolean'].includes(typeof result))a.result=result;return result;}catch(e){a.status='ERROR';a.error=String(e);throw e;}finally{a.hostEndMs=performance.now();a.hostUtcEnd=new Date().toISOString();}};
    const advance=async(ms,label)=>{const before=virtualDate;await api(`${label}.clock.runFor`,()=>page.clock.runFor(ms),{milliseconds:ms,virtualBeforeMs:before,virtualAfterMs:before+ms});virtualDate+=ms;};
    const check=async(expected,label)=>assert.equal(await api(`${label}.getAttribute`,()=>root.getAttribute('data-state')),expected,label);
    try {
      browser=await api('browser.launch',()=>pw[engine].launch({headless:true,...(engine==='webkit'&&process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{})}));t.browserVersion=browser.version();
      context=await api('browser.newContext',()=>browser.newContext({viewport:t.viewport,reducedMotion:t.motion,hasTouch:true}));
      await api('context.tracing.start',()=>context.tracing.start(observationPolicy.trace));traceStarted=true;
      page=await api('context.newPage',()=>context.newPage());page.setDefaultTimeout(9000);page.on('pageerror',e=>t.pageErrors.push({error:String(e),hostMonotonicMs:performance.now(),commandedVirtualDateMs:virtualDate}));
      await api('page.addInitScript',()=>page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen')));
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
      if(group==='A2')for(let i=0;i<4;i++)await api('secondary.getAttribute',()=>root.getAttribute('data-state'),{secondaryIndex:i+1});
      if(group==='A3') {
        await api('before-image.getAttribute',()=>root.getAttribute('data-state'));
        png=await api('page.screenshot',()=>page.screenshot());
        await api('after-image.getAttribute',()=>root.getAttribute('data-state'));
      }
    } catch(e) {t.error=String(e.stack||e);}
    finally {
      // Do not take failure-only screenshots or DOM reads; preserve failure by exactly the assigned policy.
      if(context&&traceStarted)try{const name=`${id}-trace.zip`;await api('context.tracing.stop',()=>context.tracing.stop({path:path.join(dest,name)}));t.files.push(await save(name,await fs.readFile(path.join(dest,name)),'trace'));}catch(e){t.error??=String(e.stack||e);}
      if(context)try{await api('context.close',()=>context.close());}catch(e){t.error??=String(e);}
      if(browser)try{await api('browser.close',()=>browser.close());}catch(e){t.error??=String(e);}
      if(png)t.files.push(await save(`${id}.png`,png,'png'));
      t.diagnosticStatus=t.primary&&!t.error&&t.apis.every(a=>a.status==='OK')?'COMPLETE':'INCOMPLETE';
      t.productStatus=t.primary?.verdict==='FAIL'||t.pageErrors.length?'FAIL':t.primary?.verdict==='PASS'&&t.diagnosticStatus==='COMPLETE'?'PASS':'NOT_TESTED';t.finished=new Date().toISOString();
      await save(`${id}.json`,JSON.stringify(t,null,2));await flush();console.log(`${id}: diagnostic=${t.diagnosticStatus} primary=${t.primary?.verdict??'NOT_TESTED'} product=${t.productStatus} state=${t.primary?.state??'UNKNOWN'}`);
    }
  }
  report.status=report.trials.length===plan.length&&report.trials.every(t=>t.diagnosticStatus==='COMPLETE')?'COMPLETE':'PARTIAL';
} catch(e) {report.status='PARTIAL';report.error=String(e.stack||e);}
finally {server.kill();report.finished=new Date().toISOString();await flush();console.log(`Evidence ${dest}`);}
if(report.status!=='COMPLETE')process.exitCode=1;
