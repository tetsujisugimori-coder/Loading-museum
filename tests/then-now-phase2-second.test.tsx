// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FrameByFrameLab, IsometricExplorer, PreloaderTheatre, initialDrawingFrames, duplicateDrawingFrame, moveExplorer, nearbyObject, advanceLoadingScene, initialLoadingScene } from '../app/components/then-now/PhaseTwoSecond';
const props={now:true,active:false,reduced:true,speed:1};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function pointerStage() {
 class TestPointer extends MouseEvent { pointerId:number; isPrimary:boolean; constructor(type:string,init:PointerEventInit){super(type,init);this.pointerId=init.pointerId??1;this.isPrimary=init.isPrimary??true;} }
 vi.stubGlobal('PointerEvent',TestPointer);
 render(<FrameByFrameLab {...props}/>);const svg=screen.getByRole('application');
 Object.assign(svg,{setPointerCapture:vi.fn(),getBoundingClientRect:()=>({left:0,top:0,width:320,height:220})});
 return svg;
}
const currentInk=(svg:HTMLElement)=>Array.from(svg.querySelectorAll('[data-current-frame] polyline')).map(n=>n.getAttribute('points'));
it('drawing suppresses native text-drag selection while keeping keyboard focus',()=>{
 const svg=pointerStage();expect(fireEvent.pointerDown(svg,{pointerId:1,clientX:20,clientY:40})).toBe(false);expect(document.activeElement).toBe(svg);
});
it('filmstrip renders the actual independent drawing, including Undo and copied-frame edits',()=>{
 const svg=pointerStage();fireEvent.pointerDown(svg,{pointerId:1,clientX:20,clientY:40});fireEvent.pointerMove(svg,{pointerId:1,clientX:60,clientY:40});fireEvent.pointerUp(svg,{pointerId:1});
 const source=currentInk(svg);expect(source).toEqual(['20,40 60,40']);
 fireEvent.click(screen.getByText('コマを複製して追加'));fireEvent.click(screen.getByText('最後の線を戻す'));fireEvent.keyDown(svg,{key:'Enter'});
 expect(screen.getByRole('button',{name:'フレーム 1'}).querySelector('polyline')?.getAttribute('points')).toBe(source[0]);
 expect(screen.getByRole('button',{name:'フレーム 2'}).querySelector('polyline')?.getAttribute('points')).toBe('150,65 160,50 170,65');
 fireEvent.click(screen.getByRole('button',{name:'フレーム 1'}));expect(currentInk(svg)).toEqual(source);
 fireEvent.click(screen.getByText('オニオンスキン'));expect(currentInk(svg)).toEqual(source);fireEvent.click(screen.getByText('最後の線を戻す'));
 expect(currentInk(svg)).toEqual([]);expect(screen.getByRole('button',{name:'フレーム 1'}).querySelector('polyline')).toBeNull();
});
it.each(['pointerCancel','lostPointerCapture'] as const)('%s retains a partial stroke as one Undo and ignores unrelated pointers',event=>{
 const svg=pointerStage();fireEvent.pointerDown(svg,{pointerId:1,clientX:10,clientY:20});fireEvent.pointerMove(svg,{pointerId:1,clientX:30,clientY:40});
 fireEvent[event](svg,{pointerId:2});fireEvent.pointerMove(svg,{pointerId:1,clientX:50,clientY:80});expect(currentInk(svg)).toEqual(['10,20 30,40 50,80']);
 fireEvent[event](svg,{pointerId:1});fireEvent.pointerMove(svg,{pointerId:1,clientX:90,clientY:100});expect(currentInk(svg)).toEqual(['10,20 30,40 50,80']);
 fireEvent.click(screen.getByText('最後の線を戻す'));expect(currentInk(svg)).toEqual([]);expect(screen.getByRole('button',{name:'フレーム 1'}).querySelector('polyline')).toBeNull();
});
it('Undo during drawing cannot redirect stale input to the previous stroke',()=>{
 const svg=pointerStage();fireEvent.keyDown(svg,{key:'Enter'});fireEvent.pointerDown(svg,{pointerId:1,clientX:10,clientY:20});fireEvent.pointerMove(svg,{pointerId:1,clientX:30,clientY:40});
 fireEvent.click(screen.getByText('最後の線を戻す'));fireEvent.pointerMove(svg,{pointerId:1,clientX:90,clientY:100});expect(currentInk(svg)).toEqual(['150,65 160,50 170,65']);
 expect(screen.getByRole('button',{name:'フレーム 1'}).querySelector('polyline')?.getAttribute('points')).toBe('150,65 160,50 170,65');
});
it('frame selection terminates the old drawing without appending to either frame',()=>{
 const svg=pointerStage();fireEvent.keyDown(svg,{key:'Enter'});fireEvent.click(screen.getByText('次のコマ'));fireEvent.keyDown(svg,{key:'Enter'});fireEvent.click(screen.getByText('前のコマ'));
 fireEvent.pointerDown(svg,{pointerId:1,clientX:10,clientY:20});fireEvent.pointerMove(svg,{pointerId:1,clientX:30,clientY:40});fireEvent.keyDown(svg,{key:'ArrowRight'});fireEvent.pointerMove(svg,{pointerId:1,clientX:90,clientY:100});
 expect(currentInk(svg)).toEqual(['150,65 160,50 170,65']);fireEvent.click(screen.getByText('前のコマ'));expect(currentInk(svg)).toEqual(['150,65 160,50 170,65','10,20 30,40']);
});
it('Then and Now artwork and thumbnails remain separate',()=>{
 const view=render(<><section aria-label="Then"><FrameByFrameLab {...props} now={false}/></section><section aria-label="Now"><FrameByFrameLab {...props}/></section></>);
 const then=within(screen.getByRole('region',{name:'Then'})),now=within(screen.getByRole('region',{name:'Now'}));fireEvent.keyDown(then.getByRole('application'),{key:'Enter'});
 expect(then.getByRole('button',{name:'フレーム 1'}).querySelector('polyline')).not.toBeNull();expect(now.getByRole('button',{name:'フレーム 1'}).querySelector('polyline')).toBeNull();view.unmount();
});
it('frame duplication is independent, bounded and preserves the original drawing',()=>{
 const frames=initialDrawingFrames();frames[0].ink=[[{x:12,y:13}]];const next=duplicateDrawingFrame(frames,0);next[1].ink[0][0].x=99;expect(frames[0].ink[0][0].x).toBe(12);expect(next).toHaveLength(7);
 let f=frames;for(let i=0;i<20;i++)f=duplicateDrawingFrame(f,0);expect(f).toHaveLength(16);expect(duplicateDrawingFrame(f,0)).toBe(f);
});
it('selected frame edits and keyboard ink survive stepping and do not leak into copied frames',()=>{
 render(<FrameByFrameLab {...props}/>);fireEvent.change(screen.getByRole('slider',{name:'このコマの高さ'}),{target:{value:40}});fireEvent.click(screen.getByText('コマを複製して追加'));
 fireEvent.change(screen.getByRole('slider',{name:'このコマの高さ'}),{target:{value:10}});fireEvent.click(screen.getByRole('button',{name:'フレーム 1'}));expect((screen.getByRole('slider',{name:'このコマの高さ'}) as HTMLInputElement).value).toBe('40');
 const svg=screen.getByRole('application');fireEvent.keyDown(svg,{key:'Enter'});expect(screen.getByText(/描線 1\/12/)).toBeTruthy();fireEvent.keyDown(svg,{key:'ArrowRight'});expect(screen.getByText(/描線 0\/12/)).toBeTruthy();fireEvent.click(screen.getByText('前のコマ'));fireEvent.click(screen.getByText('最後の線を戻す'));expect(screen.getByText(/描線 0\/12/)).toBeTruthy();
});
it('manual frame wrapping and onion skin work without animation in reduced motion',()=>{
 render(<FrameByFrameLab {...props}/>);fireEvent.click(screen.getByText('前のコマ'));expect(screen.getByText(/コマ 6\/6/)).toBeTruthy();fireEvent.click(screen.getByText('次のコマ'));expect(screen.getByText(/コマ 1\/6/)).toBeTruthy();fireEvent.click(screen.getByText('オニオンスキン'));expect(screen.getByText('オニオンスキン').getAttribute('aria-pressed')).toBe('false');
});
it('island movement is bounded and object discovery requires proximity',()=>{
 expect(moveExplorer({x:0,y:4},-1,1)).toEqual({x:0,y:4});expect(nearbyObject({x:2,y:2})).toBeUndefined();expect(nearbyObject({x:0,y:0})?.key).toBe('light');
});
it('explorer can find all four objects and repeated inspection does not duplicate discoveries',()=>{
 render(<IsometricExplorer {...props}/>);fireEvent.click(screen.getByText('周りを調査'));expect(screen.getByText(/仕掛けは隣/)).toBeTruthy();
 for(const label of ['区画 1,2 灯台','区画 4,1 時計塔','区画 5,4 泉','区画 2,5 種の木']){fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByText('周りを調査'));}
 expect(screen.getByText(/発見 4\/4/)).toBeTruthy();expect(screen.getByText('THE ISLAND REMEMBERS YOU')).toBeTruthy();fireEvent.click(screen.getByText('周りを調査'));expect(screen.getByText(/発見 4\/4/)).toBeTruthy();
});
it('explorer keyboard navigation and explicit inspect button remain available',()=>{
 render(<IsometricExplorer {...props}/>);const world=screen.getByRole('group',{name:/島の探検/});fireEvent.keyDown(world,{key:'ArrowLeft'});fireEvent.keyDown(world,{key:'ArrowLeft'});fireEvent.keyDown(world,{key:'Enter'});expect(screen.getByText(/灯台を発見/)).toBeTruthy();
});
it('loading model is deterministic, bounded, separates data completion and curtain',()=>{
 const idle=initialLoadingScene();expect(advanceLoadingScene(idle,.25,100)).toBe(idle);let s={...idle,started:true};for(let i=0;i<40;i++)s=advanceLoadingScene(s,.25,100);expect(s.units).toBe(1000);expect(s.reveal).toBe(0);s=advanceLoadingScene(s,.25,100);expect(s.reveal).toBe(.3125);for(let i=0;i<10;i++)s=advanceLoadingScene(s,.25,100);expect(s.reveal).toBe(1);expect(s.units).toBe(1000);
});
it('loading retains partial progress and accounts for remaining time in the completion frame',()=>{
 const s=advanceLoadingScene({units:990,reveal:0,started:true},.25,100);expect(s.units).toBe(1000);expect(s.reveal).toBeCloseTo(.1875);expect(advanceLoadingScene({units:50,reveal:0,started:true},-1,100).units).toBe(50);
});
it('manual reduced-motion loading reaches interactive main and clamps terminal progress',()=>{
 render(<PreloaderTheatre {...props}/>);fireEvent.change(screen.getByRole('slider',{name:'模擬速度 units/秒'}),{target:{value:400}});
 for(let i=0;i<14;i++)fireEvent.click(screen.getByText('0.25秒進める'));expect(screen.getByText(/完了・本編を操作/)).toBeTruthy();expect(screen.getByRole('button',{name:'0.25秒進める'}).hasAttribute('disabled')).toBe(true);fireEvent.click(screen.getByText('本編の構図を変える'));expect(screen.getByRole('progressbar',{name:'模擬読み込み進捗'}).getAttribute('value')).toBe('1000');
});
it('automatic drawing clock cancels on hidden/inactive and reduced-motion transitions',()=>{
 let cb:FrameRequestCallback=()=>{};vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{cb=f;return 7;});const cancel=vi.fn();vi.stubGlobal('cancelAnimationFrame',cancel);
 const v=render(<FrameByFrameLab {...props} active reduced={false}/>);fireEvent.click(screen.getByText('作画を再生'));act(()=>cb(100));act(()=>cb(350));expect(screen.getByText(/コマ 2\/6/)).toBeTruthy();v.rerender(<FrameByFrameLab {...props} active={false} reduced={false}/>);expect(cancel).toHaveBeenCalledWith(7);v.rerender(<FrameByFrameLab {...props} active reduced/>);expect(screen.getByText(/コマ 2\/6/)).toBeTruthy();v.unmount();
});
it('onion skin includes adjacent custom ink, not just the built-in pose',()=>{
 const {container}=render(<FrameByFrameLab {...props}/>);fireEvent.keyDown(screen.getByRole('application'),{key:'Enter'});fireEvent.click(screen.getByText('次のコマ'));
 expect(container.querySelector('[data-onion-frame="0"] polyline')?.getAttribute('points')).toBe('150,65 160,50 170,65');
});
it('Then directly discovers clicked objects while Now requires explicit inspection',()=>{
 const v=render(<IsometricExplorer {...props} now={false}/>);fireEvent.click(screen.getByRole('button',{name:'区画 1,2 灯台'}));expect(screen.getByText(/発見 1\/4/)).toBeTruthy();v.unmount();
 render(<IsometricExplorer {...props} now/>);fireEvent.click(screen.getByRole('button',{name:'区画 1,2 灯台'}));expect(screen.getByText(/発見 0\/4/)).toBeTruthy();fireEvent.click(screen.getByText('周りを調査'));expect(screen.getByText(/発見 1\/4/)).toBeTruthy();
});
it('pointer drawing cancellation on inactivity cannot append to a new frame',()=>{
 class TestPointer extends MouseEvent { pointerId:number; constructor(type:string,init:PointerEventInit){super(type,init);this.pointerId=init.pointerId??1;} }
 vi.stubGlobal('PointerEvent',TestPointer);
 const v=render(<FrameByFrameLab {...props} active reduced={false}/>);const svg=screen.getByRole('application');Object.assign(svg,{setPointerCapture:vi.fn(),getBoundingClientRect:()=>({left:0,top:0,width:320,height:220})});
 fireEvent.pointerDown(svg,{pointerId:1,clientX:10,clientY:20});fireEvent.pointerMove(svg,{pointerId:1,clientX:30,clientY:40});expect(svg.querySelector('polyline')?.getAttribute('points')).toBe('10,20 30,40');
 v.rerender(<FrameByFrameLab {...props} active={false} reduced={false}/>);fireEvent.pointerMove(svg,{pointerId:1,clientX:70,clientY:80});expect(svg.querySelector('polyline')?.getAttribute('points')).toBe('10,20 30,40');
 fireEvent.click(screen.getByText('コマを複製して追加'));fireEvent.pointerMove(svg,{pointerId:1,clientX:90,clientY:90});expect(svg.querySelectorAll('polyline')[svg.querySelectorAll('polyline').length-1]?.getAttribute('points')).toBe('10,20 30,40');
});
