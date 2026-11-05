// Coordinates always belong to the unmodified 1000 × 700 source illustration.
export const SOURCE = { width: 1000, height: 700 };
export const MIN_SIZE = 80;
export const RATIOS = { free: null, square: 1, wide: 16 / 9, photo: 4 / 3 } as const;
export type Ratio = keyof typeof RATIOS;
export type Rect = { x: number; y: number; width: number; height: number };
export type Selection = { rect: Rect; ratio: Ratio };
export type Corner = 'nw' | 'ne' | 'sw' | 'se';
export const INITIAL: Selection = { rect: { x: 100, y: 120, width: 480, height: 360 }, ratio: 'free' };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const PAIRS = { square: [1, 1], wide: [16, 9], photo: [4, 3] } as const;
export const formatCoordinate = (value: number) => String(value);
export const formatSelection = (s: Selection) => Object.fromEntries(Object.entries(s.rect).map(([k, v]) => [k, formatCoordinate(v)])) as Record<keyof Rect, string>;
export function fixedHeight(width: number, ratio: Exclude<Ratio, 'free'>): number {
  const [p, q] = PAIRS[ratio]; return width * q / p;
}
// Error-free TwoSum distinguishes a truly overflowing pair from a sum rounded to the edge.
function endFits(start: number, size: number, edge: number): boolean {
  const sum = start + size;
  if (sum !== edge) return sum < edge;
  const b = sum - start, error = (start - (sum - b)) + (size - b);
  return error <= 0;
}
function adjacent(value: number, up: boolean): number {
  const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value);
  let hi = view.getUint32(0), lo = view.getUint32(4);
  if (up) { lo = (lo + 1) >>> 0; if (lo === 0) hi++; }
  else { if (lo === 0) hi--; lo = (lo - 1) >>> 0; }
  view.setUint32(0, hi); view.setUint32(4, lo); return view.getFloat64(0);
}
// Producers choose a representable value INSIDE the edge; numeric input is never snapped.
function available(origin: number, edge: number): number {
  let distance = edge - origin;
  while (!endFits(origin, distance, edge)) distance = adjacent(distance, false);
  return distance;
}
function fixedWidthBounds(ratio: Exclude<Ratio, 'free'>, maxW: number, maxH: number): [number, number] {
  const [p, q] = PAIRS[ratio];
  let lo = Math.max(MIN_SIZE, MIN_SIZE * p / q), hi = Math.min(maxW, maxH * p / q);
  while (fixedHeight(lo, ratio) < MIN_SIZE) lo = adjacent(lo, true);
  while (fixedHeight(hi, ratio) > maxH) hi = adjacent(hi, false);
  return [lo, hi];
}
export const equal = (a: Selection, b: Selection) => a.ratio === b.ratio && (Object.keys(a.rect) as (keyof Rect)[]).every(k => a.rect[k] === b.rect[k]);
export function move(rect: Rect, dx: number, dy: number): Rect {
  if (![dx, dy].every(Number.isFinite)) return rect;
  return { ...rect, x: clamp(rect.x + dx, 0, available(rect.width, SOURCE.width)), y: clamp(rect.y + dy, 0, available(rect.height, SOURCE.height)) };
}
export function changeRatio(selection: Selection, ratio: Ratio): Selection {
  const old = selection.rect;
  if (ratio === selection.ratio) return selection;
  if (ratio === 'free') return { rect: old, ratio };
  const [lo, hi] = fixedWidthBounds(ratio, SOURCE.width, SOURCE.height), width = clamp(old.width, lo, hi);
  const height = fixedHeight(width, ratio);
  return { ratio, rect: { width, height, x: clamp(old.x + old.width / 2 - width / 2, 0, available(width, SOURCE.width)), y: clamp(old.y + old.height / 2 - height / 2, 0, available(height, SOURCE.height)) } };
}
export function resize(selection: Selection, corner: Corner, dx: number, dy: number): Selection {
  if (![dx, dy].every(Number.isFinite) || (dx === 0 && dy === 0)) return selection;
  const old = selection.rect, sx = corner.endsWith('w') ? -1 : 1, sy = corner.startsWith('n') ? -1 : 1;
  const ax = sx < 0 ? old.x + old.width : old.x, ay = sy < 0 ? old.y + old.height : old.y;
  const maxW = sx < 0 ? ax : available(ax, SOURCE.width), maxH = sy < 0 ? ay : available(ay, SOURCE.height);
  let width: number, height: number;
  const r = RATIOS[selection.ratio];
  if (selection.ratio !== 'free') {
    // Orthogonal projection of pointer distance onto (width, width / ratio).
    const projected = (old.width + sx * dx + (old.height + sy * dy) / r!) / (1 + 1 / (r! * r!));
    const [lo, hi] = fixedWidthBounds(selection.ratio, maxW, maxH);
    width = clamp(projected, lo, hi); height = fixedHeight(width, selection.ratio);
  } else {
    width = clamp(old.width + sx * dx, MIN_SIZE, maxW); height = clamp(old.height + sy * dy, MIN_SIZE, maxH);
  }
  return { ratio: selection.ratio, rect: { x: clamp(sx < 0 ? ax - width : ax, 0, available(width, SOURCE.width)), y: clamp(sy < 0 ? ay - height : ay, 0, available(height, SOURCE.height)), width, height } };
}
// A decimal spelling may add zeros/use exponents, but must not silently lose digits.
// In particular 79.999999999999999 must not become an accepted 80.
function decimalKey(text: string): string | undefined {
  const m = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(text.trim());
  if (!m) return undefined;
  const fraction = m[3] ?? m[4] ?? '';
  let digits = ((m[2] ?? '') + fraction).replace(/^0+/, ''), exponent = Number(m[5] ?? 0) - fraction.length;
  if (!digits) return '0';
  while (digits.endsWith('0')) { digits = digits.slice(0, -1); exponent++; }
  return `${m[1] === '-' ? '-' : ''}${digits}e${exponent}`;
}
export function numeric(values: Record<keyof Rect, string>, ratio: Ratio): { selection?: Selection; error?: string } {
  const editable: (keyof Rect)[] = ratio === 'free' ? ['x', 'y', 'width', 'height'] : ['x', 'y', 'width'];
  if (editable.some(k => !values[k].trim())) return { error: '空欄があります。X・Y・幅・高さを入力してください。' };
  const rect = Object.fromEntries(Object.entries(values).map(([k, s]) => [k, Number(s)])) as Rect;
  if (!editable.every(k => Number.isFinite(rect[k]))) return { error: '有限の数値を入力してください。' };
  if (!editable.every(k => decimalKey(values[k]) !== undefined && decimalKey(values[k]) === decimalKey(String(rect[k])))) return { error: '有限の十進数で、入力欄にそのまま保持できる精度の数値を入力してください。' };
  for (const k of editable) if (Object.is(rect[k], -0)) rect[k] = 0;
  if (ratio !== 'free') rect.height = fixedHeight(rect.width, ratio);
  if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return { error: '幅・高さはどちらも80以上にしてください。固定比率では幅から高さを求めます。' };
  if (rect.x < 0 || rect.y < 0 || !endFits(rect.x, rect.width, SOURCE.width) || !endFits(rect.y, rect.height, SOURCE.height)) return { error: '枠全体が元絵（1000 × 700）の内側に収まる値を入力してください。' };
  return { selection: { rect, ratio } };
}
export type Drag = { id: number; time: number; startX: number; startY: number; start: Selection; corner?: Corner };
export type CropState = { editing: Selection; committed: Selection; drag: Drag | null };
export const initialState = (): CropState => ({ editing: INITIAL, committed: INITIAL, drag: null });
export type Action =
  | { type: 'start'; id: number; time: number; x: number; y: number; corner?: Corner }
  | { type: 'pointer'; phase: 'move' | 'up' | 'cancel'; id: number; time: number; x: number; y: number }
  | { type: 'abort' | 'confirm' | 'cancel' | 'reset' }
  | { type: 'move'; dx: number; dy: number }
  | { type: 'ratio'; ratio: Ratio }
  | { type: 'numeric'; selection: Selection };
export function transition(state: CropState, action: Action): CropState {
  if (action.type === 'start') {
    if (state.drag) return state;
    return { ...state, drag: { id: action.id, time: action.time, startX: action.x, startY: action.y, start: state.editing, corner: action.corner } };
  }
  if (action.type === 'pointer') {
    const d = state.drag;
    if (!d || d.id !== action.id || action.time < d.time) return state;
    if (action.phase === 'cancel') return { ...state, editing: d.start, drag: null };
    const dx = action.x - d.startX, dy = action.y - d.startY;
    const editing = d.corner ? resize(d.start, d.corner, dx, dy) : { ...d.start, rect: move(d.start.rect, dx, dy) };
    return { ...state, editing, drag: action.phase === 'up' ? null : d };
  }
  // Every non-pointer command first invalidates the provisional gesture.
  const editing = state.drag?.start ?? state.editing;
  const base = { ...state, editing, drag: null };
  switch (action.type) {
    case 'abort': return base;
    case 'confirm': return { ...base, committed: editing };
    case 'cancel': return { ...base, editing: state.committed };
    case 'reset': return initialState();
    case 'move': return { ...base, editing: { ...editing, rect: move(editing.rect, action.dx, action.dy) } };
    case 'ratio': return { ...base, editing: changeRatio(editing, action.ratio) };
    case 'numeric': return { ...base, editing: action.selection };
  }
}
