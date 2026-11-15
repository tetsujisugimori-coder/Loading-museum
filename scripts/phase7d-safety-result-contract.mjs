import assert from 'node:assert/strict';
export const safetyPlan = Object.freeze(['chromium','webkit'].flatMap(engine =>
  ['normal','commit-delay','cancel-race','dom-delay'].map(fault => Object.freeze({engine,fault,id:`fixture-${engine}-${fault}`}))));
export function validateSafetySummary(summary, {requireComplete = false} = {}) {
  assert.equal(summary.schema, 2);
  assert.equal(summary.productionTrialsExecuted, 0);
  assert.deepEqual(summary.plan, safetyPlan, 'fixed eight-slot plan');
  assert.equal(summary.results.length, 8, 'exactly eight result records');
  assert.equal(new Set(summary.results.map(r => r.id)).size, 8, 'duplicate result');
  assert.ok(Array.isArray(summary.globalErrors));
  let stopped = false;
  for (const [i, r] of summary.results.entries()) {
    assert.deepEqual({engine:r.engine,fault:r.fault,id:r.id}, safetyPlan[i], 'result order/identity');
    assert.equal(r.head, summary.head); assert.equal(r.tree, summary.tree);
    assert.equal(r.productionTrialsExecuted, 0);
    assert.ok(['PASS','INCOMPLETE','NOT_TESTED'].includes(r.status));
    assert.ok(Array.isArray(r.cleanupErrors)); assert.ok(Array.isArray(r.persistenceErrors));
    if (!r.attempted) { assert.equal(r.status, 'NOT_TESTED'); assert.ok(r.stopReason); stopped = true; }
    else { assert.ok(!stopped, 'attempt after stop'); assert.notEqual(r.status, 'NOT_TESTED'); }
    if (r.status === 'PASS') {
      assert.equal(r.observation.status, 'PASS');assert.deepEqual(r.observation.pageErrors,[],'page errors');
      const expected=r.fault==='cancel-race'?'Cancelled':'Done';assert.equal(r.observation.after.committed,expected);assert.equal(r.observation.after.dom,expected);assert.equal(r.observation.after.pending,false);
      if(r.fault==='normal'){assert.equal(r.observation.before.committed,'Done');assert.equal(r.observation.before.dom,'Done');}else{assert.equal(r.observation.before.pending,true);assert.equal(r.observation.before.committed,r.fault==='dom-delay'?'Done':'Idle');assert.equal(r.observation.before.dom,'Idle');}
      if(r.fault==='cancel-race'){assert.ok(r.observation.after.events.some(e=>e.kind==='guard'&&e.accepted===false));assert.ok(!r.observation.after.events.some(e=>e.kind==='commit'));} assert.equal(r.operationError, null);
      assert.equal(r.cleanupErrors.length, 0); assert.equal(r.persistenceErrors.length, 0);
      assert.equal(r.recordWritten, true);
      for (const name of ['trace','har','http']) assert.equal(r.evidence[name], 'COMPLETE', 'required evidence');
    } else if (r.attempted) stopped = true;
  }
  const complete = summary.globalErrors.length === 0 && summary.results.every(r => r.status === 'PASS');
  assert.equal(summary.complete, complete, 'aggregate verdict');
  if (requireComplete) assert.ok(complete, 'incomplete diagnostic evidence');
  return {complete, planned:8, attempted:summary.results.filter(r=>r.attempted).length,
    incomplete:summary.results.filter(r=>r.status==='INCOMPLETE').length,
    notTested:summary.results.filter(r=>r.status==='NOT_TESTED').length};
}
