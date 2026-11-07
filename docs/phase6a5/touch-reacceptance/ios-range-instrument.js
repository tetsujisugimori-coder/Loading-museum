/* Observation only. No synthetic input, value writes, capture changes, preventDefault, or uploads.
 * Configure __iadTouchProbeConfig BEFORE loading. isTrusted cannot prove physical hardware input.
 */
(() => {
  window.__iadTouchProbe?.stop?.();
  const range = document.querySelector('input[aria-label="Brightness スライダー"]') || document.querySelector('#probe-range');
  if (!(range instanceof HTMLInputElement) || range.type !== 'range') throw Error('Native range missing');
  const stage = document.querySelector('[data-testid="image-adjustment"]');
  const metadata = structuredClone(window.__iadTouchProbeConfig || {});
  const types = ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture',
    'touchstart','touchmove','touchend','touchcancel','input','change','focus','blur'];
  const events = [], tracked = new Set(), listeners = [];
  let active = true, sealed = null;
  const parsed = value => {try {return value === undefined ? null : JSON.parse(value);} catch {return 'INVALID_JSON';}};
  const rect = () => {const r=range.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const viewport = () => ({width:visualViewport?.width ?? innerWidth,height:visualViewport?.height ?? innerHeight,
    scale:visualViewport?.scale ?? 1,offsetLeft:visualViewport?.offsetLeft ?? 0,offsetTop:visualViewport?.offsetTop ?? 0});
  const target = el => el?.getAttribute?.('aria-label') || el?.id || el?.tagName || null;
  const snapshot = () => ({value:range.value,preview:stage?parsed(stage.dataset.preview):null,
    committed:stage?parsed(stage.dataset.committed):null,history:stage?Number(stage.dataset.history):null,
    pending:stage?.dataset.pending??null,rect:rect(),scroll:{x:scrollX,y:scrollY},viewport:viewport(),
    activeElement:target(document.activeElement),hasFocus:document.activeElement===range});
  const point = t => ({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY,pageX:t.pageX,pageY:t.pageY});
  for (const type of types) {
    const handler = event => {
      if (!active || (event.target!==range && !tracked.has(event.pointerId))) return;
      if (type==='pointerdown') tracked.add(event.pointerId);
      // Keep ended IDs until lostpointercapture (or stop), which may target a different element.
      const sample={type:event.type,timeStamp:event.timeStamp,isTrusted:event.isTrusted,
        pointerId:event.pointerId??null,pointerType:event.pointerType??null,target:target(event.target),
        clientX:event.clientX??null,clientY:event.clientY??null,pageX:event.pageX??null,pageY:event.pageY??null,
        touches:event.touches?Array.from(event.touches,point):null,
        changedTouches:event.changedTouches?Array.from(event.changedTouches,point):null,
        cancelable:event.cancelable,defaultPrevented:event.defaultPrevented};
      events.push({...sample,seq:events.length,phase:'capture',observedAt:performance.now(),...snapshot()});
      if(type==='lostpointercapture') tracked.delete(event.pointerId);
      requestAnimationFrame(()=>{if(active) events.push({...sample,seq:events.length,
        phase:'next-animation-frame',observedAt:performance.now(),...snapshot()});});
    };
    document.addEventListener(type,handler,true);listeners.push([type,handler]);
  }
  const original={schemaVersion:1,metadata,startedAt:new Date().toISOString(),userAgent:navigator.userAgent,
    devicePixelRatio,viewport:viewport(),surface:stage?'product':'plain-html',
    nativeRange:{rect:rect(),touchAction:getComputedStyle(range).touchAction,min:range.min,max:range.max,step:range.step},initial:snapshot()};
  const report=()=>sealed || {...original,finishedAt:null,final:null,events:structuredClone(events)};
  const stop=()=>{active=false;for(const [type,handler] of listeners)document.removeEventListener(type,handler,true);};
  const finish=()=>{if(!sealed){sealed={...original,finishedAt:new Date().toISOString(),final:snapshot(),events:structuredClone(events)};stop();}return structuredClone(sealed);};
  window.__iadTouchProbe={report,finish,stop,download(){
    if(!sealed)throw Error('Finish the trial before export; do not include export-button blur in final state');
    const url=URL.createObjectURL(new Blob([JSON.stringify(sealed,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`iad-${original.surface}-${metadata.trialId||'unidentified'}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }};
  console.info('[iad-touch] observer ready; physical provenance is not inferred from isTrusted');
})();
