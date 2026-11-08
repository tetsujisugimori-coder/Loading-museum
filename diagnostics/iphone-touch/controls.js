/* Local diagnostic controller; no event cancellation/capture, input mutation, or outbound transport. */
(async()=>{
 const manifest=await (await fetch('/diagnostic/manifest.json')).json();
 const panel=document.createElement('aside');panel.id='iad73';panel.style.cssText='position:fixed;z-index:2147483647;left:4px;top:4px;max-width:calc(100vw - 8px);max-height:45vh;overflow:auto;background:white;color:black;border:2px solid #555;padding:6px;font:12px system-ui';
 panel.innerHTML='<details open><summary>実機診断（未検証）</summary><form><label>端末<input name="device" required></label><label>iOS<input name="os" required></label><label>Safari版<input name="browser" required></label><label>担当<input name="operator" required></label><label>session<input name="sessionId" required></label><label>入力由来<select name="inputKind"><option value="physical">実機の指（操作者申告）</option><option value="playwright">自動試験</option></select></label><label>操作<select name="method"><option>tap</option><option>drag</option></select></label><label>反復<select name="repetition"><option>1</option><option>2</option><option>3</option></select></label><label>attempt<input name="attempt" type="number" min="1" value="1" required></label><label>計測<select name="mode"><option>full</option><option>minimal</option><option>off</option></select></label><button type="submit">開始</button></form></details><button id="iad73-seal" disabled>封印</button><button id="iad73-save" disabled>JSON保存</button><output>準備中。まだ操作しない</output><a href="/diagnostic/">手順へ</a>';
 document.body.append(panel);const form=panel.querySelector('form'),out=panel.querySelector('output'),seal=panel.querySelector('#iad73-seal'),save=panel.querySelector('#iad73-save');
 try{const old=JSON.parse(sessionStorage.getItem('iad73-meta'));for(const k of ['device','os','browser','operator','sessionId','method','repetition','attempt','mode'])if(old?.[k])form.elements[k].value=old[k];}catch{}
 let state='setup',sealed,stop=()=>{},snap,meta,initial,events,range;
 function snapshot(){const s=document.querySelector('[data-testid="image-adjustment"]'),r=range.getBoundingClientRect();const parse=k=>{try{return JSON.parse(s?.dataset[k]??'null');}catch{return 'INVALID';}};return {value:range.value,preview:parse('preview'),committed:parse('committed'),history:s?Number(s.dataset.history):null,pending:s?.dataset.pending??null,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight,scale:visualViewport?.scale??1},activeElement:document.activeElement?.getAttribute('aria-label')||document.activeElement?.id||null};}
 form.addEventListener('submit',async e=>{e.preventDefault();if(state!=='setup')return;
  range=document.querySelector('input[aria-label="Brightness スライダー"]')||document.querySelector('#probe-range');
  if(!range){out.textContent='Image Adjustmentを開いてください';return;}
  const m=Object.fromEntries(new FormData(form));if(Object.values(m).some(v=>!String(v).trim()))return;
  range.scrollIntoView({block:'center'});initial=snapshot();
  if(initial.value!=='0'||(initial.committed&&(initial.history!==0||initial.pending!=='false'))){out.textContent='新規ページの初期値0・履歴0が必要です';return;}
  sessionStorage.setItem('iad73-meta',JSON.stringify(m));
  meta={...manifest,...m,repetition:Number(m.repetition),attempt:Number(m.attempt),trialId:`ios-${m.method}-${m.repetition}-${m.mode}`,inputKind:m.inputKind,capture:false};
  panel.querySelector('details').open=false;form.inert=true;events=[];state='arming';out.textContent='準備中';
  // Allow layout caused by collapsing the controls to settle before initial snapshot.
  await new Promise(r=>requestAnimationFrame(r));initial=snapshot();snap=initial;
  const p=panel.getBoundingClientRect(),r=initial.rect;if(r.x<p.right&&r.x+r.width>p.left&&r.y<p.bottom&&r.y+r.height>p.top){state='error';out.textContent='パネルとrangeが重なっています。新規ページで配置を見直してください';return;}
  if(initial.committed)sessionStorage.setItem('iad73-rect',JSON.stringify(initial.rect));
  if(meta.mode==='full'){
   window.__iadTouchProbeConfig=meta;
   try{await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/diagnostic/recorder.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});}catch{state='error';out.textContent='記録器読込失敗。操作しないでください';return;}
   stop=()=>window.__iadTouchProbe.stop();
  }else if(meta.mode==='minimal'){
   const types=['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','input','change'];
   const record=e=>{if(e.target===range)events.push({seq:events.length,type:e.type,timeStamp:e.timeStamp,isTrusted:e.isTrusted,value:range.value,pointerId:e.pointerId??null});};
   for(const t of types)document.addEventListener(t,record,{capture:true,passive:true});stop=()=>{for(const t of types)document.removeEventListener(t,record,true);};
  }
  state='recording';seal.disabled=false;out.textContent='READY：1回操作し、落ち着いてから封印';
 });
 function finish(e){if(state!=='recording')return;const before=snapshot();
  sealed=meta.mode==='full'?window.__iadTouchProbe.finish():{schemaVersion:'iad73-control-1',metadata:meta,surface:initial.committed?'product':'plain-html',initial:snap,final:before,events:structuredClone(events),physicalDeviceResult:'NOT_TESTED',controlOnly:true};
  stop();sealed.handoff={sealEvent:e.type,sealTrusted:e.isTrusted,sealTime:performance.now(),beforeSeal:before,mode:meta.mode,physicalVerification:'REQUIRES_OPERATOR_AND_SCREENSHOT_REVIEW',neutrality:'NOT_PROVEN'};
  state='sealed';seal.disabled=true;save.disabled=false;out.textContent='封印済み（実機PASSではない）。画像とJSONを保存';
 }
 // Seal before the finish button's default focus/blur. No preventDefault or value writes.
 window.addEventListener('pointerdown',e=>{if(e.target===seal)finish(e);},{capture:true,passive:true});
 seal.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')finish(e);},{capture:true,passive:true});
 save.addEventListener('click',()=>{if(!sealed)return;const url=URL.createObjectURL(new Blob([JSON.stringify(sealed,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`iad-${sealed.surface}-${meta.trialId}-attempt${meta.attempt}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
 out.textContent='設定後に開始。操作するrangeがパネルに隠れていないことを確認';
 window.__iad73={report:()=>sealed?structuredClone(sealed):null,state:()=>state};
})();
