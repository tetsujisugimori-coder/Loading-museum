/** Immutable deterministic counterexamples. Synthetic fixtures, not browser evidence. */
export const expected = {head:'a'.repeat(40), tree:'b'.repeat(40), protocolHash:'c'.repeat(64), sourceHash:'d'.repeat(64)};
function record(surface='product',condition='A') {
  const identity={...expected,trialId:`trial-${surface}`,pairId:'pair',surface,condition,engine:'webkit',width:390,motion:'normal',method:'tap',repetition:1,browserVersion:'test-version',inputPath:'Playwright touchscreen tap',requested:{scrollY:0,rectY:310}};
  const point=(seq)=>({trialId:identity.trialId,seq,t:seq,reason:['initial','event:pointerdown','event:pointerup','final'][seq],rect:{x:24,y:310,left:24,top:310,right:366,bottom:354,width:342,height:44},viewport:{innerWidth:390,innerHeight:900,width:390,height:900,offsetLeft:0,offsetTop:0,scale:1,devicePixelRatio:1},scroll:{x:0,y:0,scrollingElement:{tag:'HTML',left:0,top:0},documentElement:{left:0,top:0},body:{left:0,top:0}},value:seq>1?50:0});
  const points=Array.from({length:4},(_,i)=>point(i));
  const event=(type,index,pointerId=1)=>({trialId:identity.trialId,index,t:index+0.9,type,target:'range',pointerId,pointerType:'touch',clientX:275.5,clientY:332,pageX:275.5,pageY:332,isTrusted:true,cancelable:true,defaultPrevented:false,timeStamp:index+100,snapshot:points[index+1]});
  return {schemaVersion:'iad-scroll-geometry-1',identity,points,initial:points[0],final:points.at(-1),events:[event('pointerdown',0),event('pointerup',1)],inputs:[{trialId:identity.trialId,index:0,t:0.5,kind:'touchscreen.tap',x:275.5,y:332}],physicalInput:'NOT_TESTED',cause:'UNKNOWN',startedAt:'2026-11-09T00:00:00Z',finishedAt:'2026-11-09T00:00:01Z'};
}
export function originalCases(){
 const cases=[];
 function test(name,mutate){const a=record(),b=record('plain');mutate(a,b);cases.push({name,a,b});}
test('control',()=>{});
test('pointerup before pointerdown',(a)=>{a.events[0].type='pointerup';a.events[1].type='pointerdown';});
test('terminal from different pointer',(a)=>{a.events[1].pointerId=999;});
test('cross-family incomplete gesture',(a)=>{a.events[1].type='touchend';});
test('browser and input path identity absent',(a,b)=>{for(const r of [a,b]){delete r.identity.browserVersion;delete r.identity.inputPath;}});
test('tap identity with arbitrary command and no coordinates',(a)=>{a.inputs[0]={trialId:a.identity.trialId,index:0,t:-100,kind:'unrelated'};for(const e of a.events){delete e.pointerId;delete e.pointerType;delete e.clientX;delete e.clientY;delete e.pageX;delete e.pageY;delete e.timeStamp;delete e.isTrusted;}});
test('condition A entire recording at wrong width and target',(a,b)=>{for(const r of [a,b])for(const p of r.points){p.rect.y=p.rect.top=510;p.rect.bottom=554;p.viewport.innerWidth=p.viewport.width=1280;}});
test('condition B constructed by 1px instead of 1000',(a,b)=>{a.identity.condition=b.identity.condition='B';a.identity.requested.scrollY=1000;for(const p of a.points)p.scroll.y=p.scroll.scrollingElement.top=p.scroll.documentElement.top=1;});
test('condition C wrong rectangle dimension',(a,b)=>{a.identity.condition=b.identity.condition='C';a.identity.requested.rectY=410;for(const p of a.points){p.rect.width+=100;p.rect.right+=100;}});
test('all capture metadata and timestamps absent',(a,b)=>{for(const r of [a,b]){delete r.startedAt;delete r.finishedAt;delete r.observer;delete r.missing;}});
test('cancellation preserved control',(a)=>{a.events[1].type='pointercancel';});
 return cases;
}
export function completeCases(){
 const source=originalCases()[0],cases=[];
 function run(name,mutate){const {a,b}=structuredClone(source);for(const r of [a,b]){r.observer='passive capture + requestAnimationFrame';r.initial=r.points[0];r.final=r.points.at(-1);for(const e of r.events)e.snapshot=r.points.find(p=>p.seq===e.snapshot.seq);}mutate(a,b);cases.push({name,a,b});}
run('protocol-complete positive control',()=>{});
run('tap command outside range',(a)=>{a.inputs[0].x=0;a.inputs[0].y=0;});
run('different pair tap command target',(a,b)=>{b.inputs[0].x=100;});
run('input command logged after completed gesture',(a)=>{a.inputs[0].t=2.8;});
run('unfinished second pointer after completion',(a)=>{const p=structuredClone(a.points[2]);p.seq=3;p.t=2.5;p.reason='event:pointerdown';a.points.splice(3,0,p);a.final.seq=4;const v={...structuredClone(a.events[0]),index:2,t:2.4,pointerId:2,snapshot:p};a.events.push(v);});
run('touch lifecycle unfinished after pointer completion',(a)=>{const p=structuredClone(a.points[2]);p.seq=3;p.t=2.5;p.reason='event:touchstart';a.points.splice(3,0,p);a.final.seq=4;const v={...structuredClone(a.events[0]),index:2,t:2.4,type:'touchstart',touchId:1,snapshot:p};a.events.push(v);});
run('pointer identity changes type mid gesture',(a)=>{a.events[1].pointerType='pen';});
run('event snapshots reverse timeline',(a)=>{a.events[0].t=.9;a.events[1].t=.9;a.events[0].snapshot=a.points[2];a.events[1].snapshot=a.points[1];});
run('negative page scroll construction',(a,b)=>{a.identity.condition=b.identity.condition='B';for(const p of a.points)p.scroll.y=p.scroll.documentElement.top=p.scroll.scrollingElement.top=-1000;});
run('unobserved cause claimed',(a)=>{a.cause='PROVEN_BROWSER_ENGINE_BUG';});
run('non-finite final value',(a)=>{a.final.value=null;});
run('unrecognized cancellation type',(a)=>{a.events[1].type='pointercanceled';});
function lifecycle(r,types){const init=structuredClone(r.initial);const baseEvent=structuredClone(r.events[0]);r.points=[init];r.events=[];for(const [i,type]of types.entries()){const p=structuredClone(init);p.seq=i+1;p.t=i+1;p.reason='event:'+type;p.value=type==='pointerdown'||type==='touchstart'?0:50;r.points.push(p);r.events.push({...baseEvent,index:i,t:i+.9,type,touchId:type.startsWith('touch')?7:null,snapshot:p});}const last=structuredClone(r.points.at(-1));last.seq=r.points.length;last.t=r.points.length;last.reason='final';r.points.push(last);r.final=last;}
run('valid pointer and touch completion',(a)=>lifecycle(a,['pointerdown','touchstart','pointerup','touchend']));
run('valid WebKit-style pointer cancel then touchend',(a)=>lifecycle(a,['pointerdown','touchstart','pointercancel','lostpointercapture','touchend']));
run('valid both cancellation families',(a)=>lifecycle(a,['pointerdown','touchstart','pointercancel','touchcancel']));
run('cancelled pointer with unfinished touch retained',(a)=>lifecycle(a,['pointerdown','touchstart','pointercancel']));
 return cases;
}
