"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { FlashExhibit, FlashVisualType } from "../data/flashExhibits";
import { refinedVisuals } from "./FlashRefinedVisuals";

type VisualProps = {
  exhibit: FlashExhibit;
  active: boolean;
  reduced: boolean;
};

const particleIndexes = Array.from({ length: 18 }, (_, index) => index);

function PartsVisual({ active, reduced }: VisualProps) {
  return (
    <div className="flashVisual flashVisual-parts" data-running={active && !reduced} role="group" aria-label="頭、胴体、腕、脚を別々に動かすパーツアニメーション">
      <div className="partsCharacter" aria-hidden="true">
        <span className="partHead"><i /></span><span className="partBody" />
        <span className="partArm partArmLeft" /><span className="partArm partArmRight" />
        <span className="partLeg partLegLeft" /><span className="partLeg partLegRight" />
      </div>
      <span className="visualStateLabel">6 SYMBOLS / OFFSET MOTION</span>
    </div>
  );
}

function SpringVisual({ active, reduced }: VisualProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const frame = useRef<number | null>(null);
  const render = () => {
    const { x, y } = position.current;
    if (ballRef.current) ballRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    if (lineRef.current) {
      lineRef.current.style.width = `${Math.hypot(x, y)}px`;
      lineRef.current.style.transform = `rotate(${Math.atan2(y, x)}rad)`;
    }
  };
  useEffect(() => {
    if (!active || reduced) return;
    const tick = () => {
      if (!dragging.current) {
        velocity.current.x = (velocity.current.x + -position.current.x * 0.075) * 0.88;
        velocity.current.y = (velocity.current.y + -position.current.y * 0.075) * 0.88;
        position.current.x += velocity.current.x;
        position.current.y += velocity.current.y;
        render();
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, [active, reduced]);
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current || !stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    position.current = {
      x: Math.max(-bounds.width * 0.38, Math.min(bounds.width * 0.38, event.clientX - bounds.left - bounds.width / 2)),
      y: Math.max(-bounds.height * 0.35, Math.min(bounds.height * 0.35, event.clientY - bounds.top - bounds.height / 2)),
    };
    velocity.current = { x: 0, y: 0 };
    render();
  };
  const reset = () => { position.current = { x: 0, y: 0 }; velocity.current = { x: 0, y: 0 }; render(); };
  return (
    <div ref={stageRef} className="flashVisual flashSpringVisual" data-running={active && !reduced} role="group" aria-label="球をドラッグして放すと中心へ戻るバネの再現">
      <span ref={lineRef} className="springLine" aria-hidden="true" />
      <span className="springAnchor" aria-hidden="true">ANCHOR</span>
      <button
        ref={ballRef}
        type="button"
        className="springBall"
        aria-label="バネにつながった球。ドラッグして放す"
        onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
        onPointerMove={move}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >DRAG</button>
      <button type="button" className="visualCornerButton" onClick={reset}>バネをリセット</button>
    </div>
  );
}

const initialTargets = [true, true, true, true];

function ShooterVisual() {
  const [targets, setTargets] = useState(initialTargets);
  const [score, setScore] = useState(0);
  const hit = (index: number) => {
    if (!targets[index]) return;
    setTargets((current) => current.map((visible, targetIndex) => targetIndex === index ? false : visible));
    setScore((current) => current + 100);
  };
  const reset = () => { setTargets(initialTargets); setScore(0); };
  return (
    <div className="flashVisual shooterVisual" role="group" aria-label="ターゲット命中時だけ得点が増えるクリック・シューター">
      <output className="shooterScore" aria-live="polite">SCORE {score}</output>
      <div className="shooterField">
        {targets.map((visible, index) => visible ? (
          <button key={index} type="button" className={`shooterTarget shooterTarget-${index}`} onClick={() => hit(index)} aria-label={`ターゲット${index + 1}を撃つ`}><span /></button>
        ) : <span key={index} className={`shooterBurst shooterTarget-${index}`} aria-hidden="true">HIT</span>)}
      </div>
      <button type="button" className="visualCornerButton" onClick={reset}>ゲームをリセット</button>
    </div>
  );
}

function FpsComparisonVisual({ active, reduced }: VisualProps) {
  const [fpsPlaying, setFpsPlaying] = useState(true);
  const running = active && fpsPlaying && !reduced;
  return (
    <div className="flashVisual fpsComparison" data-running={running} role="group" aria-label="12、24、30、60fpsを同時に比較する展示">
      {[12, 24, 30, 60].map((fps) => (
        <div className="fpsRow" key={fps}><span>{fps} FPS</span><i className={`fpsBall fpsBall-${fps}`} aria-hidden="true" /></div>
      ))}
      <span className="visualStateLabel">SAME DISTANCE / SAME DURATION / DIFFERENT STEPS</span>
      <button type="button" className="fpsPauseButton" aria-pressed={!fpsPlaying} onClick={() => setFpsPlaying((value) => !value)}>{fpsPlaying ? "比較を一時停止" : "比較を再生"}</button>
    </div>
  );
}

type AudioEngine = {
  context: AudioContext;
  oscillator: OscillatorNode;
  analyser: AnalyserNode;
  gain: GainNode;
  data: Uint8Array<ArrayBuffer>;
};

function AudioVisual({ exhibit, active, reduced }: VisualProps) {
  const [started, setStarted] = useState(false);
  const engineRef = useRef<AudioEngine | null>(null);
  const frameRef = useRef<number | null>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const stop = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const engine = engineRef.current;
    if (engine) {
      try { engine.oscillator.stop(); } catch {}
      void engine.context.close();
    }
    engineRef.current = null;
    setStarted(false);
  };
  const start = () => {
    if (engineRef.current) { stop(); return; }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gain = context.createGain();
    analyser.fftSize = 64;
    oscillator.type = exhibit.visualType === "waveform" ? "triangle" : "sine";
    oscillator.frequency.value = exhibit.visualType === "beat" ? 110 : 164.81;
    gain.gain.value = 0.035;
    oscillator.connect(analyser);
    analyser.connect(gain).connect(context.destination);
    oscillator.start();
    engineRef.current = { context, oscillator, analyser, gain, data: new Uint8Array(analyser.frequencyBinCount) };
    setStarted(true);
  };
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (active && !reduced) void engine.context.resume();
    else void engine.context.suspend();
  }, [active, reduced, started]);
  useEffect(() => {
    if (!started || !active || reduced) return;
    const draw = () => {
      const engine = engineRef.current;
      const container = barsRef.current;
      if (!engine || !container) return;
      if (exhibit.visualType === "waveform") engine.analyser.getByteTimeDomainData(engine.data);
      else engine.analyser.getByteFrequencyData(engine.data);
      Array.from(container.children).forEach((child, index) => {
        const value = engine.data[index % engine.data.length] / 255;
        (child as HTMLElement).style.setProperty("--level", String(Math.max(0.08, value)));
      });
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); frameRef.current = null; };
  }, [active, exhibit.visualType, reduced, started]);
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const engine = engineRef.current;
    if (engine) { try { engine.oscillator.stop(); } catch {} void engine.context.close(); }
  }, []);
  const label = exhibit.visualType === "audio-bars" ? "周波数バー" : exhibit.visualType === "waveform" ? "時間波形" : "ビート光量";
  return (
    <div className={`flashVisual audioAnalyserVisual audioAnalyserVisual-${exhibit.visualType}`} data-running={started && active && !reduced} role="group" aria-label={`${label}をAnalyserNodeで表示する音連動展示`}>
      <div ref={barsRef} className="analyserDisplay" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>
      <output aria-live="polite" className="audioState">{started ? active && !reduced ? "AUDIO + ANALYSER RUNNING" : "AUDIO SUSPENDED" : "AUDIO OFF"}</output>
      <button type="button" className="visualCornerButton" onClick={start} aria-pressed={started}>{started ? "音を停止" : "音を開始"}</button>
    </div>
  );
}

type IntroStep = "idle" | "loading" | "logo" | "ready" | "complete";

function IntroVisual({ active, reduced }: VisualProps) {
  const [step, setStep] = useState<IntroStep>("idle");
  useEffect(() => {
    if (!active || reduced || (step !== "loading" && step !== "logo")) return;
    const timer = window.setTimeout(() => setStep(step === "loading" ? "logo" : "ready"), step === "loading" ? 900 : 1100);
    return () => window.clearTimeout(timer);
  }, [active, reduced, step]);
  useEffect(() => {
    if (step === "idle" || step === "complete") return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setStep("complete"); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [step]);
  return (
    <div className="flashVisual introVisual" data-step={step} data-running={active && !reduced} role="group" aria-label="LOADING、ロゴ、ENTER、完了画面を持つFlash風イントロ">
      <div className="introScreen" aria-live="polite">
        {step === "idle" ? <><strong>FLASH SITE 2002</strong><button type="button" onClick={() => setStep("loading")}>START</button></> : null}
        {step === "loading" ? <><strong>LOADING</strong><span className="introLoadingBar" /></> : null}
        {step === "logo" ? <strong className="introLogo">ORBITAL</strong> : null}
        {step === "ready" ? <><strong>WELCOME</strong><button type="button" onClick={() => setStep("complete")}>ENTER</button></> : null}
        {step === "complete" ? <><strong>INTRO COMPLETE</strong><button type="button" onClick={() => setStep("idle")}>REPLAY</button></> : null}
      </div>
      {step !== "idle" && step !== "complete" ? <button type="button" className="introSkip" onClick={() => setStep("complete")}>SKIP</button> : null}
    </div>
  );
}

function PortfolioVisual() {
  const [currentSlide, setCurrentSlide] = useState(0);
  return (
    <div className="flashVisual portfolioVisual" role="group" aria-label="番号で画面全体が移動するポートフォリオ">
      <div className="portfolioTrack" data-slide={currentSlide}>{[1, 2, 3].map((number) => <section key={number}><b>PROJECT {number}</b><span>0{number} / MOTION STUDY</span></section>)}</div>
      <div className="portfolioControls" aria-label="作品選択">{[0, 1, 2].map((index) => <button key={index} type="button" aria-current={currentSlide === index ? "true" : undefined} onClick={() => setCurrentSlide(index)}>{index + 1}</button>)}</div>
    </div>
  );
}

const rooms = ["LOBBY", "GALLERY", "LAB"];
function RoomNavigationVisual() {
  const [currentRoom, setCurrentRoom] = useState(0);
  return (
    <div className="flashVisual roomNavigationVisual" data-room={currentRoom} role="group" aria-label="左右のドアで部屋を移動するナビゲーション">
      <output aria-live="polite">CURRENT ROOM / {rooms[currentRoom]}</output>
      <div className="roomContents" aria-hidden="true"><span /><b>{rooms[currentRoom]}</b><span /></div>
      <button type="button" className="roomDoor roomDoorLeft" onClick={() => setCurrentRoom((room) => (room + rooms.length - 1) % rooms.length)} aria-label="左の部屋へ移動">← LEFT DOOR</button>
      <button type="button" className="roomDoor roomDoorRight" onClick={() => setCurrentRoom((room) => (room + 1) % rooms.length)} aria-label="右の部屋へ移動">RIGHT DOOR →</button>
    </div>
  );
}

function RadialMenuVisual() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flashVisual radialMenuVisual" data-open={menuOpen} role="group" aria-label="中央ボタンで開閉する放射メニュー">
      <button type="button" className="radialMenuCenter" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? "CLOSE" : "OPEN"}</button>
      {["HOME", "WORK", "INFO", "MAIL"].map((label, index) => <button key={label} type="button" className={`radialMenuItem radialMenuItem-${index}`} tabIndex={menuOpen ? 0 : -1}>{label}</button>)}
    </div>
  );
}

function TimelineVisual({ active, reduced }: VisualProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!active || reduced || !playing) return;
    const timer = window.setInterval(() => setCurrentFrame((frame) => (frame + 1) % 12), 180);
    return () => window.clearInterval(timer);
  }, [active, playing, reduced]);
  return (
    <div className="flashVisual interactiveTimeline" data-running={active && playing && !reduced} role="group" aria-label="選択可能な12フレームのキーフレーム・タイムライン">
      <div className="timelineFrames">{Array.from({ length: 12 }, (_, frame) => <button key={frame} type="button" aria-current={currentFrame === frame ? "true" : undefined} onClick={() => { setCurrentFrame(frame); setPlaying(false); }}>{frame + 1}</button>)}</div>
      <span className="timelineLinkedPlayhead" style={{ left: `${7 + currentFrame * 7.8}%` }} aria-hidden="true" />
      <output>SELECTED FRAME {currentFrame + 1}</output>
      <div className="timelineControls"><button type="button" onClick={() => setPlaying((value) => !value)} aria-pressed={!playing}>{playing ? "一時停止" : "再生"}</button><button type="button" onClick={() => { setCurrentFrame(0); setPlaying(false); }}>リセット</button></div>
    </div>
  );
}

const weatherNames = ["雨", "雪", "炎"];
function WeatherVisual({ active, reduced }: VisualProps) {
  const [selectedWeather, setSelectedWeather] = useState(0);
  return (
    <div className="flashVisual weatherVisual" data-weather={selectedWeather} data-running={active && !reduced} role="group" aria-label="雨、雪、炎を切り替える天候展示">
      <output aria-live="polite">WEATHER / {weatherNames[selectedWeather]}</output>
      <div className="weatherParticles" aria-hidden="true">{particleIndexes.slice(0, 14).map((index) => <i key={index} style={{ "--i": index } as CSSProperties} />)}</div>
      <button type="button" className="visualCornerButton" onClick={() => setSelectedWeather((weather) => (weather + 1) % weatherNames.length)}>天候を切り替える</button>
    </div>
  );
}

function PointerFollowVisual({ active, reduced }: VisualProps) {
  const dotsRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 130, y: 90 });
  const positions = useRef(Array.from({ length: 8 }, () => ({ x: 130, y: 90 })));
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (!active || reduced) return;
    const tick = () => {
      const dots = dotsRef.current?.children;
      positions.current.forEach((position, index) => {
        const leader = index === 0 ? target.current : positions.current[index - 1];
        position.x += (leader.x - position.x) * (index === 0 ? 0.22 : 0.34);
        position.y += (leader.y - position.y) * (index === 0 ? 0.22 : 0.34);
        const dot = dots?.item(index) as HTMLElement | null;
        if (dot) dot.style.transform = `translate(${position.x}px, ${position.y}px)`;
      });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, [active, reduced]);
  return (
    <div className="flashVisual pointerFollowVisual" data-running={active && !reduced} role="group" aria-label="先頭点から順に遅れて追従する慣性カーソル" onPointerMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); target.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; }}>
      <div ref={dotsRef} aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ opacity: 1 - index * 0.1 }} />)}</div>
      <span className="visualStateLabel">MOVE POINTER / RAF CHAIN</span>
    </div>
  );
}

function EyesVisual() {
  const eyesRef = useRef<HTMLDivElement>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const angle = Math.atan2(event.clientY - bounds.top - bounds.height / 2, event.clientX - bounds.left - bounds.width / 2);
    eyesRef.current?.style.setProperty("--pupil-x", `${Math.cos(angle) * 13}px`);
    eyesRef.current?.style.setProperty("--pupil-y", `${Math.sin(angle) * 13}px`);
  };
  return <div className="flashVisual boundedEyesVisual" role="group" aria-label="瞳が白目の範囲内でカーソル方向を見る視線追従" onPointerMove={move}><div ref={eyesRef} className="boundedEyes" aria-hidden="true"><i /><i /></div><span className="visualStateLabel">ANGLE + CLAMPED RADIUS</span></div>;
}

function ParallaxVisual() {
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--px", String(x));
    event.currentTarget.style.setProperty("--py", String(y));
  };
  return <div className="flashVisual layeredParallaxVisual" role="group" aria-label="背景、遠景、中景、前景が異なる距離で動くパララックス" onPointerMove={move}><span className="parallaxSky" /><span className="parallaxFar" /><span className="parallaxMid" /><span className="parallaxFront" /><em>BACKGROUND / FAR / MID / FRONT</em></div>;
}

function PaintVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = `hsl(${(event.clientX + event.clientY) % 360} 90% 65%)`;
    context.beginPath();
    context.arc(event.clientX - bounds.left, event.clientY - bounds.top, 7, 0, Math.PI * 2);
    context.fill();
  };
  const reset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height); context.restore();
  };
  return <div className="flashVisual paintVisual" role="group" aria-label="ドラッグで描ける高DPI対応Canvas"><canvas ref={canvasRef} onPointerDown={(event) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); draw(event); }} onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} aria-label="ドラッグして抽象画を描く" /><button type="button" className="visualCornerButton" onClick={reset}>描画をリセット</button></div>;
}

function CubeVisual() {
  const [rotation, setRotation] = useState({ x: -15, y: 25 });
  const previous = useRef<{ x: number; y: number } | null>(null);
  return <div className="flashVisual cubeVisual" role="group" aria-label="ドラッグで回転できる擬似3D立方体"><button type="button" className="cubeDragSurface" aria-label="立方体をドラッグして回転" onPointerDown={(event) => { previous.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!previous.current) return; const dx = event.clientX - previous.current.x; const dy = event.clientY - previous.current.y; previous.current = { x: event.clientX, y: event.clientY }; setRotation((value) => ({ x: value.x - dy * .5, y: value.y + dx * .5 })); }} onPointerUp={() => { previous.current = null; }} onPointerCancel={() => { previous.current = null; }}><span className="cssCube" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }} aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span></button><button type="button" className="visualCornerButton" onClick={() => setRotation({ x: -15, y: 25 })}>回転をリセット</button></div>;
}

function CarouselVisual() {
  const [currentSlide, setCurrentSlide] = useState(0);
  return <div className="flashVisual carouselVisual" role="group" aria-label="前へ・次へで回転する3Dカルーセル"><div className="carouselCards" data-slide={currentSlide} aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <i key={index} className={`carouselCard carouselCard-${index}`}>{index + 1}</i>)}</div><output>SELECTED CARD {currentSlide + 1}</output><div className="carouselButtons"><button type="button" onClick={() => setCurrentSlide((slide) => (slide + 4) % 5)} aria-label="前のカード">←</button><button type="button" onClick={() => setCurrentSlide((slide) => (slide + 1) % 5)} aria-label="次のカード">→</button></div></div>;
}

function ParticleVisual() {
  const [burst, setBurst] = useState(false);
  return <div className="flashVisual dedicatedParticleVisual" data-burst={burst} role="group" aria-label="中心から光粒子を噴出する展示"><div aria-hidden="true">{particleIndexes.map((index) => <i key={index} style={{ "--i": index } as CSSProperties} />)}</div><button type="button" className="visualCornerButton" onClick={() => setBurst((value) => !value)}>粒子を{burst ? "集める" : "噴出"}</button></div>;
}

function SlotVisual() {
  const [spin, setSpin] = useState(0);
  return <div className="flashVisual slotVisual" data-spin={spin % 3} role="group" aria-label="ボタンで絵柄が切り替わるバナー内スロット"><div aria-hidden="true"><i>{["★", "7", "◆"][spin % 3]}</i><i>{["7", "◆", "★"][(spin + 1) % 3]}</i><i>{["◆", "★", "7"][(spin + 2) % 3]}</i></div><button type="button" className="visualCornerButton" onClick={() => setSpin((value) => value + 1)}>SPIN</button></div>;
}

function SafeCloseVisual() {
  const [position, setPosition] = useState(0);
  const [closed, setClosed] = useState(false);
  if (closed) return <div className="flashVisual safeCloseVisual safeCloseComplete" role="status"><strong>ADVERTISEMENT CLOSED</strong><button type="button" onClick={() => { setClosed(false); setPosition(0); }}>再表示</button></div>;
  return <div className="flashVisual safeCloseVisual" data-position={position} role="group" aria-label="逃げる閉じるボタンの安全な再現"><span>DEMO ADVERTISEMENT</span><button type="button" className="escapingClose" onPointerEnter={() => setPosition((value) => (value + 1) % 4)} onFocus={() => setPosition((value) => (value + 1) % 4)} onClick={() => setClosed(true)} aria-label="動く閉じるボタン">×</button><button type="button" className="fixedSafeExit" onClick={() => setClosed(true)}>即時終了</button></div>;
}

function GenericVisual({ exhibit, active, reduced }: VisualProps) {
  const [variant, setVariant] = useState(0);
  const pointerStyle = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
    event.currentTarget.style.setProperty("--rx", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -28}deg`);
    event.currentTarget.style.setProperty("--ry", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 38}deg`);
  };
  return (
    <div className={`flashVisual flashVisual-${exhibit.visualType}`} data-running={active && !reduced} data-variant={variant % 4} onPointerMove={pointerStyle} role="group" tabIndex={exhibit.interactionType === "hover" || exhibit.interactionType === "pointer" ? 0 : undefined} aria-label={`${exhibit.title}の現代Web技術による再現`}>
      <div className="flashScene" aria-hidden="true">{Array.from({ length: exhibit.visualType === "starfield" ? 18 : 9 }, (_, index) => <i key={index} style={{ "--i": index } as CSSProperties} />)}<b>FLASH</b><strong>PLAY</strong><em>{exhibit.title}</em></div>
      {exhibit.interactionType === "click" ? <button type="button" className="visualCornerButton" onClick={() => setVariant((value) => value + 1)}>変化させる</button> : null}
    </div>
  );
}

const dedicated: Partial<Record<FlashVisualType, (props: VisualProps) => React.ReactNode>> = {
  parts: PartsVisual,
  spring: SpringVisual,
  shooter: ShooterVisual,
  fps: FpsComparisonVisual,
  "audio-bars": AudioVisual,
  waveform: AudioVisual,
  intro: IntroVisual,
  portfolio: PortfolioVisual,
  room: RoomNavigationVisual,
  "radial-menu": RadialMenuVisual,
  timeline: TimelineVisual,
  weather: WeatherVisual,
  follow: PointerFollowVisual,
  eyes: EyesVisual,
  parallax: ParallaxVisual,
  paint: PaintVisual,
  cube: CubeVisual,
  carousel: CarouselVisual,
  particles: ParticleVisual,
  slot: SlotVisual,
  "safe-close": SafeCloseVisual,
};

export function FlashVisual(props: VisualProps) {
  const Dedicated = refinedVisuals[props.exhibit.visualType] ?? dedicated[props.exhibit.visualType];
  return Dedicated ? <Dedicated {...props} /> : <GenericVisual {...props} />;
}
