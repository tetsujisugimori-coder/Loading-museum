"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatAnimationCode,
  waapiSampleCount,
  waapiSamples,
  type SampleRenderKind,
  type WaapiSample,
} from "../data/waapiSamples";
import { AiComparisonLab, AiWorkingPreview, ExpandedGamePreview, aiKinds, expandedGameKinds } from "./WaapiExpandedPreviews";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const filterKeys = ["category", "interactionTypes", "visualElements", "stateKinds", "inspirationType", "usage", "sourceType", "era", "intensity", "difficulty"] as const;
type FilterKey = (typeof filterKeys)[number];
type Filters = Record<FilterKey, string>;

const blankFilters: Filters = { category: "", interactionTypes: "", visualElements: "", stateKinds: "", inspirationType: "", usage: "", sourceType: "", era: "", intensity: "", difficulty: "" };
const filterLabels: Record<FilterKey, string> = { category: "カテゴリ", interactionTypes: "操作", visualElements: "視覚要素", stateKinds: "状態", inspirationType: "着想元", usage: "用途", sourceType: "媒体", era: "年代", intensity: "動きの強さ", difficulty: "難易度" };

export function filterWaapiSamples(query: string, filters: Filters) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return waapiSamples.filter((sample) => {
    const searchText = [sample.name, sample.category, ...sample.usage, sample.era, sample.sourceType, sample.inspiredBy, sample.description, sample.suitableFor, sample.avoidFor, sample.difficulty, sample.intensity, ...sample.properties, ...sample.tags, ...sample.interactionTypes, ...sample.visualElements, ...sample.stateKinds, sample.inspirationType, sample.reducedMotionDescription, sample.referenceEnvironment, sample.evidenceLabel].join(" ").toLocaleLowerCase();
    return (!normalizedQuery || searchText.includes(normalizedQuery)) && filterKeys.every((key) => {
      const selected = filters[key];
      const value = sample[key];
      return !selected || (Array.isArray(value) ? (value as readonly string[]).includes(selected) : value === selected);
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

const gameKinds: SampleRenderKind[] = ["treasure", "rhythm", "coin", "combo", "hp", "boss", "menu", "cards"];

function PreviewArtwork({ kind, entered }: { kind: SampleRenderKind; entered: boolean }) {
  if (kind === "modal") return <div className="waapiModalBackdrop" data-motion-overlay aria-hidden={!entered}><div className="waapiModalObject" data-motion-target inert={!entered ? true : undefined}><i /><i /><button type="button">OK</button></div></div>;
  if (kind === "toast") return <div className="waapiToastObject" data-motion-target><i aria-hidden="true">✓</i><span>保存しました</span></div>;
  if (kind === "typewriter") return <span className="waapiTypewriter" data-motion-target>LOADING MUSEUM</span>;
  if (kind === "characters") return <div className="waapiCharacters" aria-label="MOTION">{"MOTION".split("").map((letter, index) => <span data-motion-target aria-hidden="true" key={`${letter}-${index}`}>{letter}</span>)}</div>;
  if (kind === "counter") return <div className="waapiCounterWindow" role="img" aria-label="最終値 9"><div className="waapiCounterColumn" data-motion-target>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <span key={digit}>{digit}</span>)}</div></div>;
  if (kind === "cursor") return <div className="waapiTerminalText">READY<span data-motion-target aria-hidden="true" /></div>;
  if (kind === "watch") return <div className="waapiWatch"><i data-motion-target /><b /></div>;
  if (kind === "dock") return <div className="waapiDock"><i data-motion-target>APP</i><b /></div>;
  if (kind === "geometry") return <div className="waapiGeometry">{[["-42px", "-30px", "-70deg"], ["44px", "-22px", "85deg"], ["-36px", "34px", "48deg"], ["40px", "30px", "-95deg"]].map(([x, y, r], index) => <i key={index} data-motion-target style={{ "--part-x": x, "--part-y": y, "--part-r": r } as React.CSSProperties} />)}</div>;
  if (kind === "marquee") return <span className="waapiMarqueeText" data-motion-target>WELCOME TO MY HOMEPAGE ★ UNDER CONSTRUCTION</span>;
  if (kind === "side-panel") return <div className="waapiSidePanel" data-motion-target><b>ITEM MENU</b><span>Collection</span><span>Settings</span></div>;
  if (kind === "badge") return <div className="waapiBadgeObject" data-motion-target>NEW</div>;
  if (kind === "bell") return <div className="waapiBellObject" data-motion-target aria-label="新しい通知">●<i /></div>;
  if (kind === "form-error") return <div className="waapiFormError" data-motion-target><label>ACCESS CODE<input value="12X" readOnly /></label><span>! 3桁の数字を入力してください</span></div>;
  return <div className="waapiInfoCard" data-motion-target><small>SPECIMEN 07</small><b>Nocturnal motion</b><span>Acquired 2026</span></div>;
}

function animateElement(target: HTMLElement, definition: WaapiSample["normal"], animations: React.MutableRefObject<Animation[]>, extra: KeyframeAnimationOptions = {}) {
  const animation = target.animate(definition.keyframes, { ...definition.options, ...extra });
  animations.current.push(animation);
  return animation;
}

function applyFrame(target: HTMLElement, frame: Keyframe | undefined) {
  if (!frame) return;
  for (const property of ["opacity", "transform", "filter", "clipPath", "backgroundColor", "borderColor", "boxShadow", "width"] as const) {
    const value = frame[property];
    if (value !== undefined && value !== null) target.style[property] = String(value);
  }
}

function ButtonPressPreview({ sample, reducedMotion }: { sample: WaapiSample; reducedMotion: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const pressed = useRef(false);
  const run = (down: boolean) => {
    if (pressed.current === down) return;
    pressed.current = down;
    animationRef.current?.cancel();
    const definition = down ? (reducedMotion ? sample.reduced : sample.normal) : (reducedMotion ? sample.reducedExit : sample.exit);
    if (buttonRef.current && definition) animationRef.current = buttonRef.current.animate(definition.keyframes, definition.options);
  };
  useEffect(() => () => animationRef.current?.cancel(), []);
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage waapiPreviewStage--button"><button ref={buttonRef} className="waapiButtonObject" type="button" onPointerDown={() => run(true)} onPointerUp={() => run(false)} onPointerCancel={() => run(false)} onPointerLeave={() => run(false)} onBlur={() => run(false)} onKeyDown={(event) => { if (!event.repeat && (event.key === "Enter" || event.key === " ")) run(true); }} onKeyUp={(event) => { if (event.key === "Enter" || event.key === " ") run(false); }}>PRESS</button></div><p className="waapiDirectHint">直接押して確認（pointer / keyboard）</p></div>;
}

function TogglePreview({ sample, reducedMotion }: { sample: WaapiSample; reducedMotion: boolean }) {
  const trackRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLElement>(null);
  const animations = useRef<Animation[]>([]);
  const [on, setOn] = useState(false);
  const toggle = () => {
    const next = !on;
    setOn(next);
    animations.current.forEach((animation) => animation.cancel());
    const definition = next ? (reducedMotion ? sample.reduced : sample.normal) : (reducedMotion ? sample.reducedExit : sample.exit);
    if (!definition) return;
    if (knobRef.current) animations.current.push(knobRef.current.animate(definition.keyframes, definition.options));
    if (trackRef.current) animations.current.push(trackRef.current.animate(next ? [{ backgroundColor: "#26342d" }, { backgroundColor: "#2f8b55" }] : [{ backgroundColor: "#2f8b55" }, { backgroundColor: "#26342d" }], { duration: reducedMotion ? 1 : 260, fill: "both" }));
  };
  useEffect(() => () => animations.current.forEach((animation) => animation.cancel()), []);
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage waapiPreviewStage--toggle"><button ref={trackRef} type="button" className="waapiToggleTrack" aria-label={`展示スイッチ ${on ? "ON" : "OFF"}`} aria-pressed={on} onClick={toggle}><i ref={knobRef} /><span>{on ? "ON" : "OFF"}</span></button><output aria-live="polite">State: {on ? "ON" : "OFF"}</output></div><p className="waapiDirectHint">OFF → ON → OFF を直接操作</p></div>;
}

function StandardSamplePreview({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
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
    const motion = forward ? (reducedMotion ? sample.reduced : sample.normal) : (reducedMotion ? sample.reducedExit : sample.exit);
    if (!motion) return;
    const targets = Array.from(stage.querySelectorAll<HTMLElement>("[data-motion-target]"));
    if ((sample.id === "slide-in-left" || sample.id === "slide-out-right") && targets[0]) {
      const stageRect = stage.getBoundingClientRect();
      const targetRect = targets[0].getBoundingClientRect();
      const distance = stageRect.width / 2 + targetRect.width / 2 + 8;
      targets[0].style.setProperty("--slide-distance", `${sample.id === "slide-in-left" ? -distance : distance}px`);
    }
    if (sample.render === "marquee" && targets[0]) {
      const distance = stage.clientWidth / 2 + targets[0].offsetWidth / 2 + 8;
      targets[0].style.setProperty("--marquee-start", `${distance}px`);
      targets[0].style.setProperty("--marquee-end", `${-distance}px`);
    }
    animationsRef.current = targets.map((target, index) => target.animate(motion.keyframes, {
      ...motion.options,
      delay: reducedMotion ? 0 : Number(motion.options.delay ?? 0) + index * (sample.stagger ?? 0),
    }));
    if (sample.render === "modal") {
      const overlay = stage.querySelector<HTMLElement>("[data-motion-overlay]");
      if (overlay) animationsRef.current.push(overlay.animate(forward ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: forward ? 240 : 180, easing: forward ? "ease-out" : "ease-in", fill: "both" }));
    }
    setEntered(forward);
  }, [reducedMotion, sample, stop]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const firstTarget = stage.querySelector<HTMLElement>("[data-motion-target]");
    if ((sample.id === "slide-in-left" || sample.id === "slide-out-right") && firstTarget) {
      const distance = stage.clientWidth / 2 + firstTarget.offsetWidth / 2 + 8;
      firstTarget.style.setProperty("--slide-distance", `${sample.id === "slide-in-left" ? -distance : distance}px`);
    }
    const first = (reducedMotion ? sample.reduced : sample.normal).keyframes[0];
    stage.querySelectorAll<HTMLElement>("[data-motion-target]").forEach((target) => applyFrame(target, first));
  }, [reducedMotion, sample]);

  useEffect(() => {
    if (!active || sample.playbackPolicy !== "auto-finite") return;
    const frame = window.requestAnimationFrame(() => play(true));
    // Finite animations retain their completion state when leaving the viewport.
    return () => window.cancelAnimationFrame(frame);
  }, [active, play, sample.playbackPolicy]);
  useEffect(() => stop, [stop]);

  const toggle = () => play(!entered);
  return (
    <div className="waapiPreviewGroup">
      <div ref={stageRef} className={`waapiPreviewStage waapiPreviewStage--${sample.render}`} data-entered={entered}>
        <PreviewArtwork kind={sample.render} entered={entered} />
      </div>
      <div className="waapiPreviewControls">
        <button type="button" onClick={() => play(true)} aria-label={`${sample.name}を再生`}>{sample.playbackPolicy === "manual-exit" ? "Play exit" : sample.playbackPolicy === "manual-entrance" ? "Play entrance" : "Replay"}</button>
        {isBidirectional && <button type="button" onClick={toggle} aria-label={`${sample.name}を${entered ? "閉じる" : "開く"}`}>{entered ? "Close / Exit" : "Open / Enter"}</button>}
      </div>
    </div>
  );
}

function GameSamplePreview({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const [rhythm, setRhythm] = useState("READY");
  const [score, setScore] = useState(0);
  const [comboIndex, setComboIndex] = useState(0);
  const [hp, setHp] = useState(72);
  const [trailHp, setTrailHp] = useState(72);
  const [menuIndex, setMenuIndex] = useState(0);
  const [cardStatus, setCardStatus] = useState("READY");
  const stop = useCallback(() => { animations.current.forEach((item) => item.cancel()); animations.current = []; }, []);
  const run = useCallback(() => {
    const stage = stageRef.current;
    const target = stage?.querySelector<HTMLElement>("[data-motion-target]");
    if (!stage || !target) return;
    stop();
    const definition = reducedMotion ? sample.reduced : sample.normal;
    if (sample.render === "coin" && !reducedMotion) {
      const scoreNode = stage.querySelector<HTMLElement>("[data-score]");
      if (scoreNode) {
        const from = target.getBoundingClientRect(); const to = scoreNode.getBoundingClientRect();
        target.style.setProperty("--coin-x", `${to.left - from.left}px`); target.style.setProperty("--coin-y", `${to.top - from.top}px`);
      }
    }
    const main = animateElement(target, definition, animations);
    const steps = reducedMotion ? sample.reducedSequence : sample.sequence;
    steps?.forEach((item) => { const node = stage.querySelector<HTMLElement>(item.target); if (node) animateElement(node, { ...definition, keyframes: item.keyframes, options: item.options }, animations); });
    if (sample.render === "coin") Promise.resolve(main.finished).then(() => setScore((value) => value + 100)).catch(() => undefined);
  }, [reducedMotion, sample, stop]);
  const reset = useCallback(() => { stop(); setRhythm("READY"); setScore(0); setComboIndex(0); setHp(72); setTrailHp(72); setMenuIndex(0); setCardStatus("READY"); }, [stop]);
  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(frame);
  }, [active, run]);
  useEffect(() => stop, [stop]);

  const judge = (value: "PERFECT" | "GOOD" | "MISS") => {
    const target = stageRef.current?.querySelector<HTMLElement>("[data-motion-target]"); if (!target) return;
    stop(); setRhythm(value);
    const frames: Record<typeof value, Keyframe[]> = {
      PERFECT: [{ opacity: 0, transform: "scale(.45)", textShadow: "0 0 0 #ffe36e" }, { opacity: 1, transform: "scale(1.55)", textShadow: "0 0 24px #ffe36e" }, { opacity: 1, transform: "scale(1)", textShadow: "0 0 8px #ffe36e" }],
      GOOD: [{ opacity: 0, transform: "translateY(8px) scale(.85)" }, { opacity: 1, transform: "translateY(-5px) scale(1.12)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
      MISS: [{ opacity: 0, transform: "translateY(-5px)" }, { opacity: 1, transform: "translateY(14px)" }, { opacity: .7, transform: "translateY(8px)" }],
    };
    animateElement(target, { ...sample.normal, keyframes: reducedMotion ? [{ opacity: 1 }, { opacity: 1 }] : frames[value] }, animations);
  };
  const addCombo = () => { const next = Math.min(comboIndex + 1, 3); setComboIndex(next); const node = stageRef.current?.querySelector<HTMLElement>("[data-motion-target]"); if (node && !reducedMotion) { node.style.setProperty("--combo-scale", [1, 1.12, 1.24, 1.34][next].toString()); animateElement(node, sample.normal, animations); } };
  const changeHp = (delta: number) => { const next = Math.max(0, Math.min(100, hp + delta)); setHp(next); if (reducedMotion || delta > 0) setTrailHp(next); else window.setTimeout(() => setTrailHp(next), 360); };
  const moveMenu = (delta: number) => setMenuIndex((value) => Math.max(0, Math.min(2, value + delta)));
  const cardAction = (mode: "shuffle" | "deal" | "select" | "drag" | "play" | "resolve" | "discard") => {
    setCardStatus(mode.toUpperCase());
    const cards = stageRef.current?.querySelectorAll<HTMLElement>("[data-card]"); if (!cards) return; stop();
    cards.forEach((card, index) => {
      const deal = [{ opacity: 1, transform: "translate(0,0) rotate(0)" }, { opacity: 1, transform: `translate(${(index - 1.5) * 38}px, ${Math.abs(index - 1.5) * 6}px) rotate(${(index - 1.5) * 7}deg)` }];
      const shuffle = [{ transform: "translate(0,0) rotate(0)" }, { transform: `translate(${index % 2 ? 32 : -32}px,-12px) rotate(${index % 2 ? 9 : -9}deg)` }, { transform: "translate(0,0) rotate(0)" }];
      const interaction = mode === "deal" ? deal : mode === "shuffle" ? shuffle : [{ opacity: 1, transform: `translate(${(index - 1.5) * 34}px,${mode === "discard" ? 55 : mode === "play" ? -34 : -4}px) rotate(${(index - 1.5) * 7}deg) scale(${mode === "select" || mode === "drag" ? 1.12 : 1})` }, { opacity: mode === "discard" ? 0 : 1, transform: `translate(${(index - 1.5) * 38}px,${mode === "play" ? -44 : 0}px) rotate(${(index - 1.5) * 5}deg) scale(1)` }];
      animations.current.push(card.animate(reducedMotion ? [{ opacity: .5 }, { opacity: mode === "discard" ? 0 : 1 }] : interaction, { duration: reducedMotion ? 140 : mode === "deal" ? 520 : 420, delay: reducedMotion ? 0 : index * 90, easing: "ease-out", fill: "both" }));
    });
  };

  return <div className="waapiPreviewGroup">
    <div ref={stageRef} className={`waapiPreviewStage waapiPreviewStage--game waapiPreviewStage--${sample.render}`} tabIndex={sample.render === "menu" ? 0 : undefined} onKeyDown={sample.render === "menu" ? (event) => { if (event.key === "ArrowDown") { event.preventDefault(); moveMenu(1); } if (event.key === "ArrowUp") { event.preventDefault(); moveMenu(-1); } } : undefined}>
      {sample.render === "treasure" && <button type="button" className="gameChest" onClick={run} aria-label="宝箱を開く"><i data-chest-glow /><b data-motion-target /><span /><em data-chest-item>◆</em></button>}
      {sample.render === "rhythm" && <div className={`gameRhythm gameRhythm--${rhythm.toLowerCase()}`}><strong data-motion-target>{rhythm}</strong></div>}
      {sample.render === "coin" && <div className="gameCoinScene"><button type="button" data-motion-target onClick={run} aria-label="コインを取る">¢</button><output data-score aria-label={`Score ${score}`}>SCORE {score}</output></div>}
      {sample.render === "combo" && <strong className={`gameCombo gameCombo--${comboIndex}`} data-motion-target>{["READY", "2 COMBO", "5 COMBO", "10 COMBO"][comboIndex]}</strong>}
      {sample.render === "hp" && <div className="gameHp"><header><span>KNIGHT</span><output>{hp} / 100 HP</output></header><div><i style={{ width: `${trailHp}%` }} /><b data-motion-target style={{ width: `${hp}%` }} /></div></div>}
      {sample.render === "boss" && <div className="gameBoss"><i data-boss-dark /><b data-motion-target>♜</b><strong data-boss-name>THE OBSERVER</strong></div>}
      {sample.render === "menu" && <div className="gameMenu"><i style={{ transform: `translateY(${menuIndex * 34}px)` }}>▶</i>{["CONTINUE", "COLLECTION", "SETTINGS"].map((label, index) => <span className={menuIndex === index ? "isSelected" : ""} key={label}>{label}</span>)}<b data-motion-target style={{ opacity: 0 }} /></div>}
      {sample.render === "cards" && <div className="gameCards" aria-label={`Card state: ${cardStatus}`}>{["A", "K", "Q", "J"].map((label, index) => <i data-card draggable onDragStart={() => setCardStatus("DRAG")} data-motion-target={index === 0 ? "" : undefined} key={label}>{label}</i>)}<output aria-live="polite">{cardStatus}</output></div>}
    </div>
    <div className="waapiPreviewControls gameControls">
      {!(["rhythm", "hp", "menu", "cards", "combo"] as SampleRenderKind[]).includes(sample.render) && <button type="button" onClick={run}>Replay</button>}
      {sample.render === "rhythm" && <>{(["PERFECT", "GOOD", "MISS"] as const).map((value) => <button type="button" key={value} onClick={() => judge(value)}>{value}</button>)}</>}
      {sample.render === "combo" && <button type="button" onClick={addCombo}>Add combo</button>}
      {sample.render === "hp" && <><button type="button" onClick={() => changeHp(-24)}>Damage</button><button type="button" onClick={() => changeHp(18)}>Heal</button></>}
      {sample.render === "menu" && <><button type="button" onClick={() => moveMenu(-1)}>↑ Up</button><button type="button" onClick={() => moveMenu(1)}>↓ Down</button></>}
      {sample.render === "cards" && <>{(["shuffle", "deal", "select", "drag", "play", "resolve", "discard"] as const).map((action) => <button type="button" key={action} onClick={() => cardAction(action)}>{action.toUpperCase()}</button>)}</>}
      <button type="button" onClick={reset}>Reset</button>
    </div>
  </div>;
}

function SamplePreview(props: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  if (expandedGameKinds.includes(props.sample.render)) return <ExpandedGamePreview {...props} />;
  if (aiKinds.includes(props.sample.render)) return <AiWorkingPreview {...props} />;
  if (props.sample.render === "button") return <ButtonPressPreview sample={props.sample} reducedMotion={props.reducedMotion} />;
  if (props.sample.render === "toggle") return <TogglePreview sample={props.sample} reducedMotion={props.reducedMotion} />;
  return gameKinds.includes(props.sample.render) ? <GameSamplePreview {...props} /> : <StandardSamplePreview {...props} />;
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
      {sample.referenceUrl && <p className="waapiInspired"><strong>{sample.evidenceLabel}:</strong> <a href={sample.referenceUrl} target="_blank" rel="noreferrer">公式資料</a> / 確認日 {sample.referenceCheckedOn} / {sample.referenceEnvironment}。製品UI変更で説明が古くなる可能性があります。</p>}
      <dl className="waapiMeta">
        <div><dt>適する用途</dt><dd>{sample.suitableFor}</dd></div>
        <div><dt>避ける用途</dt><dd>{sample.avoidFor}</dd></div>
        <div><dt>CSS</dt><dd>{sample.properties.join(", ")}</dd></div>
        <div><dt>強さ / 難易度</dt><dd>{sample.intensity} / {sample.difficulty}</dd></div>
        <div><dt>操作 / 状態</dt><dd>{sample.interactionTypes.join(", ")} / {sample.stateKinds.join(", ")}</dd></div>
        <div><dt>視覚要素 / 着想元</dt><dd>{sample.visualElements.join(", ")} / {sample.inspirationType}</dd></div>
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
  const categoryCounts = useMemo(() => Array.from(new Set(waapiSamples.map((sample) => sample.category))).map((category) => ({ category, count: waapiSamples.filter((sample) => sample.category === category).length })), []);

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
      <div className="waapiGalleryIntro"><p>47件を、名前・見た目・入力・判定・結果・キーフレームが一致する個別標本として展示します。ゲーム例は一般化した操作と状態変化、AI例は公式資料で確認した機能と明記した抽象的再構成です。</p><ul className="waapiCategoryCounts">{categoryCounts.map(({ category, count }) => <li key={category}><span>{category}</span><b>{count}</b></li>)}</ul></div>
      <aside className="waapiReducedGuide"><h3>Reduced motion（動きを減らす設定）</h3><p>OSやブラウザの設定をWebサイトが受け取り、大きな移動・反復・回転を避ける仕組みです。この展示では動きを単に消すのではなく、短いフェード、枠線、静的な進捗へ置き換えて意味を保ちます。現在は<strong>{reducedMotion ? "軽減表示" : "通常表示"}</strong>です。</p></aside>
      <div className="waapiFilters"><label className="waapiSearch">検索<input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleIds(new Set()); }} placeholder="名前・用途・年代・説明を検索" /></label>{filterKeys.map((key) => <label key={key}>{filterLabels[key]}<select value={filters[key]} onChange={(event) => { setFilters((current) => ({ ...current, [key]: event.target.value })); setVisibleIds(new Set()); }}><option value="">すべて</option>{(options[key] as string[]).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}<button type="button" onClick={clearFilters}>絞り込みを解除</button></div>
      <p className="waapiResults" aria-live="polite">{filteredSamples.length} / {waapiSampleCount} samples</p>
      <AnimationControlConsole reducedMotion={reducedMotion} />
      <MotionIntensityComparison reducedMotion={reducedMotion} />
      <AiComparisonLab reducedMotion={reducedMotion} />
      {filteredSamples.length === 0 ? <p className="waapiEmptyState">条件に一致する標本はありません。検索語またはフィルターを変更してください。</p> : <div ref={gridRef} className="waapiSampleGrid">{filteredSamples.map((sample) => <div key={sample.id} data-sample-id={sample.id}><SampleCard sample={sample} active={visibleIds.has(sample.id)} reducedMotion={reducedMotion} /></div>)}</div>}
    </div>}
  </section>;
}
