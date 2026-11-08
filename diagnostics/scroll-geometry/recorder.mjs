/** Experimental observer only. Does not change handlers, dispatch events, or assign values. */
export function installRecorder(identity) {
  const range = document.querySelector('input.iad-standard-range');
  if (!range) throw Error('RANGE_MISSING');
  const stage = document.querySelector('[data-testid="image-adjustment"]');
  const readJson = value => { try { return value === undefined ? null : JSON.parse(value); } catch { return null; } };
  const points = [], events = [], inputs = [], tracked = new Set();
  let active = true, frame, seq = 0;
  const origin = performance.now();
  function snapshot(reason) {
    const r = range.getBoundingClientRect(), v = window.visualViewport, d = document.documentElement, b = document.body, s = document.scrollingElement;
    return {trialId: identity.trialId, seq: seq++, reason, t: performance.now() - origin,
      rect: Object.fromEntries(['x','y','width','height','top','right','bottom','left'].map(k=>[k,r[k]])),
      viewport: {innerWidth,innerHeight,width:v?.width??null,height:v?.height??null,offsetLeft:v?.offsetLeft??null,offsetTop:v?.offsetTop??null,scale:v?.scale??null,devicePixelRatio},
      scroll: {x:scrollX,y:scrollY,scrollingElement:s?{tag:s.tagName,left:s.scrollLeft,top:s.scrollTop}:null,documentElement:{left:d.scrollLeft,top:d.scrollTop},body:{left:b.scrollLeft,top:b.scrollTop}},
      value:Number(range.value),react:stage?{preview:readJson(stage.dataset.preview),committed:readJson(stage.dataset.committed),history:Number(stage.dataset.history),pending:stage.dataset.pending==='true'}:null,
      activeElement:document.activeElement===range?'range':document.activeElement?.tagName??null};
  }
  const initial=snapshot('initial'); points.push(initial);
  const sample=reason=>{const p=snapshot(reason);points.push(p);return p;};
  const loop=()=>{if(active){sample('animation-frame');frame=requestAnimationFrame(loop);}};
  frame=requestAnimationFrame(loop);
  const types=['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','input','change','gotpointercapture','lostpointercapture','focus','blur'];
  const handlers=[];
  for(const type of types){
    const handler=e=>{if(!active || e.target!==range&&!tracked.has(e.pointerId))return;
      if(type==='pointerdown')tracked.add(e.pointerId);
      const p=e.changedTouches?.[0]||e.touches?.[0]||e;
      events.push({trialId:identity.trialId,index:events.length,type,t:performance.now()-origin,timeStamp:e.timeStamp,target:e.target===range?'range':'tracked-pointer',touchId:p.identifier??null,pointerId:e.pointerId??null,pointerType:e.pointerType??null,clientX:Number.isFinite(p.clientX)?p.clientX:null,clientY:Number.isFinite(p.clientY)?p.clientY:null,pageX:Number.isFinite(p.pageX)?p.pageX:null,pageY:Number.isFinite(p.pageY)?p.pageY:null,isTrusted:e.isTrusted,cancelable:e.cancelable,defaultPrevented:e.defaultPrevented,snapshot:sample('event:'+type)});
      if(type==='lostpointercapture')tracked.delete(e.pointerId);
    }; document.addEventListener(type,handler,{capture:true,passive:true});handlers.push([type,handler]);
  }
  const onScroll=()=>active&&sample('scroll-event');document.addEventListener('scroll',onScroll,{capture:true,passive:true});
  const onResize=()=>active&&sample('resize-event');window.addEventListener('resize',onResize,{passive:true});
  window.__scrollGeometry={
    mark:label=>sample(label),
    input:command=>inputs.push({trialId:identity.trialId,index:inputs.length,t:performance.now()-origin,...command}),
    finish:()=>{if(!active)throw Error('ALREADY_FINISHED'); const final=sample('final');active=false;cancelAnimationFrame(frame);for(const[t,h]of handlers)document.removeEventListener(t,h,true);document.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',onResize);
      return {schemaVersion:'iad-scroll-geometry-1',identity,startedAt:new Date(Date.now()-(performance.now()-origin)).toISOString(),finishedAt:new Date().toISOString(),initial,final,points,events,inputs,observer:'passive capture + requestAnimationFrame',physicalInput:'NOT_TESTED',cause:'UNKNOWN',missing:[]};}
  };
}
