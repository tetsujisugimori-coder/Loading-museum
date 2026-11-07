/** Textbook adjustments on encoded sRGB bytes, not colorimetric exposure,
 * perceptual saturation or a physical Kelvin/white-balance calculation.
 * All operations retain floating-point intermediates and round/clamp only once.
 */
export type ParamKey = 'brightness' | 'contrast' | 'saturation' | 'temperature';
export type Params = Record<ParamKey, number>;
export type ImageId = 'landscape' | 'still-life';
export const DEFAULT_PARAMS: Readonly<Params> = Object.freeze({ brightness: 0, contrast: 0, saturation: 100, temperature: 0 });
export const PARAMS: ReadonlyArray<{ key: ParamKey; label: string; min: number; max: number; step: number }> = Object.freeze([
  { key: 'brightness', label: '明るさ', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: 'コントラスト', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: '彩度', min: 0, max: 200, step: 1 },
  { key: 'temperature', label: '色温度', min: -100, max: 100, step: 1 },
].map(spec => Object.freeze(spec)) as ReadonlyArray<{ key: ParamKey; label: string; min: number; max: number; step: number }>);
export const PRESETS = Object.freeze([
  { id: 'original', label: 'Original', params: DEFAULT_PARAMS },
  { id: 'vivid', label: 'Vivid', params: Object.freeze({ brightness: 4, contrast: 18, saturation: 140, temperature: 0 }) },
  { id: 'soft', label: 'Soft', params: Object.freeze({ brightness: 4, contrast: -18, saturation: 90, temperature: 0 }) },
  { id: 'warm', label: 'Warm', params: Object.freeze({ brightness: 3, contrast: 4, saturation: 110, temperature: 35 }) },
  { id: 'cool', label: 'Cool', params: Object.freeze({ brightness: 2, contrast: 8, saturation: 100, temperature: -35 }) },
  { id: 'high-contrast', label: 'High Contrast', params: Object.freeze({ brightness: 0, contrast: 55, saturation: 100, temperature: 0 }) },
].map(preset => Object.freeze(preset)));
export const SOURCE_WIDTH = 480;
export const SOURCE_HEIGHT = 300;
export const HISTORY_LIMIT = 50;
const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export function validateParams(params: Params): void {
  if (!params || typeof params !== 'object') throw new TypeError('Parameters must be an object.');
  for (const { key, min, max } of PARAMS) {
    const value = params[key];
    if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`Invalid ${key}.`);
  }
}
function validatePixels(data: Uint8ClampedArray): void {
  if (!(data instanceof Uint8ClampedArray) || data.length % 4 !== 0) throw new TypeError('Expected complete RGBA bytes.');
}
function validateImage(image: ImageId): void {
  if (image !== 'landscape' && image !== 'still-life') throw new RangeError('Unknown source image.');
}
/** Brightness → contrast about 127.5 → Rec.709 encoded-luma saturation → temperature.
 * Alpha is copied, including fully transparent pixels; RGB is not premultiplied.
 */
export function transformPixels(data: Uint8ClampedArray, params: Params): Uint8ClampedArray {
  validatePixels(data); validateParams(params);
  const result = new Uint8ClampedArray(data.length);
  const lift = params.brightness * 2.55, contrast = 1 + params.contrast / 100;
  const saturation = params.saturation / 100, temperature = params.temperature * .4;
  for (let i = 0; i < data.length; i += 4) {
    const r = (data[i] + lift - 127.5) * contrast + 127.5;
    const g = (data[i + 1] + lift - 127.5) * contrast + 127.5;
    const b = (data[i + 2] + lift - 127.5) * contrast + 127.5;
    const luma = .2126 * r + .7152 * g + .0722 * b;
    result[i] = byte(luma + (r - luma) * saturation + temperature);
    result[i + 1] = byte(luma + (g - luma) * saturation);
    result[i + 2] = byte(luma + (b - luma) * saturation - temperature);
    result[i + 3] = data[i + 3];
  }
  return result;
}
/** Each alpha>0 pixel contributes one count/channel, irrespective of opacity. */
export function histogram(data: Uint8ClampedArray): { r: number[]; g: number[]; b: number[]; count: number; transparent: number } {
  validatePixels(data);
  const result = { r: Array<number>(256).fill(0), g: Array<number>(256).fill(0), b: Array<number>(256).fill(0), count: 0, transparent: 0 };
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) { result.transparent++; continue; }
    result.count++; result.r[data[i]]++; result.g[data[i + 1]]++; result.b[data[i + 2]]++;
  }
  return result;
}
/** Original, deterministic raster illustrations. No external images or canvas needed.
 * Both originals are opaque: histogram alpha behavior is exercised with separate fixtures.
 */
export function sourcePixels(image: ImageId): Uint8ClampedArray {
  validateImage(image);
  const result = new Uint8ClampedArray(SOURCE_WIDTH * SOURCE_HEIGHT * 4);
  for (let y = 0; y < SOURCE_HEIGHT; y++) for (let x = 0; x < SOURCE_WIDTH; x++) {
    const u = x / SOURCE_WIDTH, v = y / SOURCE_HEIGHT;
    let r: number, g: number, b: number;
    if (image === 'landscape') {
      r = 107 + 85 * v; g = 172 + 42 * v; b = 211 + 21 * v;
      const cloud = Math.exp(-((u - .26) ** 2 / .018 + (v - .22) ** 2 / .002)) + Math.exp(-((u - .65) ** 2 / .03 + (v - .13) ** 2 / .001));
      r += cloud * 58; g += cloud * 35; b += cloud * 19;
      if ((u - .82) ** 2 + ((v - .23) * .625) ** 2 < .003) { r = 255; g = 231; b = 158; }
      if (v > .45 + .065 * Math.sin(u * 10) + .04 * Math.cos(u * 19)) { r = 89; g = 131 + 15 * u; b = 103; }
      if (v > .58 + .025 * Math.sin(u * 14)) { r = 118 - 32 * v; g = 160 - 30 * v; b = 81; }
      if (v > .66 && u > .38 - (v - .66) * .85 && u < .68 + (v - .66) * .9) {
        const ripple = Math.sin(y * .52 + x * .06) * 6;
        r = 84 + ripple; g = 154 + ripple; b = 174 + ripple;
      }
      if (u > .16 && u < .34 && v > .45 && v < .65) { r = 231; g = 209; b = 163; }
      if (u > .135 && u < .365 && v > .35 + Math.abs(u - .25) * .8 && v < .47) { r = 158; g = 76; b = 57; }
      if (u > .23 && u < .27 && v > .55 && v < .65) { r = 72; g = 87; b = 84; }
      if (((u > .18 && u < .215) || (u > .285 && u < .32)) && v > .5 && v < .55) { r = 75; g = 125; b = 143; }
      if (v > .85 && (u < .2 || u > .84)) { r = 62 + 18 * Math.sin(x * .4); g = 111 + 10 * Math.sin(y); b = 59; }
    } else {
      const light = Math.max(0, 1 - Math.hypot((u - .25) * 1.2, v - .25));
      r = 135 + 82 * light; g = 117 + 75 * light; b = 105 + 67 * light;
      if (v > .68) { r = 132 + 30 * u + Math.sin(y * .2) * 3; g = 91 + 24 * u; b = 61 + 16 * u; }
      if (((u - .54) / .31) ** 2 + ((v - .79) / .05) ** 2 < 1) { r *= .71; g *= .71; b *= .71; }
      if (((u - .36) / .105) ** 2 + ((v - .56) / .22) ** 2 < 1 || (u > .32 && u < .4 && v > .3 && v < .54)) {
        const shine = Math.max(0, 1 - Math.abs(u - .325) * 12);
        r = 48 + 35 * shine; g = 111 + 59 * shine; b = 116 + 59 * shine;
      }
      if (u > .51 && u < .74 && v > .43 && v < .75) { r = 210 + 20 * (1 - u); g = 180 + 20 * (1 - u); b = 133 + 15 * (1 - u); }
      if (u > .51 && u < .74 && v > .43 && v < .47) { r = 245; g = 220; b = 176; }
      const apple = ((u - .57) / .085) ** 2 + ((v - .76) / .1) ** 2;
      if (apple < 1) { const shine = Math.max(0, 1 - Math.hypot((u - .54) * 12, (v - .72) * 8)); r = 164 + shine * 74; g = 50 + shine * 49; b = 40 + shine * 25; }
      if (u > .565 && u < .576 && v > .64 && v < .675) { r = 72; g = 65; b = 36; }
    }
    const i = (y * SOURCE_WIDTH + x) * 4;
    result[i] = byte(r); result[i + 1] = byte(g); result[i + 2] = byte(b); result[i + 3] = 255;
  }
  return result;
}
export type State = { image: ImageId; params: Params };
export type History = { past: State[]; present: State; future: State[] };
export type Action = { type: 'commit'; state: State } | { type: 'switch-image'; image: ImageId } | { type: 'undo' | 'redo' | 'reset' };
function copyState(state: State): State {
  if (!state || typeof state !== 'object') throw new TypeError('Invalid state.');
  validateImage(state.image); validateParams(state.params);
  return { image: state.image, params: { ...state.params } };
}
export function createHistory(image: ImageId = 'landscape'): History {
  validateImage(image);
  return { past: [], present: { image, params: { ...DEFAULT_PARAMS } }, future: [] };
}
/** One commit represents a completed gesture/field/preset; previews stay outside history. */
export function transition(history: History, action: Action): History {
  if (!history || !Array.isArray(history.past) || !Array.isArray(history.future) || history.past.length + history.future.length > HISTORY_LIMIT) throw new TypeError('Invalid history.');
  const next: History = { past: Array.from(history.past, copyState), present: copyState(history.present), future: Array.from(history.future, copyState) };
  if (!action || typeof action !== 'object') throw new TypeError('Invalid action.');
  switch (action.type) {
    case 'undo': {
      const previous = next.past.pop();
      if (previous) { next.future.unshift(next.present); next.present = previous; }
      return next;
    }
    case 'redo': {
      const future = next.future.shift();
      if (future) { next.past.push(next.present); next.present = future; }
      return next;
    }
    case 'reset': case 'switch-image': case 'commit': {
      const state = copyState(action.type === 'commit' ? action.state : { image: action.type === 'switch-image' ? action.image : next.present.image, params: { ...DEFAULT_PARAMS } });
      if (state.image === next.present.image && PARAMS.every(({ key }) => state.params[key] === next.present.params[key])) return next;
      next.past = [...next.past, next.present].slice(-HISTORY_LIMIT);
      next.present = state; next.future = [];
      return next;
    }
    default: throw new TypeError('Unknown history action.');
  }
}
