"use client";

import { useId, useState, type PointerEvent, type KeyboardEvent } from "react";
import { clamp, Range, useFrame, type StudyProps } from "./runtime";
import "./phase-two-first.css";

function Scene({ now, night = false }: { now: boolean; night?: boolean }) {
  return <g><rect width="320" height="230" fill={night ? "#13192f" : now ? "#d4d1bb" : "#341e48"} />
    <circle cx={night ? 246 : 70} cy="52" r={night ? 24 : 34} fill={night ? "#f7e7ba" : "#ff9774"} />
    {Array.from({length: 11}, (_, i) => <path key={i} d={`M${i*34-20} 190 L${i*34+5} ${80+i%3*18} L${i*34+37} 190Z`} fill={night ? "#303b57" : now ? "#658c89" : "#74517b"} />)}
    <path d="M0 171Q80 140 152 175T320 165V230H0Z" fill={night ? "#304754" : now ? "#276a71" : "#d95f81"}/>
    <path d="M120 230L154 163H168L213 230" fill={night ? "#b9c8bb" : "#f7d7a6"}/>
    <g transform="translate(213 111)"><path d="M-23 39V0L0-19L23 0V39Z" fill={night ? "#b6a680" : "#f2b567"}/><path d="M-29 0L0-24L29 0" fill="none" stroke="#192b3a" strokeWidth="5"/><rect x="-7" y="17" width="14" height="22" fill="#243b48"/><circle cy="4" r="5" fill="#fff0bb"/></g>
    {night && Array.from({length:9},(_,i)=><path key={i} d={`M${20+i*33} ${24+i%3*13}h3m-1.5-1.5v3`} stroke="#fbebbb"/>)}
    <text x="14" y="216" fill={night ? "#e1e9dc" : "#fff2d7"} fontSize="10" letterSpacing="3">{night ? "AFTER THE LIGHT" : now ? "PAPER LANDSCAPE" : "VELVET VALLEY"}</text>
  </g>;
}
export function maskExtent(progress: number, size: number) { return Math.max(0, size * clamp(progress) * 3.8); }
export function MaskTheatre(props: StudyProps) {
  const clip = useId().replace(/:/g, ""), [shape,setShape]=useState("circle"), [progress,setProgress]=useState(.32), [x,setX]=useState(160),[y,setY]=useState(110),[size,setSize]=useState(100),[paused,setPaused]=useState(false);
  useFrame(props.active && !props.reduced && !paused && progress < 1,dt=>setProgress(p=>clamp(p+dt*props.speed/4)));
  const q=props.now?progress:Math.round(progress*36)/36, extent=maskExtent(q,size);
  const move=(e:PointerEvent<SVGSVGElement>)=>{if(e.buttons!==1)return;const b=e.currentTarget.getBoundingClientRect();setX(clamp((e.clientX-b.left)/b.width*320,0,320));setY(clamp((e.clientY-b.top)/b.height*230,0,230));};
  return <div className="tn2Mask"><svg className="tn2Surface tn2Drag" viewBox="0 0 320 230" role="img" aria-label={`マスクの劇場 ${shape} ${Math.round(q*100)}%`} onPointerDown={e=>{e.currentTarget.setPointerCapture?.(e.pointerId);move(e);}} onPointerMove={move}>
    <defs><clipPath id={clip}>{shape==="circle"?<circle cx={x} cy={y} r={extent}/>:shape==="bands"?<g transform={`translate(${x-160} ${y-115})`}>{Array.from({length:6},(_,i)=><rect key={i} x={props.now?(i%2?320-extent*2:0):160-extent} y={i*40} width={extent*2} height="28" transform={props.now?`rotate(-12 160 115)`:undefined}/>)}</g>:<text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontFamily="serif" fontWeight="900" fontSize={extent*1.5}>夢</text>}</clipPath></defs>
    <Scene now={props.now}/><g clipPath={`url(#${clip})`}><Scene now={props.now} night/></g>
    <path d={`M${x-7} ${y}h14M${x} ${y-7}v14`} stroke="#fff" strokeWidth="1"/>
  </svg><div className="tnControls">{[["circle","円"],["bands","帯"],["text","文字"]].map(([v,label])=><button key={v} aria-pressed={shape===v} onClick={()=>setShape(v)}>{label}マスク</button>)}<button aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?"転換を再開":"転換を停止"}</button><button onClick={()=>setProgress(0)}>転換の先頭</button></div>
  <Range label="転換位置 %" value={Math.round(progress*100)} onChange={v=>setProgress(v/100)}/><Range label="マスクの大きさ" value={size} min={20} max={150} onChange={setSize}/><Range label="マスク横位置" value={x} max={320} onChange={setX}/><Range label="マスク縦位置" value={y} max={230} onChange={setY}/>
  <p className="tnReadout" data-mask-progress={progress.toFixed(3)}>昼の舞台 → 夜の舞台 ／ {Math.round(q*100)}% ／ {shape} ／ 中心 {Math.round(x)},{Math.round(y)}</p><p>{props.now?"紙を斜めに裁つ帯と、連続する開口。":"36段階の幕のリズムと、水平に開く帯。"}窓の外は昼、内側は夜。同じ構図を切り取り方から変える。文字窓は書体により輪郭が異なります。</p></div>;
}

export type SpringState={position:number;velocity:number};
export function advanceNavigation(state:SpringState,target:number,dt:number,bounce:number):SpringState {
  let {position,velocity}=state;const steps=Math.max(1,Math.ceil(Math.min(dt,.25)/.008)),h=Math.min(dt,.25)/steps;
  for(let i=0;i<steps;i++){velocity+=(target-position)*75*h;velocity*=Math.exp(-(16-bounce*.11)*h);position+=velocity*h;position=clamp(position,-.12,1.15);}
  if(Math.abs(position-target)<.0005&&Math.abs(velocity)<.002)return {position:target,velocity:0};return {position,velocity};
}
const destinations=[{name:"月港",sub:"MOON PORT",color:"#efb75f",text:"灯台の信号が、遠い航路を結ぶ。"},{name:"温室",sub:"GLASS GARDEN",color:"#8dc9ad",text:"硝子屋根の下、夜にも葉がひらく。"},{name:"書庫",sub:"NIGHT ARCHIVE",color:"#b6a3dc",text:"星図の余白に、旅の記録を残す。"},{name:"劇場",sub:"SMALL THEATRE",color:"#ef9d9f",text:"四つの入口が、小さな町をつなぐ。"}];
export function ElasticNavigation(props:StudyProps) {
 const [open,setOpen]=useState(false),[spring,setSpring]=useState<SpringState>({position:0,velocity:0}),[selected,setSelected]=useState(0),[bounce,setBounce]=useState(55),[paused,setPaused]=useState(false);
 const advance=(dt:number)=>setSpring(s=>advanceNavigation(s,open?1:0,dt,bounce));
 useFrame(props.active&&!props.reduced&&!paused&&(spring.position!==(open?1:0)||spring.velocity!==0),dt=>advance(dt*props.speed));
 const target=destinations[selected], p=spring.position;
 return <div className="tn2Navigation"><div className={`tn2MenuWorld ${props.now?"isNow":"isThen"}`} data-menu-position={p.toFixed(4)}>
 <svg viewBox="0 0 320 260" aria-hidden="true"><rect width="320" height="260" fill={props.now?"#182a32":"#302037"}/><circle cx="160" cy="120" r="100" fill="none" stroke="#6f607d" strokeDasharray={props.now?"1 8":"4 4"}/><path d="M30 220H290M45 228H275M65 236H255" stroke="#839b9c"/>{destinations.map((_,i)=>{const a=i*Math.PI/2-Math.PI/2;return <path key={i} d={`M160 120L${160+Math.cos(a)*88*p} ${120+Math.sin(a)*70*p}`} stroke="#a0b4b0"/>;})}</svg>
 {destinations.map((d,i)=>{const a=i*Math.PI/2-Math.PI/2;const px=props.now?55+70*i:160+Math.cos(a)*94,py=props.now?56+(i%2)*85:120+Math.sin(a)*76;return <button key={d.name} className="tn2Destination" style={{left:`${(160+(px-160)*p)/3.2}%`,top:`${(120+(py-120)*p)/2.6}%`,opacity:clamp(p*2),visibility:p<.03?"hidden":"visible",borderColor:d.color,zIndex:i+1}} disabled={!open} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{d.name}</button>;})}
 <button className="tn2Hub" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?"収納":"展開"}</button></div>
 <div className="tn2DestinationDetail" style={{borderColor:target.color}}><strong>{target.sub}</strong><p>{target.text}</p><svg viewBox="0 0 280 55" aria-hidden="true"><path d={selected===0?"M10 50H270M30 49L65 30H130L155 49M210 49V5H227V49M204 12H232":selected===1?"M25 50V20L140 2L255 20V50ZM65 50V15M110 50V7M170 50V7M215 50V15":selected===2?"M20 50V5H260V50M30 25H250M50 5V25M80 5V25M150 25V50M190 25V50":"M20 50V5H260V50M45 5Q110 40 45 50M235 5Q170 40 235 50M90 50H190"} fill="none" stroke={target.color} strokeWidth="2"/></svg></div>
 <div className="tnControls"><button onClick={()=>setPaused(v=>!v)} aria-pressed={paused}>{paused?"動きを再開":"動きを停止"}</button><button onClick={()=>advance(1/12)}>1コマ進む</button><button onClick={()=>{setSpring({position:open?1:0,velocity:0});}}>目標位置へ</button></div><Range label="反発の強さ" value={bounce} onChange={setBounce}/>
 <p className="tnReadout">目標 {open?"展開":"収納"} ／ 位置 {p.toFixed(3)} ／ 速度 {spring.velocity.toFixed(2)} ／ 選択 {target.name}</p><p>{props.now?"折れた索引の列として四つの場所を並べる。":"中心から放射状に、四つの入口が飛び出す。"}途中で展開/収納を反転すると、その瞬間の速度を引き継ぐ。停止・動き低減中はコマ送りか「目標位置へ」で操作できます。</p></div>;
}

export function parallaxPose(view:number,depth:number,layer:number,now:boolean) {return {x:-view*depth*layer*(now?30:38),y:now?Math.abs(view)*depth*layer*5:0};}
export function ParallaxStage(props:StudyProps) {
 const [view,setView]=useState(0),[depth,setDepth]=useState(.7),[auto,setAuto]=useState(true),[phase,setPhase]=useState(0),[guides,setGuides]=useState(false);
 useFrame(props.active&&!props.reduced&&auto,dt=>{const n=phase+dt*props.speed*.7;setPhase(n);setView(Math.sin(n));});
 const move=(e:PointerEvent<SVGSVGElement>)=>{if(e.buttons!==1)return;const b=e.currentTarget.getBoundingClientRect();setAuto(false);setView(clamp((e.clientX-b.left)/b.width*2-1,-1,1));};
 const key=(e:KeyboardEvent<SVGSVGElement>)=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();setAuto(false);setView(v=>clamp(v+(e.key==="ArrowLeft"?-.1:.1),-1,1));}if(e.key==="Home"){e.preventDefault();setAuto(false);setView(0);}};
 return <div><svg className="tn2Surface tn2Drag" viewBox="0 0 320 230" role="application" tabIndex={0} aria-label="奥行きの舞台。左右キーで視点移動、Homeで中央" onKeyDown={key} onPointerDown={e=>{e.currentTarget.setPointerCapture?.(e.pointerId);move(e);}} onPointerMove={move}>
 <rect width="320" height="230" fill={props.now?"#e2dbbf":"#1a2039"}/><circle cx="240" cy="45" r="22" fill={props.now?"#dd7557":"#e2d0a6"}/>
 {[.25,.6,1].map((layer,i)=>{const pose=parallaxPose(view,depth,layer,props.now);return <g key={i} transform={`translate(${pose.x} ${pose.y})`} data-layer={i} data-x={pose.x.toFixed(3)}>
 {i===0?<><path d="M-60 150L0 90L40 125L105 48L180 140L240 70L380 145V230H-60Z" fill={props.now?"#7c9691":"#46506c"}/><path d="M103 48L80 78L110 70L127 80Z" fill="#c2c8bd"/></>:i===1?<><path d="M-70 192Q70 125 165 176T380 150V240H-70" fill={props.now?"#376e70":"#627a84"}/><g transform="translate(151 98)"><path d="M-26 68V26H26V68" fill="#e7ba83"/><path d="M-33 26A33 33 0 0 1 33 26Z" fill={props.now?"#c0694f":"#b98d78"}/><path d="M0-7V0M-20 60H20M-12 35V48H12V35Z" stroke="#233e4a" fill="#233e4a"/><path d="M0 0V26M-20 5L-15 26M20 5L15 26" fill="none" stroke="#ead1ad"/></g><path d="M-20 177H100M234 179H360" stroke="#e2c5a0" strokeWidth="3"/></>:<><path d="M-60 222Q40 176 120 209T380 198V250H-60Z" fill={props.now?"#203f42":"#172c41"}/>{[-5,44,278,330].map((x,j)=><g key={x} transform={`translate(${x} ${j%2?58:90})`}><path d="M0 160V0M0 25L-22 5M0 55L30 28M0 100L-25 76" stroke={props.now?"#25444a":"#c08d78"} strokeWidth="5"/><path d="M-27 5L0-15L22 12L8 40L-25 32Z" fill={props.now?"#bd6c4f":"#90637e"}/></g>)}</>}
 {guides&&<><path d={`M-100 ${150+i*27}H420`} stroke="#ffe575" strokeDasharray="4 3"/><text x="65" y={145+i*27} fontSize="10" fill="#fff3a5">{["遠景","中景","手前"][i]} ×{layer}</text></>}</g>;})}<path d="M10 15H28M19 6V24" stroke={props.now?"#234749":"#f2d7aa"}/></svg>
 <div className="tnControls"><button aria-pressed={auto} onClick={()=>setAuto(v=>!v)}>{auto?"視点を停止":"視点を再開"}</button><button onClick={()=>{setAuto(false);setView(0);setPhase(0);}}>中央へ</button><button aria-pressed={guides} onClick={()=>setGuides(v=>!v)}>レイヤー線</button></div>
 <Range label="視点の左右" value={view} min={-1} max={1} step={.01} onChange={v=>{setAuto(false);setView(v);}}/><Range label="奥行きの強さ" value={depth} max={1} step={.01} onChange={setDepth}/>
 <p className="tnReadout">視点 {view.toFixed(2)} ／ 深さ {depth.toFixed(2)} ／ 遠景:中景:手前 = 0.25:0.60:1.00</p><p>{props.now?"切り絵の観測所。左右移動に少しの上下視差を添え、紙の重なりを見せる。":"夜の観測所。舞台の書割を横へ引き、大きな視点移動で森をすり抜ける。"}各層は独立した景物。中央へ戻せば同じ構図を比較できます。</p></div>;
}
