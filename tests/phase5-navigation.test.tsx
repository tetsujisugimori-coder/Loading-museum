// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DateRangePicker, TreeView } from '../app/components/practical/Phase5DateTree';
import { MultiSelectChips, VirtualizedList } from '../app/components/practical/Phase5Lists';
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
it('date reverse selection swaps date-only endpoints and repeats a new range', () => {
  render(<DateRangePicker/>); click('2026-11-20'); click('2026-11-10'); expect(screen.getByRole('status').textContent).toBe('開始: 2026-11-10 ／ 終了: 2026-11-20');
  click('2026-11-05'); expect(screen.getByRole('status').textContent).toBe('開始: 2026-11-05 ／ 終了: 未選択'); click('期間を再指定'); expect(screen.getByRole('status').textContent).toBe('開始: 未選択 ／ 終了: 未選択');
});
it('date disabled day cannot select and arrows skip it with escape clearing', () => {
  render(<DateRangePicker/>); const disabled = screen.getByRole('button', { name: '2026-11-13 休館日' }); expect((disabled as HTMLButtonElement).disabled).toBe(true); fireEvent.click(disabled); expect(screen.getByRole('status').textContent).toContain('開始: 未選択');
  const day = screen.getByRole('button', { name: '2026-11-12' }); day.focus(); fireEvent.keyDown(day, { key: 'ArrowRight' }); expect(document.activeElement).toBe(screen.getByRole('button', { name: '2026-11-14' }));
  click('2026-11-14'); fireEvent.keyDown(screen.getByRole('button', { name: '2026-11-14' }), { key: 'Escape' }); expect(screen.getByRole('status').textContent).toContain('開始: 未選択');
});
it('date month and year navigation retains start and supports cross-month ranges', () => {
  render(<DateRangePicker/>); click('2026-11-30'); click('翌月'); click('2026-12-02'); expect(screen.getByRole('status').textContent).toContain('2026-11-30 ／ 終了: 2026-12-02'); click('翌月'); expect(screen.getByText('2027年1月')).toBeTruthy(); click('前月'); expect(screen.getByText('2026年12月')).toBeTruthy();
});
it('tree collapse returns hidden child selection and focus to parent', () => {
  render(<TreeView/>); click('展示を展開'); const child = screen.getByRole('treeitem', { name: '動きの標本' }); fireEvent.click(child); expect(screen.getByRole('status').textContent).toContain('motion'); click('展示を折り畳む');
  expect(screen.queryByRole('treeitem', { name: '動きの標本' })).toBeNull(); const parent = document.querySelector('[data-node="exhibits"]'); expect(document.activeElement).toBe(parent); expect(parent?.getAttribute('aria-selected')).toBe('true'); expect(screen.getByRole('status').textContent).toContain('exhibits');
});
it('tree arrows follow visible hierarchy and enter selects focused node', () => {
  render(<TreeView/>); const root = document.querySelector('[data-node="museum"]') as HTMLElement; root.focus(); fireEvent.keyDown(root, { key: 'ArrowRight' }); expect(document.activeElement?.getAttribute('data-node')).toBe('exhibits'); fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' }); fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' }); expect(document.activeElement?.getAttribute('data-node')).toBe('motion');
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' }); fireEvent.keyDown(document.activeElement!, { key: 'Enter' }); expect(screen.getByRole('status').textContent).toContain('inputs'); fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' }); expect(document.activeElement?.getAttribute('data-node')).toBe('exhibits');
});
it('virtual list renders bounded real rows while reaching deep positions', () => {
  render(<VirtualizedList/>); const viewport = screen.getByRole('region'); expect(document.querySelectorAll('[data-virtual-row]')).toHaveLength(9); expect(document.querySelector('[data-dom-count]')?.textContent).toBe('9');
  fireEvent.scroll(viewport, { target: { scrollTop: 180000 } }); const rows = document.querySelectorAll('[data-virtual-row]'); expect(rows).toHaveLength(12); expect(rows[0].getAttribute('data-id')).toBe('record-4998'); expect(document.querySelector('[data-dom-count]')?.textContent).toBe(String(rows.length));
});
it('virtual filtering resets DOM position and handles zero and one record', () => {
  render(<VirtualizedList/>); const viewport = screen.getByRole('region'); fireEvent.scroll(viewport, { target: { scrollTop: 180000 } }); fireEvent.change(screen.getByLabelText('資料を絞り込む'), { target: { value: '10000' } }); expect(viewport.scrollTop).toBe(0); expect(document.querySelectorAll('[data-virtual-row]')).toHaveLength(1); expect(screen.getByText('架空資料 10000')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('資料を絞り込む'), { target: { value: '不存在' } }); expect(document.querySelectorAll('[data-virtual-row]')).toHaveLength(0); expect(screen.getByText('一致する資料なし')).toBeTruthy();
});
it('virtual remount reset restores initial total and position', () => {
  const view = render(<VirtualizedList/>); fireEvent.change(screen.getByLabelText('資料を絞り込む'), { target: { value: '10000' } }); view.unmount(); render(<VirtualizedList/>); expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(''); expect(document.querySelectorAll('[data-virtual-row]')).toHaveLength(9); expect(document.querySelector('[data-scroll-top]')?.textContent).toBe('0');
});
it('chips cap adds but reducing limit never destroys selections', () => {
  render(<MultiSelectChips/>); click('入力'); click('検索'); click('通知'); click('データ'); expect(document.querySelectorAll('[data-chip]')).toHaveLength(3);
  fireEvent.change(screen.getByLabelText('選択上限'), { target: { value: '1' } }); expect(document.querySelectorAll('[data-chip]')).toHaveLength(3); click('入力を解除'); expect(document.activeElement).toBe(screen.getByLabelText('候補を検索')); click('検索を解除'); click('通知を解除'); click('データ'); expect(document.querySelectorAll('[data-chip]')).toHaveLength(1);
});
it('chips duplicate candidate toggles off rather than creating duplicate', () => {
  render(<MultiSelectChips/>); click('入力'); click('入力'); expect(document.querySelectorAll('[data-chip]')).toHaveLength(0); click('入力'); expect(document.querySelectorAll('[data-chip]')).toHaveLength(1);
});
it('chips keyboard search select escape and IME preserve correct state', () => {
  render(<MultiSelectChips/>); const input = screen.getByLabelText('候補を検索'); fireEvent.change(input, { target: { value: '検索' } }); fireEvent.keyDown(input, { key: 'Enter', isComposing: true }); expect(document.querySelectorAll('[data-chip]')).toHaveLength(0); fireEvent.keyDown(input, { key: 'Enter' }); expect(screen.getByRole('button', { name: '検索を解除' })).toBeTruthy();
  fireEvent.keyDown(input, { key: 'Escape' }); expect((input as HTMLInputElement).value).toBe(''); fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' }); expect(screen.getByRole('button', { name: 'アクセシビリティを解除' })).toBeTruthy();
  fireEvent.change(input, { target: { value: '不存在' } }); fireEvent.keyDown(input, { key: 'Enter' }); expect(screen.getByText('候補なし')).toBeTruthy(); expect(document.querySelectorAll('[data-chip]')).toHaveLength(2);
});
it('chips remount reset clears state and restores limit', () => {
  const view = render(<MultiSelectChips/>); click('入力'); fireEvent.change(screen.getByLabelText('選択上限'), { target: { value: '1' } }); view.unmount(); render(<MultiSelectChips/>); expect(document.querySelectorAll('[data-chip]')).toHaveLength(0); expect((screen.getByLabelText('選択上限') as HTMLSelectElement).value).toBe('3');
});
