import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const hex=(s,n)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const targets={swipe:{width:765,expected:'dismissed',advance:500},status:{width:375,expected:'Error',advance:3000}};
const ordered=list=>list.every((x,i)=>Number.isInteger(x.seq)&&(!i||x.seq>list[i-1].seq));
const one=(xs,phase)=>{const hits=xs.filter(x=>x.phase===phase);assert.equal(hits.length,1,`exactly one ${phase}`);return hits[0];};
/** Valid evidence can report a product failure. It must never turn incomplete evidence into PASS. */
export function validateCausalTrial(t){
 assert.ok(targets[t.case],'known case');const target=targets[t.case];assert.ok(['A','B','C'].includes(t.group));assert.ok(['chromium','webkit'].includes(t.engine));assert.equal(t.viewport.width,target.width);assert.equal(t.motion,'no-preference');assert.equal(t.clock,'playwright-virtual');assert.equal(t.expected,target.expected);
 assert.ok(Array.isArray(t.steps)&&ordered(t.steps),'ordered steps');assert.ok(Array.isArray(t.events)&&ordered(t.events),'ordered events');assert.ok(Array.isArray(t.errors));
 assert.ok(['COMPLETE','INCOMPLETE'].includes(t.diagnosticStatus));assert.ok(['PASS','FAIL','NOT_TESTED'].includes(t.productStatus));
 if(t.group==='A'){assert.equal(t.events.length,0,'A adds no internal observations');assert.equal(t.internalObservability,'UNKNOWN');}
 if(t.diagnosticStatus==='INCOMPLETE'){assert.notEqual(t.productStatus,'PASS','incomplete cannot pass');assert.ok(t.error||t.errors.length||t.evidenceError||t.screenshotError||t.traceError||t.observerOverflow,'incomplete reason');return {diagnostic:'INCOMPLETE',product:t.productStatus,causalChain:'UNKNOWN'};}
 assert.equal(t.targetReached,true);assert.equal(typeof t.observed,'string');
 const final=one(t.steps,'final-read-after');const before=one(t.steps,'target-runFor-before'),after=one(t.steps,'target-runFor-after');assert.ok(before.seq<after.seq&&after.seq<final.seq,'clock/read order');
 if(t.group!=='A'){assert.ok(finite(before.browser?.virtualDateMs)&&finite(after.browser?.virtualDateMs),'clock evidence missing');assert.equal(after.browser.virtualDateMs-before.browser.virtualDateMs,target.advance,'unchanged virtual advance');}
 const input=one(t.steps,'target-input-after');assert.ok(input.seq<before.seq,'input precedes advance');
 const expectedStatus=t.observed===target.expected&&t.errors.length===0?'PASS':'FAIL';assert.equal(t.productStatus,expectedStatus,'product oracle');
 for(const kind of ['trace','png'])assert.ok(t.files.some(f=>f.kind===kind&&hex(f.sha256,64)),`missing ${kind}`);
 let chain='UNKNOWN';
 if(t.group==='C'){
  // Correlate by final operation generation. Earlier successful operations cannot cover a missing final callback.
  const ops=t.events.filter(e=>e.phase==='operation-start');assert.ok(ops.length,'operation-start missing');const op=ops.at(-1);assert.ok(Number.isInteger(op.generation));
  const same=t.events.filter(e=>e.generation===op.generation&&e.seq>=op.seq);
  const reg=same.find(e=>e.phase==='timer-register');const callback=same.find(e=>e.phase==='timer-callback'&&e.token===op.generation);const guard=same.find(e=>e.phase==='guard'&&e.token===op.generation);
  const request=same.find(e=>e.phase==='state-request'&&e.requested===target.expected);const commit=same.find(e=>e.phase==='commit'&&e.state===target.expected);
  if(reg&&callback&&guard&&request&&commit){
   assert.ok([reg,callback,guard,request,commit].every(e=>finite(e.virtualDateMs)),'event virtual time missing');
   assert.ok(op.seq<reg.seq&&reg.seq<callback.seq&&callback.seq<guard.seq&&guard.seq<request.seq&&request.seq<commit.seq,'causal order');
   assert.ok(finite(reg.delay)&&reg.delay>=0);assert.ok(callback.virtualDateMs>=reg.virtualDateMs+reg.delay,'callback before deadline');
   assert.equal(guard.accepted,true,'rejected callback cannot establish success');assert.equal(guard.rejection,null);assert.equal(commit.domState,target.expected,'commit DOM mismatch');
   chain='OBSERVED';
  }
  if(t.productStatus==='PASS')assert.equal(chain,'OBSERVED','C PASS requires full final-generation causal evidence');
 }
 return {diagnostic:'COMPLETE',product:t.productStatus,causalChain:chain};
}
export async function verifyCausalFiles(root,files){
 assert.equal(new Set(files.map(f=>f.name)).size,files.length,'duplicate file');
 for(const f of files){assert.ok(hex(f.sha256,64));const resolved=path.resolve(root,f.name);assert.ok(resolved.startsWith(path.resolve(root)+path.sep),'path outside evidence');const b=await readFile(resolved);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256,`hash ${f.name}`);}
 return files.length;
}
/** expected is independently supplied by the auditor, never inferred from the report's claim. */
export function validateCausalReport(r,expected){
 assert.ok(hex(r.head,40)&&hex(r.tree,40));assert.equal(r.head,expected.head);assert.equal(r.tree,expected.tree);if(expected.clean!==false)assert.equal(r.dirty,'');
 assert.equal(r.group,expected.group);assert.ok(r.os?.platform&&r.nodeVersion&&r.playwrightVersion);assert.ok(hex(r.runnerSha256,64));
 const b=r.buildManifest;assert.ok(b&&hex(b.sha256,64),'bound build required');assert.equal(b.data.head,r.head);assert.equal(b.data.tree,r.tree);assert.equal(b.data.group,r.group);assert.equal(b.data.success,true);assert.equal(b.data.originalSourcePreserved,true);
 for(const name of ['sourceHashes','outputHashes'])assert.ok(Object.keys(b.data[name]??{}).length>0&&Object.values(b.data[name]).every(v=>hex(v,64)),name);
 const keys=expected.engines.flatMap(e=>expected.cases.flatMap(c=>Array.from({length:expected.repeats},(_,i)=>`${e}/${c}/${i+1}`)));
 assert.equal(r.expectedTrials,keys.length);assert.equal(r.trials.length,keys.length);assert.deepEqual(r.trials.map(t=>`${t.engine}/${t.case}/${t.iteration}`).sort(),keys.sort(),'trial coverage');
 assert.equal(new Set(r.trials.map(t=>t.id)).size,r.trials.length,'unique trial ids');
 const result=r.trials.map(t=>{assert.equal(t.group,r.group);return validateCausalTrial(t);});
 assert.equal(r.status,result.every(x=>x.diagnostic==='COMPLETE')?'COMPLETE':'PARTIAL','diagnostic aggregate');
 return {trials:result.length,complete:result.filter(x=>x.diagnostic==='COMPLETE').length,pass:result.filter(x=>x.product==='PASS').length,fail:result.filter(x=>x.product==='FAIL').length,notTested:result.filter(x=>x.product==='NOT_TESTED').length};
}
