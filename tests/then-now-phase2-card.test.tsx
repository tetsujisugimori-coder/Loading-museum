// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {PhaseTwoCard} from '../app/components/then-now/PhaseTwoCard';
import {flashExhibits} from '../app/data/flashExhibits';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('solo modes retain each side state, Reset resets the pair and reduced motion reports no automatic play',()=>{
 const exhibit=flashExhibits.find(e=>e.id==='tn-mask-theatre')!;
 const view=render(<PhaseTwoCard exhibit={exhibit} active reduced speed={1}/>);
 const inputs=screen.getAllByLabelText('転換位置 %');fireEvent.change(inputs[0],{target:{value:'73'}});
 fireEvent.click(screen.getByText('Nowだけ'));expect(view.container.querySelector('[data-era=then]')?.hasAttribute('hidden')).toBe(true);
 fireEvent.click(screen.getByText('比較'));expect((screen.getAllByLabelText('転換位置 %')[0] as HTMLInputElement).value).toBe('73');
 fireEvent.click(screen.getByText('両方を開始'));expect(view.container.querySelector('[data-study]')?.getAttribute('data-playing')).toBe('false');
 fireEvent.click(screen.getByText('Reset'));expect((screen.getAllByLabelText('転換位置 %')[0] as HTMLInputElement).value).toBe('32');
 expect(screen.getByText('両方を開始')).toBeTruthy();
});
it('common pause, reduced motion, inactive and unmount cancel every bounded study clock',()=>{
 let next=0;const pending=new Set<number>();vi.stubGlobal('requestAnimationFrame',()=>{const id=++next;pending.add(id);return id;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>pending.delete(id));
 const exhibit=flashExhibits.find(e=>e.id==='tn-mask-theatre')!;
 const view=render(<PhaseTwoCard exhibit={exhibit} active reduced={false} speed={1}/>);
 fireEvent.click(screen.getByText('両方を開始'));expect(pending.size).toBe(2);
 fireEvent.click(screen.getByText('Thenだけ'));expect(pending.size).toBe(1);
 view.rerender(<PhaseTwoCard exhibit={exhibit} active={false} reduced={false} speed={1}/>);expect(pending.size).toBe(0);
 view.rerender(<PhaseTwoCard exhibit={exhibit} active reduced={false} speed={1}/>);expect(pending.size).toBe(1);
 view.rerender(<PhaseTwoCard exhibit={exhibit} active reduced speed={1}/>);expect(pending.size).toBe(0);
 view.rerender(<PhaseTwoCard exhibit={exhibit} active reduced={false} speed={1}/>);expect(pending.size).toBe(1);
 view.unmount();expect(pending.size).toBe(0);
});
it('page hidden suspends a phase-two editor without destroying its work; close still unmounts',async()=>{
 const {FlashSpecialExhibitRoom}=await import('../app/components/FlashSpecialExhibitRoom');
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
 const view=render(<FlashSpecialExhibitRoom/>);fireEvent.click(view.container.querySelector('.flashRoomEntrance')!);fireEvent.click(view.container.querySelectorAll('.flashCategoryNav button')[3]);
 fireEvent.change(screen.getAllByLabelText('転換位置 %')[0],{target:{value:'73'}});
 Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});fireEvent(document,new Event('visibilitychange'));
 expect((screen.getAllByLabelText('転換位置 %')[0] as HTMLInputElement).value).toBe('73');
 Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});fireEvent(document,new Event('visibilitychange'));
 expect((screen.getAllByLabelText('転換位置 %')[0] as HTMLInputElement).value).toBe('73');
 fireEvent.click(screen.getByRole('button',{name:'Flash特別展示室を閉じる'}));expect(screen.queryByLabelText('転換位置 %')).toBeNull();
});
