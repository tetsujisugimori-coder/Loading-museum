export const bounded=(n:number,min=0,max=1)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
export const ease=(p:number)=>{const t=bounded(p);return t*t*(3-2*t);};
export function reorder(items:string[],from:number,to:number){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length)return [...items];const next=[...items];const [item]=next.splice(from,1);next.splice(to,0,item);return next;}
export function cardRect(p:number,width:number){p=bounded(p);const w=bounded(width,180,560);return {x:12*(1-p),y:18*(1-p),width:Math.min(160,w)+(w-Math.min(160,w))*p,height:100+90*p};}
export const revealState=(p:number,result:'success'|'failure')=>p<.65?'loading':result;
