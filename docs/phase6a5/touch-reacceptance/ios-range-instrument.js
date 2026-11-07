/* Native iPhone Safari event observer. Read-only: never synthesizes events or changes values.
 * Load in the physical product page via an approved Safari Web Inspector console;
 * the plain HTML fixture loads it automatically. No network upload.
 */
(() => {
  window.__iadTouchProbe?.stop?.();
  const range = document.querySelector('input[aria-label="Brightness スライダー"]') ||
    document.querySelector('#probe-range');
  if (!(range instanceof HTMLInputElement) || range.type !== 'range') {
    console.error('[iad-touch] Native range not found. Open Image Adjustment first.');
    return;
  }
  const stage = document.querySelector('[data-testid="image-adjustment"]');
  const types = ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture',
    'lostpointercapture','touchstart','touchmove','touchend','touchcancel',
    'input','change','focus','blur'];
  const events = [], tracked = new Set(), listeners = [];
  let active = true;
  const parsed = value => {try {return value === undefined ? null : JSON.parse(value);} catch {return 'INVALID_JSON';}};
  const rect = () => {
    const r = range.getBoundingClientRect();
    return {x:r.x, y:r.y, width:r.width, height:r.height};
  };
  const snapshot = event => ({
    value:range.value, preview:stage ? parsed(stage.dataset.preview) : null,
    committed:stage ? parsed(stage.dataset.committed) : null,
    history:stage ? Number(stage.dataset.history) : null,
    pending:stage?.dataset.pending ?? null, rect:rect(),
    scroll:{x:scrollX,y:scrollY},
    pointerId:event?.pointerId ?? null, pointerType:event?.pointerType ?? null,
    target:event?.target?.getAttribute?.('aria-label') || event?.target?.id || event?.target?.tagName || null
  });
  for (const type of types) {
    const handler = event => {
      if (event.target !== range && !tracked.has(event.pointerId)) return;
      if (type === 'pointerdown' && event.target === range) tracked.add(event.pointerId);
      events.push({seq:events.length,phase:'capture',type:event.type,
        timeStamp:event.timeStamp,observedAt:performance.now(),isTrusted:event.isTrusted,
        cancelable:event.cancelable,defaultPrevented:event.defaultPrevented,
        touches:event.touches?.length ?? null,changedTouches:event.changedTouches?.length ?? null,
        ...snapshot(event)});
      if (type === 'pointerup' || type === 'pointercancel') tracked.delete(event.pointerId);
      requestAnimationFrame(() => {
        if (active) events.push({seq:events.length,phase:'next-animation-frame',
          type:event.type,observedAt:performance.now(),...snapshot(event)});
      });
    };
    document.addEventListener(type,handler,true);
    listeners.push([type,handler]);
  }
  const original={startedAt:new Date().toISOString(),userAgent:navigator.userAgent,
    devicePixelRatio,viewport:{width:visualViewport?.width ?? null,
      height:visualViewport?.height ?? null,scale:visualViewport?.scale ?? null},
    url:location.href,surface:stage?'product':'plain-html',
    nativeRange:{rect:rect(),touchAction:getComputedStyle(range).touchAction,
      min:range.min,max:range.max,step:range.step,initialValue:range.value}};
  const report=()=>({...original,exportedAt:new Date().toISOString(),
    final:snapshot(),events:[...events]});
  const button=document.createElement('button');
  button.textContent='Save touch probe JSON';button.type='button';
  Object.assign(button.style,{position:'fixed',right:'8px',bottom:'8px',
    zIndex:'2147483647',padding:'12px',fontSize:'14px',
    background:'#fff',color:'#111',border:'2px solid #111'});
  button.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='iad-'+original.surface+'-'+Date.now()+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),10000);
  });
  document.body.appendChild(button);
  window.__iadTouchProbe={events,report,stop(){
    active=false; for (const [type,handler] of listeners)
      document.removeEventListener(type,handler,true);
    button.remove();
  }};
  console.info('[iad-touch] Observer ready; physical events only',original);
})();
