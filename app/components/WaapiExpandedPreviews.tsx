"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SampleRenderKind, WaapiSample } from "../data/waapiSamples";
import { aiPhases, judgeTiming, nextAiState, nextComparisonPhase, type AiComparisonPhase, type AiWorkingState } from "./waapi-interaction-state";

import { initialGems, exchangeGems, initialBlocks, dropAndCompact, type GemExchange } from "./waapi-board-state";

export const expandedGameKinds: SampleRenderKind[] = ["combat", "reward-lab", "hit-stop", "parry", "dodge", "line-clear", "match3", "pinball", "lockon", "equip", "status-effects", "turn-order", "battle-transition", "race"];
export const aiKinds: SampleRenderKind[] = ["ai-modular", "ai-ribbon", "ai-code", "ai-sparkle", "ai-warm", "ai-weave"];
type PreviewProps = { sample: WaapiSample; active: boolean; reducedMotion: boolean };

function Controls({ children, reset }: { children: ReactNode; reset: () => void }) {
  return <div className="waapiPreviewControls gameControls">{children}<button type="button" onClick={reset}>RESET</button></div>;
}

function useRuntime(active: boolean, reducedMotion = false) {
  const animations = useRef<Animation[]>([]);
  const timers = useRef<number[]>([]);
  const stop = useCallback(() => {
    animations.current.forEach((animation) => animation.cancel());
    timers.current.forEach((timer) => window.clearTimeout(timer));
    animations.current = [];
    timers.current = [];
  }, []);
  const animate = useCallback((node: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    if (node) animations.current.push(node.animate(frames, options));
  }, []);
  const later = useCallback((callback: () => void, delay: number) => timers.current.push(window.setTimeout(callback, delay)), []);
  useEffect(() => { if (!active) stop(); return stop; }, [active, stop]);
  useLayoutEffect(() => { if (reducedMotion) stop(); }, [reducedMotion, stop]);
  return { stop, animate, later };
}

function CombatPreview({ active, reducedMotion }: PreviewProps) {
  const target = useRef<HTMLDivElement>(null); const number = useRef<HTMLOutputElement>(null); const slash = useRef<HTMLSpanElement>(null);
  const { stop, animate } = useRuntime(active); const [result, setResult] = useState("READY");
  const play = (kind: "NORMAL" | "GUARD" | "CRITICAL") => { stop(); setResult(kind === "NORMAL" ? "-128" : kind === "GUARD" ? "GUARD -24" : "CRITICAL -999"); if (reducedMotion) return; const power = kind === "CRITICAL" ? 14 : kind === "GUARD" ? 3 : 7; animate(target.current, [{ transform: "translateX(0)", filter: "brightness(1)" }, { transform: `translateX(${power}px)`, filter: `brightness(${kind === "CRITICAL" ? 2.8 : 1.7})` }, { transform: "translateX(0)", filter: "brightness(1)" }], { duration: kind === "CRITICAL" ? 520 : 360 }); animate(number.current, [{ opacity: 0, transform: "translateY(8px) scale(.6)" }, { opacity: 1, transform: `translateY(-16px) scale(${kind === "CRITICAL" ? 1.5 : 1.05})` }, { opacity: 1, transform: "translateY(-8px) scale(1)" }], { duration: 520, fill: "both" }); animate(slash.current, [{ opacity: 0, transform: "rotate(-24deg) scaleX(.1)" }, { opacity: 1, transform: "rotate(-24deg) scaleX(1)" }, { opacity: 0 }], { duration: 220 }); };
  const reset = () => { stop(); setResult("READY"); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameCombat" data-scene="combat"><div className="combatAttacker">⚔</div><span ref={slash} className="combatSlash" /><div ref={target} className="combatTarget">◆<b>ENEMY</b></div><output ref={number}>{result}</output></div><Controls reset={reset}>{(["NORMAL", "GUARD", "CRITICAL"] as const).map((kind) => <button type="button" key={kind} onClick={() => play(kind)}>{kind}</button>)}</Controls></div>;
}

function RewardPreview({ active, reducedMotion }: PreviewProps) {
  const stage = useRef<HTMLDivElement>(null); const { stop, animate } = useRuntime(active); const [reward, setReward] = useState<"NONE" | "ACHIEVEMENT" | "QUEST COMPLETE" | "LEVEL UP">("NONE");
  const play = (value: Exclude<typeof reward, "NONE">) => { stop(); setReward(value); requestAnimationFrame(() => { if (reducedMotion) return; const node = stage.current?.querySelector("[data-reward]") ?? null; const frames = value === "ACHIEVEMENT" ? [{ opacity: 0, transform: "translateX(70px)" }, { opacity: 1, transform: "translateX(0)" }] : value === "QUEST COMPLETE" ? [{ opacity: 0, transform: "scale(1.7) rotate(-16deg)" }, { opacity: 1, transform: "scale(1) rotate(-7deg)" }] : [{ opacity: 0, transform: "translateY(30px)" }, { opacity: 1, transform: "translateY(0)" }]; animate(node, frames, { duration: 520, fill: "both", easing: "cubic-bezier(.2,.85,.2,1)" }); }); };
  const reset = () => { stop(); setReward("NONE"); };
  return <div className="waapiPreviewGroup"><div ref={stage} className="waapiPreviewStage gameScene gameReward" data-scene="reward">{reward === "NONE" && <p>CHOOSE A REWARD</p>}{reward === "ACHIEVEMENT" && <div data-reward className="rewardAchievement"><i>★</i><b>ACHIEVEMENT</b><small>FIRST DISCOVERY</small></div>}{reward === "QUEST COMPLETE" && <div data-reward className="rewardQuest"><span>Recover the relic</span><b>QUEST COMPLETE</b></div>}{reward === "LEVEL UP" && <div data-reward className="rewardLevel"><i>◇</i><b>LEVEL 9</b><small>LEVEL UP</small></div>}</div><Controls reset={reset}>{(["ACHIEVEMENT", "QUEST COMPLETE", "LEVEL UP"] as const).map((value) => <button type="button" key={value} onClick={() => play(value)}>{value}</button>)}</Controls></div>;
}

function HitStopPreview({ active, reducedMotion }: PreviewProps) {
  const enemy = useRef<HTMLDivElement>(null); const flash = useRef<HTMLSpanElement>(null); const { stop, animate, later } = useRuntime(active); const [phase, setPhase] = useState("READY");
  const attack = (heavy: boolean) => { stop(); setPhase(heavy ? "HEAVY WINDUP" : "WINDUP"); const hold = reducedMotion ? 0 : heavy ? 110 : 60; later(() => { setPhase(`${hold}ms HIT STOP`); animate(flash.current, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 160 }); later(() => { setPhase(heavy ? "KNOCKBACK 64px" : "KNOCKBACK 32px"); animate(enemy.current, [{ transform: "translateX(0)" }, { transform: `translateX(${heavy ? 64 : 32}px)` }], { duration: reducedMotion ? 1 : 360, fill: "both", easing: "ease-out" }); }, hold); }, reducedMotion ? 0 : 180); };
  const reset = () => { stop(); setPhase("READY"); enemy.current?.getAnimations().forEach((a) => a.cancel()); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameHitStop" data-scene="hit-stop"><div className="hitFighter">⚔</div><span ref={flash} /><div ref={enemy} className="hitEnemy">■</div><output>{phase}</output></div><Controls reset={reset}><button type="button" onClick={() => attack(false)}>ATTACK</button><button type="button" onClick={() => attack(true)}>HEAVY ATTACK</button></Controls></div>;
}

function TimingPreview({ active, reducedMotion, dodge }: PreviewProps & { dodge: boolean }) {
  const hero = useRef<HTMLDivElement>(null); const warningAt = useRef(0); const { stop, animate, later } = useRuntime(active); const [phase, setPhase] = useState("READY");
  const warning = () => { stop(); warningAt.current = performance.now(); setPhase("WARNING"); later(() => setPhase("ACTIVE WINDOW"), reducedMotion ? 0 : 420); later(() => { if (warningAt.current) { warningAt.current = 0; setPhase(dodge ? "LATE · HIT" : "LATE · FAIL"); } }, reducedMotion ? 900 : 720); };
  const act = (side: -1 | 0 | 1) => { if (!warningAt.current) return setPhase("FAIL · NO ATTACK"); const result = judgeTiming(performance.now() - warningAt.current, 420, 680); warningAt.current = 0; stop(); const success = result === "PERFECT"; setPhase(success ? dodge ? `${side < 0 ? "LEFT" : "RIGHT"} · S-RANK` : "PERFECT PARRY" : `${result} · HIT`); if (!reducedMotion) animate(hero.current, dodge && success ? [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${side * 66}px)`, opacity: .55 }, { transform: `translateX(${side * 58}px)`, opacity: 1 }] : [{ transform: "scale(1)" }, { transform: `scale(${success ? 1.22 : .86})` }, { transform: "scale(1)" }], { duration: 420, fill: "both" }); };
  const reset = () => { stop(); warningAt.current = 0; setPhase("READY"); };
  return <div className="waapiPreviewGroup"><div className={`waapiPreviewStage gameScene ${dodge ? "gameDodge" : "gameParry"}`} data-scene={dodge ? "dodge" : "parry"}><div ref={hero} className="timingHero">◆{dodge && <><i /><i /><i /></>}</div><div className="timingThreat">!</div><div className="timingWindow" /><output>{phase}</output></div><Controls reset={reset}><button type="button" onClick={warning}>{dodge ? "ATTACK START" : "ENEMY ATTACK"}</button>{dodge ? <><button type="button" onClick={() => act(-1)}>DODGE LEFT</button><button type="button" onClick={() => act(1)}>DODGE RIGHT</button></> : <button type="button" onClick={() => act(0)}>PARRY</button>}</Controls></div>;
}

function LineClearPreview({ active, reducedMotion }: PreviewProps) {
  const stage = useRef<HTMLDivElement>(null);
  const { stop, animate } = useRuntime(active, reducedMotion);
  const [board, setBoard] = useState(() => [...initialBlocks]);
  const [phase, setPhase] = useState("READY");
  const before = useRef<Map<string, number>>(new Map());
  useLayoutEffect(() => {
    if (!reducedMotion) stage.current?.querySelectorAll<HTMLElement>("[data-block-id]").forEach(node => {
      const oldTop = before.current.get(node.dataset.blockId!);
      if (oldTop !== undefined) animate(node, [{ transform: `translateY(${oldTop - node.getBoundingClientRect().top}px)` }, { transform: "translateY(0)" }], { duration: 430, easing: "ease-out" });
    });
    before.current.clear();
  }, [board, animate, reducedMotion]);
  const drop = () => {
    stop(); before.current = new Map(Array.from(stage.current?.querySelectorAll<HTMLElement>("[data-block-id]") ?? []).map(node => [node.dataset.blockId!, node.getBoundingClientRect().top]));
    const next = dropAndCompact(board); setBoard(next.board);
    setPhase(next.cleared ? `CLEAR ${next.cleared} ROW → COMPACT` : next.dropped ? "DROP · NO COMPLETE ROW" : "NO SPACE · RESET TO RETRY");
  };
  const reset = () => { stop(); before.current.clear(); setBoard([...initialBlocks]); setPhase("READY"); };
  return <div className="waapiPreviewGroup"><div ref={stage} className="waapiPreviewStage gameScene gameLine" data-scene="line-clear"><div className="blockBoard">{board.map((block, i) => <i key={i} data-cell={i} data-block-id={block ?? undefined} className={block ? "isOccupied" : "isEmpty"} aria-label={`行${Math.floor(i / 5) + 1} 列${i % 5 + 1}: ${block ? "ブロック" : "空"}`} />)}</div><output>{phase}</output></div><Controls reset={reset}><button type="button" onClick={drop} disabled={board.includes("piece-top")}>DROP</button></Controls><p>縦2セルを落とし、完成行を消去。残った行を下へ詰めます。次の試行はRESET。</p></div>;
}

function MatchPreview({ active, reducedMotion }: PreviewProps) {
  const boardNode = useRef<HTMLDivElement>(null); const dragFrom = useRef<number | null>(null);
  const { stop, animate } = useRuntime(active, reducedMotion);
  const [board, setBoard] = useState(() => [...initialGems]);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<GemExchange | null>(null);
  const pending = useRef(false);
  const [phase, setPhase] = useState("SELECT TWO ADJACENT GEMS"); const [score, setScore] = useState(0);
  useLayoutEffect(() => {
    if (!pending.current || !result || !boardNode.current) return;
    pending.current = false;
    if (reducedMotion || !active) return;
    const cells = Array.from(boardNode.current.querySelectorAll<HTMLButtonElement>(":scope > button"));
    const rects = cells.map(node => node.getBoundingClientRect());
    const duration = 320 + result.chains * 580;
    const times = [0, 320];
    for (let chain = 0; chain < result.chains; chain++) times.push(320 + chain * 580 + 220, 320 + (chain + 1) * 580);
    boardNode.current.querySelectorAll<HTMLElement>("[data-gem-token]").forEach(node => {
      const id = Number(node.dataset.gemToken); let last = id;
      node.style.font = getComputedStyle(cells[id]).font;
      const frames: Keyframe[] = result.frames.map((tokens, frame) => {
        const index = tokens.findIndex(token => token?.id === id);
        if (index >= 0) last = index;
        return { offset: times[frame] / duration, transform: `translate(${rects[last].left - rects[id].left}px,${rects[last].top - rects[id].top}px)`, opacity: index < 0 ? 0 : 1 };
      });
      animate(node, frames, { duration, easing: "linear" });
    });
    // Only glyphs are hidden during replay; the final board remains the accessible state.
    cells.forEach(node => animate(node.querySelector("span"), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .999 }, { opacity: 1, offset: 1 }], { duration }));
  }, [result, active, reducedMotion, animate]);
  const choose = (index: number) => { stop(); if (board[index]) setSelected(value => value.includes(index) ? value.filter(i => i !== index) : [...value, index].slice(-2)); };
  const swap = (pair = selected) => {
    stop(); pending.current = false;
    if (pair.length !== 2) return setPhase("SELECT TWO ADJACENT GEMS");
    const next = exchangeGems(board, pair[0], pair[1]);
    pending.current = next.removed > 0;
    setResult(next); setBoard(next.board); setPhase(next.status); setScore(value => value + next.removed * 100); setSelected([]); dragFrom.current = null;
  };
  const reset = () => { stop(); pending.current = false; dragFrom.current = null; setResult(null); setBoard([...initialGems]); setSelected([]); setPhase("SELECT TWO ADJACENT GEMS"); setScore(0); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameMatch" data-scene="match3"><div ref={boardNode} className="matchBoard" onPointerDownCapture={stop} onFocusCapture={stop}>{board.map((gem, i) => <button type="button" key={i} aria-label={`行${Math.floor(i / 3) + 1} 列${i % 3 + 1}: ${gem ?? "空"}`} aria-pressed={selected.includes(i)} disabled={!gem} draggable={!!gem} onClick={() => choose(i)} onDragStart={() => { stop(); dragFrom.current = i; }} onDragEnd={() => { dragFrom.current = null; }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragFrom.current !== null) swap([dragFrom.current, i]); }}><span>{gem ?? "·"}</span></button>)}{result?.frames[0]?.map((token, i) => token && <span key={token.id} className="matchGhost" data-gem-token={token.id} aria-hidden="true" style={{ left: `${i % 3 * 41}px`, top: `${Math.floor(i / 3) * 41}px` }}>{token.gem}</span>)}</div><output aria-live="polite">{phase} · SCORE {score}</output>{result && result.steps.length > 0 && <small className="matchSteps">確定結果: {result.steps.map((step, i) => `${i + 1}段目 ${step.matched.length}石`).join(" → ")}</small>}</div><Controls reset={reset}><button type="button" onClick={() => swap()}>SWAP</button></Controls><p>縦横の隣接だけ交換。3石以上の一致を消去し、下へ詰めて再判定。1石100点、補充なし。不成立は戻します。例: 3行3列と4行3列で2段連鎖。結果は即時確定し、各石の交換・消去・落下を重ねて再生します。再操作・中断時は演出を止めて確定盤面を表示します。</p></div>;
}

function PinballPreview({ active, reducedMotion }: PreviewProps) {
  const ball = useRef<HTMLSpanElement>(null); const bumper = useRef<HTMLDivElement>(null); const { stop, animate, later } = useRuntime(active); const [score, setScore] = useState(0); const [phase, setPhase] = useState("READY");
  const launch = () => { stop(); setPhase("LAUNCH"); animate(ball.current, [{ transform: "translate(-50px,72px)" }, { transform: "translate(22px,4px)", offset: .56 }, { transform: "translate(-12px,-56px)" }], { duration: reducedMotion ? 1 : 760, fill: "both", easing: "cubic-bezier(.35,.1,.55,1)" }); later(() => { setPhase("BUMPER +500"); setScore((v) => v + 500); animate(bumper.current, [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 260 }); }, reducedMotion ? 0 : 430); };
  const reset = () => { stop(); setPhase("READY"); setScore(0); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gamePinball" data-scene="pinball"><div ref={bumper} className="pinBumper">500</div><span ref={ball} className="pinBall" /><i className="pinTrail" /><output>{phase} · SCORE {score}</output></div><Controls reset={reset}><button type="button" onClick={launch}>LAUNCH</button></Controls></div>;
}

const targets = [{ name: "SCOUT", distance: "18m" }, { name: "WARDEN", distance: "31m" }, { name: "DRONE", distance: "12m" }];
function LockonPreview({ active, reducedMotion }: PreviewProps) {
  const reticle = useRef<HTMLSpanElement>(null); const { stop, animate } = useRuntime(active, reducedMotion); const [index, setIndex] = useState(0);
  const previous = useRef<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (previous.current && reticle.current && !reducedMotion) {
      const next = reticle.current.getBoundingClientRect();
      animate(reticle.current, [{ transform: `translate(${previous.current.left - next.left}px, ${previous.current.top - next.top}px) scale(1.25)` }, { transform: "translate(0,0) scale(1)" }], { duration: 320 });
    }
    previous.current = null;
  }, [index, animate, reducedMotion]);
  const move = (delta: number) => { previous.current = reticle.current?.getBoundingClientRect() ?? null; stop(); setIndex(value => (value + delta + targets.length) % targets.length); };
  const reset = () => { stop(); previous.current = null; setIndex(0); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameLock" data-scene="lockon" tabIndex={0} aria-label="照準対象。左右キーで切替" onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); move(e.key === "ArrowLeft" ? -1 : 1); } }}><div className="lockTargets">{targets.map((item, i) => <i key={item.name} aria-label={item.name} aria-current={i === index ? "true" : undefined} className={i === index ? "isLocked" : ""}>◆{i === index && <span ref={reticle} className="lockReticle" aria-hidden="true" />}</i>)}</div><output>LOCKED · {targets[index].name} · {targets[index].distance}</output></div><Controls reset={reset}><button type="button" onClick={() => move(-1)}>PREVIOUS TARGET</button><button type="button" onClick={() => move(1)}>NEXT TARGET</button></Controls></div>;
}

function EquipPreview({ active, reducedMotion }: PreviewProps) {
  const slot = useRef<HTMLDivElement>(null); const { stop, animate } = useRuntime(active, reducedMotion); const [equipped, setEquipped] = useState(false);
  const from = useRef<DOMRect | null>(null); const item = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (equipped && slot.current && from.current && !reducedMotion) {
      const to = slot.current.getBoundingClientRect();
      animate(slot.current, [{ transform: `translate(${from.current.left - to.left}px,${from.current.top - to.top}px) scale(.7)` }, { transform: "translate(0,0) scale(1)" }], { duration: 420 });
    }
    from.current = null;
  }, [equipped, animate, reducedMotion]);
  const equip = () => { if (equipped) return; stop(); from.current = item.current?.getBoundingClientRect() ?? null; setEquipped(true); };
  const reset = () => { stop(); from.current = null; setEquipped(false); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameEquip" data-scene="equip">{!equipped ? <button ref={item} type="button" draggable onClick={equip} onDragStart={e => e.dataTransfer.setData("text/plain", "iron-blade")}>⚔ IRON BLADE</button> : <span className="inventoryEmpty">所持品なし</span>}<div ref={slot} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.getData("text/plain") === "iron-blade") equip(); }} className={equipped ? "equipSlot isFilled" : "equipSlot"}>{equipped ? "⚔ IRON BLADE" : "DROP"}</div><output>ATK {equipped ? "24 (+12)" : "12 (+0)"}</output></div><Controls reset={reset}><button type="button" onClick={equip} disabled={equipped}>EQUIP</button><button type="button" onClick={reset}>UNEQUIP</button></Controls></div>;
}

function StatusPreview({ active, reducedMotion }: PreviewProps) {
  const effectRef = useRef<HTMLDivElement>(null); const { stop, animate } = useRuntime(active); const [effect, setEffect] = useState("NORMAL");
  const apply = (value: string) => { stop(); setEffect(value); requestAnimationFrame(() => animate(effectRef.current, [{ opacity: 0, transform: "scale(.55)" }, { opacity: 1, transform: "scale(1)" }], { duration: reducedMotion ? 1 : 380, fill: "both" })); };
  const reset = () => { stop(); setEffect("NORMAL"); };
  return <div className="waapiPreviewGroup"><div className={`waapiPreviewStage gameScene gameStatus effect${effect}`} data-scene="status"><div className="statusHero">♟</div><div ref={effectRef} className="statusMaterial">{effect === "BURN" ? <><i>▲</i><i>▲</i><i>▲</i></> : effect === "FREEZE" ? <><b>◆</b><b>◆</b></> : effect === "POISON" ? <><span>●</span><span>●</span><span>●</span></> : null}</div><output>STATUS · {effect}</output></div><Controls reset={reset}>{["BURN", "FREEZE", "POISON"].map((value) => <button type="button" key={value} onClick={() => apply(value)}>{value}</button>)}<button type="button" onClick={reset}>CLEAR</button></Controls></div>;
}

const orders = { NORMALIZE: ["KNIGHT", "MAGE", "ROGUE"], HASTE: ["MAGE", "KNIGHT", "ROGUE"], STUN: ["KNIGHT", "ROGUE", "MAGE ⊘"] } as const;
function TurnPreview({ active, reducedMotion }: PreviewProps) {
  const list = useRef<HTMLOListElement>(null); const { stop, animate } = useRuntime(active); const [mode, setMode] = useState<keyof typeof orders>("NORMALIZE");
  const reorder = (value: keyof typeof orders) => { stop(); const before = new Map(Array.from(list.current?.children ?? []).map((node) => [(node as HTMLElement).dataset.unit, node.getBoundingClientRect().top])); setMode(value); requestAnimationFrame(() => Array.from(list.current?.children ?? []).forEach((node) => { const el = node as HTMLElement; const dy = (before.get(el.dataset.unit) ?? el.getBoundingClientRect().top) - el.getBoundingClientRect().top; animate(el, [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: reducedMotion ? 1 : 420 }); })); };
  const reset = () => reorder("NORMALIZE");
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameTurn" data-scene="turn-order"><ol ref={list}>{orders[mode].map((unit, i) => <li key={unit.replace(" ⊘", "")} data-unit={unit.replace(" ⊘", "")}><b>{i + 1}</b>{unit}</li>)}</ol><output>{mode} · DOM ORDER UPDATED</output></div><Controls reset={reset}>{(["HASTE", "STUN", "NORMALIZE"] as const).map((value) => <button type="button" key={value} onClick={() => reorder(value)}>{value}</button>)}</Controls></div>;
}

function BattlePreview({ active, reducedMotion }: PreviewProps) {
  const cover = useRef<HTMLDivElement>(null); const { stop, animate, later } = useRuntime(active); const [scene, setScene] = useState<"FIELD" | "BATTLE">("FIELD"); const [phase, setPhase] = useState("FIELD");
  const transition = (next: "FIELD" | "BATTLE") => { stop(); setPhase(next === "BATTLE" ? "ENCOUNTER" : "RETURN"); animate(cover.current, reducedMotion ? [{ opacity: 0 }, { opacity: 0 }] : [{ clipPath: "polygon(0 0,0 0,0 100%,0 100%)" }, { clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)", offset: .48 }, { clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%)" }], { duration: reducedMotion ? 1 : 920, fill: "both" }); later(() => setScene(next), reducedMotion ? 0 : 440); later(() => setPhase(next === "BATTLE" ? "READY" : "FIELD"), reducedMotion ? 5 : 930); };
  const reset = () => { stop(); setScene("FIELD"); setPhase("FIELD"); };
  return <div className="waapiPreviewGroup"><div className={`waapiPreviewStage gameScene gameBattle scene${scene}`} data-scene="battle"><div className="battleField">FIELD · PATH</div><div className="battleArena"><i>◆</i><b>VS</b><i>♜</i></div><div ref={cover} className="battleCover">BATTLE</div><output>{phase}</output></div><Controls reset={reset}><button type="button" onClick={() => transition("BATTLE")}>ENCOUNTER</button><button type="button" onClick={() => transition("FIELD")}>RETURN</button></Controls></div>;
}

function RacePreview({ active, reducedMotion }: PreviewProps) {
  const car = useRef<HTMLDivElement>(null); const { stop, animate, later } = useRuntime(active); const [count, setCount] = useState("READY"); const canLaunch = useRef(false);
  const start = () => { stop(); canLaunch.current = false; setCount("3"); const tick = reducedMotion ? 15 : 420; later(() => setCount("2"), tick); later(() => setCount("1"), tick * 2); later(() => { setCount("GO"); canLaunch.current = true; }, tick * 3); };
  const accelerate = () => { if (!canLaunch.current) { stop(); setCount("FALSE START"); return; } setCount("LAUNCH"); animate(car.current, [{ transform: "translateX(0)" }, { transform: "translateX(170px)" }], { duration: reducedMotion ? 1 : 780, fill: "both", easing: "cubic-bezier(.12,.7,.18,1)" }); };
  const reset = () => { stop(); canLaunch.current = false; setCount("READY"); };
  return <div className="waapiPreviewGroup"><div className="waapiPreviewStage gameScene gameRace" data-scene="race" tabIndex={0} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") accelerate(); }}><strong>{count}</strong><div className="raceTrack"><div ref={car} className="raceCar" /></div><output>{count === "FALSE START" ? "FALSE START · PENALTY · STOP" : count}</output></div><Controls reset={reset}><button type="button" onClick={start}>START</button><button type="button" onClick={accelerate}>ACCELERATE</button></Controls></div>;
}

const gameComponents: Partial<Record<SampleRenderKind, (props: PreviewProps) => ReactNode>> = {
  combat: CombatPreview, "reward-lab": RewardPreview, "hit-stop": HitStopPreview,
  parry: (props) => <TimingPreview {...props} dodge={false} />, dodge: (props) => <TimingPreview {...props} dodge />,
  "line-clear": LineClearPreview, match3: MatchPreview, pinball: PinballPreview, lockon: LockonPreview,
  equip: EquipPreview, "status-effects": StatusPreview, "turn-order": TurnPreview, "battle-transition": BattlePreview, race: RacePreview,
};

export function ExpandedGamePreview(props: PreviewProps) {
  const Component = gameComponents[props.sample.render];
  return Component ? <>{Component(props)}</> : null;
}

const workingStates: AiWorkingState[] = ["Starting", "Searching", "Reading", "Reasoning / Tool", "Writing", "Verifying"];
const aiFrames: Record<string, (index: number) => Keyframe[]> = {
  "ai-modular": (i) => [{ transform: `translateY(${8 + i * 2}px)`, opacity: .25 }, { transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-4px)", opacity: .55 }],
  "ai-ribbon": (i) => [{ transform: `rotate(${i % 2 ? 18 : -18}deg) scaleX(.45)` }, { transform: `rotate(${i % 2 ? -12 : 12}deg) scaleX(1)` }, { transform: `rotate(${i % 2 ? 18 : -18}deg) scaleX(.45)` }],
  "ai-code": (i) => [{ transform: "scaleX(.15)", opacity: .25 }, { transform: "scaleX(1)", opacity: 1 }, { transform: `scaleX(${.55 + i * .1})`, opacity: .55 }],
  "ai-sparkle": (i) => [{ transform: `rotate(${i * 90}deg) translateX(25px) scale(.4)` }, { transform: `rotate(${180 + i * 90}deg) translateX(8px) scale(1)` }, { transform: `rotate(${360 + i * 90}deg) translateX(25px) scale(.4)` }],
  "ai-warm": (i) => [{ transform: `scale(${.72 + i * .05})`, opacity: .35 }, { transform: `scale(${1.16 - i * .03})`, opacity: 1 }, { transform: `scale(${.72 + i * .05})`, opacity: .35 }],
  "ai-weave": (i) => [{ strokeDashoffset: 48 + i * 8, opacity: .25 }, { strokeDashoffset: 0, opacity: 1 }, { strokeDashoffset: -48 - i * 8, opacity: .45 }],
};

function AiGlyph({ kind, motionAttribute = "data-ai-part" }: { kind: SampleRenderKind; motionAttribute?: "data-ai-part" | "data-compare-motion" }) {
  const attr = { [motionAttribute]: "" };
  if (kind === "ai-modular") return <div className="aiGlyph aiModular">{["PLAN", "EDIT", "TEST"].map((label) => <i {...attr} key={label}>{label}</i>)}</div>;
  if (kind === "ai-ribbon") return <div className="aiGlyph aiRibbon">{[0, 1, 2].map((i) => <i {...attr} key={i} />)}</div>;
  if (kind === "ai-code") return <div className="aiGlyph aiCode"><i {...attr}>&lt;scan /&gt;</i><i {...attr}>tool.run()</i><i {...attr}>✓ tests</i></div>;
  if (kind === "ai-sparkle") return <div className="aiGlyph aiSparkle"><b>✦</b>{[0, 1, 2, 3].map((i) => <i {...attr} key={i}>·</i>)}</div>;
  if (kind === "ai-warm") return <div className="aiGlyph aiWarm"><i {...attr} /><i {...attr} /><b>thinking</b></div>;
  return <svg className="aiGlyph aiWeave" viewBox="0 0 120 70" aria-hidden="true"><circle cx="12" cy="14" r="4" /><circle cx="12" cy="56" r="4" /><circle cx="108" cy="35" r="6" /><path {...attr} d="M16 14 C50 14 60 35 102 35" /><path {...attr} d="M16 56 C50 56 60 35 102 35" /></svg>;
}

export function AiWorkingPreview({ sample, active, reducedMotion }: PreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null); const loops = useRef<Animation[]>([]); const [state, setState] = useState<AiWorkingState>("Idle");
  const stop = useCallback(() => { loops.current.forEach((animation) => animation.cancel()); loops.current = []; }, []);
  useEffect(() => { stop(); if (!active || reducedMotion || !workingStates.includes(state)) return; loops.current = Array.from(stageRef.current?.querySelectorAll<HTMLElement | SVGPathElement>("[data-ai-part]") ?? []).map((node, index) => node.animate(aiFrames[sample.render](index), { duration: Number(sample.normal.options.duration) + index * 80, delay: index * 70, easing: String(sample.normal.options.easing), iterations: Infinity })); return stop; }, [active, reducedMotion, sample, state, stop]);
  useEffect(() => stop, [stop]);
  const reset = () => { stop(); setState("Idle"); };
  return <div className="waapiPreviewGroup"><div ref={stageRef} className={`waapiPreviewStage waapiAiPreview waapiAiPreview--${sample.render}`} data-ai-state={state}><p>{state}</p><AiGlyph kind={sample.render} /><strong>{state === "Complete" ? "RESPONSE READY" : state === "Error" ? "ACTION NEEDED" : "WORKING CONTEXT"}</strong><output aria-live="polite">State: {state}</output></div><div className="waapiPreviewControls gameControls"><button type="button" onClick={() => setState("Starting")}>START</button><button type="button" onClick={() => setState((value) => nextAiState(value))}>NEXT PHASE</button><button type="button" onClick={() => setState("Complete")}>COMPLETE</button><button type="button" onClick={() => setState("Error")}>ERROR</button><button type="button" onClick={reset}>RESET</button></div></div>;
}

export function AiComparisonLab({ reducedMotion }: { reducedMotion: boolean }) {
  const [open, setOpen] = useState(false); const [phase, setPhase] = useState<AiComparisonPhase>("Idle"); const rootRef = useRef<HTMLDivElement>(null); const loops = useRef<Animation[]>([]);
  const stop = useCallback(() => { loops.current.forEach((animation) => animation.cancel()); loops.current = []; }, []);
  useEffect(() => { stop(); if (!open || reducedMotion || !workingStates.includes(phase as AiWorkingState)) return; loops.current = aiKinds.flatMap((kind) => Array.from(rootRef.current?.querySelectorAll<HTMLElement | SVGPathElement>(`[data-ai-kind="${kind}"] [data-compare-motion]`) ?? []).map((node, index) => node.animate(aiFrames[kind](index), { duration: 850 + index * 90, iterations: Infinity, easing: "ease-in-out" }))); return stop; }, [open, phase, reducedMotion, stop]);
  useEffect(() => stop, [stop]);
  const toggle = () => { if (open) { stop(); setPhase("Idle"); } setOpen((value) => !value); };
  return <section className="waapiAiComparison"><button type="button" aria-expanded={open} onClick={toggle}>AI 6種の共通フェーズ比較を{open ? "閉じる" : "開く"}</button>{open && <div ref={rootRef}><header><p>{aiPhases.map((item) => <span className={item === phase ? "isCurrent" : ""} key={item}>{item}</span>)}</p><div><button type="button" onClick={() => setPhase("Starting")}>START ALL</button><button type="button" onClick={() => setPhase((value) => nextComparisonPhase(value))}>NEXT ALL</button><button type="button" onClick={() => setPhase("Complete")}>COMPLETE ALL</button><button type="button" onClick={() => setPhase("Error")}>ERROR ALL</button><button type="button" onClick={() => setPhase("Idle")}>RESET ALL</button></div></header><div className="waapiAiComparisonGrid">{aiKinds.map((kind) => <article key={kind} data-ai-kind={kind} className={`waapiAiMini waapiAiPreview--${kind}`}><AiGlyph kind={kind} motionAttribute="data-compare-motion" /><strong>{kind.replace("ai-", "")}</strong><output>{phase}</output></article>)}</div></div>}</section>;
}
