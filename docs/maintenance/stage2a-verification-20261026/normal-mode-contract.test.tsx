// @vitest-environment jsdom
// Independent diagnosis only. WAAPI double is NOT native browser evidence.
// Intentionally outside npm test registration: documents an unresolved regression.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WaapiSampleGallery } from '../../../app/components/WaapiSampleGallery';
let reduced = false;
let mediaListeners: Array<() => void> = [];
let animations: Array<{ target: HTMLElement; cancel: ReturnType<typeof vi.fn>; playState: string; currentTime: number | null }> = [];
beforeEach(() => {
  vi.useFakeTimers(); reduced = false; mediaListeners = []; animations = [];
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener(_event: string, cb: () => void) { mediaListeners.push(cb); }, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { constructor(private cb: IntersectionObserverCallback) {} observe(target: Element) { this.cb([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn(function(this: HTMLElement) {
    const a = { target: this, currentTime: 0 as number | null, playState: 'running', pending: false,
      cancel: vi.fn(() => { a.playState = 'idle'; a.currentTime = null; }),
      pause: vi.fn(() => { a.playState = 'paused'; }), play: vi.fn(() => { a.playState = 'running'; }),
      finished: new Promise<void>(() => {}) };
    animations.push(a); return a;
  }) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function open(name: string) {
  render(<WaapiSampleGallery />);
  fireEvent.click(screen.getByRole('button', { name: /サンプル一覧を見る/ }));
  fireEvent.change(screen.getByLabelText('検索'), { target: { value: name } });
  act(() => vi.advanceTimersByTime(20));
  const card = screen.getByRole('heading', { name }).closest('article')!;
  return { card, click: (name: string) => fireEvent.click(within(card).getByRole('button', { name })) };
}
function reduce() { act(() => { reduced = true; mediaListeners.forEach(cb => cb()); }); act(() => vi.advanceTimersByTime(20)); }
function lastNormal() { return animations.findLast(a => a.target.hasAttribute('data-motion-target'))!; }
it('control: normal Coin Replay before observation cancels old motion when reduced motion turns ON', () => {
  const { click } = open('Coin Pickup Arc'); click('Replay'); const old = lastNormal();
  reduce(); expect(old.cancel).toHaveBeenCalled(); expect(old.playState).toBe('idle');
});
for (const operation of ['Replay', 'COLLECT']) {
  it(`normal Coin ${operation} after observation must still cancel old motion when reduced motion turns ON`, () => {
    const { card, click } = open('Coin Pickup Arc'); click('観察モードを開く'); click('通常モードへ戻る'); click(operation);
    const old = lastNormal(); expect(old.playState).toBe('running'); reduce();
    expect(card.querySelector('[data-normal-game] output')!.textContent).toBe(operation === 'COLLECT' ? 'SCORE 100' : 'SCORE 0');
    expect(old.cancel).toHaveBeenCalled(); expect(old.playState).toBe('idle');
  });
}
it('control: normal Menu motion after observation cancels on reduced motion ON and retains selection', () => {
  const { card, click } = open('Menu Selection Cursor'); click('観察モードを開く'); click('通常モードへ戻る'); click('↓ Down');
  const old = animations.at(-1)!; expect(old.playState).toBe('running'); reduce();
  expect(old.cancel).toHaveBeenCalled(); expect(old.playState).toBe('idle');
  expect(card.querySelector('[data-normal-game] .isSelected')!.textContent).toContain('COLLECTION');
});
