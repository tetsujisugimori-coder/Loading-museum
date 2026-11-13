import {boundaryPlan,boundaryTargets} from '../../scripts/phase7d-boundary-plan.mjs';
import {boundarySequence,digest} from '../../scripts/phase7d-boundary-contract.mjs';
import {boundaryRawSpec} from '../../scripts/audit-phase7d-boundary.mjs';
const hash='a'.repeat(64);
export function fixture(group='A',kind='swipe'){
 const p=boundaryPlan().find(p=>p.group===group&&p.case===kind),target=boundaryTargets[p.case];
 const apis=boundarySequence(p.case,p.group).map((name,i)=>({seq:i+1,name,hostStartMs:i*10,hostEndMs:i*10+1,status:'OK',commandedVirtualDateMs:10000,...(name==='details.closed.count'?{result:0}:{}),...(name==='details.open.count'?{result:2}:{}),...(name.endsWith('getAttribute')?{result:({'keyboard-prefix.getAttribute':'dismissed','undo-prefix.getAttribute':'idle','prefix-start.getAttribute':'Loading','cancel-prefix.getAttribute':'Cancelled','success-prefix.getAttribute':'Success'})[name]??target.expected}:{}),...(name==='target.clock.runFor'?{milliseconds:target.advance,virtualBeforeMs:10000-target.advance,virtualAfterMs:10000}:{})}));
 const t={...p,plannedId:p.id,id:'validation-'+p.id,attempt:'attempt-00001',head:'b'.repeat(40),tree:'c'.repeat(40),contractSha256:hash,expected:target.expected,viewport:{width:target.width,height:target.height},motion:target.motion,apis,pageErrors:[],primary:{apiSeq:apis.find(a=>a.name==='primary.getAttribute').seq,state:target.expected,verdict:'PASS'},primaryFile:{name:'primary.json',sha256:hash},diagnosticStatus:'COMPLETE',evidenceStatus:'COMPLETE',productStatus:'PASS',url:'http://127.0.0.1:1234/Loading-museum/#modern-exhibit-swipe-dismiss',clockOrigin:{requestedPauseAtMs:1000},inputRectangle:{x:0,y:0,width:100,height:100},instrumentation:{installed:true,overflow:false,dropped:0,errors:[],events:[{sequence:1,trialId:'validation-'+p.id,virtualDateMs:1000,browserPerformanceMs:100,phase:'commit'}]}};
 t.instrumentation=normalSink(t);
 const raw={contexts:[{browserName:t.engine,options:{viewport:t.viewport,reducedMotion:t.motion,hasTouch:true}}],hasAutomaticImages:false,hasSnapshots:false,calls:boundaryRawSpec(t).map((s,i)=>({before:{method:s.method,params:s.params,callId:'c'+i,startTime:i},after:{result:{value:s.name==='clock.origin.evaluate'?{n:1000}:s.result??t.apis.find(a=>a.name===s.name)?.result}}}))};
 return {t,p,raw};
}


export function normalSink(t){
 const work=t.case, state=work==='swipe'?'idle':'Idle', events=[];
 const add=(phase,payload)=>events.push({work,phase,...payload,trialId:t.id,operationId:work+'-'+(payload.token??payload.generation),sequence:events.length+1,virtualDateMs:1000+events.length,browserPerformanceMs:100+events.length});
 add('commit',{generation:0,state});add('dom-reflection',{generation:0,state,domState:state});
 if(t.group==='C')add('operation-start',{generation:1,expected:work==='swipe'?'dismissed':'Error'});
 add('state-request',{generation:1,requested:work==='swipe'?'dismissing':'Loading'});
 if(t.group==='C')add('timer-register',{generation:1,timerId:1,delay:work==='swipe'?240:1200});
 add('timer-callback',{generation:1,token:1});
 if(t.group==='C')add('guard',{generation:1,token:1,accepted:true,rejection:null,...(work==='status'?{allowed:true}:{})});
 add('state-request',{generation:1,requested:work==='swipe'?'dismissed':'Error'});
 add('commit',{generation:1,state:t.expected});add('dom-reflection',{generation:1,state:t.expected,domState:t.expected});
 return {schema:1,trialId:t.id,operationId:'whole-trial',limit:4096,installed:true,overflow:false,dropped:0,errors:[],events};
}
