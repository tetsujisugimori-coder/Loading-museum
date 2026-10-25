// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WaapiSampleGallery } from '../app/components/WaapiSampleGallery';
let intersections: Array<{ callback: IntersectionObserverCallback; target: Element }>;
let finish: Array<() => void>;
beforeEach(() => {
 intersections=[]; finish=[]; vi.useFakeTimers();
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{constructor(private callback:IntersectionObserverCallback){} observe(target:Element){intersections.push({callback:this.callback,target});this.callback([{target,isIntersecting:true} as IntersectionObserverEntry],this as unknown as IntersectionObserver);} disconnect(){}});
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>window.setTimeout(()=>f(0),16));
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>window.clearTimeout(id));
 Object.defineProperty(HTMLElement.prototype,'animate',{configurable:true,value:vi.fn(()=>({cancel:vi.fn(),finished:new Promise<void>(resolve=>finish.push(resolve)),playState:'running'}))});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
function open(name:string){render(<WaapiSampleGallery/>);fireEvent.click(screen.getByRole('button',{name:/サンプル一覧を見る/}));fireEvent.change(screen.getByLabelText('検索'),{target:{value:name}});const card=screen.getByText(name).closest('article')!;act(()=>vi.advanceTimersByTime(20));return {card,c:within(card)};}
function visible(card:Element,value:boolean){const e=intersections.findLast(x=>x.target===card.parentElement)!;act(()=>e.callback([{target:e.target,isIntersecting:value} as IntersectionObserverEntry],{} as IntersectionObserver));act(()=>vi.advanceTimersByTime(20));}
async function complete(){await act(async()=>{finish.splice(0).forEach(f=>f());await Promise.resolve();});}
it('Menu cursor belongs to the current row for buttons, keyboard, limits and Reset',()=>{
 const {card,c}=open('Menu Selection Cursor');
 const check=(label:string)=>{const row=card.querySelector('.gameMenu .isSelected')!;expect(row.textContent).toContain(label);expect(row.querySelector('i')).not.toBeNull();expect(row.getAttribute('aria-current')).toBe('true');expect(card.querySelectorAll('.gameMenu i')).toHaveLength(1);};
 check('CONTINUE');fireEvent.click(c.getByRole('button',{name:'↓ Down'}));check('COLLECTION');fireEvent.keyDown(card.querySelector('.waapiPreviewStage')!,{key:'ArrowDown'});check('SETTINGS');fireEvent.keyDown(card.querySelector('.waapiPreviewStage')!,{key:'ArrowDown'});check('SETTINGS');fireEvent.click(c.getByRole('button',{name:'Reset'}));check('CONTINUE');
});
it('Coin entry, Replay and re-entry never grant points, including late completion after Reset',async()=>{
 const {card,c}=open('Coin Pickup Arc');await complete();expect(card.querySelector('output')!.textContent).toBe('SCORE 0');
 fireEvent.click(c.getByRole('button',{name:'Replay'}));fireEvent.click(c.getByRole('button',{name:'Reset'}));await complete();visible(card,false);visible(card,true);await complete();expect(card.querySelector('output')!.textContent).toBe('SCORE 0');
});
it('Coin explicit COLLECT awards once per Reset and rapid input cannot duplicate it',async()=>{
 const {card,c}=open('Coin Pickup Arc');const collect=c.getByRole('button',{name:'COLLECT'});
 fireEvent.click(collect);fireEvent.click(collect);expect(card.querySelector('output')!.textContent).toBe('SCORE 100');expect((collect as HTMLButtonElement).disabled).toBe(true);await complete();expect(card.querySelector('output')!.textContent).toBe('SCORE 100');
 visible(card,false);visible(card,true);await complete();expect(card.querySelector('output')!.textContent).toBe('SCORE 100');fireEvent.click(c.getByRole('button',{name:'Reset'}));fireEvent.click(collect);expect(card.querySelector('output')!.textContent).toBe('SCORE 100');
});
it('Coin has an explicit explanation separating demonstration, award and Reset',()=>{
 const {card}=open('Coin Pickup Arc');expect(card.textContent).toContain('自動デモ');expect(card.textContent).toContain('加点しません');expect(card.textContent).toContain('1回');
});

it('Menu detail metadata describes actual no-fill decoration rather than generic sample defaults', () => {
 const {c:controls,card}=open('Menu Selection Cursor');
 fireEvent.click(controls.getByRole('button',{name:'コードと解説を見る'}));
 expect(card.querySelector('.waapiCodePanel')!.textContent).toContain('220ms（装飾演出）');
 expect(card.querySelector('.waapiCodePanel')!.textContent).toContain('1 / none');
});
