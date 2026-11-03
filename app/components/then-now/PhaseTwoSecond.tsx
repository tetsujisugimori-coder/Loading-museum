"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { clamp, Range, useFrame, type StudyProps } from "./runtime";
import "./phase-two-second.css";

type Point = { x: number; y: number };
export type DrawingFrame = { lift: number; tilt: number; ink: Point[][] };
export const initialDrawingFrames = (): DrawingFrame[] => [0, 1, 2, 3, 4, 5].map(i => ({ lift: [0, 22, 40, 24, 2, -12][i], tilt: [-20, -4, 20, 8, -16, -25][i], ink: [] }));
export function duplicateDrawingFrame(frames: DrawingFrame[], index: number) {
  if (frames.length >= 16) return frames;
  const f = frames[index];
  return [...frames.slice(0, index + 1), { ...f, ink: f.ink.map(stroke => stroke.map(p => ({ ...p }))) }, ...frames.slice(index + 1)];
}
function PaperBird({ frame, now, ghost = false }: { frame: DrawingFrame; now: boolean; ghost?: boolean }) {
  return <g opacity={ghost ? .2 : 1} transform={`translate(160 ${116 - frame.lift}) rotate(${frame.tilt})`}>
    {now ? <><path d="M-54 12L0-34 58 9 0 30Z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M-54 12L0 4 58 9M0-34V30" stroke="currentColor" fill="none"/><circle r="5" fill="currentColor"/><path d="M0 30Q-17 48 5 61T0 85" fill="none" stroke="currentColor" strokeWidth="1.5"/></> : <><path d="M-60 16L-8-31 1-4 58-16 20 20-8 11-36 34-28 12Z" fill="currentColor"/><path d="M-8-31L-7 11 20 20" fill="none" stroke="#fff0ce" strokeWidth="2"/><circle cx="23" cy="1" r="2" fill="#fff0ce"/></>}
  </g>;
}
function DrawingInk({ frame }: { frame: DrawingFrame }) {
  return <>{frame.ink.map((stroke, i) => stroke.length === 1 ? <circle key={i} cx={stroke[0].x} cy={stroke[0].y} r="2" fill="currentColor"/> : <polyline key={i} points={stroke.map(p => `${p.x},${p.y}`).join(" ")} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>)}</>;
}
export function FrameByFrameLab(props: StudyProps) {
  const [frames, setFrames] = useState(initialDrawingFrames), [index, setIndex] = useState(0), [fps, setFps] = useState(6), [playing, setPlaying] = useState(false), [onion, setOnion] = useState(true);
  const remainder = useRef(0), drawing = useRef<number | null>(null);
  const frame = frames[index];
  useEffect(() => { drawing.current = null; }, [props.active, props.reduced]);
  useFrame(props.active && !props.reduced && playing, dt => {
    remainder.current += dt * fps * props.speed;
    const steps = Math.floor(remainder.current);
    if (steps) { remainder.current -= steps; setIndex(i => (i + steps) % frames.length); }
  });
  const select = (i: number) => { setPlaying(false); remainder.current = 0; drawing.current = null; setIndex((i + frames.length) % frames.length); };
  const edit = (patch: Partial<DrawingFrame>) => { setPlaying(false); setFrames(fs => fs.map((f, i) => i === index ? { ...f, ...patch } : f)); };
  const point = (e: PointerEvent<SVGSVGElement>) => { const b = e.currentTarget.getBoundingClientRect(); return { x: clamp((e.clientX - b.left) / b.width * 320, 0, 320), y: clamp((e.clientY - b.top) / b.height * 220, 0, 220) }; };
  const down = (e: PointerEvent<SVGSVGElement>) => { if (frame.ink.length >= 12) return; setPlaying(false); drawing.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); edit({ ink: [...frame.ink, [point(e)]] }); };
  const move = (e: PointerEvent<SVGSVGElement>) => { if (drawing.current !== e.pointerId) return; const p = point(e); setFrames(fs => fs.map((f, i) => i !== index ? f : { ...f, ink: f.ink.map((s, n) => n === f.ink.length - 1 && s.length < 120 ? [...s, p] : s) })); };
  const release = () => { drawing.current = null; };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); select(index + (e.key === "ArrowRight" ? 1 : -1)); }
    if (e.key === "Enter" && frame.ink.length < 12) { e.preventDefault(); edit({ ink: [...frame.ink, [{ x: 150, y: 65 }, { x: 160, y: 50 }, { x: 170, y: 65 }]] }); }
  };
  return <div className={`tn2Lab ${props.now ? "tn2Blueprint" : "tn2Paper"}`} data-frame={index} data-frames={frames.length} data-running={props.active && !props.reduced && playing}>
    <svg className="tnSurface tn2Draw" viewBox="0 0 320 220" role="application" aria-label="作画台。ドラッグで描く、左右キーでコマ送り、Enterで山形を描く" tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={key}>
      <path d="M20 190H300M20 192v6m280-6v6" stroke="currentColor" fill="none" opacity=".3"/>
      <text x="17" y="22" className="tn2Caption">{props.now ? "WIND / CONSTRUCTION SHEET" : "PAPER FLIGHT / FLIPBOOK"}</text>
      {onion && <>{[-1, 1].map(offset => <g key={offset} data-onion-frame={(index + frames.length + offset) % frames.length} opacity=".2"><PaperBird frame={frames[(index + frames.length + offset) % frames.length]} now={props.now}/><DrawingInk frame={frames[(index + frames.length + offset) % frames.length]}/></g>)}</>}
      <PaperBird frame={frame} now={props.now}/>
      <DrawingInk frame={frame}/>
      <text x="17" y="210" className="tn2Caption">FRAME {String(index + 1).padStart(2, "0")} / {frames.length} · {fps} FPS</text>
    </svg>
    <div className="tn2Film" aria-label="作画フレーム">{frames.map((f, i) => <button key={i} aria-label={`フレーム ${i + 1}`} aria-pressed={index === i} onClick={() => select(i)}><svg viewBox="0 0 320 220" aria-hidden="true"><PaperBird frame={f} now={props.now}/></svg><span>{i + 1}</span></button>)}</div>
    <div className="tnControls"><button onClick={() => { drawing.current = null; setPlaying(v => !v); }}>{playing ? "作画再生を停止" : "作画を再生"}</button><button onClick={() => select(index - 1)}>前のコマ</button><button onClick={() => select(index + 1)}>次のコマ</button><button disabled={frames.length >= 16} onClick={() => { drawing.current = null; setPlaying(false); setFrames(fs => duplicateDrawingFrame(fs, index)); setIndex(index + 1); }}>コマを複製して追加</button><button aria-pressed={onion} onClick={() => setOnion(v => !v)}>オニオンスキン</button><button disabled={!frame.ink.length} onClick={() => edit({ ink: frame.ink.slice(0, -1) })}>最後の線を戻す</button></div>
    <Range label="再生速度 fps" value={fps} min={1} max={12} onChange={setFps}/><Range label="このコマの高さ" value={frame.lift} min={-20} max={55} onChange={lift => edit({ lift })}/><Range label="このコマの傾き" value={frame.tilt} min={-40} max={40} onChange={tilt => edit({ tilt })}/>
    <p className="tnReadout">コマ {index + 1}/{frames.length} ／ 描線 {frame.ink.length}/12 ／ {props.reduced ? "動き低減：コマ送りで観察" : !props.active && playing ? "共通開始・画面内で再生" : playing ? "再生待機／再生中" : "編集・停止中"}</p>
    <p>{props.now ? "凧の骨組みを一枚ずつ設計する青図。" : "紙鳥のシルエットを切り替える小さなパラパラ帳。"}高さ・傾き・手描き線は選択コマだけを編集。複製は独立した新しい絵。最大16コマ、各12筆・120点。両版の絵は個別編集できます。</p>
  </div>;
}

export type GridPoint = { x: number; y: number };
export const islandObjects = [{ x: 0, y: 1, name: "灯台", key: "light" }, { x: 3, y: 0, name: "時計塔", key: "clock" }, { x: 4, y: 3, name: "泉", key: "water" }, { x: 1, y: 4, name: "種の木", key: "tree" }];
export function moveExplorer(p: GridPoint, dx: number, dy: number): GridPoint { return { x: clamp(p.x + dx, 0, 4), y: clamp(p.y + dy, 0, 4) }; }
export function nearbyObject(p: GridPoint) { return islandObjects.find(o => Math.abs(o.x - p.x) + Math.abs(o.y - p.y) <= 1); }
const iso = (x: number, y: number) => ({ x: 160 + (x - y) * 27, y: 53 + (x + y) * 15 });
export function IsometricExplorer(props: StudyProps) {
  const [position, setPosition] = useState<GridPoint>({ x: 2, y: 2 }), [found, setFound] = useState<string[]>([]), [message, setMessage] = useState("矢印で歩くか、地図の区画を選んでください。"), [phase, setPhase] = useState(0);
  useFrame(props.active && !props.reduced && found.length > 0, dt => setPhase(p => (p + dt * props.speed) % 12));
  const move = (dx: number, dy: number) => setPosition(p => moveExplorer(p, dx, dy));
  const inspect = (at: GridPoint = position) => { const obj = nearbyObject(at); if (!obj) { setMessage("仕掛けは隣の区画から調査できます。地図の四隅を探してみよう。"); return; } setFound(fs => fs.includes(obj.key) ? fs : [...fs, obj.key]); setMessage(`${obj.name}を発見。${({light:"灯りが空の星図につながった。",clock:"塔の針が旅の時刻を刻んだ。",water:"水の輪が庭の中心へ広がった。",tree:"種から小鳥のかたちが現れた。"})[obj.key as "light"]}`); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => { if ((e.target as HTMLElement).tagName === "BUTTON") return; const d: Record<string, number[]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; if (d[e.key]) { e.preventDefault(); move(d[e.key][0], d[e.key][1]); } if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(); } };
  const p = iso(position.x, position.y), nearby = nearbyObject(position);
  return <div className={`tn2Explorer ${props.now ? "tn2Night" : "tn2Day"}`} data-position={`${position.x},${position.y}`} data-found={found.length}>
    <div className="tn2World" role="group" aria-label="島の探検。矢印で移動、Enterで調査" tabIndex={0} onKeyDown={key}>
      <svg className="tnSurface" viewBox="0 0 320 250" role="img" aria-label={`${props.now ? "星図の" : "切手の"}島、位置 ${position.x + 1},${position.y + 1}、発見 ${found.length}/4`}>
        <text x="15" y="21" className="tn2Caption">{props.now ? "NIGHT ATLAS / 04 SIGNALS" : "POSTAGE ISLAND / LITTLE SECRETS"}</text>
        {Array.from({ length: 25 }, (_, i) => { const x = i % 5, y = Math.floor(i / 5), t = iso(x, y); return <g key={i}><path d={`M${t.x} ${t.y}l27 15-27 15-27-15Z`} className={(x + y) % 2 ? "tn2TileOdd" : "tn2Tile"}/>{(x === 4 || y === 4) && <path d={`M${t.x - (y === 4 ? 27 : 0)} ${t.y + 15}l27 15v14l-27-15Z`} className="tn2IslandEdge"/>}</g>; })}
        {islandObjects.map(o => { const t = iso(o.x, o.y), open = found.includes(o.key); return <g key={o.key} transform={`translate(${t.x} ${t.y + 13})`} className={open ? "tn2Discovered" : "tn2Sleeping"}>
          {o.key === "light" ? <><path d="M-8 0V-36l8-9 8 9V0Z"/><path d="M-12-36H12L0-48Z"/><rect x="-4" y="-32" width="8" height="9"/>{open && <path d={`M0-27L${38 + Math.sin(phase) * 8}-65M0-27L-40-62`} fill="none"/>}</> : o.key === "clock" ? <><path d="M-10 0V-39H10V0Z"/><circle cy="-29" r="7"/><path d={`M0-29v-5m0 5l${Math.cos(phase) * 5} ${Math.sin(phase) * 5}`} fill="none"/></> : o.key === "water" ? <><ellipse rx="15" ry="7"/><path d="M-15 0v6q15 11 30 0V0"/>{open && <><ellipse cy="-2" rx={8 + Math.sin(phase * 2) * 3} ry="3" fill="none"/><path d="M0-3Q-10-30-12-10M0-3Q10-30 12-10" fill="none"/></>}</> : <><path d="M0 0v-26M0-14l-12-9m12 4 10-10" fill="none"/><circle cx="-9" cy="-28" r="10"/><circle cx="8" cy="-35" r="11"/>{open && <path d="M-17-45l5-4 5 4m16-5 5-4 5 4" fill="none"/>}</>}
          <text y="16" textAnchor="middle" className="tn2Caption">{o.name}</text>
        </g>; })}
        {found.length === 4 && <g className="tn2FinalDiscovery"><path d="M130 30l15-8 15 8 15-8 15 8" fill="none"/><text x="160" y="240" textAnchor="middle" className="tn2Caption">THE ISLAND REMEMBERS YOU</text></g>}
        <g transform={`translate(${p.x} ${p.y + 12})`} className="tn2Traveller"><ellipse cy="5" rx="9" ry="4" opacity=".3"/><path d="M-6 2v-13l6-5 6 5V2Z"/><circle cy="-22" r="6"/><path d="M-9-25H9L0-34Z"/></g>
      </svg>
    </div>
    <div className="tn2Map" role="group" aria-label="移動先の区画">{Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5),o=islandObjects.find(o=>o.x===x&&o.y===y);return <button key={i} aria-label={`区画 ${x+1},${y+1}${o ? ` ${o.name}` : ""}`} aria-pressed={position.x===x&&position.y===y} onClick={()=>{setPosition({x,y});if(!props.now && o)inspect({x,y});}}>{o ? ({light:"灯",clock:"時",water:"泉",tree:"木"})[o.key as "light"] : position.x===x&&position.y===y ? "●" : "·"}</button>;})}</div>
    <div className="tnControls"><button aria-label="西へ" onClick={()=>move(-1,0)}>← 西</button><button aria-label="北へ" onClick={()=>move(0,-1)}>↑ 北</button><button aria-label="南へ" onClick={()=>move(0,1)}>↓ 南</button><button aria-label="東へ" onClick={()=>move(1,0)}>→ 東</button><button onClick={()=>inspect()}>周りを調査</button></div>
    <p className="tnReadout" aria-live="polite">{message} ／ 発見 {found.length}/4 ／ {nearby ? `${nearby.name}を調査できる` : "仕掛けを探そう"}</p>
    <p>{props.now ? "夜の観測地図。発見した建物が信号を送り、四つを結ぶと星の航路になる。" : "昼の切手の島。屋根、泉、種の木に近づき、絵葉書の小さな仕掛けを開く。"}{props.now ? "区画選択または矢印で移動し、隣接する仕掛けを調査ボタンで発見。" : "地図の仕掛けを押すと、その場所へ移動して即座に発見。矢印移動と調査ボタンも使えます。"}各版で独立した探検記録を持ちます。動きを止めても発見は残ります。</p>
  </div>;
}

export type LoadingScene = { units: number; reveal: number; started: boolean };
export const initialLoadingScene = (): LoadingScene => ({ units: 0, reveal: 0, started: false });
export function advanceLoadingScene(s: LoadingScene, seconds: number, rate: number): LoadingScene {
  if (!s.started) return s;
  const dt = clamp(seconds, 0, 1), safeRate = clamp(rate, 20, 400);
  if (s.units < 1000) { const required = (1000 - s.units) / safeRate; return { ...s, units: Math.min(1000, s.units + dt * safeRate), reveal: required < dt ? clamp((dt - required) / .8) : 0 }; }
  return { ...s, reveal: clamp(s.reveal + dt / .8) };
}
export function PreloaderTheatre(props: StudyProps) {
  const [scene, setScene] = useState(initialLoadingScene), [running, setRunning] = useState(false), [rate, setRate] = useState(100), [composition, setComposition] = useState(0);
  useFrame(props.active && !props.reduced && running && scene.reveal < 1, dt => setScene(s => advanceLoadingScene(s, dt * props.speed, rate)));
  const step = () => setScene(s => advanceLoadingScene({ ...s, started: true }, .25, rate));
  const percent = Math.floor(scene.units / 10), finished = scene.reveal >= 1;
  return <div className={`tn2Preloader ${props.now ? "tn2Observatory" : "tn2Cinema"}`} data-units={scene.units.toFixed(2)} data-reveal={scene.reveal.toFixed(3)} data-phase={finished ? "main" : scene.units >= 1000 ? "curtain" : scene.started ? "loading" : "idle"}>
    <svg className="tnSurface" viewBox="0 0 320 220" role="img" aria-label={`模擬読み込み ${percent}%、${finished ? "本編" : scene.units >=1000 ? "幕を開く" : "待ち時間"}`}>
      <rect width="320" height="220" className="tn2MainSky"/>
      {props.now ? <g className="tn2MainArt"><circle cx="160" cy="110" r={58+composition*8} fill="none"/><ellipse cx="160" cy="110" rx="118" ry={20+composition*12} fill="none" transform={`rotate(${composition*30-30} 160 110)`}/>{Array.from({length:12},(_,i)=>{const a=i*Math.PI/6+composition*.3;return <g key={i}><path d={`M160 110L${160+Math.cos(a)*95} ${110+Math.sin(a)*67}`} opacity=".25"/><circle cx={160+Math.cos(a)*95} cy={110+Math.sin(a)*67} r={i%3===composition ? 4 : 2}/></g>;})}<path d="M130 155h60l-12-36h-36Z"/><circle cx="160" cy="110" r="20"/></g> : <g className="tn2MainArt"><circle cx="247" cy="49" r="24"/><path d={`M0 178L45 ${85+composition*10} 84 136 142 64 203 141 257 ${93-composition*8} 320 165V220H0Z`}/><path d="M0 199Q85 130 170 195T320 183V220H0Z" className="tn2MainForeground"/><path d="M30 185l20-20 20 20-20-4Z"/><text x="20" y="35" className="tn2PosterTitle">MIDNIGHT MAIL</text></g>}
      <g transform={`translate(${-320*scene.reveal} 0)`} className="tn2Curtain">
        <rect width="320" height="220"/>
        {props.now ? <>{Array.from({length:20},(_,i)=><rect key={i} x={30+i%10*27} y={66+Math.floor(i/10)*30} width="20" height="20" className={scene.units >= (i+1)*50 ? "tn2Loaded" : "tn2Pending"}/>)}<text x="30" y="45" className="tn2Caption">ASSEMBLING THE OBSERVATORY</text><path d="M30 138H290"/><path d={`M30 138H${30+percent*2.6}`} className="tn2LoadingLine"/></> : <><path d="M25 70Q160 40 295 70V148Q160 120 25 148Z" className="tn2Ticket"/><text x="160" y="96" textAnchor="middle" className="tn2PosterTitle">PLEASE ENJOY</text><path d="M45 116H275"/><g transform={`translate(${45+percent*2.3} 115)`}><path d="M-10-8H10V3H-10Z" className="tn2Train"/><circle cx="-6" cy="5" r="3"/><circle cx="6" cy="5" r="3"/></g><text x="160" y="180" textAnchor="middle" className="tn2Caption">YOUR SMALL JOURNEY IS ARRIVING</text></>}
        <text x="160" y={props.now?181:35} textAnchor="middle" className="tn2Counter">{percent}%</text>
      </g>
      {finished && <text x="160" y="208" textAnchor="middle" className="tn2Caption">{props.now ? "OBSERVATORY OPEN" : "WELCOME TO THE FEATURE"}</text>}
    </svg>
    <div className="tnControls"><button disabled={finished} onClick={()=>{setScene(s=>({...s,started:true}));setRunning(v=>!v);}}>{finished ? "読み込み完了" : running ? "読み込みを一時停止" : scene.started ? "読み込みを再開" : "模擬読み込みを開始"}</button><button disabled={finished} onClick={step}>0.25秒進める</button>{finished && <button onClick={()=>setComposition(c=>(c+1)%3)}>本編の構図を変える</button>}</div>
    <Range label="模擬速度 units/秒" value={rate} min={20} max={400} step={20} onChange={setRate}/>
    <progress aria-label="模擬読み込み進捗" value={scene.units} max={1000}/>
    <p className="tnReadout" aria-live="off">{scene.units.toFixed(0)} / 1000 units · {percent}% ／ {finished ? "完了・本編を操作できます" : scene.units>=1000 ? `読込完了・幕の転換 ${Math.round(scene.reveal*100)}%` : !scene.started ? "開始待ち" : props.reduced ? "動き低減：手動ステップ" : running && props.active ? "模擬読み込み中" : "停止・待機"}</p>
    <p>{props.now ? "正確な進捗を20個の部品の組立図にする。最後の部品が揃うと観測所の本編へ。" : "切符と小さな列車が待ち時間を旅の予告に変える。到着すると山岳ポスターの本編へ。"}両版とも総量1000 unitsの同じ模擬処理。通信はしません。100%と幕の完了は別の状態。再現には共通Resetを使います。</p>
  </div>;
}
