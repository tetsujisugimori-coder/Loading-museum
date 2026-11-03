"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { WaapiSample } from "../data/waapiSamples";
import { clampObservationTime, OBSERVATION_STEP_MS } from "./WaapiGameObservation";
import { judgeTiming, timingEffectFrames, TIMING_WINDOW_START, TIMING_WINDOW_END, TIMING_EFFECT_DURATION, TIMING_OBSERVATION_DURATION } from "./waapi-timing-model";
import "./waapi-timing-observation.css";

type Scenario = { input: number; side: -1 | 0 | 1; result: ReturnType<typeof judgeTiming> };
type State = "paused" | "running" | "finished" | "inactive";
const INPUT_LIMIT = 1000;
const initialScenario = (dodge: boolean): Scenario => ({ input: 550, side: dodge ? 1 : 0, result: judgeTiming(550) });

/** A separate, simulated attack clock. This component receives no game mutation callbacks. */
export function WaapiTimingObservation({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const dodge = sample.render === "dodge";
  const [scenario, setScenario] = useState<Scenario>(() => initialScenario(dodge));
  const [draftInput, setDraftInput] = useState(550);
  const [draftSide, setDraftSide] = useState<-1 | 0 | 1>(dodge ? 1 : 0);
  const [time, setTime] = useState(0);
  const [state, setState] = useState<State>("paused");
  const [hidden, setHidden] = useState(false);
  const [native, setNative] = useState<{ state: AnimationPlayState | "unavailable"; time: number | null }>({ state: "idle", time: null });
  const hero = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const position = useRef(0);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const enabled = active && !hidden;
  const enabledRef = useRef(enabled);
  const reducedRef = useRef(reducedMotion);
  const scenarioRef = useRef(scenario);

  const stopClock = useCallback(() => {
    generation.current += 1;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const present = useCallback((value: number) => {
    const at = clampObservationTime(value, TIMING_OBSERVATION_DURATION);
    position.current = at;
    setTime(at);
    const a = animation.current;
    if (a) {
      // fill:none restores the normal game's base DOM at the effect's end.
      a.pause();
      a.currentTime = clampObservationTime(at - scenarioRef.current.input, TIMING_EFFECT_DURATION);
      setNative({ state: a.playState, time: typeof a.currentTime === "number" ? a.currentTime : null });
    }
  }, []);
  // Synchronize the UI after creating/cancelling the external WAAPI resource.
  const readNative = useCallback((controller: State, availableContext = true) => {
    const a = animation.current;
    setState(controller);
    setNative({ state: a?.playState ?? (availableContext ? "unavailable" : "idle"), time: typeof a?.currentTime === "number" ? a.currentTime : null });
  }, []);
  const release = useCallback(() => {
    stopClock();
    animation.current?.cancel();
    animation.current = null;
  }, [stopClock]);

  useLayoutEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
    reducedRef.current = reducedMotion;
    scenarioRef.current = scenario;
    release();
    const node = hero.current;
    if (!enabled || !node || typeof node.animate !== "function") {
      readNative(enabled ? "paused" : "inactive", enabled);
      return release;
    }
    const a = node.animate(timingEffectFrames(dodge, scenario.result, scenario.side), { duration: TIMING_EFFECT_DURATION, fill: "none" });
    animation.current = a;
    present(position.current);
    readNative("paused");
    const token = generation.current;
    // Read actual native pause completion; stale promises cannot overwrite a new scenario.
    void a.ready?.then(() => {
      if (token === generation.current && animation.current === a) {
        setNative({ state: a.playState, time: typeof a.currentTime === "number" ? a.currentTime : null });
      }
    }, () => { /* cancellation is not completion */ });
    return release;
  }, [dodge, enabled, present, readNative, reducedMotion, release, scenario]);

  const seek = (value: number) => {
    if (!enabledRef.current) return;
    stopClock();
    present(value);
    setState(position.current >= TIMING_OBSERVATION_DURATION ? "finished" : "paused");
  };
  const play = () => {
    if (!enabledRef.current || reducedRef.current || document.hidden) return;
    stopClock();
    const from = position.current >= TIMING_OBSERVATION_DURATION ? 0 : position.current;
    const started = performance.now();
    const token = generation.current;
    present(from);
    setState("running");
    const tick = (now: number) => {
      if (token !== generation.current || !enabledRef.current || reducedRef.current || document.hidden) return;
      present(from + now - started);
      if (position.current >= TIMING_OBSERVATION_DURATION) { frame.current = null; setState("finished"); }
      else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const commitInput = (input: number) => {
    if (!enabledRef.current) return;
    stopClock();
    const value = clampObservationTime(input, INPUT_LIMIT);
    setDraftInput(value);
    setScenario({ input: value, side: draftSide, result: judgeTiming(value) });
    setState("paused");
  };
  const reset = () => {
    stopClock();
    const next = initialScenario(dodge);
    position.current = 0;
    setTime(0);
    setDraftInput(next.input);
    setDraftSide(next.side);
    setScenario(next);
    setState("paused");
  };
  const beforeInput = time < scenario.input;
  const effectEnded = time >= scenario.input + TIMING_EFFECT_DURATION;
  const phase = beforeInput ? "入力前・演出未開始" : effectEnded ? "演出終了・基底表示へ復帰" : "判定確定済み・演出中";
  const windowPhase = judgeTiming(time);
  const disabled = !enabled;
  const scale = (value: number) => value / TIMING_OBSERVATION_DURATION * 1000;
  const resultText = scenario.result === "PERFECT" ? dodge ? "成功 S-RANK" : "成功 PERFECT PARRY" : scenario.result === "EARLY" ? "失敗 EARLY · HIT" : "失敗 LATE · HIT";

  return <section className="waapiObservation waapiTimingObservation" aria-label={`${sample.name} 観察モード`} data-controller={state} data-timing-result={scenario.result} data-timing-input={scenario.input} data-timing-time={time} data-timing-phase={beforeInput ? "before-input" : effectEnded ? "effect-ended" : "effect-running"}>
    <p><strong>観察専用の入力シミュレーション</strong>。通常ゲームの時計・入力・確定結果とは別です。まず成功する時刻を予想し、入力を確定してから時間軸を動かそう。</p>
    <div className={`waapiPreviewStage gameScene waapiObservationStage ${dodge ? "gameDodge" : "gameParry"}`} data-timing-stage>
      <div ref={hero} className="timingHero" aria-hidden="true" data-timing-hero data-timing-trails={dodge ? 3 : 0}>◆{dodge && <><i /><i /><i /></>}</div>
      <div className="timingThreat" aria-hidden="true">!</div><div className="timingWindow" aria-hidden="true" />
      <output>{beforeInput ? "SIMULATION · 入力前" : resultText}</output>
    </div>
    <svg className="timingAxis" viewBox="0 0 1000 240" role="img" aria-label={`攻撃開始0ms、成功窓${TIMING_WINDOW_START}から${TIMING_WINDOW_END}ms、確定入力${scenario.input}ms、演出終了${scenario.input + TIMING_EFFECT_DURATION}ms、観察位置${time.toFixed(2)}ms`}>
      <rect x="0" y="20" width="1000" height="26" className="timingAxisBase" />
      <rect x={scale(TIMING_WINDOW_START)} y="20" width={scale(TIMING_WINDOW_END - TIMING_WINDOW_START)} height="26" className="timingAxisWindow" />
      <rect x={scale(scenario.input)} y="110" width={scale(TIMING_EFFECT_DURATION)} height="22" className="timingAxisEffect" />
      <line x1={scale(scenario.input)} x2={scale(scenario.input)} y1="12" y2="185" className="timingAxisInput" />
      <line x1={scale(time)} x2={scale(time)} y1="0" y2="185" className="timingAxisCursor" />
      <text x="4" y="90">判定時間窓</text><text x="4" y="176">入力後の演出 420ms</text>
      <text x="4" y="225">0ms</text><text x={scale(420)} y="225" textAnchor="middle">420</text><text x={scale(680)} y="225" textAnchor="middle">680</text><text x="996" y="225" textAnchor="end">1420ms</text>
    </svg>
    <p className="timingLegend">緑の帯＝成功窓（{TIMING_WINDOW_START}〜{TIMING_WINDOW_END}ms、両端を含む）／白の破線＝確定入力／青の帯＝入力後の演出／黄の線＝観察位置。判定窓と演出の帯は別です。</p>
    <fieldset className="timingInputPlan" disabled={disabled}>
      <legend>1. 入力時刻を決める（通常ゲームへの入力ではありません）</legend>
      <label>シミュレーション入力時刻（ms）<input aria-label="シミュレーション入力時刻（ms）" type="number" min={0} max={INPUT_LIMIT} step="any" value={draftInput} onChange={(event) => setDraftInput(clampObservationTime(Number(event.target.value), INPUT_LIMIT))} /></label>
      {dodge && <label>シミュレーション回避方向<select aria-label="シミュレーション回避方向" value={draftSide} onChange={(event) => setDraftSide(Number(event.target.value) as -1 | 1)}><option value={-1}>LEFT</option><option value={1}>RIGHT</option></select></label>}
      <div className="waapiPreviewControls">
        <button type="button" onClick={() => setDraftInput(419)}>早い入力 419ms</button><button type="button" onClick={() => setDraftInput(550)}>成功を予想 550ms</button><button type="button" onClick={() => setDraftInput(681)}>遅い入力 681ms</button>
        <button type="button" onClick={() => commitInput(draftInput)}>この入力を確定</button><button type="button" disabled={time > INPUT_LIMIT} onClick={() => commitInput(position.current)}>現在位置で入力を確定</button>
      </div>
      <p>時刻・方向の編集は候補だけを変えます。「確定」で別の試行を作ります。入力は0〜1000ms、観察は演出終了まで1420ms。初期例は550msです。</p>
    </fieldset>
    <output className="timingResult" aria-live="polite" data-timing-committed>確定シミュレーション：{scenario.input.toFixed(2)}ms{dodge ? scenario.side < 0 ? " LEFT" : " RIGHT" : ""} → {resultText}。巻き戻してもこの判定記録は変わりません。</output>
    <div className="waapiPreviewControls">
      <button type="button" disabled={disabled || reducedMotion} onClick={play}>再生 / 再開</button><button type="button" disabled={disabled} onClick={() => seek(position.current)}>一時停止</button>
      <button type="button" disabled={disabled} onClick={() => seek(0)}>観察位置を先頭へ</button>
      <button type="button" disabled={disabled || time <= 0} onClick={() => seek(position.current - OBSERVATION_STEP_MS)}>1ステップ戻る</button><button type="button" disabled={disabled || time >= TIMING_OBSERVATION_DURATION} onClick={() => seek(position.current + OBSERVATION_STEP_MS)}>1ステップ進む</button>
      <button type="button" disabled={disabled} onClick={reset}>観察Reset</button>
    </div>
    <label>観察時間（ms）<input aria-label="観察時間（ms）" type="range" min={0} max={TIMING_OBSERVATION_DURATION} step="any" value={time} disabled={disabled} onChange={(event) => seek(Number(event.target.value))} /></label>
    <output data-observation-reading aria-live="off">観察時計 {time.toFixed(2)} / {TIMING_OBSERVATION_DURATION}ms · {state} · 成功窓との位置：{windowPhase} · {phase} · 演出の経過 {beforeInput ? "未開始" : `${Math.min(TIMING_EFFECT_DURATION, time - scenario.input).toFixed(2)} / ${TIMING_EFFECT_DURATION}ms`} · native currentTime: {native.time === null ? "未取得" : `${native.time.toFixed(2)}ms`} · native playState: {native.state}</output>
    <p>2. 時間軸で入力前→入力瞬間→演出終了を比べよう。観察時計だけが進み、native AnimationはpauseしたままcurrentTimeを指定します。1ステップは1000/60ms（表示機器の更新周波数ではありません）。入力前のnative 0msは準備位置で、判定発生を意味しません。</p>
    <p>{dodge ? "3. 成功でも残像が消えたとは判定しません。現行の残像は本体内の3枚の固定輪郭で、本体と一緒に動きます。個別の生成・消滅タイマーはなく、演出終了後も輪郭は残ります。成功時は左右へ移動し、EARLY/LATEでは縮小します。" : "3. 成功は入力した瞬間に確定し、その後も420msの拡大演出が続きます。EARLY/LATEでは縮小します。演出が終わることと成功判定は別の出来事です。"}</p>
    <p>4. 419msと420ms、680msと681msを入力候補にして確定し、境界の違いを比べよう。先頭復帰・seekは確定した試行を読み返すだけ。観察Resetだけが550msの初期例に戻します。</p>
    {reducedMotion && <p>動き低減中：連続再生は停止します。時間指定と明示的なコマ送りで静止状態を観察できます。設定を解除しても自動再開しません。</p>}
    {native.state === "unavailable" && <p>WAAPIが利用できないため、実アニメーションの観察は未対応です。時間窓と判定のシミュレーションは利用できますが、native値や動きを再現済みとは扱いません。</p>}
    <details><summary>判定と演出を分けるコード</summary><pre>{`// 通常ゲームと同じ判定・演出関数を使う独立シミュレーション\nconst result = judgeTiming(inputMs); // 420 <= inputMs <= 680\n// 結果を保存。seekしても再判定しない\nconst effectMs = Math.max(0, Math.min(420, observationMs - inputMs));\nanimation.pause();\nanimation.currentTime = effectMs; // 表示だけ\n// 通常ゲームの入力・状態を更新するcallbackは受け取らない`}</pre></details>
  </section>;
}
