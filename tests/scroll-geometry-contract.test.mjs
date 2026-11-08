import test from 'node:test';import assert from 'node:assert/strict';import {validate,compare} from '../diagnostics/scroll-geometry/contract.mjs';
const expected={head:'head',tree:'tree',protocolHash:'protocol',sourceHash:'source'};
function record(surface='product',condition='A'){
 const identity={...expected,trialId:'pair-'+surface,pairId:'pair',condition,engine:'webkit',width:390,motion:'normal',method:'tap',repetition:1,surface,browserVersion:'same',inputPath:'Playwright touchscreen tap'};
 const point=(seq)=>({trialId:identity.trialId,seq,t:seq,rect:{x:24,y:310,left:24,right:366,top:310,bottom:354,width:342,height:44},viewport:{innerWidth:390,innerHeight:900,width:390,height:900,offsetLeft:0,offsetTop:0,scale:1,devicePixelRatio:1},scroll:{x:0,y:0,scrollingElement:{tag:'HTML',left:0,top:0},documentElement:{left:0,top:0},body:{left:0,top:0}},value:0});
 const points=[point(0),point(1),point(2)];return {schemaVersion:'iad-scroll-geometry-1',identity,initial:points[0],final:points[2],points,events:[{trialId:identity.trialId,index:0,t:1,type:'pointerdown',target:'range',pointerId:1,pointerType:'touch',clientX:200,clientY:332,pageX:200,pageY:332,isTrusted:true,timeStamp:1,cancelable:true,defaultPrevented:false,snapshot:points[1]},{trialId:identity.trialId,index:1,t:2,type:'pointerup',target:'range',pointerId:1,pointerType:'touch',clientX:200,clientY:332,pageX:200,pageY:332,isTrusted:true,timeStamp:1,cancelable:true,defaultPrevented:false,snapshot:points[2]}],inputs:[{trialId:identity.trialId,index:0,t:0,kind:'touchscreen.tap',x:275.5,y:332}],physicalInput:'NOT_TESTED',startedAt:'2026-11-09T00:00:00Z',finishedAt:'2026-11-09T00:00:01Z',observer:'passive capture + requestAnimationFrame'};
}
function shift(r,kind,n){for(const p of r.points){if(kind==='scroll'){p.scroll.y=n;p.scroll.scrollingElement.top=n;p.scroll.documentElement.top=n;}else{p.rect.y+=n;p.rect.top+=n;p.rect.bottom+=n;}}if(kind==='rect')for(const i of r.inputs)i.y+=n;return r;}
for(const [condition,rect,scroll]of [['A',0,0],['B',0,1000],['C',100,0],['D',100,1000]])test('independent condition '+condition,()=>{const a=record('product',condition),b=record('plain',condition);if(rect)shift(a,'rect',rect);if(scroll)shift(a,'scroll',scroll);const r=compare(a,b,expected);assert.equal(r.group,condition);assert.equal(r.construction,'ESTABLISHED');assert.equal(r.comparison,condition==='A'?'RECORDED_CONDITIONS_MATCH':'RECORDED_CONDITIONS_DIFFER');});
test('final value difference is not geometry',()=>{const a=record(),b=record('plain');b.final.value=50;assert.equal(compare(a,b,expected).construction,'ESTABLISHED');});
test('cancel result independent of matching conditions',()=>{const a=record(),b=record('plain');a.events[1].type='pointercancel';const r=compare(a,b,expected);assert.equal(r.construction,'ESTABLISHED');assert.equal(r.a.outcome,'CANCELLED');});
for(const [name,mutate]of [
 ['scroll erased',r=>{for(const p of r.points)delete p.scroll.y;}],
 ['missing rect',r=>{delete r.points[1].rect;}],
 ['null value',r=>{r.points[1].scroll.x=null;}],
 ['numeric string',r=>{r.points[1].viewport.scale='1';}],
 ['bad rectangle',r=>{r.points[1].rect.width=-2;}],
 ['events from another trial',r=>{r.events[0].trialId='other';}],
 ['points from another trial',r=>{r.points[1].trialId='other';}],
 ['old HEAD',r=>{r.identity.head='old';}],
 ['old protocol',r=>{r.identity.protocolHash='old';}],
 ['old runner',r=>{r.identity.sourceHash='old';}],
 ['empty timeline',r=>{r.points=[];}],
 ['event missing',r=>{delete r.events;}],
 ['input missing',r=>{r.inputs=[];}],
 ['event order',r=>{r.events[0].t=4;}],
 ['point order',r=>{r.points[1].t=4;}],
 ['capture metadata',r=>{delete r.startedAt;}],
 ['wrong input path',r=>{r.inputs[0].x=1;}],
 ['reversed lifecycle',r=>{r.events[0].type='pointerup';r.events[1].type='pointerdown';}],
 ['different pointer',r=>{r.events[1].pointerId=9;}],
 ['missing event trust',r=>{delete r.events[0].isTrusted;}],
 ['event object',r=>{r.events={};}],
 ['zero viewport',r=>{r.points[1].viewport.width=0;}]
])test('reject '+name,()=>{const a=record();mutate(a);assert.equal(validate(a,expected).valid,false);});
test('same final value cannot hide temporary scroll drift',()=>{const a=record(),b=record('plain');a.points[1].scroll.y=300;assert.equal(compare(a,b,expected).comparison,'WITHIN_TRIAL_CHANGED');});
test('temporary viewport restored',()=>{const a=record(),b=record('plain');a.points[1].viewport.scale=2;assert.equal(compare(a,b,expected).construction,'NOT_EXECUTABLE');});
test('mismatched pair rejected',()=>{const a=record(),b=record('plain');b.identity.pairId='other';assert.equal(compare(a,b,expected).valid,false);});
test('viewport confound separate',()=>{const a=record(),b=record('plain');for(const p of b.points)p.viewport.scale=2;const r=compare(a,b,expected);assert.equal(r.group,'A');assert.equal(r.comparison,'VIEWPORT_CONFOUNDED');});
test('expected binding required',()=>assert.equal(validate(record()).valid,false));
test('one-pixel B is not requested thousand-pixel construction',()=>{const a=shift(record('product','B'),'scroll',1),b=record('plain','B');assert.equal(compare(a,b,expected).construction,'NOT_EXECUTABLE');});
test('C width difference is not requested vertical shift',()=>{const a=record('product','C'),b=record('plain','C');for(const p of a.points){p.rect.width+=100;p.rect.right+=100;}assert.equal(compare(a,b,expected).construction,'NOT_EXECUTABLE');});
test('matching wrong absolute coordinates are not established',()=>{const a=shift(record(),'rect',200),b=shift(record('plain'),'rect',200);assert.equal(compare(a,b,expected).construction,'NOT_EXECUTABLE');});
test('response before input rejected',()=>{const r=record();r.inputs[0].t=1.5;assert.equal(validate(r,expected).valid,false);});
test('pointer type change rejected',()=>{const r=record();r.events[1].pointerType='pen';assert.equal(validate(r,expected).valid,false);});
test('event snapshot order rejected',()=>{const r=record();r.events[1].snapshot=r.events[0].snapshot;assert.equal(validate(r,expected).valid,false);});
