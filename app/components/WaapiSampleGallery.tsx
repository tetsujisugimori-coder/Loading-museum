"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatAnimationCode,
  waapiSampleCount,
  waapiSamples,
  type SampleRenderKind,
  type WaapiSample,
} from "../data/waapiSamples";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const filterKeys = ["category", "usage", "sourceType", "era", "intensity", "difficulty"] as const;
type FilterKey = (typeof filterKeys)[number];
type Filters = Record<FilterKey, string>;

const blankFilters: Filters = { category: "", usage: "", sourceType: "", era: "", intensity: "", difficulty: "" };
const filterLabels: Record<FilterKey, string> = { category: "カテゴリ", usage: "用途", sourceType: "元ネタ種別", era: "年代", intensity: "動きの強さ", difficulty: "難易度" };

export function filterWaapiSamples(query: string, filters: Filters) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return waapiSamples.filter((sample) => {
    const searchText = [sample.name, sample.category, ...sample.usage, sample.era, sample.sourceType, sample.inspiredBy, sample.description, sample.suitableFor, sample.avoidFor, sample.difficulty, sample.intensity, ...sample.properties, ...sample.tags].join(" ").toLocaleLowerCase();
    return (!normalizedQuery || searchText.includes(normalizedQuery)) && filterKeys.every((key) => {
      const selected = filters[key];
      const value = sample[key];
      return !selected || (Array.isArray(value) ? value.includes(selected) : value === selected);
    });
  });
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(reducedMotionQuery);
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reducedMotion;
}

function PreviewArtwork({ kind }: { kind: SampleRenderKind }) {
  if (kind === "button") return <div className="waapiButtonObject" data-motion-target>PRESS</div>;
  if (kind === "modal") return <div className="waapiModalBackdrop"><div className="waapiModalObject" data-motion-target><i /><i /><b>OK</b></div></div>;
  if (kind === "toast") return <div className="waapiToastObject" data-motion-target><i />保存しました</div>;
  if (kind === "toggle") return <div className="waapiToggleTrack"><i data-motion-target /></div>;
  if (kind === "progress") return <div className="waapiProgressTrack"><i data-motion-target /></div>;
  if (kind === "typewriter") return <span className="waapiTypewriter" data-motion-target>LOADING MUSEUM</span>;
  if (kind === "characters") return <div className="waapiCharacters" aria-label="MOTION">{"MOTION".split("").map((letter, index) => <span data-motion-target aria-hidden="true" key={`${letter}-${index}`}>{letter}</span>)}</div>;
  if (kind === "counter") return <div className="waapiCounterWindow"><div className="waapiCounterColumn" data-motion-target>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <span key={digit}>{digit}</span>)}</div></div>;
  if (kind === "cursor") return <div className="waapiTerminalText">READY<span data-motion-target aria-hidden="true" /></div>;
  if (kind === "xp-segments") return <div className="waapiXpTrack"><div className="waapiXpSegments" data-motion-target>{[0, 1, 2, 3].map((item) => <i key={item} />)}</div></div>;
  if (kind === "orbit-dots") return <div className="waapiOrbitDots">{Array.from({ length: 8 }, (_, index) => <i key={index} data-motion-target style={{ "--dot-index": index } as React.CSSProperties} />)}</div>;
  if (kind === "watch") return <div className="waapiWatch"><i data-motion-target /><b /></div>;
  if (kind === "spinner-spokes") return <div className="waapiSpinnerSpokes">{Array.from({ length: 12 }, (_, index) => <i key={index} data-motion-target style={{ "--spoke-index": index } as React.CSSProperties} />)}</div>;
  if (kind === "dock") return <div className="waapiDock"><i data-motion-target>APP</i><b /></div>;
  if (kind === "geometry") return <div className="waapiGeometry">{[["-42px", "-30px", "-70deg"], ["44px", "-22px", "85deg"], ["-36px", "34px", "48deg"], ["40px", "30px", "-95deg"]].map(([x, y, r], index) => <i key={index} data-motion-target style={{ "--part-x": x, "--part-y": y, "--part-r": r } as React.CSSProperties} />)}</div>;
  if (kind === "damage") return <strong className="waapiDamageNumber" data-motion-target>-128</strong>;
  if (kind === "marquee") return <span className="waapiMarqueeText" data-motion-target>WELCOME TO MY HOMEPAGE ★ UNDER CONSTRUCTION</span>;
  return <div className="waapiBoxObject" data-motion-target><i /></div>;
}

function SamplePreview({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const [entered, setEntered] = useState(false);
  const isBidirectional = sample.render === "modal" || sample.render === "toast";

  const stop = useCallback(() => {
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
  }, []);

  const play = useCallback((forward = true) => {
    const stage = stageRef.current;
    if (!stage) return;
    stop();
    const motion = reducedMotion ? sample.reduced : sample.normal;
    const frames = forward ? motion.keyframes : [...motion.keyframes].reverse();
    const targets = Array.from(stage.querySelectorAll<HTMLElement>("[data-motion-target]"));
    if (sample.render === "marquee" && !reducedMotion && targets[0]) {
      const distance = -(stage.clientWidth + targets[0].offsetWidth);
      targets[0].style.setProperty("--marquee-distance", `${distance}px`);
    }
    animationsRef.current = targets.map((target, index) => target.animate(frames, {
      ...motion.options,
      delay: reducedMotion ? 0 : Number(motion.options.delay ?? 0) + index * (sample.stagger ?? 0),
    }));
    setEntered(forward);
  }, [reducedMotion, sample, stop]);

  useEffect(() => {
    if (active) play(true);
    else stop();
    return stop;
  }, [active, play, stop]);

  const toggle = () => play(!entered);
  return (
    <div className="waapiPreviewGroup">
      <div ref={stageRef} className={`waapiPreviewStage waapiPreviewStage--${sample.render}`} data-entered={entered}>
        <PreviewArtwork kind={sample.render} />
      </div>
      <div className="waapiPreviewControls">
        <button type="button" onClick={() => play(true)} aria-label={`${sample.name}を再生`}>Replay</button>
        {isBidirectional && <button type="button" onClick={toggle} aria-label={`${sample.name}を${entered ? "閉じる" : "開く"}`}>{entered ? "Close / Exit" : "Open / Enter"}</button>}
        {sample.render === "toggle" && <button type="button" aria-pressed={entered} onClick={toggle}>Switch {entered ? "OFF" : "ON"}</button>}
      </div>
    </div>
  );
}

function SampleCard({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const motion = reducedMotion ? sample.reduced : sample.normal;
  return (
    <article className="waapiSampleCard">
      <div className="waapiCardHeading"><p>{sample.category} / {sample.era} / {sample.sourceType}</p><h4>{sample.name}</h4></div>
      <SamplePreview sample={sample} active={active} reducedMotion={reducedMotion} />
      <p className="waapiDescription">{sample.description}</p>
      <p className="waapiInspired"><strong>参考にした動き:</strong> {sample.inspiredBy}</p>
      <dl className="waapiMeta">
        <div><dt>適する用途</dt><dd>{sample.suitableFor}</dd></div>
        <div><dt>避ける用途</dt><dd>{sample.avoidFor}</dd></div>
        <div><dt>CSS</dt><dd>{sample.properties.join(", ")}</dd></div>
        <div><dt>強さ / 難易度</dt><dd>{sample.intensity} / {sample.difficulty}</dd></div>
      </dl>
      <p className="waapiReduced">Reduced motion: 対応 — {sample.reducedMotionDescription}</p>
      <button type="button" className="waapiDetailsToggle" aria-expanded={detailsOpen} aria-controls={`${sample.id}-details`} onClick={() => setDetailsOpen((value) => !value)}>コードと解説を{detailsOpen ? "閉じる" : "見る"}</button>
      {detailsOpen && <div id={`${sample.id}-details`} className="waapiCodePanel">
        <p><strong>現在の表示:</strong> {reducedMotion ? "軽減表示" : "通常表示"}</p>
        <pre><code>{formatAnimationCode(sample, reducedMotion)}</code></pre>
        <dl><div><dt>duration</dt><dd>{String(motion.options.duration)}ms</dd></div><div><dt>easing</dt><dd>{String(motion.options.easing)}</dd></div><div><dt>iterations / fill</dt><dd>{String(motion.options.iterations)} / {String(motion.options.fill)}</dd></div></dl>
        <p><strong>何が起きるか:</strong> {motion.explanation}</p><p><strong>実装上の注意:</strong> {sample.avoidFor}では使用を避け、状態は文章でも伝えます。</p><p><strong>軽減時:</strong> {sample.reducedMotionDescription}</p>
      </div>}
    </article>
  );
}

type ConsoleReadout = { playState: AnimationPlayState | "unavailable"; currentTime: number; playbackRate: number; direction: "forward" | "reverse"; duration: number };
const consoleDuration = 1600;

function AnimationControlConsole({ reducedMotion }: { reducedMotion: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [message, setMessage] = useState("");
  const [readout, setReadout] = useState<ConsoleReadout>({ playState: "unavailable", currentTime: 0, playbackRate: 1, direction: "forward", duration: consoleDuration });

  const syncReadout = useCallback(() => {
    const animation = animationRef.current;
    if (!animation) return setReadout({ playState: "unavailable", currentTime: 0, playbackRate: 1, direction: "forward", duration: consoleDuration });
    const time = typeof animation.currentTime === "number" ? animation.currentTime : 0;
    setReadout({ playState: animation.playState, currentTime: Math.round(time), playbackRate: animation.playbackRate, direction: animation.playbackRate < 0 ? "reverse" : "forward", duration: consoleDuration });
  }, []);

  const createAnimation = useCallback((autoplay = false) => {
    const stage = stageRef.current;
    const target = targetRef.current;
    if (!stage || !target) return null;
    animationRef.current?.cancel();
    const distance = Math.max(0, stage.clientWidth - target.offsetWidth - 16);
    const animation = target.animate([{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }], { duration: consoleDuration, easing: "ease-in-out", iterations: 1, fill: "both" });
    if (!autoplay) animation.pause();
    animationRef.current = animation;
    syncReadout();
    return animation;
  }, [syncReadout]);

  useEffect(() => {
    createAnimation(!reducedMotion);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => createAnimation(false));
    if (stageRef.current) observer?.observe(stageRef.current);
    const timer = window.setInterval(syncReadout, 120);
    return () => { observer?.disconnect(); window.clearInterval(timer); animationRef.current?.cancel(); };
  }, [createAnimation, reducedMotion, syncReadout]);

  const safely = (operation: (animation: Animation) => void) => {
    try {
      const animation = animationRef.current ?? createAnimation(false);
      if (!animation) return;
      operation(animation);
      setMessage("");
      syncReadout();
    } catch (error) {
      setMessage(`操作を実行できませんでした: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const setRate = (rate: number) => safely((animation) => { animation.updatePlaybackRate(rate); });
  const seek = (time: number) => safely((animation) => { animation.currentTime = time; });

  return (
    <section className="waapiConsole" aria-label="Animation Control Console">
      <div className="waapiConsoleIntro"><p>ADVANCED / WAAPI CONTROL</p><h3>Animation Control Console</h3><p>有限のアニメーションを実値で操作します。</p>{reducedMotion && <p className="waapiConsoleNotice">軽減表示中のため自動再生を停止しています。手動操作は可能です。</p>}</div>
      <div ref={stageRef} className="waapiConsoleStage"><div ref={targetRef} /></div>
      <dl className="waapiConsoleReadout"><div><dt>playState</dt><dd>{readout.playState}</dd></div><div><dt>currentTime</dt><dd>{readout.currentTime}ms</dd></div><div><dt>playbackRate</dt><dd>{readout.playbackRate}x</dd></div><div><dt>direction</dt><dd>{readout.direction}</dd></div><div><dt>duration</dt><dd>{readout.duration}ms</dd></div></dl>
      <div className="waapiConsoleButtons"><button type="button" onClick={() => safely((a) => a.play())}>Play</button><button type="button" onClick={() => safely((a) => a.pause())}>Pause</button><button type="button" onClick={() => safely((a) => a.reverse())}>Reverse</button><button type="button" onClick={() => safely((a) => a.cancel())}>Cancel</button><button type="button" onClick={() => safely((a) => a.finish())}>Finish</button>{[.5, 1, 2].map((rate) => <button type="button" key={rate} onClick={() => setRate(rate)}>{rate}x</button>)}</div>
      <label className="waapiSeek"><span>Seek</span><input aria-label="Seek" type="range" min="0" max={consoleDuration} step="20" value={Math.min(consoleDuration, readout.currentTime)} onChange={(event) => seek(Number(event.target.value))} /><output>{readout.currentTime}ms</output></label>
      {message && <p className="waapiConsoleError" role="status">{message}</p>}
    </section>
  );
}

const comparisonLevels = [
  { name: "控えめ", distance: 6, scale: 1.01, duration: 220, easing: "ease-out", glow: "0 0 0 transparent", overshoot: "なし" },
  { name: "標準", distance: 18, scale: 1.05, duration: 380, easing: "cubic-bezier(.2,.8,.2,1)", glow: "0 0 10px rgb(77 231 125 / 35%)", overshoot: "小" },
  { name: "派手", distance: 34, scale: 1.14, duration: 620, easing: "cubic-bezier(.18,.89,.32,1.28)", glow: "0 0 22px rgb(77 231 125 / 75%)", overshoot: "あり" },
] as const;

function MotionIntensityComparison({ reducedMotion }: { reducedMotion: boolean }) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const animations = useRef<Animation[]>([]);
  const play = useCallback(() => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = comparisonLevels.flatMap((level, index) => {
      const target = refs.current[index];
      if (!target) return [];
      return [target.animate(reducedMotion ? [{ opacity: .55 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateY(${level.distance}px) scale(.94)`, boxShadow: "0 0 0 transparent" }, { opacity: 1, transform: `translateY(0) scale(${level.scale})`, boxShadow: level.glow, offset: .78 }, { opacity: 1, transform: "translateY(0) scale(1)", boxShadow: level.glow }], { duration: reducedMotion ? 180 : level.duration, easing: reducedMotion ? "ease-out" : level.easing, iterations: 1, fill: "both" })];
    });
  }, [reducedMotion]);
  useEffect(() => { play(); return () => animations.current.forEach((animation) => animation.cancel()); }, [play]);
  return <section className="waapiComparison" aria-label="同じ通知カードによる動きの強さ比較"><div className="waapiComparisonHeading"><div><p>ONE PURPOSE / THREE INTENSITIES</p><h3>同じ通知カードで比較</h3></div><button type="button" onClick={play}>3種類を再生</button></div><div className="waapiComparisonGrid">{comparisonLevels.map((level, index) => <article key={level.name}><h4>{level.name}</h4><div className="waapiCompareStage"><div ref={(node) => { refs.current[index] = node; }}><i />保存しました</div></div><dl><div><dt>移動</dt><dd>{reducedMotion ? "0px" : `${level.distance}px`}</dd></div><div><dt>拡大</dt><dd>{reducedMotion ? "1×" : `${level.scale}×`}</dd></div><div><dt>duration</dt><dd>{reducedMotion ? "180ms" : `${level.duration}ms`}</dd></div><div><dt>easing</dt><dd>{reducedMotion ? "ease-out" : level.easing}</dd></div><div><dt>オーバーシュート</dt><dd>{reducedMotion ? "なし" : level.overshoot}</dd></div><div><dt>発光</dt><dd>{reducedMotion ? "なし" : index === 0 ? "なし" : index === 1 ? "弱" : "強"}</dd></div></dl></article>)}</div></section>;
}

export function WaapiSampleGallery() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(blankFilters);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const filteredSamples = useMemo(() => filterWaapiSamples(query, filters), [filters, query]);
  const options = useMemo(() => Object.fromEntries(filterKeys.map((key) => [key, Array.from(new Set(waapiSamples.flatMap((sample) => Array.isArray(sample[key]) ? sample[key] : [sample[key]]))).sort()])), []);

  useEffect(() => {
    if (!open || !gridRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setVisibleIds(new Set(filteredSamples.map((sample) => sample.id))));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver((entries) => setVisibleIds((current) => {
      const next = new Set(current);
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.sampleId;
        if (id) {
          if (entry.isIntersecting) next.add(id);
          else next.delete(id);
        }
      }
      return next;
    }), { rootMargin: "160px" });
    gridRef.current.querySelectorAll<HTMLElement>("[data-sample-id]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [filteredSamples, open]);

  const toggleGallery = () => {
    setOpen((current) => {
      if (current) setVisibleIds(new Set());
      return !current;
    });
  };
  const clearFilters = () => { setQuery(""); setFilters(blankFilters); setVisibleIds(new Set()); };

  return <section className="waapiGallery" aria-labelledby="waapi-gallery-title">
    <div className="waapiGalleryDivider" />
    <button type="button" className="waapiGalleryToggle" aria-expanded={open} aria-controls="waapi-gallery-panel" onClick={toggleGallery}><span>SPECIMEN CABINET / WAAPI</span><strong id="waapi-gallery-title">{open ? "サンプル一覧を閉じる" : "サンプル一覧を見る"}（{waapiSampleCount}）</strong><span aria-hidden="true">{open ? "↑" : "↓"}</span></button>
    {open && <div id="waapi-gallery-panel" className="waapiGalleryPanel">
      <div className="waapiGalleryIntro"><p>24件を、名前・見た目・キーフレーム・解説が一致する個別標本として展示します。OS・ゲーム由来の例はロゴや実画面ではなく、方向・テンポ・軌道だけを抽象化しています。</p></div>
      <aside className="waapiReducedGuide"><h3>Reduced motion（動きを減らす設定）</h3><p>OSやブラウザの設定をWebサイトが受け取り、大きな移動・反復・回転を避ける仕組みです。この展示では動きを単に消すのではなく、短いフェード、枠線、静的な進捗へ置き換えて意味を保ちます。現在は<strong>{reducedMotion ? "軽減表示" : "通常表示"}</strong>です。</p></aside>
      <div className="waapiFilters"><label className="waapiSearch">検索<input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleIds(new Set()); }} placeholder="名前・用途・年代・説明を検索" /></label>{filterKeys.map((key) => <label key={key}>{filterLabels[key]}<select value={filters[key]} onChange={(event) => { setFilters((current) => ({ ...current, [key]: event.target.value })); setVisibleIds(new Set()); }}><option value="">すべて</option>{(options[key] as string[]).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}<button type="button" onClick={clearFilters}>絞り込みを解除</button></div>
      <p className="waapiResults" aria-live="polite">{filteredSamples.length} / {waapiSampleCount} samples</p>
      <AnimationControlConsole reducedMotion={reducedMotion} />
      <MotionIntensityComparison reducedMotion={reducedMotion} />
      {filteredSamples.length === 0 ? <p className="waapiEmptyState">条件に一致する標本はありません。検索語またはフィルターを変更してください。</p> : <div ref={gridRef} className="waapiSampleGrid">{filteredSamples.map((sample) => <div key={sample.id} data-sample-id={sample.id}><SampleCard sample={sample} active={visibleIds.has(sample.id)} reducedMotion={reducedMotion} /></div>)}</div>}
    </div>}
  </section>;
}
