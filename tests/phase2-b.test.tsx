// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import Phase2Room from '../app/components/Phase2Room';
import {phase2BStudies} from '../app/data/phase2BStudies';
beforeAll(()=>{vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null)});
afterEach(cleanup);
describe('phase 2 B collection',()=>{
 it('registers six distinct studies',()=>{expect(new Set(phase2BStudies.map(x=>x.id)).size).toBe(6);expect(phase2BStudies.every(x=>x.tags.length>=5&&x.origin)).toBe(true)});
 it('allows elastic controls to reset and closes the player',()=>{render(<Phase2Room/>);fireEvent.click(screen.getByRole('button',{name:'展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:'Elastic Space'}));fireEvent.change(screen.getByLabelText('弾力'),{target:{value:'90'}});fireEvent.click(screen.getByRole('button',{name:'リセット'}));expect((screen.getByLabelText('弾力') as HTMLInputElement).value).toBe('50');fireEvent.click(screen.getByRole('button',{name:'展示室を閉じる'}));expect(screen.queryByLabelText('弾力')).toBeNull()});
 it('restores all glitch effects and can be reset',()=>{render(<Phase2Room/>);fireEvent.click(screen.getByRole('button',{name:'展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:'Glitch Laboratory'}));fireEvent.click(screen.getByRole('button',{name:'元画像へ復元'}));expect((screen.getByLabelText('RGB分離') as HTMLInputElement).checked).toBe(false);fireEvent.click(screen.getByRole('button',{name:'リセット'}));expect((screen.getByLabelText('RGB分離') as HTMLInputElement).checked).toBe(true)});
});
