// Test-only observers. Input facts, independent expectations and product DOM are
// deliberately recorded separately. All settling uses the existing 10s bound.
import assert from 'node:assert/strict';
export async function recordDrawing(surface) {
  await surface.evaluate(el => {
    if(el.getAttribute('viewBox')!=='0 0 320 220')throw Error('drawing source coordinate contract changed');
    el.__probe?.dispose();
    const ink = () => [...el.querySelectorAll('[data-current-frame] polyline')].map(n => n.getAttribute('points'));
    const p = {events: [], mutations: [], marks: [], owner: null, sequence: 0};
    const types = ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','gotpointercapture'];
    const on = e => {
      const rect = el.getBoundingClientRect();
      const admitted = e.type === 'pointerdown' ? p.owner === null && e.button === 0 && e.isPrimary !== false : e.type === 'pointermove' && p.owner === e.pointerId;
      if (e.type === 'pointerdown' && admitted) p.owner = e.pointerId;
      p.events.push({sequence: ++p.sequence, type:e.type, now:performance.now(), eventTime:e.timeStamp, trusted:e.isTrusted, pointerId:e.pointerId, pointerType:e.pointerType, button:e.button, buttons:e.buttons, primary:e.isPrimary, x:e.clientX, y:e.clientY, rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}, admitted, inkAtCapture:ink()});
      if (['pointerup','pointercancel','lostpointercapture'].includes(e.type) && p.owner === e.pointerId) p.owner = null;
    };
    types.forEach(type => el.addEventListener(type,on,true));
    const bubble = e => { if (e.composedPath().includes(el)) p.marks.push({kind:'document-bubble',type:e.type,now:performance.now(),ink:ink()}); };
    types.forEach(type => document.addEventListener(type,bubble));
    const mo = new MutationObserver(() => p.mutations.push({now:performance.now(),ink:ink()})); mo.observe(el,{subtree:true,childList:true,attributes:true});
    p.dispose = () => {mo.disconnect();types.forEach(type => {el.removeEventListener(type,on,true);document.removeEventListener(type,bubble);});};
    el.__probe=p;
  });
}
export const drawingTrace = surface => surface.evaluate(el => ({events:el.__probe.events,mutations:el.__probe.mutations,marks:el.__probe.marks}));
export function expectedStroke(trace) {
  const points=trace.events.filter(e=>e.admitted);
  assert.ok(points.length>=2,'a down and delivered owner move are required');
  assert.equal(points[0].type,'pointerdown');assert.ok(points.every(e=>e.trusted&&e.pointerId===points[0].pointerId));
  assert.ok(trace.events.every((e,i,a)=>!i||e.sequence>a[i-1].sequence&&e.now>=a[i-1].now));
  return points.map(e=>{
    assert.ok(e.rect.width>0&&e.rect.height>0);
    const x=Math.max(0,Math.min(320,(e.x-e.rect.left)/e.rect.width*320));
    const y=Math.max(0,Math.min(220,(e.y-e.rect.top)/e.rect.height*220));
    return `${x},${y}`;
  }).join(' ');
}
export async function settledInk(surface, expected) {
  // Expected is built before this call from delivered inputs, never from DOM.
  return surface.evaluate((el, expected) => new Promise((resolve,reject)=>{
    const started=performance.now(), samples=[];let frames=0,raf;
    const timer=setTimeout(()=>{cancelAnimationFrame(raf);reject(Error(`ink did not settle within 10000ms: ${JSON.stringify({expected,samples})}`));},10000);
    const tick=()=>{
      const actual=[...el.querySelectorAll('[data-current-frame] polyline')].map(n=>n.getAttribute('points'));
      samples.push({now:performance.now(),actual});frames=JSON.stringify(actual)===JSON.stringify(expected)?frames+1:0;
      if(frames>=3){clearTimeout(timer);resolve({started,finished:performance.now(),samples,actual});}else raf=requestAnimationFrame(tick);
    };raf=requestAnimationFrame(tick);
  }),expected);
}
export async function drawingFaults(surface, expected) {
  // The same exact oracle rejects each mutated DOM; restore and settle each time.
  const original=await surface.locator('[data-current-frame] polyline').getAttribute('points');
  assert.equal(original,expected[0]);const points=original.split(' '), faults=[];
  const variants={missingLast:points.slice(0,-1).join(' '),extraAfterCancel:original+' 319,219',changedExisting:['1,1',...points.slice(1)].join(' ')};
  for(const [name,value] of Object.entries(variants)){
    await surface.locator('[data-current-frame] polyline').evaluate((n,v)=>n.setAttribute('points',v),value);
    const actual=await surface.locator('[data-current-frame] polyline').evaluateAll(ns=>ns.map(n=>n.getAttribute('points')));
    assert.throws(()=>assert.deepEqual(actual,expected),assert.AssertionError);faults.push({name,expected,actual,rejected:true});
    await surface.locator('[data-current-frame] polyline').evaluate((n,v)=>n.setAttribute('points',v),original);await settledInk(surface,expected);
  }return faults;
}
export async function recordVisibility(stage) {
  await stage.evaluate(el=>{
    el.__visibilityProbe?.dispose();const p={events:[],samples:[]};
    const snap=kind=>{const b=el.getBoundingClientRect();p.events.push({kind,now:performance.now(),scrollX,scrollY,top:b.top,bottom:b.bottom,active:el.getAttribute('data-active')});};
    const scroll=()=>snap('scroll');window.addEventListener('scroll',scroll);
    const io=new IntersectionObserver(es=>{for(const e of es)p.events.push({kind:'observer',now:performance.now(),entryTime:e.time,isIntersecting:e.isIntersecting,ratio:e.intersectionRatio});});io.observe(el);
    const mo=new MutationObserver(()=>snap('DOM'));mo.observe(el,{attributes:true,attributeFilter:['data-active']});
    p.dispose=()=>{window.removeEventListener('scroll',scroll);io.disconnect();mo.disconnect();};el.__visibilityProbe=p;snap('installed');
  });
}
export async function settledVisibility(stage, visible) {
  return stage.evaluate((el,visible)=>new Promise((resolve,reject)=>{
    const p=el.__visibilityProbe,started=performance.now();p.events.push({kind:'request',now:started,visible});let previous=null,holding=0,raf;
    const timer=setTimeout(()=>{cancelAnimationFrame(raf);reject(Error(`visibility did not settle within 10000ms: ${JSON.stringify(p)}`));},10000);
    const tick=()=>{
      const b=el.getBoundingClientRect(),geometry=b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth;
      const sample={now:performance.now(),scrollY,top:b.top,bottom:b.bottom,geometry,active:el.getAttribute('data-active'),radii:[...el.querySelectorAll('svg circle')].map(n=>n.getAttribute('r')).join('|')};p.samples.push(sample);
      const io=p.events.filter(e=>e.kind==='observer').at(-1);
      const stable=previous&&previous.scrollY===scrollY&&previous.top===b.top&&previous.bottom===b.bottom&&(visible||previous.radii===sample.radii);
      holding=stable&&(visible||scrollY===0)&&geometry===visible&&io?.isIntersecting===visible&&sample.active===String(visible)?holding+1:0;previous=sample;
      if(holding>=3){clearTimeout(timer);resolve({started,finished:performance.now(),events:p.events,samples:p.samples});}else raf=requestAnimationFrame(tick);
    };raf=requestAnimationFrame(tick);
  }),visible);
}
