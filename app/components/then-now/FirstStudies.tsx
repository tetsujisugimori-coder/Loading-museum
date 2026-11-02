"use client";

import { useState, useRef, type PointerEvent, type KeyboardEvent } from "react";
import { clamp, Range, Surface, useFrame, useProgress, type StudyProps } from "./runtime";

export function vertices(shape: string) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4 - Math.PI / 2;
    const r = shape === "star" ? (i % 2 ? 34 : 80) : shape === "square" ? 64 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) : 76;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}
export function morphPoints(shape: string, p: number, offset: number) {
  const a = vertices("square"), b = vertices(shape);
  return a.map((v, i) => ({ x: v.x * (1 - p) + b[(i + offset) % 8].x * p, y: v.y * (1 - p) + b[(i + offset) % 8].y * p }));
}
const points = (v: { x: number; y: number }[]) => v.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

export function VectorMorph(props: StudyProps) {
  const [p, setP] = useProgress(props), [shape, setShape] = useState("star"), [offset, setOffset] = useState(0), [guides, setGuides] = useState(true);
  const t = props.now ? p : Math.round(p * 24) / 24;
  const current = morphPoints(shape, t, props.now ? offset : 0), a = vertices("square"), b = vertices(shape);
  return <>
    <Surface label={`四角から${shape === "star" ? "星" : "円"}へ ${Math.round(t * 100)}%・対応ずれ${props.now ? offset : 0}`}>
      <g transform="translate(160 110)"><polygon className="tnGhost" points={points(a)} /><polygon className="tnGhost" points={points(b)} />
        {props.now && guides && a.map((v, i) => <line key={i} className="tnCorrespondence" x1={v.x} y1={v.y} x2={b[(i + offset) % 8].x} y2={b[(i + offset) % 8].y} />)}
        <polygon className="tnShape" points={points(current)} />
        {props.now && guides && current.map((v, i) => <g key={i}><circle cx={v.x} cy={v.y} r="3" fill="var(--tn-ink)" /><text x={v.x + 7} y={v.y - 5} className="tnPointLabel">{i}</text></g>)}
      </g>
    </Surface>
    <div className="tnControls"><button onClick={() => { setShape(s => s === "star" ? "circle" : "star"); setP(0); }}>形を切替</button><button onClick={() => setP(0)}>先頭から</button>{props.now && <button aria-pressed={guides} onClick={() => setGuides(v => !v)}>対応線</button>}</div>
    <Range label="中間形状 %" value={Math.round(p * 100)} onChange={v => setP(v / 100)} />
    {props.now && <Range label="対応点のずれ" value={offset} max={7} onChange={setOffset} />}
    <p className="tnReadout" data-progress={p.toFixed(3)}>四角 → {shape === "star" ? "星" : "円"} ／ t={t.toFixed(2)} ／ {props.now ? `点 i → (i+${offset}) mod 8` : "24段階の輪郭補間"}</p>
    <p>始点の四角と終点の輪郭を細線で表示。{props.now ? "対応先をずらすと、同じ終点でも途中の交差や縮み方が変わる。" : "等間隔の進行に、輪郭が変わること自体の気持ちよさを残す。"}</p>
  </>;
}

type Target = { x: number; y: number; speed: number; inside: boolean };
export function CursorCreature(props: StudyProps) {
  const [target, setTarget] = useState<Target>({ x: 160, y: 110, speed: 0, inside: false });
  const [body, setBody] = useState({ x: 160, y: 124 }), [mode, setMode] = useState("watch"), [gifts, setGifts] = useState(0);
  const last = useRef({ x: 160, y: 110, time: 0 });
  const distance = Math.hypot(target.x - body.x, target.y - body.y);
  const reaction = !target.inside ? "REST" : (mode === "avoid" || (props.now && target.speed > 650)) && distance < 120 ? "RETREAT" : mode === "watch" ? "WATCH" : "FOLLOW";
  useFrame(props.active && !props.reduced && target.inside && reaction !== "WATCH", dt => {
    setBody(b => {
      const dx = target.x - b.x, dy = target.y - b.y, factor = reaction === "RETREAT" ? -2.4 : props.now ? 3.2 : 1.8;
      return { x: clamp(b.x + dx * dt * factor * props.speed, 42, 278), y: clamp(b.y + dy * dt * factor * props.speed, 65, 168) };
    });
    if (target.speed > 0) setTarget(t => ({ ...t, speed: t.speed * .91 }));
  });
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect(), x = clamp((e.clientX - box.left) / box.width * 320, 0, 320), y = clamp((e.clientY - box.top) / box.height * 220, 0, 220);
    const time = e.timeStamp, speed = last.current.time ? Math.min(2000, Math.hypot(x - last.current.x, y - last.current.y) / Math.max(.016, (time - last.current.time) / 1000)) : 0;
    last.current = { x, y, time }; setTarget({ x, y, speed, inside: true });
    if (props.reduced) setBody({ x: clamp(x, 42, 278), y: clamp(y, 65, 168) });
  };
  const leave = () => { setTarget(t => ({ ...t, inside: false, speed: 0 })); last.current.time = 0; };
  const gift = () => { setGifts(v => v + 1); setMode("follow"); };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault(); setTarget(t => ({ x: clamp(t.x + (e.key === "ArrowRight" ? 24 : e.key === "ArrowLeft" ? -24 : 0), 20, 300), y: clamp(t.y + (e.key === "ArrowDown" ? 24 : e.key === "ArrowUp" ? -24 : 0), 20, 200), speed: 0, inside: true }));
    } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); gift(); } else if (e.key === "Escape") leave();
  };
  const eyeX = clamp((target.x - body.x) / 25, -5, 5), eyeY = clamp((target.y - body.y) / 25, -4, 4);
  return <>
    <svg className="tnSurface tnPointer" viewBox="0 0 320 220" role="application" aria-label="紙鳥を操作：矢印で目標、Enterで合図、Escapeで休息" tabIndex={0} onKeyDown={key} onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave} onBlur={leave} onClick={gift}>
      <path className="tnGrid" d="M0 180H320M80 0V220M160 0V220M240 0V220" />
      {target.inside && <g className="tnTarget"><path d={`M${target.x - 8} ${target.y}h16M${target.x} ${target.y - 8}v16`} /></g>}
      <g transform={`translate(${body.x} ${body.y})`} data-reaction={reaction}>
        <ellipse cy="47" rx="34" ry="4" fill="#0007" />
        <path d={props.now ? "M-36 8L-9-24L29-15L40 19L5 38Z" : "M-33 12L-25-23L13-29L35 6L17 37L-16 37Z"} className="tnCreature" />
        <path d={reaction === "RETREAT" ? "M-26 12L-58-25L-46 27ZM20 13L52-28L48 25Z" : gifts % 2 ? "M-26 12L-52-9L-45 28ZM20 13L48-10L44 29Z" : "M-26 12L-47 35L-28 30ZM20 13L40 36L25 28Z"} className="tnWing" />
        <path d="M3-9L14-4L4 1Z" fill="#ffe45c" /><rect x="-16" y="-17" width="12" height="14" fill="#f7f2df" /><circle cx={-10 + eyeX} cy={-10 + eyeY} r="3" fill="#080712" />
        <path d="M-10 37V47H-21M12 37V47H24" fill="none" stroke="#ffe45c" strokeWidth="3" />
      </g>
      <text x="12" y="22" className="tnSvgLabel">{props.now ? "PAPER SCOUT / 02" : "PAPER SCOUT / 01"}</text>
    </svg>
    <div className="tnControls"><button onClick={() => setMode("watch")} aria-pressed={mode === "watch"}>注視</button><button onClick={() => setMode("follow")} aria-pressed={mode === "follow"}>追従</button><button onClick={() => setMode("avoid")} aria-pressed={mode === "avoid"}>回避</button><button onClick={gift}>合図を送る</button><button onClick={() => setTarget({ x: 80, y: 90, speed: 0, inside: true })}>左へ誘う</button><button onClick={() => setTarget({ x: 240, y: 130, speed: 0, inside: true })}>右へ誘う</button></div>
    <p className="tnReadout" data-reaction={reaction}>{reaction} ／ 距離 {distance.toFixed(0)}px ／ 入力速度 {target.speed.toFixed(0)}px/s ／ 合図 {gifts}</p>
    <p>{props.now ? "速く近づくと後ずさり。ゆっくりなら注視や追従。" : "目と翼で応える、ゆったりした一対一の追従。回避ボタンでは距離を空ける。"} タップで翼を切替。矢印・Enter、左右へ誘うボタンでも操作できる。</p>
  </>;
}

export function letterPose(i: number, p: number, layout: string, now: boolean, gap: number) {
  const q = clamp((p - i * .065) / .55), ease = 1 - Math.pow(1 - q, 3);
  const x = 42 + i * (34 + gap), y = 122;
  if (!now) return layout === "spread" ? { x: x + (1 - ease) * (i - 2.5) * 60, y: y + (1 - ease) * (i % 2 ? 50 : -50), r: (1 - ease) * 120, q } : { x: x + (1 - ease) * (i % 2 ? 28 : -28), y: y - (1 - ease) * (100 + i * 5), r: (1 - ease) * (i % 2 ? 65 : -65), q };
  return layout === "spread" ? { x: 160 + (i - 2.5) * (18 + gap * 2 + ease * 22), y: y + Math.sin(i * 1.2) * 22 * (1 - ease), r: (i - 2.5) * (1 - ease) * 12, q }
    : { x, y: y - Math.sin(q * Math.PI) * (18 + i * 5), r: (1 - ease) * -15, q };
}
export function KineticTypography(props: StudyProps) {
  const [p, setP] = useProgress(props, 4), [layout, setLayout] = useState("rise"), [gap, setGap] = useState(0), [word, setWord] = useState("LISTEN");
  const text = props.now ? word : "MOTION";
  return <>
    <Surface label={`${text}、${layout}構成、進行${Math.round(p * 100)}%`}>
      <path d="M20 145H300" className="tnGhost" />
      {Array.from(text).map((c, i) => { const v = letterPose(i, p, layout, props.now, gap); return <g key={i} transform={`translate(${v.x} ${v.y}) rotate(${v.r})`} data-letter={i}><text className="tnLetter" textAnchor="middle">{c}</text><rect x="-10" y="26" width={20 * v.q} height="3" fill="var(--tn-accent)" /></g>; })}
      <text x="12" y="22" className="tnSvgLabel">{props.now ? (layout === "spread" ? "SPACE BETWEEN / 字間" : "LISTEN / 時間差") : "STAGGERED TITLE / 文字の入場"}</text>
    </Surface>
    <div className="tnControls"><button onClick={() => setP(0)}>先頭から</button><button onClick={() => { setLayout(l => l === "rise" ? "spread" : "rise"); setP(0); }}>演出を切替</button>{props.now && <button onClick={() => { setWord(w => w === "LISTEN" ? "EXPAND" : "LISTEN"); setLayout(l => l === "rise" ? "spread" : "rise"); setP(0); }}>言葉を切替</button>}</div>
    <Range label="時間位置 %" value={Math.round(p * 100)} onChange={v => setP(v / 100)} />
    {props.now && <Range label="文字の間隔" min={-4} max={8} value={gap} onChange={setGap} />}
    <p className="tnReadout" data-progress={p.toFixed(3)}>{text} ／ {layout} ／ 各文字の開始差 6.5% ／ 進行 {Math.round(p * 100)}%</p>
    <p>{props.now ? "LISTENは小さな時間差へ耳を澄ます構成。EXPANDは字間の拡大を意味と結ぶ。" : "文字を独立した役者として順に登場させる。ロゴの完成より、入場のリズムを楽しむ。"} 共通速度と時間位置で途中の文字を観察できる。</p>
  </>;
}
