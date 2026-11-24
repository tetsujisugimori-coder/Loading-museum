import test from 'node:test';
import assert from 'node:assert/strict';
import {syncPlaybackControls} from '../public/dialup-bbs/playback-controls.mjs';
function fixture(){
 let active;
 const make=(name,initial=false)=>{
   let disabled=initial;
   return {name,get disabled(){return disabled;},set disabled(v){disabled=v;if(v&&active===this)active=null;},focus(){assert.equal(disabled,false,'must enable destination first');active=this;}};
 };
 const play=make('play'),pause=make('pause',true),reset=make('reset'),other=make('other');
 const sync=(playing,reduced=false)=>syncPlaybackControls({play,pause,reset,active,playing,reduced});
 return {play,pause,reset,other,sync,active:()=>active};
}
test('keyboard start and stop transfer before disabling the active control',()=>{
 const f=fixture();f.play.focus();f.sync(true);assert.equal(f.active(),f.pause);assert.equal(f.play.disabled,true);
 f.sync(false);assert.equal(f.active(),f.play);assert.equal(f.pause.disabled,true);
});
test('automatic completion preserves unrelated focus',()=>{
 const f=fixture();f.play.focus();f.sync(true);f.other.focus();f.sync(false);assert.equal(f.active(),f.other);
});
test('completion with stop focused transfers to play',()=>{
 const f=fixture();f.play.focus();f.sync(true);f.sync(false);assert.equal(f.active(),f.play);
});
test('live reduced motion transfers disabled stop to reset without enabling play',()=>{
 const f=fixture();f.play.focus();f.sync(true);f.sync(false,true);assert.equal(f.active(),f.reset);assert.equal(f.play.disabled,true);assert.equal(f.pause.disabled,true);
});
test('reduced motion while play focused transfers to reset',()=>{
 const f=fixture();f.play.focus();f.sync(false,true);assert.equal(f.active(),f.reset);
});
test('no unrelated focus theft on start, stop or motion change',()=>{
 const f=fixture();f.other.focus();f.sync(true);f.sync(false);f.sync(false,true);f.sync(false,false);assert.equal(f.active(),f.other);
});
