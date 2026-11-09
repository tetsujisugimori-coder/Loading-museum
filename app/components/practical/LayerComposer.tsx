"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, PointerEvent } from 'react';
import { ASSETS, WIDTH, HEIGHT, MAX_LAYERS, initialState, initialLayers, add, patch, command, abort, begin, move, point, commit, type State, type Layer, type AssetId, type Blend, type Box } from './layer-composer-model';
import { createImages, render, type Images } from './layer-composer-render';
import './layer-composer.css';
const descriptions = {normal:'Normal：上の画像を不透明度に応じて重ねます。',multiply:'Multiply：色を掛け合わせ、重なりを暗くします。',screen:'Screen：反転した色を掛け合わせ、重なりを明るくします。'};
function Editor({layer,apply}:{layer:Layer;apply:(p:Partial<Layer>)=>void}) {
  const [fields,setFields]=useState({x:String(layer.x),y:String(layer.y),width:String(layer.width),height:String(layer.height),opacity:String(layer.opacity*100)}),[ratio,setRatio]=useState(true),[error,setError]=useState('');
  function field(k:keyof typeof fields,v:string){setFields(f=>{const out={...f,[k]:v};if(ratio&&(k==='width'||k==='height')&&Number.isFinite(Number(v))&&v.trim()){if(k==='width')out.height=String(Number(v)*layer.height/layer.width);else out.width=String(Number(v)*layer.width/layer.height);}return out;});}
  function submit(e:FormEvent){e.preventDefault();if(Object.values(fields).some(v=>!v.trim()||!Number.isFinite(Number(v)))){setError('空欄や無効な数値は適用できません。');return;}const values={x:Number(fields.x),y:Number(fields.y),width:Number(fields.width),height:Number(fields.height),opacity:Number(fields.opacity)/100};if(values.x < -1200||values.x>600||values.y < -1200||values.y>400||values.width<1||values.width>1200||values.height<1||values.height>1200||values.opacity<0||values.opacity>1){setError('座標はX −1200〜600 / Y −1200〜400、寸法1〜1200、透明度0〜100です。');return;}apply(layer.locked?{opacity:values.opacity}:values);}
  return <form className="lcEditor" onSubmit={submit} noValidate>
    <h4>{layer.name}</h4><p>{layer.locked?'ロック中：位置と寸法は変更できません。':'数値は作品のピクセル座標です。'}</p>
    {(['x','y','width','height','opacity'] as const).map((k,i)=><label key={k}>{['X座標','Y座標','幅','高さ','透明度(%)'][i]}<input aria-label={['X座標','Y座標','幅','高さ','透明度(%)'][i]} inputMode="decimal" value={fields[k]} disabled={layer.locked&&k!=='opacity'} onChange={e=>field(k,e.target.value)}/></label>)}
    <label className="lcCheck"><input type="checkbox" checked={ratio} disabled={layer.locked} onChange={e=>setRatio(e.target.checked)}/>アスペクト比維持</label>
    <button type="submit">数値を適用</button>{error&&<p role="alert">{error}</p>}
  </form>;
}
export default function LayerComposer(){
  const [state,setState]=useState(initialState),current=useRef(initialState());
  const [asset,setAsset]=useState<AssetId>('sun'),[touch,setTouch]=useState(false),[status,setStatus]=useState('教材画像を準備中'),[ready,setReady]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(false),[exporting,setExporting]=useState(false);
  const opacityControl=useRef<HTMLInputElement>(null);
  const canvas=useRef<HTMLCanvasElement>(null),previewCanvas=useRef<HTMLCanvasElement>(null),beforeCanvas=useRef<HTMLCanvasElement>(null),sources=useRef<Record<string,HTMLCanvasElement|null>>({}),comparison=useRef<Record<string,HTMLCanvasElement|null>>({}),images=useRef<Images|null>(null),alive=useRef(true),version=useRef(0),capture=useRef<number|null>(null);
  const release=useCallback(()=>{const id=capture.current;capture.current=null;if(id!==null&&canvas.current?.hasPointerCapture?.(id))canvas.current.releasePointerCapture(id);},[]);
  const update=useCallback((s:State)=>{current.current=s;version.current++;setState(s);setPreview(false);setError('');if(!s.gesture)release();},[release]);
  const cancel=useCallback(()=>{if(current.current.gesture){update(abort(current.current));setStatus('操作を取り消しました。確定済みの作品は保持しました。');}},[update]);
  const opacityEnd=useCallback((pointerId:number,node:HTMLInputElement|null)=>{
    const s=current.current,g=s.gesture;if(g?.kind!=='opacity'||g.pointerId!==pointerId)return;
    if(!node){update(abort(s));return;}
    const r=node.getBoundingClientRect(),b={x:r.x,y:r.y,width:r.width,height:r.height};
    update(JSON.stringify(b)===JSON.stringify(g.bounds)?commit(s,s.layers):abort(s));
  },[update]);
  // Native range controls can release the pointer over a different element without
  // delivering pointerup/lostpointercapture to the input. Match the active ID only.
  useEffect(()=>{
    const end=(e:globalThis.PointerEvent)=>opacityEnd(e.pointerId,opacityControl.current);
    const abortPointer=(e:globalThis.PointerEvent)=>{const g=current.current.gesture;if(g?.kind==='opacity'&&g.pointerId===e.pointerId)cancel();};
    window.addEventListener('pointerup',end);window.addEventListener('pointercancel',abortPointer);
    return()=>{window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',abortPointer);};
  },[opacityEnd,cancel]);
  useEffect(()=>{
    alive.current=true;let frame=0;
    try{images.current=createImages();for(const a of ASSETS){const n=sources.current[a.id];if(n){n.width=a.width;n.height=a.height;const c=n.getContext('2d');if(!c)throw new Error('教材プレビューを描画できません');c.drawImage(images.current[a.id],0,0);}}
      if(beforeCanvas.current)render(beforeCanvas.current,initialLayers(),images.current);
      for(const blend of ['normal','multiply','screen'] as Blend[]){const c=comparison.current[blend];if(c)render(c,initialLayers().slice(0,2).map((l,i)=>i===1?{...l,x:200,y:80,width:240,height:240,opacity:.8,blend}:l),images.current);}
      frame=requestAnimationFrame(()=>{if(alive.current){setReady(true);setStatus('葉や太陽を選び、重なりから作品を作りましょう。');}});
    }catch(e){frame=requestAnimationFrame(()=>{if(alive.current)setError(String(e));});}
    const node=canvas.current;let previous=node?.getBoundingClientRect();const resize=()=>{const next=node?.getBoundingClientRect();if(next&&previous&&(next.width!==previous.width||next.height!==previous.height))cancel();previous=next;};
    const observer=new ResizeObserver(resize);if(node)observer.observe(node);
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};const hidden=()=>{if(document.hidden)cancel();};
    window.addEventListener('keydown',escape);window.addEventListener('resize',cancel);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);
    return()=>{alive.current=false;cancelAnimationFrame(frame);observer.disconnect();release();window.removeEventListener('keydown',escape);window.removeEventListener('resize',cancel);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);};
  },[cancel,release]);
  useEffect(()=>{if(!ready||!canvas.current||!images.current)return;let frame=0;try{render(canvas.current,state.layers,images.current);}catch(e){frame=requestAnimationFrame(()=>{if(alive.current){setError(String(e));setReady(false);}});}return()=>cancelAnimationFrame(frame);},[state.layers,ready]);
  const selected=state.layers.find(l=>l.id===state.selected),busy=!!state.gesture;
  const bounds=():Box=>{const b=canvas.current!.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};};
  function pointer(e:PointerEvent<HTMLCanvasElement>,phase:'down'|'move'|'up'|'cancel'){
    if(phase==='cancel'){if(current.current.gesture?.pointerId===e.pointerId)cancel();return;}
    if(current.current.gesture?.kind==='opacity')return;
    if(!ready||error||e.pointerType==='touch'&&!touch)return;
    const b=bounds(),p=point({x:e.clientX,y:e.clientY},b);if(!p){cancel();return;}
    if(phase==='down'){
      if(e.button!==0||current.current.gesture)return;e.preventDefault();canvas.current?.focus({preventScroll:true});const next=begin(current.current,e.pointerId,p,b);update(next);
      if(next.gesture){try{e.currentTarget.setPointerCapture(e.pointerId);capture.current=e.pointerId;}catch{cancel();}}
    }else if(current.current.gesture?.pointerId===e.pointerId){const next=move(current.current,e.pointerId,p,b);update(phase==='up'?commit(next,next.layers):next);}
  }
  function opacityStart(pointerId:number,node:HTMLInputElement){
    const s=current.current;if(s.gesture||!s.selected)return;const r=node.getBoundingClientRect();
    update({...s,gesture:{kind:'opacity',pointerId,start:{x:0,y:0},bounds:{x:r.x,y:r.y,width:r.width,height:r.height},before:s.layers,layerId:s.selected}});
  }
  function opacityValue(value:number){
    const s=current.current,g=s.gesture;
    if(g?.kind==='opacity')update({...s,layers:s.layers.map(l=>l.id===g.layerId?{...l,opacity:value}:l)});
    else if(!g)apply({opacity:value});
  }
  function act(action:Parameters<typeof command>[1]){update(command(current.current,action));setStatus(`${action}：作品と編集値を更新しました。`);}
  function apply(p:Partial<Layer>){if(current.current.selected)update(patch(current.current,current.current.selected,p));}
  function output(download:boolean){
    if(!ready||busy||exporting||error||!images.current)return;const token=version.current;setExporting(true);setError('');
    try{const target=document.createElement('canvas');render(target,current.current.layers,images.current);
      if(!download){if(!previewCanvas.current)throw new Error('プレビューがありません');render(previewCanvas.current,current.current.layers,images.current);setPreview(true);setExporting(false);setStatus('完成プレビュー：編集データから再描画しました。');return;}
      target.toBlob(blob=>{if(!alive.current)return;setExporting(false);if(token!==version.current){setStatus('編集が変わったため、古いPNGを保存しませんでした。');return;}if(!blob){setError('PNG出力に失敗しました。保存していません。');return;}try{const url=URL.createObjectURL(blob);try{const a=document.createElement('a');a.href=url;a.download='layer-composer-600x400.png';a.click();setStatus('PNGを生成してブラウザへ渡しました。保存先を確認してください。');}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch(e){setError(`PNG出力に失敗しました：${String(e)}`);}},'image/png');
    }catch(e){setExporting(false);setError(`出力失敗：${String(e)}`);}
  }
  return <section className="layerComposer" data-testid="layer-composer" data-state={JSON.stringify(state.layers)} data-selected={state.selected??''} data-pending={busy} data-history={state.past.length} data-future={state.future.length} data-ready={ready} data-error={error}>
    <header className="lcIntro"><span>COMPOSITION STUDIO</span><h4>重ねるたび、風景が変わる。</h4><p>夜明けの丘に、太陽と葉の切り絵を重ねる小さな工房。作品は600 × 400 px。市販画像や外部通信は使いません。</p></header>
    <div className="lcToolbar"><button disabled={!state.past.length||busy} onClick={()=>act('undo')}>Undo</button><button disabled={!state.future.length||busy} onClick={()=>act('redo')}>Redo</button><button onClick={()=>act('reset')}>Reset</button><button disabled={!ready||busy||exporting||!!error} onClick={()=>output(false)}>完成プレビュー</button><button disabled={!ready||busy||exporting||!!error} onClick={()=>output(true)}>PNG保存</button></div>
    <div className="lcLayout"><div className="lcArt">
      <label className="lcCheck"><input type="checkbox" checked={touch} onChange={e=>{cancel();setTouch(e.target.checked);}}/>タッチでレイヤーを移動（OFFはページスクロール）</label>
      <div className="lcSurface"><canvas ref={canvas} data-testid="lc-canvas" width={WIDTH} height={HEIGHT} tabIndex={0} role="img" aria-label="レイヤー編集キャンバス。矢印で選択レイヤーを1ピクセル、Shiftで10ピクセル移動" style={{touchAction:touch?'none':'pan-y'}} onPointerDown={e=>pointer(e,'down')} onPointerMove={e=>pointer(e,'move')} onPointerUp={e=>pointer(e,'up')} onPointerCancel={e=>pointer(e,'cancel')} onLostPointerCapture={e=>{if(current.current.gesture?.pointerId===e.pointerId)cancel();}} onKeyDown={e=>{if(e.key==='Escape'){cancel();return;}const d:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const delta=d[e.key];if(delta){e.preventDefault();const l=current.current.layers.find(l=>l.id===current.current.selected);if(l&&!l.locked&&!current.current.gesture){const k=e.shiftKey?10:1;apply({x:Math.min(WIDTH,Math.max(-1200,l.x+delta[0]*k)),y:Math.min(HEIGHT,Math.max(-1200,l.y+delta[1]*k))});}}}} />
        {selected?.visible&&<div className="lcSelection" aria-hidden="true" style={{left:`${selected.x/WIDTH*100}%`,top:`${selected.y/HEIGHT*100}%`,width:`${selected.width/WIDTH*100}%`,height:`${selected.height/HEIGHT*100}%`}}/>}
      </div><p className="lcHint">選択枠はPNGに含みません。透明部分も画像の矩形として選択します。矢印・数値でも編集でき、Escapeはドラッグ取消です。</p>
      <div className="lcCompare"><figure><canvas ref={beforeCanvas} width={WIDTH} height={HEIGHT} aria-label="初期作品"/><figcaption>初期作品</figcaption></figure><figure hidden={!preview}><canvas ref={previewCanvas} data-testid="lc-preview" width={WIDTH} height={HEIGHT} aria-label="完成プレビュー"/><figcaption>完成プレビュー（編集すると閉じます）</figcaption></figure></div>
    </div><aside className="lcPanel" aria-label="レイヤー編集パネル">
      <label>追加する画像<select aria-label="追加する画像" value={asset} onChange={e=>setAsset(e.target.value as AssetId)}>{ASSETS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button disabled={busy||state.layers.length>=MAX_LAYERS} onClick={()=>update(add(current.current,asset))}>レイヤー追加</button><p>上ほど手前・最大{MAX_LAYERS}枚</p>
      <ol className="lcList">{[...state.layers].reverse().map(l=><li key={l.id}><button data-layer-id={l.id} aria-pressed={l.id===state.selected} disabled={busy} onClick={()=>update({...current.current,selected:l.id})}>{l.name} <small>{l.id} · {l.visible?'表示':'非表示'} · {l.locked?'ロック':'編集可'}</small></button></li>)}</ol>
      {selected?<><div className="lcToolbar"><button disabled={busy} onClick={()=>act('up')}>手前へ</button><button disabled={busy} onClick={()=>act('down')}>奥へ</button><button disabled={busy||state.layers.length>=MAX_LAYERS} onClick={()=>act('duplicate')}>複製</button><button disabled={busy} onClick={()=>act('delete')}>削除</button><button disabled={busy} aria-pressed={!selected.visible} onClick={()=>apply({visible:!selected.visible})}>表示切替</button><button disabled={busy} aria-pressed={selected.locked} onClick={()=>apply({locked:!selected.locked})}>ロック切替</button></div>
      <fieldset disabled={busy&&state.gesture?.kind!=='opacity'}><Editor key={JSON.stringify(selected)} layer={selected} apply={apply}/>
      <label>透明度スライダー<input ref={opacityControl} aria-label="透明度スライダー" type="range" min={0} max={100} value={selected.opacity*100} onPointerDown={e=>{if(e.button===0){opacityStart(e.pointerId,e.currentTarget);try{e.currentTarget.setPointerCapture?.(e.pointerId);}catch{cancel();}}}} onPointerUp={e=>opacityEnd(e.pointerId,e.currentTarget)} onPointerCancel={e=>{if(current.current.gesture?.pointerId===e.pointerId)cancel();}} onLostPointerCapture={e=>{if(current.current.gesture?.pointerId===e.pointerId)cancel();}} onBlur={cancel} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))opacityStart(-1,e.currentTarget);}} onKeyUp={e=>opacityEnd(-1,e.currentTarget)} onChange={e=>opacityValue(Number(e.target.value)/100)}/></label>
      <label>合成モード<select aria-label="合成モード" value={selected.blend} onChange={e=>apply({blend:e.target.value as Blend})}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option></select></label><p>{descriptions[selected.blend]}</p><button disabled={selected.locked} onClick={()=>{const a=ASSETS.find(a=>a.id===selected.imageId)!;apply({x:0,y:0,width:a.width,height:a.height});}}>位置・倍率Reset</button></fieldset></>:<p>レイヤーを追加してください。</p>}
    </aside></div>
    <p role="status">{status}</p>{error&&<p role="alert">{error}</p>}
    <details><summary>素材と合成の仕組み</summary><div className="lcMaterials">{ASSETS.map(a=><figure key={a.id}><canvas ref={n=>{sources.current[a.id]=n;}} data-testid={`lc-source-${a.id}`} aria-label={a.name}/><figcaption>{a.name}（独自教材）</figcaption></figure>)}</div><p>透明ピクセルは下の画像を保ちます。配列の奥から手前へCanvas 2Dのアルファ合成を行い、画面とPNGに同じ描画手順を使います。教材画像は同期生成され、準備や描画に失敗した場合は出力しません。履歴は最大60操作。表示外は作品境界で切り取られます。</p><div className="lcMaterials">{(['normal','multiply','screen'] as Blend[]).map(b=><figure key={b}><canvas ref={n=>{comparison.current[b]=n;}} aria-label={`${b}の比較例`}/><figcaption>{descriptions[b]}</figcaption></figure>)}</div></details>
  </section>;
}
