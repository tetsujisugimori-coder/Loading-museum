"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { WaapiSample } from "../data/waapiSamples";

export const OBSERVATION_STEP_MS = 1000 / 60;
export function clampObservationTime(value: number, duration: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(duration, value)) : 0;
}

type ControllerState = "paused" | "running" | "finished" | "inactive" | "unavailable";
type Reading = { rawTime: number | null; time: number; controller: ControllerState; native: AnimationPlayState | "unavailable"; pending: boolean };

/** Isolated presentation only: no game state or award callbacks are accepted. */
export function WaapiGameObservation({ sample, active, reducedMotion }: { sample: WaapiSample; active: boolean; reducedMotion: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const raf = useRef<number | null>(null);
  const generation = useRef(0);
  const time = useRef(0);
  const duration = Number(sample.normal.options.duration);
  const [reading, setReading] = useState<Reading>({ rawTime: null, time: 0, controller: "paused", native: "idle", pending: false });
  const [easing, setEasing] = useState("cubic-bezier(.2,.8,.2,1)");
  const [hidden, setHidden] = useState(false);
  const enabled = active && !hidden;
  const enabledRef = useRef(enabled);
  const reducedRef = useRef(reducedMotion);
  const [revision, setRevision] = useState(0);

  const stopPolling = useCallback(() => {
    generation.current += 1;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);
  const read = useCallback((controller?: ControllerState) => {
    const a = animation.current;
    if (!a) return;
    const nativeTime = a.currentTime;
    const rawTime = typeof nativeTime === "number" && Number.isFinite(nativeTime) ? nativeTime : null;
    const current = rawTime === null ? time.current : clampObservationTime(rawTime, duration);
    time.current = current;
    setReading({ rawTime, time: current, controller: controller ?? (a.playState === "running" ? "running" : current >= duration ? "finished" : "paused"), native: a.playState, pending: a.pending });
  }, [duration]);
  const readWhenReady = useCallback((a: Animation) => {
    const token = generation.current;
    void a.ready?.then(() => {
      if (token === generation.current && animation.current === a) read();
    }, () => { /* cancel rejects ready; it is not completion */ });
  }, [read]);
  const release = useCallback(() => {
    stopPolling();
    const a = animation.current;
    if (a && typeof a.currentTime === "number") time.current = clampObservationTime(a.currentTime, duration);
    animation.current = null;
    a?.cancel();
  }, [duration, stopPolling]);

  useLayoutEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
    reducedRef.current = reducedMotion;
    release();
    if (!enabled) {
      setReading({ rawTime: null, time: time.current, controller: "inactive", native: "idle", pending: false });
      return;
    }
    const stage = root.current;
    const target = stage?.querySelector<HTMLElement>("[data-observation-target]");
    if (!stage || !target || typeof target.animate !== "function") {
      setReading({ rawTime: null, time: time.current, controller: "unavailable", native: "unavailable", pending: false });
      return;
    }
    // Base DOM is the destination. Measurement never includes an old WAAPI transform.
    let frames = sample.normal.keyframes;
    if (sample.render === "menu") {
      const first = stage.querySelector<HTMLElement>("[data-observation-start]")!;
      const last = stage.querySelector<HTMLElement>("[data-observation-end]")!;
      const delta = first.getBoundingClientRect().top - last.getBoundingClientRect().top;
      frames = [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0px)" }];
    } else {
      const goal = stage.querySelector<HTMLElement>("[data-observation-goal]")!;
      const from = target.getBoundingClientRect();
      const to = goal.getBoundingClientRect();
      target.style.setProperty("--coin-x", `${to.left - from.left}px`);
      target.style.setProperty("--coin-y", `${to.top - from.top}px`);
    }
    const a = target.animate(frames, { ...sample.normal.options, duration, delay: 0, iterations: 1, fill: "both", easing: sample.render === "menu" ? easing : sample.normal.options.easing });
    animation.current = a;
    a.pause();
    a.currentTime = time.current;
    read();
    readWhenReady(a);
    // Resize/font/CSS text expansion changes the measured scenario, not game state.
    // Ignore the observer's initial delivery; otherwise re-creation would loop.
    let initial = true;
    const measuredResize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (initial) { initial = false; return; }
      setRevision((n) => n + 1);
    });
    stage.querySelectorAll<HTMLElement>("[data-observation-measure]").forEach((node) => measuredResize?.observe(node));
    const fontChange = () => setRevision((n) => n + 1);
    document.fonts?.addEventListener("loadingdone", fontChange);
    return () => { measuredResize?.disconnect(); document.fonts?.removeEventListener("loadingdone", fontChange); release(); };
  }, [duration, easing, enabled, read, readWhenReady, reducedMotion, release, revision, sample]);

  const seek = (value: number) => {
    stopPolling();
    const a = animation.current;
    if (!a || !enabledRef.current) return;
    a.pause();
    a.currentTime = clampObservationTime(value, duration);
    read();
    readWhenReady(a);
  };
  const step = (delta: number) => {
    const current = animation.current?.currentTime;
    seek((typeof current === "number" ? clampObservationTime(current, duration) : time.current) + delta);
  };
  const pause = () => {
    stopPolling();
    const a = animation.current;
    if (!a) return;
    // Native pause may be pending until a later rendering opportunity.
    // Pin the time sampled at input, not a later frame or the last display sample.
    const atInput = a.currentTime;
    a.pause();
    if (typeof atInput === "number" && Number.isFinite(atInput)) a.currentTime = atInput;
    read("paused");
    readWhenReady(a);
  };
  const play = (restart = false) => {
    const a = animation.current;
    if (!a || !enabledRef.current || reducedRef.current || document.hidden) return;
    stopPolling();
    if (restart || time.current >= duration) a.currentTime = 0;
    a.play();
    read("running");
    readWhenReady(a);
    const token = generation.current;
    const tick = () => {
      if (token !== generation.current || animation.current !== a) return;
      read();
      if (a.playState === "running" || a.pending) raf.current = requestAnimationFrame(tick);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(tick);
  };
  const disabled = !enabled || reading.controller === "unavailable";
  const progress = duration ? reading.time / duration * 100 : 0;
  const position = reading.time === 0 ? "開始位置" : reading.time >= duration ? "終了位置" : "移動途中";
  return <section className="waapiObservation" aria-label={`${sample.name} 観察モード`} data-controller={reading.controller}>
    <p>観察専用プレビュー。本体の選択・得点は変えません。まず中間位置を予想し、停止・コマ送りで確かめよう。</p>
    <div ref={root} className="waapiPreviewStage waapiObservationStage" data-observation-stage>
      {sample.render === "menu" ? <div className="gameMenu" data-observation-measure>{["CONTINUE", "COLLECTION", "SETTINGS"].map((label, i) => <span key={label} data-observation-measure data-observation-start={i === 0 ? "" : undefined} data-observation-end={i === 2 ? "" : undefined}>{i === 2 && <i data-observation-target aria-hidden="true">▶</i>}{label}</span>)}</div> : <div className="gameCoinScene" data-observation-measure><span className="observationCoin" data-observation-target aria-hidden="true">¢</span><span className="observationGoal" data-observation-goal data-observation-measure>GOAL（加点なし）</span></div>}
    </div>
    {sample.render === "menu" && <label>観察のeasing<select aria-label="観察のeasing" value={easing} onChange={(e) => setEasing(e.target.value)}><option value="cubic-bezier(.2,.8,.2,1)">ease-out</option><option value="linear">linear</option></select></label>}
    <div className="waapiPreviewControls">
      <button type="button" disabled={disabled || reducedMotion} onClick={() => play()}>再生 / 再開</button>
      <button type="button" disabled={disabled} onClick={pause}>一時停止</button>
      <button type="button" disabled={disabled || reducedMotion} onClick={() => play(true)}>最初から再生</button>
      <button type="button" disabled={disabled} onClick={() => seek(0)}>観察位置を先頭へ</button>
      <button type="button" disabled={disabled || reading.time <= 0} onClick={() => step(-OBSERVATION_STEP_MS)}>1ステップ戻る</button>
      <button type="button" disabled={disabled || reading.time >= duration} onClick={() => step(OBSERVATION_STEP_MS)}>1ステップ進む</button>
    </div>
    <label>観察時間（ms）<input aria-label="観察時間（ms）" type="range" min={0} max={duration} step="any" value={reading.time} disabled={disabled} onChange={(e) => seek(Number(e.target.value))} /></label>
    <output data-observation-reading>観察位置 {reading.time.toFixed(2)} / {duration} ms · {progress.toFixed(1)}% · {position} · controller: {reading.controller} · native currentTime: {reading.rawTime === null ? "未取得（null）" : `${reading.rawTime.toFixed(2)} ms`} · native playState: {reading.native}{reading.pending ? "（pending）" : ""}</output>
    {reducedMotion && <p>動き低減中：連続再生はしません。コマ送り・時間指定は利用できます。解除だけでは再開しません。</p>}
    {reading.controller === "unavailable" && <p>この環境ではWAAPIを取得できず観察操作は利用できません。模擬値を実測として表示しません。</p>}
    <p>観察位置と進捗は0〜duration内に制限し、native currentTimeは取得した実値を小数2桁で別表示します。再生は時間が進み、一時停止はその位置を保持。1ステップは仮想60fps相当の1000/60msで、ディスプレイの更新周波数ではありません。先頭へ戻す操作は観察だけをリセットします。</p>
    <p>{sample.render === "menu" ? "CONTINUE → SETTINGSの独立シナリオ。ease-outは通常と同じ減速、linearは等速。easingは途中の速さを変え、終了位置はSETTINGS行へのDOM所属で決まります。通常の選択は別の状態です。" : "弧の高さ・透明度を時間指定で確認。終点に到達しても得点は増えません。通常モードのCOLLECTだけが得点を確定します。"}</p>
    <details><summary>観察コードの要点</summary><pre>{`// 独立したプレビューDOMだけを操作\nconst a = preview.animate(frames, { duration: ${duration}, iterations: 1, fill: 'both' });\na.pause(); a.currentTime = ms; // 0〜durationに制限\n// 再開: a.play()\n// 一時停止: 入力時のnative時刻を固定する\nconst t = a.currentTime; a.pause();\nif (typeof t === 'number' && Number.isFinite(t)) a.currentTime = t;\n// 終了位置からもpause→currentTimeで戻れる\n// 取消: a.cancel()。ゲームの状態更新は呼ばない。`}</pre></details>
  </section>;
}
