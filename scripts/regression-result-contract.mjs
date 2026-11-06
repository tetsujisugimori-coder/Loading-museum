// Fail closed on missing, stale, empty, partial or mismatched subprocess results.
import assert from 'node:assert/strict';
export function validateExit(result, fault) {
  assert.equal(result.error,undefined,'child must start successfully');
  assert.equal(result.signal,null,'signal termination is not a confirmed exit');
  assert.ok(Number.isInteger(result.status),'exit code must be known');
  if(fault)assert.notEqual(result.status,0,'fault must exit nonzero');else assert.equal(result.status,0,'normal must exit zero');
}
export function validateIdentity(data, expected, step=false) {
  assert.equal(data.runId,expected.runId,'fresh parent-issued run nonce');
  assert.equal(step?data.harnessHead:data.head,expected.head,'harness HEAD');
  assert.equal(step?data.harnessTree:data.tree,expected.tree,'harness tree');
  assert.equal(data.exportHead,expected.exportHead,'export source HEAD');
  assert.equal(data.exportTree,expected.exportTree,'export source tree');
  const hash=step?data.indexSHA256:data.buildIndexHash;assert.ok(/^[a-f0-9]{64}$/.test(hash),'build bytes hash required');assert.equal(hash,expected.buildHash,'actual export index bytes must match parent hash');
}
export const caseKey=c=>`${c.engine}/${c.width}${c.era?'/'+c.era:''}`;
export function validateCases(data, keys, statuses) {
  assert.ok(Array.isArray(data.cases)&&data.cases.length>0,'nonempty cases required');
  assert.equal(data.cases.length,keys.length,'complete case count');
  const actual=data.cases.map(caseKey);assert.equal(new Set(actual).size,actual.length,'unique cases');
  assert.deepEqual(actual,keys,'exact ordered required cases');
  data.cases.forEach((c,i)=>{assert.equal(c.status,statuses?.[i]||'PASS');if(c.status==='PASS')assert.deepEqual(c.failures||[],[]);});
}
export function validateDrawingFault(data, expected, {engine,width,era,fault}) {
  validateIdentity(data,expected);assert.equal(data.status,'FAIL');
  const eras=era==='then'?['then']:['then','now'];validateCases(data,eras.map(e=>`${engine}/${width}/${e}`),eras.map(e=>e===era?'FAIL':'PASS'));
  const c=data.cases.at(-1);assert.equal(c.injectedFault?.name,fault,'specified fault actually reached');
  assert.equal(c.injectedFault.kind,'test-only DOM fault, normal exact assertion path');
  assert.ok(c.failures.some(f=>f.name==='cancel retains exact input-derived partial ink'),'normal assertion must detect it');
  assert.match(data.error,/normal cancel assertion failed/);return c;
}
export function validateDrawingRecovery(data,expected,keys) {
  validateIdentity(data,expected);assert.equal(data.status,'PASS');assert.equal(data.error,undefined);validateCases(data,keys);
  for(const c of data.cases){assert.ok(c.checks.includes('Undo preserves committed thumbnail'));assert.ok(c.checks.includes('Reset restores initial artwork and list'));assert.equal(c.cancelFaults.length,3);}
}
export function validateStepResult(data,expected,keys,fault) {
  validateIdentity(data,expected,true);assert.equal(data.status,fault?'FAIL':'PASS');
  validateCases(data,keys,fault?['FAIL']:undefined);
  if(fault){assert.equal(data.cases[0].injectedFault,'neverStops');assert.match(data.error,/visibility did not settle within 10000ms/);}
  else{assert.equal(data.error,undefined);for(const c of data.cases){assert.equal(c.cycles.length,3);assert.equal(c.fault.rejected,true);assert.ok(c.recovery&&c.finalReentry);}}
}
