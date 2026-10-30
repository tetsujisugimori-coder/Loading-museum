"use client";

import { useEffect, useRef, useState } from "react";

/** 塗り文字と輪郭文字の時間差を、文字単位の波とともに観察する。 */
export default function ModernDrift() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState("A DRIFT");
  const [ghosts, setGhosts] = useState(6);
  const [wave, setWave] = useState(40);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting)); observer.observe(target);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    update(); visibility(); media.addEventListener("change", update); document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    const target = canvas.current;
    const ctx = target?.getContext("2d");
    if (!target || !ctx) return;
    let frame = 0; let start = 0;
    const draw = (stamp: number) => {
      if (!start) start = stamp;
      const time = reduced || !playing ? 0 : (stamp - start) / 1000;
      ctx.fillStyle = "#12202b"; ctx.fillRect(0, 0, 600, 280);
      const chars = Array.from(word.slice(0, 12));
      const size = Math.min(82, 490 / Math.max(chars.length, 1) * 1.35);
      ctx.font = `900 ${size}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const width = Math.min(480, chars.length * size * .65), spacing = width / Math.max(chars.length, 1);
      for (let trail = ghosts; trail >= 0; trail--) {
        for (let i = 0; i < chars.length; i++) {
          const phase = i * .75 + time * 1.3 - trail * .18;
          const distance = trail * (3 + progress * 2.2);
          const y = 110 + Math.sin(phase) * wave * .35 + distance * .58;
          const x = 300 - width / 2 + (i + .5) * spacing + distance;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(phase) * wave * .003);
          if (trail === 0) { ctx.fillStyle = "#f5e9cd"; ctx.fillText(chars[i], 0, 0); }
          else { ctx.strokeStyle = `rgba(120, 226, 220, ${.75 * (1 - trail / (ghosts + 1))})`; ctx.lineWidth = 1.4; ctx.strokeText(chars[i], 0, 0); }
          ctx.restore();
        }
      }
      if (playing && visible && pageVisible && !reduced) frame = requestAnimationFrame(draw);
    };
    draw(0);
    return () => cancelAnimationFrame(frame);
  }, [word, ghosts, wave, progress, playing, visible, reduced, pageVisible, revision]);

  function setScroll(value: number) {
    setProgress(value);
    const node = scrollArea.current;
    if (node) node.scrollTop = value / 100 * (node.scrollHeight - node.clientHeight);
  }
  function reset() { setWord("A DRIFT"); setGhosts(6); setWave(40); setPlaying(true); setScroll(0); setRevision(n => n + 1); }
  return <div className="modernPlayer">
    <div ref={scrollArea} tabIndex={0} aria-label="残像を伸ばすスクロール領域" onScroll={e => { const node = e.currentTarget; setProgress(node.scrollTop / Math.max(1, node.scrollHeight - node.clientHeight) * 100); }} style={{ height: "clamp(180px, 50vw, 280px)", overflowY: "auto", background: "#12202b", overscrollBehavior: "contain" }}>
      <div style={{ height: "210%" }}><canvas ref={canvas} width={600} height={280} aria-label="波打つ文字とその輪郭の残像" style={{ position: "sticky", top: 0, display: "block", width: "100%", height: "auto" }} /></div>
    </div>
    <p>絵の中をスクロールすると輪郭の間隔が広がります。文字ごとに波の位相をずらし、少し前の位置を輪郭で重ねています。</p>
    <div className="modernControls">
      <label>文字 <input maxLength={12} value={word} onChange={e => setWord(e.target.value)} /></label>
      <label>残像数 <input type="range" min="1" max="12" value={ghosts} onChange={e => setGhosts(Number(e.target.value))} /> {ghosts}</label>
      <label>波の大きさ <input type="range" min="0" max="100" value={wave} onChange={e => setWave(Number(e.target.value))} /></label>
      <label>軌跡の広がり <input type="range" min="0" max="100" value={progress} onChange={e => setScroll(Number(e.target.value))} /></label>
      <button onClick={() => setPlaying(!playing)}>{playing ? "自動再生を止める" : "自動再生を再開"}</button><button onClick={reset}>リセット</button>
    </div>
    {reduced && <p>動きを減らす設定のため自動の波を停止しています。各スライダーで形を操作できます。</p>}
  </div>;
}
