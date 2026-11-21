/** Values are model outputs, not measurements of physical springs or gesture intent. */
export const finiteClamp = (n:number,min:number,max:number) => Number.isFinite(n)?Math.min(max,Math.max(min,n)):min;
export function pressDepth(heldMs:number){return 4+8*finiteClamp(heldMs/1500,0,1);}
export function holdProgress(heldMs:number,threshold:number){return finiteClamp(heldMs/finiteClamp(threshold,400,3000),0,1);}
export function swipeDecision(dx:number,velocity:number,threshold:number){
 if(![dx,velocity,threshold].every(Number.isFinite)||threshold<=0)return 'cancelled' as const;
 const distance=Math.abs(dx)>=threshold,fast=Math.abs(dx)>=24&&Math.abs(velocity)>=.65&&Math.sign(dx)===Math.sign(velocity);
 return distance||fast?'dismissed' as const:'returned' as const;
}
