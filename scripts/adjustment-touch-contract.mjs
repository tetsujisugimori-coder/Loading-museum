import assert from 'node:assert/strict';
export const touchKey=c=>[c.engine,c.surface,c.touchAction,c.capture,c.method].join('/');
export function classifyNativeTouch(cases,expectedKeys){
 assert.ok(Array.isArray(cases)&&cases.length>0,'empty cases');
 assert.ok(Array.isArray(expectedKeys)&&expectedKeys.length>0,'empty expected plan');
 const keys=cases.map(touchKey);assert.equal(new Set(keys).size,keys.length,'duplicate cases');assert.deepEqual([...keys].sort(),[...expectedKeys].sort(),'missing or unexpected case');
 for(const c of cases){assert.equal(c.status,'COLLECTED','incomplete collection');assert.ok(c.version,'missing browser');assert.ok(c.events.length,'missing events');assert.equal(c.pageerrors.length,0,'pageerror');assert.ok(c.png?.sha256?.match(/^[a-f0-9]{64}$/),'missing PNG hash');assert.ok(c.events.some(e=>e.type==='input'&&e.isTrusted),'no trusted input');assert.ok(Number.isFinite(Number(c.final.inputValue)),'invalid value');if(c.surface==='product'){assert.ok(c.final.committed?.params,'missing committed state');assert.equal(c.final.pending,'false','unfinished gesture');assert.ok(Number.isInteger(c.final.historyCount),'missing history');}}
 const productTouch=cases.filter(c=>c.surface==='product'&&c.method!=='mouse');assert.ok(productTouch.length,'missing product touch');
 const failures=productTouch.filter(c=>c.final.committed.params.brightness<=20||c.final.historyCount!==1);
 return {acceptance:failures.length?'FAIL':'PASS',failedKeys:failures.map(touchKey)};
}
