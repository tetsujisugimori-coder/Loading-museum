"use client";

import { useEffect, useState } from "react";

export type AppleDemoPhase = "idle" | "running" | "paused" | "complete";
export type AppleDemoSpeed = "slow" | "normal" | "fast";
export type AppleDemoProps = { active: boolean; prefersReducedMotion: boolean };

const SPEED_FACTORS: Record<AppleDemoSpeed, number> = {
  slow: 1.65,
  normal: 1,
  fast: 0.55,
};

type AppleSequenceOptions = {
  active: boolean;
  baseDelay: number;
  prefersReducedMotion: boolean;
  stepCount: number;
};

export function useAppleSequence(options: AppleSequenceOptions | number, demoProps?: AppleDemoProps) {
  const { active, baseDelay, prefersReducedMotion, stepCount } = typeof options === "number"
    ? { ...demoProps!, baseDelay: 420, stepCount: options }
    : options;
  const finalStep = Math.max(0, stepCount - 1);
  const [phase, setPhase] = useState<AppleDemoPhase>("idle");
  const [step, setStep] = useState(0);
  const [speed, setSpeed] = useState<AppleDemoSpeed>("normal");
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    const motionTimer = window.setTimeout(() => {
      setStep(finalStep);
      setPhase("complete");
    }, 0);
    return () => window.clearTimeout(motionTimer);
  }, [finalStep, prefersReducedMotion]);

  useEffect(() => {
    if (!active || prefersReducedMotion || phase !== "running") return;

    if (step >= finalStep) {
      if (loop) {
        const loopTimer = window.setTimeout(() => setStep(0), baseDelay * SPEED_FACTORS[speed]);
        return () => window.clearTimeout(loopTimer);
      }
      const completeTimer = window.setTimeout(() => setPhase("complete"), 0);
      return () => window.clearTimeout(completeTimer);
    }

    const timer = window.setTimeout(
      () => setStep((current) => Math.min(finalStep, current + 1)),
      baseDelay * SPEED_FACTORS[speed],
    );
    return () => window.clearTimeout(timer);
  }, [active, baseDelay, finalStep, loop, phase, prefersReducedMotion, speed, step]);

  const play = () => {
    if (prefersReducedMotion) {
      setStep(finalStep);
      setPhase("complete");
      return;
    }
    setStep((current) => phase === "complete" ? 0 : current);
    setPhase("running");
  };

  const pause = () => setPhase("paused");
  const reset = () => {
    setStep(prefersReducedMotion ? finalStep : 0);
    setPhase(prefersReducedMotion ? "complete" : "idle");
  };

  return {
    loop,
    pause,
    phase,
    play,
    reset,
    setLoop,
    setSpeed,
    speed,
    step,
  };
}

type AppleSequence = ReturnType<typeof useAppleSequence>;
type AppleDemoControlsProps = {
  label: string;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  onPause: () => void;
  onPlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: AppleDemoSpeed) => void;
  phase: AppleDemoPhase;
  showLoop?: boolean;
  speed: AppleDemoSpeed;
} | { label: string; sequence: AppleSequence; showLoop?: boolean };

export function AppleDemoControls(props: AppleDemoControlsProps) {
  const label = props.label;
  const showLoop = props.showLoop ?? true;
  const sequence = "sequence" in props ? props.sequence : null;
  const loop = sequence?.loop ?? ("loop" in props ? props.loop : false);
  const onLoopChange = sequence?.setLoop ?? ("onLoopChange" in props ? props.onLoopChange : () => undefined);
  const onPause = sequence?.pause ?? ("onPause" in props ? props.onPause : () => undefined);
  const onPlay = sequence?.play ?? ("onPlay" in props ? props.onPlay : () => undefined);
  const onReset = sequence?.reset ?? ("onReset" in props ? props.onReset : () => undefined);
  const onSpeedChange = sequence?.setSpeed ?? ("onSpeedChange" in props ? props.onSpeedChange : () => undefined);
  const phase = sequence?.phase ?? ("phase" in props ? props.phase : "idle");
  const speed = sequence?.speed ?? ("speed" in props ? props.speed : "normal");
  const running = phase === "running";
  const playLabel = phase === "paused" ? "再開" : phase === "complete" ? "再実行" : "再生";

  return (
    <div className="appleDemoControls" role="group" aria-label={`${label}の再生操作`}>
      <button type="button" onClick={onPlay} disabled={running} aria-label={`${label}を${playLabel}`}>
        {playLabel}
      </button>
      <button type="button" onClick={onPause} disabled={!running} aria-label={`${label}を一時停止`}>
        一時停止
      </button>
      <button type="button" onClick={onReset} aria-label={`${label}をリセット`}>
        リセット
      </button>
      <label>
        速度
        <select value={speed} onChange={(event) => onSpeedChange(event.target.value as AppleDemoSpeed)} aria-label={`${label}の速度`}>
          <option value="slow">ゆっくり</option>
          <option value="normal">標準</option>
          <option value="fast">速い</option>
        </select>
      </label>
      {showLoop ? (
        <label className="appleLoopControl">
          <input type="checkbox" checked={loop} onChange={(event) => onLoopChange(event.target.checked)} />
          ループ
        </label>
      ) : null}
      <span className="appleDemoPhase" data-phase={phase} aria-live="polite">
        {phase === "idle" ? "待機中" : phase === "running" ? "実行中" : phase === "paused" ? "一時停止中" : "完了"}
      </span>
    </div>
  );
}
