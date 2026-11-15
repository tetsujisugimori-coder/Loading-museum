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
// Fault detection is not proof that cleanup, evidence preservation, or the process succeeded.
const contextMessage='Error: CONTROLLED_CONTEXT_CLOSE_REJECTION after real context.close; not browser crash';
const interruptionMessage='Error: CONTROLLED_PAGE_INTERRUPTION: page.close before primary observation; not native crash';
const firstLine=e=>String(e||'').split('\n')[0];
export function assessControlledCase(r){
 const unexpectedErrors=[],missingEvidence=[];
 const cleanup=r.cleanupErrors||[],persistence=r.persistenceErrors||[],pages=r.pageErrors||[];
 const expectedContext=e=>r.kind==='cleanup-exception'&&e.stage==='context.close'&&firstLine(e.error)===contextMessage;
 const expectedSave=e=>r.kind==='save-failure'&&r.saveFailureInjected===true&&e.stage==='result.json'&&r.saveFailureTargetType==='directory'&&['EEXIST','EISDIR'].includes(e.code);
 const expectedInterrupt=r.kind==='interruption'&&firstLine(r.operationError)===interruptionMessage;
 if(r.operationError&&!expectedInterrupt)unexpectedErrors.push({stage:'operation',error:r.operationError});
 for(const e of cleanup)if(!expectedContext(e))unexpectedErrors.push({channel:'cleanup',...e});
 for(const e of persistence)if(!expectedSave(e))unexpectedErrors.push({channel:'persistence',...e});
 for(const error of pages)unexpectedErrors.push({stage:'pageerror',error});
 if(cleanup.filter(expectedContext).length>1)unexpectedErrors.push({stage:'duplicate expected context.close error'});
 if(persistence.filter(expectedSave).length>1)unexpectedErrors.push({stage:'duplicate expected result.json error'});
 const cleanupSuccess=r.contextCloseSucceeded===true&&r.browserCloseSucceeded===true&&r.browserCloseAttempted===true&&r.traceSaved===true&&cleanup.every(expectedContext);
 if(r.attempted){
  for(const [name,present]of [['trace',r.traceSaved===true],['HAR',r.harSaved===true],['HTTP',Array.isArray(r.http)&&r.http.length>0],['context.close completion',r.contextCloseSucceeded===true],['browser.close completion',r.browserCloseSucceeded===true&&r.browserCloseAttempted===true]])if(!present)missingEvidence.push(name);
  if(r.kind==='interruption'){if(r.primary!==null)unexpectedErrors.push({stage:'primary fabricated after interruption'});}
  else if(!r.primary)missingEvidence.push('primary');
  if(r.primary&&!primaryConsistent(r))unexpectedErrors.push({stage:'primary state/expected/verdict inconsistency'});
 }
 let faultDetection='NOT_APPLICABLE',candidate;
 if(!r.attempted){
  if(r.primary!==null||r.evidence!=='NOT_TESTED')unexpectedErrors.push({stage:'unstarted state inconsistent'});
  candidate=r.kind==='unstarted'?'EXPECTED_NOT_TESTED':'NOT_TESTED';
 }else if(r.kind==='normal')candidate=r.primary?.verdict==='PASS'?'NORMAL_CONTROL_PASS':'NORMAL_CONTROL_FAIL';
 else{
  let detected=false;
  if(r.kind==='cleanup-exception')detected=r.primary?.verdict==='PASS'&&cleanup.filter(expectedContext).length===1;
  else if(r.kind==='save-failure')detected=r.primary?.verdict==='PASS'&&persistence.filter(expectedSave).length===1;
  else if(r.kind==='interruption')detected=r.primary===null&&expectedInterrupt;
  else if(r.scope==='NEXT_REACT_ISOLATED'&&r.kind==='update-omission')detected=r.primary?.verdict==='FAIL'&&r.primary.state==='Loading'&&(r.boundary?.events||[]).some(e=>e.phase==='fault-applied'&&e.work==='status'&&e.fault==='update-omission'&&e.targetCallbackOrdinal===2);
  faultDetection=detected?'DETECTED':'NOT_DETECTED';candidate=faultDetection;
 }
 const expectedEvidence=!r.attempted?'NOT_TESTED':['cleanup-exception','save-failure','interruption'].includes(r.kind)?'INCOMPLETE':'COMPLETE';
 if(r.evidence!==expectedEvidence)unexpectedErrors.push({stage:'evidence classification mismatch',expected:expectedEvidence,actual:r.evidence});
 const validation=unexpectedErrors.length?'UNEXPECTED_ERROR':missingEvidence.length?'INCOMPLETE':candidate;
 const processExitCode=['NORMAL_CONTROL_PASS','DETECTED','EXPECTED_NOT_TESTED'].includes(validation)?0:1;
 return {faultDetection,evidenceCompleteness:r.evidence,cleanupSuccess,unexpectedErrors,missingEvidence,validation,processExitCode};
}
export function classifyControlledCase(r){return assessControlledCase(r).validation;}
export function isolatedProcessExitCode(rows){validateIsolatedResults(rows);return rows.some(r=>assessControlledCase(r).processExitCode!==0)?1:0;}
