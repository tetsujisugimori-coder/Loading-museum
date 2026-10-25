// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WaapiSampleGallery } from "../app/components/WaapiSampleGallery";

let intersections: Array<{ callback: IntersectionObserverCallback; target: Element }> = [];
beforeEach(() => {
  intersections = [];
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("IntersectionObserver", class { constructor(private callback: IntersectionObserverCallback) {} observe(target: Element) { intersections.push({ callback: this.callback, target }); this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: vi.fn(() => ({ cancel: vi.fn(), pause: vi.fn(), play: vi.fn(), finished: new Promise(() => {}), playState: "running" })) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function openHp() {
  render(<WaapiSampleGallery />);
  fireEvent.click(screen.getByRole("button", { name: /サンプル一覧を見る/ }));
  fireEvent.change(screen.getByLabelText("検索"), { target: { value: "HP Bar Damage / Heal" } });
  const card = screen.getByText("HP Bar Damage / Heal").closest("article")!;
  act(() => vi.advanceTimersByTime(20));
  return { card, controls: within(card) };
}
function expectHp(card: Element, value: number, trail = value) {
  expect(card.querySelector(".gameHp output")?.textContent).toBe(`${value} / 100 HP`);
  expect((card.querySelector(".gameHp b") as HTMLElement).style.width).toBe(`${value}%`);
  expect((card.querySelector(".gameHp i") as HTMLElement).style.width).toBe(`${trail}%`);
}
it("Damage直後Reset後、旧追従更新の予定時刻を過ぎても72を保つ", () => {
  const { card, controls } = openHp();
  fireEvent.click(controls.getByRole("button", { name: "Damage" }));
  expectHp(card, 48, 72);
  fireEvent.click(controls.getByRole("button", { name: "Reset" }));
  act(() => vi.advanceTimersByTime(1000));
  expectHp(card, 72);
});
it("Damage連打とHealは最新HPに収束し、Reset連打も不変", () => {
  const { card, controls } = openHp();
  for (let i = 0; i < 3; i++) fireEvent.click(controls.getByRole("button", { name: "Damage" }));
  fireEvent.click(controls.getByRole("button", { name: "Heal" }));
  act(() => vi.advanceTimersByTime(1000));
  expectHp(card, 18);
  for (let i = 0; i < 3; i++) fireEvent.click(controls.getByRole("button", { name: "Reset" }));
  act(() => vi.advanceTimersByTime(1000));
  expectHp(card, 72);
});
it("Damage中のアンマウントは遅延更新を解除する", () => {
  const { controls } = openHp();
  fireEvent.click(controls.getByRole("button", { name: "Damage" }));
  cleanup();
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(1000));
});

it("画面外停止と再表示は現在HPを保持し古い追従更新を残さない", () => {
  const { card, controls } = openHp();
  fireEvent.click(controls.getByRole("button", { name: "Damage" }));
  const entry = intersections.findLast(({ target }) => target.getAttribute("data-sample-id") === "hp-damage-heal")!;
  act(() => entry.callback([{ target: entry.target, isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
  act(() => vi.advanceTimersByTime(1000));
  expectHp(card, 48);
  act(() => entry.callback([{ target: entry.target, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  expectHp(card, 48);
  fireEvent.click(controls.getByRole("button", { name: "Reset" }));
  act(() => vi.advanceTimersByTime(1000));
  expectHp(card, 72);
});
