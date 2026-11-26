import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './fixtures/phase7d-boundary-valid.mjs';
import {validateBoundaryTrial,validateBoundaryEvents} from '../scripts/audit-phase7d-boundary.mjs';
import {digest} from '../scripts/phase7d-boundary-contract.mjs';
const red=new URL('./fixtures/phase7d-boundary-audit-red/',import.meta.url);
const ledger=JSON.parse(fs.readFileSync(new URL('RED.json',red)));
for(const r of ledger.records)test('frozen reconstructed RED -> GREEN '+r.id,()=>{
 const bytes=fs.readFileSync(new URL(r.id+'.json',red));assert.equal(digest(bytes),r.sha256);
 assert.deepEqual(r.actual,{primary:'PASS',evidence:'COMPLETE',cause:'UNKNOWN'});
 const {t,p}=JSON.parse(bytes);assert.throws(()=>validateBoundaryTrial(t,p));
});
const mutations=[
 ['phase',s=>s.events[0].phase='forged'],['fields',s=>s.events[0].surprise=true],['missing field',s=>delete s.events[0].work],
 ['work',s=>s.events[0].work='other'],['sequence duplicate',s=>s.events[1].sequence=1],['drop',s=>s.events.splice(1,1)],
 ['clock',s=>s.events[1].virtualDateMs=999],['performance',s=>s.events.at(-1).browserPerformanceMs=0],
 ['operation',s=>s.events[0].operationId='other'],['trial',s=>s.events[0].trialId='other'],['sink trial',s=>s.trialId='other'],
 ['installed type',s=>s.installed='yes'],['dropped type',s=>s.dropped=-1],['overflow',s=>s.overflow=true],
 ['generation type',s=>s.events[0].generation='0'],['token type',s=>s.events.find(e=>e.phase==='timer-callback').token=-1],
 ['pair swapped',s=>{[s.events[0],s.events[1]]=[s.events[1],s.events[0]];s.events.forEach((e,i)=>e.sequence=i+1);}],
 ['DOM captured generation',s=>{s.events[1].generation=1;s.events[1].operationId=s.events[1].work+'-1';}],
];
for(const group of ['B','C'])for(const kind of ['swipe','status']){
 test('normal synthetic '+group+' '+kind,()=>{const {t,p}=fixture(group,kind);assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
 for(const [name,mutate]of mutations)test(group+' '+kind+' reject '+name,()=>{const {t,p}=fixture(group,kind);mutate(t.instrumentation);assert.throws(()=>validateBoundaryTrial(t,p));});
 test(group+' '+kind+' legitimate no callback, product FAIL remains separate',()=>{
  const {t,p}=fixture(group,kind);const at=t.instrumentation.events.findIndex(e=>e.phase==='timer-callback');t.instrumentation.events.splice(at);
  t.primary.state=kind==='swipe'?'dismissing':'Loading';t.primary.verdict='FAIL';t.productStatus='FAIL';t.apis.find(a=>a.name==='primary.getAttribute').result=t.primary.state;
  assert.deepEqual(validateBoundaryTrial(t,p),{primary:'FAIL',evidence:'COMPLETE',cause:'UNKNOWN'});
  assert.equal(validateBoundaryEvents(t,t.instrumentation).callbackAbsenceProven,false);
 });
 test(group+' '+kind+' overflow classified incomplete without inventing callback absence',()=>{const {t,p}=fixture(group,kind);t.instrumentation.overflow=true;t.instrumentation.dropped=1;t.evidenceStatus=t.diagnosticStatus='INCOMPLETE';assert.equal(validateBoundaryTrial(t,p).evidence,'INCOMPLETE');});
 test(group+' '+kind+' malformed incomplete not accepted',()=>{const {t,p}=fixture(group,kind);t.evidenceStatus=t.diagnosticStatus='INCOMPLETE';t.instrumentation.events[0].phase='bad';assert.throws(()=>validateBoundaryTrial(t,p));});
 test(group+' '+kind+' alias shadow rejected',()=>{const {t,p}=fixture(group,kind);t.boundary=structuredClone(t.instrumentation);t.instrumentation.events[0].operationId='bad';assert.throws(()=>validateBoundaryTrial(t,p),/alias/);});
 test(group+' '+kind+' DOM anomaly is product observation',()=>{const {t,p}=fixture(group,kind);t.instrumentation.events[1].domState='unexpected-product-state';assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
 test(group+' '+kind+' legitimate repeated render accepted',()=>{const {t,p}=fixture(group,kind);const pair=structuredClone(t.instrumentation.events.slice(-2));for(const e of pair){e.sequence=t.instrumentation.events.length+1;e.virtualDateMs+=10;e.browserPerformanceMs+=10;t.instrumentation.events.push(e);}assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
}
for(const kind of ['swipe','status']){
 for(const [name,change]of [['guard',s=>s.events.find(e=>e.phase==='guard').accepted=false],['callback missing guard',s=>{s.events.splice(s.events.findIndex(e=>e.phase==='guard'),1);s.events.forEach((e,i)=>e.sequence=i+1);}],['registration missing',s=>{s.events.splice(s.events.findIndex(e=>e.phase==='timer-register'),1);s.events.forEach((e,i)=>e.sequence=i+1);}]])test(kind+' C '+name,()=>{const {t,p}=fixture('C',kind);change(t.instrumentation);assert.throws(()=>validateBoundaryTrial(t,p));});
}
for(const [name,mutate]of [
 ['guard generation',s=>{const i=s.events.findIndex(e=>e.phase==='guard');Object.assign(s.events[i],{generation:2,accepted:false,rejection:'generation-mismatch'});s.events.splice(i+1);}],
 ['duplicate timer registration',s=>{const i=s.events.findIndex(e=>e.phase==='timer-register');s.events.splice(i,0,structuredClone(s.events[i]));s.events.forEach((e,i)=>e.sequence=i+1);}],
 ['sink header',s=>s.secret='extra'],
 ['null cancellation',s=>{const last=s.events.at(-1);for(const [phase,generation]of [['invalidate',1],['cancel-request',2],['cancel-processed',2]])s.events.push({work:last.work,phase,generation,timerId:null,trialId:last.trialId,operationId:last.work+'-'+generation,sequence:s.events.length+1,virtualDateMs:2000,browserPerformanceMs:2000});}],
 ['unbound fault marker',s=>{const last=s.events.at(-1);s.events.push({work:last.work,phase:'fault-applied',fault:'guard-suppression',targetCallbackOrdinal:2,trialId:last.trialId,operationId:'whole-trial',sequence:s.events.length+1,virtualDateMs:2000,browserPerformanceMs:2000});}],
])test('independent review rejects '+name,()=>{const {t,p}=fixture('C');mutate(t.instrumentation);assert.throws(()=>validateBoundaryTrial(t,p));});
test('independent review rejects validationId alias forgery',()=>{const {t,p}=fixture('C');t.validationId='forged';t.instrumentation.trialId='forged';for(const e of t.instrumentation.events)e.trialId='forged';assert.throws(()=>validateBoundaryTrial(t,p),/validation identity/);});
for(const kind of ['swipe','status']){
 test(kind+' stale callback rejection is valid evidence',()=>{const {t,p}=fixture('C',kind);const s=t.instrumentation.events,i=s.findIndex(e=>e.phase==='timer-callback');s[i].generation=2;s[i+1].generation=2;s[i+1].accepted=false;s[i+1].rejection='generation-mismatch';s.splice(i+2);assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
 test(kind+' fired timer may later be cancelled',()=>{const {t,p}=fixture('C',kind),s=t.instrumentation.events;for(const [phase,generation]of [['invalidate',1],['cancel-request',2],['cancel-processed',2]])s.push({work:kind,phase,generation,timerId:1,trialId:t.id,operationId:kind+'-'+generation,sequence:s.length+1,virtualDateMs:2000,browserPerformanceMs:2000});assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
}
test('Status direct cancel can commit without request',()=>{const {t,p}=fixture('B','status');const s=t.instrumentation.events;for(const phase of ['commit','dom-reflection'])s.push({work:'status',phase,generation:2,state:'Cancelled',...(phase==='dom-reflection'?{domState:'Cancelled'}:{}),trialId:t.id,operationId:'status-2',sequence:s.length+1,virtualDateMs:2000,browserPerformanceMs:2000});assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
test('mount performance clock origin is not compared across clock.install',()=>{const {t,p}=fixture('B');t.instrumentation.events[0].browserPerformanceMs=10000;t.instrumentation.events[1].browserPerformanceMs=10000;assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');});
