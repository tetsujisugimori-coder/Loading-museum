// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it} from 'vitest';
import {FilterBuilder} from '../app/components/practical/Phase5Data';
import {DateRangePicker} from '../app/components/practical/Phase5DateTree';
import {MultiSelectChips} from '../app/components/practical/Phase5Lists';
afterEach(cleanup);
const button=(name:string)=>screen.getByRole('button',{name});
it.each([1,3,6])('six conditions: keyboard deletes position %i and returns to enabled add',async position=>{
 const user=userEvent.setup();render(<FilterBuilder/>);const add=button('条件を追加');
 for(let i=1;i<6;i++)await user.click(add);
 expect((add as HTMLButtonElement).disabled).toBe(true);
 button(`条件 ${position} を削除`).focus();await user.keyboard('{Enter}');
 expect(screen.getAllByRole('group')).toHaveLength(5);expect((add as HTMLButtonElement).disabled).toBe(false);expect(document.activeElement).toBe(add);
 await user.tab({shift:true});expect(document.activeElement).toBe(button('条件 5 を削除'));await user.tab();expect(document.activeElement).toBe(add);
 await user.keyboard('{Enter}');expect(screen.getAllByRole('group')).toHaveLength(6);
});
it('one to zero keeps a keyboard path to add and survives OR and remount Reset',async()=>{
 const user=userEvent.setup();const view=render(<FilterBuilder/>);
 fireEvent.change(screen.getByLabelText('条件の結合'),{target:{value:'OR'}});
 button('条件 1 を削除').focus();await user.keyboard('{Enter}');expect(screen.queryAllByRole('group')).toHaveLength(0);expect(document.activeElement).toBe(button('条件を追加'));
 await user.tab({shift:true});expect(document.activeElement).toBe(screen.getByLabelText('条件の結合'));await user.tab();await user.keyboard('{Enter}');expect(screen.getAllByRole('group')).toHaveLength(1);
 view.unmount();render(<FilterBuilder/>);button('条件 1 を削除').focus();await user.keyboard('{Enter}');expect(document.activeElement).toBe(button('条件を追加'));
});
it('closed day is an invalid endpoint but remains inside a reverse selected range',()=>{
 render(<DateRangePicker/>);fireEvent.click(button('2026-11-14'));fireEvent.click(button('2026-11-12'));
 expect(screen.getByRole('status').textContent).toBe('開始: 2026-11-12 ／ 終了: 2026-11-14');
 expect((button('2026-11-13 休館日') as HTMLButtonElement).disabled).toBe(true);expect(button('2026-11-13 休館日').getAttribute('data-range')).toBe('true');
});
it('zero-padded date-only comparison handles reverse year crossing',()=>{
 render(<DateRangePicker/>);fireEvent.click(button('翌月'));fireEvent.click(button('翌月'));fireEvent.click(button('2027-01-02'));fireEvent.click(button('前月'));fireEvent.click(button('2026-12-30'));
 expect(screen.getByRole('status').textContent).toBe('開始: 2026-12-30 ／ 終了: 2027-01-02');
});
it('chips announce the highlighted candidate while real focus stays on search',async()=>{
 const user=userEvent.setup();render(<MultiSelectChips/>);const input=screen.getByLabelText('候補を検索');input.focus();
 await user.keyboard('{ArrowDown}');expect(document.activeElement).toBe(input);
 const description=document.getElementById(input.getAttribute('aria-describedby')!.split(' ').at(-1)!);
 expect(description?.getAttribute('role')).toBe('status');expect(description?.textContent).toContain('アクセシビリティ');expect(description?.textContent).toContain('2 / 8');
 await user.keyboard('{Enter}');expect(description?.textContent).toContain('選択済み');expect(button('アクセシビリティ').getAttribute('aria-pressed')).toBe('true');
 await user.keyboard('{Enter}');expect(description?.textContent).toContain('未選択');expect(document.querySelectorAll('[data-chip]')).toHaveLength(0);
});
it('chips clamp search position, announce empty and capped states, and ignore composing Enter',()=>{
 render(<MultiSelectChips/>);const input=screen.getByLabelText('候補を検索');
 for(let i=0;i<7;i++)fireEvent.keyDown(input,{key:'ArrowDown'});
 fireEvent.change(input,{target:{value:'入力'}});const description=document.getElementById(input.getAttribute('aria-describedby')!.split(' ').at(-1)!);
 expect(description?.textContent).toContain('入力');expect(description?.textContent).toContain('1 / 1');
 fireEvent.keyDown(input,{key:'Enter',isComposing:true});expect(document.querySelectorAll('[data-chip]')).toHaveLength(0);
 fireEvent.keyDown(input,{key:'Enter'});fireEvent.change(screen.getByLabelText('選択上限'),{target:{value:'1'}});fireEvent.change(input,{target:{value:'通知'}});
 expect(description?.textContent).toContain('上限のため追加不可');fireEvent.keyDown(input,{key:'Enter'});expect(document.querySelectorAll('[data-chip]')).toHaveLength(1);
 fireEvent.change(input,{target:{value:'no-match'}});expect(description?.textContent).toContain('候補なし');fireEvent.keyDown(input,{key:'Escape'});expect(description?.textContent).toContain('1 / 8');
});
