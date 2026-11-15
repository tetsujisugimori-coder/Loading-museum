import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {runSafetyPlan,saveSafetySummary} from '../scripts/phase7d-safety-browser.mjs';
import {safetyPlan,validateSafetySummary} from '../scripts/phase7d-safety-result-contract.mjs';
import {auditSafetyDirectory} from '../scripts/audit-phase7d-safety-results.mjs';
import {sha256} from '../scripts/phase7d-safety-provenance.mjs';
import {syntheticPlaywright} from './fixtures/phase7d-safety-synthetic-playwright.mjs';
const temp=path.resolve(process.env.SAFETY_TEMP||path.join('..',path.basename(process.cwd())+'-phase7d-safety-temp'));
fs.mkdirSync(temp,{recursive:true});
async function trial(fault='normal',initialError=null) {
  const dest=fs.mkdtempSync(path.join(temp,'cleanup-')),head='a'.repeat(40),tree='b'.repeat(40);
  const bytes={'index.html':Buffer.from('<p>synthetic</p>'),'fixture.js':Buffer.from('/* synthetic */')};
  const manifest={build:Object.fromEntries(Object.entries(bytes).map(([name,b])=>[name,{size:b.length,sha256:sha256(b)}]))};
  fs.writeFileSync(path.join(dest,'plan.json'),JSON.stringify({head,tree,plan:safetyPlan}));
  const {pw,events}=syntheticPlaywright({fault,bytes,dest}),stderr=[];
  const summary=await runSafetyPlan({dest,head,tree,manifest,pw,base:'http://127.0.0.1:9999',environment:{classification:'SYNTHETIC_NOT_BROWSER'},initialError,stderr:s=>stderr.push(s)});
  const exit=saveSafetySummary(dest,summary,{stderr:s=>stderr.push(s)});
  fs.writeFileSync(path.join(dest,'synthetic-events.json'),JSON.stringify(events));
  fs.writeFileSync(path.join(dest,'synthetic-stderr.json'),JSON.stringify(stderr));
  return {dest,summary,events,stderr,exit};
}
test('normal synthetic control has eight complete records and independent aggregate audit',async()=>{
  const r=await trial();assert.equal(r.exit,0);assert.equal(r.events.filter(e=>e.event==='launch').length,8);
  assert.equal(auditSafetyDirectory(r.dest).complete,true);
});
for(const fault of ['context-close','browser-close','both-close','trace-stop','trace-missing','har-finalization','har-missing','capture-reject','operation-and-cleanup','served-save','result-save','late-pageerror','late-capture']) {
  test('synthetic '+fault+' retains primary, all8 records, remaining cleanup, and stops',async()=>{
    const r=await trial(fault),first=r.summary.results[0];assert.equal(r.exit,1);assert.equal(r.summary.results.length,8);
    assert.equal(first.status,'INCOMPLETE');assert.deepEqual(r.summary.results.slice(1).map(x=>x.status),Array(7).fill('NOT_TESTED'));
    assert.equal(r.events.filter(e=>e.event==='launch').length,1);
    for(const name of ['trace.stop','context.close','browser.close'])assert.ok(r.events.some(e=>e.event===name));
    if(fault==='operation-and-cleanup'){
      assert.match(first.operationError,/PRIMARY_OPERATION_ERROR/);assert.doesNotMatch(first.operationError,/CONTEXT_CLOSE_ERROR|BROWSER_CLOSE_ERROR/);
      assert.equal(first.observation.before.committed,'Done');assert.equal(first.cleanupErrors.filter(e=>['context.close','browser.close'].includes(e.stage)).length,2);
    }else{assert.equal(first.observation.status,'PASS');assert.equal(first.observation.after.dom,'Done');assert.equal(first.operationError,null);}
    if(fault==='late-pageerror')assert.ok(first.cleanupErrors.some(e=>e.stage==='cleanup.pageerror'&&e.error.includes('LATE_PAGE_ERROR')));
    if(fault==='late-capture')assert.ok(first.cleanupErrors.some(e=>e.stage==='response.capture.final'&&e.error.includes('LATE_CAPTURE_ERROR')));
    if(['served-save','result-save'].includes(fault)){assert.ok(r.stderr.length);assert.ok(first.persistenceErrors.length);}
    assert.throws(()=>auditSafetyDirectory(r.dest));
    for(const row of r.summary.results.slice(1))assert.ok(fs.existsSync(path.join(r.dest,row.id,'result.json')));
  });
}
test('aggregate write failure is nonzero, stderr preserves all eight records',async()=>{
  const r=await trial();const target=path.join(r.dest,'blocked-summary');fs.mkdirSync(target);fs.mkdirSync(path.join(target,'results.json'));
  const stderr=[];assert.equal(saveSafetySummary(target,r.summary,{stderr:s=>stderr.push(s)}),1);
  assert.equal(r.summary.complete,false);const failure=JSON.parse(stderr[0]);assert.equal(failure.summary.results.length,8);assert.equal(failure.stage,'save:results.json');
});
test('preflight failure retains all eight NOT_TESTED slots with no launch',async()=>{
  const r=await trial('normal',Error('fixed setup failure'));assert.equal(r.exit,1);assert.equal(r.events.length,0);
  assert.deepEqual(r.summary.results.map(x=>x.status),Array(8).fill('NOT_TESTED'));assert.equal(validateSafetySummary(r.summary).attempted,0);
});
for(const mutation of ['empty','short','duplicate','order','missing-trace-flag','primary-overwrite','missing-global-error','late-pageerror','wrong-observation'])test('aggregator rejects '+mutation,async()=>{
  const r=await trial(),s=structuredClone(r.summary);
  if(mutation==='empty')s.results=[];
  if(mutation==='short')s.results.pop();
  if(mutation==='duplicate')s.results[1]=s.results[0];
  if(mutation==='order')[s.results[0],s.results[1]]=[s.results[1],s.results[0]];
  if(mutation==='missing-trace-flag')s.results[0].evidence.trace='INCOMPLETE';
  if(mutation==='primary-overwrite')s.results[0].operationError='previous error';
  if(mutation==='late-pageerror')s.results[0].observation.pageErrors=['late error'];
  if(mutation==='wrong-observation')s.results[0].observation.after.dom='Wrong';
  if(mutation==='missing-global-error')s.globalErrors.push({stage:'save',error:'failure'});
  assert.throws(()=>validateSafetySummary(s,{requireComplete:true}));
});
