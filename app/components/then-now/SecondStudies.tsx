"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { clamp, Range, Surface, useFrame, type StudyProps } from "./runtime";

export type Ball = { x: number; y: number; vx: number; vy: number; held: boolean };
export type Rules = { gravity: number; bounce: number; friction: number };
export const initialBalls = (now: boolean): Ball[] => [{ x: 92, y: 75, vx: 65, vy: 0, held: false }, ...(now ? [{ x: 228, y: 100, vx: -65, vy: 0, held: false }] : [])];
export function stepPhysics(input: Ball[], seconds: number, rules: Rules) {
  const balls = input.map(b => ({ ...b })), bounded = clamp(seconds, 0, .1), steps = Math.max(1, Math.ceil(bounded / (1 / 120))), dt = bounded / steps;
  for (let step = 0; step < steps; step++) {
    for (const b of balls) {
      if (b.held) continue;
      b.vy = clamp(b.vy + rules.gravity * dt, -600, 600);
      const drag = Math.exp(-rules.friction * dt); b.vx *= drag; b.vy *= drag;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 20 || b.x > 300) { b.x = clamp(b.x, 20, 300); b.vx *= -rules.bounce; }
      if (b.y < 46 || b.y > 188) { b.y = clamp(b.y, 46, 188); b.vy *= -rules.bounce; if (Math.abs(b.vy) < 3) b.vy = 0; }
    }
    if (balls.length === 2) {
      const [a, b] = balls, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 36) {
        const nx = d > .001 ? dx / d : 1, ny = d > .001 ? dy / d : 0, invA = a.held ? 0 : 1, invB = b.held ? 0 : 1, sum = invA + invB;
        if (sum) {
          const overlap = 36 - d; a.x -= nx * overlap * invA / sum; a.y -= ny * overlap * invA / sum; b.x += nx * overlap * invB / sum; b.y += ny * overlap * invB / sum;
          const velocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (velocity < 0) { const impulse = -(1 + rules.bounce) * velocity / sum; a.vx -= impulse * nx * invA; a.vy -= impulse * ny * invA; b.vx += impulse * nx * invB; b.vy += impulse * ny * invB; }
        }
      }
    }
    for (const b of balls) { b.x = clamp(b.x, 20, 300); b.y = clamp(b.y, 46, 188); b.vx = clamp(b.vx, -600, 600); b.vy = clamp(b.vy, -600, 600); }
  }
  return balls;
}

export function PhysicsPlayground(props: StudyProps) {
  const [balls, setBalls] = useState(() => initialBalls(props.now)), [gravity, setGravity] = useState(240), [bounce, setBounce] = useState(.8), [friction, setFriction] = useState(.15);
  const drag = useRef<{ index: number; pointerId: number; target: SVGCircleElement; x: number; y: number; time: number } | null>(null);
  const release = useCallback((cancel = true, pointerId?: number, index?: number) => {
    const current = drag.current;
    if (!current || (pointerId !== undefined && current.pointerId !== pointerId) || (index !== undefined && current.index !== index)) return;
    // Invalidate ownership before releasePointerCapture can dispatch capture loss.
    drag.current = null;
    setBalls(b => b.map((v, i) => i === current.index ? { ...v, held: false, vx: cancel ? 0 : v.vx, vy: cancel ? 0 : v.vy } : v));
    if (current.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId);
  }, []);
  // A pause/visibility transition and unmount finish both halves of ownership.
  // Layout cleanup runs before paint and before any resumed frame can step.
  useLayoutEffect(() => () => release(true), [props.active, release]);
  useEffect(() => {
    const blur = () => release(true);
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, [release]);
  const advance = (dt: number) => setBalls(b => stepPhysics(b, dt, { gravity, bounce, friction }));
  useFrame(props.active && !props.reduced, dt => advance(dt * props.speed));
  const move = (e: PointerEvent<SVGCircleElement>, i: number) => {
    if (drag.current?.index !== i || drag.current.pointerId !== e.pointerId || drag.current.target !== e.currentTarget) return;
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect(), x = clamp((e.clientX - box.left) / box.width * 320, 20, 300), y = clamp((e.clientY - box.top) / box.height * 220, 46, 188);
    const dt = Math.max(.016, (e.timeStamp - drag.current.time) / 1000), vx = clamp((x - drag.current.x) / dt, -400, 400), vy = clamp((y - drag.current.y) / dt, -400, 400);
    drag.current = { ...drag.current, x, y, time: e.timeStamp }; setBalls(b => b.map((v, index) => index === i ? { x, y, vx, vy, held: true } : v));
  };
  const energy = balls.reduce((sum, b) => sum + (b.vx * b.vx + b.vy * b.vy) / 2 + gravity * (188 - b.y), 0);
  return <>
    <svg className="tnSurface tnPointer" viewBox="0 0 320 220" role="group" aria-label="有界の物理遊具。球はドラッグ、矢印で移動、Spaceで打ち上げ">
      <path d="M2 28H318V207H2ZM2 207l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14m0 14l16-14" className="tnGhost" />
      {balls.map((b, i) => <g key={i}><line className="tnVelocity" x1={b.x} y1={b.y} x2={b.x + b.vx / 6} y2={b.y + b.vy / 6} /><circle data-ball={i} data-x={b.x.toFixed(2)} data-y={b.y.toFixed(2)} data-held={b.held} cx={b.x} cy={b.y} r="18" className={i ? "tnBall tnBallOther" : "tnBall"} tabIndex={0} role="button" aria-label={`球${i + 1}を操作`} onPointerDown={e => { e.preventDefault(); if (drag.current) return; e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { index: i, pointerId: e.pointerId, target: e.currentTarget, x: b.x, y: b.y, time: e.timeStamp }; setBalls(v => v.map((ball, n) => n === i ? { ...ball, held: true, vx: 0, vy: 0 } : ball)); }} onPointerMove={e => move(e, i)} onPointerCancel={e => release(true, e.pointerId, i)} onPointerUp={e => release(false, e.pointerId, i)} onLostPointerCapture={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) release(true, e.pointerId, i); }} onBlur={() => release(true, undefined, i)} onKeyDown={e => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); release(true, undefined, i); setBalls(v => v.map((ball, n) => n === i ? { ...ball, x: clamp(ball.x + (e.key === "ArrowLeft" ? -12 : e.key === "ArrowRight" ? 12 : 0), 20, 300), y: clamp(ball.y + (e.key === "ArrowUp" ? -12 : e.key === "ArrowDown" ? 12 : 0), 46, 188), vx: 0, vy: e.key === " " || e.key === "Enter" ? -250 : 0, held: false } : ball)); }
      }} /><text x={b.x} y={b.y + 4} textAnchor="middle" className="tnBallNumber" pointerEvents="none">{i + 1}</text></g>)}
      <text x="12" y="19" className="tnSvgLabel">{props.now ? "TWO BODIES / COLLISION" : "ONE BODY / BOUNCE"}</text>
    </svg>
    <div className="tnControls"><button onClick={() => advance(1 / 30)}>1刻み進む</button><button onClick={() => { release(true); setBalls(initialBalls(props.now)); }}>球を戻す</button><button onClick={() => { release(true); setBalls(v => v.map(b => ({ ...b, vx: -b.vx, vy: -250, held: false }))); }}>打ち上げ</button></div>
    <Range label="重力" max={600} step={20} value={gravity} onChange={setGravity} /><Range label="反発係数" max={1} step={.05} value={bounce} onChange={setBounce} /><Range label="摩擦" max={2} step={.05} value={friction} onChange={setFriction} />
    <p className="tnReadout" data-energy={energy.toFixed(0)}>速度 {balls.map(b => Math.hypot(b.vx, b.vy).toFixed(0)).join(" / ")} ／ E={energy.toFixed(0)}（任意単位）</p>
    <p>矢印で球を配置、Spaceで打上げ。線は速度ベクトル。{props.now ? "同質量の二体は、衝突方向の速度を交換する。" : "単体が壁と床で反発する、小さな運動の舞台。"} 停止・動き低減中も1刻みで追える。</p>
  </>;
}

export type IntroState = { scene: number; route: "lines" | "dots"; elapsed: number };
export function introNext(state: IntroState): IntroState { return { ...state, scene: Math.min(4, state.scene + 1), elapsed: 0 }; }
const sceneNames = ["入口", "線を開く", "構図を選ぶ", "タイトルを刻む", "本編：観測室"];
export function InteractiveIntro(props: StudyProps) {
  const [state, setState] = useState<IntroState>({ scene: 0, route: "lines", elapsed: 0 });
  useFrame(props.active && !props.reduced && !props.now && (state.scene === 1 || state.scene === 3), dt => setState(s => s.elapsed + dt * props.speed >= 1.3 ? introNext(s) : { ...s, elapsed: s.elapsed + dt * props.speed }));
  const p = clamp(state.elapsed / 1.3), next = () => setState(introNext);
  return <>
    <Surface label={`${sceneNames[state.scene]} / ${state.route}`}>
      {Array.from({ length: state.scene === 0 ? 0 : state.scene === 1 ? 2 : state.scene === 2 ? 4 : 6 }, (_, i) => state.route === "lines" ? <path key={i} d={`M${24 + i * 44} ${state.scene === 1 && !props.now ? 195 - p * 150 : 45}V195`} stroke="var(--tn-accent)" strokeWidth={state.scene === 4 ? 8 : 2} /> : <g key={i}><rect x={25 + i * 44} y={55 + (i % 3) * 32} width={state.scene === 4 ? 26 : 12} height={state.scene === 4 ? 26 : 12} fill="var(--tn-accent)" opacity=".8" /><path d={`M${31 + i * 44} 140V194`} className="tnGhost" /></g>)}
      <rect x="0" y="78" width="320" height="58" fill="#14101eee" />
      <text x="160" y="112" textAnchor="middle" className="tnIntroTitle">{state.scene === 4 ? "OBSERVATORY" : state.scene === 0 ? "ENTER / 01" : state.scene === 3 ? "LOOK CLOSER" : state.route === "lines" ? "DRAW A PATH" : "PLACE A SIGNAL"}</text>
      <text x="12" y="22" className="tnSvgLabel">SCENE {state.scene} / 4 {state.scene === 4 ? "COMPLETE" : props.now ? "INPUT DRIVEN" : "TIMELINE"}</text>
    </Surface>
    <div className="tnControls"><button disabled={state.scene === 4} onClick={next}>{state.scene === 0 ? "Introを始める" : state.scene === 3 ? "本編へ入る" : "次のシーン"}</button><button disabled={state.scene === 4} onClick={() => setState(s => ({ ...s, scene: 4, elapsed: 0 }))}>Skip Intro</button><button onClick={() => setState({ scene: 0, route: "lines", elapsed: 0 })}>Replay</button></div>
    <div className="tnControls" aria-label="途中分岐"><button disabled={state.scene === 0 || state.scene === 4} aria-pressed={state.route === "lines"} onClick={() => setState(s => ({ ...s, route: "lines", scene: 2, elapsed: 0 }))}>線の道</button><button disabled={state.scene === 0 || state.scene === 4} aria-pressed={state.route === "dots"} onClick={() => setState(s => ({ ...s, route: "dots", scene: 2, elapsed: 0 }))}>点の道</button></div>
    <p className="tnReadout" data-scene={state.scene} data-route={state.route}>{sceneNames[state.scene]} ／ 選択 {state.route} ／ {state.scene === 4 ? "終了・操作可能な本編" : props.now ? "次の入力を待つ" : state.scene === 2 ? "分岐を選び、次のシーンへ" : "共通再生で定時進行・次のシーンで手動送り"}</p>
    {state.scene === 4 && <div className="tnControls"><button onClick={() => setState(s => ({ ...s, route: s.route === "lines" ? "dots" : "lines" }))}>本編の構図を切替</button></div>}
    <p>{props.now ? "操作を待つ間も、選んだ幾何が舞台に残る。順序と構図を利用者が決める。" : "短い定時シーンの間と、分岐で待つ間を組み合わせる。"} Skipは今の選択を本編へ持ち越し、Replayは入口へ戻る。</p>
  </>;
}

type Engine = { context: AudioContext; oscillator: OscillatorNode; gain: GainNode; analyser: AnalyserNode; wave: Uint8Array<ArrayBuffer>; bins: Uint8Array<ArrayBuffer> };
const emptyReading = { rms: 0, bands: Array<number>(8).fill(0), wave: Array<number>(64).fill(0), peak: 0 };
export function SoundReactor(props: StudyProps) {
  const engine = useRef<Engine | null>(null), generation = useRef(0), sampleTime = useRef(0);
  const [status, setStatus] = useState("停止・無音"), [frequency, setFrequency] = useState(220), [volume, setVolume] = useState(4), [muted, setMuted] = useState(false), [reading, setReading] = useState(emptyReading);
  const [wasActive, setWasActive] = useState(props.active);
  if (wasActive !== props.active) { setWasActive(props.active); if (!props.active) { setStatus("停止・無音"); setReading(emptyReading); } }
  const dispose = useCallback(() => { generation.current++; const e = engine.current; engine.current = null; if (e) { try { e.oscillator.stop(); } catch {} e.oscillator.disconnect(); e.gain.disconnect(); e.analyser.disconnect(); void e.context.close().catch(() => {}); } }, []);
  const stop = () => { dispose(); setStatus("停止・無音"); setReading(emptyReading); };
  useEffect(() => { if (!props.active) dispose(); return dispose; }, [props.active, dispose]);
  const start = async () => {
    dispose(); setReading(emptyReading); setStatus("音声開始を確認中");
    if (!props.active) { setStatus("共通の「両方を開始」を押してから音を開始してください"); return; }
    if (!window.AudioContext) { setStatus("音声を利用できません：Web Audio APIなし"); return; }
    const token = generation.current;
    let created: AudioContext | null = null;
    try {
      const context = new AudioContext(); created = context;
      const oscillator = context.createOscillator(), gain = context.createGain(), analyser = context.createAnalyser();
      analyser.fftSize = 2048; analyser.minDecibels = -90; analyser.maxDecibels = -12; analyser.smoothingTimeConstant = .25;
      oscillator.type = "triangle"; oscillator.frequency.value = frequency; gain.gain.value = muted ? 0 : volume / 100;
      oscillator.connect(gain); gain.connect(analyser); analyser.connect(context.destination);
      engine.current = { context, oscillator, gain, analyser, wave: new Uint8Array(analyser.fftSize), bins: new Uint8Array(analyser.frequencyBinCount) };
      oscillator.start(); await context.resume();
      if (token !== generation.current) return;
      if (context.state !== "running") throw Error("AudioContextがrunningになりませんでした");
      setStatus("合成音を解析中");
    } catch { if (token === generation.current) { dispose(); if (created && created.state !== "closed") void created.close().catch(() => {}); setStatus("音声を利用できません：開始が拒否されました"); } }
  };
  useEffect(() => { const e = engine.current; if (e) { e.oscillator.frequency.setValueAtTime(frequency, e.context.currentTime); e.gain.gain.setValueAtTime(muted ? 0 : volume / 100, e.context.currentTime); } }, [frequency, volume, muted]);
  useFrame(props.active && status === "合成音を解析中", dt => {
    sampleTime.current += dt; if (sampleTime.current < .08) return; sampleTime.current = 0;
    const e = engine.current; if (!e || e.context.state !== "running") return;
    e.analyser.getByteFrequencyData(e.bins); e.analyser.getByteTimeDomainData(e.wave);
    const bounds = [0, 110, 220, 440, 880, 1760, 3520, 7040, e.context.sampleRate / 2];
    const bands = bounds.slice(0, -1).map((low, i) => { const start = Math.floor(low / (e.context.sampleRate / e.analyser.fftSize)), end = Math.min(e.bins.length, Math.ceil(bounds[i + 1] / (e.context.sampleRate / e.analyser.fftSize))); let peak = 0; for (let bin = start; bin < end; bin++) peak = Math.max(peak, e.bins[bin]); return peak / 255; });
    let power = 0; for (const v of e.wave) power += ((v - 128) / 128) ** 2;
    const peak = bands.indexOf(Math.max(...bands));
    setReading({ rms: Math.sqrt(power / e.wave.length), bands, wave: Array.from({ length: 64 }, (_, i) => (e.wave[i * 16] - 128) / 128), peak });
  });
  const live = props.active && status === "合成音を解析中", values = live ? reading : emptyReading;
  return <>
    <Surface label={`音の実解析：RMS ${values.rms.toFixed(3)}、最大帯域${values.peak + 1}`}>
      {props.now ? values.bands.map((v, i) => <g key={i}><path d={`M${15 + i * 37} 190V${180 - v * 120}l12 -12l12 12V190Z`} fill="var(--tn-accent)" fillOpacity={.2 + v * .7} stroke="var(--tn-accent)" /><text x={27 + i * 37} y="207" textAnchor="middle" className="tnPointLabel">{i + 1}</text></g>) : <><polyline points={values.wave.map((v, i) => `${i * 5},${85 - v * 700}`).join(" ")} fill="none" stroke="var(--tn-accent)" strokeWidth="2" />{values.bands.map((v, i) => <rect key={i} x={16 + i * 37} y={185 - v * 68} width="22" height={Math.max(1, v * 68)} fill="var(--tn-accent)" />)}</>}
      <text x="12" y="22" className="tnSvgLabel">{props.now ? "FREQUENCY ARCHITECTURE" : "WAVE / SPECTRUM"}</text>
    </Surface>
    <div className="tnControls"><button onClick={() => void start()}>音を開始</button><button onClick={stop}>音を停止</button><button aria-pressed={muted} onClick={() => setMuted(v => !v)}>{muted ? "ミュート解除" : "ミュート"}</button></div>
    <Range label="音高 Hz" min={110} max={1760} step={110} value={frequency} onChange={setFrequency} /><Range label="音量 %" max={8} value={volume} onChange={setVolume} />
    <p className="tnReadout" data-rms={values.rms.toFixed(4)} data-peak={values.peak} data-audio={live ? "running" : "silent"}>{props.active ? status : "停止・再開は明示操作"} ／ {muted || volume === 0 ? "無音" : `${frequency}Hz`} ／ RMS {values.rms.toFixed(4)} ／ 帯域 {values.peak + 1}</p>
    <p>{props.now ? "1〜8の低→高帯域が、左→右の屋根の高さへ。" : "上段は実時間波形、下段は低→高の8帯域。"} 音量は高さ、音高は主に位置を変える。RMSは実測振幅の近似。三角波は倍音を含む。ミュートは解析前の音量を0にする。音API不可時は架空の解析を表示しない。</p>
  </>;
}
