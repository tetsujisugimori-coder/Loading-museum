// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GlassExhibit from "../app/components/GlassExhibit";

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({matches: false, addEventListener() {}, removeEventListener() {}}) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (HTMLCanvasElement.prototype as unknown as {clientWidth?: number}).clientWidth; delete (HTMLCanvasElement.prototype as unknown as {clientHeight?: number}).clientHeight; });
describe("GlassExhibit", () => {
  it("starts silent and exposes all eight notes to keyboard users", () => {
    const createAudio = vi.fn(); vi.stubGlobal("AudioContext", createAudio);
    render(<GlassExhibit />);
    fireEvent.click(screen.getByRole("button", {name: "1番の音"}));
    expect(createAudio).not.toHaveBeenCalled();
    expect(screen.getByText("1番の棒")).toBeTruthy();
    expect(screen.getByRole("button", {name: "8番の音"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "リセット"}));
    expect(screen.getByText("音は無効です。")).toBeTruthy();
  });
  it("reports audio activation failure", async () => {
    vi.stubGlobal("AudioContext", class { constructor() { throw new Error("blocked"); } });
    render(<GlassExhibit />);
    fireEvent.click(screen.getByRole("button", {name: "音を有効にする"}));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("音声を開始できませんでした"));
  });
  it("draws once while idle and schedules frames only during a strike", () => {
    let now = 5000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {configurable:true, get: () => 640});
    Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {configurable:true, get: () => 370});
    const context = {
      setTransform: vi.fn(), clearRect: vi.fn(), createLinearGradient: () => ({addColorStop: vi.fn()}),
      fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context as unknown as CanvasRenderingContext2D);
    let visibleCallback: (entries: Array<{isIntersecting:boolean}>) => void = () => {};
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: typeof visibleCallback) { visibleCallback = cb; } observe() {} disconnect() {} });
    let reduce = false;
    let preferenceChanged = () => {};
    Object.defineProperty(window, "matchMedia", {configurable:true, value: () => ({
      get matches() { return reduce; },
      addEventListener(_name: string, cb: () => void) { preferenceChanged = cb; },
      removeEventListener() {},
    })});
    const frames = new Map<number, FrameRequestCallback>();
    let serial = 0;
    const request = vi.fn((callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial; });
    vi.stubGlobal("requestAnimationFrame", request);
    vi.stubGlobal("cancelAnimationFrame", (id:number) => { frames.delete(id); });
    render(<GlassExhibit />);
    visibleCallback([{isIntersecting:true}]);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("配置"), { target: { value: "30" } });
    expect(request).not.toHaveBeenCalled();
    visibleCallback([{isIntersecting:true}]);
    fireEvent.click(screen.getByRole("button", {name: "1番の音"}));
    expect(request).toHaveBeenCalledTimes(1);
    visibleCallback([{isIntersecting:false}]);
    expect(frames.size).toBe(0);
    visibleCallback([{isIntersecting:true}]);
    expect(frames.size).toBe(1);
    const [id, callback] = [...frames.entries()][0]; frames.delete(id);
    now += 1500; callback(now);
    expect(frames.size).toBe(0);
    expect(request).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", {name: "2番の音"}));
    expect(frames.size).toBe(1);
    reduce = true; preferenceChanged();
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole("button", {name: "3番の音"}));
    expect(frames.size).toBe(0);
  });

});
