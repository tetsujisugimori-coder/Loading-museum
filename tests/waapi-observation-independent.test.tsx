// @vitest-environment jsdom
// Independent reviewer contracts. WAAPI double, not a native-browser claim.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WaapiGameObservation } from '../app/components/WaapiGameObservation';
import { waapiSamples } from '../app/data/waapiSamples';
const coin = waapiSamples.find(s => s.render === 'coin')!;
let a: { currentTime: number | null; playState: AnimationPlayState; pending: boolean; pause: () => void; play: () => void; cancel: () => void };
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'hidden', {configurable:true,value:false});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (f:FrameRequestCallback) => window.setTimeout(() => f(Date.now()),16));
  vi.stubGlobal('cancelAnimationFrame', (id:number) => clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype,'animate',{configurable:true,value:vi.fn(() => {
    a = {currentTime:0,playState:'running',pending:false,pause(){a.playState='paused';},play(){a.playState='running';},cancel(){a.playState='idle';}};
    return a;
  })});
});
afterEach(() => {cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
it.each([['1ステップ進む',1],['1ステップ戻る',-1]] as const)('running %s samples the current native time, not the previous rendered frame', (label,direction) => {
  render(<WaapiGameObservation sample={coin} active reducedMotion={false}/>);
  fireEvent.click(screen.getByRole('button',{name:'再生 / 再開'}));
  a.currentTime=64;act(()=>vi.advanceTimersByTime(16));
  // The native animation advances between rendered RAF and input delivery.
  a.currentTime=73;
  fireEvent.click(screen.getByRole('button',{name:label}));
  expect(a.currentTime).toBeCloseTo(73+direction*1000/60,8);
  expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBeCloseTo(a.currentTime,8);
  expect(a.playState).toBe('paused');
});
it('pause samples the native currentTime between frames without rewinding',()=>{
 render(<WaapiGameObservation sample={coin} active reducedMotion={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'再生 / 再開'}));a.currentTime=73;
 fireEvent.click(screen.getByRole('button',{name:'一時停止'}));
 expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(73);
});

it('labels native overshoot separately from the bounded observation position',()=>{
 const menu=waapiSamples.find(s=>s.render==='menu')!;
 render(<WaapiGameObservation sample={menu} active reducedMotion={false}/>);
 a.currentTime=224;
 fireEvent.click(screen.getByRole('button',{name:'一時停止'}));
 expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(220);
 expect(screen.getByText(/native currentTime: 224.00 ms/)).toBeTruthy();
 expect(document.querySelector('[data-observation-reading]')?.textContent).toContain('観察位置');
});
it('represents unresolved native time explicitly instead of claiming zero',()=>{
 render(<WaapiGameObservation sample={coin} active reducedMotion={false}/>);
 a.currentTime=null;
 fireEvent.click(screen.getByRole('button',{name:'一時停止'}));
 expect(screen.getByText(/native currentTime: 未取得/)).toBeTruthy();
});

it('pause pins the native time captured at input even when pause processing advances the native clock',()=>{
 render(<WaapiGameObservation sample={coin} active reducedMotion={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'再生 / 再開'}));
 a.currentTime=73;
 a.pause=()=>{a.currentTime=120;a.playState='paused';};
 fireEvent.click(screen.getByRole('button',{name:'一時停止'}));
 expect(a.currentTime).toBe(73);
 expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(73);
});
it('steps backward from the bounded end position when native time overshoots duration',()=>{
 const menu=waapiSamples.find(s=>s.render==='menu')!;
 render(<WaapiGameObservation sample={menu} active reducedMotion={false}/>);
 a.currentTime=224;
 fireEvent.click(screen.getByRole('button',{name:'一時停止'}));
 expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(220);
 fireEvent.click(screen.getByRole('button',{name:'1ステップ戻る'}));
 expect(a.currentTime).toBeCloseTo(220-1000/60,8);
 expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBeCloseTo(220-1000/60,8);
});
