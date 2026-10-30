// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ModernClipMenu from '../app/components/ModernClipMenu';

afterEach(cleanup);
describe('clip timing controls', () => {
  it('changes duration and easing, reverses and resets', () => {
    const {container}=render(<ModernClipMenu />);
    fireEvent.change(screen.getByLabelText(/時間/), {target:{value:'2000'}});
    fireEvent.change(screen.getByLabelText('開く緩急'), {target:{value:'linear'}});
    fireEvent.click(screen.getByRole('button',{name:'開く'}));
    let panel=container.querySelector('.modernClipPanel') as HTMLElement;
    expect(panel.classList.contains('open')).toBe(true);
    expect(panel.style.transitionDuration).toBe('2000ms');
    expect(panel.style.transitionTimingFunction).toBe('linear');
    fireEvent.click(screen.getByRole('button',{name:'閉じる'}));
    expect(panel.classList.contains('open')).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'リセット'}));
    panel=container.querySelector('.modernClipPanel') as HTMLElement;
    expect(panel.style.transitionDuration).toBe('800ms');
  });
});
