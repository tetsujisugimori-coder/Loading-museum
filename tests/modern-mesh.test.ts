import { describe, expect, it } from 'vitest';
import paper from '../app/data/paper.json';
import glass from '../app/data/glass-bar.json';

describe('original Blender mesh data', () => {
  it('retains corresponding finite paper shapes and valid triangle indices', () => {
    expect(paper.flat).toHaveLength(625);
    expect(paper.crumpled).toHaveLength(paper.flat.length);
    expect(paper.triangles).toHaveLength(1152);
    for (const point of [...paper.flat, ...paper.crumpled]) expect(point.every(Number.isFinite)).toBe(true);
    for (const face of paper.triangles) expect(face.every(i => Number.isInteger(i) && i >= 0 && i < paper.flat.length)).toBe(true);
  });
  it('retains bounded finite glass geometry', () => {
    expect(glass.vertices).toHaveLength(96);
    expect(glass.triangles).toHaveLength(188);
    for (const point of glass.vertices) expect(point.every(Number.isFinite)).toBe(true);
    for (const face of glass.triangles) expect(face.every(i => Number.isInteger(i) && i >= 0 && i < glass.vertices.length)).toBe(true);
  });
});
