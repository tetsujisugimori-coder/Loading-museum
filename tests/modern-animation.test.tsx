// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ModernAnimationRoom from '../app/components/ModernAnimationRoom';
import { modernExhibits } from '../app/data/modernExhibits';

beforeAll(() => { globalThis.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} takeRecords() { return []; } root = null; rootMargin = ''; thresholds = []; } as unknown as typeof IntersectionObserver; });
afterEach(cleanup);
describe('modern collection', () => {
  it('has six unique, attributed and tagged objects', () => {
    expect(new Set(modernExhibits.map(x => x.id)).size).toBe(6);
    for (const item of modernExhibits) { expect(item.url).toMatch(/^https:\/\//); expect(item.tags.length).toBeGreaterThan(1); }
  });
  it('filters, opens exhibits and reverses the clip menu', () => {
    render(<ModernAnimationRoom />);
    fireEvent.click(screen.getByRole('button', {name:'展示室を開く'}));
    fireEvent.change(screen.getByLabelText('作品名・タグで探す'), {target:{value:'メニュー'}});
    expect(screen.queryByRole('button', {name:/Unwoven/})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:/Clip Menu/}));
    const toggle = screen.getByRole('button', {name:'開く'});
    fireEvent.click(toggle);
    expect(screen.getByRole('button', {name:'閉じる'}).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', {name:'閉じる'}));
    expect(screen.getByRole('button', {name:'開く'}).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', {name:'展示室を閉じる'}));
    expect(screen.queryByRole('button', {name:'開く'})).toBeNull();
  });
  it('starts the instrument muted and exposes keys', () => {
    render(<ModernAnimationRoom />);
    fireEvent.click(screen.getByRole('button', {name:'展示室を開く'}));
    fireEvent.click(screen.getByRole('button', {name:/Glass Xylophone/}));
    expect(screen.getByRole('button', {name:'音を有効にする'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name:'1番の音'}));
    expect(screen.getByRole('button', {name:'音を有効にする'})).toBeTruthy();
  });
});
