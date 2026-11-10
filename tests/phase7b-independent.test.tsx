// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import FirstWorks from '../app/components/small-motion-ii/FirstWorks';

let mediaListener=()=>{};let reduce=false;let time=0,serial=0;const frames=new Map<number,FrameRequestCallback>();
beforeEach(()=>{time=0;reduce=false;frames.clear();vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++serial,cb);return serial;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));vi.stubGlobal('matchMedia',()=>({get matches(){return reduce;},addEventListener:(_e:string,cb:()=>void)=>{mediaListener=cb;},removeEventListener:vi.fn()}));vi.stubGlobal('IntersectionObserver',class{constructor(private cb:(es:{isIntersecting:boolean}[])=>void){}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}});vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){const i=Number(this.id.split('-').at(-1));return {left:Number.isFinite(i)?i*90:0,width:this.getAttribute('role')==='tab'?90:270,top:0,height:50,right:270,bottom:50,x:0,y:0,toJSON(){}};});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const advance=(ms:number)=>act(()=>{for(let t=0;t<ms;t+=16){time+=16;const list=[...frames.values()];frames.clear();list.forEach(cb=>cb(time));}});

it('independent: cancelled draw cannot be revived by resume',()=>{render(<FirstWorks id="success-draw"/>);fireEvent.click(screen.getByText('成功を模擬'));advance(240);fireEvent.click(screen.getByText('取消'));expect(screen.getByTestId('success-draw').dataset.state).toBe('cancelled');fireEvent.click(screen.getByText('再開'));advance(1500);expect(screen.getByTestId('success-draw').dataset.state).toBe('cancelled');});
it('independent: toggling reduced motion off does not rewind a completed spring',()=>{render(<FirstWorks id="spring-toggle"/>);fireEvent.click(screen.getByRole('switch'));advance(160);act(()=>{reduce=true;mediaListener();});expect(screen.getByTestId('spring-toggle').dataset.position).toBe('1');act(()=>{reduce=false;mediaListener();});expect(screen.getByTestId('spring-toggle').dataset.position).toBe('1');});
it('independent: completed draw remains final after motion preference changes',()=>{render(<FirstWorks id="success-draw"/>);fireEvent.click(screen.getByText('失敗を模擬'));advance(240);act(()=>{reduce=true;mediaListener();});expect(screen.getByTestId('success-draw').dataset.state).toBe('failure');act(()=>{reduce=false;mediaListener();});expect(screen.getByTestId('success-draw').dataset.state).toBe('failure');});

it('independent: batched pointer move and release commit the latest destination without a render',async()=>{
 const {default:SecondWorks}=await import('../app/components/small-motion-ii/SecondWorks');
 render(<SecondWorks id="drag-settle"/>);const button=screen.getByRole('button',{name:'Aを移動'});button.setPointerCapture=vi.fn();
 act(()=>{for(const [type,y] of [['pointerdown',100],['pointermove',200],['pointerup',200]] as const){const event=new Event(type,{bubbles:true});Object.assign(event,{button:0,clientY:y,pointerId:4});button.dispatchEvent(event);}});
 expect(screen.getByText('B → C → A')).toBeTruthy();
});
