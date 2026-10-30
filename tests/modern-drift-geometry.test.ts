import { describe, expect, it } from "vitest";
import { driftGlyphPosition } from "../app/components/ModernDrift";

describe("A Drift trail geometry", () => {
  it("keeps every ghost inside the drawing area at control extremes", () => {
    for (const count of [1, 7, 12]) for (const ghosts of [1, 6, 12]) for (const progress of [0, 50, 100]) {
      for (let trail = 0; trail <= ghosts; trail++) for (let i = 0; i < count; i++) for (const phase of [-Math.PI / 2, Math.PI / 2]) {
        const { x, y, size } = driftGlyphPosition(i, count, trail, ghosts, progress, 100, phase);
        // Allow for a rotated glyph bounding box, not only its anchor.
        const radius = size * .7;
        expect(x - radius).toBeGreaterThanOrEqual(0);
        expect(x + radius).toBeLessThanOrEqual(600);
        expect(y - radius).toBeGreaterThanOrEqual(0);
        expect(y + radius).toBeLessThanOrEqual(280);
      }
    }
  });
  it("makes the first-to-last trail span grow with scroll independently of ghost count", () => {
    for (const ghosts of [1, 6, 12]) {
      const span = (progress: number) => driftGlyphPosition(0, 7, ghosts, ghosts, progress, 0, 0).x - driftGlyphPosition(0, 7, 0, ghosts, progress, 0, 0).x;
      expect(span(0)).toBeLessThan(span(50));
      expect(span(50)).toBeLessThan(span(100));
      expect(span(100)).toBeCloseTo(82);
    }
  });
});
