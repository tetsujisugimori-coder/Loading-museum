import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExit,validateDrawingFault,validateDrawingRecovery,validateStepResult} from '../scripts/regression-result-contract.mjs';
const identity={buildHash:'e'.repeat(64),runId:'fresh-parent-nonce',head:'a'.repeat(40),tree:'b'.repeat(40),exportHead:'c'.repeat(40),exportTree:'d'.repeat(40)};
const common={...identity,buildIndexHash:'e'.repeat(64)},key='webkit/1280/then';
const c={engine:'webkit',width:1280,era:'then',status:'PASS',failures:[],checks:['Undo preserves committed thumbnail','Reset restores initial artwork and list'],cancelFaults:[1,2,3]};
const recovery={...common,status:'PASS',cases:[c]};
const fault={...common,status:'FAIL',error:'normal cancel assertion failed',cases:[{...c,status:'FAIL',injectedFault:{name:'missingLast',kind:'test-only DOM fault, normal exact assertion path'},failures:[{name:'cancel retains exact input-derived partial ink'}]}]};
const normal=d=>validateDrawingRecovery(d,identity,[key]);
const bad=d=>validateDrawingFault(d,identity,{engine:'webkit',width:1280,era:'then',fault:'missingLast'});
test('valid complete normal and exact fault contracts',()=>{normal(recovery);bad(fault);validateExit({status:0,signal:null},false);validateExit({status:1,signal:null},true);});
for(const [name,change] of [
 ['empty results',d=>d.cases=[]],['missing cases',d=>delete d.cases],['stale nonce',d=>d.runId='old'],['missing nonce',d=>delete d.runId],
 ['wrong HEAD',d=>d.head='old'],['wrong tree',d=>d.tree='old'],['wrong export HEAD',d=>d.exportHead='old'],['wrong export tree',d=>d.exportTree='old'],
 ['duplicate cases',d=>d.cases.push(structuredClone(d.cases[0]))],['wrong case identity',d=>d.cases[0].era='now'],['incomplete checks',d=>d.cases[0].checks=[]],['hidden case failure',d=>d.cases[0].failures=[{name:'unexpected'}]],['missing build hash',d=>delete d.buildIndexHash],['wrong build bytes',d=>d.buildIndexHash='f'.repeat(64)]
])test(`normal rejects ${name}`,()=>{const d=structuredClone(recovery);change(d);assert.throws(()=>normal(d));});
for(const [name,change] of [['stale fault',d=>d.runId='old'],['empty fault',d=>d.cases=[]],['wrong injected fault',d=>d.cases[0].injectedFault.name='other'],['unrelated child failure',d=>d.cases[0].failures=[{name:'load failed'}]]])test(`fault rejects ${name}`,()=>{const d=structuredClone(fault);change(d);assert.throws(()=>bad(d));});
for(const [name,value] of [['unknown exit',{status:null,signal:null}],['signal exit',{status:null,signal:'SIGKILL'}],['spawn error',{status:1,signal:null,error:Error('spawn')}],['fault exit zero',{status:0,signal:null}]])test(`rejects ${name}`,()=>assert.throws(()=>validateExit(value,true)));
const step={runId:identity.runId,harnessHead:identity.head,harnessTree:identity.tree,exportHead:identity.exportHead,exportTree:identity.exportTree,indexSHA256:'e'.repeat(64),status:'PASS',cases:[{engine:'webkit',width:1280,status:'PASS',cycles:[1,2,3],fault:{rejected:true},recovery:{},finalReentry:{}}]};
test('Step accepts complete recovery and rejects empty/stale/incomplete',()=>{validateStepResult(step,identity,['webkit/1280'],false);for(const change of [d=>d.cases=[],d=>d.runId='old',d=>d.cases[0].cycles.pop(),d=>d.harnessHead='old']){const d=structuredClone(step);change(d);assert.throws(()=>validateStepResult(d,identity,['webkit/1280'],false));}});
