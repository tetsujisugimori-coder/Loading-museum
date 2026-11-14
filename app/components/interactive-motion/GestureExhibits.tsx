'use client';
import {useCallback,useEffect,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import {finiteClamp,holdProgress,pressDepth,swipeDecision} from './gesture-model';
import s from './GestureExhibits.module.css';
type Props={active:boolean;reduced:boolean};
type Owner={kind:'pointer';id:number}|{kind:'key';key:string};
const activation=(key:string)=>key===' '||key==='Enter';
/** Each new action owns an epoch. A callback already queued before cancellation is inert. */
function useGestureLifetime(active:boolean){
 const root=useRef<HTMLDivElement>(null),epoch=useRef(0),frame=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),cancelRef=useRef<()=>void>(()=>{}),available=useRef(active);
 const invalidate=useCallback(()=>{epoch.current++;cancelAnimationFrame(frame.current);if(timer.current!==null)clearTimeout(timer.current);timer.current=null;return epoch.current;},[]);
 useEffect(()=>{available.current=active;if(!active)cancelRef.current();},[active]);
 useEffect(()=>{const hidden=()=>{if(document.visibilityState==='hidden')cancelRef.current();};const stop=()=>cancelRef.current();document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',stop);window.addEventListener('resize',stop);const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{const visible=entries.some(e=>e.isIntersecting);available.current=active&&visible;if(!visible)cancelRef.current();});if(root.current)observer?.observe(root.current);return()=>{invalidate();observer?.disconnect();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',stop);window.removeEventListener('resize',stop);};},[active,invalidate]);
 const allowed=()=>available.current&&document.visibilityState!=='hidden';
 const registerCancel=useCallback((fn:()=>void)=>{cancelRef.current=fn;},[]);
 const nextFrame=useCallback((fn:FrameRequestCallback)=>{frame.current=requestAnimationFrame(fn);},[]);
 const later=useCallback((fn:()=>void,ms:number)=>{timer.current=setTimeout(fn,ms);},[]);
 return {root,epoch,invalidate,registerCancel,nextFrame,later,allowed};
}
function ownsPointer(owner:Owner|null,e:PointerEvent){return owner?.kind==='pointer'&&owner.id===e.pointerId;}

export function PressRelease({active,reduced}:Props){
 const {root,epoch,invalidate,registerCancel,nextFrame,later,allowed}=useGestureLifetime(active),owner=useRef<Owner|null>(null),start=useRef(0),live=useRef('idle');
 const [state,setState]=useState('idle'),[elapsed,setElapsed]=useState(0),[restore,setRestore]=useState(420),[bounce,setBounce]=useState(true);
 const change=(next:string)=>{live.current=next;setState(next);};
 const cancel=()=>{invalidate();owner.current=null;if(live.current!=='idle'){change('cancelled');setElapsed(0);}};
 useEffect(()=>{registerCancel(cancel);});
 const begin=(who:Owner)=>{if(!allowed()||owner.current)return;const gen=invalidate();owner.current=who;start.current=performance.now();setElapsed(0);change('pressed');const tick=()=>{if(gen!==epoch.current)return;const ms=Math.max(0,performance.now()-start.current);setElapsed(ms);change(ms>=120?'holding':'pressed');nextFrame(tick);};nextFrame(tick);};
 const release=()=>{if(!owner.current)return;owner.current=null;const gen=invalidate();setElapsed(Math.max(0,performance.now()-start.current));change('released');later(()=>{if(gen===epoch.current)change('idle');},reduced?0:restore);};
 const keyDown=(e:KeyboardEvent)=>{if(e.key==='Escape'){cancel();return;}if(activation(e.key)){e.preventDefault();if(!e.repeat)begin({kind:'key',key:e.key});}};
 const keyUp=(e:KeyboardEvent)=>{if(owner.current?.kind==='key'&&owner.current.key===e.key){e.preventDefault();release();}};
 const holding=state==='pressed'||state==='holding',depth=holding?pressDepth(elapsed):0;
 return <div ref={root} className={s.root} data-testid="press-release" data-state={state} data-elapsed={elapsed} data-depth={depth}>
 <div className={s.stage} aria-label="鑑賞画面"><button className={s.press} aria-label="押して離す" disabled={!active} onPointerDown={e=>{if(e.button===0)begin({kind:'pointer',id:e.pointerId});}} onPointerUp={e=>{if(ownsPointer(owner.current,e))release();}} onPointerLeave={e=>{if(ownsPointer(owner.current,e))cancel();}} onPointerCancel={e=>{if(ownsPointer(owner.current,e))cancel();}} onKeyDown={keyDown} onKeyUp={keyUp} onBlur={cancel} style={{transform:reduced?'none':`translateY(${depth}px) scale(${holding?.96:1})`,transition:holding||reduced?'none':`transform ${restore}ms ${bounce?'cubic-bezier(.2,1.6,.4,1)':'ease-out'}`}}>{holding?'保持中':'Press & Release'}</button></div>
 <p className={s.status} role="status">状態：{state}</p><p className={s.hint}>押す・保持・離す。Space / Enterでも操作。領域外・Escapeは取消。</p>
 <div className={s.row}><button onClick={cancel}>取消</button><button onClick={()=>{invalidate();owner.current=null;setElapsed(0);change('idle');}}>Reset</button></div>
 <details><summary>操作を調整</summary><label>復元時間<input aria-label="復元時間" type="range" min="100" max="1000" step="20" value={restore} onChange={e=>{cancel();setRestore(finiteClamp(Number(e.target.value),100,1000));}}/>{restore} ms</label><label><input type="checkbox" checked={bounce} onChange={e=>{cancel();setBounce(e.target.checked);}}/>反発を付ける</label></details>
 <details><summary>仕組みを見る</summary><p>実測値：イベント開始から前景時計まで {elapsed.toFixed(0)} ms。計算値：押下変形 {depth.toFixed(2)} CSS px。設定値：復元 {restore} ms。反発はCSS補間で、物理ばねではありません。実画素の変位はNOT_RECORDED。</p><p>多重入力は最初の操作だけを採用。非表示・画面外・resize・閉室は取消し、自動復活しません。reduced motionは変形を抑制し状態を文字で示します。</p></details>
 </div>;
}

export function HoldConfirm({active,reduced}:Props){
 const {root,epoch,invalidate,registerCancel,nextFrame,allowed}=useGestureLifetime(active),owner=useRef<Owner|null>(null),start=useRef(0),live=useRef('idle');
 const [state,setState]=useState('idle'),[elapsed,setElapsed]=useState(0),[threshold,setThreshold]=useState(1200);
 const change=(next:string)=>{live.current=next;setState(next);};
 const cancel=()=>{invalidate();owner.current=null;if(live.current==='holding'){change('cancelled');setElapsed(0);}};
 useEffect(()=>{registerCancel(cancel);});
 const begin=(who:Owner)=>{if(!allowed()||owner.current||live.current==='confirmed')return;const gen=invalidate();owner.current=who;start.current=performance.now();setElapsed(0);change('holding');const tick=()=>{if(gen!==epoch.current||!owner.current)return;const ms=Math.max(0,performance.now()-start.current);setElapsed(ms);if(ms>=threshold){owner.current=null;invalidate();change('confirmed');return;}nextFrame(tick);};nextFrame(tick);};
 const release=()=>{if(!owner.current)return;const ms=performance.now()-start.current;if(ms>=threshold){owner.current=null;invalidate();setElapsed(ms);change('confirmed');}else cancel();};
 const reset=()=>{invalidate();owner.current=null;setElapsed(0);change('idle');};
 const p=holdProgress(elapsed,threshold);
 return <div ref={root} className={s.root} data-testid="hold-to-confirm" data-state={state} data-progress={p} data-elapsed={elapsed}>
 <div className={s.stage} aria-label="鑑賞画面"><button className={s.ringButton} aria-label="長押しで確定" disabled={!active||state==='confirmed'} onPointerDown={e=>{if(e.button===0)begin({kind:'pointer',id:e.pointerId});}} onPointerUp={e=>{if(ownsPointer(owner.current,e))release();}} onPointerLeave={e=>{if(ownsPointer(owner.current,e))cancel();}} onPointerCancel={e=>{if(ownsPointer(owner.current,e))cancel();}} onBlur={cancel} onKeyDown={e=>{if(e.key==='Escape')cancel();if(activation(e.key)){e.preventDefault();if(!e.repeat)begin({kind:'key',key:e.key});}}} onKeyUp={e=>{if(owner.current?.kind==='key'&&owner.current.key===e.key){e.preventDefault();release();}}}>
 <svg className={s.ring} viewBox="0 0 100 100" aria-hidden="true"><circle className={s.track} cx="50" cy="50" r="44"/><circle className={s.progress} cx="50" cy="50" r="44" pathLength="100" strokeDasharray="100" strokeDashoffset={100-(reduced?(state==='confirmed'?100:0):p*100)}/></svg><span className={s.ringText}>{state==='confirmed'?'確定しました':state==='holding'?`${Math.floor(p*100)}%`:'長押しで確定'}</span></button></div>
 <p className={s.status} role="status">状態：{state}{state==='confirmed'?'（模擬確定・外部送信なし）':''}</p><p className={s.hint}>離す・領域外・Escapeで取消。Space / Enterを保持しても操作できます。</p>
 <div className={s.row}><button onClick={cancel}>取消</button><button onClick={reset}>Reset</button><button onClick={reset}>Replay</button></div>
 <details><summary>操作を調整</summary><label>確定までの時間<input aria-label="確定までの時間" type="range" min="400" max="3000" step="100" value={threshold} onChange={e=>{reset();setThreshold(finiteClamp(Number(e.target.value),400,3000));}}/>{threshold} ms</label></details>
 <details><summary>仕組みを見る</summary><p>設定値：確定閾値 {threshold} ms。実測値：前景時計の保持時間 {elapsed.toFixed(0)} ms。計算値：進捗 {(p*100).toFixed(1)}%。物理入力の開始時刻と実画素の描画時刻はNOT_RECORDED。</p><p>取消・Reset・条件変更で旧フレームを無効化。非表示・画面外・resizeでも取消。Replayは待機へ戻し、再び長押しが必要です。reduced motionでも確定時間は同じで、リング移動だけを省きます。</p></details>
 </div>;
}

type Drag={id:number;x:number;y:number;lastX:number;lastTime:number;dx:number;velocity:number;axis:'pending'|'horizontal'};
export function SwipeDismiss({active,reduced}:Props){
 const {root,epoch,invalidate,registerCancel,later,allowed}=useGestureLifetime(active),drag=useRef<Drag|null>(null),live=useRef('idle');
 const [state,setState]=useState('idle'),[dx,setDx]=useState(0),[velocity,setVelocity]=useState(0),[threshold,setThreshold]=useState(100),[direction,setDirection]=useState(1);
 const change=(next:string)=>{live.current=next;setState(next);};
 const cancel=()=>{invalidate();drag.current=null;if(['dragging','dismissing','returning'].includes(live.current)){setDx(0);setVelocity(0);change('cancelled');}};
 useEffect(()=>{registerCancel(cancel);});
 const settle=(distance:number,v:number)=>{const gen=invalidate(),result=swipeDecision(distance,v,threshold);setVelocity(v);setDirection(Math.sign(distance)||1);setDx(result==='dismissed'?Math.sign(distance)*420:0);change(result==='dismissed'?'dismissing':'returning');later(()=>{if(gen===epoch.current)change(result);},reduced?0:240);};
 const reset=()=>{invalidate();drag.current=null;setDx(0);setVelocity(0);change('idle');};
 const down=(e:PointerEvent<HTMLButtonElement>)=>{if(e.button!==0||!allowed()||drag.current||live.current==='dismissed'||live.current==='dismissing')return;invalidate();drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastTime:performance.now(),dx:0,velocity:0,axis:'pending'};setDx(0);setVelocity(0);change('dragging');};
 const move=(e:PointerEvent<HTMLButtonElement>)=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const x=e.clientX-d.x,y=e.clientY-d.y;if(d.axis==='pending'){if(Math.abs(y)>8&&Math.abs(y)>Math.abs(x)){cancel();return;}if(Math.abs(x)>8){d.axis='horizontal';e.currentTarget.setPointerCapture?.(e.pointerId);}}const now=performance.now(),dt=now-d.lastTime;d.velocity=dt>0?(e.clientX-d.lastX)/dt:0;d.lastX=e.clientX;d.lastTime=now;d.dx=x;setDx(x);setVelocity(d.velocity);};
 const up=(e:PointerEvent<HTMLButtonElement>)=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;drag.current=null;const v=performance.now()-d.lastTime>100?0:d.velocity;settle(d.dx,v);};
 const dismissed=state==='dismissed';
 return <div ref={root} className={s.root} data-testid="swipe-to-dismiss" data-state={state} data-offset={dx} data-velocity={velocity}>
 <div className={`${s.stage} ${s.swipeStage}`} aria-label="鑑賞画面"><div className={s.placeholder}>{dismissed?'退場済み・Undoで復帰':'左右に払って判定'}</div><button className={s.card} aria-label="スワイプするカード" disabled={!active||dismissed||state==='dismissing'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={()=>{if(drag.current)cancel();}} onPointerLeave={e=>{if(drag.current?.axis==='pending'&&drag.current.id===e.pointerId)cancel();}} onKeyDown={e=>{if(e.key==='Escape')cancel();if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.repeat){e.preventDefault();drag.current=null;settle((e.key==='ArrowLeft'?-1:1)*threshold,0);}}} onBlur={()=>{if(drag.current)cancel();}} style={{transform:reduced?'none':`translateX(${dx}px) rotate(${finiteClamp(dx/22,-12,12)}deg)`,opacity:dismissed?0:1,visibility:dismissed?'hidden':'visible',transition:state==='dragging'||reduced?'none':'transform 240ms ease-out, opacity 240ms'}}>{state==='dragging'?'離して判定':'Swipe to Dismiss'}</button></div>
 <p className={s.status} role="status">状態：{state}{dismissed?`（${direction<0?'左':'右'}へ退場）`:''}</p><p className={s.hint}>左右へ払う。縦方向はスクロールを優先。フォーカスしたカードで← / →も使えます。</p>
 <div className={s.row}><button disabled={!active||dismissed||state==='dismissing'} onClick={()=>settle(-threshold,0)}>左へ退場</button><button disabled={!active||dismissed||state==='dismissing'} onClick={()=>settle(threshold,0)}>右へ退場</button><button disabled={state!=='dismissed'&&state!=='dismissing'} onClick={reset}>Undo</button><button onClick={cancel}>取消</button><button onClick={reset}>Reset</button></div>
 <details><summary>操作を調整</summary><label>退場距離の閾値<input aria-label="退場距離の閾値" type="range" min="60" max="160" step="10" value={threshold} onChange={e=>{reset();setThreshold(finiteClamp(Number(e.target.value),60,160));}}/>{threshold} CSS px</label></details>
 <details><summary>仕組みを見る</summary><p>設定値：距離閾値 {threshold} CSS px / 速度閾値 0.65 CSS px/ms（最低24px）。実測入力：最後のポインター速度 {velocity.toFixed(3)} CSS px/ms。計算・描画指定値：変位 {dx.toFixed(1)} CSS px。実画素の変位はNOT_RECORDED。キーボードは距離閾値による明示命令で、速度計測ではありません。</p><p>100ms以上停止して離した場合は速度を0として判定。領域の縦移動・pointercancel・非表示・画面外・resizeはドラッグ取消。UndoとResetは旧退場完了処理を無効にします。reduced motionは移動補間を省き、操作の確定とUndoは維持します。</p></details>
 </div>;
}
