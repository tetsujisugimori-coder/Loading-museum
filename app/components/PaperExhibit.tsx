"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./paper-exhibit.css";

type Point = { x: number; y: number; z: number };
type Model = {
  x: number; y: number; vx: number; vy: number; angle: number; spin: number;
  fold: number; dragging: boolean; lastX: number; lastY: number; lastTime: number;
};
const initialModel = (): Model => ({ x: 0, y: 0, vx: 0, vy: 0, angle: -0.13, spin: 0, fold: 0.55, dragging: false, lastX: 0, lastY: 0, lastTime: 0 });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** A deterministic procedural sheet: every grid vertex is ours, with no imported mesh or textures. */
function vertex(u: number, v: number, fold: number, angle: number): Point {
  const shrink = 1 - fold * 0.48;
  const ridge = (t: number) => Math.abs(((t + 0.25) % 0.5 + 0.5) % 0.5 - 0.25) - 0.125;
  let x = u * shrink + fold * 0.08 * Math.sin(v * 12 + u * 4);
  let y = v * shrink + fold * 0.07 * Math.sin(u * 10 - v * 5);
  let z = fold * (0.75 * ridge(u + v * 0.25) + 0.55 * ridge(v - u * 0.3) + 0.11 * Math.sin(u * 13) * Math.cos(v * 11));
  const tilt = 0.48 + fold * 0.35;
  const yy = y * Math.cos(tilt) - z * Math.sin(tilt);
  z = y * Math.sin(tilt) + z * Math.cos(tilt);
  y = yy;
  const xx = x * Math.cos(angle) - y * Math.sin(angle);
  y = x * Math.sin(angle) + y * Math.cos(angle);
  x = xx;
  return { x, y, z };
}

function paint(canvas: HTMLCanvasElement, model: Model) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#17242c"; context.fillRect(0, 0, width, height);
  const scale = Math.min(width * 0.61, height * 1.12);
  const centerX = width / 2 + model.x * width * 0.34;
  const centerY = height / 2 + model.y * height * 0.29;
  context.fillStyle = "#0005";
  context.beginPath(); context.ellipse(centerX + 10, centerY + scale * .31, scale * .38, scale * .10, 0, 0, Math.PI * 2); context.fill();
  const cols = 20, rows = 16;
  const triangles: { points: Point[]; shade: number; depth: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const point = (cx: number, cy: number) => vertex(cx / cols - .5, (cy / rows - .5) * .72, model.fold, model.angle);
      const a = point(col,row), b = point(col+1,row), c = point(col,row+1), d = point(col+1,row+1);
      for (const points of [[a,b,c], [b,d,c]]) {
        const [p, q, r] = points;
        const ux = q.x-p.x, uy = q.y-p.y, uz = q.z-p.z;
        const vx = r.x-p.x, vy = r.y-p.y, vz = r.z-p.z;
        const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
        const length = Math.hypot(nx,ny,nz) || 1;
        const light = Math.abs((nx * -.35 + ny * -.45 + nz * .82) / length);
        triangles.push({ points, shade: clamp(0.50 + light * .48, .48, .98), depth: (p.z+q.z+r.z)/3 });
      }
    }
  }
  triangles.sort((a,b) => a.depth-b.depth);
  for (const tri of triangles) {
    context.beginPath();
    tri.points.forEach((p, i) => {
      const perspective = 1 / (1 - p.z * .32);
      const sx = centerX + p.x * scale * perspective, sy = centerY + p.y * scale * perspective;
      if (i === 0) context.moveTo(sx, sy); else context.lineTo(sx, sy);
    });
    context.closePath();
    const s = tri.shade;
    context.fillStyle = `rgb(${Math.round(247*s)} ${Math.round(235*s)} ${Math.round(210*s)})`;
    context.fill();
    context.strokeStyle = "#5a503b22"; context.lineWidth = .45; context.stroke();
  }
}

/** Self-contained so unmounting a closed room cancels its observer and animation. */
export default function PaperExhibit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const model = useRef<Model>(initialModel());
  const redraw = useRef<() => void>(() => {});
  const wake = useRef<() => void>(() => {});
  const reduced = useRef(false);
  const runningRef = useRef(true);
  const [fold, setFold] = useState(55);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0, visible = false, last = 0;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = () => paint(canvas, model.current);
    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden || !runningRef.current || reduced.current) { last = 0; return; }
      const m = model.current;
      const dt = Math.min((now - (last || now)) / 1000, .035); last = now;
      if (!m.dragging) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.angle += m.spin * dt;
        m.vy += 1.35 * dt;
        if (m.y > .8) { m.y = .8; m.vy *= -.45; m.vx *= .83; m.spin *= .8; }
        if (m.y < -.8) { m.y = -.8; m.vy = Math.abs(m.vy) * .45; }
        if (Math.abs(m.x) > .95) { m.x = Math.sign(m.x) * .95; m.vx *= -.5; }
        m.vx *= Math.pow(.97, dt * 60); m.spin *= Math.pow(.98, dt * 60);
        if (m.y >= .8 && Math.abs(m.vy) < .09) m.vy = 0;
      }
      draw();
      if (m.dragging || Math.abs(m.vx) > .005 || Math.abs(m.vy) > .005 || Math.abs(m.spin) > .005 || m.y < .8) frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const schedule = () => {
      draw();
      if (!frame && visible && !document.hidden && runningRef.current && !reduced.current) { last = 0; frame = requestAnimationFrame(tick); }
    };
    redraw.current = draw; wake.current = schedule;
    const preference = () => { reduced.current = query.matches; if (query.matches && frame) { cancelAnimationFrame(frame); frame = 0; last = 0; } if (query.matches) draw(); else schedule(); };
    preference(); query.addEventListener("change", preference);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; last = 0; } if (visible) schedule(); });
    observer.observe(canvas);
    const visibility = () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; last = 0; } else if (!document.hidden) schedule(); };
    document.addEventListener("visibilitychange", visibility);
    const resize = new ResizeObserver(draw); resize.observe(canvas);
    draw();
    return () => { if (frame) cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); query.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); redraw.current = () => {}; wake.current = () => {}; };
  }, []);

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const m = model.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    m.dragging = true; m.vx = 0; m.vy = 0; m.spin = 0;
    m.lastX = event.clientX; m.lastY = event.clientY; m.lastTime = event.timeStamp;
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const m = model.current;
    if (!m.dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - m.lastX) / Math.max(1, rect.width) / .34;
    const dy = (event.clientY - m.lastY) / Math.max(1, rect.height) / .29;
    const dt = clamp((event.timeStamp - m.lastTime) / 1000, .008, .1);
    m.x = clamp(m.x + dx, -.95, .95); m.y = clamp(m.y + dy, -.8, .8);
    m.angle += dx * .35;
    m.vx = clamp(dx / dt, -4, 4); m.vy = clamp(dy / dt, -4, 4); m.spin = clamp(dx / dt * .5, -3, 3);
    m.lastX = event.clientX; m.lastY = event.clientY; m.lastTime = event.timeStamp;
    redraw.current();
  }
  function release(event: PointerEvent<HTMLCanvasElement>) {
    const m = model.current;
    if (!m.dragging) return;
    m.dragging = false;
    if ((event.type === "pointercancel" || event.type === "lostpointercapture") || event.timeStamp - m.lastTime > 120 || reduced.current || !runningRef.current) { m.vx = 0; m.vy = 0; m.spin = 0; }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    wake.current();
  }
  function toss() {
    const m = model.current;
    if (reduced.current || !runningRef.current) { m.x = clamp(m.x + .25, -.95, .95); m.angle += .18; redraw.current(); return; }
    m.vx = 1.2; m.vy = -2.4; m.spin = 2; wake.current();
  }
  function reset() { model.current = initialModel(); setFold(55); wake.current(); }
  function toggle() { const next = !runningRef.current; runningRef.current = next; setRunning(next); if (next) wake.current(); }

  return <div className="paperExhibit">
    <canvas ref={canvasRef} className="paperCanvas" aria-label="折り目のある紙。ドラッグして動かし、離すと投げられます。" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} />
    <div className="paperControls">
      <label>丸める量 <input type="range" min="0" max="100" value={fold} onChange={event => { const value = Number(event.target.value); setFold(value); model.current.fold = value / 100; redraw.current(); }} /></label>
      <button type="button" onClick={toss}>紙を投げる</button>
      <button type="button" onClick={toggle}>{running ? "慣性を止める" : "慣性を再開"}</button>
      <button type="button" onClick={reset}>紙をリセット</button>
    </div>
    <p>紙をドラッグして離すか、投げるボタンを押すと投げられます。スライダーで折り目を観察できます。端に当たると跳ね返ります。動きを減らす設定では投擲後の慣性を止めます。</p>
    <p>三角形の頂点を数式で折り曲げ、遠近投影と面の明暗で立体感を描く独自の近似です。実際の紙の自己衝突やHoudiniのシミュレーションは使っていません。</p>
  </div>;
}
