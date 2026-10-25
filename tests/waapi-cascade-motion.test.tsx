// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initialGems, exchangeGems, findMatches } from '../app/components/waapi-board-state';
import { ExpandedGamePreview } from '../app/components/WaapiExpandedPreviews';
import { waapiSamples } from '../app/data/waapiSamples';
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(HTMLElement.prototype,'animate',{configurable:true,value:vi.fn(()=>({cancel:vi.fn()}))}); });
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
it('initial board has no match and permits a real two-stage cascade',()=>{
 expect(findMatches(initialGems)).toEqual([]);
 const outcomes=initialGems.flatMap((_,a)=>initialGems.map((_,b)=>exchangeGems(initialGems,a,b)));
 expect(outcomes.some(x=>x.chains>=2)).toBe(true);
});
it.each(['line-clear','lockon','equip'])('%s cancels live animations when reduced motion turns on',kind=>{
 const sample=waapiSamples.find(s=>s.render===kind)!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);
 fireEvent.click(r.getByText(kind==='line-clear'?'DROP':kind==='lockon'?'NEXT TARGET':'EQUIP'));
 const animations=vi.mocked(HTMLElement.prototype.animate).mock.results.map(x=>x.value);
 expect(animations.length).toBeGreaterThan(0);
 const text=r.container.textContent;
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion/>);
 expect(animations.every(a=>a.cancel.mock.calls.length)).toBe(true);
 expect(r.container.textContent).toBe(text);
});
it('candidate cascade removes five then three, with exact fall positions and no refill',()=>{
 const result=exchangeGems(initialGems,8,11);
 expect(result.chains).toBe(2); expect(result.steps.map(s=>s.matched.length)).toEqual([5,3]);
 expect(result.removed*100).toBe(800);
 expect(result.steps[0].after).toEqual([null,null,null,'◆','◆',null,'◆','◆',null,'◆','●','◆']);
 expect(result.board).toEqual([null,null,null,null,'◆',null,null,'◆',null,null,'●','◆']);
 expect(result.frames.map(f=>f.map(t=>t?.gem??null))).toEqual([initialGems,result.steps[0].before,result.steps[0].cleared,result.steps[0].after,result.steps[1].cleared,result.steps[1].after]);
 expect(initialGems.filter(Boolean)).toHaveLength(12);
});
it('general matching counts intersecting rows and columns once and rejects empty/out of range input',()=>{
 const x=exchangeGems(initialGems,8,11);
 expect(x.steps[0].matched).toHaveLength(new Set(x.steps[0].matched).size);
 for(const [a,b] of [[0,1],[2,3],[0,4],[-1,0],[12,11]]) expect(exchangeGems(initialGems,a,b).removed).toBe(0);
 expect(exchangeGems(x.board,0,1).board).toBe(x.board);
 expect(exchangeGems(x.board,0,1).removed).toBe(0);
});
it('cascade replay uses per-token trace, no fill or delayed state writes, reset cancels all',()=>{
 const sample=waapiSamples.find(s=>s.render==='match3')!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);
 const cells=()=>r.container.querySelectorAll<HTMLButtonElement>('.matchBoard button');
 const initial=Array.from(cells(),c=>c.textContent);
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){const i=Array.from(this.parentElement?.children??[]).indexOf(this);return {left:i%3*41,top:Math.floor(i/3)*41,width:36,height:36,right:0,bottom:0,x:0,y:0,toJSON(){return {}}};});
 for(let trial=0;trial<2;trial++) {
  fireEvent.click(cells()[8]);fireEvent.click(cells()[11]);fireEvent.click(r.getByText('SWAP'));
  expect(r.container.querySelector('output')!.textContent).toContain('CASCADE ×2');
  expect(r.container.querySelector('output')!.textContent).toContain('SCORE 800');
  expect(r.container.querySelector('.matchSteps')!.textContent).toContain('1段目 5石 → 2段目 3石');
  const calls=vi.mocked(HTMLElement.prototype.animate).mock.calls;
  expect(calls.every(c=>!(c[1] as KeyframeAnimationOptions).fill)).toBe(true);
  const tracks=calls.filter(c=>(c[0] as Keyframe[]).length===6).map(c=>c[0] as Keyframe[]);
  expect(tracks).toHaveLength(12*(trial+1));
  expect(tracks.some(f=>f[0].transform!==f[1].transform)).toBe(true);
  expect(tracks.some(f=>f[2].transform!==f[3].transform)).toBe(true);
  expect(tracks.filter(f=>f.at(-1)!.opacity===0).length).toBe(8*(trial+1));
  fireEvent.click(r.getByText('RESET'));vi.runAllTimers();
  expect(Array.from(cells(),c=>c.textContent)).toEqual(initial);
  expect(r.container.querySelector('output')!.textContent).toContain('SCORE 0');
  expect(vi.mocked(HTMLElement.prototype.animate).mock.results.every(x=>x.value.cancel.mock.calls.length)).toBe(true);
 }
});
it.each(['match3','line-clear','lockon','equip'])('%s retains state across on/off, visibility, reset and unmount',kind=>{
 const sample=waapiSamples.find(s=>s.render===kind)!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);
 const play=()=>{if(kind==='match3'){const c=r.container.querySelectorAll('.matchBoard button');fireEvent.click(c[8]);fireEvent.click(c[11]);}fireEvent.click(r.getByText(kind==='match3'?'SWAP':kind==='line-clear'?'DROP':kind==='lockon'?'NEXT TARGET':'EQUIP'));};
 const reset=()=>fireEvent.click(r.getByText(kind==='equip'?'UNEQUIP':'RESET'));
 play();const text=r.container.textContent;
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion/>);
 expect(vi.mocked(HTMLElement.prototype.animate).mock.results.every(x=>x.value.cancel.mock.calls.length)).toBe(true);
 expect(r.container.textContent).toBe(text);
 const count=vi.mocked(HTMLElement.prototype.animate).mock.calls.length;
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);
 expect(vi.mocked(HTMLElement.prototype.animate).mock.calls.length).toBe(count);
 reset();play();expect(vi.mocked(HTMLElement.prototype.animate).mock.calls.length).toBeGreaterThan(count);
 const nextText=r.container.textContent;
 r.rerender(<ExpandedGamePreview sample={sample} active={false} reducedMotion={false}/>);
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);
 expect(r.container.textContent).toBe(nextText);
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion/>);reset();vi.runAllTimers();
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);play();r.unmount();
 expect(vi.mocked(HTMLElement.prototype.animate).mock.results.every(x=>x.value.cancel.mock.calls.length)).toBe(true);
 expect(vi.getTimerCount()).toBe(0);
});
it.each(['pointer','focus','drag'])('new %s input cancels replay before using final cells',method=>{
 const sample=waapiSamples.find(s=>s.render==='match3')!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false}/>);
 const c=r.container.querySelectorAll('.matchBoard button');fireEvent.click(c[8]);fireEvent.click(c[11]);fireEvent.click(r.getByText('SWAP'));
 const animations=vi.mocked(HTMLElement.prototype.animate).mock.results.map(x=>x.value);
 expect(animations.some(a=>!a.cancel.mock.calls.length)).toBe(true);
 if(method==='pointer')fireEvent.pointerDown(c[10]);else if(method==='focus')fireEvent.focus(c[10]);else fireEvent.dragStart(c[10]);
 expect(animations.every(a=>a.cancel.mock.calls.length)).toBe(true);
 expect(r.container.querySelector('output')!.textContent).toContain('SCORE 800');
 expect(c[10].textContent).toBe('●');expect(c[11].textContent).toBe('◆');
});
