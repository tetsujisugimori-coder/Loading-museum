// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ImageCrop from '../app/components/practical/ImageCrop';
import PracticalRoom from '../app/components/PracticalRoom';
import { changeRatio, equal, INITIAL, initialState, move, numeric, RATIOS, resize, transition, type Corner, type Ratio, type Selection } from '../app/components/practical/image-crop-model';
import { phase6aExhibits } from '../app/data/phase6aExhibits';
import { phase4aExhibits } from '../app/data/phase4aExhibits';
import { phase4bExhibits } from '../app/data/phase4bExhibits';
import { phase5aExhibits } from '../app/data/phase5aExhibits';
import { phase5bExhibits } from '../app/data/phase5bExhibits';
let measure: () => void, width: number;
beforeEach(() => {
  width = 500;
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { measure = cb; } observe() {} disconnect() {} });
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId: number; pointerType: string; constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerId = options.pointerId ?? 1; this.pointerType = options.pointerType ?? 'mouse'; } });
  // Browser-specific rendering is tested by the separate native harness, not these identity mocks.
  vi.stubGlobal('DOMPoint', class { constructor(public x: number, public y: number) {} matrixTransform() { return this; } });
  Object.defineProperty(SVGElement.prototype, 'getScreenCTM', { configurable: true, value: () => ({ a: 1, inverse: () => ({}) }) });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: width * .7, width, height: width * .7, toJSON() {} }));
  HTMLElement.prototype.setPointerCapture = () => {}; HTMLElement.prototype.releasePointerCapture = () => {}; HTMLElement.prototype.hasPointerCapture = () => false;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const box = () => screen.getByTestId('ic-preview').getAttribute('viewBox');
const confirmed = () => screen.getByTestId('ic-confirmed').getAttribute('viewBox');
function start(id = 1, handle?: string) {
  const zone = screen.getByRole('group', { name: '切抜き枠の操作領域' });
  fireEvent.pointerDown(handle ? screen.getByRole('button', { name: `${handle}の角を伸縮` }) : screen.getByTestId('ic-frame'), { pointerId: id, button: 0, clientX: 200, clientY: 200 });
  fireEvent.pointerMove(zone, { pointerId: id, clientX: 230, clientY: 220 }); return zone;
}
function stale(zone: HTMLElement, id = 1) { fireEvent.pointerMove(zone, { pointerId: id, clientX: 300, clientY: 300 }); fireEvent.pointerUp(zone, { pointerId: id, clientX: 300, clientY: 300 }); }
function invariant(s: Selection) {
  const r = s.rect; expect(Object.values(r).every(Number.isFinite)).toBe(true);
  expect(r.x).toBeGreaterThanOrEqual(-1e-8); expect(r.y).toBeGreaterThanOrEqual(-1e-8);
  expect(r.width).toBeGreaterThanOrEqual(80 - 1e-8); expect(r.height).toBeGreaterThanOrEqual(80 - 1e-8);
  expect(r.x + r.width).toBeLessThanOrEqual(1000 + 1e-8); expect(r.y + r.height).toBeLessThanOrEqual(700 + 1e-8);
  if (RATIOS[s.ratio]) expect(r.width / r.height).toBeCloseTo(RATIOS[s.ratio]!, 10);
}
it('moves without resizing and stops at all four source boundaries', () => {
  expect(move(INITIAL.rect, -1e4, -1e4)).toEqual({ ...INITIAL.rect, x: 0, y: 0 });
  expect(move(INITIAL.rect, 1e4, 1e4)).toEqual({ ...INITIAL.rect, x: 520, y: 340 });
  expect(move(INITIAL.rect, NaN, 10)).toBe(INITIAL.rect);
});
for (const [corner, rect] of Object.entries({ nw: { x: 120, y: 150, width: 460, height: 330 }, ne: { x: 100, y: 150, width: 500, height: 330 }, sw: { x: 120, y: 120, width: 460, height: 390 }, se: { x: 100, y: 120, width: 500, height: 390 } })) it(`resizes ${corner} with its opposite corner fixed`, () => {
  expect(resize(INITIAL, corner as Corner, 20, 30).rect).toEqual(rect);
  const sx = corner.endsWith('w') ? 1 : -1, sy = corner.startsWith('n') ? 1 : -1;
  const minimum = resize(INITIAL, corner as Corner, sx * 1e6, sy * 1e6); expect(minimum.rect.width).toBe(80); expect(minimum.rect.height).toBe(80); invariant(minimum);
  invariant(resize(INITIAL, corner as Corner, -sx * 1e6, -sy * 1e6));
});
it('keeps every ratio and all boundaries under mixed edits and inverted handle attempts', () => {
  for (const ratio of Object.keys(RATIOS) as Ratio[]) {
    let s = changeRatio(INITIAL, ratio); invariant(s);
    for (let i = 0; i < 120; i++) {
      s = { ...s, rect: move(s.rect, (i % 3 - 1) * 267, (i % 5 - 2) * 183) };
      s = resize(s, (['nw', 'ne', 'sw', 'se'] as Corner[])[i % 4], (i % 7 - 3) * 431, (i % 11 - 5) * 277); invariant(s);
    }
  }
});
it('ratio changes preserve center until a source edge requires correction', () => {
  expect(changeRatio(INITIAL, 'square').rect).toEqual({ x: 100, y: 60, width: 480, height: 480 });
  const edge = { ratio: 'free' as const, rect: { x: 780, y: 590, width: 200, height: 100 } };
  expect(changeRatio(edge, 'square').rect).toEqual({ x: 780, y: 500, width: 200, height: 200 });
  expect(changeRatio({ ratio: 'free', rect: { x: 0, y: 0, width: 1000, height: 700 } }, 'square').rect).toEqual({ x: 150, y: 0, width: 700, height: 700 });
});
it('numeric validation rejects blanks, nonfinite, negative, undersize and outside values, with width driving fixed ratios', () => {
  const valid = { x: '120', y: '140', width: '320', height: '180' };
  expect(numeric(valid, 'wide').selection?.rect).toEqual({ x: 120, y: 140, width: 320, height: 180 });
  expect(numeric({ ...valid, height: '200' }, 'wide').selection?.rect.height).toBe(180);
  expect(numeric({ ...valid, width: 'Infinity', height: '' }, 'wide').error).toContain('有限');
  expect(numeric({ ...valid, height: '' }, 'wide').selection?.rect.height).toBe(180);
  for (const patch of [{ x: '' }, { y: 'Infinity' }, { x: '-1' }, { width: '-2' }, { height: '79' }, { width: '1001' }, { y: '650' }, { width: 'NaN' }]) expect(numeric({ ...valid, ...patch }, 'free').selection).toBeUndefined();
});
it('model separates provisional/editing/committed and refuses foreign, stale and post-command pointer events', () => {
  let s = transition(initialState(), { type: 'start', id: 7, time: 100, x: 0, y: 0 });
  s = transition(s, { type: 'pointer', phase: 'move', id: 7, time: 101, x: 50, y: 20 });
  expect(s.committed).toEqual(INITIAL); expect(s.editing.rect.x).toBe(150);
  const changed = s; expect(transition(s, { type: 'pointer', phase: 'up', id: 8, time: 102, x: 500, y: 500 })).toBe(changed);
  expect(transition(s, { type: 'pointer', phase: 'up', id: 7, time: 99, x: 500, y: 500 })).toBe(changed);
  s = transition(s, { type: 'confirm' }); expect(s.committed).toEqual(INITIAL); expect(s.drag).toBeNull();
  expect(transition(s, { type: 'pointer', phase: 'up', id: 7, time: 110, x: 500, y: 500 })).toBe(s);
  s = transition(s, { type: 'move', dx: 30, dy: 40 }); s = transition(s, { type: 'confirm' });
  s = transition(s, { type: 'ratio', ratio: 'wide' }); expect(equal(s.editing, s.committed)).toBe(false);
  s = transition(s, { type: 'cancel' }); expect(s.editing).toBe(s.committed); expect(s.editing.rect.x).toBe(130);
  s = transition(s, { type: 'start', id: 7, time: 200, x: 0, y: 0 });
  expect(transition(s, { type: 'pointer', phase: 'up', id: 7, time: 199, x: 500, y: 500 })).toBe(s);
});
it('initial confirmed result, editing preview, confirm, further edit, cancel and Reset agree', () => {
  render(<ImageCrop />); expect(box()).toBe('100 120 480 360'); expect(confirmed()).toBe(box()); expect(screen.getByRole('button', { name: '切抜きを確定' }).hasAttribute('disabled')).toBe(true);
  click('→ 右'); expect(box()).toBe('110 120 480 360'); expect(confirmed()).toBe('100 120 480 360'); click('切抜きを確定');
  fireEvent.change(screen.getByLabelText('切抜き比率'), { target: { value: 'square' } }); click('↓ 下'); click('編集を取消'); expect(box()).toBe('110 120 480 360');
  expect((screen.getByLabelText('切抜き比率') as HTMLSelectElement).value).toBe('free'); click('Reset'); expect(box()).toBe('100 120 480 360'); expect(confirmed()).toBe(box());
});
it('actual numeric form, independent numeric vs pointer equivalence, invalid value messages and input arrow scope', () => {
  render(<ImageCrop />); const old = box(); for (const [label, value] of [['X', '130'], ['Y', '140'], ['幅', '480'], ['高さ', '360']]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  expect(box()).toBe(old); click('数値を適用'); const numericBox = box(); click('Reset'); const zone = start(); fireEvent.pointerUp(zone, { pointerId: 1, clientX: 230, clientY: 220 }); expect(box()).toBe(numericBox);
  for (const bad of ['', 'Infinity', '-1', '900']) { const stable = box(); fireEvent.change(screen.getByLabelText('X', { exact: true }), { target: { value: bad } }); click('数値を適用'); expect(box()).toBe(stable); expect(screen.getByRole('status').textContent).toMatch(/空欄|有限|内側/); }
  fireEvent.keyDown(screen.getByLabelText('X', { exact: true }), { key: 'ArrowRight' }); expect(box()).toBe(numericBox);
  fireEvent.keyDown(zone, { key: 'ArrowRight' }); expect(box()).toBe('140 140 480 360');
  fireEvent.change(screen.getByLabelText('切抜き比率'), { target: { value: 'wide' } }); fireEvent.change(screen.getByLabelText('幅', { exact: true }), { target: { value: '320' } }); expect((screen.getByLabelText('高さ') as HTMLInputElement).value).toBe('180'); click('数値を適用'); expect(box()?.split(' ').slice(2)).toEqual(['320', '180']);
  const fixedBefore = box(); fireEvent.change(screen.getByLabelText('幅', { exact: true }), { target: { value: 'Infinity' } }); click('数値を適用'); expect(box()).toBe(fixedBefore); expect(screen.getByRole('status').textContent).toContain('有限');
});
for (const reason of ['pointercancel', 'lostpointercapture', 'Escape', 'blur', 'hidden', 'focus']) it(`rolls back provisional edit on ${reason}, not the last confirmed result`, () => {
  render(<ImageCrop />); click('→ 右'); const before = box(), result = confirmed(), zone = start(); expect(box()).not.toBe(before);
  fireEvent.pointerUp(zone, { pointerId: 2, clientX: 700, clientY: 600 }); expect(zone.dataset.dragging).toBe('true');
  if (reason === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
  else if (reason === 'blur') fireEvent(window, new Event('blur'));
  else if (reason === 'hidden') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); fireEvent(document, new Event('visibilitychange')); }
  else if (reason === 'focus') fireEvent.blur(zone, { relatedTarget: document.body });
  else fireEvent(zone, new PointerEvent(reason, { bubbles: true, pointerId: 1 }));
  stale(zone); expect(box()).toBe(before); expect(confirmed()).toBe(result); expect(zone.dataset.dragging).toBe('false');
});
for (const action of ['切抜きを確定', '編集を取消', 'Reset', 'ratio', 'numeric', 'direction']) it(`invalidates pending pointer before ${action}`, () => {
  render(<ImageCrop />); click('→ 右'); const zone = start();
  if (action === 'ratio') fireEvent.change(screen.getByLabelText('切抜き比率'), { target: { value: 'square' } });
  else if (action === 'numeric') click('数値を適用'); else click(action === 'direction' ? '↓ 下' : action);
  const stable = box(); stale(zone); expect(box()).toBe(stable); expect(zone.dataset.dragging).toBe('false');
  if (action === '切抜きを確定') expect(confirmed()).toBe('110 120 480 360');
});
it('keyboard corners resize via the same constraints and capture failure cannot leave a provisional edit', () => {
  render(<ImageCrop />); const handle = screen.getByRole('button', { name: '右下の角を伸縮' }); fireEvent.keyDown(handle, { key: 'ArrowRight' }); expect(box()).toBe('100 120 490 360');
  HTMLElement.prototype.setPointerCapture = () => { throw new Error('inactive pointer'); }; const before = box(); start(); expect(box()).toBe(before); expect(screen.getByRole('status').textContent).toContain('開始できません');
});
it('retains world coordinates and committed crop through resizing, zero width and restoration; unmount releases listeners', () => {
  const { unmount } = render(<ImageCrop />); click('→ 右'); click('切抜きを確定'); const before = box(), zone = start(); width = 0; act(() => measure()); expect(box()).toBe(before); expect(zone.dataset.ready).toBe('false');
  width = 390; act(() => measure()); expect(zone.dataset.ready).toBe('true'); expect(box()).toBe(before); expect(confirmed()).toBe(before); stale(zone); expect(box()).toBe(before);
  const remove = vi.spyOn(document, 'removeEventListener'); unmount(); expect(remove.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true); expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
});
it('registers only one new unique ID, searches by crop tags, switches and closes without retaining state', () => {
  const all = [...phase4aExhibits, ...phase4bExhibits, ...phase5aExhibits, ...phase5bExhibits, ...phase6aExhibits]; expect(all).toHaveLength(26); expect(new Set(all.map(e => e.id)).size).toBe(26); expect(phase6aExhibits.map(e => e.id)).toEqual(['pan-zoom', 'image-crop']);
  render(<PracticalRoom phase={4} />); click('部品展示室を開く'); fireEvent.change(screen.getByLabelText('部品名・用途・技術で検索'), { target: { value: 'トリミング' } }); expect(within(screen.getByRole('navigation')).getAllByRole('button')).toHaveLength(1); click('Image Crop / 構図を切り取る'); click('→ 右'); start();
  click('閉室して一覧へ戻る'); expect(screen.queryByTestId('image-crop')).toBeNull(); expect(document.activeElement?.textContent).toBe('部品展示室を開く'); click('部品展示室を開く'); expect(box()).toBe('100 120 480 360');
});
