import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAnsiTerminal,describeAttribute} from '../public/dialup-bbs/ansi-terminal.mjs';
import {artBytes,frameBytes,grid,targetFrames,compileTimeline,timelineAt,dwellMs,attributeSample,speeds} from '../public/dialup-bbs/ansi-scenarios.mjs';

const encode=s=>new TextEncoder().encode(s);
const terminal=()=>createAnsiTerminal({columns:5,rows:3});
test('CSI split at every byte, positions, attribute and logged byte offset',()=>{
 const src=encode('\x1b[2;3H\x1b[1;31;44mX');
 const canonical=terminal();canonical.feed(src);
 for(let i=0;i<=src.length;i++){
  const t=terminal();t.feed(src.slice(0,i));t.feed(src.slice(i));
  assert.deepEqual(t.snapshot(),canonical.snapshot(),String(i));
 }
 const s=canonical.snapshot();
 assert.deepEqual(s.cells[1][2],{char:'X',attr:0x1c});
 assert.deepEqual(s.commands.map(c=>c.offset),[6,16]);
 assert.equal(s.writes,1);assert.equal(s.bytes,src.length);
});
test('cursor overwrite, clamping, ED2 retains cursor and clears cells',()=>{
 const t=terminal();t.feed(encode('ABC\x1b[1;2HZ'));
 assert.equal(t.snapshot().cells[0].map(c=>c.char).join(''),'AZC  ');
 t.feed(encode('\x1b[991;999H!'));
 assert.equal(t.snapshot().cells[2][4].char,'!');
 t.feed(encode('\x1b[1D\x1b[2J'));
 assert.deepEqual(t.snapshot().cursor,{x:4,y:2});
 assert.ok(t.snapshot().cells.flat().every(c=>c.char===' '&&c.attr===7));
 assert.equal(t.snapshot().erasures,15);
});
test('unknown and malformed sequences consume bytes without partial attribute change',()=>{
 const t=terminal();
 t.feed(encode('\x1b[31;999mX\x1b[?12hY\x1b[9999999999999999999999999999999999999999HZ\x1b['));
 const s=t.snapshot();
 assert.equal(s.cells[0].slice(0,3).map(c=>c.char).join(''),'XYZ');
 assert.equal(s.attr,7);assert.ok(s.pending);assert.equal(s.diagnostics.length,3);
 assert.throws(()=>t.feed([256]),/byte/);
});
test('all four speeds include CSI and use 10 bits per delivered byte, same final grid',()=>{
 const bytes=artBytes();
 const final=compileTimeline([bytes],2400).events.at(-1).state.cells;
 for(const bps of speeds){
  const a=compileTimeline([bytes],bps);
  assert.equal(a.duration,bytes.length*10*1000/bps);
  assert.ok(a.total>a.events.at(-1).state.writes);
  assert.equal(timelineAt(a,a.duration-0.001).state.bytes,bytes.length-1);
  assert.deepEqual(timelineAt(a,a.duration).state.cells,final);
 }
});
test('full and diff match target including attributes at all frame ends, different wire costs',()=>{
 const full=compileTimeline(frameBytes('full'),2400,{hold:dwellMs});
 const diff=compileTimeline(frameBytes('diff'),2400,{hold:dwellMs});
 assert.ok(full.total>diff.total);assert.ok(full.wireMs>diff.wireMs);
 for(const [n,target] of targetFrames().entries()){
  for(const f of [full,diff]){
   const state=timelineAt(f,f.ends[n].atMs).state;
   assert.deepEqual(state.cells,target.map(r=>r.map(({char,attr})=>({char,attr}))));
   assert.equal(state.bytes,f.ends[n].bytes);assert.ok(state.diagnostics.length===0);
  }
 }
 assert.equal(diff.ends[0].bytes,full.ends[0].bytes);
 assert.ok(timelineAt(full,full.duration).state.erasures>timelineAt(diff,diff.duration).state.erasures);
 assert.ok(Math.abs(full.duration-full.wireMs-(full.ends.length-1)*dwellMs)<1e-9);
});
test('all 256 identical bytes preserve foreground and change only bit7 interpretation',()=>{
 for(let a=0;a<256;a++){
  assert.deepEqual(describeAttribute(a,'blink'),{foreground:a%16,background:Math.floor(a/16)%8,blink:a>=128});
  assert.deepEqual(describeAttribute(a,'bright'),{foreground:a%16,background:Math.floor(a/16),blink:false});
 }
 assert.equal(attributeSample[1].attr,0x9f);
 assert.throws(()=>describeAttribute(-1));assert.throws(()=>describeAttribute(7,'invalid'));
});

test('only one clock, paused callback cannot paint or enqueue, resume does not catch up',async()=>{
 const {createPlaybackClock}=await import('../public/dialup-bbs/ansi-playback.mjs');
 let next=1;
 const pending=new Map(),deltas=[];
 const clock=createPlaybackClock({request:f=>{const id=next++;pending.set(id,f);return id;},cancel:id=>pending.delete(id)});
 function pulse(now){assert.equal(pending.size,1);const [id,f]=pending.entries().next().value;pending.delete(id);f(now);}
 assert.equal(clock.start(x=>deltas.push(x)),true);
 assert.equal(clock.start(()=>assert.fail('duplicate callback')),false);
 pulse(100);pulse(125);assert.deepEqual(deltas,[0,25]);
 const stale=pending.values().next().value;
 clock.stop();assert.equal(pending.size,0);stale(500);assert.deepEqual(deltas,[0,25]);
 clock.start(x=>{deltas.push(x);if(x)clock.stop();});
 pulse(1000);pulse(1040);
 assert.deepEqual(deltas,[0,25,0,40]);assert.equal(pending.size,0);
 // A route change calls stop + prepare: prior callback cannot render to a new work.
 clock.start(()=>assert.fail('stale work wrote'));
 const prior=pending.values().next().value;
 clock.stop();clock.start(x=>deltas.push(x));prior(1100);
 pulse(1101);assert.equal(deltas.at(-1),0);
});
