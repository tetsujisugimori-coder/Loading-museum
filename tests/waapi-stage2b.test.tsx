// @vitest-environment jsdom
// Self-verification using a controlled WAAPI/RAF double, not native-browser evidence.
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpandedGamePreview } from '../app/components/WaapiExpandedPreviews';
import { WaapiTimingObservation } from '../app/components/WaapiTimingObservation';
import { waapiSamples } from '../app/data/waapiSamples';
import { judgeTiming, TIMING_EFFECT_DURATION, TIMING_WINDOW_START, TIMING_WINDOW_END, timingEffectFrames } from '../app/components/waapi-timing-model';

class NativeDouble {
  currentTime: number | null = 0;
  playState: AnimationPlayState = 'running';
  pending = false;
  ready: Promise<NativeDouble> = Promise.resolve(this);
  cancel = vi.fn(() => { this.playState = 'idle'; this.currentTime = null; });
  pause = vi.fn(() => { this.playState = 'paused'; });
  play = vi.fn(() => { this.playState = 'running'; });
  constructor(public node: HTMLElement, public frames: Keyframe[], public options: KeyframeAnimationOptions) {}
}
let animations: NativeDouble[];
let queued: Map<number, FrameRequestCallback>;
let history: FrameRequestCallback[];
let nextFrame: number;
function frame(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
    const callbacks = [...queued.values()]; queued.clear();
    callbacks.forEach(cb => cb(performance.now()));
  });
}
function visibility(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(1000);
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  animations = []; queued = new Map(); history = []; nextFrame = 0;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = ++nextFrame; queued.set(id, cb); history.push(cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queued.delete(id));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn(function(this: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) { const a = new NativeDouble(this, frames, options); animations.push(a); return a; }) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const cases = [[419, 'EARLY'], [420, 'PERFECT'], [680, 'PERFECT'], [681, 'LATE']] as const;
function live(kind: 'parry' | 'dodge', reduced = false) {
  const sample = waapiSamples.find(s => s.render === kind)!;
  const r = render(<ExpandedGamePreview sample={sample} active reducedMotion={reduced} />);
  const click = (name: string) => fireEvent.click(r.getByRole('button', { name }));
  const normal = () => r.container.querySelector('[data-normal-game]')!;
  return { ...r, click, normal, start: () => click(kind === 'parry' ? 'ENEMY ATTACK' : 'ATTACK START'), input: () => click(kind === 'parry' ? 'PARRY' : 'DODGE LEFT'), output: () => normal().querySelector('output')!.textContent!, change: (active: boolean, motion: boolean) => r.rerender(<ExpandedGamePreview sample={sample} active={active} reducedMotion={motion} />) };
}
describe('formal judgment and presentation recipe', () => {
  it('keeps the actual inclusive 420–680 ms contract and separate 420 ms effect', () => {
    expect([TIMING_WINDOW_START, TIMING_WINDOW_END, TIMING_EFFECT_DURATION]).toEqual([420, 680, 420]);
    for (const [ms, result] of cases) expect(judgeTiming(ms)).toBe(result);
    expect(judgeTiming(419.999)).toBe('EARLY'); expect(judgeTiming(680.001)).toBe('LATE');
  });
  it('uses the real linear live motion recipes without inventing trail emissions', () => {
    expect(timingEffectFrames(false, 'PERFECT', 0)).toEqual([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }]);
    expect(timingEffectFrames(true, 'PERFECT', -1)).toEqual([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-66px)', opacity: .55 }, { transform: 'translateX(-58px)', opacity: 1 }]);
    expect(timingEffectFrames(true, 'PERFECT', 1)[1]).toEqual({ transform: 'translateX(66px)', opacity: .55 });
    for (const result of ['EARLY', 'LATE'] as const) expect(timingEffectFrames(true, result, 1)[1]).toEqual({ transform: 'scale(0.86)' });
  });
});
describe.each(['parry', 'dodge'] as const)('%s live game isolation', kind => {
  it.each([false, true])('retains exact boundary results and input evidence, reduced=%s', reduced => {
    const r = live(kind, reduced);
    for (const [ms, result] of cases) {
      r.click('RESET'); r.start(); frame(ms); r.input();
      expect(r.output()).toMatch(result === 'PERFECT' ? /PERFECT PARRY|S-RANK/ : new RegExp(result + ' · HIT'));
      expect(r.normal().querySelector('[data-live-input]')!.textContent).toContain(`${ms.toFixed(2)} ms`);
      if (!reduced) {
        const a = animations.at(-1)!;
        expect(a.frames).toEqual(timingEffectFrames(kind === 'dodge', result, kind === 'dodge' ? -1 : 0));
        expect(a.options.duration).toBe(420);
      }
    }
  });
  it('preserves confirmed result and recorded live input across observation and reset', () => {
    const r = live(kind); r.start(); frame(500); r.input();
    const result = r.output(); const input = r.normal().querySelector('[data-live-input]')!.textContent;
    const previousAnimation = animations.at(-1)!;
    r.click('観察モードを開く');
    expect(r.normal().hasAttribute('hidden')).toBe(true);
    expect(previousAnimation.cancel).toHaveBeenCalled();
    expect(r.output()).toBe(result);
    r.click('通常モードへ戻る');
    expect(r.output()).toBe(result); expect(r.normal().querySelector('[data-live-input]')!.textContent).toBe(input);
    r.click('RESET'); expect(r.output()).toBe('READY'); expect(r.normal().querySelector('[data-live-input]')!.textContent).toContain('未入力');
  });
  it('explicitly interrupts an unfinished attack on entering observation and rejects old timers', () => {
    const r = live(kind); r.start(); frame(200); r.click('観察モードを開く');
    expect(r.output()).toBe('INTERRUPTED · RETRY'); frame(1000); expect(r.output()).toBe('INTERRUPTED · RETRY');
    r.click('通常モードへ戻る'); r.input(); expect(r.output()).toBe('FAIL · NO ATTACK');
    r.start(); frame(500); r.input(); expect(r.output()).toMatch(/PERFECT PARRY|S-RANK/);
  });
  it('offscreen interruption and reduced-motion switching keep judgment independent', () => {
    const r = live(kind); r.start(); frame(200); r.change(true, true); frame(220); r.input();
    expect(r.output()).toMatch(/PERFECT PARRY|S-RANK/);
    r.start(); r.change(false, true); frame(1000); r.change(true, false); expect(r.output()).toBe('INTERRUPTED · RETRY');
    r.unmount(); expect(vi.getTimerCount()).toBe(0); expect(queued.size).toBe(0);
  });
});

function observe(kind: 'parry' | 'dodge', motion = false) {
  const sample = waapiSamples.find(s => s.render === kind)!;
  const r = render(<WaapiTimingObservation sample={sample} active reducedMotion={motion} />);
  const section = () => r.container.querySelector('section')!;
  return { ...r, section, time: () => Number(section().getAttribute('data-timing-time')),
    click: (name: string) => fireEvent.click(r.getByRole('button', { name })),
    seek: (ms: number) => fireEvent.change(r.getByRole('slider', { name: '観察時間（ms）' }), { target: { value: String(ms) } }),
    draft: (ms: number) => fireEvent.change(r.getByRole('spinbutton', { name: 'シミュレーション入力時刻（ms）' }), { target: { value: String(ms) } }),
    change: (active: boolean, reduced: boolean) => r.rerender(<WaapiTimingObservation sample={sample} active={active} reducedMotion={reduced} />) };
}
describe.each(['parry', 'dodge'] as const)('%s independent timing observation', kind => {
  it('judges the shared boundaries only on commit and preserves results through arbitrary seek', () => {
    const r = observe(kind);
    for (const [ms, result] of cases) {
      const previous = r.section().getAttribute('data-timing-input');
      r.draft(ms); expect(r.section().getAttribute('data-timing-input')).toBe(previous);
      r.click('この入力を確定');
      expect(r.section().getAttribute('data-timing-input')).toBe(String(ms));
      expect(r.section().getAttribute('data-timing-result')).toBe(result);
      expect(animations.at(-1)!.frames).toEqual(timingEffectFrames(kind === 'dodge', result, kind === 'dodge' ? 1 : 0));
      for (const at of [0, ms - 1, ms, ms + 419, ms + 420, 1420, 0]) {
        r.seek(at);
        expect(r.section().getAttribute('data-timing-result')).toBe(result);
        expect(r.section().getAttribute('data-timing-phase')).toBe(at < ms ? 'before-input' : at >= ms + 420 ? 'effect-ended' : 'effect-running');
        expect(animations.at(-1)!.currentTime).toBe(Math.max(0, Math.min(420, at - ms)));
      }
    }
    r.seek(680); r.click('現在位置で入力を確定');
    expect(r.section().getAttribute('data-timing-input')).toBe('680');
    expect(r.section().getAttribute('data-timing-result')).toBe('PERFECT');
    r.seek(1001); expect(r.getByRole('button', { name: '現在位置で入力を確定' }).hasAttribute('disabled')).toBe(true);
    r.click('観察Reset'); expect(r.time()).toBe(0); expect(r.section().getAttribute('data-timing-input')).toBe('550');
  });
  it('pauses, resumes from the stopped position, steps, rewinds from the end and rejects stale RAF', () => {
    const r = observe(kind);
    r.click('再生 / 再開'); frame(300); expect(r.time()).toBe(300);
    const old = history.at(-1)!;
    r.click('一時停止'); frame(200); expect(r.time()).toBe(300); expect(queued.size).toBe(0);
    act(() => old(performance.now() + 1000)); expect(r.time()).toBe(300);
    r.click('再生 / 再開'); frame(100); expect(r.time()).toBe(400);
    r.click('1ステップ進む'); expect(r.time()).toBeCloseTo(400 + 1000 / 60);
    r.click('1ステップ戻る'); expect(r.time()).toBeCloseTo(400);
    r.seek(1420); expect(r.section().getAttribute('data-controller')).toBe('finished');
    r.click('1ステップ戻る'); expect(r.time()).toBeCloseTo(1420 - 1000 / 60);
    r.click('再生 / 再開'); frame(100); expect(r.time()).toBe(1420); expect(queued.size).toBe(0);
    r.click('再生 / 再開'); expect(r.time()).toBe(0); frame(100); expect(r.time()).toBe(100);
    const beforeReset = history.at(-1)!; const animation = animations.at(-1)!;
    r.click('観察Reset'); act(() => beforeReset(performance.now() + 999));
    expect(r.time()).toBe(0); expect(animation.cancel).toHaveBeenCalled(); expect(queued.size).toBe(0);
    r.click('観察位置を先頭へ'); expect(r.time()).toBe(0);
  });
  it('stops hidden/inactive/reduced motion without automatically restarting and cleans up on unmount', () => {
    const r = observe(kind); r.click('再生 / 再開'); frame(100);
    const old = history.at(-1)!;
    visibility(true); expect(queued.size).toBe(0); expect(r.section().getAttribute('data-controller')).toBe('inactive');
    act(() => old(performance.now() + 1000)); expect(r.time()).toBe(100);
    visibility(false); expect(r.section().getAttribute('data-controller')).toBe('paused'); frame(100); expect(r.time()).toBe(100);
    r.click('再生 / 再開'); frame(50); r.change(true, true);
    expect(queued.size).toBe(0); expect(r.getByRole('button', { name: '再生 / 再開' }).hasAttribute('disabled')).toBe(true);
    r.seek(600); expect(r.time()).toBe(600); r.click('1ステップ進む'); expect(r.time()).toBeCloseTo(600 + 1000 / 60);
    r.change(true, false); frame(100); expect(r.time()).toBeCloseTo(600 + 1000 / 60);
    r.click('再生 / 再開'); r.change(false, false); expect(queued.size).toBe(0);
    r.change(true, false); expect(r.section().getAttribute('data-controller')).toBe('paused');
    r.click('再生 / 再開'); const stale = history.at(-1)!; r.unmount();
    act(() => stale(performance.now() + 1000)); expect(queued.size).toBe(0);
    expect(animations.every(a => a.cancel.mock.calls.length > 0)).toBe(true);
  });
});
it('uses explicitly committed Dodge direction and documents the three persistent outlines', () => {
  const r = observe('dodge');
  const before = animations.at(-1)!;
  fireEvent.change(r.getByRole('combobox', { name: 'シミュレーション回避方向' }), { target: { value: '-1' } });
  expect(animations.at(-1)).toBe(before);
  r.click('この入力を確定'); expect(animations.at(-1)!.frames).toEqual(timingEffectFrames(true, 'PERFECT', -1));
  expect(r.container.querySelectorAll('[data-timing-hero] i')).toHaveLength(3);
  expect(r.container.querySelector('[data-timing-committed]')!.textContent).toContain('LEFT');
  r.seek(1420); expect(r.container.querySelectorAll('[data-timing-hero] i')).toHaveLength(3);
  expect(r.getByText(/個別の生成・消滅タイマーはなく/)).toBeTruthy();
});
it('observation simulation and its Reset cannot change the retained normal game result', () => {
  const r = live('parry'); r.start(); frame(420); r.input();
  const result = r.output(); const evidence = r.normal().querySelector('[data-live-input]')!.textContent;
  r.click('観察モードを開く'); r.click('遅い入力 681ms'); r.click('この入力を確定');
  fireEvent.change(r.getByRole('slider', { name: '観察時間（ms）' }), { target: { value: '1420' } });
  r.click('観察Reset'); r.click('通常モードへ戻る');
  expect(r.output()).toBe(result); expect(r.normal().querySelector('[data-live-input]')!.textContent).toBe(evidence);
});
it('ignores a superseded Animation.ready completion after a new trial and unmount', async () => {
  const resolvers: (() => void)[] = [];
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn(function(this: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const a = new NativeDouble(this, frames, options);
    a.ready = new Promise<NativeDouble>(resolve => resolvers.push(() => resolve(a)));
    animations.push(a); return a;
  }) });
  const r = observe('parry'); const superseded = animations[0]; const resolveFirst = resolvers[0];
  r.draft(681); r.click('この入力を確定'); r.seek(700);
  expect(superseded.cancel).toHaveBeenCalled();
  // A late native completion must not publish old state into the replacement trial.
  superseded.currentTime = 999; superseded.playState = 'finished';
  await act(async () => resolveFirst());
  expect(r.container.querySelector('[data-observation-reading]')!.textContent).toContain('native currentTime: 19.00ms');
  expect(r.section().getAttribute('data-timing-result')).toBe('LATE');
  const resolveCurrent = resolvers.at(-1)!; r.unmount();
  await act(async () => resolveCurrent()); expect(queued.size).toBe(0);
});
it('labels unavailable native animation honestly while retaining timing simulation', () => {
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: undefined });
  const r = observe('parry');
  expect(r.getByText(/WAAPIが利用できないため/)).toBeTruthy();
  r.draft(420); r.click('この入力を確定'); r.seek(420);
  expect(r.section().getAttribute('data-timing-result')).toBe('PERFECT');
  expect(r.container.querySelector('[data-observation-reading]')!.textContent).toContain('native currentTime: 未取得');
});
it.each(['parry', 'dodge'] as const)('%s teaching metadata matches the current runtime effect', kind => {
  const sample = waapiSamples.find(s => s.render === kind)!;
  expect(sample.normal.keyframes).toEqual(timingEffectFrames(kind === 'dodge', 'PERFECT', kind === 'dodge' ? 1 : 0));
  expect(sample.normal.options.duration).toBe(TIMING_EFFECT_DURATION);
  expect(sample.normal.options.fill).toBe('none');
  expect(sample.normal.options.easing ?? 'linear').toBe('linear');
});
