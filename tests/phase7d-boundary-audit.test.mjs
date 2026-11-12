import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {boundaryPlan,boundaryTargets} from '../scripts/phase7d-boundary-plan.mjs';
import {boundarySequence,digest} from '../scripts/phase7d-boundary-contract.mjs';
import {validateBoundaryTrial,validateBoundaryTrace,boundaryRawSpec,verifyBoundaryBytes,validateAttemptJournal} from '../scripts/audit-phase7d-boundary.mjs';
const hash='a'.repeat(64);
function fixture(group='A'){
 const p=boundaryPlan().find(p=>p.group===group&&p.case==='swipe'),target=boundaryTargets[p.case];
 const apis=boundarySequence(p.case,p.group).map((name,i)=>({seq:i+1,name,hostStartMs:i*10,hostEndMs:i*10+1,status:'OK',commandedVirtualDateMs:10000,...(name==='details.closed.count'?{result:0}:{}),...(name==='details.open.count'?{result:2}:{}),...(name.endsWith('getAttribute')?{result:({'keyboard-prefix.getAttribute':'dismissed','undo-prefix.getAttribute':'idle'})[name]??target.expected}:{}),...(name==='target.clock.runFor'?{milliseconds:500,virtualBeforeMs:9500,virtualAfterMs:10000}:{})}));
 const t={...p,plannedId:p.id,id:'validation-'+p.id,attempt:'attempt-00001',head:'b'.repeat(40),tree:'c'.repeat(40),contractSha256:hash,expected:target.expected,viewport:{width:target.width,height:target.height},motion:target.motion,apis,pageErrors:[],primary:{apiSeq:apis.find(a=>a.name==='primary.getAttribute').seq,state:target.expected,verdict:'PASS'},primaryFile:{name:'primary.json',sha256:hash},diagnosticStatus:'COMPLETE',evidenceStatus:'COMPLETE',productStatus:'PASS',url:'http://127.0.0.1:1234/Loading-museum/#modern-exhibit-swipe-dismiss',clockOrigin:{requestedPauseAtMs:1000},inputRectangle:{x:0,y:0,width:100,height:100},instrumentation:{installed:true,overflow:false,dropped:0,errors:[],events:[{sequence:1,trialId:'validation-'+p.id,virtualDateMs:1000,browserPerformanceMs:100,phase:'commit'}]}};
 const raw={contexts:[{browserName:t.engine,options:{viewport:t.viewport,reducedMotion:t.motion,hasTouch:true}}],hasAutomaticImages:false,hasSnapshots:false,calls:boundaryRawSpec(t).map((s,i)=>({before:{method:s.method,params:s.params,callId:'c'+i,startTime:i},after:{result:{value:s.name==='clock.origin.evaluate'?{n:1000}:s.result??t.apis.find(a=>a.name===s.name)?.result}}}))};
 return {t,p,raw};
}
test('valid complete A evidence',()=>{const {t,p,raw}=fixture();assert.equal(validateBoundaryTrial(t,p).evidence,'COMPLETE');assert.equal(validateBoundaryTrace(t,raw).status,'PASS');});
for(const [name,change,why]of [
 ['ID',t=>t.plannedId='wrong','allocation id'],['group',t=>t.group='C','allocation group'],['order',t=>t.order++,'allocation order'],
 ['deadline',t=>t.apis.find(a=>a.name==='target.clock.runFor').milliseconds++,'deadline'],
 ['primary overwrite',t=>t.primary.verdict='FAIL','immutable primary oracle'],
 ['missing primary',t=>t.primary=null,'immutable primary oracle'],
 ['extra operation',t=>t.apis[3].name='page.screenshot','API ordered prefix'],
 ['missing API',t=>t.apis.pop(),'complete API sequence'],
 ['wrong state',t=>t.primary.state='dismissing','immutable primary oracle']
])test('reject '+name,()=>{const {t,p}=fixture();change(t);assert.throws(()=>validateBoundaryTrial(t,p),new RegExp(why));});
for(const [name,change,why]of [
 ['trace substitution',raw=>raw.calls.pop(),'raw API count'],
 ['input selector',raw=>raw.calls.find(c=>c.before.method==='getAttribute').before.params.selector='#wrong','raw args'],
 ['input displacement',raw=>raw.calls.filter(c=>c.before.method==='mouseMove').at(-1).before.params.x++,'raw args'],
 ['deadline',raw=>raw.calls.filter(c=>c.before.method==='clockRunFor').at(-1).before.params.ticksNumber++,'raw args'],
 ['FAIL to PASS forgery',raw=>raw.calls.at(-1).after.result.value='dismissing','raw primary'],
 ['extra evaluate',raw=>raw.calls.push(raw.calls.at(-1)),'raw API count'],
 ['trace order',raw=>raw.calls.reverse(),'raw API'],
 ['missing completion',raw=>delete raw.calls[0].after,'raw completion'],
 ['automatic snapshots',raw=>raw.hasSnapshots=true,'automatic snapshots']
])test('raw negative '+name,()=>{const {t,raw}=fixture();change(raw);assert.throws(()=>validateBoundaryTrace(t,raw),new RegExp(why));});
test('primary FAIL stays FAIL while valid evidence can pass',()=>{const {t,p,raw}=fixture();t.primary.state='dismissing';t.primary.verdict='FAIL';t.productStatus='FAIL';t.apis.find(a=>a.name==='primary.getAttribute').result='dismissing';raw.calls.at(-1).after.result.value='dismissing';assert.equal(validateBoundaryTrial(t,p).primary,'FAIL');assert.equal(validateBoundaryTrace(t,raw).status,'PASS');t.productStatus='PASS';assert.throws(()=>validateBoundaryTrial(t,p),/FAIL preserved/);});
for(const [name,change]of [['overflow',s=>s.overflow=true],['dropped',s=>s.dropped=1],['error',s=>s.errors.push('failed')],['missing',s=>s.events=[]]])test('incomplete logs '+name,()=>{const {t,p}=fixture('B');change(t.instrumentation);assert.throws(()=>validateBoundaryTrial(t,p));});
test('actual bytes detect code/build substitution and missing files',async()=>{
 const dir=path.resolve('work','boundary-audit-negative-'+Date.now());await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'source'),'original');const hashes={source:digest('original')};assert.equal(await verifyBoundaryBytes(dir,hashes),1);
 await assert.rejects(()=>verifyBoundaryBytes(dir,{source:digest('different')}),/actual bytes/);await assert.rejects(()=>verifyBoundaryBytes(dir,{missing:digest('original')}));await assert.rejects(()=>verifyBoundaryBytes(dir,{'../outside':hash}),/path escape/);
 assert.equal(await fs.readFile(path.join(dir,'source'),'utf8'),'original');
});
test('journal rejects primary replaced by retry and wrong persistence order',()=>{
 const {t}=fixture(),primary={id:t.id,plannedId:t.plannedId,attempt:t.attempt,head:t.head,tree:t.tree,contractSha256:t.contractSha256,primary:t.primary};
 const journal=[];let hostMs=0;for(const a of t.apis){journal.push({kind:'api-start',hostMs:hostMs++,...a},{kind:'api-end',hostMs:hostMs++,...a});if(a.name==='primary.getAttribute')journal.push({kind:'primary-persisted',hostMs:hostMs++,sha256:hash});}
 validateAttemptJournal(t,journal,primary);const retry=structuredClone(primary);retry.attempt='attempt-00002';assert.throws(()=>validateAttemptJournal(t,journal,retry),/immutable primary file/);
 const changed=structuredClone(journal),at=changed.findIndex(x=>x.kind==='primary-persisted');[changed[at],changed[at+1]]=[changed[at+1],changed[at]];assert.throws(()=>validateAttemptJournal(t,changed,primary));
});
test('review P1 contradictory evidence statuses rejected',()=>{const {t,p}=fixture();t.evidenceStatus='INCOMPLETE';assert.throws(()=>validateBoundaryTrial(t,p),/evidence status consistency/);});
test('review P1 pageerror cannot be COMPLETE PASS',()=>{const {t,p}=fixture();t.pageErrors.push({error:'uncaught'});assert.throws(()=>validateBoundaryTrial(t,p),/page errors/);t.productStatus='FAIL';assert.throws(()=>validateBoundaryTrial(t,p),/page errors incomplete/);});

for(const [name,change,reason]of [['viewport',r=>r.contexts[0].options.viewport={width:123,height:1000},'raw viewport'],['engine',r=>r.contexts[0].browserName='wrong','raw engine'],['motion',r=>r.contexts[0].options.reducedMotion='reduce','raw motion'],['touch',r=>r.contexts[0].options.hasTouch=false,'raw touch']])test('review raw context '+name,()=>{const {t,raw}=fixture();change(raw);assert.throws(()=>validateBoundaryTrace(t,raw),new RegExp(reason));});

test('review prefix failure cannot continue into primary PASS',()=>{const {t,p,raw}=fixture();t.apis.find(a=>a.name==='keyboard-prefix.getAttribute').result='dismissing';raw.calls.find(c=>c.before.method==='getAttribute').after.result.value='dismissing';assert.throws(()=>validateBoundaryTrial(t,p),/prefix failure/);assert.throws(()=>validateBoundaryTrace(t,raw),/raw prefix expectation/);});
