"use client";
import {useEffect, useRef, useState} from 'react';
import type {SmallMotionId} from '../../data/smallMotionExhibits';
import {clamp, duration, sample} from './model';
import './small-motion.css';

function MotionRange({label,value,min,max,step,onChange}:{label:string;value:number;min:number;max:number;step:number;onChange:(v:number)=>void}){return <label>{label}<input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><output aria-live="off">{value}</output></label>;}

export default function SmallMotionPlayer({id}:{id:SmallMotionId}) {
  const root=useRef<HTMLDivElement>(null), epoch=useRef(0), progress=useRef(0);
  const [p,setP]=useState(0),[playing,setPlaying]=useState(false),[visible,setVisible]=useState(false),[tab,setTab]=useState(true),[reduced,setReduced]=useState(false);
  const [speed,setSpeed]=useState(1),[amplitude,setAmplitude]=useState(26),[gravity,setGravity]=useState(1),[rebound,setRebound]=useState(.7),[size,setSize]=useState(12),[spread,setSpread]=useState(92),[fallSpeed,setFallSpeed]=useState(1);
  const [mode,setMode]=useState('idle'),[saved,setSaved]=useState(false),[gaze,setGaze]=useState({x:0,y:0}),[expression,setExpression]=useState('穏やか'),[locked,setLocked]=useState(false);
  const [run,setRun]=useState(0);
  const activity=useRef({visible:false,tab:true,reduced:false});
  const active=playing&&visible&&tab&&!reduced;
  const move=(value:number)=>{progress.current=clamp(value);setP(progress.current);};
  const invalidate=()=>{epoch.current++;};
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{if(activity.current.reduced!==media.matches)invalidate();activity.current.reduced=media.matches;setReduced(media.matches);if(media.matches)setPlaying(false);};
    const visibility=()=>{const next=document.visibilityState==='visible';if(activity.current.tab!==next)invalidate();activity.current.tab=next;setTab(next);};
    update();visibility();media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);
    const observer=new IntersectionObserver(entries=>{const next=entries.some(e=>e.isIntersecting);if(activity.current.visible!==next)invalidate();activity.current.visible=next;setVisible(next);},{threshold:0});
    if(root.current)observer.observe(root.current);
    return()=>{invalidate();observer.disconnect();media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(!active)return;
    const generation=++epoch.current;let previous:number|undefined,frame=0;
    const tick=(now:number)=>{
      if(generation!==epoch.current)return;
      if(previous!==undefined){const next=clamp(progress.current+Math.max(0,now-previous)*speed/duration(id,gravity,fallSpeed));move(next);if(next===1){setPlaying(false);return;}}
      previous=now;frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>{invalidate();cancelAnimationFrame(frame);};
  },[active,speed,id,gravity,fallSpeed,run]);
  const start=(nextMode=mode==='idle'?'action':mode)=>{invalidate();setMode(nextMode);move(reduced?1:0);setRun(n=>n+1);setPlaying(!reduced);};
  const replay=()=>{if(id==='bookmark-fold'&&mode==='idle'){setSaved(true);start('save');}else start(mode==='confirmed'?'unread':mode==='cancelled'?'action':mode==='idle'?'action':mode);};
  const pause=()=>{invalidate();setPlaying(false);};
  const seek=(n:number)=>{pause();move(n);};
  const reset=()=>{pause();move(0);setMode('idle');setSaved(false);setSpeed(1);setAmplitude(26);setGravity(1);setRebound(.7);setSize(12);setSpread(92);setFallSpeed(1);setGaze({x:0,y:0});setExpression('穏やか');setLocked(false);};
  const togglePlay=()=>{if(playing)pause();else if(p===1||mode==='idle'||mode==='cancelled')replay();else {invalidate();setRun(n=>n+1);setPlaying(true);}};
  const s=sample(id,p,amplitude,rebound,size,spread,fallSpeed);
  const status=mode==='idle'?'待機':mode==='cancelled'?'取消済み':id==='bell-bounce'?mode==='confirmed'?'確認済み':p===1?'未読の通知': '通知中':id==='bookmark-fold'?(saved?'保存':'解除')+(p===1?'完了':'中'):id==='send-flight'?(p===1?'送信完了（模擬）':'実行中（通信なし）'):p===1?'完了':'観察中';
  const fold=id==='bookmark-fold'?(mode==='idle'?0:saved?p:1-p):0;
  const flightFold=Math.min(1,p/.28);
  const flightPoints=[[-57,-24,-45,-18],[57,-24,48,-28],[57,24,5,36],[-57,24,-4,5]].map(([x,y,tx,ty])=>`${x+(tx-x)*flightFold},${y+(ty-y)*flightFold}`).join(' ');
  const look=(x:number,y:number)=>{if(!locked)setGaze({x:clamp(x,-1,1),y:clamp(y,-1,1)});};
  return <div ref={root} className="smallMotion" data-testid="small-motion" data-id={id} data-progress={p.toFixed(4)} data-running={active} data-mode={mode} data-reduced={reduced}>
    <div className="smStage" tabIndex={id==='blink-look'?0:undefined} role={id==='blink-look'?'group':'img'} aria-label={id==='blink-look'?'視線の操作領域。矢印キーで視線、Homeで正面。':'動きの観察ステージ'}
      onPointerMove={id==='blink-look'?e=>{const b=e.currentTarget.getBoundingClientRect();look((e.clientX-b.left)/b.width*2-1,(e.clientY-b.top)/b.height*2-1);}:undefined}
      onPointerDown={id==='blink-look'?e=>{const b=e.currentTarget.getBoundingClientRect();look((e.clientX-b.left)/b.width*2-1,(e.clientY-b.top)/b.height*2-1);}:undefined}
      onKeyDown={id==='blink-look'?e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();look(e.key==='Home'?0:gaze.x+(e.key==='ArrowRight'?.2:e.key==='ArrowLeft'?-.2:0),e.key==='Home'?0:gaze.y+(e.key==='ArrowDown'?.2:e.key==='ArrowUp'?-.2:0));}}:undefined}>
      <svg viewBox="0 0 320 220" aria-hidden="true">
        <path d="M35 190 H285" stroke="#bccbc6" strokeWidth="1"/>
        {id==='bell-bounce'&&<><g transform={`rotate(${s.bellAngle} 160 56)`}><path d="M127 137 Q139 127 139 102 Q139 74 160 73 Q181 74 181 102 Q181 127 193 137 Z" fill="#e3ba68" stroke="#604c29" strokeWidth="3"/><path d="M151 145 Q160 159 169 145" fill="none" stroke="#604c29" strokeWidth="5"/><path d="M157 72 V62 H163 V72" fill="none" stroke="#604c29" strokeWidth="3"/></g>{mode!=='idle'&&mode!=='confirmed'&&<g transform={`translate(192 78) scale(${.65+.35*Math.min(1,p*4)})`}><circle r="14" fill="#ad4540"/><text textAnchor="middle" y="5" fill="white" fontSize="15">1</text></g>}{mode==='confirmed'&&<text x="160" y="180" textAnchor="middle" fill="#2a6d58">✓ 確認</text>}</>}
        {id==='bookmark-fold'&&<g transform={`translate(160 110) scale(${.72+.28*fold} 1) rotate(${saved?Math.sin(p*Math.PI)*-12:Math.sin(p*Math.PI)*18})`}><path d={`M-30 -58 H30 V58 L0 ${30-fold*12} L-30 58 Z`} fill={saved?'#517f6b':'#d4dcd7'} stroke="#345747" strokeWidth="3"/><path d={`M-30 -58 L${-30+60*fold} -34 L30 -58`} fill="#f1dfad" stroke="#345747" strokeWidth="2"/>{saved&&p===1&&<path d="M-12 -3 L-2 7 L16 -13" fill="none" stroke="white" strokeWidth="5"/>}</g>}
        {id==='squash-stretch'&&<><ellipse cx="160" cy="191" rx={25*s.scaleX} ry="5" fill="#263d321a"/><g transform={`translate(160 ${s.ballY}) scale(${s.scaleX} ${s.scaleY})`}><circle r="23" fill="#da8972" stroke="#915342" strokeWidth="2"/><path d="M-12 -8 Q0 -17 12 -8" fill="none" stroke="#fbe6da" strokeWidth="3"/></g><text x="16" y="24" fill="#4b6357" fontSize="12">縦 ×{s.scaleY.toFixed(2)} ／ 横 ×{s.scaleX.toFixed(2)}</text></>}
        {id==='send-flight'&&<>{mode==='cancelled'?<text x="160" y="113" textAnchor="middle" fill="#825847">取消しました</text>:p===1?<><circle cx="160" cy="110" r="38" fill="#d8e9dd"/><path d="M140 110 L154 124 L180 94" fill="none" stroke="#367259" strokeWidth="6"/></>:<g transform={`translate(${160+Math.max(0,p-.28)*195} ${110-Math.max(0,p-.28)*130}) rotate(${-Math.min(1,p*3)*22})`} opacity={1-Math.max(0,p-.8)*5}><polygon points={flightPoints} fill={flightFold<.5?'#437762':'#f1e4c1'} stroke="#437762" strokeWidth="2"/><path d="M-4 5 L48 -28 L5 36" fill="#aacbb8" opacity={flightFold}/><text x="0" y="6" textAnchor="middle" fill="white" fontSize="16" opacity={1-flightFold}>SEND</text></g>}</>}
        {id==='blink-look'&&<><g transform={`translate(0 110) scale(1 ${1-.94*s.blink}) translate(0 -110)`}>{[117,203].map(x=><g key={x}><ellipse cx={x} cy="110" rx="33" ry={expression==='驚き'?38:27} fill="#fffdf4" stroke="#476356" strokeWidth="3"/><circle cx={x+gaze.x*15} cy={110+gaze.y*10} r="11" fill="#34594b"/><circle cx={x+gaze.x*15+3} cy={107+gaze.y*10} r="3" fill="white"/></g>)}</g><path d={expression==='集中'?'M89 66 L141 78 M179 78 L231 66':expression==='驚き'?'M90 53 Q117 33 143 53 M177 53 Q203 33 230 53':'M90 69 Q117 57 143 69 M177 69 Q203 57 230 69'} fill="none" stroke="#476356" strokeWidth="4"/><path d="M146 160 Q160 172 174 160" fill="none" stroke="#476356" strokeWidth="3"/></>}
        {id==='drop-ripple'&&<><path d="M35 174 H285" stroke="#80acb3" strokeWidth="2"/>{s.dropVisible&&<path d="M0 -18 C-2 -9 -12 0 -12 7 A12 12 0 0 0 12 7 C12 0 2 -9 0 -18Z" transform={`translate(160 ${s.dropY}) scale(${size/12})`} fill="#6babb9"/>}{[0,1].map(i=><ellipse key={i} cx="160" cy="174" rx={s.rippleRadius*(1-i*.3)} ry={s.rippleRadius*(.23-i*.03)} fill="none" stroke="#427f94" strokeWidth={2-i*.5} opacity={s.rippleOpacity*(1-i*.3)}/>)}</>}
      </svg>
      <span className="smStageCaption">{id==='blink-look'?`${expression} · 視線 ${gaze.x.toFixed(1)}, ${gaze.y.toFixed(1)}`:status}</span>
    </div>
    <p role="status" aria-label="作品の状態" aria-live="polite" className="smStatus">{status}{playing&&!active?' / 自動停止中（画面外・非表示）':''}{reduced?' / 動きを減らす設定':''}</p>
    <div className="smActions">
      {id==='bell-bounce'&&<><button onClick={()=>start('unread')}>{mode==='confirmed'?'再通知':'通知を発生'}</button><button onClick={()=>{pause();move(1);setMode('confirmed');}} disabled={mode==='idle'||mode==='confirmed'}>確認</button></>}
      {id==='bookmark-fold'&&<button aria-pressed={saved} onClick={()=>{setSaved(!saved);start(saved?'unsave':'save');}}>{saved?'保存を解除':'保存する'}</button>}
      {id==='send-flight'&&<><button onClick={()=>start('action')}>送信（模擬）</button><button disabled={mode==='idle'||mode==='cancelled'||p===1} onClick={()=>{pause();move(0);setMode('cancelled');}}>取消</button></>}
      <button onClick={reduced?()=>{move(1);setMode(mode==='idle'?'action':mode);}:togglePlay}>{reduced?'最終状態':playing?'停止':'再生'}</button><button onClick={replay}>Replay</button><button onClick={reset}>Reset</button>
    </div>
    <div className="smControls">
      <MotionRange label="速度" value={speed} min={.25} max={2} step={.25} onChange={setSpeed}/>
      <MotionRange label="途中位置 (%)" value={Math.round(p*100)} min={0} max={100} step={1} onChange={v=>seek(v/100)}/>
      <div className="smSteps"><button onClick={()=>seek(p-.05)}>前へ 5%</button><button onClick={()=>seek(p+.05)}>次へ 5%</button></div>
      {id==='bell-bounce'&&<MotionRange label="揺れの大きさ (°)" value={amplitude} min={5} max={45} step={1} onChange={setAmplitude}/>}
      {id==='squash-stretch'&&<><MotionRange label="重力" value={gravity} min={.5} max={2} step={.25} onChange={setGravity}/><MotionRange label="反発" value={rebound} min={.2} max={1} step={.1} onChange={setRebound}/></>}
      {id==='drop-ripple'&&<><MotionRange label="水滴の大きさ" value={size} min={6} max={18} step={1} onChange={setSize}/><MotionRange label="落下速度" value={fallSpeed} min={.5} max={2} step={.25} onChange={setFallSpeed}/><MotionRange label="波紋の広がり" value={spread} min={40} max={120} step={5} onChange={setSpread}/></>}
      {id==='blink-look'&&<><label>表情<select value={expression} onChange={e=>setExpression(e.target.value)}><option>穏やか</option><option>驚き</option><option>集中</option></select></label><label className="smCheck"><input type="checkbox" checked={locked} onChange={e=>setLocked(e.target.checked)}/>視線を固定</label><button onClick={()=>setGaze({x:0,y:0})}>正面を見る</button></>}
    </div>
    <p className="smHelp">途中位置と前後ボタンで静止観察。停止は現在位置を保持、Replayは同じ動きを初めから、Resetは設定も初期化します。{reduced?' 自動再生せず、操作後は最終状態を表示します。':''}</p>
  </div>;
}
