// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ImageAnnotation from '../app/components/practical/ImageAnnotation';
import { phase6aExhibits } from '../app/data/phase6aExhibits';
let resize: () => void, width: number;
beforeEach(() => {
  width = 600; vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { resize = cb; } observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 10, y: 20, left: 10, top: 20, width, height: 400, right: 10 + width, bottom: 420, toJSON() {} }));
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId: number; pointerType: string; constructor(type: string, opts: PointerEventInit = {}) { super(type, opts); this.pointerId = opts.pointerId ?? 1; this.pointerType = opts.pointerType ?? 'mouse'; } });
  SVGElement.prototype.setPointerCapture = () => {}; SVGElement.prototype.hasPointerCapture = () => false; SVGElement.prototype.releasePointerCapture = () => {};
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const marks = () => (JSON.parse(screen.getByTestId('image-annotation').dataset.committed!) as {id:string}[]).map(a => screen.getByTestId(`ia-mark-${a.id}`));
const list = () => within(screen.getByRole('region', { name: '注釈一覧' }));
it('registers exactly one new exhibit alongside all three existing images', () => {
  expect(phase6aExhibits.map(x => x.id)).toEqual(['pan-zoom', 'image-crop', 'before-after-compare', 'image-annotation']);
});
it('adds each tool without dragging, edits text and geometry, deletes and restores exact annotations', () => {
  render(<ImageAnnotation />); expect(marks().length).toBe(4);
  for (const name of ['ピン', '矢印', '範囲', '説明文']) { click(name); click('中央に追加'); }
  expect(marks().length).toBe(8);
  fireEvent.change(screen.getByLabelText('注釈タイトル'), { target: { value: '新しい観察' } });
  fireEvent.change(screen.getByLabelText('注釈説明'), { target: { value: '長い説明'.repeat(100) } });
  fireEvent.change(screen.getByLabelText('座標 x'), { target: { value: '0.7' } }); click('変更を適用');
  expect(screen.getByTestId('ia-description').textContent).toContain('新しい観察');
  click('Undo'); expect(screen.getByTestId('ia-description').textContent).not.toContain('新しい観察');
  click('Redo'); expect(screen.getByTestId('ia-description').textContent).toContain('新しい観察');
  click('選択を削除'); expect(marks().length).toBe(7); expect(document.activeElement).toBe(screen.getByTestId('ia-canvas'));
  click('Undo'); expect(marks().length).toBe(8); expect(list().getByText('新しい観察')).toBeTruthy();
});
it('rejects invalid numbers without committing history; form Escape does not silently submit', () => {
  render(<ImageAnnotation />); const before = screen.getByTestId('image-annotation').dataset.history;
  for (const value of ['', 'NaN', 'Infinity', '-0.1', '1.01', '0.100000000000000005']) {
    fireEvent.change(screen.getByLabelText('座標 x'), { target: { value } }); click('変更を適用');
    expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.getByTestId('image-annotation').dataset.history).toBe(before);
  }
});
it('guide advances in edited number order, pauses and resumes, locks editing and resets from view', () => {
  render(<ImageAnnotation />); fireEvent.change(screen.getByLabelText('注釈番号'), { target: { value: '9' } }); click('変更を適用');
  click('ガイド再生'); const root = screen.getByTestId('image-annotation'); expect(root.dataset.mode).toBe('view'); expect(root.dataset.guide).toBe('playing');
  expect(screen.getByTestId('ia-description').textContent).toContain('温室への道'); expect((screen.getByRole('button', { name: '中央に追加' }) as HTMLButtonElement).disabled).toBe(true);
  act(() => vi.advanceTimersByTime(3500)); expect(screen.getByTestId('ia-description').textContent).toContain('温室');
  click('一時停止'); const paused = screen.getByTestId('ia-description').textContent; act(() => vi.advanceTimersByTime(7000)); expect(screen.getByTestId('ia-description').textContent).toBe(paused);
  click('再開'); act(() => vi.advanceTimersByTime(3500)); expect(screen.getByTestId('ia-description').textContent).not.toBe(paused);
  click('Reset'); expect(root.dataset.guide).toBe('idle'); expect(root.dataset.history).toBe('0'); expect(root.dataset.mode).toBe('edit');
});
it('pointer cancel/Escape restore committed shape, reject foreign and late events and one drag is one history entry', () => {
  render(<ImageAnnotation />); const canvas = screen.getByTestId('ia-canvas'), mark = marks()[0], original = mark.innerHTML;
  const down = () => fireEvent.pointerDown(mark, { pointerId: 1, button: 0, clientX: 160, clientY: 210 });
  const move = () => fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 230, clientY: 240 });
  down(); move(); expect(mark.innerHTML).not.toBe(original); fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 400, clientY: 240 }); expect(canvas.dataset.dragging).toBe('true');
  fireEvent.keyDown(document, { key: 'Escape' }); expect(mark.innerHTML).toBe(original);
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 550, clientY: 340 }); expect(mark.innerHTML).toBe(original);
  down(); move(); fireEvent.pointerCancel(canvas, { pointerId: 1 }); expect(mark.innerHTML).toBe(original);
  down(); move(); move(); fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 230, clientY: 240 }); expect(canvas.dataset.dragging).toBe('false'); expect(screen.getByTestId('image-annotation').dataset.history).toBe('1');
  click('Undo'); expect(mark.innerHTML).toBe(original); click('Redo'); expect(mark.innerHTML).not.toBe(original);
});
it('zero-sized canvas rejects addition and resize recovery retains normalized state', () => {
  render(<ImageAnnotation />); const original = marks()[0].innerHTML; width = 0; act(() => resize()); click('ピン');
  fireEvent.pointerDown(screen.getByTestId('ia-canvas'), { button: 0, pointerId: 3, clientX: 12, clientY: 40 }); expect(marks().length).toBe(4);
  width = 600; act(() => resize()); expect(marks()[0].innerHTML).toBe(original); expect(screen.getByTestId('ia-canvas').dataset.ready).toBe('true');
});
it('scene change replaces annotations and history; detached delayed events cannot change a fresh mount', () => {
  const { unmount } = render(<ImageAnnotation />); click('中央に追加'); fireEvent.change(screen.getByLabelText('注釈の図版'), { target: { value: 'machine' } });
  expect(screen.getByTestId('image-annotation').dataset.history).toBe('0'); expect(marks().length).toBe(4); const oldCanvas = screen.getByTestId('ia-canvas'); unmount();
  render(<ImageAnnotation />); fireEvent.pointerUp(oldCanvas, { pointerId: 1, clientX: 400, clientY: 400 }); expect(screen.getByTestId('image-annotation').dataset.scene).toBe('map'); expect(marks().length).toBe(4);
});
it('normal focus transfer and positive-size layout resize do not pause a playing guide', () => {
  render(<ImageAnnotation />); click('ガイド再生');
  const root = screen.getByTestId('image-annotation'), canvas = screen.getByTestId('ia-canvas');
  fireEvent.blur(canvas, { relatedTarget: screen.getByRole('button', { name: '一時停止' }) });
  expect(root.dataset.guide).toBe('playing');
  width = 540; act(() => resize()); expect(root.dataset.guide).toBe('playing');
  act(() => vi.advanceTimersByTime(3500)); expect(screen.getByTestId('ia-description').textContent).toContain('温室への道');
});
it('releasing an arrow endpoint onto its other endpoint terminates the rejected gesture without history', () => {
  render(<ImageAnnotation />);
  fireEvent.click(list().getByRole('button', { name: /温室への道/ }));
  const root = screen.getByTestId('image-annotation'), canvas = screen.getByTestId('ia-canvas');
  const committed = root.dataset.committed;
  const handle = screen.getByTestId('ia-mark-map-route').querySelector('[data-handle="arrow-end"]')!;
  // Viewport 600×400 contains the 1200×760 source at client (10,30), size 600×380.
  fireEvent.pointerDown(handle, { pointerId: 7, button: 0, clientX: 298, clientY: 166.8 });
  expect(canvas.dataset.dragging).toBe('true');
  fireEvent.pointerUp(canvas, { pointerId: 7, clientX: 208, clientY: 197.2 });
  expect(canvas.dataset.dragging).toBe('false');
  expect(root.dataset.committed).toBe(committed); expect(root.dataset.history).toBe('0');
});
it('accepted minimum-length arrows remain movable by repeated keyboard steps', () => {
  render(<ImageAnnotation />);
  fireEvent.click(list().getByRole('button', { name: /温室への道/ }));
  for (const [key, value] of Object.entries({ x: '0', y: '0.5', x2: '0.025', y2: '0.5' })) fireEvent.change(screen.getByLabelText(`座標 ${key}`), { target: { value } });
  click('変更を適用'); expect(screen.queryByRole('alert')).toBeNull();
  const canvas = screen.getByTestId('ia-canvas');
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  expect(Number(screen.getByTestId('ia-mark-map-route').getAttribute('data-x'))).toBeCloseTo(.05, 14);
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  expect(Number(screen.getByTestId('ia-mark-map-route').getAttribute('data-x'))).toBeCloseTo(.1, 14);
  expect(screen.getByTestId('image-annotation').dataset.history).toBe('3');
});
