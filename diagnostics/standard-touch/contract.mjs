/** V2 diagnostic contract. Observed outcome is not physical-device or causal acceptance. */
export const EVENT_TYPES=['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','input','change','gotpointercapture','lostpointercapture'];
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const targetValue=(percent,min,max,step=1)=>min+Math.round((max-min)*percent/100/step)*step;
export const valueToX=(value,rect,min,max,thumbWidth=20)=>rect.x+thumbWidth/2+(rect.width-thumbWidth)*(value-min)/(max-min);
export const xToValue=(x,rect,min,max,step=1,thumbWidth=20)=>targetValue(Math.max(0,Math.min(100,(x-rect.x-thumbWidth/2)/(rect.width-thumbWidth)*100)),min,max,step);
export function evaluate(r){
 const events=(r.events||[]).filter(e=>!e.phase||e.phase==='capture'),counts=Object.fromEntries(EVENT_TYPES.map(t=>[t,events.filter(e=>e.type===t).length]));
 const inputs=events.filter(e=>e.type==='input'),down=events.find(e=>e.type==='pointerdown'),end=events.find(e=>e.type==='pointerup'||e.type==='pointercancel');
 const cancelled=counts.pointercancel>0||counts.touchcancel>0;
 const mode=r.metadata?.mode,observed=mode==='full'||mode==='minimal';
 const captureStarted=r.startedAt&&r.finishedAt;
 const complete=observed&&captureStarted&&counts.pointerdown===1&&!!end&&end.seq>down.seq&&end.pointerId===down.pointerId;
 const missing=[];if(!observed)missing.push('EVENT_CAPTURE_DISABLED');else {if(!counts.pointerdown)missing.push('POINTERDOWN_NOT_OBSERVED');if(!end)missing.push('POINTER_TERMINAL_NOT_OBSERVED');if(!inputs.length)missing.push('INPUT_NOT_OBSERVED');}
 const last=inputs.at(-1)?.value??events.at(-1)?.value??r.initial?.value??null;
 const final=r.final?.value??null,target=r.metadata?.targetValue,tolerance=r.metadata?.tolerance;
 const delta=finite(final)&&finite(target)?final-target:null;
 const moved=events.some(e=>e.type==='pointermove'&&down&&e.pointerId===down.pointerId&&e.seq>down.seq&&end&&e.seq<end.seq&&finite(e.clientX)&&Math.hypot(e.clientX-down.clientX,e.clientY-down.clientY)>1);
 let status=!observed?'NOT_TESTED':!events.length?'NOT_OBSERVED':cancelled?'CANCELLED':!complete?'INCOMPLETE':r.metadata?.method==='drag'&&!moved?'INCOMPLETE':inputs.length?'COMPLETED':'NO_VALUE_CHANGE_OBSERVED';
 if(status==='COMPLETED'){
  const pointerEvents=events.filter(e=>['pointermove','pointerup','pointercancel'].includes(e.type));
  const isTouch=down?.pointerType==='touch';
  const ts=events.filter(e=>e.type==='touchstart'),te=events.filter(e=>e.type==='touchend'||e.type==='touchcancel');
  if(counts.pointerup!==1||pointerEvents.some(e=>e.seq>down.seq&&e.seq<=end.seq&&e.pointerId!==down.pointerId)||inputs.some(e=>e.seq<=down.seq||e.seq>=end.seq)||isTouch&&(ts.length!==1||te.length!==1||ts[0].seq<=down.seq||te[0].seq<=end.seq))status='INCOMPLETE';
  if(final!==inputs.at(-1)?.value||r.final?.pending===true||r.final?.pending==='true')status='INCONSISTENT';
  if(r.surface==='product'&&(r.final?.committed?.params?.brightness!==final||r.final?.preview?.brightness!==final||r.final?.pending!==false||r.final?.history!==(final===r.initial?.value?0:1)))status='INCONSISTENT';
 }
 return {status,counts,cancelled:observed?cancelled:null,lastObservedValue:last,finalValue:final,committedValue:r.final?.committed?.params?.brightness??r.final?.committed?.brightness??null,delta,targetReached:status==='COMPLETED'&&finite(delta)&&finite(tolerance)?Math.abs(delta)<=tolerance:null,missing,physicalVerification:'NOT_TESTED',cause:'UNKNOWN',tapSupport:r.metadata?.method==='tap'?(inputs.length?'VALUE_CHANGE_OBSERVED':'UNKNOWN_NOT_INFERRED_FROM_SINGLE_TRIAL'):'NOT_APPLICABLE'};
}
const require=(condition,message)=>{if(!condition)throw Error(message);};
const rect=r=>r&&['x','y','width','height'].every(k=>finite(r[k]))&&r.width>20&&r.height>0;
export function validate(r,expected){
 require(r?.schemaVersion==='iad-standard-2','SCHEMA_VERSION');
 require(expected&&r.metadata?.head===expected.head&&r.metadata?.tree===expected.tree&&/^[a-f0-9]{40}$/.test(expected.head),'SOURCE_IDENTITY');
 require(JSON.stringify(Object.entries(r.metadata.sourceHashes||{}).sort())===JSON.stringify(Object.entries(expected.sourceHashes||{}).sort()),'SOURCE_HASH');
 require(['product','plain-html'].includes(r.surface),'SURFACE');
 const m=r.metadata,n=r.nativeRange;
 require(['drag','tap'].includes(m.method)&&['full','minimal','off'].includes(m.mode)&&['physical','playwright','synthetic'].includes(m.inputKind),'INPUT_MODE');
 require(n&&finite(n.min)&&finite(n.max)&&n.max>n.min&&finite(n.step)&&n.step>0&&rect(n.rect)&&n.thumbWidth===20&&n.touchAction==='pan-y','RANGE_GEOMETRY');
 require(finite(m.targetPercent)&&m.targetPercent>=0&&m.targetPercent<=100&&m.targetValue===targetValue(m.targetPercent,n.min,n.max,n.step),'TARGET_MAPPING');
 require(finite(m.tolerance)&&m.tolerance>=0&&m.tolerance<=n.step*5,'TARGET_TOLERANCE');
 require(r.initial&&r.final&&r.initial.value===0&&finite(r.final.value)&&r.final.value>=n.min&&r.final.value<=n.max,'INITIAL_FINAL');
 require(Number.isFinite(Date.parse(r.startedAt))&&Number.isFinite(Date.parse(r.finishedAt))&&Date.parse(r.finishedAt)>=Date.parse(r.startedAt),'UNFINISHED');
 require(r.environment&&typeof r.environment.userAgent==='string'&&r.environment.userAgent.length>0&&finite(r.devicePixelRatio)&&r.devicePixelRatio>0,'ENVIRONMENT');
 const vp=v=>v&&['width','height','scale','visualWidth','visualHeight','offsetLeft','offsetTop'].every(k=>finite(v[k]))&&v.width>0&&v.height>0&&v.scale>0;
 require(vp(r.environment.viewport)&&[r.initial,r.final].every(s=>rect(s.rect)&&vp(s.viewport)),'SNAPSHOT_GEOMETRY');
 require(Array.isArray(r.events),'EVENTS');let t=-Infinity;
 for(const [i,e]of r.events.entries()){
  require(e.seq===i&&['capture','next-animation-frame'].includes(e.phase)&&EVENT_TYPES.includes(e.type)&&finite(e.value)&&finite(e.observedAt)&&e.observedAt>=t&&finite(e.timeStamp)&&typeof e.isTrusted==='boolean','EVENT_STRUCTURE');t=e.observedAt;
  require(rect(e.rect)&&vp(e.viewport),'EVENT_GEOMETRY');require(e.clientX===null||finite(e.clientX),'COORDINATE');require(e.clientY===null||finite(e.clientY),'COORDINATE');
  if(e.type.startsWith('pointer')||e.type.endsWith('pointercapture'))require(['mouse','touch','pen'].includes(e.pointerType)&&Number.isInteger(e.pointerId),'POINTER_IDENTITY');if(['pointerdown','pointermove','pointerup','pointercancel'].includes(e.type))require(finite(e.clientX)&&finite(e.clientY),'POINTER_COORDINATES');if(finite(e.clientX))require(finite(e.mappedValue),'COORDINATE_VALUE_REQUIRED');if(finite(e.clientX)&&e.rect&&finite(e.mappedValue))require(e.mappedValue===xToValue(e.clientX,e.rect,n.min,n.max,n.step,n.thumbWidth),'COORDINATE_VALUE_MAPPING');
 }
 const d=evaluate(r);require(JSON.stringify(r.diagnosis)===JSON.stringify(d),'DIAGNOSIS_MISMATCH');
 require(d.physicalVerification==='NOT_TESTED'&&d.cause==='UNKNOWN','OVERCLAIM');return d;
}
export function compareConditions(a,b,expected){
 validate(a,expected);validate(b,expected);require(a.surface!==b.surface,'PAIR_SURFACES');
 const differences=[];for(const k of ['method','targetValue','targetPercent','tolerance','mode','inputKind'])if(a.metadata[k]!==b.metadata[k])differences.push(k);
 for(const k of ['min','max','step','touchAction','thumbWidth'])if(a.nativeRange[k]!==b.nativeRange[k])differences.push(k);
 for(const k of ['x','y','width','height'])if(Math.abs(a.nativeRange.rect[k]-b.nativeRange.rect[k])>.5)differences.push('rect.'+k);
 if(a.devicePixelRatio!==b.devicePixelRatio)differences.push('devicePixelRatio');
 if(JSON.stringify(a.environment)!==JSON.stringify(b.environment))differences.push('environment');
 const points=r=>r.events.filter(e=>['pointerdown','pointerup','pointercancel'].includes(e.type)).map(e=>({type:e.type,x:e.clientX,y:e.clientY}));
 const ap=points(a),bp=points(b);if(JSON.stringify(ap)!==JSON.stringify(bp))differences.push('inputCoordinatesObservedDifference');
 return {status:differences.length?'CONDITIONS_DIFFER':'RECORDED_CONDITIONS_MATCH',differences,outcomes:[a.diagnosis,b.diagnosis],physicalVerification:'NOT_TESTED',cause:'UNKNOWN',note:'No causal inference; final values are outcomes, not matching prerequisites. Existing strict v1 comparator remains unchanged.'};
}
