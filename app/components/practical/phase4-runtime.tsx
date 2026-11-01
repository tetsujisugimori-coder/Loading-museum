"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function usePhase4Runtime(playing: boolean, timed: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => setReduced(media.matches);
    const visibility = () => setPage(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (stage.current) observer.observe(stage.current);
    preference(); visibility();
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    return () => {observer.disconnect(); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility);};
  }, []);
  const active = playing && visible && page;
  useEffect(() => {
    if (!active || !timed) return;
    let valid = true, previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), delta = Math.max(0, now - previous); previous = now;
      if (valid) setElapsed(value => value + delta);
    }, 100);
    return () => {valid = false; clearInterval(timer);};
  }, [active, timed]);
  return {stage, elapsed, active, reduced};
}

// FLIP for retained rows, finite entrance/exit for changes. All snapshots are
// relative to the container, so scrolling cannot become an artificial movement.
export function useAnimatedRows(signature: string, moving: boolean, duration: number) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(new Map<string, {top:number;left:number;width:number;height:number;clone:HTMLElement}>());
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const animations: Animation[] = [], ghosts: HTMLElement[] = [];
    let valid = true;
    const base = container.getBoundingClientRect();
    const next = new Map<string, {top:number;left:number;width:number;height:number;clone:HTMLElement}>();
    for (const node of container.querySelectorAll<HTMLElement>(':scope > [data-row]')) {
      const box = node.getBoundingClientRect(), key = node.dataset.row!;
      const current = {top:box.top-base.top,left:box.left-base.left,width:box.width,height:box.height,clone:node.cloneNode(true) as HTMLElement};
      const old = previous.current.get(key);
      if (moving && node.animate && (!old || Math.abs(old.left-current.left)>.5 || Math.abs(old.top-current.top)>.5)) animations.push(node.animate(old ? [
        {transform:`translate(${old.left-current.left}px,${old.top-current.top}px)`},{transform:'translate(0,0)'},
      ] : [{opacity:0,transform:'translateY(-12px)'},{opacity:1,transform:'translateY(0)'}], {duration,easing:'ease-out'}));
      next.set(key, current);
    }
    if (moving) for (const [key, old] of previous.current) if (!next.has(key)) {
      const ghost = old.clone;
      if (!ghost.animate) continue;
      ghost.removeAttribute('data-row'); ghost.setAttribute('aria-hidden','true'); ghost.inert = true;
      // Do not duplicate ids/ARIA associations in a decorative exit layer.
      for (const element of [ghost,...ghost.querySelectorAll<HTMLElement>('*')]) element.removeAttribute('id');
      Object.assign(ghost.style,{position:'absolute',top:`${old.top}px`,left:`${old.left}px`,width:`${old.width}px`,height:`${old.height}px`,pointerEvents:'none'});
      container.append(ghost); ghosts.push(ghost);
      if (ghost.animate) {
        const animation = ghost.animate([{opacity:1},{opacity:0,transform:'translateX(20px)'}],{duration});
        animation.onfinish = () => {if(valid) ghost.remove();}; animations.push(animation);
      }
    }
    previous.current = next;
    return () => {valid=false;for(const a of animations){a.onfinish=null;a.cancel();}for(const ghost of ghosts)ghost.remove();};
  }, [signature, moving, duration]);
  return ref;
}
