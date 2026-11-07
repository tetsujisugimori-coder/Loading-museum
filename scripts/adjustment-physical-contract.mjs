/** Evidence validation and paired comparison, never permission to claim physical-device PASS. */
import fs from 'node:fs';
import {PROBE_SOURCE_FILES} from './adjustment-probe-manifest.mjs';
import {decodeEvidencePng} from './adjustment-png-evidence.mjs';
import {resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hash=/^[0-9a-f]{64}$/,sha=/^[0-9a-f]{40}$/;
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const rectangle=r=>object(r)&&['x','y','width','height'].every(k=>finite(r[k]))&&r.width>0&&r.height>0;
const viewport=v=>object(v)&&['width','height','scale','offsetLeft','offsetTop'].every(k=>finite(v[k]))&&v.width>0&&v.height>0&&v.scale>0;
const state=s=>object(s)&&typeof s.value==='string'&&Number.isInteger(Number(s.value))&&Number(s.value)>=-100&&Number(s.value)<=100&&rectangle(s.rect)&&viewport(s.viewport)&&object(s.scroll)&&finite(s.scroll.x)&&finite(s.scroll.y);
export function validateProbe(r,expected) {
 need(object(expected)&&sha.test(expected.head)&&sha.test(expected.tree)&&object(expected.sourceHashes)&&PROBE_SOURCE_FILES.every(f=>hash.test(expected.sourceHashes[f])),'EXPECTED_MANIFEST_REQUIRED');
 need(object(r)&&r.schemaVersion===1,'SCHEMA_VERSION');
 const m=r.metadata;
 need(object(m)&&m.head===expected.head&&m.tree===expected.tree,'SOURCE_IDENTITY');
 need(object(m.sourceHashes)&&JSON.stringify(Object.entries(m.sourceHashes).sort())===JSON.stringify(Object.entries(expected.sourceHashes).sort())&&Object.values(m.sourceHashes).every(v=>hash.test(v)),'SOURCE_HASH');
 need(typeof m.trialId==='string'&&m.trialId.length>0&&Number.isInteger(m.repetition)&&m.repetition>=1,'TRIAL_ID');
 need(['tap','drag','mouse'].includes(m.method)&&['physical','playwright','synthetic'].includes(m.inputKind),'INPUT_PROVENANCE');
 for(const k of ['device','os','browser','operator','sessionId'])need(typeof m[k]==='string'&&m[k].length>0,`MISSING_${k}`);
 need(typeof m.capture==='boolean','CAPTURE_SETTING');
 need(['product','plain-html'].includes(r.surface),'SURFACE');
 need(typeof r.userAgent==='string'&&r.userAgent.length>0&&finite(r.devicePixelRatio)&&r.devicePixelRatio>0&&viewport(r.viewport),'ENVIRONMENT');
 need(Number.isFinite(Date.parse(r.startedAt))&&Number.isFinite(Date.parse(r.finishedAt))&&Date.parse(r.finishedAt)>=Date.parse(r.startedAt),'UNFINISHED');
 need(state(r.initial)&&state(r.final)&&r.initial.value==='0','INITIAL_FINAL_STATE');
 need(object(r.nativeRange)&&rectangle(r.nativeRange.rect)&&r.nativeRange.min==='-100'&&r.nativeRange.max==='100'&&r.nativeRange.step==='1'&&['auto','pan-y','none'].includes(r.nativeRange.touchAction),'RANGE_CONDITION');
 need(Array.isArray(r.events)&&r.events.length>0,'EMPTY_EVENTS');
 let previous=-Infinity;
 for(const [i,e] of r.events.entries()) {
  need(object(e)&&e.seq===i&&['capture','next-animation-frame'].includes(e.phase)&&finite(e.observedAt)&&e.observedAt>=previous&&finite(e.timeStamp)&&typeof e.isTrusted==='boolean'&&typeof e.type==='string'&&typeof e.target==='string'&&state(e),'EVENT_STRUCTURE');
  previous=e.observedAt;
  need(e.pointerId===null||Number.isInteger(e.pointerId),'POINTER_ID');
  for(const k of ['clientX','clientY','pageX','pageY'])need(e[k]===null||finite(e[k]),'COORDINATES');
  for(const k of ['touches','changedTouches'])need(e[k]===null||(Array.isArray(e[k])&&e[k].every(t=>Number.isInteger(t.identifier)&&['clientX','clientY','pageX','pageY'].every(k=>finite(t[k])))),'TOUCH_POINTS');
 }
 const capture=r.events.filter(e=>e.phase==='capture');
 const downs=capture.filter(e=>e.type==='pointerdown'),ends=capture.filter(e=>['pointerup','pointercancel'].includes(e.type));
 need(downs.length===1&&ends.length>0,'INCOMPLETE_POINTER_TRACE');
 const down=downs[0],lastEnd=ends.at(-1),inputs=capture.filter(e=>e.type==='input');
 need(Number.isInteger(down.pointerId)&&down.pointerType===(m.method==='mouse'?'mouse':'touch'),'POINTER_START');
 need(ends.every(e=>e.seq>down.seq&&e.pointerId===down.pointerId&&e.pointerType===down.pointerType),'POINTER_END_ID_OR_ORDER');
 need(capture.filter(e=>e.type==='pointerup').length<=1&&capture.filter(e=>e.type==='pointercancel').length<=1,'MULTIPLE_TERMINALS');
 need(capture.filter(e=>['gotpointercapture','lostpointercapture'].includes(e.type)).every(e=>e.seq>down.seq&&e.pointerId===down.pointerId),'CAPTURE_ID_OR_ORDER');
 if(m.inputKind!=='synthetic')need(capture.every(e=>e.isTrusted),'UNTRUSTED_NATIVE_EVIDENCE');
 need(inputs.length>0&&inputs.every(e=>e.seq>down.seq&&e.seq<lastEnd.seq),'INPUT_ORDER_OR_MISSING');
 if(m.method!=='mouse'){
  const starts=capture.filter(e=>e.type==='touchstart'),terminals=capture.filter(e=>['touchend','touchcancel'].includes(e.type));
  need(starts.length===1&&terminals.length===1,'INCOMPLETE_TOUCH_TRACE');
  const start=starts[0],end=terminals[0];
  need(end.seq>start.seq&&start.touches?.length===1&&start.changedTouches?.length===1&&end.changedTouches?.length===1&&end.touches?.length===0,'TOUCH_POINTS_OR_ORDER');
  const id=start.changedTouches[0].identifier;
  need(start.seq>down.seq&&end.seq>lastEnd.seq,'CROSS_FAMILY_EVENT_ORDER');
  need(start.touches[0].identifier===id&&end.changedTouches[0].identifier===id,'TOUCH_ID');
  for(const move of capture.filter(e=>e.type==='touchmove'))need(move.seq>start.seq&&move.seq<end.seq&&move.touches?.length===1&&move.changedTouches?.length===1&&move.touches[0].identifier===id&&move.changedTouches[0].identifier===id,'TOUCH_MOVE_ID_OR_ORDER');
  need(Math.abs(end.changedTouches[0].clientX-lastEnd.clientX)<=1&&Math.abs(end.changedTouches[0].clientY-lastEnd.clientY)<=1,'TOUCH_POINTER_END_COORDINATES');
  need(Math.abs(start.changedTouches[0].clientX-down.clientX)<=1&&Math.abs(start.changedTouches[0].clientY-down.clientY)<=1,'TOUCH_POINTER_COORDINATES');
 }
 if(m.method==='drag')need(capture.some(e=>e.seq>down.seq&&e.seq<lastEnd.seq&&((e.type==='pointermove'&&e.pointerId===down.pointerId&&Math.hypot(e.clientX-down.clientX,e.clientY-down.clientY)>1)||(e.type==='touchmove'&&e.changedTouches?.some(t=>Math.hypot(t.clientX-down.clientX,t.clientY-down.clientY)>1)))),'DRAG_MOVEMENT_MISSING');
 const cancelled=capture.some(e=>e.type==='pointercancel'||e.type==='touchcancel');
 const lastInput=Number(inputs.at(-1).value);
 if(r.surface==='product'){
  for(const s of [r.initial,r.final])need(object(s.preview)&&object(s.committed?.params)&&finite(s.committed.params.brightness)&&Number.isInteger(s.history),'PRODUCT_STATE');
  need(r.initial.committed.params.brightness===0&&r.initial.preview.brightness===0&&r.initial.pending==='false'&&r.initial.history===0,'PRODUCT_NOT_RESET');
  if(cancelled)need(r.final.value===r.initial.value&&r.final.history===0,'CANCELLED_BUT_COMMITTED');
  else if(Number(r.final.value)!==0)need(Number(r.final.value)===lastInput&&lastInput!==Number(r.initial.value),'INPUT_FINAL_MISMATCH');
  need(r.final.pending==='false'&&r.final.preview.brightness===r.final.committed.params.brightness&&Number(r.final.value)===r.final.committed.params.brightness,'PENDING_OR_INCONSISTENT');
 }
 return {collection:'COMPLETE',physicalVerification:m.inputKind==='physical'?'OPERATOR_ATTESTED_ONLY':'NOT_TESTED',
  cancelled,
  acceptance:m.inputKind==='synthetic'?'NOT_TESTED':r.surface==='product'?(!cancelled&&lastInput===r.final.committed.params.brightness&&r.final.committed.params.brightness>20&&r.final.history===1?'PASS':'FAIL'):'CONTROL_ONLY',
  sequence:capture.map(e=>e.type),finalValue:Number(r.final.value)};
}
const near=(a,b)=>Math.abs(a-b)<=0.5;
export function compareProbeTrials(records,expected,{minimumRepetitions=3,requiredMethods=['tap','drag']}={}) {
 need(Number.isInteger(minimumRepetitions)&&minimumRepetitions>=1,'REPETITION_THRESHOLD');
 need(Array.isArray(records)&&records.length>0,'NO_TRIALS');
 const groups=new Map(),keys=new Set(),validated=[];
 for(const r of records){const v=validateProbe(r,expected),m=r.metadata,key=`${m.trialId}/${r.surface}`;
  need(!keys.has(key),'DUPLICATE_TRIAL');keys.add(key);validated.push(v);
  const group=groups.get(m.trialId)||[];group.push(r);groups.set(m.trialId,group);
 }
 need(Array.isArray(requiredMethods)&&requiredMethods.length>0&&requiredMethods.every(m=>['tap','drag','mouse'].includes(m)),'REQUIRED_METHODS');
 const pairs=[];const counts=new Map(),coverage=new Map();
 for(const [trialId,rows] of groups){need(rows.length===2,'UNPAIRED_TRIAL');
  const a=rows.find(r=>r.surface==='product'),b=rows.find(r=>r.surface==='plain-html');need(a&&b,'PAIR_SURFACES');
  for(const k of ['method','inputKind','device','os','browser','operator','sessionId','capture','repetition'])need(a.metadata[k]===b.metadata[k],`PAIR_${k}`);
  need(a.userAgent===b.userAgent&&a.devicePixelRatio===b.devicePixelRatio,'PAIR_ENVIRONMENT');
  for(const k of ['width','height','scale','offsetLeft','offsetTop'])need(near(a.viewport[k],b.viewport[k]),'PAIR_VIEWPORT');
  for(const k of ['x','y','width','height'])need(near(a.nativeRange.rect[k],b.nativeRange.rect[k]),'PAIR_RECT');
  need(a.nativeRange.touchAction===b.nativeRange.touchAction,'PAIR_TOUCH_ACTION');
  const start=r=>r.events.find(e=>e.phase==='capture'&&e.type==='pointerdown');
  need(finite(start(a).clientX)&&finite(start(a).clientY)&&near(start(a).clientX,start(b).clientX)&&near(start(a).clientY,start(b).clientY),'PAIR_INPUT_COORDINATES');
  if(a.metadata.method==='drag'){
   const end=r=>r.events.filter(e=>e.phase==='capture'&&['pointerup','pointercancel'].includes(e.type)).at(-1);
   need(finite(end(a).clientX)&&finite(end(a).clientY)&&near(end(a).clientX,end(b).clientX)&&near(end(a).clientY,end(b).clientY),'PAIR_DRAG_ENDPOINT');
  }
  const environment=JSON.stringify([a.metadata.inputKind,a.metadata.device,a.metadata.os,a.metadata.browser,a.metadata.capture,a.nativeRange.touchAction]);
  const methods=coverage.get(environment)||new Set();methods.add(a.metadata.method);coverage.set(environment,methods);
  const va=validateProbe(a,expected),vb=validateProbe(b,expected);
  pairs.push({trialId,method:a.metadata.method,inputKind:a.metadata.inputKind,product:va,plain:vb});
  const countKey=JSON.stringify([a.metadata.inputKind,a.metadata.device,a.metadata.os,a.metadata.browser,a.metadata.method,a.metadata.capture,a.nativeRange.touchAction]);
  const reps=counts.get(countKey)||new Set();need(!reps.has(a.metadata.repetition),'DUPLICATE_REPETITION');reps.add(a.metadata.repetition);counts.set(countKey,reps);
 }
 need([...coverage.values()].every(s=>requiredMethods.every(m=>s.has(m))),'MISSING_METHOD_CONDITION');
 need([...counts.values()].every(s=>s.size>=minimumRepetitions),'INSUFFICIENT_REPETITIONS');
 return {status:'COMPARISON_COMPLETE',productAcceptance:pairs.some(p=>p.product.acceptance==='FAIL')?'FAIL':pairs.every(p=>p.product.acceptance==='PASS')?'PASS':'NOT_TESTED',
  physicalDeviceResult:records.every(r=>r.metadata.inputKind==='physical')?'REQUIRES_OPERATOR_AND_SCREENSHOT_REVIEW':'NOT_TESTED',
  cause:'UNKNOWN',pairs};
}
export function loadProbeFile(file){
 const r=JSON.parse(fs.readFileSync(file,'utf8'));
 need(object(r.png)&&typeof r.png.file==='string'&&r.png.file===basename(r.png.file)&&hash.test(r.png.sha256),'PNG_EVIDENCE_REQUIRED');
 const bytes=fs.readFileSync(resolve(dirname(file),r.png.file));
 decodeEvidencePng(bytes);
 need(bytes.length>=57&&bytes.readUInt32BE(8)===13&&bytes.toString('ascii',12,16)==='IHDR'&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0&&bytes.toString('ascii',bytes.length-8,bytes.length-4)==='IEND','PNG_STRUCTURE');
 need(createHash('sha256').update(bytes).digest('hex')===r.png.sha256,'PNG_HASH');
 return r;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [manifest,...files]=process.argv.slice(2);const result=compareProbeTrials(files.map(loadProbeFile),JSON.parse(fs.readFileSync(manifest,'utf8')));console.log(JSON.stringify(result,null,2));if(result.productAcceptance!=='PASS')process.exitCode=1;}
 catch(e){console.error(e.message);process.exitCode=2;}
}
