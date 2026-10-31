// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PracticalRoom from '../app/components/PracticalRoom';
import {practicalExhibits} from '../app/data/practicalExhibits';
beforeAll(()=>{vi.stubGlobal('IntersectionObserver',class{observe(){} disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));});
afterEach(cleanup);
describe('practical collection registration and lifecycle',()=>{
 it('uses unique IDs and separates purpose, technique, provenance',()=>{expect(new Set(practicalExhibits.map(x=>x.id)).size).toBe(practicalExhibits.length);for(const item of practicalExhibits){expect(item.source).toMatch(/^https:\/\//);expect(item.technology.length).toBeGreaterThan(0);expect(item.replacement).toBeTruthy();expect(item.history).toContain('UNKNOWN')}});
 it('mounts only chosen player and unmounts on close',()=>{render(<PracticalRoom/>);expect(screen.queryByTestId('practical-stage')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'部品展示室を開く'}));expect(screen.getAllByTestId('practical-stage')).toHaveLength(1);fireEvent.click(screen.getByRole('button',{name:'部品展示室を閉じる'}));expect(screen.queryByTestId('practical-stage')).toBeNull()});
 it('filters by usage without retaining a hidden player',()=>{render(<PracticalRoom/>);fireEvent.click(screen.getByRole('button',{name:'部品展示室を開く'}));fireEvent.change(screen.getByLabelText('部品名・用途・技術で検索'),{target:{value:'no-such-exhibit'}});expect(screen.queryByTestId('practical-stage')).toBeNull()});
 for(const item of practicalExhibits)it(`renders ${item.id} with reset and source`,()=>{render(<PracticalRoom/>);fireEvent.click(screen.getByRole('button',{name:'部品展示室を開く'}));fireEvent.click(screen.getByRole('button',{name:item.title}));expect(screen.getByRole('heading',{name:item.title})).toBeTruthy();expect(screen.getByRole('button',{name:'Reset'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Reset'}));expect(screen.getAllByTestId('practical-stage')).toHaveLength(1)});
});
