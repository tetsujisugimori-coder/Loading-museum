// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EditableDataTable, FilterBuilder } from '../app/components/practical/Phase5Data';
beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
it('table sorting preserves selected IDs and editing target', () => {
  render(<EditableDataTable/>); fireEvent.click(screen.getByLabelText('r1を選択')); fireEvent.click(screen.getByLabelText('r3を選択'));
  click('r1 星の地図を編集'); const input = screen.getByLabelText('名称を編集（r1）'); fireEvent.change(input, { target: { value: '新しい地図' } });
  click('点数で並べ替え'); expect(screen.getByTestId('table-order').textContent).toBe('r3,r5,r1,r4,r2');
  expect((screen.getByLabelText('r1を選択') as HTMLInputElement).checked).toBe(true); expect((screen.getByLabelText('r3を選択') as HTMLInputElement).checked).toBe(true);
  click('確定'); expect(screen.getByRole('button', { name: 'r1 新しい地図を編集' })).toBe(document.activeElement); expect(screen.getByRole('button', { name: 'r3 光の標本を編集' })).toBeTruthy();
});
it('table escape cancels and keyboard enter commits without changing ID', () => {
  render(<EditableDataTable/>); click('r2 波の記録を編集'); fireEvent.change(screen.getByRole('textbox'), { target: { value: '破棄する値' } }); fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'r2 波の記録を編集' })).toBe(document.activeElement);
  click('r2 波の記録を編集'); fireEvent.change(screen.getByRole('textbox'), { target: { value: '海の記録' } }); fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' }); expect(screen.getByRole('button', { name: 'r2 海の記録を編集' })).toBeTruthy();
});
it('table rejects blank and defers IME Enter', () => {
  render(<EditableDataTable/>); click('r1 星の地図を編集'); fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' } }); click('確定'); expect(screen.getByRole('textbox')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '変換中' } }); fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', isComposing: true }); expect(screen.getByRole('textbox')).toBeTruthy(); click('取消'); expect(screen.getByRole('button', { name: 'r1 星の地図を編集' })).toBeTruthy();
});
it('table name sorting and remount reset restore original data selection', () => {
  const view = render(<EditableDataTable/>); click('名称で並べ替え'); expect(screen.getByRole('columnheader', { name: '名称で並べ替え' }).getAttribute('aria-sort')).toBe('ascending'); click('名称で並べ替え'); expect(screen.getByRole('columnheader', { name: '名称で並べ替え' }).getAttribute('aria-sort')).toBe('descending');
  fireEvent.click(screen.getByLabelText('r1を選択')); view.unmount(); render(<EditableDataTable/>); expect((screen.getByLabelText('r1を選択') as HTMLInputElement).checked).toBe(false); expect(screen.getByTestId('table-order').textContent).toBe('r2,r4,r1,r5,r3');
});
it('filter AND and OR evaluate real matching records', () => {
  render(<FilterBuilder/>); expect(screen.getByText('結果 3 / 5件')).toBeTruthy(); click('条件を追加'); const second = screen.getAllByRole('group')[1];
  fireEvent.change(within(second).getByLabelText('比較'), { target: { value: 'lte' } }); fireEvent.change(within(second).getByLabelText('条件値'), { target: { value: '80' } }); expect(screen.getByText('結果 1 / 5件')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('条件の結合'), { target: { value: 'OR' } }); expect(screen.getByText('結果 5 / 5件')).toBeTruthy();
});
it('filter invalid and blank conditions excluded; no active conditions show all', () => {
  render(<FilterBuilder/>); fireEvent.change(screen.getByLabelText('条件値'), { target: { value: 'abc' } }); expect(screen.getByText('結果 5 / 5件')).toBeTruthy(); expect(screen.getByLabelText('条件値').getAttribute('aria-invalid')).toBe('true');
  fireEvent.change(screen.getByLabelText('条件値'), { target: { value: '' } }); expect(screen.getByText('結果 5 / 5件')).toBeTruthy(); click('条件 1 を削除'); expect(document.activeElement).toBe(screen.getByRole('button', { name: '条件を追加' })); expect(screen.getByText('結果 5 / 5件')).toBeTruthy();
});
it('filter text contains and empty-result cases are observable', () => {
  render(<FilterBuilder/>); fireEvent.change(screen.getByLabelText('対象'), { target: { value: 'name' } }); expect((screen.getByLabelText('条件値') as HTMLInputElement).value).toBe('');
  fireEvent.change(screen.getByLabelText('条件値'), { target: { value: '記録' } }); expect(screen.getByText('結果 1 / 5件')).toBeTruthy(); fireEvent.change(screen.getByLabelText('条件値'), { target: { value: '不存在' } }); expect(screen.getByText('一致する資料はありません。')).toBeTruthy();
});
it('filter caps conditions and preserves other stable conditions on deletion', () => {
  render(<FilterBuilder/>); for (let i = 0; i < 5; i++) click('条件を追加'); expect(screen.getAllByRole('group')).toHaveLength(6); expect((screen.getByRole('button', { name: '条件を追加' }) as HTMLButtonElement).disabled).toBe(true);
  click('条件 2 を削除'); expect(screen.getAllByRole('group')).toHaveLength(5); expect((screen.getAllByLabelText('条件値')[0] as HTMLInputElement).value).toBe('70'); click('条件を追加'); expect(screen.getAllByRole('group')).toHaveLength(6);
});
