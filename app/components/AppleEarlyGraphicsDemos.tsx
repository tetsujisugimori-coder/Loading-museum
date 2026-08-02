"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppleDemoControls,
  useAppleSequence,
  type AppleDemoProps,
} from "./AppleEarlyDemoControls";

const lowResolutionPalette = ["#111315", "#e4a52c", "#d8592e", "#79a246", "#537bb5", "#ece2bd"];

export function LowResolutionGraphicsDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(12, props);
  const visibleCells = Math.round(((sequence.step + 1) / 12) * 96);

  return (
    <div className="appleDemo appleLowResolutionDemo">
      <div className="appleLowResolutionGrid" role="img" aria-label="低解像度の色ブロックが左上から順に描かれる再現">
        {Array.from({ length: 96 }, (_, index) => {
          const x = index % 12;
          const y = Math.floor(index / 12);
          const color = lowResolutionPalette[(x * 2 + y * 3) % lowResolutionPalette.length];
          return <span key={index} style={{ backgroundColor: index < visibleCells ? color : "#090a0a" }} />;
        })}
      </div>
      <output className="appleStatusReadout" aria-live="polite">
        DRAWING BLOCK {Math.min(visibleCells, 96).toString().padStart(2, "0")} / 96
      </output>
      <AppleDemoControls label="ローレゾ風グラフィック描画" sequence={sequence} />
    </div>
  );
}

const speedFactors = { slow: 0.55, normal: 1, fast: 1.75 } as const;

export function HighResolutionGraphicsDemo({ active, prefersReducedMotion }: AppleDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState<"idle" | "running" | "paused" | "complete">(
    prefersReducedMotion ? "complete" : "idle",
  );
  const [speed, setSpeed] = useState<keyof typeof speedFactors>("normal");
  const [loop, setLoop] = useState(false);

  const draw = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#080a09";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d9a64a";
    context.lineWidth = 3;
    context.beginPath();
    const maxX = canvas.width * progress;
    for (let x = 0; x <= maxX; x += 3) {
      const y = canvas.height / 2 + Math.sin(x / 25) * 43 + Math.sin(x / 9) * 8;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.strokeStyle = "#668e71";
    context.lineWidth = 1;
    for (let x = 0; x < maxX; x += 28) {
      context.beginPath();
      context.arc(x, canvas.height / 2, 11 + (x % 56) / 5, 0, Math.PI * 2);
      context.stroke();
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      progressRef.current = 1;
      draw(1);
      const motionTimer = window.setTimeout(() => setPhase("complete"), 0);
      return () => window.clearTimeout(motionTimer);
    }
  }, [draw, prefersReducedMotion]);

  useEffect(() => {
    draw(progressRef.current);
  }, [draw]);

  useEffect(() => {
    if (!active || phase !== "running" || prefersReducedMotion) return;
    const animate = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      progressRef.current += ((time - lastTime) / 2_800) * speedFactors[speed];
      lastTimeRef.current = time;
      if (progressRef.current >= 1) {
        if (loop) progressRef.current = 0;
        else {
          progressRef.current = 1;
          setPhase("complete");
        }
      }
      draw(progressRef.current);
      if (progressRef.current < 1 || loop) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastTimeRef.current = null;
    };
  }, [active, draw, loop, phase, prefersReducedMotion, speed]);

  const play = () => {
    if (phase === "complete") progressRef.current = 0;
    setPhase("running");
  };
  const pause = () => setPhase("paused");
  const reset = () => {
    progressRef.current = prefersReducedMotion ? 1 : 0;
    setPhase(prefersReducedMotion ? "complete" : "idle");
    draw(progressRef.current);
  };

  return (
    <div className="appleDemo appleHighResolutionDemo">
      <canvas
        ref={canvasRef}
        width="560"
        height="240"
        role="img"
        aria-label="細い曲線と円が左から右へ描かれる高解像度グラフィックの再現"
      >
        高解像度風の曲線描画。Canvas非対応環境では説明文を表示しています。
      </canvas>
      <output className="appleStatusReadout" aria-live="polite">
        {phase === "complete" ? "DRAW COMPLETE" : phase === "running" ? "PLOTTING CURVE" : "PLOTTER READY"}
      </output>
      <div className="appleDemoControls" role="group" aria-label="ハイレゾ風描画の再生操作">
        <button type="button" onClick={play}>{phase === "complete" ? "REPLAY" : phase === "paused" ? "RESUME" : "PLAY"}</button>
        <button type="button" onClick={pause} disabled={phase !== "running"}>PAUSE</button>
        <button type="button" onClick={reset}>RESET</button>
        <label>SPEED <select value={speed} onChange={(event) => setSpeed(event.target.value as keyof typeof speedFactors)}><option value="slow">SLOW</option><option value="normal">NORMAL</option><option value="fast">FAST</option></select></label>
        <label><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> LOOP</label>
      </div>
    </div>
  );
}
