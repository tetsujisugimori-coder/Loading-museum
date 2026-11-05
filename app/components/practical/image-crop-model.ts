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
export const equal = (a: Selection, b: Selection) => a.ratio === b.ratio && (Object.keys(a.rect) as (keyof Rect)[]).every(k => Math.abs(a.rect[k] - b.rect[k]) < 1e-8);
export function move(rect: Rect, dx: number, dy: number): Rect {
  if (![dx, dy].every(Number.isFinite)) return rect;
  return { ...rect, x: clamp(rect.x + dx, 0, SOURCE.width - rect.width), y: clamp(rect.y + dy, 0, SOURCE.height - rect.height) };
}
export function changeRatio(selection: Selection, ratio: Ratio): Selection {
  const r = RATIOS[ratio], old = selection.rect;
  if (!r) return { rect: old, ratio };
  const width = clamp(old.width, Math.max(MIN_SIZE, MIN_SIZE * r), Math.min(SOURCE.width, SOURCE.height * r));
  const height = width / r;
  return { ratio, rect: { width, height, x: clamp(old.x + old.width / 2 - width / 2, 0, SOURCE.width - width), y: clamp(old.y + old.height / 2 - height / 2, 0, SOURCE.height - height) } };
}
export function resize(selection: Selection, corner: Corner, dx: number, dy: number): Selection {
  if (![dx, dy].every(Number.isFinite)) return selection;
  const old = selection.rect, sx = corner.endsWith('w') ? -1 : 1, sy = corner.startsWith('n') ? -1 : 1;
  const ax = sx < 0 ? old.x + old.width : old.x, ay = sy < 0 ? old.y + old.height : old.y;
  const maxW = sx < 0 ? ax : SOURCE.width - ax, maxH = sy < 0 ? ay : SOURCE.height - ay;
  let width: number, height: number;
  const r = RATIOS[selection.ratio];
  if (r) {
    // Orthogonal projection of pointer distance onto (width, width / ratio).
    const projected = (old.width + sx * dx + (old.height + sy * dy) / r) / (1 + 1 / (r * r));
    width = clamp(projected, Math.max(MIN_SIZE, MIN_SIZE * r), Math.min(maxW, maxH * r)); height = width / r;
  } else {
    width = clamp(old.width + sx * dx, MIN_SIZE, maxW); height = clamp(old.height + sy * dy, MIN_SIZE, maxH);
  }
  return { ratio: selection.ratio, rect: { x: sx < 0 ? ax - width : ax, y: sy < 0 ? ay - height : ay, width, height } };
}
export function numeric(values: Record<keyof Rect, string>, ratio: Ratio): { selection?: Selection; error?: string } {
  const editable: (keyof Rect)[] = ratio === 'free' ? ['x', 'y', 'width', 'height'] : ['x', 'y', 'width'];
  if (editable.some(k => !values[k].trim())) return { error: '空欄があります。X・Y・幅・高さを入力してください。' };
  const rect = Object.fromEntries(Object.entries(values).map(([k, s]) => [k, Number(s)])) as Rect;
  if (!editable.every(k => Number.isFinite(rect[k]))) return { error: '有限の数値を入力してください。' };
  if (RATIOS[ratio]) rect.height = rect.width / RATIOS[ratio];
  if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return { error: '幅・高さはどちらも80以上にしてください。固定比率では幅から高さを求めます。' };
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > SOURCE.width || rect.y + rect.height > SOURCE.height) return { error: '枠全体が元絵（1000 × 700）の内側に収まる値を入力してください。' };
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
