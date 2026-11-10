// @vitest-environment jsdom
import React from 'react';
import {describe,it,expect,beforeEach,afterEach,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import SecondWorks from '../app/components/small-motion-ii/SecondWorks';
import {bounded,ease,cardRect,reorder,revealState} from '../app/components/small-motion-ii/second-model';
import {museumCatalog,museumTotal,museumRooms} from '../app/data/museumClassification';
let frames=new Map<number,FrameRequestCallback>(),n=0,t=0;
beforeEach(()=>{frames=new Map();n=0;t=0;vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{constructor(private cb:(v:{isIntersecting:boolean}[])=>void){}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}});vi.stubGlobal('ResizeObserver',class{constructor(private cb:(v:{contentRect:{width:number}}[])=>void){}observe(){this.cb([{contentRect:{width:300}}]);}disconnect(){}});vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++n,cb);return n;});vi.stubGlobal('cancelAnimationFrame',(i:number)=>frames.delete(i));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const advance=(ms:number)=>act(()=>{for(let i=0;i<ms;i+=20){t+=20;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(t));}});
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
describe('phase7b deterministic geometry and state',()=>{
 it('preserves registry and adds exactly six',()=>{expect(museumTotal).toBe(286);expect(museumRooms).toHaveLength(13);expect(museumCatalog.filter(x=>x.collection==='Small Motion Collection II')).toHaveLength(6);expect(new Set(museumCatalog.map(x=>x.key)).size).toBe(286);});
 it('uses exact rect endpoints and smooth interpolation',()=>{expect(cardRect(0,300)).toEqual({x:12,y:18,width:160,height:100});expect(cardRect(1,300)).toEqual({x:0,y:0,width:300,height:190});expect(ease(.5)).toBe(.5);expect(bounded(NaN)).toBe(0);});
 it('reorders without mutation and rejects invalid indices',()=>{const a=['A','B','C'];expect(reorder(a,0,2)).toEqual(['B','C','A']);expect(a).toEqual(['A','B','C']);expect(reorder(a,-1,2)).toEqual(a);});
 it('result boundary is independent of animation completion',()=>{expect(revealState(.649,'failure')).toBe('loading');expect(revealState(.65,'failure')).toBe('failure');expect(revealState(1,'failure')).not.toBe('success');});
 for(const id of ['expanding-card','drag-settle','skeleton-reveal'] as const)it(`${id} pauses, cancels stale frames, resets and unmounts`,()=>{const view=render(<SecondWorks id={id}/>);click('再実行');advance(200);const stage=screen.getByTestId('motion-ii');expect(Number(stage.dataset.progress)).toBeGreaterThan(0);click('一時停止');const p=stage.dataset.progress;advance(400);expect(stage.dataset.progress).toBe(p);click('再開');advance(80);const stale=[...frames.values()];click('リセット');act(()=>stale.forEach(fn=>fn(9999)));expect(stage.dataset.progress).toBe('0');click('再実行');advance(100);click('取消');advance(3000);expect(stage.dataset.state).toBe('取消');view.unmount();expect(frames.size).toBe(0);});
 it('card reverses without jumping and returns focus',()=>{render(<SecondWorks id="expanding-card"/>);click('カードを開く');advance(300);const p=Number(screen.getByTestId('motion-ii').dataset.progress);click('カードを閉じる');expect(Number(screen.getByTestId('motion-ii').dataset.progress)).toBe(p);advance(1000);expect(screen.getByTestId('motion-ii').dataset.progress).toBe('0');expect(document.activeElement?.textContent).toBe('カードを開く');});
 it('keyboard ordering and cancellation preserve committed data',()=>{render(<SecondWorks id="drag-settle"/>);fireEvent.keyDown(screen.getByRole('button',{name:'Aを移動'}),{key:'ArrowDown'});expect(screen.getByText('B → A → C')).toBeTruthy();click('取消');expect(screen.getByText('B → A → C')).toBeTruthy();click('リセット');expect(screen.getByText('A → B → C')).toBeTruthy();});
 it('fault oracles reject wrong interpolation, reorder and result',()=>{expect(()=>expect(1).toBe(ease(.5))).toThrow();expect(()=>expect(['A','B','C']).toEqual(reorder(['A','B','C'],0,2))).toThrow();expect(()=>expect('success').toBe(revealState(.1,'success'))).toThrow();});
});
