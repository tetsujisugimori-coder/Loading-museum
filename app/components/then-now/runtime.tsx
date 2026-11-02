"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type StudyProps = { active: boolean; reduced: boolean; speed: number; now: boolean };
export const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

// One bounded clock per mounted study; no catch-up after pause/background.
export function useFrame(active: boolean, tick: (seconds: number) => void) {
  const callback = useRef(tick);
  useLayoutEffect(() => { callback.current = tick; });
  useEffect(() => {
    if (!active) return;
    let id = 0, previous = 0;
    const frame = (time: number) => {
      // Preserve elapsed-time meaning at low frame rates; cap hidden/long-frame catch-up.
      // Physics performs its own smaller bounded substeps.
      if (previous) callback.current(Math.min((time - previous) / 1000, .25));
      previous = time; id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [active]);
}

export function useProgress({ active, reduced, speed }: StudyProps, duration = 3) {
  const [progress, setProgress] = useState(0);
  useFrame(active && !reduced && progress < 1, dt => setProgress(p => clamp(p + dt * speed / duration)));
  return [progress, setProgress] as const;
}

export function Range({ label, value, min = 0, max = 100, step = 1, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void }) {
  const id = useId();
  return <label className="tnRange" htmlFor={id}><span>{label} <span className="tnValue" aria-hidden="true">{Number(value.toFixed(2))}</span></span><input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

export function Surface({ children, label }: { children: ReactNode; label: string }) {
  return <svg className="tnSurface" viewBox="0 0 320 220" role="img" aria-label={label}><path className="tnGrid" d="M0 55H320M0 110H320M0 165H320M80 0V220M160 0V220M240 0V220" />{children}</svg>;
}
