'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
/** Foreground simulation clock. Generation invalidation rejects already queued frames. */
export function useMotionClock(){
 const root=useRef<HTMLDivElement>(null), epoch=useRef(0), elapsed=useRef(0), activity=useRef({visible:false,tab:true,reduced:false});
 const [time,setTime]=useState(0),[running,setRunning]=useState(false),[visible,setVisible]=useState(false),[tab,setTab]=useState(true),[reduced,setReduced]=useState(false),[speed,setSpeed]=useState(1),[run,setRun]=useState(0);
 const invalidate=useCallback(()=>{epoch.current++;},[]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{if(activity.current.reduced!==media.matches)epoch.current++;activity.current.reduced=media.matches;setReduced(media.matches);};const visibility=()=>{const next=document.visibilityState==='visible';if(activity.current.tab!==next)epoch.current++;activity.current.tab=next;setTab(next);};change();visibility();media.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);const o=new IntersectionObserver(es=>{const next=es.some(e=>e.isIntersecting);if(activity.current.visible!==next)epoch.current++;activity.current.visible=next;setVisible(next);});if(root.current)o.observe(root.current);return()=>{invalidate();o.disconnect();media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};},[invalidate]);
 useEffect(()=>{if(!running||!visible||!tab||reduced)return;const generation=++epoch.current;let previous:number|undefined,frame=0;const tick=(now:number)=>{if(generation!==epoch.current)return;if(previous!==undefined){elapsed.current+=Math.max(0,now-previous)*speed;setTime(elapsed.current);}previous=now;frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>{invalidate();cancelAnimationFrame(frame);};},[running,visible,tab,reduced,speed,run,invalidate]);
 const start=useCallback(()=>{epoch.current++;elapsed.current=0;setTime(0);setRunning(true);setRun(n=>n+1);},[]);
 const stop=useCallback(()=>{epoch.current++;setRunning(false);},[]);
 const reset=useCallback(()=>{stop();elapsed.current=0;setTime(0);},[stop]);
 return {root,time,running,active:running&&visible&&tab&&!reduced,reduced,speed,setSpeed,start,stop,reset,resume:()=>{epoch.current++;setRunning(true);setRun(n=>n+1);}};
}
