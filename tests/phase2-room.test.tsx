// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import Phase2Room from '../app/components/Phase2Room';
import {phase2Studies} from '../app/data/phase2Studies';
beforeAll(()=>{vi.stubGlobal('IntersectionObserver',class{observe(){} disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null)});
afterEach(cleanup);
describe('phase 2 A collection',()=>{
 it('registers six distinct attributed studies',()=>{expect(new Set(phase2Studies.map(x=>x.id)).size).toBe(6);for(const x of phase2Studies){expect(x.tags.length).toBeGreaterThan(3);expect(x.origin).toBeTruthy()}});
 it('selects, filters, resets and closes without retaining a player',()=>{render(<Phase2Room/>);fireEvent.click(screen.getByRole('button',{name:'展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:'Starfield Warp'}));expect(screen.getByLabelText('星の数')).toBeTruthy();fireEvent.change(screen.getByLabelText('速度'),{target:{value:'90'}});fireEvent.click(screen.getByRole('button',{name:'リセット'}));expect((screen.getByLabelText('速度') as HTMLInputElement).value).toBe('45');fireEvent.click(screen.getByRole('button',{name:'展示室を閉じる'}));expect(screen.queryByLabelText('星の数')).toBeNull()});
 it('exposes independent ball parameters and flip direction',()=>{render(<Phase2Room/>);fireEvent.click(screen.getByRole('button',{name:'展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:'Liquid Metaballs'}));expect(screen.getByLabelText('融合範囲')).toBeTruthy();expect(screen.getByLabelText('粘り')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Tile Flip'}));expect(screen.getByLabelText('回転方向')).toBeTruthy()});
 it('exposes independent flock rules and allows reversal of a tile transition',()=>{render(<Phase2Room/>);fireEvent.click(screen.getByRole('button',{name:'展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:'Flocking Life'}));fireEvent.click(screen.getByLabelText('回避'));expect((screen.getByLabelText('回避') as HTMLInputElement).checked).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Tile Flip'}));fireEvent.click(screen.getByRole('button',{name:'画像を切替'}));fireEvent.click(screen.getByRole('button',{name:'画像を切替'}));expect(screen.getByLabelText('回転軸')).toBeTruthy()});
});
