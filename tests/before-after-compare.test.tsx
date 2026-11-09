// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BeforeAfterCompare from '../app/components/practical/BeforeAfterCompare';
import PracticalRoom from '../app/components/PracticalRoom';
import { compareTransition as update, initialCompare, percent, percentAt, valueOf, type CompareAction, type CompareState } from '../app/components/practical/compare-model';
import { phase6aExhibits } from '../app/data/phase6aExhibits';
const ready = (): CompareState => ({ ...initialCompare(), ready: true, loaded: [true, true] });
const actions = (state: CompareState, ...as: CompareAction[]) => as.reduce(update, state);
for (const mode of ['split', 'overlay'] as const) for (const value of [0, 50, 100]) it(`${mode} represents ${value}% exactly and independently`, () => {
  const s = actions(ready(), { type: 'mode', mode }, { type: 'manual', value });
  expect(valueOf(s)).toBe(value); expect(mode === 'split' ? s.alpha : s.position).toBe(50);
});
it('clamps finite values, rejects invalid arithmetic and recovers from zero dimensions', () => {
  expect(percent(-1)).toBe(0); expect(percent(101)).toBe(100);
  for (const n of [NaN, Infinity, -Infinity]) { expect(percent(n)).toBeNull(); expect(update(ready(), { type: 'manual', value: n })).toEqual(ready()); }
  expect(percentAt(75, 25, 100)).toBe(50); expect(percentAt(1, 0, 0)).toBeNull(); expect(percentAt(NaN, 0, 100)).toBeNull();
  let s = actions(ready(), { type: 'manual', value: 73 }, { type: 'measure', ready: false });
  expect(update(s, { type: 'play' })).toBe(s); s = update(s, { type: 'measure', ready: true }); expect(s.position).toBe(73);
});
it('swap preserves both numerical values; reset preserves pair and mode but resets values, swap and speed', () => {
  const s = actions(ready(), { type: 'manual', value: 32 }, { type: 'mode', mode: 'overlay' }, { type: 'manual', value: 81 }, { type: 'swap' });
  expect([s.position, s.alpha, s.reversed]).toEqual([32, 81, true]);
  const reset = update({ ...s, pair: 'correction', speed: 2 }, { type: 'reset' });
  expect([reset.pair, reset.mode, reset.position, reset.alpha, reset.reversed, reset.speed]).toEqual(['correction', 'overlay', 50, 50, false, 1]);
});
for (const reversed of [false, true]) for (const mode of ['split', 'overlay'] as const) it(`replay / pause / resume / finish agrees with Before → After in ${mode}, reversed=${reversed}`, () => {
  let s = update({ ...ready(), mode, reversed }, { type: 'replay' }); const first = s.animation!.id;
  expect(valueOf(s)).toBe(reversed ? 100 : 0);
  s = update(s, { type: 'tick', id: first, delta: 1500 }); expect(valueOf(s)).toBe(reversed ? 75 : 25);
  s = update(s, { type: 'pause' }); expect(s.playback).toBe('paused'); const paused = s;
  expect(update(s, { type: 'tick', id: first, delta: 1e6 })).toBe(paused);
  s = update(s, { type: 'play' }); expect(s.animation!.duration).toBe(4500); const second = s.animation!.id;
  expect(second).not.toBe(first); s = update(s, { type: 'tick', id: second, delta: 4500 });
  expect(valueOf(s)).toBe(reversed ? 0 : 100); expect(s.playback).toBe('finished'); expect(s.animation).toBeNull();
});
it('speed changes pause at the actual position; resuming uses remaining distance and new speed', () => {
  let s = update(ready(), { type: 'replay' }); s = update(s, { type: 'tick', id: s.animation!.id, delta: 1500 });
  s = update(s, { type: 'speed', speed: .5 }); expect(s.position).toBe(25); expect(s.playback).toBe('paused');
  s = update(s, { type: 'play' }); expect(s.animation!.duration).toBe(9000);
  expect(update(s, { type: 'speed', speed: Infinity })).toBe(s);
});
it('repeated Replay creates new epochs; foreign and invalid animation callbacks cannot overwrite state', () => {
  let s = update(ready(), { type: 'replay' }); const stale = s.animation!.id;
  s = update(s, { type: 'replay' }); expect(update(s, { type: 'tick', id: stale, delta: 6000 })).toBe(s);
  for (const delta of [NaN, Infinity, -1]) expect(update(s, { type: 'tick', id: s.animation!.id, delta })).toBe(s);
});
for (const action of [{ type: 'reset' }, { type: 'mode', mode: 'overlay' }, { type: 'pair', pair: 'correction' }, { type: 'swap' }, { type: 'manual', value: 12 }, { type: 'measure', ready: false }, { type: 'reduced', reduced: true }] as CompareAction[]) it(`${action.type} invalidates the running animation and tentative drag`, () => {
  let s = update(ready(), { type: 'replay' }); const id = s.animation!.id;
  s = update(s, action); expect(s.playback).not.toBe('playing'); expect(update(s, { type: 'tick', id, delta: 1e6 })).toBe(s);
  s = actions(ready(), { type: 'start', id: 4, time: 10, value: 70 }, action);
  const next = update(s, { type: 'pointer', id: 4, time: 11, value: 100, phase: 'up' }); expect(next).toBe(s); expect(s.drag).toBeNull();
});
it('pointer owner, monotonic timestamps, provisional value and rollback are separate from committed position', () => {
  let s = update(ready(), { type: 'start', id: 4, time: 20, value: 10 }); expect(valueOf(s)).toBe(10); expect(s.position).toBe(50);
  expect(update(s, { type: 'pointer', id: 5, time: 22, value: 90, phase: 'up' })).toBe(s);
  s = update(s, { type: 'pointer', id: 4, time: 30, value: 60, phase: 'move' });
  expect(update(s, { type: 'pointer', id: 4, time: 25, value: 90, phase: 'up' })).toBe(s);
  expect(update(s, { type: 'pointer', id: 4, time: 31, value: 0, phase: 'cancel' }).position).toBe(50);
  s = update(s, { type: 'pointer', id: 4, time: 31, value: 90, phase: 'up' }); expect(s.position).toBe(90); expect(s.drag).toBeNull();
});
it('pair change resets values and rejects old load/error callbacks; failure stops replay', () => {
  let s = actions(ready(), { type: 'swap' }, { type: 'manual', value: 0 }, { type: 'pair', pair: 'correction' });
  expect([s.position, s.alpha, s.reversed, s.loaded]).toEqual([50, 50, false, [false, false]]);
  expect(update(s, { type: 'asset', resource: 0, index: 0, ok: false })).toBe(s);
  s = actions(s, { type: 'asset', resource: 1, index: 0, ok: true }, { type: 'asset', resource: 1, index: 1, ok: true }, { type: 'replay' });
  s = update(s, { type: 'asset', resource: 1, index: 1, ok: false }); expect(s.error).toBe(true); expect(s.playback).toBe('paused'); expect(update(s, { type: 'play' })).toBe(s);
});
it('reduced motion preserves manual comparisons, finishes explicit play atomically and pauses a running comparison on preference change', () => {
  let s = actions(ready(), { type: 'reduced', reduced: true }, { type: 'manual', value: 41 }); expect(s.position).toBe(41);
  s = update(s, { type: 'replay' }); expect(s.position).toBe(100); expect(s.animation).toBeNull();
  s = actions(ready(), { type: 'replay' }); s = update(s, { type: 'tick', id: s.animation!.id, delta: 1500 });
  s = update(s, { type: 'reduced', reduced: true }); expect(s.position).toBe(25); expect(s.playback).toBe('paused');
});

let measure: () => void, width: number, media: (e?: unknown) => void, reduced: boolean, nextFrame: number, frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  width = 600; reduced = false; frames = new Map(); nextFrame = 0;
  vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { measure = cb; } observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, cb: typeof media) => { media = cb; }, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++nextFrame, cb); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: width * 760 / 1200, width, height: width * 760 / 1200, toJSON() {} }));
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId: number; pointerType: string; constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerId = options.pointerId ?? 1; this.pointerType = options.pointerType ?? 'mouse'; } });
  HTMLElement.prototype.setPointerCapture = () => {}; HTMLElement.prototype.hasPointerCapture = () => false; HTMLElement.prototype.releasePointerCapture = () => {};
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1200); vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(760);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
function load() { screen.getAllByRole('img').forEach(el => fireEvent.load(el)); }
function ui() { const result = render(<BeforeAfterCompare />); load(); return result; }
const read = () => screen.getByTestId('bc-value').textContent;
function start() {
  const zone = screen.getByTestId('bc-canvas'); fireEvent.pointerDown(screen.getByRole('slider', { name: '比較境界' }), { pointerId: 1, button: 0, clientX: 300 });
  fireEvent.pointerMove(zone, { pointerId: 1, clientX: 480 }); return zone;
}
it('keyboard steps, Shift steps and endpoints operate both boundary and native range; ARIA matches mask/alpha', () => {
  ui(); const handle = screen.getByRole('slider', { name: '比較境界' });
  fireEvent.keyDown(handle, { key: 'ArrowRight' }); expect(read()).toBe('51%');
  fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true }); expect(read()).toBe('41%');
  fireEvent.keyDown(handle, { key: 'End' }); expect(handle.getAttribute('aria-valuenow')).toBe('100');
  expect(screen.getByTestId('bc-top').style.clipPath).toBe('inset(0 0% 0 0)');
  fireEvent.keyDown(handle, { key: 'Home' }); expect(read()).toBe('0%');
  click('Overlay / 透明度'); const range = screen.getByRole('slider', { name: '比較透明度' }); fireEvent.keyDown(range, { key: 'ArrowUp', shiftKey: true });
  expect(read()).toBe('60%'); expect(screen.getByTestId('bc-top').style.opacity).toBe('0.6'); click('Before / Afterを反転'); expect(read()).toBe('60%'); expect(range.getAttribute('aria-valuetext')).toContain('Before');
});
for (const reason of ['Escape', 'pointercancel', 'lostpointercapture', 'Reset', 'hidden', 'resize', 'focus']) it(`UI aborts provisional drag on ${reason} and rejects late pointer up`, () => {
  ui(); const zone = start(); expect(read()).toBe('80%');
  if (reason === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
  else if (reason === 'Reset') click('Reset');
  else if (reason === 'hidden') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); fireEvent(document, new Event('visibilitychange')); }
  else if (reason === 'resize') { width = 0; act(() => measure()); }
  else if (reason === 'focus') fireEvent.blur(zone, { relatedTarget: document.body });
  else fireEvent(zone, new PointerEvent(reason, { bubbles: true, pointerId: 1 }));
  fireEvent.pointerUp(zone, { pointerId: 1, clientX: 600 }); expect(read()).toBe('50%'); expect(zone.dataset.dragging).toBe('false');
  if (reason === 'resize') { width = 600; act(() => measure()); expect(zone.dataset.ready).toBe('true'); }
});
it('image surface leaves touch scrolling alone; explicit handle touch and mouse use the comparison', () => {
  ui(); const zone = screen.getByTestId('bc-canvas');
  fireEvent.pointerDown(zone, { pointerId: 2, pointerType: 'touch', button: 0, clientX: 150 }); expect(zone.dataset.dragging).toBe('false');
  fireEvent.pointerDown(screen.getByRole('slider', { name: '比較境界' }), { pointerId: 2, pointerType: 'touch', button: 0, clientX: 300 });
  fireEvent.pointerUp(zone, { pointerId: 2, clientX: 150 }); expect(read()).toBe('25%');
});
for (const [key, value, x] of [['Home', '0%', 24], ['End', '100%', 576]] as const) it(`pressing the inward edge handle at ${value} does not move the boundary`, () => {
  ui(); const handle = screen.getByRole('slider', { name: '比較境界' }); fireEvent.keyDown(handle, { key });
  fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x }); expect(read()).toBe(value);
  fireEvent.pointerUp(screen.getByTestId('bc-canvas'), { pointerId: 1, clientX: x }); expect(read()).toBe(value);
});
it('rAF updates hold pause/resume position; mode/pair/Reset/preference changes invalidate queued callbacks and unmount cleans up', () => {
  const { unmount } = ui(); click('Replay'); const first = [...frames.values()][0];
  act(() => first(1500)); expect(read()).toBe('25%'); click('一時停止'); act(() => first(6000)); expect(read()).toBe('25%');
  click('再開'); const resumed = [...frames.values()].at(-1)!; act(() => resumed(1500)); expect(read()).toBe('50%');
  click('Overlay / 透明度'); act(() => resumed(6000)); expect(read()).toBe('50%');
  click('Replay'); const oldPair = [...frames.values()].at(-1)!; fireEvent.change(screen.getByLabelText('比較する図版'), { target: { value: 'correction' } }); load(); act(() => oldPair(9000)); expect(read()).toBe('50%');
  click('Replay'); const oldMotion = [...frames.values()].at(-1)!; act(() => oldMotion(1500)); reduced = true; act(() => media()); expect(read()).toBe('25%'); act(() => oldMotion(6000)); expect(read()).toBe('25%');
  click('Reset'); expect(read()).toBe('50%'); click('自動比較'); expect(read()).toBe('100%'); unmount(); expect(frames.has(nextFrame)).toBe(false);
});
it('load failure is visible, blocks playback, and retry replaces image generation', () => {
  ui(); fireEvent.error(screen.getAllByRole('img')[0]); expect(screen.getByRole('alert').textContent).toContain('表示できません');
  expect(screen.getByRole('button', { name: '自動比較' }).hasAttribute('disabled')).toBe(true);
  click('図版を再読込'); load(); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByTestId('bc-canvas').dataset.ready).toBe('true');
});
it('accepts a decoded SVG whose renderer reports 300×190 natural size while its source coordinates stay 1200×760', () => {
  vi.mocked(Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth')!.get!).mockReturnValue(300);
  vi.mocked(Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalHeight')!.get!).mockReturnValue(190);
  ui(); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByTestId('bc-canvas').dataset.ready).toBe('true');
  for (const image of screen.getAllByRole('img')) { expect(image.getAttribute('width')).toBe('1200'); expect(image.getAttribute('height')).toBe('760'); }
});
it('rejects a loaded image with no intrinsic pixels, then recovers on explicit retry with valid renderer dimensions', () => {
  const naturalWidth = vi.mocked(Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth')!.get!);
  naturalWidth.mockReturnValue(0); ui(); expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.getByTestId('bc-canvas').dataset.ready).toBe('false');
  naturalWidth.mockReturnValue(300); click('図版を再読込'); load(); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByTestId('bc-canvas').dataset.ready).toBe('true');
});
it('registration adds exactly one searchable comparison exhibit and closing/reopening resets it', () => {
  expect(phase6aExhibits.map(e => e.id)).toEqual(['pan-zoom', 'image-crop', 'before-after-compare', 'image-annotation', 'layer-composer']);
  render(<PracticalRoom phase={4} />); click('部品展示室を開く'); fireEvent.change(screen.getByLabelText('部品名・用途・技術で検索'), { target: { value: '画像編集・比較' } });
  click('Before / After Compare / 画像の変化を見比べる'); load(); fireEvent.keyDown(screen.getByRole('slider', { name: '比較位置' }), { key: 'End' }); expect(read()).toBe('100%');
  click('部品展示室を閉じる'); expect(screen.queryByTestId('before-after-compare')).toBeNull(); click('部品展示室を開く'); load(); expect(read()).toBe('50%');
});
