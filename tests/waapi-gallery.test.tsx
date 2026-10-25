// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaapiSampleGallery } from "../app/components/WaapiSampleGallery";
import { AiWorkingPreview } from "../app/components/WaapiExpandedPreviews";
import { waapiSamples } from "../app/data/waapiSamples";

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
    expect(screen.getAllByRole("article").length).toBeGreaterThanOrEqual(47);
    expect(screen.getByText("47 / 47 samples")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("検索"), { target: { value: "  FADE IN  " } });
    expect(screen.getByText("1 / 47 samples")).not.toBeNull();
    expect(screen.getByText("Fade In")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));
    fireEvent.change(screen.getByLabelText("カテゴリ"), { target: { value: "UI Feedback" } });
    fireEvent.change(screen.getByLabelText("用途"), { target: { value: "Modal" } });
    expect(screen.getByText("1 / 47 samples")).not.toBeNull();
    expect(screen.getByText("Modal Open / Close")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("検索"), { target: { value: "一致しない文字列" } });
    expect(screen.getByText(/条件に一致する標本はありません/)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));
    expect(screen.getByText("47 / 47 samples")).not.toBeNull();

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
    fireEvent.click(within(modalCard).getByRole("button", { name: /Modal Open \/ Closeを開く/ }));
    fireEvent.click(within(modalCard).getByRole("button", { name: /Modal Open \/ Closeを閉じる/ }));
    expect(within(modalCard).getByRole("button", { name: /Modal Open \/ Closeを開く/ })).not.toBeNull();

    const toastCard = screen.getByText("Toast Enter / Exit").closest("article")!;
    fireEvent.click(within(toastCard).getByRole("button", { name: /Toast Enter \/ Exitを開く/ }));
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

  it("Fade/Slideは手動再生、Button/Toggleは直接操作だけを提供する", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    const fade = screen.getByText("Fade In").closest("article")!;
    const slideOut = screen.getByText("Slide Out Right").closest("article")!;
    expect(within(fade).getByRole("button", { name: "Fade Inを再生" }).textContent).toBe("Play entrance");
    expect(within(slideOut).getByRole("button", { name: "Slide Out Rightを再生" }).textContent).toBe("Play exit");

    const press = screen.getByText("Button Press").closest("article")!;
    const pressButton = within(press).getByRole("button", { name: "PRESS" });
    expect(within(press).queryByRole("button", { name: /Replay/ })).toBeNull();
    const before = animations.length;
    fireEvent.pointerDown(pressButton);
    fireEvent.pointerCancel(pressButton);
    fireEvent.keyDown(pressButton, { key: "Enter", repeat: false });
    fireEvent.blur(pressButton);
    expect(animations.length).toBe(before + 4);

    const toggle = screen.getByText("Toggle Switch").closest("article")!;
    const toggleButton = within(toggle).getByRole("button", { name: /展示スイッチ OFF/ });
    fireEvent.click(toggleButton);
    expect(within(toggle).getByText("State: ON")).not.toBeNull();
    fireEvent.click(within(toggle).getByRole("button", { name: /展示スイッチ ON/ }));
    expect(within(toggle).getByText("State: OFF")).not.toBeNull();
    expect(within(toggle).queryByRole("button", { name: /Replay/ })).toBeNull();
  });

  it("ゲーム標本を直接操作し、Resetで意味のある初期状態へ戻す", async () => {
    render(<WaapiSampleGallery />);
    openGallery();

    const rhythmCard = screen.getByText("Rhythm PERFECT / GOOD / MISS").closest("article")!;
    fireEvent.click(within(rhythmCard).getByRole("button", { name: "PERFECT" }));
    expect(within(rhythmCard).getByText("PERFECT", { selector: "strong" })).not.toBeNull();
    fireEvent.click(within(rhythmCard).getByRole("button", { name: "MISS" }));
    expect(within(rhythmCard).getByText("MISS", { selector: "strong" })).not.toBeNull();

    const comboCard = screen.getByText("Combo Counter Escalation").closest("article")!;
    fireEvent.click(within(comboCard).getByRole("button", { name: "Add combo" }));
    expect(within(comboCard).getByText("2 COMBO")).not.toBeNull();
    fireEvent.click(within(comboCard).getByRole("button", { name: "Reset" }));
    expect(within(comboCard).getByText("READY", { selector: "strong" })).not.toBeNull();

    const hpCard = screen.getByText("HP Bar Damage / Heal").closest("article")!;
    fireEvent.click(within(hpCard).getByRole("button", { name: "Damage" }));
    expect(within(hpCard).getByText("48 / 100 HP")).not.toBeNull();
    fireEvent.click(within(hpCard).getByRole("button", { name: "Heal" }));
    expect(within(hpCard).getByText("66 / 100 HP")).not.toBeNull();

    const menuCard = screen.getByText("Menu Selection Cursor").closest("article")!;
    fireEvent.click(within(menuCard).getByRole("button", { name: "↓ Down" }));
    expect(within(menuCard).getByText("COLLECTION").className).toContain("isSelected");
    fireEvent.keyDown(menuCard.querySelector(".waapiPreviewStage")!, { key: "ArrowDown" });
    expect(within(menuCard).getByText("SETTINGS").className).toContain("isSelected");

    const cardsCard = screen.getByText("Card Deal / Shuffle").closest("article")!;
    const before = animations.length;
    fireEvent.click(within(cardsCard).getByRole("button", { name: "SHUFFLE" }));
    const afterShuffle = animations.length;
    fireEvent.click(within(cardsCard).getByRole("button", { name: "DEAL" }));
    expect(afterShuffle).toBeGreaterThan(before);
    expect(animations.length).toBeGreaterThan(afterShuffle);
    await act(async () => {});
  });

  it("新しいゲーム標本、5軸フィルター、AI共通状態を操作できる", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    fireEvent.change(screen.getByLabelText("操作"), { target: { value: "Timing" } });
    fireEvent.change(screen.getByLabelText("状態"), { target: { value: "Failure" } });
    expect(screen.getByText("Perfect Parry")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));

    const combat = screen.getByText("Combat Damage Feedback").closest("article")!;
    fireEvent.click(within(combat).getByRole("button", { name: "CRITICAL" }));
    expect(within(combat).getByText("CRITICAL -999", { selector: "output" })).not.toBeNull();

    const aiCard = screen.getByText("Claude-inspired Warm Thought Pulse").closest("article")!;
    fireEvent.click(within(aiCard).getByRole("button", { name: "START" }));
    expect(within(aiCard).getByText("Starting", { selector: "p" })).not.toBeNull();
    expect(animations.some(({ options }) => typeof options !== "number" && options?.iterations === Infinity)).toBe(true);
    fireEvent.click(within(aiCard).getByRole("button", { name: "COMPLETE" }));
    expect(within(aiCard).getByText("Complete", { selector: "p" })).not.toBeNull();
  });

  it("AI比較モードは一括フェーズを進め、閉じるとループを停止する", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    fireEvent.click(screen.getByRole("button", { name: /AI 6種の共通フェーズ比較を開く/ }));
    fireEvent.click(screen.getByRole("button", { name: "START ALL" }));
    expect(screen.getAllByText("Starting").length).toBeGreaterThan(1);
    const running = animations.filter(({ options }) => typeof options !== "number" && options?.iterations === Infinity);
    expect(running.length).toBeGreaterThanOrEqual(6);
    expect(document.querySelectorAll(".aiModular i")).not.toHaveLength(0);
    expect(document.querySelectorAll(".aiRibbon i")).not.toHaveLength(0);
    expect(document.querySelectorAll(".aiCode i")).not.toHaveLength(0);
    expect(document.querySelectorAll(".aiSparkle b")).not.toHaveLength(0);
    expect(document.querySelectorAll(".aiWarm b")).not.toHaveLength(0);
    expect(document.querySelectorAll(".aiWeave path")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /AI 6種の共通フェーズ比較を閉じる/ }));
    expect(running.every(({ animation }) => animation.cancel.mock.calls.length > 0)).toBe(true);
  });

  it("追加ゲーム14件は固有DOM・状態・操作結果を提供する", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    const card = (name: string) => screen.getByText(name).closest("article")!;
    const result = (name: string) => card(name).querySelector(".gameScene output")?.textContent ?? "";

    const hit = card("Hit Stop & Knockback");
    fireEvent.click(within(hit).getByRole("button", { name: "ATTACK" }));
    expect(result("Hit Stop & Knockback")).toContain("WINDUP");
    fireEvent.click(within(hit).getByRole("button", { name: "HEAVY ATTACK" }));
    expect(result("Hit Stop & Knockback")).toContain("HEAVY WINDUP");

    ["ENEMY ATTACK", "PARRY"].forEach((name) => expect(within(card("Perfect Parry")).getByRole("button", { name })).not.toBeNull());
    ["ATTACK START", "DODGE LEFT", "DODGE RIGHT"].forEach((name) => expect(within(card("Dodge Afterimage")).getByRole("button", { name })).not.toBeNull());
    fireEvent.click(within(card("Falling Block Line Clear")).getByRole("button", { name: "DROP" }));
    expect(result("Falling Block Line Clear")).toBe("DROP");

    const match = card("Match-3 Cascade");
    fireEvent.click(within(match).getByRole("button", { name: "SWAP" }));
    expect(result("Match-3 Cascade")).toContain("NOT ADJACENT");
    const gemButtons = match.querySelectorAll(".matchBoard button");
    fireEvent.click(gemButtons[0]);
    fireEvent.click(gemButtons[1]);
    fireEvent.click(within(match).getByRole("button", { name: "SWAP" }));
    expect(result("Match-3 Cascade")).toContain("MATCH ×3");

    fireEvent.click(within(card("Pinball Bumper Hit")).getByRole("button", { name: "LAUNCH" }));
    expect(result("Pinball Bumper Hit")).toContain("LAUNCH");
    const lock = card("Lock-on Reticle");
    fireEvent.click(within(lock).getByRole("button", { name: "NEXT TARGET" }));
    expect(result("Lock-on Reticle")).toContain("WARDEN");
    fireEvent.keyDown(lock.querySelector(".gameLock")!, { key: "ArrowLeft" });
    expect(result("Lock-on Reticle")).toContain("SCOUT");

    const equip = card("Inventory Equip Snap");
    fireEvent.click(within(equip).getByRole("button", { name: "EQUIP" }));
    expect(result("Inventory Equip Snap")).toContain("24 (+12)");
    fireEvent.click(within(equip).getByRole("button", { name: "UNEQUIP" }));
    expect(result("Inventory Equip Snap")).toContain("12 (+0)");

    const status = card("Status Effect Lab");
    for (const name of ["BURN", "FREEZE", "POISON"]) { fireEvent.click(within(status).getByRole("button", { name })); expect(result("Status Effect Lab")).toContain(name); }
    fireEvent.click(within(status).getByRole("button", { name: "CLEAR" }));
    expect(result("Status Effect Lab")).toContain("NORMAL");

    const turns = card("Turn Order Reflow");
    fireEvent.click(within(turns).getByRole("button", { name: "HASTE" }));
    expect(turns.querySelector(".gameTurn li")?.textContent).toContain("MAGE");
    fireEvent.click(within(turns).getByRole("button", { name: "STUN" }));
    expect(turns.querySelector(".gameTurn ol")?.textContent).toContain("MAGE ⊘");

    const battle = card("Battle Transition");
    fireEvent.click(within(battle).getByRole("button", { name: "ENCOUNTER" }));
    expect(result("Battle Transition")).toContain("ENCOUNTER");
    fireEvent.click(within(battle).getByRole("button", { name: "RETURN" }));
    expect(result("Battle Transition")).toContain("RETURN");
    const race = card("Race Countdown & Launch");
    fireEvent.click(within(race).getByRole("button", { name: "START" }));
    fireEvent.click(within(race).getByRole("button", { name: "ACCELERATE" }));
    expect(result("Race Countdown & Launch")).toContain("FALSE START");
    expect(new Set(Array.from(document.querySelectorAll("[data-scene]")).map((node) => node.getAttribute("data-scene"))).size).toBe(14);
  });

  it("Card Dealの全工程とAIの完了・エラー・リセットを操作できる", () => {
    render(<WaapiSampleGallery />);
    openGallery();
    const cards = screen.getByText("Card Deal / Shuffle").closest("article")!;
    for (const name of ["SHUFFLE", "DEAL", "SELECT", "DRAG", "PLAY", "RESOLVE", "DISCARD", "Reset"]) expect(within(cards).getByRole("button", { name })).not.toBeNull();
    const ai = screen.getByText("ChatGPT / Codex-inspired Modular Thought Blocks").closest("article")!;
    fireEvent.click(within(ai).getByRole("button", { name: "START" }));
    fireEvent.click(within(ai).getByRole("button", { name: "NEXT PHASE" }));
    expect(within(ai).getByText("Searching", { selector: "p" })).not.toBeNull();
    fireEvent.click(within(ai).getByRole("button", { name: "ERROR" }));
    expect(within(ai).getByText("Error", { selector: "p" })).not.toBeNull();
    fireEvent.click(within(ai).getByRole("button", { name: "RESET" }));
    expect(within(ai).getByText("Idle", { selector: "p" })).not.toBeNull();
  });

  it("AI作業ループはSTART連打で増殖せず、画面外化でcancelされる", () => {
    const sample = waapiSamples.find((item) => item.id === "ai-modular-thought-blocks")!;
    const view = render(<AiWorkingPreview sample={sample} active reducedMotion={false} />);
    fireEvent.click(screen.getByRole("button", { name: "START" }));
    const loops = animations.filter(({ options }) => typeof options !== "number" && options?.iterations === Infinity);
    expect(loops).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "START" }));
    expect(animations.filter(({ options }) => typeof options !== "number" && options?.iterations === Infinity)).toHaveLength(3);
    view.rerender(<AiWorkingPreview sample={sample} active={false} reducedMotion={false} />);
    expect(loops.every(({ animation }) => animation.cancel.mock.calls.length > 0)).toBe(true);
  });
});
