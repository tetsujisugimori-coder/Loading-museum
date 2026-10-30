// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ModernLens from '../app/components/ModernLens';

let scheduled = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
let lastImage: {data: Uint8ClampedArray; width: number; height: number} | null = null;
const context = {
  createLinearGradient: () => ({addColorStop: () => {}}),
  fillRect: () => {}, beginPath: () => {}, ellipse: () => {}, stroke: () => {}, arc: () => {}, fill: () => {}, fillText: () => {}, strokeRect: () => {},
  getImageData: () => ({data: new Uint8ClampedArray(480*300*4).fill(128), width:480, height:300}),
  createImageData: (width:number,height:number) => ({data:new Uint8ClampedArray(width*height*4),width,height}),
  putImageData: (image: {data:Uint8ClampedArray; width:number; height:number}) => { lastImage=image; },
};
beforeEach(() => {
  scheduled = new Map(); nextFrame = 0; lastImage = null;
  vi.stubGlobal('requestAnimationFrame', (fn:FrameRequestCallback) => { const id=++nextFrame; scheduled.set(id,fn); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id:number) => scheduled.delete(id));
  vi.stubGlobal('ImageData', class { data:Uint8ClampedArray; width:number; height:number; constructor(data:Uint8ClampedArray,width:number,height:number) {this.data=data;this.width=width;this.height=height;} });
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(() => {cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('lens', () => {
  it('coalesces position changes and draws only a bounded color region, then resets', () => {
    render(<ModernLens />);
    const x=screen.getByLabelText('横位置') as HTMLInputElement;
    fireEvent.change(x,{target:{value:'5'}}); fireEvent.change(x,{target:{value:'95'}});
    expect(scheduled.size).toBe(1);
    for(const fn of scheduled.values()) fn(0);
    expect(lastImage).not.toBeNull();
    expect(lastImage!.width).toBeLessThan(200);
    fireEvent.click(screen.getByRole('button',{name:'リセット'}));
    expect(x.value).toBe('50');
  });
});
