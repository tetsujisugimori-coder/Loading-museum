// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PaperExhibit from "../app/components/PaperExhibit";

let observer: IntersectionObserverCallback;
let raf: FrameRequestCallback | undefined;
let prefersReduced = false;
const moveTo = vi.fn();
const context = { setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(), moveTo, lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), fillStyle: "", strokeStyle: "", lineWidth: 1 };

beforeEach(() => {
  raf = undefined; prefersReduced = false; moveTo.mockClear();
  vi.stubGlobal("IntersectionObserver", class { constructor(cb: IntersectionObserverCallback) { observer = cb; } observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { raf = cb; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn(() => { raf = undefined; }));
  vi.stubGlobal("matchMedia", () => ({ matches: prefersReduced, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 400, height: 300, left: 0, top: 0, right: 400, bottom: 300, x: 0, y: 0, toJSON() {} });
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.hasPointerCapture = vi.fn(() => true);
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("procedural paper", () => {
  it("renders a mesh and the fold slider changes its geometry; reset restores it", () => {
    render(<PaperExhibit />);
    expect(moveTo.mock.calls.length).toBeGreaterThan(100);
    const before = moveTo.mock.calls[0];
    moveTo.mockClear();
    fireEvent.change(screen.getByLabelText("丸める量"), { target: { value: "100" } });
    expect(moveTo.mock.calls[0]).not.toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "紙をリセット" }));
    expect((screen.getByLabelText("丸める量") as HTMLInputElement).value).toBe("55");
  });
  it("does not start inertia under reduced motion, including keyboard-accessible toss", () => {
    prefersReduced = true;
    render(<PaperExhibit />);
    observer([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    const before = moveTo.mock.calls.at(-1);
    fireEvent.click(screen.getByRole("button", { name: "紙を投げる" }));
    expect(moveTo.mock.calls.at(-1)).not.toEqual(before);
    expect(raf).toBeUndefined();
  });
  it("drags the mesh and cancels animation when out of view", () => {
    const { unmount } = render(<PaperExhibit />);
    const canvas = screen.getByLabelText(/折り目のある紙/);
    observer([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(raf).toBeDefined();
    const before = moveTo.mock.calls.at(-1);
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    expect(moveTo.mock.calls.at(-1)).not.toEqual(before);
    fireEvent.pointerUp(canvas, { clientX: 160, clientY: 120 });
    observer([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(raf).toBeUndefined();
    unmount();
  });
});
