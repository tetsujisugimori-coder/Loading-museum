// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {phase5bExhibits} from '../app/data/phase5bExhibits';
import {phase5aExhibits} from '../app/data/phase5aExhibits';
import {phase4aExhibits} from '../app/data/phase4aExhibits';
import {phase4bExhibits} from '../app/data/phase4bExhibits';
import PracticalRoom from '../app/components/PracticalRoom';
beforeEach(()=>{vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}})});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('registers six unique complete exhibits without colliding with any practical ID',()=>{
 const all=[...phase4aExhibits,...phase4bExhibits,...phase5aExhibits,...phase5bExhibits];expect(all).toHaveLength(24);expect(new Set(all.map(e=>e.id)).size).toBe(24);expect(phase5bExhibits).toHaveLength(6);
 for(const e of phase5bExhibits){expect(e.source).toMatch(/^https:\/\//);expect(e.history).toContain('UNKNOWN');expect(e.replacement).toBeTruthy()}
});
for(const e of phase5bExhibits)it(`mounts, searches and closes ${e.id} without retaining hidden state`,()=>{
 render(<PracticalRoom phase={4}/>);fireEvent.click(screen.getByRole('button',{name:'部品展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:e.title}));expect(screen.getByTestId('phase5b-stage').getAttribute('data-exhibit')).toBe(e.id);expect(screen.getByRole('button',{name:'Reset'})).toBeTruthy();fireEvent.change(screen.getByLabelText('部品名・用途・技術で検索'),{target:{value:'第5期B'}});expect(within(screen.getByRole('navigation')).getAllByRole('button')).toHaveLength(6);fireEvent.click(screen.getByRole('button',{name:'閉室して一覧へ戻る'}));expect(screen.queryByTestId('phase5b-stage')).toBeNull();expect(document.activeElement?.textContent).toBe('部品展示室を開く');
});
