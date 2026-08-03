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
const highResolutionUses = {
  graph: { label: "関数グラフ", description: "計算結果を座標と線で表示する教育・データ確認用途を想定した再構成です。", drawing: "座標軸を描き、計算した点を左から線で結んでいます。" },
  geometry: { label: "教育用の幾何図形", description: "円、三角形、補助線を使って図形の関係を学ぶ用途を想定した再構成です。", drawing: "円周と頂点を計算し、輪郭と補助線を順番に描いています。" },
  map: { label: "ゲームや地図を想定した線画", description: "迷路、地図、ゲーム背景のような線画用途を想定した完全オリジナル図形です。", drawing: "通路と区画を短い線分として順番に追加しています。" },
} as const;
type HighResolutionUse = keyof typeof highResolutionUses;

export function HighResolutionGraphicsDemo({ active, prefersReducedMotion }: AppleDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [useCase, setUseCase] = useState<HighResolutionUse>("graph");
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
    const maxX = canvas.width * progress;
    context.strokeStyle = "#668e71";
    context.lineWidth = 1;
    if (useCase === "graph") {
      context.beginPath(); context.moveTo(22, canvas.height / 2); context.lineTo(maxX, canvas.height / 2); context.moveTo(45, 18); context.lineTo(45, canvas.height - 18); context.stroke();
      context.strokeStyle = "#d9a64a"; context.lineWidth = 3; context.beginPath();
      for (let x = 45; x <= maxX; x += 3) { const y = canvas.height / 2 - Math.sin((x - 45) / 34) * 62; if (x === 45) context.moveTo(x, y); else context.lineTo(x, y); } context.stroke();
    } else if (useCase === "geometry") {
      const cx = canvas.width / 2; const cy = canvas.height / 2; const radius = 82 * progress;
      context.strokeStyle = "#d9a64a"; context.lineWidth = 2; context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();
      context.strokeStyle = "#668e71"; context.beginPath(); context.moveTo(cx, cy - radius); context.lineTo(cx - radius * .86, cy + radius * .5); context.lineTo(cx + radius * .86, cy + radius * .5); context.closePath(); context.stroke();
      context.beginPath(); context.moveTo(cx - radius, cy); context.lineTo(cx + radius, cy); context.moveTo(cx, cy - radius); context.lineTo(cx, cy + radius); context.stroke();
    } else {
      const segments = [[30,35,220,35],[220,35,220,90],[90,90,220,90],[90,90,90,185],[90,185,300,185],[300,70,300,185],[300,70,500,70],[390,70,390,150],[250,150,390,150],[250,105,250,150],[30,105,160,105],[160,105,160,155],[30,215,520,215]] as const;
      context.strokeStyle = "#d9a64a"; context.lineWidth = 3;
      segments.slice(0, Math.ceil(segments.length * progress)).forEach(([x1,y1,x2,y2]) => { context.beginPath(); context.moveTo(x1,y1); context.lineTo(x2,y2); context.stroke(); });
    }
  }, [useCase]);

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

  const changeUseCase = (next: HighResolutionUse) => {
    setUseCase(next);
    progressRef.current = prefersReducedMotion ? 1 : 0;
    setPhase(prefersReducedMotion ? "complete" : "idle");
  };

  const selectedUse = highResolutionUses[useCase];

  return (
    <div className="appleDemo appleHighResolutionDemo">
      <div className="appleHighResolutionUses" role="group" aria-label="ハイレゾ表示の用途">
        {(Object.entries(highResolutionUses) as [HighResolutionUse, typeof selectedUse][]).map(([value, item]) => <button key={value} type="button" aria-pressed={useCase === value} onClick={() => changeUseCase(value)}>{item.label}</button>)}
      </div>
      <p className="applePatternExplanation"><strong>{selectedUse.label}</strong>{selectedUse.description}</p>
      <canvas
        ref={canvasRef}
        width="560"
        height="240"
        role="img"
        aria-label={`${selectedUse.label}を線で順に描く高解像度グラフィック用途の再構成`}
      >
        {selectedUse.label}のオリジナル線画。Canvas非対応環境では説明文を表示しています。
      </canvas>
      <output className="appleStatusReadout" aria-live="polite">
        {phase === "complete" ? `描画完了: ${selectedUse.label}` : phase === "running" ? `描画中: ${selectedUse.drawing}` : `用途を選び、再生してください: ${selectedUse.label}`}
      </output>
      <div className="appleDemoControls" role="group" aria-label="ハイレゾ風描画の再生操作">
        <button type="button" onClick={play}>{phase === "complete" ? "再実行" : phase === "paused" ? "再開" : "再生"}</button>
        <button type="button" onClick={pause} disabled={phase !== "running"}>一時停止</button>
        <button type="button" onClick={reset}>リセット</button>
        <label>速度 <select value={speed} onChange={(event) => setSpeed(event.target.value as keyof typeof speedFactors)}><option value="slow">ゆっくり</option><option value="normal">標準</option><option value="fast">速い</option></select></label>
        <label><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> ループ</label>
      </div>
    </div>
  );
}
