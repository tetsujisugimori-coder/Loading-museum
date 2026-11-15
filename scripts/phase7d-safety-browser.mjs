import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {capture,sha256} from './phase7d-safety-provenance.mjs';
import {safetyPlan,validateSafetySummary} from './phase7d-safety-result-contract.mjs';
const writeExclusive = (file,value) => fs.writeFileSync(file, JSON.stringify(value,null,2)+'\n', {flag:'wx'});
const errorText = error => String(error?.stack || error);
const nonempty = file => {const s=fs.statSync(file);assert.ok(s.isFile()&&s.size>0, 'missing/empty evidence: '+file);};
export async function runSafetyPlan({dest, head, tree, manifest, pw, base, environment,
  writeJson=writeExclusive, stderr=message=>process.stderr.write(message+'\n'), initialError=null}) {
  const results=safetyPlan.map(row=>({...row,head,tree,attempted:false,status:'NOT_TESTED',
    stopReason:'not started',observation:{status:'NOT_TESTED'},operationError:null,
    cleanupErrors:[],persistenceErrors:[],evidence:{trace:'NOT_TESTED',har:'NOT_TESTED',http:'NOT_TESTED'},
    recordWritten:false,productionTrialsExecuted:0}));
  const globalErrors=initialError?[{stage:'setup',error:errorText(initialError)}]:[];
  let stopReason=initialError?'setup failed before browser operation':null;
  const save = (row,file,value) => {
    try {writeJson(file,value);return true;}
    catch(error) {const item={stage:'save:'+path.basename(file),error:errorText(error)};
      row.persistenceErrors.push(item);stderr(JSON.stringify({trial:row.id,...item}));return false;}
  };
  for (const row of results) {
    const dir=path.join(dest,row.id),responses=[],pending=[],pageErrors=[];
    let browser,context,traceAttempted=false,captureCursor=0;
    const drainCaptures=async()=>{const failures=[];while(captureCursor<pending.length){const batch=pending.slice(captureCursor);captureCursor=pending.length;const settled=await Promise.all(batch);failures.push(...settled.filter(r=>!r.ok));}if(failures.length)throw Error(failures.map(r=>r.error).join('\n'));};
    const cleanup = async (stage,action) => {
      try {await action();} catch(error) {row.cleanupErrors.push({stage,error:errorText(error)});}
    };
    try {
      fs.mkdirSync(dir,{recursive:false});fs.mkdirSync(path.join(dir,'http'));
      if (stopReason) {row.stopReason=stopReason;}
      else {
        row.attempted=true;row.stopReason=null;row.status='INCOMPLETE';row.observation.status='INCOMPLETE';
        browser=await pw[row.engine].launch({headless:true});
        context=await browser.newContext({recordHar:{path:path.join(dir,'complete.har'),content:'embed',mode:'full'}});
        traceAttempted=true;await context.tracing.start({screenshots:false,snapshots:true,sources:true});
        const page=await context.newPage();page.setDefaultTimeout(9000);
        page.on('pageerror',error=>pageErrors.push(String(error)));
        page.on('response',response=>{
          const job=(async()=>{const url=new URL(response.url()),file=url.pathname==='/'?'index.html':url.pathname.slice(1);
            if(!['index.html','fixture.js'].includes(file))return;
            const bytes=await response.body();fs.writeFileSync(path.join(dir,'http',file),bytes,{flag:'wx'});
            responses.push({path:file,url:response.url(),status:response.status(),sha256:sha256(bytes)});
          })();
          // Attach rejection handling immediately, then settle EVERY response during cleanup.
          pending.push(job.then(()=>({ok:true}),error=>({ok:false,error:errorText(error)})));
        });
        await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
        await page.goto(base+'/?fault='+row.fault);await page.locator('#start').click();await page.clock.runFor(100);
        row.observation.before=await page.evaluate(()=>window.safetySnapshot());
        const before=row.observation.before;
        if(row.fault==='normal'){assert.equal(before.committed,'Done');assert.equal(before.dom,'Done');}
        else {
          assert.equal(before.pending,true);
          if(row.fault==='dom-delay'){assert.equal(before.committed,'Done');assert.equal(before.dom,'Idle');}
          else {assert.equal(before.committed,'Idle');assert.equal(before.dom,'Idle');}
          if(row.fault==='cancel-race')await page.locator('#cancel').click();
          await page.locator('#release').click();
        }
        row.observation.after=await page.evaluate(()=>window.safetySnapshot());
        const after=row.observation.after,expected=row.fault==='cancel-race'?'Cancelled':'Done';
        assert.equal(after.committed,expected);assert.equal(after.dom,expected);assert.equal(after.pending,false);
        assert.equal(pageErrors.length,0);
        if(row.fault==='cancel-race'){
          assert.ok(after.events.some(e=>e.kind==='guard'&&e.accepted===false));
          assert.ok(!after.events.some(e=>e.kind==='commit'));
        }
        row.observation.status='PASS';
        row.observation.semanticDetection=row.fault==='normal'?'NORMAL_CONTROL_PASS':'DETECTED';
      }
    } catch(error) {
      // The first operation/setup exception is never replaced by teardown failures.
      row.operationError=errorText(error);
      if(row.attempted)row.observation.status='INCOMPLETE';
      else row.stopReason=stopReason||'setup failed before browser operation';
    } finally {
      const primaryPageErrorCount=pageErrors.length;
      if(context&&traceAttempted)await cleanup('trace.stop',()=>context.tracing.stop({path:path.join(dir,'trace.zip')}));
      await cleanup('response.capture',drainCaptures);
      if(context)await cleanup('context.close',()=>context.close());
      if(browser)await cleanup('browser.close',()=>browser.close());
      await cleanup('response.capture.final',drainCaptures);
      if(pageErrors.length>primaryPageErrorCount)row.cleanupErrors.push({stage:'cleanup.pageerror',error:pageErrors.slice(primaryPageErrorCount).join('\n')});
      row.observation.pageErrors=pageErrors;
      if(row.attempted){
        for(const [kind,file] of [['trace','trace.zip'],['har','complete.har']]){
          try {nonempty(path.join(dir,file));assert.ok(!row.cleanupErrors.some(e=>e.stage===(kind==='trace'?'trace.stop':'context.close')),kind+' finalization failed');if(kind==='har'){
            const har=JSON.parse(fs.readFileSync(path.join(dir,file)));assert.ok(Array.isArray(har.log?.entries));
            const found=new Set();for(const entry of har.log.entries){const pathname=new URL(entry.request.url).pathname;const name=pathname==='/'?'index.html':pathname.slice(1);if(!['index.html','fixture.js'].includes(name))continue;assert.ok(!found.has(name),'duplicate HAR resource');found.add(name);assert.equal(entry.response.status,200);assert.equal(typeof entry.response.content.text,'string');const bytes=Buffer.from(entry.response.content.text,entry.response.content.encoding==='base64'?'base64':'utf8');assert.deepEqual({size:bytes.length,sha256:sha256(bytes)},manifest.build[name],'HAR body bytes');}assert.deepEqual([...found].sort(),['fixture.js','index.html']);
          }else{const bytes=fs.readFileSync(path.join(dir,file));assert.ok(bytes.length>22&&bytes.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])),'trace ZIP missing entries/header');}row.evidence[kind]='COMPLETE';}
          catch(error){row.evidence[kind]='INCOMPLETE';row.cleanupErrors.push({stage:'evidence:'+kind,error:errorText(error)});}
        }
        try {
          assert.deepEqual(responses.map(r=>r.path).sort(),['fixture.js','index.html']);
          for(const r of responses){assert.equal(r.status,200);const bytes=fs.readFileSync(path.join(dir,'http',r.path));
            assert.deepEqual({size:bytes.length,sha256:sha256(bytes)},manifest.build[r.path]);assert.equal(r.sha256,sha256(bytes));}
          row.evidence.http='COMPLETE';
        }catch(error){row.evidence.http='INCOMPLETE';row.cleanupErrors.push({stage:'evidence:http',error:errorText(error)});}
      }
      row.status=row.attempted?(row.observation.status==='PASS'&&row.cleanupErrors.length===0?'PASS':'INCOMPLETE'):'NOT_TESTED';
      save(row,path.join(dir,'served.json'),{head,tree,trialId:row.id,environment,
        status:row.attempted?'ATTEMPTED':'NOT_TESTED',buildManifestSha256:manifest?sha256(JSON.stringify(manifest)):null,responses});
      if(row.persistenceErrors.length&&row.attempted)row.status='INCOMPLETE';
      row.recordWritten=true;
      if(!save(row,path.join(dir,'result.json'),row)){row.recordWritten=false;if(row.attempted)row.status='INCOMPLETE';}
      if(row.status!=='PASS'||row.persistenceErrors.length)stopReason=stopReason||`stopped after ${row.id}: ${row.status}`;
    }
  }
  const summary={schema:2,head,tree,plan:safetyPlan,policy:'STOP_AFTER_FIRST_FAILURE_NO_RETRY',
    productionTrialsExecuted:0,globalErrors,results,
    complete:globalErrors.length===0&&results.every(r=>r.status==='PASS')};
  validateSafetySummary(summary);
  return summary;
}
export function saveSafetySummary(dest,summary,{writeJson=writeExclusive,stderr=message=>process.stderr.write(message+'\n')}={}) {
  try {writeJson(path.join(dest,'results.json'),summary);return summary.complete?0:1;}
  catch(error){summary.globalErrors.push({stage:'save:results.json',error:errorText(error)});summary.complete=false;stderr(JSON.stringify({stage:'save:results.json',error:errorText(error),summary}));return 1;}
}
async function main() {
  if(process.env.SAFETY_MODE!=='fixture-validation'||process.env.PRODUCTION_108||process.argv.length!==3)throw Error('PRODUCTION_ALWAYS_DISABLED');
  const dest=path.resolve(process.argv[2]);fs.mkdirSync(dest,{recursive:false});
  const root=process.cwd(),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
  let head='UNKNOWN',tree='UNKNOWN',manifest=null,pw=null,server=null,base=null,initialError=null;
  let environment={node:process.version,platform:process.platform,playwright:'UNKNOWN'};
  try {
    head=git('rev-parse','HEAD');tree=git('rev-parse','HEAD^{tree}');
    writeExclusive(path.join(dest,'plan.json'),{head,tree,scope:'MINIMAL_MODEL_RUNTIME_NOT_PRODUCT',plan:safetyPlan,
      policy:'STOP_AFTER_FIRST_FAILURE_NO_RETRY',productionTrialsExecuted:0});
    const build=path.join(dest,'build');fs.cpSync('scripts/phase7d-safety-fixture',build,{recursive:true,errorOnExist:true,force:false});
    const toolFiles=['scripts/phase7d-safety-browser.mjs','scripts/phase7d-safety-provenance.mjs',
      'scripts/phase7d-safety-result-contract.mjs','scripts/phase7d-safety-fixture/fixture.js'];
    manifest=capture(root,head,build,'scripts/phase7d-boundary-contract.mjs',toolFiles);
    writeExclusive(path.join(dest,'build-manifest.json'),manifest);
    const require=createRequire(import.meta.url);pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
    environment={...environment,playwright:require(path.join(path.dirname(require.resolve(process.env.PLAYWRIGHT_MODULE||'playwright')),'package.json')).version};
    server=http.createServer((req,res)=>{
      const pathname=new URL(req.url,'http://localhost').pathname,file=pathname==='/'?'index.html':pathname.slice(1);
      if(!['index.html','fixture.js'].includes(file)){res.writeHead(404).end();return;}
      res.setHeader('content-type',file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(path.join(build,file)));
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    base=`http://127.0.0.1:${server.address().port}`;
  } catch(error) {initialError=error;process.stderr.write(JSON.stringify({stage:'setup',error:errorText(error)})+'\n');}
  let summary;try {summary=await runSafetyPlan({dest,head,tree,manifest,pw,environment,base,initialError});}
  finally {if(server)try {await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
    catch(error){if(summary){summary.globalErrors.push({stage:'server.close',error:errorText(error)});summary.complete=false;}
      process.stderr.write(JSON.stringify({stage:'server.close',error:errorText(error)})+'\n');process.exitCode=1;}}
  process.exitCode=saveSafetySummary(dest,summary);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{process.stderr.write(errorText(error)+'\n');process.exitCode=1;});
}
