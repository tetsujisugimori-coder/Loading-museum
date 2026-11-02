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
