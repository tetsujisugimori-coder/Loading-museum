// @vitest-environment jsdom
import React from 'react';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { MaskTheatre,ElasticNavigation,ParallaxStage,maskExtent,advanceNavigation,parallaxPose,navigationTarget } from '../app/components/then-now/PhaseTwoFirst';
const props={active:false,reduced:true,speed:1,now:true};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it.each(['pointerUp','pointerCancel','lostPointerCapture'] as const)('mask two-axis drag ends only for the owning pointer on %s',event=>{
 class TestPointer extends MouseEvent {pointerId:number;isPrimary:boolean;constructor(type:string,init:PointerEventInit){super(type,init);this.pointerId=init.pointerId??1;this.isPrimary=init.isPrimary??true;}}
 vi.stubGlobal('PointerEvent',TestPointer);render(<MaskTheatre {...props}/>);const svg=screen.getByRole('img');Object.assign(svg,{setPointerCapture:vi.fn(),getBoundingClientRect:()=>({left:0,top:0,width:320,height:230})});
 fireEvent.pointerDown(svg,{pointerId:1,clientX:40,clientY:50});fireEvent[event](svg,{pointerId:2});fireEvent.pointerMove(svg,{pointerId:1,clientX:180,clientY:190});
 expect((screen.getByLabelText('マスク横位置') as HTMLInputElement).value).toBe('180');expect((screen.getByLabelText('マスク縦位置') as HTMLInputElement).value).toBe('190');
 fireEvent[event](svg,{pointerId:1});fireEvent.pointerMove(svg,{pointerId:1,clientX:220,clientY:210});expect((screen.getByLabelText('マスク横位置') as HTMLInputElement).value).toBe('180');
});
it('mask bounded progress scales opening and never goes negative',()=>{expect(maskExtent(-1,100)).toBe(0);expect(maskExtent(2,100)).toBe(380);expect(maskExtent(.5,100)).toBe(190);});
it('mask supports stopped manual time, all shapes, independent center and size',()=>{const v=render(<MaskTheatre {...props}/>);fireEvent.change(screen.getByLabelText('転換位置 %'),{target:{value:'50'}});expect(v.container.querySelector('[data-mask-progress]')?.getAttribute('data-mask-progress')).toBe('0.500');fireEvent.click(screen.getByText('文字マスク'));expect(screen.getByRole('img').getAttribute('aria-label')).toContain('text 50%');fireEvent.change(screen.getByLabelText('マスク横位置'),{target:{value:'70'}});fireEvent.change(screen.getByLabelText('マスクの大きさ'),{target:{value:'75'}});expect(v.container.querySelector('clipPath text')?.getAttribute('x')).toBe('70');fireEvent.click(screen.getByText('帯マスク'));expect(v.container.querySelectorAll('clipPath rect')).toHaveLength(6);fireEvent.click(screen.getByText('転換の先頭'));expect(v.container.querySelector('[data-mask-progress]')?.getAttribute('data-mask-progress')).toBe('0.000');});
it('mask ids remain isolated for simultaneous Then/Now',()=>{const v=render(<><MaskTheatre {...props} now={false}/><MaskTheatre {...props}/></>);const ids=Array.from(v.container.querySelectorAll('clipPath')).map(n=>n.id);expect(new Set(ids).size).toBe(2);});
it('navigation bounded substeps converge and retain reversal momentum',()=>{let s={position:0,velocity:0};for(let i=0;i<800;i++)s=advanceNavigation(s,1,1/60,65);expect(s).toEqual({position:1,velocity:0});const moving=advanceNavigation({position:.4,velocity:2},0,.001,65);expect(moving.velocity).toBeGreaterThan(0);for(let i=0;i<800;i++)s=advanceNavigation(s,0,1/60,100);expect(s).toEqual({position:0,velocity:0});});
it('navigation exposes complete reduced-motion path and selection without animation',()=>{render(<ElasticNavigation {...props}/>);fireEvent.click(screen.getByText('展開'));fireEvent.click(screen.getByText('目標位置へ'));fireEvent.click(screen.getByText('温室'));expect(screen.getByText('GLASS GARDEN')).toBeTruthy();fireEvent.click(screen.getByText('収納'));expect(screen.getByText('温室').hasAttribute('disabled')).toBe(true);fireEvent.click(screen.getByText('1コマ進む'));expect(screen.getByText(/位置 0\./)).toBeTruthy();fireEvent.click(screen.getByText('目標位置へ'));expect(screen.getByText(/位置 0.000/)).toBeTruthy();});
it('parallax independent layers differ and zero depth locks composition',()=>{expect(parallaxPose(1,0,1,true)).toEqual({x:-0,y:0});expect(Math.abs(parallaxPose(1,1,1,false).x)).toBeGreaterThan(Math.abs(parallaxPose(1,1,.25,false).x));expect(parallaxPose(1,1,1,true).y).toBe(5);});
it('parallax keyboard and sliders work while stopped, Home restores center',()=>{const v=render(<ParallaxStage {...props}/>);const stage=screen.getByRole('application');fireEvent.keyDown(stage,{key:'ArrowRight'});expect(screen.getByLabelText('視点の左右').getAttribute('value')).toBe('0.1');expect(v.container.querySelector('[data-layer="2"]')?.getAttribute('data-x')).toBe('-2.100');fireEvent.click(screen.getByText('レイヤー線'));expect(screen.getByText('遠景 ×0.25')).toBeTruthy();fireEvent.keyDown(stage,{key:'Home'});expect(screen.getByLabelText('視点の左右').getAttribute('value')).toBe('0');});
it('inactive and reduced studies do not schedule animation frames',()=>{const raf=vi.fn();vi.stubGlobal('requestAnimationFrame',raf);render(<><MaskTheatre {...props} active/><ElasticNavigation {...props} active/><ParallaxStage {...props} active/></>);fireEvent.click(screen.getByText('展開'));expect(raf).not.toHaveBeenCalled();});
it('active clock cancellation prevents continued scheduling after unmount',()=>{const cancel=vi.fn();vi.stubGlobal('requestAnimationFrame',vi.fn(()=>73));vi.stubGlobal('cancelAnimationFrame',cancel);const v=render(<ParallaxStage {...props} active reduced={false}/>);v.unmount();expect(cancel).toHaveBeenCalledWith(73);});

it('navigation targets leave hub and each other clear at 240px stage width',()=>{
 for(const now of [false,true]){
  const targets=Array.from({length:4},(_,i)=>navigationTarget(i,now));
  // At 240px, 44px destination and 52px hub occupy 58.7 and 69.3 SVG units.
  for(const target of targets) expect(Math.abs(target.x-160)>64 || Math.abs(target.y-120)>64).toBe(true);
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)expect(Math.abs(targets[i].x-targets[j].x)>59 || Math.abs(targets[i].y-targets[j].y)>59).toBe(true);
 }
});
