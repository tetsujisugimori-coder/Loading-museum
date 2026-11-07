import {test} from 'node:test';
import {PROBE_SOURCE_FILES} from '../scripts/adjustment-probe-manifest.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateProbe,compareProbeTrials,loadProbeFile} from '../scripts/adjustment-physical-contract.mjs';
const expected={head:'a'.repeat(40),tree:'b'.repeat(40),sourceHashes:Object.fromEntries(PROBE_SOURCE_FILES.map(f=>[f,'c'.repeat(64)]))};
const rect={x:0,y:0,width:280,height:32},viewport={width:390,height:1000,scale:1,offsetLeft:0,offsetTop:0};
const state=(surface,value='0')=>({value,rect,viewport,scroll:{x:0,y:0},preview:surface==='product'?{brightness:Number(value)}:null,committed:surface==='product'?{params:{brightness:Number(value)}}:null,history:surface==='product'?(value==='0'?0:1):null,pending:surface==='product'?'false':null});
function trial(surface='product',method='tap',repetition=1){const metadata={...expected,trialId:`${method}-${repetition}`,repetition,method,inputKind:'playwright',device:'emulated',os:'Linux',browser:'WebKit',operator:'automated-test',sessionId:'test',capture:false};
 const types=['pointerdown','touchstart',...(method==='drag'?['touchmove']:[]),'input','pointerup','touchend'];
 return {schemaVersion:1,metadata,surface,userAgent:'test',devicePixelRatio:1,viewport,startedAt:'2026-11-08T00:00:00Z',finishedAt:'2026-11-08T00:00:01Z',nativeRange:{rect,touchAction:'auto',min:'-100',max:'100',step:'1'},initial:state(surface),final:state(surface,'54'),events:types.map((type,i)=>({...state(surface,type==='input'?'54':'0'),type,phase:'capture',seq:i,observedAt:i,timeStamp:i,isTrusted:true,pointerId:1,pointerType:'touch',target:'range',clientX:method==='drag'&&type==='pointerdown'?140:210,clientY:16,pageX:210,pageY:16,touches:type==='touchstart'?[{identifier:0,clientX:method==='drag'?140:210,clientY:16,pageX:210,pageY:16}]:type==='touchend'?[]:null,changedTouches:type.startsWith('touch')?[{identifier:0,clientX:method==='drag'&&type==='touchstart'?140:210,clientY:16,pageX:210,pageY:16}]:null}))};}
const suite=()=>['tap','drag'].flatMap(method=>[1,2,3].flatMap(n=>['product','plain-html'].map(s=>trial(s,method,n))));
test('complete paired automatic evidence is not physical Safari proof',()=>{const r=compareProbeTrials(suite(),expected);assert.equal(r.productAcceptance,'PASS');assert.equal(r.physicalDeviceResult,'NOT_TESTED');assert.equal(r.cause,'UNKNOWN');});
test('trusted physical assertion still needs human hardware/screenshot review',()=>{const s=suite();for(const r of s)r.metadata.inputKind='physical';assert.equal(compareProbeTrials(s,expected).physicalDeviceResult,'REQUIRES_OPERATOR_AND_SCREENSHOT_REVIEW');});
test('observed cancellation with rollback remains FAIL, not incomplete or green',()=>{const r=trial();r.events.find(e=>e.type==='pointerup').type='pointercancel';r.final=state('product');const v=validateProbe(r,expected);assert.equal(v.collection,'COMPLETE');assert.equal(v.acceptance,'FAIL');assert.equal(v.cancelled,true);});
const negatives={oldHead:r=>r.metadata.head='d'.repeat(40),oldTree:r=>r.metadata.tree='d'.repeat(40),hashMismatch:r=>r.metadata.sourceHashes={recorder:'d'.repeat(64)},empty:r=>r.events=[],missingFinal:r=>r.final=null,notFinished:r=>r.finishedAt=null,badSequence:r=>r.events[1].seq=99,reversedObservation:r=>r.events[2].observedAt=-1,noPointerEnd:r=>r.events=r.events.filter(e=>e.type!=='pointerup').map((e,i)=>({...e,seq:i})),noTouchEnd:r=>r.events.find(e=>e.type==='touchend').type='change',untrusted:r=>r.events[0].isTrusted=false,noInput:r=>r.events.find(e=>e.type==='input').type='change',NaN:r=>r.events[0].clientX=NaN,badPoint:r=>r.events[0].touches=[{}],badViewport:r=>r.viewport.scale=0,noTrial:r=>delete r.metadata.trialId,noDevice:r=>delete r.metadata.device,pending:r=>r.final.pending='true',mismatch:r=>r.final.value='99',notReset:r=>r.initial.history=1};
for(const [name,mutate] of Object.entries(negatives))test(`reject ${name}`,()=>{const r=trial();mutate(r);assert.throws(()=>validateProbe(r,expected));});
for(const [name,mutate] of Object.entries({missingPair:s=>s.pop(),duplicate:s=>s.push(structuredClone(s[0])),badRect:s=>s[1].nativeRange={...s[1].nativeRange,rect:{...rect,x:2}},badStart:s=>s[1].events[0].clientX=200,badDragEnd:s=>s[7].events.find(e=>e.type==='pointerup').clientX=150,wrongMethod:s=>s[1].metadata.method='mouse',onlyTap:s=>s.splice(6),oneRepetition:s=>s.splice(2,4),sameRep:s=>s[2].metadata.repetition=s[3].metadata.repetition=1}))test(`reject pair ${name}`,()=>{const s=suite();mutate(s);assert.throws(()=>compareProbeTrials(s,expected));});
test('PNG missing, hash mismatch and non-PNG reject before comparison',()=>{const dir=mkdtempSync(join(tmpdir(),'iad-probe-')),file=join(dir,'trial.json'),r=trial();writeFileSync(file,JSON.stringify(r));assert.throws(()=>loadProbeFile(file));const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==','base64');r.png={file:'trial.png',sha256:createHash('sha256').update(bytes).digest('hex')};writeFileSync(file,JSON.stringify(r));assert.throws(()=>loadProbeFile(file));writeFileSync(join(dir,'trial.png'),bytes);assert.equal(loadProbeFile(file).png.sha256,r.png.sha256);writeFileSync(join(dir,'trial.png'),Buffer.concat([bytes,Buffer.from('changed')]));assert.throws(()=>loadProbeFile(file));});

for(const [name,mutate] of Object.entries({
 cancelButCommit:r=>r.events.find(e=>e.type==='pointerup').type='pointercancel',
 alienPointer:r=>r.events.find(e=>e.type==='pointerup').pointerId=999,
 endBeforeStart:r=>{const a=r.events[0],b=r.events.find(e=>e.type==='pointerup');[a.type,b.type]=[b.type,a.type];},
 noChangedInput:r=>r.events.find(e=>e.type==='input').value='0',
 outsideRange:r=>{r.final.value='1000000';r.final.preview.brightness=1000000;r.final.committed.params.brightness=1000000;},
 fakeDrag:r=>{r.metadata.method='drag';r.events.push({...r.events[0],seq:r.events.length,observedAt:99,type:'pointermove'});},
 emptyTouches:r=>{for(const e of r.events){if(e.type.startsWith('touch')){e.touches=[];e.changedTouches=[];}}}
}))test(`independent counterexample ${name} stays rejected`,()=>{const r=trial();mutate(r);assert.throws(()=>validateProbe(r,expected));});

test('PNG pixel decoding rejects truncation, corrupted CRC, absent pixels and trailing bytes',async()=>{
 const {decodeEvidencePng}=await import('../scripts/adjustment-png-evidence.mjs');
 // Use the independently prepared valid red RGBA pixel from the prior test.
 const source=(await import('node:fs')).readFileSync(new URL(import.meta.url),'utf8');
 const valid=Buffer.from(source.match(/const bytes=Buffer.from\('([^']+)'/)[1],'base64');
 const decoded=decodeEvidencePng(valid);assert.equal(decoded.width,1);assert.equal(decoded.height,1);assert.equal(decoded.pixelSHA256,createHash('sha256').update(Buffer.from([255,0,0,255])).digest('hex'));
 const changed=Buffer.from(valid);changed[45]^=1;
 for(const bad of [valid.subarray(0,8),valid.subarray(0,-4),changed,Buffer.concat([valid,Buffer.from('tail')])])assert.throws(()=>decodeEvidencePng(bad));

});
