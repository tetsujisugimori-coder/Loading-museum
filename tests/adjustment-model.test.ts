import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, PARAMS, PRESETS, SOURCE_WIDTH, SOURCE_HEIGHT, HISTORY_LIMIT, createHistory, histogram, sourcePixels, transformPixels, transition, type History, type Params, type State } from '../app/components/practical/adjustment-model';
const rgba = (...values: number[]) => new Uint8ClampedArray(values);
const params = (patch: Partial<Params> = {}): Params => ({ ...DEFAULT_PARAMS, ...patch });
const commit = (h: History, patch: Partial<Params>) => transition(h, { type: 'commit', state: { ...h.present, params: { ...h.present.params, ...patch } } });
// Independent matrix oracle: expand saturation as a 3x3 transform; do not
// call production helpers or copy its channel-by-channel pipeline.
function oracle(input: Uint8ClampedArray, p: Params) {
  const output: number[] = [], luma = [.2126, .7152, .0722];
  for (let i = 0; i < input.length; i += 4) {
    const rgb = [0, 1, 2].map(k => (input[i + k] - 127.5 + 2.55 * p.brightness) * (100 + p.contrast) / 100 + 127.5);
    for (let row = 0; row < 3; row++) {
      const result = rgb.reduce((sum, channel, col) => sum + channel * ((row === col ? p.saturation / 100 : 0) + (1 - p.saturation / 100) * luma[col]), 0) + [1, 0, -1][row] * p.temperature * .4;
      output.push(Math.max(0, Math.min(255, Math.round(result))));
    }
    output.push(input[i + 3]);
  }
  return rgba(...output);
}
describe('RGBA textbook transform', () => {
  it('specifies exact defaults, integer ranges, valid presets, immutable configuration', () => {
    expect(DEFAULT_PARAMS).toEqual({ brightness: 0, contrast: 0, saturation: 100, temperature: 0 });
    expect(PARAMS.map(p => [p.key, p.min, p.max, p.step])).toEqual([['brightness', -100, 100, 1], ['contrast', -100, 100, 1], ['saturation', 0, 200, 1], ['temperature', -100, 100, 1]]);
    for (const p of PRESETS) expect(() => transformPixels(rgba(1, 2, 3, 4), p.params)).not.toThrow();
    expect(Object.isFrozen(DEFAULT_PARAMS)).toBe(true); expect(Object.isFrozen(PARAMS[0])).toBe(true);
  });
  it('provides all six specified presets with meaningful distinct effects', () => {
    expect(PRESETS.map(p => p.label)).toEqual(['Original', 'Vivid', 'Soft', 'Warm', 'Cool', 'High Contrast']);
    const pixel = rgba(100, 140, 180, 255);
    const outputs = PRESETS.map(p => transformPixels(pixel, p.params));
    expect(outputs[0]).toEqual(pixel);
    expect(new Set(outputs.map(p => [...p].join(','))).size).toBe(6);
    expect(outputs[1][2] - outputs[1][0]).toBeGreaterThan(80);
    expect(outputs[2][2] - outputs[2][0]).toBeLessThan(80);
    const warmNeutral = transformPixels(pixel, { ...PRESETS[3].params, temperature: 0 });
    expect(outputs[3][0]).toBeGreaterThan(warmNeutral[0]); expect(outputs[3][2]).toBeLessThan(warmNeutral[2]);
    expect(outputs[4][0]).toBeLessThan(pixel[0]); expect(outputs[4][2]).toBeGreaterThan(pixel[2]);
    expect(outputs[5][2] - outputs[5][0]).toBeGreaterThan(80);
  });
  it('is identity exactly for every byte and alpha, returns fresh storage', () => {
    const input = rgba(...Array.from({ length: 1024 }, (_, i) => i % 256));
    const out = transformPixels(input, params());
    expect(out).toEqual(input); expect(out).not.toBe(input); out[0] = 99; expect(input[0]).toBe(0);
  });
  it.each([
    [{ brightness: 10 }, [100, 150, 200, 80], [126, 176, 226, 80]],
    [{ contrast: -100 }, [0, 70, 255, 0], [128, 128, 128, 0]],
    [{ saturation: 0 }, [255, 0, 0, 1], [54, 54, 54, 1]],
    [{ temperature: 100 }, [100, 150, 200, 255], [140, 150, 160, 255]],
    [{ brightness: 100, contrast: -100 }, [0, 70, 255, 0], [128, 128, 128, 0]],
    [{ brightness: 100, saturation: 0, temperature: -100 }, [255, 0, 0, 7], [255, 255, 255, 7]],
  ] as [Partial<Params>, number[], number[]][])('matches hand calculated values %j', (patch, input, expected) => {
    expect([...transformPixels(rgba(...input), params(patch))]).toEqual(expected);
  });
  it('matches an independent matrix oracle with mixed parameters and avoids intermediate clipping', () => {
    const input = rgba(255, 0, 0, 0, 0, 255, 10, 1, 50, 99, 248, 128, 0, 0, 0, 255, 255, 255, 255, 255);
    for (const p of [params({ brightness: 70, contrast: -45, saturation: 130, temperature: -32 }), params({ brightness: -89, contrast: 88, saturation: 13, temperature: 91 }), params({ brightness: 100, contrast: -80 })]) {
      expect(transformPixels(input, p)).toEqual(oracle(input, p));
    }
    expect([...transformPixels(rgba(255, 0, 0, 255), params({ brightness: 100, contrast: -80 }))]).toEqual([204, 153, 153, 255]);
  });
  for (const spec of PARAMS) it(`rejects invalid ${spec.key} values without mutating inputs`, () => {
    const input = rgba(10, 20, 30, 40), before = input.slice();
    for (const value of [NaN, Infinity, -Infinity, .5, spec.min - 1, spec.max + 1, undefined, '10']) {
      expect(() => transformPixels(input, params({ [spec.key]: value } as Partial<Params>))).toThrow();
    }
    expect(input).toEqual(before);
  });
  it('rejects missing params, wrong typed array, incomplete RGBA and accepts empty arrays', () => {
    for (const bad of [null, {}, []]) expect(() => transformPixels(rgba(), bad as Params)).toThrow();
    for (const bad of [null, [], new Uint8Array(4), rgba(1), rgba(1, 2, 3), 'rgba']) {
      expect(() => transformPixels(bad as Uint8ClampedArray, params())).toThrow();
      expect(() => histogram(bad as Uint8ClampedArray)).toThrow();
    }
    expect(transformPixels(rgba(), params())).toEqual(rgba());
  });
});
describe('histograms and original sources', () => {
  it('counts semi-transparent pixels once, omits alpha zero and uses independent 256 bins', () => {
    const h = histogram(rgba(0, 10, 255, 0, 0, 10, 255, 1, 0, 11, 255, 128, 255, 10, 0, 255));
    expect(h.count).toBe(3); expect(h.transparent).toBe(1);
    expect(h.r[0]).toBe(2); expect(h.r[255]).toBe(1); expect(h.g[10]).toBe(2); expect(h.g[11]).toBe(1); expect(h.b[255]).toBe(2);
    for (const bins of [h.r, h.g, h.b]) { expect(bins).toHaveLength(256); expect(bins.reduce((a, b) => a + b, 0)).toBe(3); }
    h.r[10] = 999; expect(h.g[10]).toBe(2); expect(histogram(rgba()).count).toBe(0);
  });
  it.each(['landscape', 'still-life'] as const)('creates deterministic independent opaque raster: %s', image => {
    const first = sourcePixels(image), second = sourcePixels(image);
    expect(first).toHaveLength(SOURCE_WIDTH * SOURCE_HEIGHT * 4); expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true); expect(first === second).toBe(false);
    expect(histogram(first).count).toBe(480 * 300); expect(histogram(first).transparent).toBe(0);
    expect(new Set(first).size).toBeGreaterThan(150);
    expect(Buffer.from(transformPixels(first, params())).equals(Buffer.from(first))).toBe(true);
    first[0] = 0; expect(Buffer.from(sourcePixels(image)).equals(Buffer.from(second))).toBe(true);
  });
  it('rejects unknown sources and distinguishes both originals', () => {
    expect(() => sourcePixels('missing' as 'landscape')).toThrow();
    expect(Buffer.from(sourcePixels('landscape')).equals(Buffer.from(sourcePixels('still-life')))).toBe(false);
  });
});
describe('transactional bounded history', () => {
  it('commits one completed gesture; undo/redo round trip; previews cannot mutate committed snapshots', () => {
    const start = createHistory(); const next = commit(start, { brightness: 33 });
    expect(start.present.params.brightness).toBe(0); expect(next.past).toHaveLength(1);
    const undone = transition(next, { type: 'undo' }); expect(undone.present).toEqual(start.present);
    expect(transition(undone, { type: 'redo' }).present).toEqual(next.present);
    next.present.params.brightness = 90; expect(undone.future[0].params.brightness).toBe(33);
  });
  it('clears redo on a new edit but preserves it on a no-op, with deep independent output', () => {
    const undone = transition(commit(createHistory(), { brightness: 33 }), { type: 'undo' });
    expect(commit(undone, {}).future).toHaveLength(1);
    const next = commit(undone, { temperature: 1 }); expect(next.future).toEqual([]);
    next.past[0].params.contrast = 7; expect(undone.present.params.contrast).toBe(0);
  });
  it('reset and image switch are one undoable edit with exact defaults', () => {
    const edited = commit(createHistory(), { brightness: 27, contrast: 11 });
    const reset = transition(edited, { type: 'reset' }); expect(reset.present.params).toEqual(DEFAULT_PARAMS);
    expect(transition(reset, { type: 'undo' }).present).toEqual(edited.present);
    const switched = transition(edited, { type: 'switch-image', image: 'still-life' });
    expect(switched.present).toEqual({ image: 'still-life', params: DEFAULT_PARAMS }); expect(switched.past).toHaveLength(2);
    expect(transition(switched, { type: 'undo' }).present).toEqual(edited.present);
    expect(transition(transition(switched, { type: 'undo' }), { type: 'redo' }).present).toEqual(switched.present);
  });
  it('caps history at 50, makes boundary undo/redo harmless and keeps all retained edits', () => {
    let h = createHistory();
    for (let i = 1; i <= 70; i++) h = commit(h, { brightness: i });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < 60; i++) h = transition(h, { type: 'undo' });
    expect(h.present.params.brightness).toBe(20); expect(h.future).toHaveLength(50);
    for (let i = 0; i < 60; i++) h = transition(h, { type: 'redo' });
    expect(h.present.params.brightness).toBe(70); expect(h.future).toEqual([]);
    expect(transition(createHistory(), { type: 'reset' }).past).toEqual([]);
  });
  it('rejects malformed or corrupted history, states, actions, even unused future snapshots', () => {
    const good = createHistory();
    const badState = { image: 'landscape', params: params({ saturation: NaN }) } as State;
    for (const bad of [null, {}, { ...good, past: null }, { ...good, present: null }, { ...good, past: [badState] }, { ...good, future: [badState] }, { ...good, past: Array(1) }, { ...good, future: Array(51).fill(good.present) }]) expect(() => transition(bad as History, { type: 'undo' })).toThrow();
    expect(() => transition(good, { type: 'commit', state: badState })).toThrow();
    expect(() => transition(good, { type: 'switch-image', image: 'missing' as 'landscape' })).toThrow();
    expect(() => transition(good, { type: 'unknown' } as never)).toThrow(); expect(() => transition(good, null as never)).toThrow();
    expect(good).toEqual(createHistory());
  });
});
