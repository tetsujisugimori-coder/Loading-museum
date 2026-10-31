// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useExhibitClock} from '../app/components/practical/runtime';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('clock preserves phase on pause, stops offscreen/hidden/reduced, resets and cleans up',()=>{
 let intersection:(entries:{isIntersecting:boolean}[])=>void=()=>{};let mediaChange=()=>{};const media={matches:false,addEventListener:(_n:string,f:()=>void)=>{mediaChange=f},removeEventListener:vi.fn()};const disconnect=vi.fn();const frames=new Map<number,FrameRequestCallback>();let seq=0;
 vi.stubGlobal('IntersectionObserver',class{constructor(fn:typeof intersection){intersection=fn}observe(){}disconnect=disconnect});vi.stubGlobal('matchMedia',()=>media);vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++seq,fn);return seq});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 const tick=(stamp:number)=>act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(stamp))});
 const {result,rerender,unmount}=renderHook(({playing,key})=>useExhibitClock(playing,1,key),{initialProps:{playing:true,key:0}});
 act(()=>intersection([{isIntersecting:true}]));tick(100);tick(200);expect(result.current.time).toBe(100);rerender({playing:false,key:0});expect(frames.size).toBe(0);expect(result.current.time).toBe(100);
 rerender({playing:true,key:0});tick(300);tick(320);expect(result.current.time).toBe(120);
 act(()=>intersection([{isIntersecting:false}]));expect(frames.size).toBe(0);act(()=>intersection([{isIntersecting:true}]));expect(frames.size).toBe(1);
 act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});expect(frames.size).toBe(0);
 act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));media.matches=true;mediaChange()});expect(frames.size).toBe(0);
 act(()=>{media.matches=false;mediaChange()});rerender({playing:false,key:1});expect(result.current.time).toBe(0);unmount();expect(frames.size).toBe(0);expect(disconnect).toHaveBeenCalledOnce();expect(media.removeEventListener).toHaveBeenCalledOnce();
});
