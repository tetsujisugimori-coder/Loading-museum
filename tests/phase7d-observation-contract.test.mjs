import {traceOperations} from '../scripts/phase7d-observation-trace-spec.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {observationPlan,observationPolicy,apiSequence,targets} from '../scripts/phase7d-observation-plan.mjs';
import {digest,validateObservationTrial,validateObservationReport,validateObservationTrace} from '../scripts/phase7d-observation-contract.mjs';
const sha='a'.repeat(64),head='b'.repeat(40),tree='c'.repeat(40);
function trial(p) {
 const expected=targets[p.case].expected;
 const apis=apiSequence(p.case,p.group).map((name,i)=>({seq:i+1,name,hostStartMs:i*10,hostEndMs:i*10+1,status:'OK',commandedVirtualDateMs:10000,...(name.endsWith('getAttribute')?{result:expected}:{}),...(name==='target.clock.runFor'?{milliseconds:targets[p.case].advance,virtualBeforeMs:10000-targets[p.case].advance,virtualAfterMs:10000}:{})}));
 return {...p,url:'http://127.0.0.1:1234/Loading-museum/#modern-exhibit-'+(p.case==='swipe'?'swipe-dismiss':'status-morph'),clockOrigin:{requestedPauseAtMs:1000},inputRectangle:{x:0,y:0,width:100,height:100},head,tree,planSha256:sha,buildSha256:sha,expected,viewport:{width:targets[p.case].width,height:1000},motion:'no-preference',browserVersion:'test',apis,pageErrors:[],primary:{state:expected,verdict:'PASS',apiSeq:apis.find(a=>a.name==='primary.getAttribute').seq},diagnosticStatus:'COMPLETE',productStatus:'PASS',files:[{name:p.id+'.zip',kind:'trace',sha256:sha},...(p.group==='A3'?[{name:p.id+'.png',kind:'png',sha256:sha}]:[])]};
}
function report() {
 const plan=observationPlan(['webkit','chromium']),planSha256=digest(JSON.stringify(plan));
 return {schemaVersion:2,head,tree,dirty:'',plan,planSha256,policy:observationPolicy,expectedTrials:90,finished:'2026-11-11',os:{release:'linux'},nodeVersion:'22',playwrightVersion:'1.56.1',runnerId:'test',runnerSha256:sha,buildManifest:{sha256:sha,data:{head,tree,group:'A',success:true,originalSourcePreserved:true,sourceHashes:{file:sha},outputHashes:{output:sha}}},trials:plan.map(p=>({...trial(p),planSha256})),status:'COMPLETE'};
}
const expected={head,tree,engines:['webkit','chromium']};
function rawTrace(t) {
 const calls=traceOperations(t).map((s,i)=>({before:{method:s.method,params:s.params,callId:'call'+i},after:{result:{value:s.name==='clock.origin.evaluate'?{n:t.clockOrigin.requestedPauseAtMs}:s.result??t.apis.find(a=>a.name===s.name)?.result}}}));
 return {calls,hasAutomaticImages:false,hasSnapshots:false};
}
test('predeclared 90, split54/36, WebKit Swipe12/group and all others6/group',()=>{
 const p=observationPlan();assert.equal(p.length,90);assert.equal(p.filter(x=>x.engine==='webkit').length,54);
 for(const engine of ['webkit','chromium'])for(const kind of ['swipe','status'])for(const group of ['A1','A2','A3'])assert.equal(p.filter(x=>x.engine===engine&&x.case===kind&&x.group===group).length,engine==='webkit'&&kind==='swipe'?12:6);
 for(const engine of ['webkit','chromium'])for(const kind of ['swipe','status'])for(const group of ['A1','A2','A3'])for(let position=0;position<3;position++)assert.equal(p.filter(x=>x.engine===engine&&x.case===kind).filter((x,i)=>i%3===position&&x.group===group).length,engine==='webkit'&&kind==='swipe'?4:2);
});
test('valid90 and raw traces for all groups/cases',()=>{const r=report();assert.equal(validateObservationReport(r,expected).pass,90);for(const t of r.trials)assert.equal(validateObservationTrace(t,rawTrace(t)).status,'PASS');});
for(const [name,mutate] of [
 ['missing result',r=>r.trials.pop()],['early termination',r=>delete r.finished],['wrong order',r=>r.trials.reverse()],['plan tampering',r=>r.plan.reverse()],['old HEAD',r=>r.trials[0].head='d'.repeat(40)],['old build',r=>r.trials[0].buildSha256='e'.repeat(64)],['dirty final',r=>r.dirty='M app'],['wrong clock advance',r=>r.trials[0].apis.find(a=>a.name==='target.clock.runFor').milliseconds=501],['extra clock progression',r=>r.trials[0].apis.find(a=>a.name==='primary.getAttribute').commandedVirtualDateMs++],['state tampering',r=>r.trials[0].primary.state='dismissing'],['wrong primary sequence',r=>r.trials[0].primary.apiSeq++],['host order tampering',r=>r.trials[0].apis[2].hostStartMs=0],['omitted timestamp',r=>delete r.trials[0].apis[2].hostEndMs],['prefix operation changed',r=>r.trials[0].apis[5].name='page.waitForTimeout'],['automatic snapshots',r=>r.policy={...r.policy,trace:{...r.policy.trace,snapshots:true}}],['false COMPLETE',r=>r.status='PARTIAL'],['incomplete as PASS',r=>{r.trials[0].diagnosticStatus='INCOMPLETE';r.trials[0].error='interrupted';}],['hidden pageerror',r=>r.trials[0].pageErrors.push({error:'crash'})]
])test('reject '+name,()=>{const r=report();mutate(r);assert.throws(()=>validateObservationReport(r,expected));});
for(const group of ['A1','A2','A3'])test(group+' fixed observation policy',()=>{const p=observationPlan().find(p=>p.group===group),t=trial(p);assert.equal(validateObservationTrial(t,p).product,'PASS');t.apis.splice(t.primary.apiSeq,0,{...t.apis[t.primary.apiSeq-1],name:'extra.getAttribute'});assert.throws(()=>validateObservationTrial(t,p));});
test('primary FAIL retained despite later PASS',()=>{const p=observationPlan().find(p=>p.group==='A3'),t=trial(p);t.apis[t.primary.apiSeq-1].result='dismissing';t.primary.state='dismissing';t.primary.verdict='FAIL';t.productStatus='FAIL';assert.equal(validateObservationTrial(t,p).product,'FAIL');assert.equal(validateObservationTrace(t,rawTrace(t)).status,'PASS');t.productStatus='PASS';assert.throws(()=>validateObservationTrial(t,p));});
test('trace catches forged JSON result even if both JSON primary fields changed',()=>{const t=trial(observationPlan()[0]),trace=rawTrace(t);t.primary.state='dismissing';t.primary.verdict='FAIL';t.productStatus='FAIL';t.apis[t.primary.apiSeq-1].result='dismissing';assert.throws(()=>validateObservationTrace(t,trace));});
for(const [name,mutate]of [['missing callback result',x=>x.calls.at(-1).after=null],['old clock',x=>x.calls.find(c=>c.before.method==='clockRunFor').before.params.ticksNumber=600],['unexpected image',x=>x.hasAutomaticImages=true],['snapshot',x=>x.hasSnapshots=true],['extra read',x=>x.calls.push(x.calls.at(-1))],['missing read',x=>x.calls.pop()]])test('trace rejects '+name,()=>{const t=trial(observationPlan()[0]),trace=rawTrace(t);mutate(trace);assert.throws(()=>validateObservationTrace(t,trace));});
test('truthful interrupted trial is retained INCOMPLETE and not product PASS',()=>{const r=report(),t=r.trials[0];t.apis=t.apis.slice(0,1);t.apis[0].status='ERROR';t.error='launch failed';t.browserVersion=null;t.primary=null;t.files=[];t.diagnosticStatus='INCOMPLETE';t.productStatus='NOT_TESTED';r.status='PARTIAL';assert.equal(validateObservationReport(r,expected).notTested,1);});

test('raw trace rejects wrong-element reads',()=>{const t=trial(observationPlan()[0]),raw=rawTrace(t);raw.calls.at(-1).before.params.selector='#wrong-element';assert.throws(()=>validateObservationTrace(t,raw));});
test('raw trace rejects inserted evaluate mutation',()=>{const t=trial(observationPlan()[0]),raw=rawTrace(t);raw.calls.splice(5,0,{before:{method:'evaluateExpression',params:{expression:'document.body.dataset.state=1'}},after:{}});assert.throws(()=>validateObservationTrace(t,raw));});
test('raw trace rejects changed pointer displacement',()=>{const t=trial(observationPlan()[0]),raw=rawTrace(t);raw.calls.filter(c=>c.before.method==='mouseMove').at(-1).before.params.x++;assert.throws(()=>validateObservationTrace(t,raw));});
