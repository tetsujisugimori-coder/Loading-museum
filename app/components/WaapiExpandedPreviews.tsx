"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SampleRenderKind, WaapiSample } from "../data/waapiSamples";
import { aiPhases, judgeTiming, nextAiState, nextComparisonPhase, type AiComparisonPhase, type AiWorkingState } from "./waapi-interaction-state";

export const expandedGameKinds: SampleRenderKind[] = ["combat", "reward-lab", "hit-stop", "parry", "dodge", "line-clear", "match3", "pinball", "lockon", "equip", "status-effects", "turn-order", "battle-transition", "race"];
export const aiKinds: SampleRenderKind[] = ["ai-modular", "ai-ribbon", "ai-code", "ai-sparkle", "ai-warm", "ai-weave"];

const modes: Partial<Record<SampleRenderKind, string[]>> = {
  combat: ["NORMAL", "GUARD", "CRITICAL"], "reward-lab": ["ACHIEVEMENT", "QUEST COMPLETE", "LEVEL UP"],
  "status-effects": ["BURN", "FREEZE", "POISON"], "turn-order": ["HASTE", "STUN", "NORMALIZE"],
};

const actions: Partial<Record<SampleRenderKind, string>> = {
  "line-clear": "DROP", pinball: "LAUNCH",
};

export function ExpandedGamePreview({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const warningAt = useRef(0);
  const animations = useRef<Animation[]>([]);
  const timers = useRef<number[]>([]);
  const [mode, setMode] = useState(modes[sample.render]?.[0] ?? "READY");
  const [phase, setPhase] = useState("IDLE");
  const [score, setScore] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [selectedGems, setSelectedGems] = useState<string[]>([]);

  const stop = useCallback(() => {
    animations.current.forEach((animation) => animation.cancel()); animations.current = [];
    timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = [];
  }, []);
  const reset = useCallback(() => { stop(); setPhase("IDLE"); setScore(0); setTargetIndex(0); setSelectedGems([]); warningAt.current = 0; }, [stop]);
  useEffect(() => { if (!active) stop(); return stop; }, [active, stop]);

  const animate = useCallback((result: string) => {
    stop(); setMode(result); setPhase("ANTICIPATION"); warningAt.current = performance.now();
    const nodes = Array.from(stageRef.current?.querySelectorAll<HTMLElement>("[data-game-part]") ?? []);
    const dodgeDistance = result.includes("LEFT") ? -54 : result.includes("RIGHT") ? 54 : 0;
    const knockback = result.includes("HEAVY") ? 42 : result.includes("CRITICAL") ? 34 : result.includes("GUARD") ? 8 : 20;
    if (!reducedMotion) animations.current = nodes.map((node, index) => node.animate([
      { opacity: .35, transform: "translate(0,0) scale(.9)" },
      { opacity: 1, transform: `translate(${dodgeDistance || (index % 2 ? knockback : -8)}px,-4px) scale(${result.includes("HEAVY") ? .86 : 1.08})`, offset: .58 },
      { opacity: 1, transform: `translate(${dodgeDistance || (index % 2 ? knockback : 0)}px,0) scale(1)` },
    ], { duration: 460 + index * 45, delay: index * 55, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both", iterations: 1 }));
    timers.current.push(window.setTimeout(() => setPhase(result), reducedMotion ? 0 : 270));
    timers.current.push(window.setTimeout(() => { setPhase("AFTERMATH"); setScore((value) => value + (result.includes("FAIL") || result.includes("HIT") ? 0 : 100)); }, reducedMotion ? 20 : 820));
  }, [reducedMotion, stop]);

  const beginWarning = () => { stop(); warningAt.current = performance.now(); setPhase("WARNING"); timers.current.push(window.setTimeout(() => setPhase("ACTIVE WINDOW"), reducedMotion ? 0 : 350)); };
  const timedAction = (success: string) => {
      if (!warningAt.current) { setPhase("FAILED · NO ATTACK"); return; }
      const judgement = judgeTiming(performance.now() - warningAt.current);
      animate(judgement === "PERFECT" ? success : `${judgement} · HIT`);
  };
  const switchTarget = (delta: number) => { const next = (targetIndex + delta + 3) % 3; const target = ["SCOUT · 18m", "WARDEN · 31m", "DRONE · 12m"][next]; setTargetIndex(next); animate(`LOCKED · ${target}`); };
  const primary = () => {
    if (sample.render === "race") { setPhase("COUNTDOWN 3 · 2 · 1"); timers.current.push(window.setTimeout(() => animate("GO · LAUNCH"), reducedMotion ? 30 : 1200)); return; }
    if (sample.render === "match3") { animate(selectedGems.length === 2 ? "MATCH · CASCADE ×2" : "NO MATCH · RETURN"); return; }
    animate("SUCCESS");
  };

  const labels = modes[sample.render];
  const turnOrder = mode === "HASTE" ? ["MAGE", "KNIGHT", "ROGUE"] : mode === "STUN" ? ["KNIGHT", "ROGUE", "MAGE ⊘"] : ["KNIGHT", "MAGE", "ROGUE"];
  return <div className="waapiPreviewGroup">
    <div ref={stageRef} data-mode={mode.toLowerCase().replaceAll(" ", "-")} className={`waapiPreviewStage waapiExpandedGame waapiExpandedGame--${sample.render}`} tabIndex={(sample.interactionTypes.includes("Keyboard")) ? 0 : undefined} onKeyDown={(event) => { if (sample.render === "lockon" && event.key === "ArrowLeft") { event.preventDefault(); switchTarget(-1); } else if (sample.render === "lockon" && event.key === "ArrowRight") { event.preventDefault(); switchTarget(1); } else if (event.key === " " || event.key === "Enter") { event.preventDefault(); primary(); } }}>
      <span className="waapiGamePrompt">{phase}</span>
      <div className="waapiGameActor" data-game-part aria-hidden="true"><i /><b /></div>
      <div className="waapiGameTarget" data-game-part aria-hidden="true"><i /><b /></div>
      <strong data-game-part>{sample.render === "dodge" && phase.includes("LEFT") ? "← AFTERIMAGE ×3" : sample.render === "dodge" && phase.includes("RIGHT") ? "AFTERIMAGE ×3 →" : mode}</strong>
      <output aria-live="polite">{phase} · SCORE {score}</output>
      {sample.render === "line-clear" && <div className="waapiBlockBoard" aria-hidden="true">{Array.from({length:12},(_,index)=><i data-game-part key={index} />)}</div>}
      {sample.render === "status-effects" && <div className="waapiStatusMaterial" aria-hidden="true">{[0,1,2,3].map((item)=><i data-game-part key={item} />)}</div>}
      {sample.render === "turn-order" && <ol className="waapiTurnCards" aria-label={`行動順: ${turnOrder.join("、")}`}>{turnOrder.map((label,index)=><li data-game-part key={label}><b>{index+1}</b>{label}</li>)}</ol>}
      {sample.render === "lockon" && <div className="waapiLockTargets" aria-hidden="true">{[0,1,2].map((item)=><i className={item===targetIndex?"isLocked":""} key={item} />)}</div>}
      {sample.render === "race" && <div className="waapiRaceTrack" aria-hidden="true"><i data-game-part /><i /><i /></div>}
      {sample.render === "match3" && <button type="button" draggable onDragStart={() => setPhase("DRAGGING")} onDragOver={(event) => event.preventDefault()} onDrop={() => { setSelectedGems(["A", "B"]); animate("MATCH · CASCADE ×2"); }}>◆ DRAG / DROP</button>}
      {sample.render === "equip" && <button type="button" draggable onDragStart={() => setPhase("SELECTED")} onDragOver={(event) => event.preventDefault()} onDrop={() => animate("EQUIPPED +12")}>◇ ITEM → SLOT</button>}
    </div>
    <div className="waapiPreviewControls gameControls">
      {labels?.map((label) => <button type="button" key={label} aria-pressed={mode === label} onClick={() => { setMode(label); animate(label); }}>{label}</button>)}
      {sample.render === "hit-stop" && <><button type="button" onClick={() => animate("ATTACK · 60ms STOP")}>ATTACK</button><button type="button" onClick={() => animate("HEAVY · 110ms STOP · LONG KNOCKBACK")}>HEAVY ATTACK</button></>}
      {sample.render === "parry" && <><button type="button" onClick={beginWarning}>ENEMY ATTACK</button><button type="button" onClick={() => timedAction("PERFECT PARRY")}>PARRY</button></>}
      {sample.render === "dodge" && <><button type="button" onClick={beginWarning}>ATTACK START</button><button type="button" onClick={() => timedAction("DODGED LEFT · S-RANK")}>DODGE LEFT</button><button type="button" onClick={() => timedAction("DODGED RIGHT · S-RANK")}>DODGE RIGHT</button></>}
      {sample.render === "match3" && <><button type="button" aria-pressed={selectedGems.includes("A")} onClick={() => setSelectedGems((value) => value.includes("A") ? value.filter((item) => item !== "A") : [...value, "A"].slice(-2))}>SELECT GEM A</button><button type="button" aria-pressed={selectedGems.includes("B")} onClick={() => setSelectedGems((value) => value.includes("B") ? value.filter((item) => item !== "B") : [...value, "B"].slice(-2))}>SELECT GEM B</button><button type="button" onClick={primary}>SWAP</button></>}
      {sample.render === "lockon" && <><button type="button" onClick={() => switchTarget(-1)}>PREVIOUS TARGET</button><button type="button" onClick={() => switchTarget(1)}>NEXT TARGET</button></>}
      {sample.render === "equip" && <><button type="button" onClick={() => animate("EQUIPPED · ATK +12")}>EQUIP</button><button type="button" onClick={() => { stop(); setPhase("UNEQUIPPED · ATK +0"); }}>UNEQUIP</button></>}
      {sample.render === "status-effects" && <button type="button" onClick={() => { stop(); setMode("NORMAL"); setPhase("CLEARED"); }}>CLEAR</button>}
      {sample.render === "battle-transition" && <><button type="button" onClick={() => animate("BATTLE READY · DIAGONAL WIPE")}>ENCOUNTER</button><button type="button" onClick={() => animate("FIELD RETURN · IRIS OPEN")}>RETURN</button></>}
      {sample.render === "race" && <><button type="button" onClick={primary}>START</button><button type="button" onClick={() => animate("FALSE START · STOP")}>FALSE START</button></>}
      {!labels && !["hit-stop", "parry", "dodge", "match3", "lockon", "equip", "battle-transition", "race"].includes(sample.render) && <button type="button" onClick={primary}>{actions[sample.render] ?? "PLAY"}</button>}
      <button type="button" onClick={reset}>RESET</button>
    </div>
  </div>;
}

const workingStates: AiWorkingState[] = ["Starting", "Working", "Tool / Reasoning", "Completing"];

export function AiWorkingPreview({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const loops = useRef<Animation[]>([]);
  const [state, setState] = useState<AiWorkingState>("Idle");
  const stop = useCallback(() => { loops.current.forEach((animation) => animation.cancel()); loops.current = []; }, []);
  useEffect(() => {
    stop();
    if (!active || reducedMotion || !workingStates.includes(state)) return;
    loops.current = Array.from(stageRef.current?.querySelectorAll<HTMLElement>("[data-ai-part]") ?? []).map((node, index) => node.animate([
      { opacity: .38, transform: "translateY(3px) scale(.96)" }, { opacity: 1, transform: "translateY(-3px) scale(1.04)" }, { opacity: .38, transform: "translateY(3px) scale(.96)" },
    ], { duration: 900 + index * 160, delay: index * 90, easing: "ease-in-out", iterations: Infinity }));
    return stop;
  }, [active, reducedMotion, state, stop]);
  useEffect(() => stop, [stop]);
  const reset = () => { stop(); setState("Idle"); };
  return <div className="waapiPreviewGroup">
    <div ref={stageRef} className={`waapiPreviewStage waapiAiPreview waapiAiPreview--${sample.render}`}>
      <p>{state}</p><div className="waapiAiGlyph" aria-hidden="true">{[0, 1, 2, 3].map((item) => <i data-ai-part key={item} />)}</div><strong>{state === "Complete" ? "✓ RESPONSE READY" : state === "Error" ? "! ACTION NEEDED" : "WORKING CONTEXT"}</strong>
      <output aria-live="polite">State: {state}</output>
    </div>
    <div className="waapiPreviewControls gameControls"><button type="button" onClick={() => setState("Starting")}>START</button><button type="button" onClick={() => setState((value) => nextAiState(value))}>NEXT PHASE</button><button type="button" onClick={() => setState("Complete")}>COMPLETE</button><button type="button" onClick={() => setState("Error")}>ERROR</button><button type="button" onClick={reset}>RESET</button></div>
  </div>;
}

export function AiComparisonLab({ reducedMotion }: { reducedMotion: boolean }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<AiComparisonPhase>("Request received");
  const rootRef = useRef<HTMLDivElement>(null);
  const loops = useRef<Animation[]>([]);
  const stop = useCallback(() => { loops.current.forEach((animation) => animation.cancel()); loops.current = []; }, []);
  useEffect(() => {
    stop();
    if (!open || reducedMotion || phase === "Complete" || phase === "Error" || phase === "Request received") return;
    loops.current = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-compare-motion]") ?? []).map((node, index) => node.animate([{ opacity: .35, transform: "scale(.94)" }, { opacity: 1, transform: "scale(1.06)" }, { opacity: .35, transform: "scale(.94)" }], { duration: 780 + index * 80, iterations: Infinity, easing: "ease-in-out" }));
    return stop;
  }, [open, phase, reducedMotion, stop]);
  useEffect(() => stop, [stop]);
  const toggle = () => { if (open) { stop(); setPhase("Request received"); } setOpen((value) => !value); };
  return <section className="waapiAiComparison"><button type="button" aria-expanded={open} onClick={toggle}>AI 6種の共通フェーズ比較を{open ? "閉じる" : "開く"}</button>{open && <div ref={rootRef}><header><p>{aiPhases.map((item) => <span className={item === phase ? "isCurrent" : ""} key={item}>{item}</span>)}</p><div><button type="button" onClick={() => setPhase("Searching")}>START ALL</button><button type="button" onClick={() => setPhase((value) => nextComparisonPhase(value))}>NEXT ALL</button><button type="button" onClick={() => setPhase("Complete")}>COMPLETE ALL</button><button type="button" onClick={() => setPhase("Error")}>ERROR ALL</button><button type="button" onClick={() => setPhase("Request received")}>RESET ALL</button></div></header><div className="waapiAiComparisonGrid">{aiKinds.map((kind) => <article key={kind} className={`waapiAiMini waapiAiPreview--${kind}`}><i data-compare-motion /><strong>{kind.replace("ai-", "")}</strong><output>{phase}</output></article>)}</div></div>}</section>;
}
