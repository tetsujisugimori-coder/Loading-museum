// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {FlashSpecialExhibitRoom} from '../app/components/FlashSpecialExhibitRoom';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('visible new study remains operable after a stale false observer entry and stops outside the viewport',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
  Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
  const callbacks: (()=>void)[]=[];
  vi.stubGlobal('IntersectionObserver',class {callback:()=>void;constructor(callback:(entries:unknown[])=>void){this.callback=()=>callback([{isIntersecting:false}]);callbacks.push(this.callback);}observe(){this.callback();}disconnect(){}});
  const bounds=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({top:20,bottom:600,left:20,right:320,width:300,height:580,x:20,y:20,toJSON(){}});
  const view=render(<FlashSpecialExhibitRoom/>);fireEvent.click(view.container.querySelector('.flashRoomEntrance')!);fireEvent.click(view.container.querySelectorAll('.flashCategoryNav button')[2]);fireEvent.click(screen.getByRole('button',{name:'両方を開始',exact:true}));
  const card=view.container.querySelector('[data-study=tn-vector-morph]')!;expect(card.getAttribute('data-playing')).toBe('true');
  act(()=>callbacks.forEach(callback=>callback()));expect(card.getAttribute('data-playing')).toBe('true');
  bounds.mockReturnValue({top:1200,bottom:1780,left:20,right:320,width:300,height:580,x:20,y:1200,toJSON(){}});fireEvent.scroll(window);expect(card.getAttribute('data-playing')).toBe('false');
  bounds.mockReturnValue({top:20,bottom:600,left:20,right:320,width:300,height:580,x:20,y:20,toJSON(){}});fireEvent.resize(window);expect(card.getAttribute('data-playing')).toBe('true');
});
