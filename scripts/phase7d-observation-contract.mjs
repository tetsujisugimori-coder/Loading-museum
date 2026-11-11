import {traceOperations} from './phase7d-observation-trace-spec.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { observationPlan, observationPolicy, targets, apiSequence } from './phase7d-observation-plan.mjs';
export const digest = x => createHash('sha256').update(x).digest('hex');
const hex = (x,n=64) => typeof x==='string' && new RegExp(`^[a-f0-9]{${n}}$`).test(x);
const finite = Number.isFinite;
export function validateObservationTrial(t, planned) {
  for (const key of ['id','order','engine','case','group','iteration']) assert.equal(t[key],planned[key],key);
  assert.equal(t.expected,targets[t.case].expected);
  assert.equal(t.viewport.width,targets[t.case].width);assert.equal(t.motion,'no-preference');
  assert.ok(t.head && t.tree && t.planSha256 && t.buildSha256);
  assert.ok(Array.isArray(t.apis)&&Array.isArray(t.pageErrors));
  let previous=-Infinity;
  for (const [i,a] of t.apis.entries()) {
    assert.equal(a.seq,i+1);assert.ok(a.name);assert.ok(finite(a.hostStartMs)&&finite(a.hostEndMs));
    assert.ok(a.hostStartMs>=previous&&a.hostEndMs>=a.hostStartMs,'host API order');previous=a.hostEndMs;
    assert.ok(a.status==='OK'||a.status==='ERROR');
  }
  const primary=t.apis.filter(a=>a.name==='primary.getAttribute');
  assert.ok(primary.length<=1,'one primary maximum');
  if(primary.length&&primary[0].status==='OK') {
    const p=primary[0];assert.equal(typeof p.result,'string');assert.equal(t.primary.state,p.result,'primary state vs raw read');
    assert.equal(t.primary.apiSeq,p.seq);assert.equal(t.primary.verdict,p.result===t.expected?'PASS':'FAIL','immutable primary oracle');
    const before=t.apis[p.seq-2];assert.equal(before.name,'target.clock.runFor');assert.equal(before.milliseconds,targets[t.case].advance);assert.equal(before.status,'OK');
    assert.equal(before.virtualAfterMs-before.virtualBeforeMs,targets[t.case].advance,'fixed advance');
    assert.equal(p.commandedVirtualDateMs,before.virtualAfterMs,'read clock ledger');
    const after=t.apis.slice(p.seq).filter(a=>!['context.tracing.stop','context.close','browser.close'].includes(a.name));
    const expected=t.group==='A1'?[]:t.group==='A2'?Array(4).fill('secondary.getAttribute'):['before-image.getAttribute','page.screenshot','after-image.getAttribute'];
    if(t.diagnosticStatus==='COMPLETE') assert.deepEqual(after.map(a=>a.name),expected,'secondary observation order/count');
    else assert.deepEqual(after.map(a=>a.name),expected.slice(0,after.length),'incomplete secondary prefix');
    for(const a of after) assert.equal(a.commandedVirtualDateMs,p.commandedVirtualDateMs,'no additional virtual advance');
  } else {assert.equal(t.primary,null);assert.equal(t.diagnosticStatus,'INCOMPLETE');}
  assert.ok(['COMPLETE','INCOMPLETE'].includes(t.diagnosticStatus));
  const product=t.primary?.verdict==='FAIL'||t.pageErrors.length?'FAIL':t.primary?.verdict==='PASS'&&t.diagnosticStatus==='COMPLETE'?'PASS':'NOT_TESTED';
  assert.equal(t.productStatus,product,'primary FAIL cannot be overwritten');
  if(t.diagnosticStatus==='COMPLETE') {
    assert.ok(t.browserVersion);assert.deepEqual(t.apis.map(a=>a.name),apiSequence(t.case,t.group),'unchanged complete input sequence');
    assert.ok(t.apis.every(a=>a.status==='OK'));assert.ok(!t.error);assert.ok(t.primary);
    const png=t.files.filter(f=>f.kind==='png'),trace=t.files.filter(f=>f.kind==='trace');
    assert.equal(png.length,t.group==='A3'?1:0,'screenshot policy');assert.equal(trace.length,1);
    assert.ok(t.files.every(f=>hex(f.sha256)));
    assert.equal(t.apis.filter(a=>a.name==='page.screenshot').length,png.length);
    assert.equal(t.apis.filter(a=>a.name==='browser.launch').length,1);assert.equal(t.apis.filter(a=>a.name==='browser.newContext').length,1);
  } else assert.ok(t.error||t.apis.some(a=>a.status==='ERROR'),'incomplete reason');
  return {diagnostic:t.diagnosticStatus,product:t.productStatus,primary:t.primary?.verdict??'NOT_TESTED'};
}
export function validateObservationReport(r, expected) {
  assert.equal(r.schemaVersion,2);assert.equal(r.head,expected.head);assert.equal(r.tree,expected.tree);
  if(expected.clean!==false)assert.equal(r.dirty,'');
  assert.ok(hex(r.head,40)&&hex(r.tree,40));assert.deepEqual(r.policy,observationPolicy);
  const plan=observationPlan(expected.engines);assert.deepEqual(r.plan,plan,'predeclared balanced order');
  assert.equal(r.planSha256,digest(JSON.stringify(plan)));assert.equal(r.expectedTrials,plan.length);
  assert.equal(r.trials.length,plan.length,'all trials including incomplete retained');assert.ok(r.finished);
  assert.ok(r.os?.release&&r.nodeVersion&&r.playwrightVersion&&r.runnerId);assert.ok(hex(r.runnerSha256));
  const b=r.buildManifest;assert.ok(b&&hex(b.sha256));assert.equal(b.data.head,r.head);assert.equal(b.data.tree,r.tree);
  assert.equal(b.data.group,'A');assert.equal(b.data.originalSourcePreserved,true);assert.equal(b.data.success,true);
  for(const name of ['sourceHashes','outputHashes'])assert.ok(Object.keys(b.data[name]??{}).length&&Object.values(b.data[name]).every(v=>hex(v)),name);
  const results=r.trials.map((t,i)=>{for(const k of ['head','tree','planSha256'])assert.equal(t[k],r[k]);assert.equal(t.buildSha256,b.sha256);return validateObservationTrial(t,plan[i]);});
  assert.equal(r.status,results.every(t=>t.diagnostic==='COMPLETE')?'COMPLETE':'PARTIAL');
  return {trials:results.length,complete:results.filter(t=>t.diagnostic==='COMPLETE').length,pass:results.filter(t=>t.product==='PASS').length,fail:results.filter(t=>t.product==='FAIL').length,notTested:results.filter(t=>t.product==='NOT_TESTED').length,primaryFail:results.filter(t=>t.primary==='FAIL').length};
}
/** Independently reconcile primary and secondary reads against raw Playwright trace. */
export function validateObservationTrace(t, trace) {
  assert.equal(trace.hasAutomaticImages,false,'automatic screenshot observer');assert.equal(trace.hasSnapshots,false,'automatic DOM snapshots');
  const calls=trace.calls;
  if(t.diagnosticStatus!=='COMPLETE')return {status:'INCOMPLETE',calls:calls.length};
  assert.ok(calls.every(c=>c.after&&!c.after.error),'complete trace APIs');
  assert.match(t.url,/^http:\/\/127\.0\.0\.1:\d+\/Loading-museum\/#modern-exhibit-(swipe-dismiss|status-morph)$/);
  const spec=traceOperations(t);assert.equal(calls.length,spec.length,'raw full API count');
  for(let i=0;i<spec.length;i++) {
    assert.equal(calls[i].before.method,spec[i].method,'raw input API '+spec[i].name);
    assert.deepEqual(calls[i].before.params,spec[i].params,'raw input parameters '+spec[i].name);
    if(spec[i].result!==undefined)assert.equal(calls[i].after.result?.value,spec[i].result,'raw prefix result');
    if(spec[i].name==='clock.origin.evaluate')assert.equal(calls[i].after.result?.value?.n,t.clockOrigin.requestedPauseAtMs,'raw clock origin');
  }
  const clocks=calls.filter(c=>c.before.method==='clockRunFor');
  assert.deepEqual(clocks.map(c=>c.before.params.ticksNumber),t.case==='swipe'?[500,300,500]:[4000,3000,3000],'raw virtual advances');
  const tail=calls.slice(calls.indexOf(clocks.at(-1))+1);
  const raw=t.apis.slice(t.apis.findIndex(a=>a.name==='primary.getAttribute')).filter(a=>!['context.tracing.stop','context.close','browser.close'].includes(a.name));
  assert.deepEqual(tail.map(c=>c.before.method),raw.map(a=>a.name==='page.screenshot'?'screenshot':'getAttribute'),'raw primary/secondary order');
  for(let i=0;i<tail.length;i++)if(tail[i].before.method==='getAttribute') {assert.equal(tail[i].before.params.name,'data-state');assert.equal(tail[i].after.result?.value,raw[i].result,'raw DOM state mismatch');}
  return {status:'PASS',calls:calls.length,primaryCallId:tail[0].before.callId};
}
