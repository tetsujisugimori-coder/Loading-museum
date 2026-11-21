export type Point = {x: number; y: number};
export function magneticOffset(point: Point, range: number, strength: number): Point & {distance:number} {
  if (![point.x,point.y,range,strength].every(Number.isFinite) || range <= 0 || strength < 0) throw new Error('Invalid magnetic parameters');
  const distance = Math.hypot(point.x,point.y);
  const factor = Math.max(0,1-distance/range)*Math.min(strength,1);
  return {x:point.x*factor,y:point.y*factor,distance};
}
export type MorphState = 'Idle'|'Loading'|'Success'|'Error'|'Cancelled';
export type MorphResult = 'Success'|'Error';
export function settleMorph(state:MorphState, current:number, response:number, result:MorphResult):MorphState {
  return state==='Loading'&&current===response ? result : state;
}
