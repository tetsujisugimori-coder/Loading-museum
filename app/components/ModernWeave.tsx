"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

/** 独自に描いた風景を細い帯に分け、各帯を小片ごとに波打たせる。 */
export default function ModernWeave() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<HTMLCanvasElement | null>(null);
  const [spread, setSpread] = useState(35);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(target);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    update(); visibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    const target = canvas.current;
    const ctx = target?.getContext("2d");
    if (!target || !ctx) return;
    if (!scene.current) {
      const image = document.createElement("canvas"); image.width = 360; image.height = 224;
      const c = image.getContext("2d");
      if (!c) return;
      const sky = c.createLinearGradient(0, 0, 0, 224); sky.addColorStop(0, "#0c315a"); sky.addColorStop(.55, "#ec907a"); sky.addColorStop(1, "#f0cb8d");
      c.fillStyle = sky; c.fillRect(0, 0, 360, 224);
      c.fillStyle = "#ffdf9d"; c.beginPath(); c.arc(275, 55, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#455c72"; c.beginPath(); c.moveTo(0, 172); c.lineTo(95, 75); c.lineTo(168, 165); c.lineTo(240, 102); c.lineTo(360, 190); c.lineTo(360, 224); c.lineTo(0, 224); c.fill();
      c.fillStyle = "#173f50"; c.beginPath(); c.moveTo(0, 195); c.quadraticCurveTo(100, 155, 200, 195); c.quadraticCurveTo(280, 220, 360, 176); c.lineTo(360, 224); c.lineTo(0, 224); c.fill();
      scene.current = image;
    }
    let frame = 0; let start = 0; let last = 0;
    const draw = (stamp: number) => {
      if (stamp && last && stamp - last < 33) { frame = requestAnimationFrame(draw); return; }
      if (!start) start = stamp;
      last = stamp;
      const time = reduced || !playing ? 0 : (stamp - start) / 1000;
      ctx.clearRect(0, 0, 600, 320); ctx.fillStyle = "#111c25"; ctx.fillRect(0, 0, 600, 320);
      const source = scene.current;
      if (!source) return;
      const bands = 28, segments = 20, bandHeight = 8, segmentWidth = 18;
      for (let row = 0; row < bands; row++) {
        const seed = Math.sin(row * 13.3) * .5 + .5;
        const dx = (seed - .5) * spread * 2.15;
        for (let col = 0; col < segments; col++) {
          const wave = Math.sin(col * .25 + row * .7 + time * (1 + seed)) * spread * .12 * Math.sin(Math.PI * col / segments);
          ctx.drawImage(source, col * segmentWidth, row * bandHeight, segmentWidth, bandHeight,
            120 + col * segmentWidth + dx, 48 + row * bandHeight + wave, segmentWidth + 1, bandHeight + .4);
        }
      }
      if (playing && visible && pageVisible && !reduced) frame = requestAnimationFrame(draw);
    };
    draw(0);
    return () => cancelAnimationFrame(frame);
  }, [spread, playing, visible, pageVisible, reduced, revision]);

  function drag(e: PointerEvent<HTMLCanvasElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    setSpread(Math.round(Math.max(0, Math.min(100, (e.clientX - bounds.left) / bounds.width * 100))));
  }
  return <div className="modernPlayer">
    <canvas ref={canvas} width={600} height={320} aria-label="独自の山の風景が帯に分かれ、波打ちながらほどける" style={{ display: "block", width: "100%", height: "auto", touchAction: "none", background: "#111c25" }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag(e); }} onPointerMove={e => { if (e.buttons) drag(e); }} onWheel={e => setSpread(n => Math.max(0, Math.min(100, n + Math.sign(e.deltaY) * 3)))} />
    <p>絵の上を左右にドラッグ、スクロール、またはスライダーでほどきます。各帯をさらに短い区間に分け、それぞれの位置を波の式でずらしています。</p>
    <div className="modernControls"><label>ほどき具合 <input type="range" min="0" max="100" value={spread} onChange={e => setSpread(Number(e.target.value))} /></label>
      <button onClick={() => setPlaying(!playing)}>{playing ? "自動再生を止める" : "自動再生を再開"}</button>
      <button onClick={() => { setSpread(35); setPlaying(true); setRevision(n => n + 1); }}>リセット</button></div>
    {reduced && <p>動きを減らす設定のため自動の揺れを停止しています。スライダーで形を操作できます。</p>}
  </div>;
}
