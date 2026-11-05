export type Mode = 'split' | 'overlay' | 'side';
export type Pair = 'restoration' | 'correction';
export type Playback = 'idle' | 'playing' | 'paused' | 'finished';
type Drag = { id: number; time: number; value: number };
type Animation = { id: number; elapsed: number; duration: number; from: number; to: number };
export type CompareState = {
  pair: Pair; mode: Mode; position: number; alpha: number; reversed: boolean;
  drag: Drag | null; playback: Playback; animation: Animation | null; epoch: number;
  speed: number; reduced: boolean; ready: boolean;
  resource: number; loaded: [boolean, boolean]; error: boolean;
};
export const initialCompare = (): CompareState => ({
  pair: 'restoration', mode: 'split', position: 50, alpha: 50, reversed: false,
  drag: null, playback: 'idle', animation: null, epoch: 0, speed: 1,
  reduced: false, ready: false, resource: 0, loaded: [false, false], error: false,
});
export const percent = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
export function percentAt(x: number, left: number, width: number) {
  return [x, left, width].every(Number.isFinite) && width > 0 ? percent((x - left) / width * 100) : null;
}
export const valueOf = (s: CompareState) => s.drag?.value ?? (s.mode === 'overlay' ? s.alpha : s.position);
const put = (s: CompareState, value: number): CompareState => s.mode === 'overlay' ? { ...s, alpha: value } : { ...s, position: value };
const stop = (s: CompareState): CompareState => ({ ...s, drag: null, animation: null, epoch: s.epoch + 1, playback: s.playback === 'playing' ? 'paused' : s.playback });
export type CompareAction =
  | { type: 'manual'; value: number }
  | { type: 'mode'; mode: Mode } | { type: 'pair'; pair: Pair }
  | { type: 'swap' | 'reset' | 'pause' | 'abort' | 'play' | 'replay' }
  | { type: 'speed'; speed: number } | { type: 'reduced'; reduced: boolean }
  | { type: 'measure'; ready: boolean }
  | { type: 'asset'; resource: number; index: 0 | 1; ok: boolean }
  | { type: 'start'; id: number; time: number; value: number }
  | { type: 'pointer'; id: number; time: number; value: number; phase: 'move' | 'up' | 'cancel' }
  | { type: 'tick'; id: number; delta: number };

export function compareTransition(s: CompareState, a: CompareAction): CompareState {
  switch (a.type) {
    case 'manual': {
      const v = percent(a.value); return v === null ? s : { ...put(stop(s), v), playback: 'idle' };
    }
    case 'mode': return ['split', 'overlay', 'side'].includes(a.mode) ? { ...stop(s), mode: a.mode, playback: 'idle' } : s;
    case 'pair': return ['restoration', 'correction'].includes(a.pair) ? { ...stop(s), pair: a.pair, position: 50, alpha: 50, reversed: false, playback: 'idle', resource: s.resource + 1, loaded: [false, false], error: false } : s;
    case 'swap': return { ...stop(s), reversed: !s.reversed, playback: 'idle' };
    case 'reset': return { ...stop(s), position: 50, alpha: 50, reversed: false, speed: 1, playback: 'idle' };
    case 'pause': case 'abort': return stop(s);
    case 'speed': return [.5, 1, 2].includes(a.speed) ? { ...stop(s), speed: a.speed } : s;
    case 'reduced': return { ...stop(s), reduced: a.reduced };
    case 'measure': return { ...stop(s), ready: a.ready };
    case 'asset': {
      if (a.resource !== s.resource) return s;
      if (!a.ok) return { ...stop(s), error: true };
      const loaded: [boolean, boolean] = [...s.loaded]; loaded[a.index] = true;
      return { ...s, loaded };
    }
    case 'start': {
      const v = percent(a.value);
      if (s.drag || s.mode !== 'split' || !s.ready || s.error || !s.loaded.every(Boolean) || v === null || !Number.isFinite(a.time)) return s;
      return { ...stop(s), playback: 'idle', drag: { id: a.id, time: a.time, value: v } };
    }
    case 'pointer': {
      const d = s.drag, v = percent(a.value);
      if (!d || d.id !== a.id || !Number.isFinite(a.time) || a.time < d.time) return s;
      if (a.phase === 'cancel') return stop(s);
      if (v === null) return stop(s);
      return a.phase === 'up' ? put(stop(s), v) : { ...s, drag: { ...d, time: a.time, value: v } };
    }
    case 'play': case 'replay': {
      if (s.mode === 'side' || !s.ready || s.error || !s.loaded.every(Boolean)) return s;
      const clean = stop(s), from = a.type === 'replay' ? (s.reversed ? 100 : 0) : valueOf(clean), to = s.reversed ? 0 : 100;
      if (s.reduced || from === to) return { ...put(clean, to), playback: 'finished' };
      return { ...put(clean, from), playback: 'playing', animation: { id: clean.epoch, elapsed: 0, duration: Math.abs(to - from) / 100 * 6000 / s.speed, from, to } };
    }
    case 'tick': {
      const anim = s.animation;
      if (s.playback !== 'playing' || !anim || anim.id !== a.id || !Number.isFinite(a.delta) || a.delta < 0) return s;
      const elapsed = Math.min(anim.duration, anim.elapsed + a.delta), value = anim.from + (anim.to - anim.from) * elapsed / anim.duration;
      const next = put(s, value);
      return elapsed === anim.duration ? { ...next, animation: null, playback: 'finished' } : { ...next, animation: { ...anim, elapsed } };
    }
  }
}
