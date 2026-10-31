"use client";
import { useEffect, useRef, useState } from 'react';
export function useExhibitClock(playing: boolean, speed: number, resetKey: number, stopAt = Infinity) {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [clock, setClock] = useState({ key: resetKey, time: 0 });
  if (clock.key !== resetKey) setClock({ key: resetKey, time: 0 });
  const time = clock.key === resetKey ? clock.time : 0;
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    const page = () => setPageVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (stage.current) observer.observe(stage.current);
    sync(); page(); media.addEventListener('change', sync); document.addEventListener('visibilitychange', page);
    return () => { observer.disconnect(); media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', page); };
  }, []);
  const motionAllowed = visible && pageVisible && !reduced;
  const active = playing && motionAllowed && time < stopAt;
  useEffect(() => {
    if (!active) return;
    let frame = 0, last = 0;
    const tick = (stamp: number) => { const dt = last ? Math.min(40, stamp - last) : 0; last = stamp; setClock(c => ({ ...c, time: c.time + dt * speed })); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, speed]);
  return { stage, time, reduced, active, motionAllowed };
}
export function Range({ name, value, set, min = 0, max = 100 }: { name: string; value: number; set: (value: number) => void; min?: number; max?: number }) {
  return <label>{name} <output>{value}</output><input aria-label={name} type="range" min={min} max={max} value={value} onChange={e => set(Number(e.target.value))}/></label>;
}
