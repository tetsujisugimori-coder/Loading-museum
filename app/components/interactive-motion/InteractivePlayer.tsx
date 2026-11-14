'use client';
import {useEffect,useRef,useState} from 'react';
import type {InteractiveMotionId} from '../../data/interactiveMotionExhibits';
import {PressRelease,HoldConfirm,SwipeDismiss} from './GestureExhibits';
import {MagneticAttraction,FocusHalo,StatusMorph} from './ReactiveExhibits';
export default function InteractivePlayer({id}:{id:InteractiveMotionId}){
 const root=useRef<HTMLDivElement>(null);const [visible,setVisible]=useState(true),[onscreen,setOnscreen]=useState(true),[reduced,setReduced]=useState(false);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches),hidden=()=>setVisible(!document.hidden);change();hidden();media.addEventListener('change',change);document.addEventListener('visibilitychange',hidden);const observer=new IntersectionObserver(entries=>setOnscreen(entries.some(e=>e.isIntersecting)));if(root.current)observer.observe(root.current);return()=>{observer.disconnect();media.removeEventListener('change',change);document.removeEventListener('visibilitychange',hidden);};},[]);
 const props={active:visible&&onscreen,reduced};
 return <div ref={root} data-interactive-player={id} data-active={props.active} data-reduced={reduced}>{id==='press-release'?<PressRelease {...props}/>:id==='hold-confirm'?<HoldConfirm {...props}/>:id==='swipe-dismiss'?<SwipeDismiss {...props}/>:id==='magnetic-attraction'?<MagneticAttraction {...props}/>:id==='focus-halo'?<FocusHalo {...props}/>:<StatusMorph {...props}/>}</div>;
}
