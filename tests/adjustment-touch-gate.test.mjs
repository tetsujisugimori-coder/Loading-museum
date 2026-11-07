import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTouchGate} from '../scripts/adjustment-touch-gate.mjs';
const pass={scope:'success',checks:'success',selected:'true',native:'success',regression:'success'};
test('selected checks and explicit unrelated skips have different results',()=>{
 assert.equal(evaluateTouchGate(pass),'SELECTED_CHECKS_PASS');
 assert.equal(evaluateTouchGate({...pass,selected:'false',native:'skipped',regression:'skipped'}),'UNRELATED_EXPLICIT_SKIP');
});
for (const [name,change] of Object.entries({scopeFail:{scope:'failure'},scopeCancel:{scope:'cancelled'},missingDecision:{selected:''},missingChecks:{checks:'skipped'},nativeFail:{native:'failure'},nativeSkip:{native:'skipped'},regressionSkip:{regression:'skipped'},unrelatedRan:{selected:'false'},invalidDecision:{selected:'yes'}}))
 test(`gate rejects ${name}`,()=>assert.throws(()=>evaluateTouchGate({...pass,...change})));
