export type Rect = {x:number;y:number;width:number;height:number};
export const unit=(v:number)=>Number.isFinite(v)?Math.min(1,Math.max(0,v)):0;
export const smooth=(v:number)=>{const p=unit(v);return p*p*(3-2*p);};
export function invertRect(first:Rect,last:Rect){if([first,last].some(r=>![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.width<0||r.height<0))throw new Error('Invalid rectangle');return {x:first.x-last.x,y:first.y-last.y,sx:last.width>0?first.width/last.width:1,sy:last.height>0?first.height/last.height:1};}
export function relayPhase(p:number){p=unit(p);return p<.35?'退場':p<.65?'配置変更':'登場';}
export function relayStyle(p:number){p=unit(p);return p<.35?{opacity:1-p/.35,x:-p/.35*30}:p<.65?{opacity:0,x:30}:{opacity:(p-.65)/.35,x:30*(1-(p-.65)/.35)};}
export const paths={line:'M 30 130 L 290 50',curve:'M 30 130 C 40 0 260 0 290 130',loop:'M 160 35 A 95 55 0 1 1 159.99 35'} as const;
export function distanceAt(length:number,p:number,reverse:boolean){return Math.max(0,Number.isFinite(length)?length:0)*(reverse?1-unit(p):unit(p));}
