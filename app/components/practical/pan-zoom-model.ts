export const WORLD = { width: 1000, height: 700 };
export const MIN_ZOOM = 1, MAX_ZOOM = 8;
export type Point = { x: number; y: number };
export type View = Point & { width: number; height: number; zoom: number };
export const landmarks = [
  { id: 'observatory', name: '星見の観測所', x: 270, y: 190, detail: '屋根の小さな星と、東を向いた望遠鏡を探す。' },
  { id: 'garden', name: '時計の庭', x: 710, y: 230, detail: '四つの花壇の真ん中に日時計。花の点も数えてみよう。' },
  { id: 'bridge', name: '三日月橋', x: 505, y: 440, detail: '小川にかかる橋の上には、三日月の目印。' },
  { id: 'cabin', name: '灯りの小屋', x: 800, y: 565, detail: '窓に灯り。入口のそばには三つの鉢植え。' },
  { id: 'grove', name: '風の木立', x: 170, y: 540, detail: '木々の間に、小さな風見の旗が隠れている。' },
];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const scaleOf = (v: View) => Math.min(v.width / WORLD.width, v.height / WORLD.height) * v.zoom;
export function constrain(v: View): View {
  const zoom = clamp(Number.isFinite(v.zoom) ? v.zoom : 1, MIN_ZOOM, MAX_ZOOM);
  const scale = scaleOf({ ...v, zoom });
  const axis = (value: number, window: number, world: number) => world * scale <= window ? (window - world * scale) / 2 : clamp(Number.isFinite(value) ? value : 0, window - world * scale, 0);
  return { ...v, zoom, x: axis(v.x, v.width, WORLD.width), y: axis(v.y, v.height, WORLD.height) };
}
// A missing/hidden viewport is not a valid fitted view.
export function fit(width: number, height: number): View | null {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? constrain({ width, height, zoom: 1, x: 0, y: 0 }) : null;
}
export const worldAt = (v: View, p: Point): Point => ({ x: (p.x - v.x) / scaleOf(v), y: (p.y - v.y) / scaleOf(v) });
export function zoomAt(v: View, zoom: number, anchor: Point = { x: v.width / 2, y: v.height / 2 }): View {
  if (!Number.isFinite(zoom)) return v;
  const point = worldAt(v, anchor), next = { ...v, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
  const scale = scaleOf(next);
  return constrain({ ...next, x: anchor.x - point.x * scale, y: anchor.y - point.y * scale });
}
export const pan = (v: View, dx: number, dy: number) => constrain({ ...v, x: v.x + dx, y: v.y + dy });
export function focusPoint(v: View, point: Point): View {
  const next = { ...v, zoom: 4 }, scale = scaleOf(next);
  return constrain({ ...next, x: v.width / 2 - point.x * scale, y: v.height / 2 - point.y * scale });
}
export function resize(v: View, width: number, height: number): View | null {
  if (!fit(width, height)) return null;
  const center = worldAt(v, { x: v.width / 2, y: v.height / 2 }), next = { ...v, width, height }, scale = scaleOf(next);
  return constrain({ ...next, x: width / 2 - center.x * scale, y: height / 2 - center.y * scale });
}
export function visibleRect(v: View) {
  const a = worldAt(v, { x: 0, y: 0 }), b = worldAt(v, { x: v.width, y: v.height });
  const x = clamp(a.x, 0, WORLD.width), y = clamp(a.y, 0, WORLD.height);
  return { x, y, width: clamp(b.x, 0, WORLD.width) - x, height: clamp(b.y, 0, WORLD.height) - y };
}
