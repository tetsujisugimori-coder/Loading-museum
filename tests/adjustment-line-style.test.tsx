// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import ImageAdjustment from '../app/components/practical/ImageAdjustment';
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('ImageData',class{});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({putImageData:vi.fn()}) as unknown as CanvasRenderingContext2D)});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
it('all original paths are dashed and all adjusted paths solid, matching the explanation',()=>{render(<ImageAdjustment/>);const h=screen.getByTestId('iad-histogram');for(const c of ['r','g','b']){const paths=h.querySelectorAll(`svg .iadChannel-${c} path`);expect(paths).toHaveLength(2);expect(paths[0].getAttribute('stroke-dasharray')).toBeTruthy();expect(paths[1].getAttribute('stroke-dasharray')).toBeNull()}});
it('isolates named channels without requiring color discrimination',()=>{render(<ImageAdjustment/>);const h=screen.getByTestId('iad-histogram');for(const [c,label]of [['r','R 赤'],['g','G 緑'],['b','B 青']]){fireEvent.click(screen.getByRole('button',{name:label,exact:true}));expect(screen.getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed')).toBe('true');expect(h.querySelectorAll('svg g g')).toHaveLength(1);expect(h.querySelector(`svg .iadChannel-${c}`)).toBeTruthy()}fireEvent.click(screen.getByRole('button',{name:'全チャンネル',exact:true}));expect(h.querySelectorAll('svg g g')).toHaveLength(3)});
