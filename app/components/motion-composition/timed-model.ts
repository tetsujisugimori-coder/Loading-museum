export type Ease='linear'|'smooth'|'in';
export type Kind='move'|'rotate'|'scale'|'fade';
export type Step={id:number;kind:Kind;duration:number};
export type Track={id:number;start:number;duration:number;ease:Ease};
export const finite=(v:number,fallback=0)=>Number.isFinite(v)?v:fallback;
export const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,finite(v,min)));
export function progress(time:number,start:number,duration:number){return clamp((finite(time)-finite(start))/Math.max(1,finite(duration,1)));}
export function easeAt(p:number,e:Ease){p=clamp(p);return e==='smooth'?p*p*(3-2*p):e==='in'?p*p:p;}
export function sequence(steps:Step[]){let start=0;return steps.map(s=>{const duration=clamp(s.duration,100,4000),result={...s,start,duration,end:start+duration};start+=duration;return result;});}
export function sequencePose(steps:Step[],time:number){const pose={x:0,angle:0,scale:1,opacity:1};for(const s of sequence(steps)){const p=progress(time,s.start,s.duration);if(s.kind==='move')pose.x+=80*p;if(s.kind==='rotate')pose.angle+=90*p;if(s.kind==='scale')pose.scale*=1+.3*p;if(s.kind==='fade')pose.opacity*=1-.6*p;}return pose;}
export function stagger(count:number,gap:number,reverse:boolean,simultaneous:boolean){count=Math.round(clamp(count,2,8));return Array.from({length:count},(_,id)=>({id,start:simultaneous?0:(reverse?count-1-id:id)*clamp(gap,0,800),duration:600}));}
export function totalDuration(tracks:{start:number;duration:number}[]){return Math.max(0,...tracks.map(t=>finite(t.start)+Math.max(0,finite(t.duration))));}
export function trackState(time:number,t:{start:number;duration:number},started:boolean,cancelled:boolean,paused=false){return cancelled?'cancelled':!started||time<t.start?'waiting':time>=t.start+t.duration?'completed':paused?'paused':'running';}
