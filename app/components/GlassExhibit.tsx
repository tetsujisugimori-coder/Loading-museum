"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./glass-exhibit.css";

type Hit = { x: number; y: number; w: number; h: number; index: number };
type Point = { x: number; y: number; z: number };
const NOTES = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];

/** Independent, procedural cuboids: the canvas projects their 3D vertices to 2D.
 * There are no imported models, images, sounds, or shader code. */
export default function GlassExhibit() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hits = useRef<Hit[]>([]);
  const lastPointer = useRef(-1);
  const strikes = useRef<number[]>(NOTES.map(() => -10000));
  const drawNow = useRef<() => void>(() => {});
  const audio = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const [sound, setSound] = useState(false);
  const [error, setError] = useState(false);
  const [running, setRunning] = useState(true);
  const [offset, setOffset] = useState(0);
  const [lastNote, setLastNote] = useState<number | null>(null);

  useEffect(() => () => { if (audio.current) void audio.current.close(); }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let visible = false;
    let reduced = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const project = (p: Point, width: number, height: number) => {
      // An oblique camera gives all six surfaces depth while retaining readable hit areas.
      const scale = Math.min(width / 640, height / 370);
      const perspective = 500 / (500 + p.z);
      return { x: width / 2 + (p.x + p.z * .28) * scale * perspective,
        y: height / 2 + (p.y - p.z * .22) * scale * perspective };
    };
    const render = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
      if (element.width !== pixelWidth || element.height !== pixelHeight) { element.width = pixelWidth; element.height = pixelHeight; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#182d42"); bg.addColorStop(.55, "#314b5a"); bg.addColorStop(1, "#122635");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
      // Back-to-front depth ordering keeps each independent cuboid legible.
      const now = performance.now();
      const geometry = NOTES.map((_, index) => {
        const angle = (index / NOTES.length * Math.PI * 2) + offset / 100 * Math.PI * 2;
        return { index, angle, z: Math.cos(angle) * 42 };
      }).sort((a, b) => b.z - a.z);
      const nextHits: Hit[] = [];
      const polygon = (points: {x:number;y:number}[], color: string, line = "rgba(255,255,255,.45)") => {
        ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
        for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
      };
      for (const {index, angle, z} of geometry) {
        const elapsed = (now - strikes.current[index]) / 1000;
        const bounce = running && !reduced && elapsed >= 0 && elapsed < 1.4 ? Math.sin(elapsed * 18) * Math.exp(-elapsed * 3) * .12 : 0;
        const glow = elapsed >= 0 && elapsed < 1.4 ? Math.exp(-elapsed * 3) : 0;
        const cx = Math.sin(angle) * 46;
        const cy = (index - 3.5) * 37;
        const length = 225 - index * 10;
        const vertex = (x:number, y:number, depth:number): Point => ({x: cx + x * Math.cos(bounce) - y * Math.sin(bounce), y: cy + x * Math.sin(bounce) + y * Math.cos(bounce), z: z + depth});
        const verts = [vertex(-length/2,-10,-12), vertex(length/2,-10,-12), vertex(length/2,10,-12), vertex(-length/2,10,-12), vertex(-length/2,-10,12), vertex(length/2,-10,12), vertex(length/2,10,12), vertex(-length/2,10,12)].map(p => project(p,width,height));
        const hue = 180 + index * 17;
        polygon([verts[4],verts[5],verts[6],verts[7]], `hsla(${hue},80%,70%,.12)`);
        polygon([verts[0],verts[1],verts[5],verts[4]], `hsla(${hue},90%,${72 + glow * 15}%,.55)`);
        polygon([verts[1],verts[2],verts[6],verts[5]], `hsla(${hue},70%,${42 + glow * 20}%,.63)`);
        polygon([verts[0],verts[1],verts[2],verts[3]], `hsla(${hue},75%,${60 + glow * 25}%,.7)`);
        ctx.beginPath(); ctx.moveTo(verts[0].x + 4, verts[0].y + 3); ctx.lineTo(verts[1].x - 4, verts[1].y + 3); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5; ctx.stroke();
        const xs = verts.map(p => p.x), ys = verts.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        nextHits.push({x: minX, y: minY - 5, w: maxX - minX, h: maxY - minY + 10, index});
      }
      hits.current = nextHits.reverse();
    };
    const hasActiveStrike = () => strikes.current.some(time => {
      const elapsed = performance.now() - time;
      return elapsed >= 0 && elapsed < 1400;
    });
    const tick = () => {
      frame = 0;
      if (!visible || document.hidden || !running || reduced) return;
      render();
      if (hasActiveStrike()) frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame); frame = 0; reduced = media.matches;
      if (!visible || document.hidden) return;
      render();
      if (running && !reduced && hasActiveStrike()) frame = requestAnimationFrame(tick);
    };
    drawNow.current = update;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    const resize = new ResizeObserver(update); resize.observe(element);
    media.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); drawNow.current = () => {}; };
  }, [offset, running]);

  async function enableAudio() {
    try {
      const ctx = audio.current ?? new AudioContext();
      if (!master.current) { master.current = ctx.createGain(); master.current.gain.value = 1; master.current.connect(ctx.destination); }
      audio.current = ctx;
      await ctx.resume();
      if (ctx.state !== "running") throw new Error("Audio unavailable");
      master.current.gain.value = 1; setSound(true); setError(false);
    } catch { setSound(false); setError(true); }
  }
  function strike(index: number) {
    strikes.current[index] = performance.now(); setLastNote(index); drawNow.current();
    const ctx = audio.current;
    if (!sound || !ctx || !master.current || ctx.state !== "running") return;
    // Two quiet sine partials make a bell-like sound without external samples.
    for (const [ratio, volume] of [[1, .07], [2.75, .018]]) {
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = NOTES[index] * ratio;
      gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .9);
      oscillator.connect(gain).connect(master.current); oscillator.start(); oscillator.stop(ctx.currentTime + .9);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  }
  function hit(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const found = hits.current.find(h => x >= h.x && x <= h.x+h.w && y >= h.y && y <= h.y+h.h);
    const next = found?.index ?? -1;
    if (next >= 0 && next !== lastPointer.current) strike(next);
    lastPointer.current = next;
  }
  return <div className="glassExhibit">
    <p>棒をなぞるか、下の音階ボタンを押してください。配置スライダーで立体の並びを変えられます。</p>
    <canvas ref={canvas} className="glassCanvas" aria-label="立体的に並ぶ8本のガラス棒。下の音階ボタンでも演奏できます。" role="img"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); hit(e); }}
      onPointerMove={e => { if (e.pointerType === "mouse" || e.buttons) hit(e); }}
      onPointerUp={() => { lastPointer.current = -1; }} onPointerCancel={() => { lastPointer.current = -1; }} onPointerLeave={() => { lastPointer.current = -1; }}/>
    <div className="glassNoteButtons" aria-label="音階">{NOTES.map((_, i) => <button type="button" key={i} aria-label={`${i+1}番の音`} onClick={() => strike(i)}>{i+1}</button>)}</div>
    <div className="glassControls"><label>配置 <input type="range" min="0" max="100" value={offset} onChange={e => setOffset(Number(e.target.value))}/></label>
      <button type="button" onClick={() => { if (sound) { if (master.current) master.current.gain.value = 0; setSound(false); } else void enableAudio(); }}>{sound ? "音を無効にする" : "音を有効にする"}</button>
      <button type="button" onClick={() => setRunning(!running)}>{running ? "揺れを止める" : "揺れを再開"}</button>
      <button type="button" onClick={() => { setOffset(0); strikes.current = NOTES.map(() => -10000); setLastNote(null); setRunning(true); drawNow.current(); }}>リセット</button></div>
    {error && <p role="status">音声を開始できませんでした。端末の音声設定を確認し、もう一度お試しください。</p>}
    <p aria-live="polite">{lastNote === null ? (sound ? "音が有効です。" : "音は無効です。") : `${lastNote+1}番の棒`}</p>
  </div>;
}
