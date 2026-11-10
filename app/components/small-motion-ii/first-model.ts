export const bounded=(n:number,min:number,max:number)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
/** Analytic under-damped unit-mass spring. Seconds, normalized displacement. */
export function springAt(t:number,from:number,target:number,velocity:number,frequency:number,damping:number){
 const time=bounded(t,0,60), w=bounded(frequency,4,24), z=bounded(damping,.1,.95), a=z*w, b=w*Math.sqrt(1-z*z), d=from-target, c=(velocity+a*d)/b;
 const e=Math.exp(-a*time), co=Math.cos(b*time), si=Math.sin(b*time);
 return {position:target+e*(d*co+c*si),velocity:e*((-a*d+b*c)*co+(-a*c-b*d)*si)};
}
export function interpolate(from:number,to:number,p:number,easing:'linear'|'smooth'){
 const q=bounded(p,0,1), v=easing==='linear'?q:q*q*(3-2*q);return from+(to-from)*v;
}
export function drawState(progress:number,result:'success'|'failure',cancelled=false){return cancelled?'cancelled':progress>=1?result:'running';}
