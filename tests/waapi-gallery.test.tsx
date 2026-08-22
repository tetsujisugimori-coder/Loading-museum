// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaapiSampleGallery } from "../app/components/WaapiSampleGallery";

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
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 320 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 48 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function openGallery() {
  fireEvent.click(screen.getByRole("button", { name: /サンプル一覧を見る/ }));
}

describe("WAAPI標本ギャラリー操作", () => {
  it("初期DOMを遅延し、開閉・検索・複合フィルター・0件・解除を扱う", () => {
    render(<WaapiSampleGallery />);
    expect(screen.queryByText("Fade In")).toBeNull();
    expect(screen.queryByRole("region", { name: /WAAPI/ })).toBeNull();
    openGallery();
    expect(screen.getAllByRole("article").length).toBeGreaterThanOrEqual(24);
    expect(screen.getByText("24 / 24 samples")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("検索"), { target: { value: "  FADE IN  " } });
    expect(screen.getByText("1 / 24 samples")).not.toBeNull();
    expect(screen.getByText("Fade In")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));
    fireEvent.change(screen.getByLabelText("カテゴリ"), { target: { value: "Feedback" } });
    fireEvent.change(screen.getByLabelText("用途"), { target: { value: "Modal" } });
    expect(screen.getByText("1 / 24 samples")).not.toBeNull();
    expect(screen.getByText("Modal Open / Close")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("検索"), { target: { value: "一致しない文字列" } });
    expect(screen.getByText(/条件に一致する標本はありません/)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));
    expect(screen.getByText("24 / 24 samples")).not.toBeNull();

    const cancelCount = animations.reduce((total, item) => total + item.animation.cancel.mock.calls.length, 0);
    fireEvent.click(screen.getByRole("button", { name: /サンプル一覧を閉じる/ }));
    expect(screen.queryByText("Fade In")).toBeNull();
    expect(animations.reduce((total, item) => total + item.animation.cancel.mock.calls.length, 0)).toBeGreaterThan(cancelCount);
  });

  it("Replay、コード解説、ModalとToastの両方向を操作する", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    const fadeCard = screen.getByText("Fade In").closest("article")!;
    const beforeReplay = animations.length;
    fireEvent.click(within(fadeCard).getByRole("button", { name: "Fade Inを再生" }));
    expect(animations.length).toBe(beforeReplay + 1);
    fireEvent.click(within(fadeCard).getByRole("button", { name: "コードと解説を見る" }));
    expect(within(fadeCard).getByText(/element\.animate/)).not.toBeNull();
    expect(within(fadeCard).getByRole("button", { name: "コードと解説を閉じる" }).getAttribute("aria-expanded")).toBe("true");

    const modalCard = screen.getByText("Modal Open / Close").closest("article")!;
    const modalToggle = within(modalCard).getByRole("button", { name: /Modal Open \/ Closeを閉じる/ });
    fireEvent.click(modalToggle);
    expect(within(modalCard).getByRole("button", { name: /Modal Open \/ Closeを開く/ })).not.toBeNull();

    const toastCard = screen.getByText("Toast Enter / Exit").closest("article")!;
    fireEvent.click(within(toastCard).getByRole("button", { name: /Toast Enter \/ Exitを閉じる/ }));
    expect(within(toastCard).getByRole("button", { name: /Toast Enter \/ Exitを開く/ })).not.toBeNull();
  });

  it("Consoleの全操作、速度、Seek、実playStateを安全に反映する", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    const consoleRegion = screen.getByRole("region", { name: "Animation Control Console" });
    for (const label of ["Play", "Pause", "Reverse", "Cancel", "Finish"]) {
      expect(() => fireEvent.click(within(consoleRegion).getByRole("button", { name: label }))).not.toThrow();
    }
    fireEvent.click(within(consoleRegion).getByRole("button", { name: "Pause" }));
    expect(within(consoleRegion).getByText("paused")).not.toBeNull();
    fireEvent.click(within(consoleRegion).getByRole("button", { name: "2x" }));
    expect(consoleRegion.querySelector(".waapiConsoleReadout")?.textContent).toContain("playbackRate2x");
    fireEvent.change(within(consoleRegion).getByRole("slider", { name: "Seek" }), { target: { value: "800" } });
    expect(within(consoleRegion).getAllByText("800ms").length).toBeGreaterThan(0);
  });

  it("Reduced motion時は自動ループを残さず、代替表示を説明する", async () => {
    reducedMotion = true;
    render(<WaapiSampleGallery />);
    openGallery();
    await act(async () => {});
    expect(screen.getByText(/現在は/).textContent).toContain("軽減表示");
    expect(screen.getByText(/軽減表示中のため自動再生を停止/)).not.toBeNull();
    expect(animations.every(({ options }) => typeof options === "number" || options?.iterations !== Infinity)).toBe(true);
  });
});
