// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PhysicsPlayground, InteractiveIntro, SoundReactor, stepPhysics, initialBalls, introNext } from '../app/components/then-now/SecondStudies';
const props={now:true,active:false,reduced:true,speed:1};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('gravity accelerates and friction reduces physical velocity',()=>{
  const ball=[{x:100,y:60,vx:100,vy:0,held:false}];
  const g=stepPhysics(ball,.05,{gravity:200,bounce:.8,friction:0})[0]; expect(g.vy).toBeCloseTo(10);expect(g.y).toBeGreaterThan(60);
  const f=stepPhysics(ball,.05,{gravity:0,bounce:.8,friction:2})[0];expect(f.vx).toBeLessThan(100);expect(f.vx).toBeGreaterThan(0);expect(ball[0].x).toBe(100);
});
it('wall collision reflects and bounded integration never loses bodies',()=>{
  let balls=initialBalls(true);for(let i=0;i<12000;i++)balls=stepPhysics(balls,1/60,{gravity:600,bounce:1,friction:0});
  for(const b of balls){expect(Number.isFinite(b.x+b.y+b.vx+b.vy)).toBe(true);expect(b.x).toBeGreaterThanOrEqual(20);expect(b.x).toBeLessThanOrEqual(300);expect(b.y).toBeGreaterThanOrEqual(46);expect(b.y).toBeLessThanOrEqual(188);}
  const reflected=stepPhysics([{x:299,y:100,vx:200,vy:0,held:false}],.05,{gravity:0,bounce:.5,friction:0})[0];expect(reflected.vx).toBe(-100);
});
it('equal-mass collision exchanges normal velocities, held body stays placed',()=>{
  const b=stepPhysics([{x:140,y:100,vx:100,vy:0,held:false},{x:174,y:100,vx:-100,vy:0,held:false}],1/120,{gravity:0,bounce:1,friction:0});expect(b[0].vx).toBe(-100);expect(b[1].vx).toBe(100);
  const held=stepPhysics([{x:100,y:80,vx:0,vy:0,held:true}],.1,{gravity:600,bounce:1,friction:0})[0];expect(held.y).toBe(80);
});
it('physics keyboard, single step and local reset remain available with motion reduction',()=>{
  render(<PhysicsPlayground {...props}/>);const ball=screen.getByRole('button',{name:'球1を操作'});fireEvent.keyDown(ball,{key:'ArrowRight'});expect(ball.getAttribute('data-x')).toBe('104.00');fireEvent.keyDown(ball,{key:' '});fireEvent.click(screen.getByText('1刻み進む'));expect(Number(ball.getAttribute('data-y'))).toBeLessThan(75);fireEvent.click(screen.getByText('球を戻す'));expect(ball.getAttribute('data-x')).toBe('92.00');
});
it('intro has bounded terminal state and preserves route through skip and replay',()=>{
  expect(introNext({scene:4,route:'dots',elapsed:2}).scene).toBe(4);render(<InteractiveIntro {...props}/>);
  fireEvent.click(screen.getByText('Introを始める'));fireEvent.click(screen.getByText('点の道'));fireEvent.click(screen.getByText('Skip Intro'));expect(screen.getByText(/終了・操作可能な本編/)).toBeTruthy();expect(screen.getByText(/選択 dots/)).toBeTruthy();
  fireEvent.click(screen.getByText('本編の構図を切替'));expect(screen.getByText(/選択 lines/)).toBeTruthy();fireEvent.click(screen.getByText('Replay'));expect(screen.getByText(/入口 ／/)).toBeTruthy();
});
it('intro user-driven path reaches explicit main without clocks',()=>{
  render(<InteractiveIntro {...props}/>);fireEvent.click(screen.getByText('Introを始める'));fireEvent.click(screen.getByText('次のシーン'));fireEvent.click(screen.getByText('次のシーン'));fireEvent.click(screen.getByText('本編へ入る'));expect(screen.getByText(/終了・操作可能な本編/)).toBeTruthy();
});
it('audio absent and stopped paths never report successful analysis',async()=>{
  render(<SoundReactor {...props} active/>);fireEvent.click(screen.getByText('音を開始'));expect(await screen.findByText(/Web Audio APIなし/)).toBeTruthy();fireEvent.click(screen.getByText('音を停止'));expect(screen.getByText(/停止・無音/)).toBeTruthy();
});
function mockAudio(deferred=false,reject=false) {
  const contexts: FakeContext[]=[];
  class FakeContext {
    state='suspended'; currentTime=0; sampleRate=48000; close=vi.fn(async()=>{this.state='closed';});
    resolve=()=>{};
    constructor(){contexts.push(this);}
    createOscillator(){return {type:'sine',frequency:{value:0,setValueAtTime(){}},connect(){},disconnect(){},start(){},stop:vi.fn()};}
    createGain(){return {gain:{value:0,setValueAtTime(){}},connect(){},disconnect(){}};}
    createAnalyser(){return {fftSize:2048,frequencyBinCount:1024,connect(){},disconnect(){}};}
    destination={};
    resume(){return reject?Promise.reject(Error('audio denied')):deferred?new Promise<void>(resolve=>{this.resolve=()=>{if(this.state!=='closed')this.state='running';resolve();};}):(this.state='running',Promise.resolve());}
  }
  vi.stubGlobal('AudioContext',FakeContext);vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',vi.fn());return contexts;
}
it('audio pause closes graph and resume does not automatically restart sound',async()=>{
  const contexts=mockAudio();const view=render(<SoundReactor {...props} active/>);fireEvent.click(screen.getByText('音を開始'));await screen.findByText(/合成音を解析中/);expect(contexts).toHaveLength(1);
  view.rerender(<SoundReactor {...props} active={false}/>);expect(contexts[0].close).toHaveBeenCalledOnce();view.rerender(<SoundReactor {...props} active/>);expect(screen.getByText(/停止・無音/)).toBeTruthy();expect(contexts).toHaveLength(1);view.unmount();
});
it('late audio resume cannot resurrect an old graph after replacement or unmount',async()=>{
  const contexts=mockAudio(true);const view=render(<SoundReactor {...props} active/>);fireEvent.click(screen.getByText('音を開始'));fireEvent.click(screen.getByText('音を開始'));expect(contexts[0].close).toHaveBeenCalledOnce();
  await act(async()=>contexts[0].resolve());expect(screen.getByText(/音声開始を確認中/)).toBeTruthy();await act(async()=>contexts[1].resolve());expect(screen.getByText(/合成音を解析中/)).toBeTruthy();view.unmount();expect(contexts[1].close).toHaveBeenCalledOnce();
});
it('rejected native audio resume reports unavailable and releases the created graph',async()=>{
  const contexts=mockAudio(false,true);render(<SoundReactor {...props} active/>);fireEvent.click(screen.getByText('音を開始'));expect(await screen.findByText(/開始が拒否/)).toBeTruthy();expect(contexts[0].close).toHaveBeenCalledOnce();
});
it('timeline intro reaches the branch under coarse frames while bounding long-frame catch-up',()=>{
  let next: FrameRequestCallback=()=>{};vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{next=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
  render(<InteractiveIntro {...props} now={false} active reduced={false}/>);fireEvent.click(screen.getByText('Introを始める'));
  for(const time of [100,600,1100,1600,2100,2600,3100])act(()=>next(time));
  expect(screen.getByText(/構図を選ぶ ／/)).toBeTruthy();
});

// Artificial Pointer Events in jsdom; the browser lifecycle probe separately uses
// trusted Playwright mouse input and labels injected cancellation/stale events.
function pointerFixture(now=true) {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type:string,init:PointerEventInit={}) { super(type,init); this.pointerId=init.pointerId??1; }
  }
  vi.stubGlobal('PointerEvent',TestPointerEvent);
  const view=render(<PhysicsPlayground {...props} now={now} active/>);
  const balls=screen.getAllByRole('button',{name:/球\dを操作/});
  const captured=new Map<Element,number>();
  for(const b of balls) {
    Object.assign(b,{setPointerCapture:vi.fn((id:number)=>captured.set(b,id)),hasPointerCapture:(id:number)=>captured.get(b)===id,releasePointerCapture:vi.fn((id:number)=>{if(captured.get(b)===id)captured.delete(b);})});
  }
  const svg=balls[0].closest('svg')!;vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:320,height:220} as DOMRect);
  const read=(i:number)=>{const b=balls[i],l=b.parentElement!.querySelector('line')!;return {x:b.getAttribute('cx'),y:b.getAttribute('cy'),held:b.getAttribute('data-held'),vx:+((Number(l.getAttribute('x2'))-Number(l.getAttribute('x1')))*6).toFixed(9),vy:+((Number(l.getAttribute('y2'))-Number(l.getAttribute('y1')))*6).toFixed(9)};};
  const start=(id=1)=>{fireEvent.pointerDown(balls[0],{pointerId:id});fireEvent.pointerMove(balls[0],{pointerId:id,clientX:60,clientY:60});};
  return {view,balls,read,start,captured};
}
it('cancel affects only the dragged body; the other follows the unchanged physical step',()=>{
  const {balls,read,start}=pointerFixture();for(const name of ['重力','摩擦'])fireEvent.change(screen.getByRole('slider',{name}),{target:{value:'0'}});fireEvent.keyDown(balls[1],{key:' '});start();const other=read(1);
  fireEvent.pointerCancel(balls[0],{pointerId:1});expect(read(1)).toEqual(other);expect(read(0)).toMatchObject({held:'false',vx:0,vy:0});
  fireEvent.click(screen.getByText('1刻み進む'));expect(read(1).vy).toBe(-250);expect(Number(read(1).y)).toBeCloseTo(100-250/30,8);
});
it('normal pointerup preserves target throw and leaves the independent body unchanged',()=>{
  const {balls,read,start}=pointerFixture();start();const before=read(0),other=read(1);expect(before.vx).not.toBe(0);
  fireEvent.pointerUp(balls[0],{pointerId:1});expect(read(0)).toEqual({...before,held:'false'});expect(read(1)).toEqual(other);expect(balls[0].releasePointerCapture).toHaveBeenCalledWith(1);
});
it('stop clears held and capture immediately, then resume, redrag and reset work',()=>{
  const {view,balls,read,start,captured}=pointerFixture();start();const other=read(1);expect(read(0).held).toBe('true');
  view.rerender(<PhysicsPlayground {...props} active={false}/>);expect(read(0)).toMatchObject({held:'false',vx:0,vy:0});expect(read(1)).toEqual(other);expect(captured.size).toBe(0);
  view.rerender(<PhysicsPlayground {...props} active/>);start(2);fireEvent.pointerUp(balls[0],{pointerId:2});expect(read(0).held).toBe('false');fireEvent.click(screen.getByText('球を戻す'));expect(read(0)).toMatchObject({x:'92',y:'75',held:'false',vx:65,vy:0});
});
it('different pointers and stale lost-capture cannot cancel a newly captured operation',()=>{
  const {balls,read,start}=pointerFixture();start();fireEvent.pointerCancel(balls[0],{pointerId:1});start(2);const before=read(0);
  for(const type of ['pointermove','pointerup','pointercancel','lostpointercapture'])fireEvent(balls[0],new PointerEvent(type,{pointerId:1,bubbles:true,clientX:200,clientY:100}));
  fireEvent.pointerCancel(balls[1],{pointerId:2});fireEvent(balls[0],new PointerEvent('lostpointercapture',{pointerId:2,bubbles:true}));expect(read(0)).toEqual(before);fireEvent.pointerUp(balls[0],{pointerId:2});expect(read(0).held).toBe('false');
});
it('actual capture loss, blur and unmount release only the owned pointer',()=>{
  const {view,balls,read,start,captured}=pointerFixture();start(7);captured.delete(balls[0]);fireEvent.lostPointerCapture(balls[0],{pointerId:7});expect(read(0)).toMatchObject({held:'false',vx:0,vy:0});start(8);fireEvent.blur(balls[0]);expect(captured.size).toBe(0);start(9);view.unmount();expect(balls[0].releasePointerCapture).toHaveBeenLastCalledWith(9);
});
it('single body cancellation and reset use the same lifecycle',()=>{
  const {balls,read,start}=pointerFixture(false);start();fireEvent.pointerCancel(balls[0],{pointerId:1});expect(read(0)).toMatchObject({held:'false',vx:0,vy:0});fireEvent.click(screen.getByText('球を戻す'));expect(read(0)).toMatchObject({x:'92',y:'75',held:'false',vx:65,vy:0});
});
