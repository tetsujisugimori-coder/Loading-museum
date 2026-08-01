"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { FlashExhibit, FlashVisualType } from "../data/flashExhibits";

export type RefinedVisualProps = {
  exhibit: FlashExhibit;
  active: boolean;
  reduced: boolean;
};

type Pose = {
  label: string;
  headX: number;
  headY: number;
  body: number;
  frontArm: number;
  backArm: number;
  frontLeg: number;
  backLeg: number;
  lift: number;
  turn: number;
};

export const characterPoses: Pose[] = [
  { label: "CROUCH", headX: -4, headY: 12, body: 18, frontArm: 62, backArm: -42, frontLeg: 55, backLeg: -48, lift: 14, turn: 0 },
  { label: "PUSH", headX: 4, headY: 3, body: -12, frontArm: -58, backArm: 48, frontLeg: -36, backLeg: 62, lift: 4, turn: 0 },
  { label: "LEAP", headX: 10, headY: -8, body: -25, frontArm: -105, backArm: 92, frontLeg: -72, backLeg: 40, lift: -22, turn: 0 },
  { label: "TURN", headX: 0, headY: -5, body: 4, frontArm: 125, backArm: -118, frontLeg: 72, backLeg: -68, lift: -28, turn: 1 },
  { label: "REACH", headX: -8, headY: -2, body: 20, frontArm: -132, backArm: -12, frontLeg: 30, backLeg: -82, lift: -14, turn: 1 },
  { label: "FALL", headX: -12, headY: 7, body: 48, frontArm: 75, backArm: -80, frontLeg: 104, backLeg: -28, lift: 2, turn: 1 },
  { label: "LAND", headX: 2, headY: 15, body: -8, frontArm: 35, backArm: -55, frontLeg: 78, backLeg: -74, lift: 13, turn: 0 },
  { label: "LOOK", headX: 12, headY: 0, body: 0, frontArm: -20, backArm: 24, frontLeg: 8, backLeg: -10, lift: 0, turn: 0 },
];

function poseStyle(pose: Pose): CSSProperties {
  return {
    "--pose-head-x": `${pose.headX}px`,
    "--pose-head-y": `${pose.headY}px`,
    "--pose-body": `${pose.body}deg`,
    "--pose-front-arm": `${pose.frontArm}deg`,
    "--pose-back-arm": `${pose.backArm}deg`,
    "--pose-front-leg": `${pose.frontLeg}deg`,
    "--pose-back-leg": `${pose.backLeg}deg`,
    "--pose-lift": `${pose.lift}px`,
    "--pose-turn": pose.turn,
  } as CSSProperties;
}

function PoseFigure({ pose, className = "" }: { pose: Pose; className?: string }) {
  return (
    <span className={`refinedPose ${className}`} style={poseStyle(pose)} aria-hidden="true">
      <i className="poseHead"><i /></i>
      <i className="poseBody" />
      <i className="poseLimb poseArm poseArmBack" />
      <i className="poseLimb poseArm poseArmFront" />
      <i className="poseLimb poseLeg poseLegBack" />
      <i className="poseLimb poseLeg poseLegFront" />
    </span>
  );
}

export function FrameByFrameVisual({ active, reduced }: RefinedVisualProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const running = active && playing && !reduced;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setCurrentFrame((frame) => (frame + 1) % characterPoses.length), 150);
    return () => window.clearInterval(timer);
  }, [running]);
  const selectFrame = (frame: number) => { setPlaying(false); setCurrentFrame((frame + characterPoses.length) % characterPoses.length); };
  return (
    <div className="flashVisual refinedFrameVisual" data-running={running} data-reduced={reduced} role="group" aria-label="8枚の異なる姿勢で跳躍と振り向きを描くフレーム・バイ・フレーム展示">
      <div className="refinedFrameStage"><PoseFigure pose={characterPoses[currentFrame]} /><span className="poseGround" /></div>
      <output className="refinedFrameOutput" aria-live="polite">FRAME {currentFrame + 1} / 8 — {characterPoses[currentFrame].label}</output>
      <div className="refinedFramePicker" aria-label="手動フレーム選択">
        {characterPoses.map((pose, index) => <button key={pose.label} type="button" aria-current={currentFrame === index ? "true" : undefined} disabled={running} onClick={() => selectFrame(index)}>{index + 1}</button>)}
      </div>
      <div className="refinedFrameControls">
        <button type="button" onClick={() => selectFrame(currentFrame - 1)} aria-label="前のフレーム">← 前</button>
        <button type="button" aria-pressed={!playing} onClick={() => setPlaying((value) => !value)}>{playing ? "手動で停止" : "自動再生"}</button>
        <button type="button" onClick={() => selectFrame(currentFrame + 1)} aria-label="次のフレーム">次 →</button>
      </div>
    </div>
  );
}

const logoLetters = "ORBITAL".split("");
export function LogoAssemblyVisual() {
  const [assembled, setAssembled] = useState(false);
  return (
    <div className="flashVisual logoAssemblyVisual" data-assembled={assembled} role="group" aria-label="ORBITALの7文字を別方向から集合・分解する架空ロゴ展示">
      <div className="logoAssemblyStage" aria-hidden="true">
        {logoLetters.map((letter, index) => <span key={`${letter}-${index}`} style={{ "--letter-index": index } as CSSProperties}>{letter}</span>)}
      </div>
      <output aria-live="polite">{assembled ? "LOGO ASSEMBLED / OUTLINE LOCKED" : "LETTERS DISPERSED"}</output>
      <div className="logoAssemblyControls">
        <button type="button" aria-pressed={assembled} onClick={() => setAssembled(true)}>集合</button>
        <button type="button" aria-pressed={!assembled} onClick={() => setAssembled(false)}>分解</button>
      </div>
    </div>
  );
}

type BeatEngine = { context: AudioContext; analyser: AnalyserNode; master: GainNode; data: Uint8Array<ArrayBuffer>; voices: Set<OscillatorNode> };
const bpmOptions = [72, 108, 144];

export function BeatSyncVisual({ active, reduced }: RefinedVisualProps) {
  const [started, setStarted] = useState(false);
  const [bpm, setBpm] = useState(108);
  const [beatCount, setBeatCount] = useState(0);
  const engineRef = useRef<BeatEngine | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLMeterElement>(null);
  const schedulerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const nextBeatRef = useRef(0);
  const peakedRef = useRef(false);

  const stop = () => {
    if (schedulerRef.current !== null) window.clearTimeout(schedulerRef.current);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    schedulerRef.current = null;
    frameRef.current = null;
    const engine = engineRef.current;
    if (engine) {
      engine.voices.forEach((voice) => { try { voice.stop(); } catch {} });
      void engine.context.close();
    }
    engineRef.current = null;
    setStarted(false);
    setBeatCount(0);
    if (stageRef.current) { stageRef.current.dataset.peak = "false"; stageRef.current.style.setProperty("--beat-level", "0"); }
  };

  const start = () => {
    if (engineRef.current) { stop(); return; }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    const master = context.createGain();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.35;
    master.gain.value = 0.055;
    analyser.connect(master).connect(context.destination);
    engineRef.current = { context, analyser, master, data: new Uint8Array(analyser.frequencyBinCount), voices: new Set() };
    nextBeatRef.current = context.currentTime + 0.08;
    setStarted(true);
  };

  useEffect(() => {
    const engine = engineRef.current;
    if (!started || !engine) return;
    if (!active) {
      if (engine.context.state !== "closed") void engine.context.suspend().catch(() => undefined);
      return;
    }
    if (engine.context.state !== "closed") void engine.context.resume().catch(() => undefined);
    nextBeatRef.current = Math.max(nextBeatRef.current, engine.context.currentTime + 0.05);
    const schedule = () => {
      const current = engineRef.current;
      if (!current) return;
      while (nextBeatRef.current < current.context.currentTime + 0.12) {
        const voice = current.context.createOscillator();
        const envelope = current.context.createGain();
        voice.type = "sine";
        voice.frequency.setValueAtTime(132, nextBeatRef.current);
        voice.frequency.exponentialRampToValueAtTime(54, nextBeatRef.current + 0.13);
        envelope.gain.setValueAtTime(0.0001, nextBeatRef.current);
        envelope.gain.exponentialRampToValueAtTime(0.9, nextBeatRef.current + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, nextBeatRef.current + 0.16);
        voice.connect(envelope).connect(current.analyser);
        current.voices.add(voice);
        voice.onended = () => current.voices.delete(voice);
        voice.start(nextBeatRef.current);
        voice.stop(nextBeatRef.current + 0.18);
        nextBeatRef.current += 60 / bpm;
      }
      schedulerRef.current = window.setTimeout(schedule, 25);
    };
    const analyse = () => {
      const current = engineRef.current;
      const stage = stageRef.current;
      if (!current || !stage) return;
      current.analyser.getByteFrequencyData(current.data);
      let total = 0;
      for (let index = 0; index < 10; index += 1) total += current.data[index];
      const level = total / 10 / 255;
      const peak = level > 0.06;
      stage.style.setProperty("--beat-level", level.toFixed(3));
      stage.dataset.peak = String(peak);
      if (meterRef.current) meterRef.current.value = level;
      if (peak && !peakedRef.current) setBeatCount((count) => count + 1);
      peakedRef.current = peak;
      frameRef.current = requestAnimationFrame(analyse);
    };
    schedule();
    frameRef.current = requestAnimationFrame(analyse);
    return () => {
      if (schedulerRef.current !== null) window.clearTimeout(schedulerRef.current);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      schedulerRef.current = null;
      frameRef.current = null;
      if (engine.context.state !== "closed") void engine.context.suspend().catch(() => undefined);
    };
  }, [active, bpm, started]);
  useEffect(() => () => {
    if (schedulerRef.current !== null) window.clearTimeout(schedulerRef.current);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const engine = engineRef.current;
    if (engine) { engine.voices.forEach((voice) => { try { voice.stop(); } catch {} }); void engine.context.close(); }
  }, []);

  return (
    <div ref={stageRef} className="flashVisual beatSyncVisual" data-running={started && active} data-peak="false" data-reduced={reduced} role="group" aria-label="短い合成音のピークだけに反応するビート同期展示">
      <div className="beatPulse" aria-hidden="true"><i /><b>BEAT</b></div>
      <meter ref={meterRef} min="0" max="1" defaultValue="0" aria-label="ビート強度" />
      <output aria-live="polite">{started ? `${bpm} BPM / PEAK ${beatCount}` : `${bpm} BPM / AUDIO OFF`}</output>
      <label>BPM<select value={bpm} onChange={(event) => { setBpm(Number(event.target.value)); const engine = engineRef.current; if (engine) nextBeatRef.current = engine.context.currentTime + 0.06; }}>
        {bpmOptions.map((value, index) => <option key={value} value={value}>{["低速", "中速", "高速"][index]} {value}</option>)}
      </select></label>
      <button type="button" className="visualCornerButton" aria-pressed={started} onClick={start}>{started ? "音を停止" : "音を開始"}</button>
    </div>
  );
}

export function BannerCtaVisual({ active, reduced }: RefinedVisualProps) {
  const [clicked, setClicked] = useState(false);
  return (
    <div className="flashVisual bannerCtaVisual" data-running={active && !reduced} data-reduced={reduced} role="group" aria-label="商品、コピー、価格、限定ラベル、CTAが順番に登場する資料用広告">
      <span className="adDisclosure">DEMO ADVERTISEMENT</span>
      <div className="adProduct" aria-hidden="true"><i /></div>
      <strong className="adCopy">MOVE THE FUTURE</strong>
      <b className="adPrice">¥1,980</b>
      <em className="adLimited">48 HOURS ONLY</em>
      <button type="button" className="adCta" onClick={() => setClicked(true)}>VIEW DEMO</button>
      <output aria-live="polite">{clicked ? "DEMO CLICKED — 外部遷移はありません" : "5 STEP TIMELINE"}</output>
    </div>
  );
}

const spriteSpeeds = { slow: 230, normal: 145, fast: 90 } as const;
export function SpriteRunVisual({ active, reduced }: RefinedVisualProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState<keyof typeof spriteSpeeds>("normal");
  const running = active && !reduced;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setCurrentFrame((frame) => (frame + 1) % characterPoses.length), spriteSpeeds[speed]);
    return () => window.clearInterval(timer);
  }, [running, speed]);
  return (
    <div className="flashVisual spriteRunVisual" data-running={running} data-speed={speed} role="group" aria-label="8姿勢の走者を固定し遠景と前景を逆向きへ流すスプライト走行">
      <div className="spriteSky" aria-hidden="true" /><div className="spriteFar" aria-hidden="true" /><div className="spriteFront" aria-hidden="true" />
      <PoseFigure pose={characterPoses[currentFrame]} className="spriteRunner" />
      <output aria-live="polite">RUN FRAME {currentFrame + 1} / 8 — {characterPoses[currentFrame].label}</output>
      <label>走行速度<select value={speed} onChange={(event) => setSpeed(event.target.value as keyof typeof spriteSpeeds)}><option value="slow">低速</option><option value="normal">標準</option><option value="fast">高速</option></select></label>
    </div>
  );
}

type Damage = { id: number; value: number; x: number; y: number; angle: number; size: number };
export function ComboDamageVisual({ reduced }: RefinedVisualProps) {
  const [combo, setCombo] = useState(0);
  const [damages, setDamages] = useState<Damage[]>([]);
  const nextId = useRef(1);
  const comboRef = useRef(0);
  const resetTimer = useRef<number | null>(null);
  const removalTimers = useRef(new Set<number>());
  const reset = () => { comboRef.current = 0; setCombo(0); setDamages([]); if (resetTimer.current !== null) window.clearTimeout(resetTimer.current); removalTimers.current.forEach(window.clearTimeout); removalTimers.current.clear(); };
  useEffect(() => () => { if (resetTimer.current !== null) window.clearTimeout(resetTimer.current); removalTimers.current.forEach(window.clearTimeout); }, []);
  const hit = () => {
    const id = nextId.current++;
    const nextCombo = comboRef.current + 1;
    comboRef.current = nextCombo;
    const damage = { id, value: 90 + (id * 37) % 111, x: 34 + (id * 29) % 34, y: 38 + (id * 17) % 22, angle: -12 + (id * 11) % 25, size: 17 + Math.min(12, nextCombo) };
    setCombo(nextCombo);
    setDamages((items) => [...items, damage]);
    const removal = window.setTimeout(() => { setDamages((items) => items.filter((item) => item.id !== id)); removalTimers.current.delete(removal); }, 1050);
    removalTimers.current.add(removal);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => { comboRef.current = 0; setCombo(0); }, 1700);
  };
  const milestone = combo >= 10 ? "ULTRA 10 COMBO" : combo >= 5 ? "POWER 5 COMBO" : "";
  return (
    <div className="flashVisual comboDamageVisual" data-reduced={reduced} data-combo-tier={combo >= 10 ? 3 : combo >= 5 ? 2 : combo > 0 ? 1 : 0} role="group" aria-label="HITごとに一意のダメージ数字を生成するコンボ展示">
      <div className="damageField" aria-hidden="true">{damages.map((damage) => <i key={damage.id} style={{ left: `${damage.x}%`, top: `${damage.y}%`, fontSize: `${damage.size}px`, transform: `rotate(${damage.angle}deg)` }}>{damage.value}</i>)}</div>
      <div className="comboGauge" aria-hidden="true"><i style={{ width: `${Math.min(100, combo * 10)}%` }} /></div>
      {combo > 0 ? <output aria-live="polite"><b>{combo} COMBO</b>{milestone ? <strong>{milestone}</strong> : null}</output> : <span className="comboIdle">PRESS HIT TO START</span>}
      <div className="comboControls"><button type="button" onClick={hit}>HIT</button><button type="button" onClick={reset}>リセット</button></div>
    </div>
  );
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

export function GenerativeLinesVisual() {
  const [seed, setSeed] = useState(2401);
  const [pointCount, setPointCount] = useState(18);
  const drawing = useMemo(() => {
    const random = seededRandom(seed);
    const points = Array.from({ length: pointCount }, () => ({ x: 18 + random() * 264, y: 14 + random() * 132 }));
    const lines: Array<{ a: number; b: number }> = [];
    points.forEach((point, a) => points.forEach((other, b) => { if (b <= a) return; if (Math.hypot(point.x - other.x, point.y - other.y) < 68) lines.push({ a, b }); }));
    return { points, lines };
  }, [pointCount, seed]);
  return (
    <div className="flashVisual generativeLinesVisual" role="group" aria-label="seedと接続距離から再現可能な線を生成するSVG展示">
      <svg viewBox="0 0 300 160" role="img" aria-label={`seed ${seed}、${pointCount}点、${drawing.lines.length}本の接続線`} preserveAspectRatio="xMidYMid meet">
        <g className="generatedLines">{drawing.lines.map((line) => <line key={`${line.a}-${line.b}`} x1={drawing.points[line.a].x} y1={drawing.points[line.a].y} x2={drawing.points[line.b].x} y2={drawing.points[line.b].y} />)}</g>
        <g className="generatedPoints">{drawing.points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="2.4" />)}</g>
      </svg>
      <output>SEED {seed} / POINTS {pointCount} / LINES {drawing.lines.length}</output>
      <label>点の数<input type="range" min="12" max="28" value={pointCount} onChange={(event) => setPointCount(Number(event.target.value))} /></label>
      <button type="button" className="visualCornerButton" onClick={() => setSeed((value) => value + 7919)}>再生成</button>
    </div>
  );
}

const poemWords = ["光", "記憶", "画面", "速度", "夜", "窓", "音", "影"];
const poemEndings = ["を抜けて、まだ見えない窓へ届く。", "のそばで、静かな速度を思い出す。", "がほどけると、夜の画面に道が生まれる。", "を選ぶたび、記憶の距離が少し変わる。"];
export function InteractivePoemVisual({ reduced }: RefinedVisualProps) {
  const [selected, setSelected] = useState(0);
  const [cycle, setCycle] = useState(0);
  const choose = (index: number) => { setSelected(index); setCycle((value) => value + 1); };
  const second = (selected + cycle + 3) % poemWords.length;
  const sentence = `${poemWords[selected]}は${poemWords[second]}${poemEndings[cycle % poemEndings.length]}`;
  return (
    <div className="flashVisual interactivePoemVisual" data-selected={selected} data-cycle={cycle % 4} data-reduced={reduced} role="group" aria-label="8つの言葉から短い一文と関係を再構成する詩">
      <div className="poemConstellation" aria-label="詩の言葉">
        {poemWords.map((word, index) => <button key={word} type="button" aria-pressed={selected === index} onClick={() => choose(index)} style={{ "--word-index": index } as CSSProperties}>{word}</button>)}
      </div>
      <span className="poemRelation" aria-hidden="true" />
      <output aria-live="polite">{sentence}</output>
    </div>
  );
}

type OnionRange = "previous" | "both" | "next";
export function OnionSkinVisual() {
  const [enabled, setEnabled] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(3);
  const [range, setRange] = useState<OnionRange>("both");
  const previous = (currentFrame + characterPoses.length - 1) % characterPoses.length;
  const next = (currentFrame + 1) % characterPoses.length;
  return (
    <div className="flashVisual refinedOnionVisual" data-enabled={enabled} data-range={range} role="group" aria-label="現在フレームと半透明の前後姿勢を比較するオニオンスキン制作補助展示">
      <div className="refinedOnionStage">
        <div className="onionLayer onionLayerPrevious"><span>PREV {previous + 1}</span><PoseFigure pose={characterPoses[previous]} /></div>
        <div className="onionLayer onionLayerCurrent"><span>CURRENT {currentFrame + 1}</span><PoseFigure pose={characterPoses[currentFrame]} /></div>
        <div className="onionLayer onionLayerNext"><span>NEXT {next + 1}</span><PoseFigure pose={characterPoses[next]} /></div>
      </div>
      <div className="onionFramePicker" aria-label="現在フレーム選択">{characterPoses.map((pose, index) => <button key={pose.label} type="button" aria-current={currentFrame === index ? "true" : undefined} onClick={() => setCurrentFrame(index)}>{index + 1}</button>)}</div>
      <div className="onionControls">
        <button type="button" aria-pressed={enabled} onClick={() => setEnabled((value) => !value)}>ONION {enabled ? "ON" : "OFF"}</button>
        <label>表示範囲<select value={range} onChange={(event) => setRange(event.target.value as OnionRange)}><option value="previous">前のみ</option><option value="both">前後</option><option value="next">次のみ</option></select></label>
      </div>
    </div>
  );
}

const comparisonRows = [
  ["制作単位", "タイムラインとシンボル", "DOM要素とkeyframes"],
  ["実行環境", "Flash Player", "ブラウザ標準"],
  ["コード", "タイムライン中心でも制作可", "CSSまたはJavaScript"],
  ["再利用性", "ライブラリシンボル", "コンポーネント・モジュール"],
  ["外部連携", "Player内部が中心", "DOM・URL・各種APIと連携"],
  ["アクセシビリティ", "制作者の個別対応", "意味のあるHTMLとARIA"],
  ["依存", "プラグインが必要", "複数ベンダーの標準機能"],
];

function ComparisonHeaders({ flash, modern }: { flash: string; modern: string }) {
  return <><section><h5>FLASH時代</h5><p>{flash}</p></section><section><h5>現代WEB</h5><p>{modern}</p></section></>;
}

export function MotionTweenComparisonVisual({ active, reduced }: RefinedVisualProps) {
  return (
    <div className="flashVisual inheritanceComparison motionInheritance" data-running={active && !reduced} role="group" aria-label="同じ動きをFlashタイムラインと現代Webで左右比較する展示">
      <div className="inheritanceDemos"><section><h5>FLASH時代</h5><span className="comparisonTimeline">●━━◆━━●</span><i aria-hidden="true" /></section><section><h5>現代WEB</h5><span className="comparisonCode">@keyframes move</span><i aria-hidden="true" /></section></div>
      <div className="comparisonTable" role="table" aria-label="モーショントゥイーンの比較項目">{comparisonRows.map(([axis, flash, modern]) => <div key={axis} role="row"><strong role="rowheader">{axis}</strong><span role="cell">{flash}</span><span role="cell">{modern}</span></div>)}</div>
      <p className="comparisonBalance">Flashは一つの制作環境へ統合され、現代Webはプラグイン不要の標準技術として外部ページと連携しやすい。</p>
    </div>
  );
}

export function PointerComparisonVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(15, Math.min(80, ((event.clientY - bounds.top) / bounds.height) * 100));
    stageRef.current?.style.setProperty("--compare-x", `${x}%`);
    stageRef.current?.style.setProperty("--compare-y", `${y}%`);
  };
  return (
    <div ref={stageRef} className="flashVisual inheritanceComparison pointerInheritance" role="group" tabIndex={0} aria-label="同じポインターへFlashと現代Webの表示が同時に追従する比較" onPointerMove={move}>
      <div className="inheritanceDemos"><section><h5>FLASH時代</h5><p>onMouseMove + enterFrame<br />Player内部の座標</p><i aria-hidden="true" /></section><section><h5>現代WEB</h5><p>Pointer Events + RAF<br />DOM / Canvas</p><i aria-hidden="true" /></section></div>
      <output>MOVE POINTER — BOTH SIDES RECEIVE THE SAME INPUT</output>
    </div>
  );
}

export function MediaComparisonVisual() {
  return (
    <div className="flashVisual inheritanceComparison mediaInheritance" role="group" aria-label="音と描画の統合環境と標準APIの組み合わせを比較する展示">
      <div className="inheritanceDemos"><ComparisonHeaders flash="SoundMixerとBitmapDataが制作環境・Player内でまとまり、音、絵、入力、ゲームを一体化しやすかった。" modern="Web Audio、Canvas、SVG、DOMを組み合わせ、モバイル、検索、アクセシビリティと接続する。" /></div>
      <div className="mediaPipelines" aria-hidden="true"><span>音 ━ SoundMixer ━ 描画</span><span>Web Audio ━ Analyser ━ Canvas / SVG</span></div>
      <div className="strengthColumns"><p><strong>FLASHの強み</strong>タイムライン中心で、デザイナーが一つの場所から制作できた。</p><p><strong>現代WEBの強み</strong>プラグイン不要で、標準APIを用途ごとに選び、複数ベンダーで実行できる。</p></div>
    </div>
  );
}

export const refinedVisuals: Partial<Record<FlashVisualType, (props: RefinedVisualProps) => React.ReactNode>> = {
  frames: FrameByFrameVisual,
  logo: LogoAssemblyVisual,
  beat: BeatSyncVisual,
  banner: BannerCtaVisual,
  sprite: SpriteRunVisual,
  score: ComboDamageVisual,
  generative: GenerativeLinesVisual,
  poem: InteractivePoemVisual,
  onion: OnionSkinVisual,
  "comparison-motion": MotionTweenComparisonVisual,
  "comparison-pointer": PointerComparisonVisual,
  "comparison-media": MediaComparisonVisual,
};
