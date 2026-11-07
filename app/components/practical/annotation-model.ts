/** Image coordinates are normalized against the source, never the containing stage. */
export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type SceneId = 'map' | 'machine';
export type AnnotationKind = 'pin' | 'arrow' | 'rect' | 'text';
export type Annotation = {
  id: string; kind: AnnotationKind; number: number; title: string; description: string;
  color: string; stroke: number; x: number; y: number; x2: number; y2: number; targetId?: string;
};
export type Handle = 'move' | 'arrow-start' | 'arrow-end' | 'nw' | 'ne' | 'sw' | 'se';
export type Mode = 'edit' | 'view';
export const MIN_RECT_SIZE = .025;
export const MIN_ARROW_LENGTH = .025;
/** The most recent 50 committed operations are undoable. A gesture is one operation. */
export const HISTORY_LIMIT = 50;
export const COLORS = ['#b95a3d', '#286e68', '#8256a1', '#986b16'] as const;
export const SCENES = {
  map: { title: '港町の案内図', width: 1200, height: 760 },
  machine: { title: '機械のしくみ', width: 760, height: 1000 },
} as const;
const item = (id: string, kind: AnnotationKind, number: number, title: string, description: string, x: number, y: number, x2 = x, y2 = y, targetId?: string): Annotation => ({ id, kind, number, title, description, x, y, x2, y2, color: COLORS[(number - 1) % COLORS.length], stroke: 3, ...(targetId ? { targetId } : {}) });
export const SAMPLES: Record<SceneId, readonly Annotation[]> = {
  map: [
    item('map-port', 'pin', 1, '資料館', '港町の記録を収めた資料館です。', .258, .49),
    item('map-route', 'arrow', 2, '温室への道', '資料館から温室へ向かう道を示します。', .33, .44, .48, .36),
    item('map-market', 'rect', 3, '温室', '植物を育てる温室を囲んでいます。', .43, .23, .56, .39),
    item('map-note', 'text', 4, '温室の記録', '温室の枠に結び付いた説明です。', .7, .61, .7, .61, 'map-market'),
  ],
  machine: [
    item('machine-drive', 'pin', 1, '圧力計', '装置の内部圧力を確認する計器です。', .5, .425),
    item('machine-motion', 'arrow', 2, '管路の流れ', '管路を通って下部へ向かう流れを示します。', .8, .4, .8, .55),
    item('machine-output', 'rect', 3, '信号表示部', '装置の状態を知らせる表示部を囲んでいます。', .26, .58, .74, .8),
    item('machine-note', 'text', 4, '圧力計の記録', '圧力計のピンに結び付いた説明です。', .72, .22, .72, .22, 'machine-drive'),
  ],
};
const finitePoint = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);
const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
const inImage = (p: Point) => unit(p.x) && unit(p.y);
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const validRect = (r: Rect) => finitePoint(r) && Number.isFinite(r.width) && Number.isFinite(r.height) && r.width > 0 && r.height > 0 && Number.isFinite(r.x + r.width) && Number.isFinite(r.y + r.height);

/** Bounds use client-space x/y (DOMRect.x/y), including any letterbox offsets. */
export function containedRect(viewport: Rect, source: { width: number; height: number }): Rect | null {
  if (!validRect(viewport) || ![source.width, source.height].every(n => Number.isFinite(n) && n > 0)) return null;
  const scale = Math.min(viewport.width / source.width, viewport.height / source.height);
  const width = source.width * scale, height = source.height * scale;
  const result = { x: viewport.x + (viewport.width - width) / 2, y: viewport.y + (viewport.height - height) / 2, width, height };
  return validRect(result) ? result : null;
}
/** Only an already-owned gesture should request clamping outside the image. */
export function clientToImage(point: Point, bounds: Rect | null, clampOutside = false): Point | null {
  if (!bounds || !validRect(bounds) || !finitePoint(point)) return null;
  if (!clampOutside && (point.x < bounds.x || point.x > bounds.x + bounds.width || point.y < bounds.y || point.y > bounds.y + bounds.height)) return null;
  const x = (point.x - bounds.x) / bounds.width, y = (point.y - bounds.y) / bounds.height;
  if (![x, y].every(Number.isFinite)) return null;
  return { x: clamp(x), y: clamp(y) };
}
export function imageToClient(point: Point, bounds: Rect | null): Point | null {
  if (!bounds || !validRect(bounds) || !inImage(point)) return null;
  const result = { x: bounds.x + point.x * bounds.width, y: bounds.y + point.y * bounds.height };
  return finitePoint(result) ? result : null;
}
export const formatCoordinate = (value: number) => String(value);
export type CoordinateKey = 'x' | 'y' | 'x2' | 'y2';
export const formatAnnotation = (a: Annotation): Record<CoordinateKey, string> => ({ x: String(a.x), y: String(a.y), x2: String(a.x2), y2: String(a.y2) });

// Compare the decimal spelling, not only its rounded binary64 result.
function decimalKey(text: string): string | undefined {
  const m = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(text.trim());
  if (!m) return undefined;
  const fraction = m[3] ?? m[4] ?? '';
  let digits = ((m[2] ?? '') + fraction).replace(/^0+/, ''), exponent = Number(m[5] ?? 0) - fraction.length;
  if (!digits) return '0';
  while (digits.endsWith('0')) { digits = digits.slice(0, -1); exponent++; }
  return `${m[1] === '-' ? '-' : ''}${digits}e${exponent}`;
}
/** Returns an error, or null. Collection validation additionally checks linked targets. */
export function validateAnnotation(a: Annotation, collection?: readonly Annotation[]): string | null {
  if (!a.id?.trim() || !['pin', 'arrow', 'rect', 'text'].includes(a.kind)) return '注釈の種類とIDを確認してください。';
  if (!Number.isSafeInteger(a.number) || a.number < 1 || typeof a.title !== 'string' || typeof a.description !== 'string') return '番号は1以上の整数、タイトルと説明は文字列にしてください。';
  if (!a.title.trim() || a.title.length > 100 || a.description.length > 1500) return 'タイトルは1〜100文字、説明は1500文字以内にしてください。';
  if (!/^#[0-9a-f]{6}$/i.test(a.color) || !Number.isFinite(a.stroke) || a.stroke < 1 || a.stroke > 12) return '色と線幅を確認してください。線幅は1〜12です。';
  if (![a.x, a.y, a.x2, a.y2].every(unit)) return '座標には0〜1の有限の数値を入力してください。';
  if (a.kind === 'rect' && (a.x2 - a.x < MIN_RECT_SIZE || a.y2 - a.y < MIN_RECT_SIZE)) return '矩形の幅と高さはそれぞれ0.025以上にしてください。';
  if (a.kind === 'arrow' && Math.hypot(a.x2 - a.x, a.y2 - a.y) < MIN_ARROW_LENGTH) return '矢印の始点と終点は0.025以上離してください。';
  if (a.targetId !== undefined && (a.kind !== 'text' || !a.targetId || a.targetId === a.id)) return 'テキストの関連先には別のピンか矩形を指定してください。';
  if (a.targetId && collection && !collection.some(target => target.id === a.targetId && (target.kind === 'pin' || target.kind === 'rect'))) return '関連先のピンか矩形が見つかりません。';
  return null;
}
export function numericAnnotation(a: Annotation, values: Record<CoordinateKey, string>): { annotation?: Annotation; error?: string } {
  const editable: CoordinateKey[] = a.kind === 'arrow' || a.kind === 'rect' ? ['x', 'y', 'x2', 'y2'] : ['x', 'y'];
  const result = { ...a };
  for (const key of editable) {
    const value = Number(values[key]);
    if (!values[key].trim() || !Number.isFinite(value) || decimalKey(values[key]) === undefined || decimalKey(values[key]) !== decimalKey(String(value))) return { error: '入力欄にそのまま保持できる精度の有限の十進数を入力してください。' };
    result[key] = Object.is(value, -0) ? 0 : value;
  }
  const error = validateAnnotation(result);
  return error ? { error } : { annotation: result };
}

// Producers round toward the feasible side of a minimum-size boundary.
function adjacent(value: number, up: boolean): number {
  const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value);
  let hi = view.getUint32(0), lo = view.getUint32(4);
  if (up) { lo = (lo + 1) >>> 0; if (lo === 0) hi++; }
  else { if (lo === 0) hi--; lo = (lo - 1) >>> 0; }
  view.setUint32(0, hi); view.setUint32(4, lo); return view.getFloat64(0);
}
function minimumEnd(start: number): number {
  let end = start + MIN_RECT_SIZE;
  while (end - start < MIN_RECT_SIZE) end = adjacent(end, true);
  return end;
}
function maximumStart(end: number): number {
  let start = end - MIN_RECT_SIZE;
  while (end - start < MIN_RECT_SIZE) start = adjacent(start, false);
  return start;
}
function repairArrowTranslation(result: Annotation, original: Annotation): Annotation {
  const length = (a: Annotation) => Math.hypot(a.x2 - a.x, a.y2 - a.y);
  if (length(result) >= MIN_ARROW_LENGTH) return result;
  if (length(original) < MIN_ARROW_LENGTH) return original;
  const start = Math.abs(original.x2 - original.x) >= Math.abs(original.y2 - original.y) ? 'x' : 'y';
  const end = start === 'x' ? 'x2' : 'y2', forward = original[end] > original[start];
  while (length(result) < MIN_ARROW_LENGTH) {
    const nextEnd = forward ? result[end] < 1 ? adjacent(result[end], true) : null : result[end] > 0 ? adjacent(result[end], false) : null;
    const nextStart = forward ? result[start] > 0 ? adjacent(result[start], false) : null : result[start] < 1 ? adjacent(result[start], true) : null;
    if (nextEnd === null && nextStart === null) return original;
    // Use the larger representable step, avoiding a subnormal endpoint's tiny ulp.
    // Only producer output changes: numeric validation keeps its exact boundary.
    if (nextEnd !== null && (nextStart === null || Math.abs(nextEnd - result[end]) >= Math.abs(nextStart - result[start]))) result = { ...result, [end]: nextEnd };
    else result = { ...result, [start]: nextStart! };
  }
  return result;
}
export function moveAnnotation(a: Annotation, dx: number, dy: number): Annotation {
  if (![dx, dy].every(Number.isFinite) || (dx === 0 && dy === 0)) return a;
  const paired = a.kind === 'arrow' || a.kind === 'rect';
  const sx = clamp(dx, -Math.min(a.x, paired ? a.x2 : a.x), 1 - Math.max(a.x, paired ? a.x2 : a.x));
  const sy = clamp(dy, -Math.min(a.y, paired ? a.y2 : a.y), 1 - Math.max(a.y, paired ? a.y2 : a.y));
  if (sx === 0 && sy === 0) return a;
  const result = { ...a, x: clamp(a.x + sx), y: clamp(a.y + sy), ...(paired ? { x2: clamp(a.x2 + sx), y2: clamp(a.y2 + sy) } : {}) };
  if (a.kind === 'rect') {
    // Translation can lose one ulp of width; keep the result inside all constraints.
    if (result.x2 - result.x < MIN_RECT_SIZE) result.x = maximumStart(result.x2);
    if (result.y2 - result.y < MIN_RECT_SIZE) result.y = maximumStart(result.y2);
  }
  return a.kind === 'arrow' ? repairArrowTranslation(result, a) : result;
}
export function resizeAnnotation(a: Annotation, handle: Handle, dx: number, dy: number): Annotation {
  if (![dx, dy].every(Number.isFinite) || (dx === 0 && dy === 0)) return a;
  if (handle === 'move') return moveAnnotation(a, dx, dy);
  if (a.kind === 'arrow' && handle === 'arrow-start') return { ...a, x: clamp(a.x + dx), y: clamp(a.y + dy) };
  if (a.kind === 'arrow' && handle === 'arrow-end') return { ...a, x2: clamp(a.x2 + dx), y2: clamp(a.y2 + dy) };
  if (a.kind !== 'rect' || !['nw', 'ne', 'sw', 'se'].includes(handle)) return a;
  return {
    ...a,
    ...(handle.endsWith('w') ? { x: clamp(a.x + dx, 0, maximumStart(a.x2)) } : { x2: clamp(a.x2 + dx, minimumEnd(a.x), 1) }),
    ...(handle.startsWith('n') ? { y: clamp(a.y + dy, 0, maximumStart(a.y2)) } : { y2: clamp(a.y2 + dy, minimumEnd(a.y), 1) }),
  };
}

export type Gesture = {
  pointerId: number; generation: number; time: number; start: Point; original: Annotation; preview: Annotation; handle: Handle; creating: boolean;
};
export type Guide = { status: 'idle' | 'playing' | 'paused' | 'finished'; index: number; generation: number };
export type AnnotationState = {
  scene: SceneId; annotations: Annotation[]; selectedId: string | null; mode: Mode;
  gesture: Gesture | null; generation: number; lastPointerTime: number;
  past: Annotation[][]; future: Annotation[][]; guide: Guide; reduced: boolean;
};
const copy = (items: readonly Annotation[]) => items.map(a => ({ ...a }));
export function initialState(scene: SceneId = 'map'): AnnotationState {
  return { scene, annotations: copy(SAMPLES[scene]), selectedId: SAMPLES[scene][0]?.id ?? null, mode: 'edit', gesture: null, generation: 0, lastPointerTime: -1, past: [], future: [], guide: { status: 'idle', index: -1, generation: 0 }, reduced: false };
}
export const canEdit = (s: AnnotationState) => s.mode === 'edit' && s.guide.status !== 'playing';
export const visibleAnnotations = (s: AnnotationState): Annotation[] => !s.gesture ? s.annotations : s.gesture.creating ? [...s.annotations, s.gesture.preview] : s.annotations.map(a => a.id === s.gesture!.original.id ? s.gesture!.preview : a);
export const guideAnnotations = (s: AnnotationState): Annotation[] => [...s.annotations].sort((a, b) => a.number - b.number);
const invalidate = (s: AnnotationState): AnnotationState => ({ ...s, gesture: null, generation: s.generation + 1 });
const idleGuide = (s: AnnotationState): Guide => ({ status: 'idle', index: -1, generation: s.guide.generation + 1 });
const same = (a: readonly Annotation[], b: readonly Annotation[]) => a.length === b.length && a.every((v, i) => (Object.keys(v) as (keyof Annotation)[]).every(k => v[k] === b[i][k]) && (Object.keys(b[i]) as (keyof Annotation)[]).every(k => b[i][k] === v[k]));
function commit(s: AnnotationState, annotations: Annotation[]): AnnotationState {
  if (same(s.annotations, annotations)) return s;
  return { ...s, annotations, past: [...s.past, copy(s.annotations)].slice(-HISTORY_LIMIT), future: [], selectedId: annotations.some(a => a.id === s.selectedId) ? s.selectedId : null, guide: idleGuide(s) };
}
export type Action =
  | { type: 'start'; annotationId: string; pointerId: number; time: number; point: Point; handle?: Handle }
  | { type: 'start-create'; annotation: Annotation; pointerId: number; time: number; point: Point }
  | { type: 'pointer'; phase: 'move' | 'up' | 'cancel'; pointerId: number; time: number; generation: number; point: Point }
  | { type: 'select'; id: string | null }
  | { type: 'mode'; mode: Mode }
  | { type: 'scene'; scene: SceneId }
  | { type: 'add'; annotation: Annotation }
  | { type: 'update'; id: string; patch: Partial<Omit<Annotation, 'id' | 'kind'>> }
  | { type: 'delete'; id: string }
  | { type: 'undo' | 'redo' | 'reset' | 'abort' }
  | { type: 'guide'; command: 'play' | 'pause' | 'resume' | 'restart' | 'end' | 'next' | 'prev' | 'jump'; index?: number }
  | { type: 'tick'; generation: number }
  | { type: 'reduced'; reduced: boolean };

export function transition(s: AnnotationState, a: Action): AnnotationState {
  if (a.type === 'start-create') {
    if (!canEdit(s) || s.gesture || !['arrow', 'rect'].includes(a.annotation.kind) || s.annotations.some(item => item.id === a.annotation.id) || !inImage(a.point) || !Number.isSafeInteger(a.pointerId) || a.pointerId < 0 || !Number.isFinite(a.time) || a.time < 0 || a.time < s.lastPointerTime) return s;
    if (validateAnnotation({ ...a.annotation, x: 0, y: 0, x2: 1, y2: 1 }, s.annotations)) return s;
    const original = { ...a.annotation, x: a.point.x, y: a.point.y, x2: a.point.x, y2: a.point.y }, generation = s.generation + 1;
    return { ...s, generation, lastPointerTime: a.time, guide: idleGuide(s), gesture: { pointerId: a.pointerId, generation, time: a.time, start: { ...a.point }, original, preview: original, handle: a.annotation.kind === 'rect' ? 'se' : 'arrow-end', creating: true } };
  }
  if (a.type === 'start') {
    const original = s.annotations.find(item => item.id === a.annotationId), handle = a.handle ?? 'move';
    const handleFits = handle === 'move' || (original?.kind === 'arrow' && ['arrow-start', 'arrow-end'].includes(handle)) || (original?.kind === 'rect' && ['nw', 'ne', 'sw', 'se'].includes(handle));
    if (!canEdit(s) || s.gesture || !original || !handleFits || !inImage(a.point) || !Number.isSafeInteger(a.pointerId) || a.pointerId < 0 || !Number.isFinite(a.time) || a.time < 0 || a.time < s.lastPointerTime) return s;
    const generation = s.generation + 1;
    return { ...s, generation, lastPointerTime: a.time, selectedId: original.id, guide: idleGuide(s), gesture: { pointerId: a.pointerId, generation, time: a.time, start: { ...a.point }, original, preview: original, handle, creating: false } };
  }
  if (a.type === 'pointer') {
    const d = s.gesture;
    if (!d || d.pointerId !== a.pointerId || d.generation !== a.generation || !Number.isFinite(a.time) || a.time < d.time) return s;
    if (a.phase === 'cancel') return { ...invalidate(s), lastPointerTime: a.time };
    if (!finitePoint(a.point)) return a.phase === 'up' ? { ...invalidate(s), lastPointerTime: a.time } : s;
    const point = { x: clamp(a.point.x), y: clamp(a.point.y) };
    const preview = d.creating
      ? d.original.kind === 'rect'
        ? { ...d.original, x: Math.min(d.start.x, point.x), y: Math.min(d.start.y, point.y), x2: Math.max(d.start.x, point.x), y2: Math.max(d.start.y, point.y) }
        : { ...d.original, x2: point.x, y2: point.y }
      : resizeAnnotation(d.original, d.handle, a.point.x - d.start.x, a.point.y - d.start.y);
    if (!d.creating && validateAnnotation(preview, s.annotations)) return a.phase === 'up' ? { ...invalidate(s), lastPointerTime: a.time } : s;
    const next = { ...s, lastPointerTime: a.time, gesture: { ...d, preview, time: a.time } };
    if (a.phase === 'move') return next;
    if (d.creating) {
      const base = invalidate(next);
      if (validateAnnotation(preview, s.annotations) || (preview.kind === 'arrow' && Math.hypot(preview.x2 - preview.x, preview.y2 - preview.y) < MIN_ARROW_LENGTH)) return base;
      return { ...commit(base, [...s.annotations, preview]), selectedId: preview.id };
    }
    return commit(invalidate(next), s.annotations.map(item => item.id === preview.id ? preview : item));
  }
  if (a.type === 'tick') {
    if (s.guide.status !== 'playing' || a.generation !== s.guide.generation) return s;
    const stops = guideAnnotations(s), index = s.guide.index + 1, generation = s.guide.generation + 1;
    return index >= stops.length
      ? { ...s, guide: { ...s.guide, status: 'finished', generation } }
      : { ...s, selectedId: stops[index].id, guide: { status: 'playing', index, generation } };
  }
  if (a.type === 'guide') {
    const base = invalidate(s), stops = guideAnnotations(s), generation = s.guide.generation + 1;
    if (a.command === 'end') return { ...base, guide: { status: 'idle', index: -1, generation } };
    if (a.command === 'pause') return { ...base, guide: { ...s.guide, status: s.guide.status === 'playing' ? 'paused' : s.guide.status, generation } };
    if (!stops.length) return { ...base, guide: { status: 'idle', index: -1, generation } };
    if (a.command === 'jump' && (!Number.isInteger(a.index) || a.index! < 0 || a.index! >= stops.length)) return s;
    const manual = ['next', 'prev', 'jump'].includes(a.command);
    let index = s.guide.index;
    if (a.command === 'restart' || index < 0 || s.guide.status === 'finished') index = 0;
    if (a.command === 'next') index = clamp(s.guide.index + 1, 0, stops.length - 1);
    if (a.command === 'prev') index = clamp(s.guide.index - 1, 0, stops.length - 1);
    if (a.command === 'jump') index = a.index!;
    return { ...base, mode: 'view', selectedId: stops[index].id, guide: { status: manual ? 'paused' : 'playing', index, generation } };
  }
  if (a.type === 'select') {
    if (a.id !== null && !s.annotations.some(item => item.id === a.id)) return s;
    const index = guideAnnotations(s).findIndex(item => item.id === a.id);
    return { ...invalidate(s), selectedId: a.id, guide: s.guide.status === 'idle' ? s.guide : { status: index < 0 ? 'idle' : 'paused', index, generation: s.guide.generation + 1 } };
  }
  if (a.type === 'mode') return ['edit', 'view'].includes(a.mode) ? { ...invalidate(s), mode: a.mode, guide: a.mode === 'edit' ? idleGuide(s) : { ...s.guide, status: s.guide.status === 'playing' ? 'paused' : s.guide.status, generation: s.guide.generation + 1 } } : s;
  if (a.type === 'scene') {
    if (!(a.scene in SCENES)) return s;
    // Switching scenes deliberately discards edits and both histories, even on reselect.
    return { ...initialState(a.scene), mode: s.mode, reduced: s.reduced, generation: s.generation + 1, lastPointerTime: s.lastPointerTime, guide: idleGuide(s) };
  }
  if (a.type === 'reduced') return { ...invalidate(s), reduced: a.reduced, guide: { ...s.guide, generation: s.guide.generation + 1 } };
  if (a.type === 'abort') return { ...invalidate(s), guide: { ...s.guide, status: s.guide.status === 'playing' ? 'paused' : s.guide.status, generation: s.guide.generation + 1 } };
  // Reset is an explicit global control, also available during viewing/playback.
  if (a.type === 'reset') return { ...initialState(s.scene), reduced: s.reduced, generation: s.generation + 1, lastPointerTime: s.lastPointerTime, guide: idleGuide(s) };
  if (!canEdit(s)) return s;
  const base = invalidate(s);
  switch (a.type) {
    case 'add': {
      if (s.annotations.some(item => item.id === a.annotation.id) || validateAnnotation(a.annotation, s.annotations)) return base;
      return { ...commit(base, [...s.annotations, { ...a.annotation }]), selectedId: a.annotation.id };
    }
    case 'update': {
      const original = s.annotations.find(item => item.id === a.id);
      if (!original) return base;
      const updated = { ...original, ...a.patch };
      if (validateAnnotation(updated, s.annotations)) return base;
      return commit(base, s.annotations.map(item => item.id === a.id ? updated : item));
    }
    case 'delete': {
      // Keep linked text, removing only its link. Undo restores both target and link.
      const annotations = s.annotations.filter(item => item.id !== a.id).map(item => {
        if (item.targetId !== a.id) return item;
        const unlinked = { ...item }; delete unlinked.targetId; return unlinked;
      });
      return commit(base, annotations);
    }
    case 'undo': {
      const restored = s.past.at(-1);
      if (!restored) return base;
      return { ...base, annotations: copy(restored), past: s.past.slice(0, -1), future: [copy(s.annotations), ...s.future].slice(0, HISTORY_LIMIT), selectedId: restored.some(item => item.id === s.selectedId) ? s.selectedId : null, guide: idleGuide(s) };
    }
    case 'redo': {
      const restored = s.future[0];
      if (!restored) return base;
      return { ...base, annotations: copy(restored), past: [...s.past, copy(s.annotations)].slice(-HISTORY_LIMIT), future: s.future.slice(1), selectedId: restored.some(item => item.id === s.selectedId) ? s.selectedId : null, guide: idleGuide(s) };
    }
  }
}
