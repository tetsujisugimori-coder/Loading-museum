/* Diagnostic-only overlay. Product event handlers are untouched. No upload transport. */
(async () => {
  const {evaluate, xToValue, targetValue: convertTarget} = await import('/standard/contract.mjs');
  const response = await fetch('/standard/manifest.json');
  if (!response.ok) throw Error('DIAGNOSTIC_MANIFEST_UNAVAILABLE');
  const manifest = await response.json();
  const types = ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','input','change','gotpointercapture','lostpointercapture'];
  const style = document.createElement('style');
  style.textContent = `
#iad-standard{position:fixed;z-index:2147483646;inset:0 0 auto;background:#fff;color:#152d29;font:13px/1.35 system-ui;box-sizing:border-box;border-bottom:2px solid #274c43;padding:8px;max-height:285px;overflow:auto;color-scheme:light}
#iad-standard *{box-sizing:border-box}#iad-standard h2{font-size:17px;margin:0 0 4px}#iad-standard form{display:flex;flex-wrap:wrap;gap:6px}#iad-standard label{display:flex;gap:3px;align-items:center}#iad-standard input{width:75px}#iad-standard select,#iad-standard button,#iad-standard input{font:inherit;color:#152d29;background:#fff;border:1px solid #45675e;border-radius:4px;padding:5px;min-height:32px}#iad-standard button{cursor:pointer}#iad-standard button:disabled{opacity:.5}#iad-standard output{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}#iad-live{height:145px;overflow:auto}#iad-standard details{margin-top:4px}#iad-standard pre{max-height:130px;overflow:auto;font:11px monospace;white-space:pre-wrap}#iad-standard .note{font-size:11px;margin:4px 0}
input.iad-standard-range{position:fixed!important;z-index:2147483645!important;left:24px!important;top:310px!important;width:calc(100vw - 48px)!important;height:44px!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;box-sizing:border-box!important;appearance:none!important;-webkit-appearance:none!important;background:#eef4f1!important;touch-action:pan-y!important;transform:none!important;opacity:1!important;visibility:visible!important;direction:ltr!important;color-scheme:light!important;border-radius:0!important}
input.iad-standard-range::-webkit-slider-runnable-track{height:8px;background:#6b8c81;border:0;border-radius:4px}input.iad-standard-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:20px;height:20px;margin-top:-6px;background:#173f33;border:2px solid #fff;border-radius:50%;box-sizing:border-box}
input.iad-standard-range::-moz-range-track{height:8px;background:#6b8c81;border:0;border-radius:4px}input.iad-standard-range::-moz-range-thumb{width:20px;height:20px;background:#173f33;border:2px solid #fff;border-radius:50%;box-sizing:border-box}
#iad-standard-scale{position:fixed;z-index:2147483645;left:24px;top:355px;width:calc(100vw - 48px);height:68px;pointer-events:none;background:white;color:#152d29;font:11px system-ui}#iad-standard-scale span{position:absolute;transform:translateX(-50%);text-align:center;white-space:pre}#iad-standard-scale .goal{top:35px;border-top:3px solid #aa4000;color:#813000;font-weight:bold}
`;
  document.head.append(style);
  const panel = document.createElement('aside'); panel.id='iad-standard';
  panel.innerHTML=`<h2>同条件スライダー診断 v2</h2><details id="iad-setup" open><summary>設定（製品は先にImage Adjustmentを開く）</summary><form>
<label>操作<select name="method"><option value="drag">ドラッグ</option><option value="tap">タップ</option></select></label>
<label>目標指定<select name="targetMode"><option value="percent">正規化 %</option><option value="value">実値</option></select><input name="target" type="number" step="any" value="75" required></label>
<label>許容差 ±<input name="tolerance" type="number" min="0" step="any" value="1" required>実値</label>
<label>計測<select name="mode"><option>full</option><option>minimal</option><option>off</option></select></label>
<label>由来<select name="inputKind"><option value="physical">物理（申告）</option><option value="playwright">自動入力</option></select></label>
<label>端末<input name="device" value="未申告"></label><label>OS<input name="os" value="未申告"></label><label>ブラウザ<input name="browser" value="未申告"></label>
<label>反復<input name="repetition" type="number" min="1" max="3" value="1" required></label><label>attempt<input name="attempt" type="number" min="1" value="1" required></label>
<button type="submit">初期値確認・開始</button></form></details>
<p class="note">診断限定の位置・幅・つまみ・touch-actionを共通化。通常展示の外観／スクロール条件とは別。入力処理は変更しません。</p>
<output id="iad-live">未開始。製品画面は設定欄を閉じて操作できます。</output>
<button id="iad-seal" disabled>封印</button> <button id="iad-save" disabled>JSON保存</button> <button id="iad-reset">Reset（新規読込）</button> <a href="/standard/">手順</a>
<details><summary>イベント数・JSON</summary><output id="iad-counts">未観測</output><pre id="iad-json">封印後に表示</pre></details>`;
  document.body.append(panel);
  const form=panel.querySelector('form'), live=panel.querySelector('#iad-live'), counts=panel.querySelector('#iad-counts');
  const seal=panel.querySelector('#iad-seal'), save=panel.querySelector('#iad-save');
  try { for (const [k,v] of Object.entries(JSON.parse(sessionStorage.getItem('iad-standard-settings')||'{}'))) if(form.elements[k])form.elements[k].value=v; } catch { /* Invalid saved settings are not reused. */ }
  let state='setup',range,stage,metadata,initial,startedAt,ended=null,events=[],tracked=new Set(),listeners=[],lastInput=null,gesture='未開始',cancelled=false,rangeInitialStyle;
  const viewport=()=>({width:innerWidth,height:innerHeight,scale:window.visualViewport?.scale??1,visualWidth:window.visualViewport?.width??innerWidth,visualHeight:window.visualViewport?.height??innerHeight,offsetLeft:window.visualViewport?.offsetLeft??0,offsetTop:window.visualViewport?.offsetTop??0});
  const rect=()=>{const r=range.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const parsed=v=>{try{return v===undefined?null:JSON.parse(v);}catch{return null;}};
  const snapshot=()=>({value:Number(range.value),preview:parsed(stage?.dataset.preview),committed:parsed(stage?.dataset.committed),history:stage?Number(stage.dataset.history):null,pending:stage?stage.dataset.pending==='true':null,rect:rect(),viewport:viewport(),scroll:{x:scrollX,y:scrollY},devicePixelRatio,at:performance.now()});
  const geometry=()=>{const r=rect();return {rect:r,min:Number(range.min),max:Number(range.max),step:Number(range.step),thumbWidth:20,usableTrack:{left:r.x+10,right:r.x+r.width-10,width:r.width-20},touchAction:getComputedStyle(range).touchAction,geometryModel:'CSS thumb center: rect.x + 10 + ratio * (rect.width - 20); diagnostic style only',geometryVerified:'REQUIRES_BROWSER_MEASUREMENT',originalStyle:rangeInitialStyle};};
  const mapX=x=>{if(!Number.isFinite(x))return null;const g=geometry();return xToValue(x,g.rect,g.min,g.max,g.step,g.thumbWidth);};
  const rawReport=(final=null)=>({schemaVersion:'iad-standard-2',metadata:structuredClone(metadata),surface:stage?'product':'plain-html',startedAt,finishedAt:final?new Date().toISOString():null,userAgent:navigator.userAgent,devicePixelRatio,environment:{userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,reportedDevice:metadata.device,reportedOS:metadata.os,reportedBrowser:metadata.browser,viewport:initial.viewport},nativeRange:metadata.nativeRange,initial,final,events:structuredClone(events),lastObservedInput:lastInput,cancelled,missing:metadata.mode==='off'?[{field:'events',reason:'measurement disabled'}]:metadata.mode==='minimal'?[{field:'touchmove, capture lifecycle and post-frame observations',reason:'minimal mode'}]:[],physicalDeviceResult:'NOT_TESTED',causalAttribution:'UNKNOWN',neutrality:'NOT_PROVEN',conditionDifferences:['Product React state/commit/history exists; plain HTML has no corresponding contract.','Diagnostic styling standardizes placement and native thumb; this is not the unmodified product appearance.','Browser chrome/viewport and human trajectories must be compared from recorded data.']});
  function update(){if(!range)return;const s=snapshot(),value=s.value,commit=s.committed?.params?.brightness??null;
    live.textContent=`${metadata.method==='drag'?'ドラッグ':'タップ'} / ${gesture}\n値域 ${range.min} ～ ${range.max}（刻み${range.step}） 初期 ${initial.value}\n目標 ${metadata.targetValue}（${metadata.targetPercent}%相当） 許容差 ±${metadata.tolerance}\n現在DOM値 ${value} / 目標との差 ${value-metadata.targetValue} / 最後のinput ${lastInput??'未観測'}\n確定値 ${stage?(commit??'未取得'):'該当なし'} / 履歴 ${stage?s.history:'該当なし'}\n目標到達 ${Math.abs(value-metadata.targetValue)<=metadata.tolerance?'現在値は範囲内（操作成功とは別）':'範囲外'}${cancelled?' / 取消を観測':''}${metadata.mode==='off'?' / 操作中の観測OFF':''}`;
    counts.textContent=types.map(t=>`${t}: ${metadata.mode==='off'?'未観測（OFF）':events.filter(e=>e.type===t&&e.phase==='capture').length}`).join(' / ');
  }
  function addScale(){document.querySelector('#iad-standard-scale')?.remove();const scale=document.createElement('div');scale.id='iad-standard-scale';const g=geometry();for(const p of [0,25,50,75,100]){const x=10+p/100*g.usableTrack.width;const node=document.createElement('span');node.style.left=x+'px';node.textContent=`│\n${p}%\n${g.min+p/100*(g.max-g.min)}`;scale.append(node);}const target=document.createElement('span');target.className='goal';target.style.left=(10+metadata.targetPercent/100*g.usableTrack.width)+'px';target.textContent=`目標 ${metadata.targetValue}`;scale.append(target);document.body.append(scale);}
  form.addEventListener('submit',async e=>{e.preventDefault();if(state!=='setup')return;range=document.querySelector('input[aria-label="Brightness スライダー"]')||document.querySelector('#probe-range');if(!range){live.textContent='製品のImage Adjustmentを先に開いてください。';return;}stage=document.querySelector('[data-testid="image-adjustment"]');
    const settings=Object.fromEntries(new FormData(form)),min=Number(range.min),max=Number(range.max),step=Number(range.step),target=Number(settings.target),tolerance=Number(settings.tolerance);
    if(!Number.isFinite(target)||!Number.isFinite(tolerance)||tolerance<0||tolerance>step*5||!Number.isFinite(step)||step<=0){live.textContent='目標・許容差・刻みが不正です。';return;}
    const percent=settings.targetMode==='percent'?target:(target-min)/(max-min)*100;
    if(percent<0||percent>100){live.textContent='目標が値域外です。';return;}
    const targetValue=convertTarget(percent,min,max,step);
    const before=snapshot();if(before.value!==0||stage&&(before.history!==0||before.pending!==false||before.committed?.params?.brightness!==0)){live.textContent='初期値0・履歴0ではありません。Resetで新規読込してください。';return;}
    sessionStorage.setItem('iad-standard-settings',JSON.stringify(settings));
    rangeInitialStyle={touchAction:getComputedStyle(range).touchAction,rect:rect(),appearance:getComputedStyle(range).appearance};range.classList.add('iad-standard-range');
    panel.querySelector('#iad-setup').open=false;form.inert=true;state='arming';await new Promise(r=>requestAnimationFrame(r));initial=snapshot();
    const r=initial.rect,p=panel.getBoundingClientRect();if(r.y<p.bottom||r.y+r.height>innerHeight){live.textContent='診断パネルまたは画面端と操作面が重なります。縦向きの広い画面でResetしてください。';state='error';return;}
    metadata={...manifest,...settings,targetPercent:(targetValue-min)/(max-min)*100,targetValue,tolerance,repetition:Number(settings.repetition),attempt:Number(settings.attempt),nativeRange:geometry(),presentation:'standardized-diagnostic-only',timestampBasis:'performance.now milliseconds (observedAt); event.timeStamp separately retained'};
    startedAt=new Date().toISOString();events=[];tracked=new Set();state='recording';seal.disabled=false;addScale();
    if(metadata.mode!=='off')for(const type of types){if(metadata.mode==='minimal'&&['touchmove','gotpointercapture','lostpointercapture'].includes(type))continue;
      const handler=event=>{if(state!=='recording'||event.target!==range&&!tracked.has(event.pointerId))return;if(type==='pointerdown')tracked.add(event.pointerId);if(type.endsWith('cancel')){cancelled=true;gesture='取消';}else if(type==='pointerdown'||type==='touchstart')gesture='操作中';else if((type==='pointerup'||type==='touchend')&&!cancelled)gesture='完了候補（封印時に検査）';if(type==='input')lastInput=Number(range.value);
        const point=event.changedTouches?.[0]||event.touches?.[0]||event;const x=Number.isFinite(point.clientX)?point.clientX:null,y=Number.isFinite(point.clientY)?point.clientY:null;const sample={type,timeStamp:event.timeStamp,isTrusted:event.isTrusted,pointerId:event.pointerId??null,pointerType:event.pointerType??null,clientX:x,clientY:y,mappedValue:mapX(x),target:event.target===range?'range':'tracked-pointer',cancelable:event.cancelable,defaultPrevented:event.defaultPrevented};
        events.push({...sample,seq:events.length,phase:'capture',observedAt:performance.now(),...snapshot()});
        requestAnimationFrame(()=>{if(state==='recording'){if(metadata.mode==='full')events.push({...sample,seq:events.length,phase:'next-animation-frame',observedAt:performance.now(),...snapshot()});update();}});
        if(type==='lostpointercapture')tracked.delete(event.pointerId);
      };document.addEventListener(type,handler,{capture:true,passive:true});listeners.push([type,handler]);}
    update();
  });
  function finish(e){if(state!=='recording')return;const final=snapshot();ended=rawReport(final);ended.handoff={sealEvent:e.type,sealTrusted:e.isTrusted,sealTime:performance.now(),physicalVerification:'REQUIRES_OPERATOR_AND_SCREENSHOT_REVIEW'};for(const[t,h]of listeners)document.removeEventListener(t,h,true);listeners=[];state='sealed';ended.diagnosis=evaluate(ended);gesture=({COMPLETED:'完了',CANCELLED:'取消',INCOMPLETE:'未完了',INCONSISTENT:'値不整合',NOT_OBSERVED:'未観測',NOT_TESTED:'未検証',NO_VALUE_CHANGE_OBSERVED:'値変更未観測'})[ended.diagnosis.status]||ended.diagnosis.status;update();seal.disabled=true;save.disabled=false;panel.querySelector('#iad-json').textContent=JSON.stringify(ended,null,2);live.textContent+='\n封印済み / '+ended.diagnosis.status+'（物理検証・原因判定とは別）';}
  window.addEventListener('pointerdown',e=>{if(e.target===seal)finish(e);},{capture:true,passive:true});seal.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')finish(e);},{capture:true,passive:true});
  save.addEventListener('click',()=>{if(!ended)return;const url=URL.createObjectURL(new Blob([JSON.stringify(ended,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`iad-v2-${ended.surface}-${metadata.method}-${metadata.repetition}-${metadata.mode}-attempt${metadata.attempt}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
  panel.querySelector('#iad-reset').addEventListener('click',()=>location.reload());
  window.__iadStandard={state:()=>state,report:()=>ended?structuredClone(ended):state==='recording'?rawReport():null,snapshot:()=>range?snapshot():null,config:()=>metadata?structuredClone(metadata):null};
})().catch(error=>{const warning=document.createElement('pre');warning.textContent='診断準備失敗: '+error.message;document.body.prepend(warning);});
