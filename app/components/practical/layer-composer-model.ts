export const WIDTH = 600, HEIGHT = 400, HISTORY_LIMIT = 60, MAX_LAYERS = 20;
export const ASSETS = [
  { id: 'landscape', name: '夜明けの丘', width: 600, height: 400 },
  { id: 'sun', name: '琥珀の太陽', width: 200, height: 200 },
  { id: 'leaves', name: '青い葉の切り絵', width: 240, height: 240 },
] as const;
export type AssetId = typeof ASSETS[number]['id'];
export type Blend = 'normal' | 'multiply' | 'screen';
export type Layer = { id: string; imageId: AssetId; name: string; x: number; y: number; width: number; height: number; opacity: number; blend: Blend; visible: boolean; locked: boolean };
export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };
export type State = { layers: Layer[]; selected: string | null; past: Layer[][]; future: Layer[][]; serial: number; gesture: null | { kind?: 'move'|'opacity'; pointerId: number; start: Point; bounds: Box; before: Layer[]; layerId: string } };
export const initialLayers = (): Layer[] => [
  { id: 'layer-1', imageId: 'landscape', name: '夜明けの丘', x: 0, y: 0, width: 600, height: 400, opacity: 1, blend: 'normal', visible: true, locked: false },
  { id: 'layer-2', imageId: 'sun', name: '琥珀の太陽', x: 320, y: 28, width: 180, height: 180, opacity: .85, blend: 'screen', visible: true, locked: false },
  { id: 'layer-3', imageId: 'leaves', name: '青い葉の切り絵', x: 55, y: 120, width: 260, height: 260, opacity: .9, blend: 'multiply', visible: true, locked: false },
];
export const initialState = (): State => ({ layers: initialLayers(), selected: 'layer-3', past: [], future: [], serial: 4, gesture: null });
export function validLayer(l: Layer): boolean {
  return !!l && typeof l.id === 'string' && !!l.id && typeof l.name === 'string' && l.name.length <= 80 && ASSETS.some(a => a.id === l.imageId) && ['normal', 'multiply', 'screen'].includes(l.blend) && typeof l.visible === 'boolean' && typeof l.locked === 'boolean' && [l.x,l.y,l.width,l.height,l.opacity].every(Number.isFinite) && l.width >= 1 && l.width <= 1200 && l.height >= 1 && l.height <= 1200 && l.x >= -1200 && l.x <= WIDTH && l.y >= -1200 && l.y <= HEIGHT && l.opacity >= 0 && l.opacity <= 1;
}
export function validLayers(layers: Layer[]): boolean { return Array.isArray(layers) && layers.length <= MAX_LAYERS && layers.every(validLayer) && new Set(layers.map(l => l.id)).size === layers.length; }
const same = (a: Layer[], b: Layer[]) => JSON.stringify(a) === JSON.stringify(b);
const selection = (layers: Layer[], id: string | null) => layers.some(l => l.id === id) ? id : layers.at(-1)?.id ?? null;
export function commit(s: State, layers: Layer[]): State {
  const base = s.gesture?.before ?? s.layers;
  if (!validLayers(layers)) return { ...s, layers: base, gesture: null };
  if (same(base, layers)) return { ...s, layers: base, gesture: null };
  return { ...s, layers, selected: selection(layers,s.selected), past: [...s.past,base].slice(-HISTORY_LIMIT), future: [], gesture: null };
}
export function abort(s: State): State { return s.gesture ? { ...s, layers: s.gesture.before, gesture: null } : s; }
export function patch(s: State, id: string, changes: Partial<Pick<Layer,'x'|'y'|'width'|'height'|'opacity'|'blend'|'visible'|'locked'>>): State {
  s = abort(s); const layer=s.layers.find(l=>l.id===id); if (!layer) return s;
  if (layer.locked && ['x','y','width','height'].some(k=>k in changes)) return s;
  return commit(s,s.layers.map(l=>l.id===id?{...l,...changes}:l));
}
export function command(state: State, action: 'undo'|'redo'|'reset'|'delete'|'duplicate'|'up'|'down', id = state.selected): State {
  const s=abort(state), at=s.layers.findIndex(l=>l.id===id);
  if(action==='undo'){const layers=s.past.at(-1);return layers?{...s,layers,selected:selection(layers,s.selected),past:s.past.slice(0,-1),future:[s.layers,...s.future]}:s;}
  if(action==='redo'){const layers=s.future[0];return layers?{...s,layers,selected:selection(layers,s.selected),past:[...s.past,s.layers].slice(-HISTORY_LIMIT),future:s.future.slice(1)}:s;}
  if(action==='reset')return commit(s,initialLayers());
  if(at<0)return s;
  if(action==='delete')return commit(s,s.layers.filter(l=>l.id!==id));
  if(action==='duplicate') {if(s.layers.length>=MAX_LAYERS)return s; const copy={...s.layers[at],id:`layer-${s.serial}`,name:`${s.layers[at].name.slice(0,75)} コピー`};const layers=[...s.layers];layers.splice(at+1,0,copy);return {...commit(s,layers),selected:copy.id,serial:s.serial+1};}
  const next=action==='up'?at+1:at-1;if(next<0||next>=s.layers.length)return s;const layers=[...s.layers];[layers[at],layers[next]]=[layers[next],layers[at]];return commit(s,layers);
}
export function add(state: State, imageId: AssetId): State {
  const s=abort(state),asset=ASSETS.find(a=>a.id===imageId);if(!asset||s.layers.length>=MAX_LAYERS)return s;
  const layer: Layer={id:`layer-${s.serial}`,imageId,name:asset.name,x:80,y:60,width:asset.width,height:asset.height,opacity:1,blend:'normal',visible:true,locked:false};
  return {...commit(s,[...s.layers,layer]),selected:layer.id,serial:s.serial+1};
}
export function point(client: Point, bounds: Box): Point | null {
  if(![client.x,client.y,bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)return null;
  return {x:(client.x-bounds.x)*WIDTH/bounds.width,y:(client.y-bounds.y)*HEIGHT/bounds.height};
}
export function begin(s: State, pointerId: number, start: Point, bounds: Box): State {
  if(s.gesture||!Number.isInteger(pointerId)||!point({x:bounds.x,y:bounds.y},bounds))return s;
  const l=[...s.layers].reverse().find(l=>l.visible&&start.x>=l.x&&start.y>=l.y&&start.x<=l.x+l.width&&start.y<=l.y+l.height);
  if(!l)return {...s,selected:null};
  if(l.locked)return {...s,selected:l.id};
  return {...s,selected:l.id,gesture:{pointerId,start,bounds,before:s.layers,layerId:l.id}};
}
export function move(s: State, pointerId: number, p: Point, bounds: Box): State {
  const g=s.gesture;if(!g||pointerId!==g.pointerId)return s;
  if(JSON.stringify(bounds)!==JSON.stringify(g.bounds)||![p.x,p.y].every(Number.isFinite))return abort(s);
  const old=g.before.find(l=>l.id===g.layerId)!;
  return {...s,layers:g.before.map(l=>l.id===g.layerId?{...l,x:Math.min(WIDTH,Math.max(-1200,old.x+p.x-g.start.x)),y:Math.min(HEIGHT,Math.max(-1200,old.y+p.y-g.start.y))}:l)};
}
