// @vitest-environment jsdom
import React from 'react';
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import SecondWorks from '../app/components/small-motion-ii/SecondWorks';
let frames=new Map<number,FrameRequestCallback>(),serial=0,time=0,reduced=false;let mediaChange:()=>void;
beforeEach(()=>{frames=new Map();serial=0;time=0;reduced=false;vi.stubGlobal('matchMedia',()=>({get matches(){return reduced;},addEventListener(_e:string,cb:()=>void){mediaChange=cb;},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{constructor(private cb:(v:{isIntersecting:boolean}[])=>void){}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}});vi.stubGlobal('ResizeObserver',class{constructor(private cb:(v:{contentRect:{width:number}}[])=>void){}observe(){this.cb([{contentRect:{width:300}}]);}disconnect(){}});vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++serial,cb);return serial;});vi.stubGlobal('cancelAnimationFrame',(i:number)=>frames.delete(i));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const advance=(ms:number)=>act(()=>{for(let i=0;i<ms;i+=20){time+=20;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));}});
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
it('adversarial reduced-motion change mid-expansion preserves the selected final state',()=>{render(<SecondWorks id="expanding-card"/>);click('カードを開く');advance(240);expect(Number(screen.getByTestId('motion-ii').dataset.progress)).toBeLessThan(1);act(()=>{reduced=true;mediaChange();});expect(screen.getByTestId('motion-ii').dataset.progress).toBe('1');expect(screen.getByRole('button',{name:'カードを閉じる'}).getAttribute('aria-expanded')).toBe('true');expect(frames.size).toBe(0);});
it('adversarial reorder during settling retains the rendered position at retarget time',()=>{render(<SecondWorks id="drag-settle"/>);click('Aを下へ');advance(240);const item=screen.getByRole('button',{name:'Bを移動'}).parentElement!;const before=item.style.transform;click('Bを下へ');expect(item.style.transform).toBe(before);});
it('cancelled simulated load cannot silently become success merely by resuming a cancelled job',()=>{render(<SecondWorks id="skeleton-reveal"/>);click('再実行');advance(240);click('取消');click('再開');advance(3000);expect(screen.getByTestId('motion-ii').dataset.state).toBe('取消');});
