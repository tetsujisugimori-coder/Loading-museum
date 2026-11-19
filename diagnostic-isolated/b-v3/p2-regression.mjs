import assert from 'node:assert/strict';
import {audit} from './auditor.mjs';
import {base,expected,event,seal} from './fixtures.mjs';
import {hash,bytes,clone} from './core.mjs';

const checks = [
  ['P2-BV3-01', () => {
    const x=base();
    x.policy.mode='A';
    x.events=[event(1,'primaryFrozen'),event(2,'stopRequested'),event(3,'stopCompleted',{generation:17}),event(4,'evidenceFrozen')];
    seal(x);
    const r=audit(x,expected(base()));
    assert.equal(r.stopCompleted,false,'rejected generation must not count as stop completed');
    assert.equal(r.evidence,'INCOMPLETE');
    assert.equal(r.auditResult,'FAIL');
    return {stopCompleted:r.stopCompleted, reasons:r.reasons};
  }],
  ['P2-BV3-02', () => {
    const x=base();
    x.primary={reached:true,verdict:'FAIL',value:false};
    x.primarySha256=hash(bytes(x.primary));
    const trust=expected(x);
    x.events={};
    seal(x);
    const r=audit(x,trust);
    assert.equal(r.productResult,'FAIL');
    assert.deepEqual(r.primary,x.primary);
    assert.equal(r.primarySha256,x.primarySha256);
    assert.equal(r.auditResult,'FAIL');
    assert.equal(r.evidence,'INCOMPLETE');
    assert(r.reasons.includes('EVENTS_INVALID'),'malformed events must be an audit result');
    return {result:r.productResult, reasons:r.reasons};
  }],
  ['P2-BV3-03', () => {
    const x=base();
    const trust=expected(x);
    const frozen=x.events.find(e=>e.kind==='primaryFrozen');
    const prim=x.events.filter(e=>['callback','stateUpdateRequested','reactCommit','dom'].includes(e.kind));
    const remaining=x.events.filter(e=>e!==frozen&&!prim.includes(e));
    x.events=[frozen,...prim,...remaining].map((e,i)=>({...clone(e),seq:i+1,monotonic:i+1}));
    seal(x);
    const r=audit(x,trust);
    assert.equal(r.auditResult,'FAIL');
    assert.equal(r.evidence,'INCOMPLETE');
    assert(r.reasons.includes('PRIMARY_OBSERVATION_ORDER'),'late primary observations must be rejected');
    return {reason:r.reasons};
  }],
];
let failed=0;
for(const [id,run] of checks){
  try{const val=run();console.log(`${id}: GREEN ${JSON.stringify(val)}`);}
  catch(e){failed++;console.error(`${id}: RED ${e.name}: ${e.message}`);}
}
if(failed)process.exitCode=1;

// Positive controls and the nonblocking adversarial controls from the review.
const controls=[
 ['valid-stop',()=>{const x=base();x.policy.mode='A';x.events=[event(1,'primaryFrozen'),event(2,'stopRequested'),event(3,'stopCompleted'),event(4,'evidenceFrozen')];seal(x);const r=audit(x,expected(base()));assert.equal(r.auditResult,'PASS');assert.equal(r.stopCompleted,true);}],
 ['late-auxiliary',()=>{const x=base(),oracle=expected(x);x.events.splice(5,0,event(99,'callback',{phase:'deferred',payload:{auxiliary:true}}));x.events=x.events.map((e,i)=>({...clone(e),seq:i+1,monotonic:i+1}));seal(x);const r=audit(x,oracle);assert.equal(r.auditResult,'PASS');}],
 ['duplicate-stop-rejected',()=>{const x=base();x.policy.mode='A';x.events=[event(1,'primaryFrozen'),event(2,'stopRequested'),event(3,'stopCompleted'),event(4,'stopCompleted')];seal(x);const r=audit(x,expected(base()));assert.equal(r.stopCompleted,false);assert(r.reasons.includes('DUPLICATE_EVENT'));}],
 ['cleanup-primary-fail',()=>{const x=base();x.primary.verdict='FAIL';x.primarySha256=hash(bytes(x.primary));const oracle=expected(x);x.finalization.cleanup='INCOMPLETE';x.finalization.unexpectedErrors=['cleanup-fault'];seal(x);const r=audit(x,oracle);assert.equal(r.productResult,'FAIL');assert.equal(r.primarySha256,x.primarySha256);assert(r.reasons.includes('UNEXPECTED_ERROR'));}],
];
for(const [id,run]of controls){try{run();console.log(`${id}: GREEN`);}catch(e){failed++;console.error(`${id}: RED ${e.name}: ${e.message}`)}}
if(failed)process.exitCode=1;
