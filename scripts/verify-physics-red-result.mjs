import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const [red,green]=await Promise.all(process.argv.slice(2).map(async p=>JSON.parse(await readFile(p,'utf8'))));
assert.equal(red.head,'7ccb51f158a564327a5b900b5210cd6cd57d81bf');
assert.equal(red.tree,'48497434a97f6b535e63802e4cb9ab3aa1da0942');
assert.equal(red.harnessSHA256,green.harnessSHA256,'RED and GREEN must run identical probe bytes');
assert.equal(red.error,undefined);assert.equal(green.error,undefined);
assert.equal(red.cases.length,18);assert.equal(green.cases.length,18);
const expectedFailures=new Set(['cancel-independent','stop-held','offscreen-held','stale-events']);
for(let i=0;i<red.cases.length;i++){
  const a=red.cases[i],b=green.cases[i];
  for(const key of ['engine','width','name','kind'])assert.equal(a[key],b[key]);
  assert.equal(a.status,expectedFailures.has(a.name)?'FAIL':'PASS',JSON.stringify(a));
  if(a.status==='FAIL'){
    const message={ 'cancel-independent':'P2-A: cancellation must not mutate ball 2', 'stop-held':'P2-B: stop synchronizes held before any physics step', 'offscreen-held':'Expected values to be strictly equal', 'stale-events':'unrelated pointer cannot release or move current drag' }[a.name];
    assert.ok(a.error.includes(message),a.error);
  }
  assert.equal(b.status,'PASS',JSON.stringify(b));
}
console.log('Verified exact original HEAD/tree, identical probe, expected 12 RED + 6 control PASS, updated 18 GREEN.');
