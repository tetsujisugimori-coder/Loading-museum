import assert from 'node:assert/strict';
export const isolatedPlan=Object.freeze([
 ...['chromium','webkit'].flatMap(engine=>['normal','cleanup-exception','save-failure','interruption','unstarted'].map(kind=>({id:`model-${engine}-${kind}`,engine,scope:'MODEL_REAL_BROWSER',kind}))),
 ...['chromium','webkit'].flatMap(engine=>['normal','update-omission'].map(kind=>({id:`react-${engine}-${kind}`,engine,scope:'NEXT_REACT_ISOLATED',kind}))),
]);
export const isolatedSettings=Object.freeze({apiTimeoutMs:9000,viewport:{width:375,height:1000},motion:'no-preference',trace:{screenshots:false,snapshots:true,sources:true},productionTrialsExecuted:0,retries:0,policy:'INDEPENDENT_FIXED_CASES; interruption skips next sentinel; unexpected preflight error stops all; no retries'});
export function validateIsolatedPlan(plan){assert.deepEqual(plan.plan,isolatedPlan);for(const [key,value]of Object.entries(isolatedSettings))assert.deepEqual(plan[key],value,'fixed setting '+key);}
function primaryConsistent(r){if(!r.primary)return false;const model=r.scope==='MODEL_REAL_BROWSER',expected=model?'Done':'Error';const observedPass=model?r.primary.observation?.committed==='Done'&&r.primary.observation?.dom==='Done':r.primary.state===expected;return r.primary.expected===expected&&r.primary.verdict===(observedPass?'PASS':'FAIL')&&(!model||r.primary.observation?.dom===r.primary.state);}
export function validateIsolatedResults(rows){
 assert.equal(rows.length,14);assert.equal(new Set(rows.map(x=>x.id)).size,14);
 for(const [i,r]of rows.entries()){
  for(const k of ['id','engine','scope','kind'])assert.equal(r[k],isolatedPlan[i][k]);
  assert.equal(r.productionTrialsExecuted,0);assert.ok(['COMPLETE','INCOMPLETE','NOT_TESTED'].includes(r.evidence));
  if(r.evidence==='COMPLETE'){assert.ok(primaryConsistent(r),'primary state/expected/verdict consistency');assert.equal(r.operationError,null);assert.deepEqual(r.cleanupErrors,[]);assert.deepEqual(r.persistenceErrors,[]);assert.deepEqual(r.pageErrors,[]);assert.ok(r.primary);assert.ok(r.http.length>0);assert.equal(r.traceSaved,true);assert.equal(r.harSaved,true);}
  if(r.kind==='unstarted'){assert.equal(r.attempted,false);assert.equal(r.evidence,'NOT_TESTED');assert.equal(r.primary,null);}
  if(!r.attempted)assert.equal(r.primary,null);
 }
 return {planned:14,attempted:rows.filter(r=>r.attempted).length,complete:rows.filter(r=>r.evidence==='COMPLETE').length,productionTrialsExecuted:0};
}
export function classifyControlledCase(r){
 if(r.primary&&!primaryConsistent(r))return 'NOT_DETECTED';
 if(!r.attempted)return r.kind==='unstarted'?'EXPECTED_NOT_TESTED':'NOT_TESTED';
 if(r.scope==='NEXT_REACT_ISOLATED'){
  if(r.evidence!=='COMPLETE')return 'INCOMPLETE';
  if(r.kind==='normal')return r.primary.verdict==='PASS'?'NORMAL_CONTROL_PASS':'NORMAL_CONTROL_FAIL';
  const events=r.boundary?.events||[];
  return r.primary.verdict==='FAIL'&&r.primary.state==='Loading'&&events.some(e=>e.phase==='fault-applied'&&e.work==='status'&&e.fault==='update-omission'&&e.targetCallbackOrdinal===2)?'DETECTED':'NOT_DETECTED';
 }
 if(r.kind==='normal')return r.evidence==='COMPLETE'&&r.primary?.verdict==='PASS'?'NORMAL_CONTROL_PASS':'NORMAL_CONTROL_FAIL';
 if(r.kind==='cleanup-exception')return r.primary?.verdict==='PASS'&&r.evidence==='INCOMPLETE'&&r.cleanupErrors.some(e=>e.stage==='context.close'&&e.error.includes('CONTROLLED_CONTEXT_CLOSE_REJECTION'))&&r.browserCloseAttempted?'DETECTED':'NOT_DETECTED';
 if(r.kind==='save-failure')return r.primary?.verdict==='PASS'&&r.evidence==='INCOMPLETE'&&r.persistenceErrors.some(e=>e.stage==='result.json')?'DETECTED':'NOT_DETECTED';
 if(r.kind==='interruption')return r.primary===null&&r.evidence==='INCOMPLETE'&&r.operationError?.includes('CONTROLLED_PAGE_INTERRUPTION')?'DETECTED':'NOT_DETECTED';
 return 'NOT_DETECTED';
}
