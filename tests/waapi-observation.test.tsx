// @vitest-environment jsdom
// Contract tests with a controllable WAAPI test double, NOT native rendering evidence.
// Time progresses independently of component RAF. Pending pause/play resolve separately.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaapiGameObservation, clampObservationTime } from '../app/components/WaapiGameObservation';
import { WaapiSampleGallery } from '../app/components/WaapiSampleGallery';
import { waapiSamples } from '../app/data/waapiSamples';

let animations: AnimationDouble[];
let observers: ResizeObserverDouble[];
let intersections: Array<{ callback: IntersectionObserverCallback; target: Element }>;
let rafHistory: FrameRequestCallback[];
let delayedPause: boolean;
let mediaListeners: Array<() => void>;
let mediaReduced: boolean;
const menu = waapiSamples.find(s => s.render === 'menu')!;
const coin = waapiSamples.find(s => s.render === 'coin')!;

class AnimationDouble {
  target: HTMLElement;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
  private held: number | null = 0;
  private started = Date.now();
  private state: AnimationPlayState = 'running';
  private request = 0;
  pending = false;
  ready: Promise<AnimationDouble> = Promise.resolve(this);
  cancel = vi.fn(() => { this.request++; this.held = null; this.state = 'idle'; this.pending = false; });
  finished = new Promise<AnimationDouble>(() => {});
  constructor(target: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    this.target = target; this.frames = frames; this.options = options;
  }
  get currentTime() {
    if (this.held === null) return null;
    return this.state === 'running' ? Math.min(Number(this.options.duration), this.held + (Date.now() - this.started)) : this.held;
  }
  set currentTime(value: number | null) { this.held = value; this.started = Date.now(); }
  get playState(): AnimationPlayState { return this.state === 'running' && this.currentTime! >= Number(this.options.duration) ? 'finished' : this.state; }
  pause = vi.fn(() => {
    const at = this.currentTime;
    this.held = at; this.state = 'paused';
    if (delayedPause) {
      const token = ++this.request; this.pending = true;
      this.ready = new Promise(resolve => setTimeout(() => { if (token === this.request) this.pending = false; resolve(this); }, 5));
    }
  });
  play = vi.fn(() => {
    if (this.currentTime === null || this.currentTime! >= Number(this.options.duration)) this.held = 0;
    this.started = Date.now(); this.state = 'running'; this.pending = false;
  });
}
class ResizeObserverDouble {
  callback: ResizeObserverCallback;
  disconnected = false;
  observe = vi.fn();
  disconnect = vi.fn(() => { this.disconnected = true; });
  constructor(callback: ResizeObserverCallback) { this.callback = callback; observers.push(this); }
  deliver() { this.callback([], this as unknown as ResizeObserver); }
}
function advance(ms: number) { act(() => vi.advanceTimersByTime(ms)); }
function button(name: string) { return screen.getByRole('button', { name }); }
function click(name: string) { fireEvent.click(button(name)); }
function reading() { return screen.getByText(/native playState:/).textContent!; }
function targetAnimation() { return animations.findLast(a => a.target.hasAttribute('data-observation-target'))!; }
function slider() { return screen.getByRole('slider', { name: '観察時間（ms）' }) as HTMLInputElement; }
function seek(value: number) { fireEvent.change(slider(), { target: { value: String(value) } }); }
function time() { return Number(slider().value); }
function openGallery(name: string) {
  const mounted = render(<WaapiSampleGallery />);
  fireEvent.click(screen.getByRole('button', { name: /サンプル一覧を見る/ }));
  fireEvent.change(screen.getByLabelText('検索'), { target: { value: name } });
  advance(20);
  const card = screen.getByRole('heading', { name }).closest('article')!;
  return { ...mounted, card, controls: within(card) };
}
function visibility(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}

beforeEach(() => {
  vi.useFakeTimers(); animations = []; observers = []; intersections = []; rafHistory = []; delayedPause = false; mediaListeners = []; mediaReduced = false;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.stubGlobal('matchMedia', () => ({ get matches() { return mediaReduced; }, addEventListener(_event: string, callback: () => void) { mediaListeners.push(callback); }, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) { intersections.push({ callback: this.callback, target }); this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() {}
  });
  vi.stubGlobal('ResizeObserver', ResizeObserverDouble);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { rafHistory.push(callback); return window.setTimeout(() => callback(Date.now()), 16); });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn(function(this: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) { const a = new AnimationDouble(this, frames, options); animations.push(a); return a; }) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('independent observation controller contract (WAAPI double)', () => {
  it('initial preview is paused at zero and has actual native labels rather than simulated success', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />);
    expect(time()).toBe(0); expect(targetAnimation().playState).toBe('paused'); expect(reading()).toContain('controller: paused'); expect(reading()).toContain('native playState: paused');
  });
  it('play advances time from the animation, not a second game clock', () => {
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); advance(64);
    expect(time()).toBe(64); expect(targetAnimation().currentTime).toBe(64); expect(reading()).toContain('controller: running');
  });
  it('pause keeps the exact position and resume continues from that point', () => {
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); advance(73); click('一時停止');
    expect(time()).toBe(73); advance(500); expect(time()).toBe(73); expect(targetAnimation().currentTime).toBe(73);
    click('再生 / 再開'); advance(32); expect(time()).toBe(105);
  });
  it('restart deliberately starts at zero while the start control remains paused', () => {
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); seek(250); click('最初から再生'); expect(time()).toBe(0); advance(32); expect(time()).toBe(32);
    click('観察位置を先頭へ'); expect(time()).toBe(0); advance(80); expect(time()).toBe(0); expect(targetAnimation().playState).toBe('paused');
  });
  it('forward and backward steps use 1000/60 ms, not a rounded frame count', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />); click('1ステップ進む'); expect(time()).toBeCloseTo(1000 / 60, 10);
    click('1ステップ進む'); expect(time()).toBeCloseTo(2000 / 60, 10); click('1ステップ戻る'); expect(time()).toBeCloseTo(1000 / 60, 10);
  });
  it('seek selects a fractional time and stops an active playback', () => {
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); advance(30); seek(237.25); advance(100);
    expect(time()).toBe(237.25); expect(targetAnimation().currentTime).toBe(237.25); expect(reading()).toContain('paused');
  });
  it('steps clamp both boundaries without crossing them', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />); click('1ステップ戻る'); expect(time()).toBe(0);
    seek(215); click('1ステップ進む'); expect(time()).toBe(220); expect((button('1ステップ進む') as HTMLButtonElement).disabled).toBe(true);
    seek(5); click('1ステップ戻る'); expect(time()).toBe(0);
  });
  it('finished playback can rewind and resume from a selected position', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />); click('再生 / 再開'); advance(240);
    expect(time()).toBe(220); expect(reading()).toContain('native playState: finished'); click('1ステップ戻る'); expect(time()).toBeCloseTo(220 - 1000 / 60, 10);
    seek(50); click('再生 / 再開'); advance(32); expect(time()).toBe(82);
  });
  it('rapid play/pause and slider changes do not allocate competing animations', () => {
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />);
    for (let i = 0; i < 10; i++) { click('再生 / 再開'); click('一時停止'); seek(i * 3); }
    expect(animations).toHaveLength(1); expect(time()).toBe(27); advance(100); expect(time()).toBe(27);
  });
  it('stale RAF callbacks after seek do not overwrite the newer position', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />); click('再生 / 再開'); const old = rafHistory.at(-1)!; seek(101);
    act(() => old(900)); expect(time()).toBe(101); expect(reading()).toContain('controller: paused');
  });
  it('offscreen cancels native animation and returns paused at the preserved time', () => {
    const view = render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); advance(80); const old = targetAnimation();
    view.rerender(<WaapiGameObservation sample={coin} active={false} reducedMotion={false} />); expect(old.cancel).toHaveBeenCalled(); expect(reading()).toContain('controller: inactive');
    advance(100); view.rerender(<WaapiGameObservation sample={coin} active reducedMotion={false} />); expect(time()).toBe(80); expect(targetAnimation().playState).toBe('paused'); advance(100); expect(time()).toBe(80);
  });
  it('tab visibility cancels and restores static preview without automatic play', () => {
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); advance(48); const old = targetAnimation(); visibility(true); expect(old.cancel).toHaveBeenCalled();
    visibility(false); expect(time()).toBe(48); expect(targetAnimation().playState).toBe('paused'); advance(100); expect(time()).toBe(48);
  });
  it('reduced motion cancels running animation, allows manual stepping, and does not auto-resume on OFF', () => {
    const view = render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); advance(64); const old = targetAnimation();
    view.rerender(<WaapiGameObservation sample={coin} active reducedMotion />); expect(old.cancel).toHaveBeenCalled(); expect((button('再生 / 再開') as HTMLButtonElement).disabled).toBe(true);
    click('1ステップ進む'); const at = 64 + 1000 / 60; expect(time()).toBeCloseTo(at, 10); advance(100); expect(time()).toBeCloseTo(at, 10);
    view.rerender(<WaapiGameObservation sample={coin} active reducedMotion={false} />); advance(100); expect(time()).toBeCloseTo(at, 10); click('再生 / 再開'); advance(32); expect(time()).toBeCloseTo(at + 32, 10);
  });
  it('unmount cancels owner animations and makes old RAF callbacks inert', () => {
    const view = render(<WaapiGameObservation sample={coin} active reducedMotion={false} />); click('再生 / 再開'); const old = targetAnimation(), stale = rafHistory.at(-1)!;
    view.unmount(); expect(old.cancel).toHaveBeenCalled(); const count = rafHistory.length; act(() => stale(999)); expect(rafHistory).toHaveLength(count);
  });
  it('easing changes cancel the old scenario, preserve position, and do not continue play', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />); seek(110); const old = targetAnimation();
    fireEvent.change(screen.getByLabelText('観察のeasing'), { target: { value: 'linear' } }); expect(old.cancel).toHaveBeenCalled(); expect(time()).toBe(110); expect(targetAnimation().options.easing).toBe('linear'); expect(targetAnimation().playState).toBe('paused');
  });
  it('resize remeasures after initial observer delivery and preserves observation time', () => {
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />); seek(93); const resize = observers.at(-1)!; act(() => resize.deliver()); const old = targetAnimation(); act(() => resize.deliver());
    expect(old.cancel).toHaveBeenCalled(); expect(resize.disconnect).toHaveBeenCalled(); expect(time()).toBe(93); expect(targetAnimation().playState).toBe('paused');
  });
  it('missing WAAPI is labelled unavailable and cannot produce successful play', () => {
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: undefined }); render(<WaapiGameObservation sample={coin} active reducedMotion={false} />);
    expect(reading()).toContain('unavailable'); expect((button('再生 / 再開') as HTMLButtonElement).disabled).toBe(true); expect(animations).toHaveLength(0);
  });
  it('clamps malformed and out-of-range time input without producing NaN', () => {
    expect(clampObservationTime(-10, 220)).toBe(0); expect(clampObservationTime(999, 220)).toBe(220); expect(clampObservationTime(NaN, 220)).toBe(0); expect(clampObservationTime(Infinity, 220)).toBe(0); expect(clampObservationTime(0.25, 220)).toBe(0.25);
  });
  it('pending pause completion is reflected in native status rather than remaining pending forever', async () => {
    delayedPause = true; render(<WaapiGameObservation sample={coin} active reducedMotion={false} />);
    await act(async () => { vi.advanceTimersByTime(6); await Promise.resolve(); });
    click('再生 / 再開'); advance(32); click('一時停止');
    await act(async () => { vi.advanceTimersByTime(20); await Promise.resolve(); });
    expect(targetAnimation().pending).toBe(false); expect(reading()).not.toContain('（pending）'); expect(reading()).toContain('native playState: paused');
  });
});

describe('actual gallery integration: observation never owns game state', () => {
  it('Menu selection survives observation seek, finish, reverse, mode exit, and ordinary Reset still works', () => {
    const { card } = openGallery('Menu Selection Cursor'); click('↓ Down');
    const normal = card.querySelector('[data-normal-game]')!;
    expect(normal.querySelector('.isSelected')!.textContent).toContain('COLLECTION'); click('観察モードを開く');
    seek(220); click('1ステップ戻る'); click('最初から再生'); advance(250);
    expect(normal.querySelector('.isSelected')!.textContent).toContain('COLLECTION'); click('通常モードへ戻る');
    expect(normal.querySelector('.isSelected')!.textContent).toContain('COLLECTION'); click('Reset'); expect(normal.querySelector('.isSelected')!.textContent).toContain('CONTINUE');
  });
  it('Coin preview repeatedly finishes and rewinds with zero points; normal COLLECT awards once', () => {
    const { card } = openGallery('Coin Pickup Arc'); const normal = card.querySelector('[data-normal-game]')!; click('観察モードを開く');
    for (let i = 0; i < 3; i++) { seek(Number(coin.normal.options.duration)); click('1ステップ戻る'); click('最初から再生'); advance(Number(coin.normal.options.duration) + 40); }
    expect(normal.querySelector('output')!.textContent).toBe('SCORE 0'); click('通常モードへ戻る'); click('COLLECT'); click('COLLECT'); expect(normal.querySelector('output')!.textContent).toBe('SCORE 100');
  });
  it('collected Coin retains its score and collected guard through observation and return', () => {
    const { card } = openGallery('Coin Pickup Arc'); click('COLLECT'); click('観察モードを開く'); seek(300); click('観察位置を先頭へ'); click('通常モードへ戻る');
    expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 100'); expect((button('COLLECT') as HTMLButtonElement).disabled).toBe(true);
    click('Reset'); expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 0'); click('COLLECT'); expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 100');
  });
  it('observation reset does not reset collected game state and old callback cannot revive playback', () => {
    const { card } = openGallery('Coin Pickup Arc'); click('COLLECT'); click('観察モードを開く'); click('再生 / 再開'); const stale = rafHistory.at(-1)!;
    click('観察位置を先頭へ'); act(() => stale(900)); expect(time()).toBe(0); expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 100');
  });
  it('mode exit cancels observation and reopening cannot resurrect the old running instance', () => {
    openGallery('Coin Pickup Arc'); click('観察モードを開く'); click('再生 / 再開'); advance(32); const old = targetAnimation(), stale = rafHistory.at(-1)!;
    click('通常モードへ戻る'); expect(old.cancel).toHaveBeenCalled(); click('観察モードを開く'); act(() => stale(900)); expect(time()).toBe(0); expect(targetAnimation().playState).toBe('paused');
  });
  it('gallery closure cancels observation; reopening has no old callback or auto-score', () => {
    openGallery('Coin Pickup Arc'); click('観察モードを開く'); click('再生 / 再開'); const old = targetAnimation(), stale = rafHistory.at(-1)!;
    fireEvent.click(screen.getByRole('button', { name: /サンプル一覧を閉じる/ })); expect(old.cancel).toHaveBeenCalled(); act(() => stale(900)); expect(screen.queryByRole('slider')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /サンプル一覧を見る/ })); expect(screen.getByRole('button', { name: 'COLLECT' })).toBeTruthy(); expect(screen.getByText('SCORE 0')).toBeTruthy();
  });
  it('gallery media notification reaches observation without changing Coin collected state', () => {
    const { card } = openGallery('Coin Pickup Arc'); click('COLLECT'); click('観察モードを開く'); click('再生 / 再開'); advance(32); const old = targetAnimation();
    act(() => { mediaReduced = true; mediaListeners.forEach(f => f()); }); expect(old.cancel).toHaveBeenCalled(); expect((button('再生 / 再開') as HTMLButtonElement).disabled).toBe(true); expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 100');
    act(() => { mediaReduced = false; mediaListeners.forEach(f => f()); }); expect(targetAnimation().playState).toBe('paused');
  });
});

describe('asynchronous ready settlement and measurement data', () => {
  it('old ready completion after replacement cannot restore an earlier observation state', async () => {
    delayedPause = true;
    const view = render(<WaapiGameObservation sample={menu} active reducedMotion={false} />);
    seek(87); const old = targetAnimation();
    view.rerender(<WaapiGameObservation sample={menu} active={false} reducedMotion={false} />);
    view.rerender(<WaapiGameObservation sample={menu} active reducedMotion={false} />);
    seek(142);
    await act(async () => { vi.advanceTimersByTime(50); await Promise.resolve(); });
    expect(old.cancel).toHaveBeenCalled(); expect(time()).toBe(142); expect(reading()).toContain('controller: paused'); expect(reading()).not.toContain('（pending）');
  });
  it('Menu preview uses actual row measurements and retains destination DOM ownership', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      const top = this.hasAttribute('data-observation-start') ? 31 : this.hasAttribute('data-observation-end') ? 102 : 0;
      return { top, left: 0, right: 50, bottom: top + 22, width: 50, height: 22, x: 0, y: top, toJSON() {} };
    });
    render(<WaapiGameObservation sample={menu} active reducedMotion={false} />);
    expect(targetAnimation().frames).toEqual([{ transform: 'translateY(-71px)' }, { transform: 'translateY(0px)' }]);
    expect(targetAnimation().target.parentElement!.hasAttribute('data-observation-end')).toBe(true);
    expect(targetAnimation().options.fill).toBe('both');
  });
  it('Coin preview computes destination variables from separate preview DOM, never score DOM', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      const x = this.hasAttribute('data-observation-target') ? 12 : 96;
      const y = this.hasAttribute('data-observation-target') ? 105 : 24;
      return { top: y, left: x, right: x + 42, bottom: y + 42, width: 42, height: 42, x, y, toJSON() {} };
    });
    render(<WaapiGameObservation sample={coin} active reducedMotion={false} />);
    const a = targetAnimation(); expect(a.target.style.getPropertyValue('--coin-x')).toBe('84px'); expect(a.target.style.getPropertyValue('--coin-y')).toBe('-81px'); expect(a.frames).toEqual(coin.normal.keyframes);
  });
});

it('step during playback starts from current native time, not the last RAF display sample', () => {
  render(<WaapiGameObservation sample={coin} active reducedMotion={false} />);
  click('再生 / 再開'); advance(25); // Last display sample is 16 ms; native clock is already at 25 ms.
  expect(time()).toBe(16); click('1ステップ進む'); expect(time()).toBeCloseTo(25 + 1000 / 60, 10);
});

// N2: cancellation is independent from the observed auto-demonstration guard.
describe('observed Coin normal motion cancellation', () => {
  function media(value: boolean) { act(() => { mediaReduced = value; mediaListeners.forEach(f => f()); }); advance(20); }
  function normalAnimations() { return animations.filter(a => a.target.hasAttribute('data-motion-target') && a.target.closest('[data-normal-game]')); }
  function observedCoin() { const view = openGallery('Coin Pickup Arc'); click('観察モードを開く'); click('通常モードへ戻る'); return view; }
  for (const operation of ['Replay', 'COLLECT']) {
    for (const paused of [false, true]) {
      it(`${operation} after observation cancels ${paused ? 'paused' : 'running'} normal motion on reduced ON without changing score`, () => {
        const { card } = observedCoin(); click(operation); const old = normalAnimations().at(-1)!;
        const owned = animations.filter(a => a.target.closest('[data-normal-game] .gameCoinScene') && a.playState === 'running');
        expect(owned).toHaveLength(2);
        if (paused) old.pause();
        expect(old.playState).toBe(paused ? 'paused' : 'running'); media(true);
        expect(old.cancel).toHaveBeenCalled(); expect(old.playState).toBe('idle'); expect(old.currentTime).toBeNull();
        expect(owned.every(a => a.cancel.mock.calls.length > 0 && a.playState === 'idle' && a.currentTime === null)).toBe(true);
        expect(card.querySelector('[data-normal-game] output')!.textContent).toBe(operation === 'COLLECT' ? 'SCORE 100' : 'SCORE 0');
        expect((button('COLLECT') as HTMLButtonElement).disabled).toBe(operation === 'COLLECT');
        const count = normalAnimations().length; media(false); advance(1000); expect(normalAnimations()).toHaveLength(count);
      });
    }
  }
  it('reduced explicit Replay uses reduced definition and repeated ON/OFF does not award or autoplay', () => {
    const { card } = observedCoin(); media(true); click('Replay');
    expect(normalAnimations().at(-1)!.frames).toEqual(coin.reduced.keyframes);
    expect(normalAnimations().at(-1)!.options.duration).toBe(coin.reduced.options.duration);
    for (let i = 0; i < 3; i++) { media(false); click('Replay'); const old = normalAnimations().at(-1)!; media(true); expect(old.playState).toBe('idle'); }
    expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 0');
  });
  it('rapid mode switches retain collected state and Reset permits exactly one new acquisition', () => {
    const { card } = observedCoin(); click('COLLECT');
    for (let i = 0; i < 3; i++) { click('観察モードを開く'); click('通常モードへ戻る'); click('Replay'); media(true); media(false); }
    expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 100'); expect((button('COLLECT') as HTMLButtonElement).disabled).toBe(true);
    click('Reset'); advance(1000); expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 0');
    click('COLLECT'); click('COLLECT'); expect(card.querySelector('[data-normal-game] output')!.textContent).toBe('SCORE 100');
  });
  it('observed normal Coin leaving the viewport cancels, re-entry stays stopped, and unmount clears old instances', () => {
    const view = observedCoin(); click('Replay'); const old = normalAnimations().at(-1)!;
    const entry = intersections.findLast(x => x.target === view.card.parentElement)!;
    act(() => entry.callback([{ target: entry.target, isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(old.playState).toBe('idle'); const count = normalAnimations().length;
    act(() => entry.callback([{ target: entry.target, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)); advance(1000);
    expect(normalAnimations()).toHaveLength(count); click('Replay'); const recent = normalAnimations().at(-1)!; view.unmount();
    expect(recent.cancel).toHaveBeenCalled(); expect(recent.playState).toBe('idle'); advance(1000); expect(normalAnimations()).toHaveLength(count + 1);
  });
});
