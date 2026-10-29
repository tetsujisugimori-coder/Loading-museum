// Diagnostic copy of baseline test, original expectations/time budget retained. Not registered in npm test.
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaapiSampleGallery } from "../../../../app/components/WaapiSampleGallery";

class FakeAnimation {
  currentTime: CSSNumberish | null = 0;
  playbackRate = 1;
  playState: AnimationPlayState = "running";
  cancel = vi.fn(() => { this.playState = "idle"; this.currentTime = null; });
  finish = vi.fn(() => { this.playState = "finished"; this.currentTime = 1600; });
  pause = vi.fn(() => { this.playState = "paused"; });
  play = vi.fn(() => { this.playState = "running"; });
  reverse = vi.fn(() => { this.playbackRate *= -1; this.playState = "running"; });
  updatePlaybackRate = vi.fn((rate: number) => { this.playbackRate = rate; });
}

let reducedMotion = false;
let animations: Array<{ animation: FakeAnimation; options?: number | KeyframeAnimationOptions }> = [];

class FakeIntersectionObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) { this.callback = callback; }
  observe = (target: Element) => this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = "0px";
  thresholds = [0];
}

class FakeResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe = (target: Element) => this.callback([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this as unknown as ResizeObserver);
  disconnect = vi.fn();
  unobserve = vi.fn();
}

beforeEach(() => {
  animations = [];
  reducedMotion = false;
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: reducedMotion, media: "(prefers-reduced-motion: reduce)", addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: FakeIntersectionObserver });
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: FakeResizeObserver });
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: vi.fn((_frames: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) => { const animation = new FakeAnimation(); animations.push({ animation, options }); return animation; }) });
  Object.defineProperty(SVGElement.prototype, "animate", { configurable: true, value: vi.fn((_frames: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) => { const animation = new FakeAnimation(); animations.push({ animation, options }); return animation; }) });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 320 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 48 });
});

afterEach(() => {
  timed("cleanup", () => cleanup());
  console.log("Q1_PROFILE", JSON.stringify({ samples, querySamples, totalMs: samples.reduce((n, s) => n + s.ms, 0) }));
  samples = []; querySamples = [];
  vi.restoreAllMocks();
});

function openGallery() {
  fireEvent.click(screen.getByRole("button", { name: /サンプル一覧を見る/ }));
}


let samples: Array<{label: string; ms: number}> = [];
let querySamples: Array<{label: string; ms: number}> = [];
beforeEach(() => {
 for (const name of ["getByRole", "getAllByRole", "queryByRole", "getByLabelText", "getByText", "queryByText"] as const) {
  const original = screen[name];
  // Generic diagnostic wrapper preserves query arguments and result/error.
  const spy = vi.spyOn(screen, name);
  spy.mockImplementation(((...args: unknown[]) => {
   const start = performance.now();
   try { return Reflect.apply(original, screen, args); }
   finally { querySamples.push({label: name + " " + String(args[0]), ms: performance.now() - start}); }
  }) as Parameters<typeof spy.mockImplementation>[0]);
 }
});
function timed<T>(label: string, fn: () => T): T {
 const start = performance.now();
 try { return fn(); } finally { samples.push({label, ms: performance.now() - start}); }
}
describe("Q1 baseline section timing", () => {
  it("初期DOMを遅延し、開閉・検索・複合フィルター・0件・解除を扱う", () => {
    timed("render(<WaapiSampleGallery />);", () => render(<WaapiSampleGallery />));
    timed("expect(screen.queryByText(\"Fade In\")).toBeNull();", () => expect(screen.queryByText("Fade In")).toBeNull());
    timed("expect(screen.queryByRole(\"region\", { name: /WAAPI/ })).toBeNull();", () => expect(screen.queryByRole("region", { name: /WAAPI/ })).toBeNull());
    timed("openGallery();", () => openGallery());
    timed("expect(screen.getAllByRole(\"article\").length).toBeGreaterThanOrEqual(47);", () => expect(screen.getAllByRole("article").length).toBeGreaterThanOrEqual(47));
    timed("expect(screen.getByText(\"47 / 47 samples\")).not.toBeNull();", () => expect(screen.getByText("47 / 47 samples")).not.toBeNull());

    timed("fireEvent.change(screen.getByLabelText(\"検索\"), { target: { value: \"  FADE IN  \" } });", () => fireEvent.change(screen.getByLabelText("検索"), { target: { value: "  FADE IN  " } }));
    timed("expect(screen.getByText(\"1 / 47 samples\")).not.toBeNull();", () => expect(screen.getByText("1 / 47 samples")).not.toBeNull());
    timed("expect(screen.getByText(\"Fade In\")).not.toBeNull();", () => expect(screen.getByText("Fade In")).not.toBeNull());

    timed("fireEvent.click(screen.getByRole(\"button\", { name: \"絞り込みを解除\" }));", () => fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" })));
    timed("fireEvent.change(screen.getByLabelText(\"カテゴリ\"), { target: { value: \"UI Feedback\" } });", () => fireEvent.change(screen.getByLabelText("カテゴリ"), { target: { value: "UI Feedback" } }));
    timed("fireEvent.change(screen.getByLabelText(\"用途\"), { target: { value: \"Modal\" } });", () => fireEvent.change(screen.getByLabelText("用途"), { target: { value: "Modal" } }));
    timed("expect(screen.getByText(\"1 / 47 samples\")).not.toBeNull();", () => expect(screen.getByText("1 / 47 samples")).not.toBeNull());
    timed("expect(screen.getByText(\"Modal Open / Close\")).not.toBeNull();", () => expect(screen.getByText("Modal Open / Close")).not.toBeNull());

    timed("fireEvent.change(screen.getByLabelText(\"検索\"), { target: { value: \"一致しない文字列\" } });", () => fireEvent.change(screen.getByLabelText("検索"), { target: { value: "一致しない文字列" } }));
    timed("expect(screen.getByText(/条件に一致する標本はありません/)).not.toBeNull();", () => expect(screen.getByText(/条件に一致する標本はありません/)).not.toBeNull());
    timed("fireEvent.click(screen.getByRole(\"button\", { name: \"絞り込みを解除\" }));", () => fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" })));
    timed("expect(screen.getByText(\"47 / 47 samples\")).not.toBeNull();", () => expect(screen.getByText("47 / 47 samples")).not.toBeNull());

    const cancelCount = animations.reduce((total, item) => total + item.animation.cancel.mock.calls.length, 0);
    timed("fireEvent.click(screen.getByRole(\"button\", { name: /サンプル一覧を閉じる/ }));", () => fireEvent.click(screen.getByRole("button", { name: /サンプル一覧を閉じる/ })));
    timed("expect(screen.queryByText(\"Fade In\")).toBeNull();", () => expect(screen.queryByText("Fade In")).toBeNull());
    timed("expect(animations.reduce((total, item) => total + item.animation.cancel.mock.calls.length, 0)).toBeGreaterThan(cancelCount);", () => expect(animations.reduce((total, item) => total + item.animation.cancel.mock.calls.length, 0)).toBeGreaterThan(cancelCount));
  });
});
