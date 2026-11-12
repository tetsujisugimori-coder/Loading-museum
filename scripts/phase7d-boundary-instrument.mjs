/** Boundary-only instrumentation; old 120-trial transformation remains unchanged. */
import {createHash} from 'node:crypto';
import {instrumentSource} from './phase7d-diagnostic-instrument.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function boundaryInitScript({trialId,operationId='trial',limit=4096}) {
 const state={schema:1,trialId,operationId,limit,events:[],overflow:false,dropped:0,errors:[],installed:true};
 window.__phase7dBoundary=state;
 window.__phase7dDiagnosticEmit=event=>{
  try {
   if(state.events.length>=state.limit){state.overflow=true;state.dropped++;return;}
   state.events.push({...event,trialId:state.trialId,operationId:event.operationId??(event.work&&Number.isInteger(event.token??event.generation)?event.work+'-'+(event.token??event.generation):state.operationId),sequence:state.events.length+1,virtualDateMs:Date.now(),browserPerformanceMs:performance.now()});
  }catch(error){state.errors.push(String(error));}
 };
}
export function instrumentBoundary(input,kind,group) {
 const result=instrumentSource(input,kind,group);
 if(group==='A')return result;
 const replace=(old,next,label)=>{const count=result.source.split(old).length-1;if(count!==1)throw Error(`${kind}/${group}: ${label}: expected one exact match, got ${count}`);result.source=result.source.replace(old,next);result.manifest.replacements.push(label);};
 if(group==='B') {
  const anchors=kind==='swipe'?["later(()=>{if(gen===epoch.current)change(result);},reduced?0:240);","later(()=>{__phase7dEmit('swipe','timer-callback',{generation:epoch.current,token:gen});if(gen===epoch.current)change(result);},reduced?0:240);"]:["timer.current=setTimeout(()=>{if(token!==generation.current||!allowed.current)return;","timer.current=setTimeout(()=>{__phase7dEmit('status','timer-callback',{generation:generation.current,token});if(token!==generation.current||!allowed.current)return;"];
  replace(...anchors,'callback');
  const handler=kind==='swipe'?"__phase7dEmit('swipe','handler',{event:'pointerup',generation:epoch.current,hasDrag:!!drag.current,pointerId:e.pointerId});":"__phase7dEmit('status','handler',{event:'run',generation:generation.current,allowed:allowed.current});";
  replace(handler,'','B excludes handler');
 }
 const generation=kind==='swipe'?'epoch.current':'generation.current';
 replace(`__phase7dEmit('${kind}','commit',{generation:${generation},state,domState:root.current?.getAttribute('data-state')??null});`,`__phase7dEmit('${kind}','commit',{generation:${generation},state});__phase7dEmit('${kind}','dom-reflection',{generation:${generation},state,domState:root.current?.getAttribute('data-state')??null});`,'separate commit and DOM observation');
 if(group==='C') {
  const old=kind==='swipe'?"if(timer.current!==null)clearTimeout(timer.current);timer.current=null;return epoch.current;":"if(timer.current!==null)clearTimeout(timer.current);timer.current=null;},[]);";
  const tail=kind==='swipe'?'return epoch.current;': '},[]);';
  const condition=kind==='swipe'?"root.current?.getAttribute('data-testid')==='swipe-to-dismiss'":'true';
  replace(old,`if(timer.current!==null){if(${condition})__phase7dEmit('${kind}','cancel-request',{generation:${generation},timerId:timer.current});clearTimeout(timer.current);if(${condition})__phase7dEmit('${kind}','cancel-processed',{generation:${generation},timerId:timer.current});}timer.current=null;${tail}`,'cancellation request and processing');
 }
 result.manifest.afterSha256=sha(result.source);
 result.manifest.boundary={schema:1,commitDomReadIntervention:true,neutrality:'UNKNOWN',clockDomains:['virtualDateMs','browserPerformanceMs'],sink:'__phase7dBoundary'};
 return result;
}
/** Validation-only mutations: injected at second callback (prefix completion is callback #1).
 * This ordinal is fixed for the inherited Swipe/Status input sequence, not adaptive on outcome.
 * Commit/DOM delay and cancellation races are not modeled by delaying an update request. */
export function applyBoundaryFault(source,kind,fault) {
 const supported=['callback-delay','callback-suppression','update-omission','generation-mismatch','guard-suppression'];
 if(!supported.includes(fault))throw Error(`NOT_TESTED unsupported runtime fault: ${fault}`);
 const beforeSha256=sha(source);
 const marker=kind==='swipe'?"__phase7dEmit('swipe','timer-callback',{generation:epoch.current,token:gen});":"__phase7dEmit('status','timer-callback',{generation:generation.current,token});";
 if(source.split(marker).length!==2)throw Error('runtime fault requires one callback anchor');
 const emit=`__phase7dEmit('${kind}','fault-applied',{fault:'${fault}',targetCallbackOrdinal:2});`;
 const count=`const __boundaryInjection=__phase7dFaultTarget();`;
 if(fault==='callback-suppression')source=source.replace(marker,`${count}if(__boundaryInjection){${emit}return;}${marker}`);
 if(fault==='generation-mismatch')source=source.replace(marker,`${count}${marker}if(__boundaryInjection){${emit}${kind==='swipe'?'epoch':'generation'}.current++;}`);
 if(fault==='guard-suppression') {
  source=source.replace(marker,`${count}${marker}if(__boundaryInjection){${emit}}`);
  if(kind==='swipe')source=source.replace('if(gen===epoch.current)change(result);','if(!__boundaryInjection&&gen===epoch.current)change(result);').replace('accepted:gen===epoch.current,','accepted:!__boundaryInjection&&gen===epoch.current,').replace("rejection:gen===epoch.current?null:'generation-mismatch'","rejection:__boundaryInjection?'injected-guard':gen===epoch.current?null:'generation-mismatch'");
  else source=source.replace('if(token!==generation.current||!allowed.current)return;','if(__boundaryInjection||token!==generation.current||!allowed.current)return;').replace('accepted:token===generation.current&&allowed.current,','accepted:!__boundaryInjection&&token===generation.current&&allowed.current,').replace("rejection:token!==generation.current?'generation-mismatch'","rejection:__boundaryInjection?'injected-guard':token!==generation.current?'generation-mismatch'");
 }
 if(fault==='callback-delay'){
  const open=(kind==='swipe'?'later(()=>{':'timer.current=setTimeout(()=>{')+marker;
  if(source.split(open).length!==2)throw Error('delay callback opening mismatch');
  const replacement=(kind==='swipe'?'later(function __boundaryDelayed(){':'timer.current=setTimeout(function __boundaryDelayed(){')+`${count}if(__boundaryInjection){${emit}setTimeout(__boundaryDelayed,10000);return;}${marker}`;
  source=source.replace(open,replacement);
 }
 if(fault==='update-omission') {
  source=source.replace(marker,`${count}${marker}`);
  const target=kind==='swipe'?'if(gen===epoch.current)change(result);':'set(settleMorph(stateRef.current,generation.current,token,outcome));';
  if(source.split(target).length!==2)throw Error('runtime update fault anchor mismatch');
  source=source.replace(target,`if(__boundaryInjection){${emit}}else{${target}}`);
 }
 source+=`\nfunction __phase7dFaultTarget(){const w=window as unknown as {__phase7dBoundary?:{faultCallbackOrdinal?:number}};const s=w.__phase7dBoundary;if(!s)throw Error('validation fault requires boundary sink');s.faultCallbackOrdinal=(s.faultCallbackOrdinal??0)+1;return s.faultCallbackOrdinal===2;}\n`;
 return {source,manifest:{schema:1,kind,fault,validationOnly:true,mechanism:fault==='callback-suppression'?'original-callback-body-suppression-not-delivery-suppression':fault,targetCallbackOrdinal:2,delayVirtualMs:fault==='callback-delay'?10000:null,beforeSha256,afterSha256:sha(source)}};
}
