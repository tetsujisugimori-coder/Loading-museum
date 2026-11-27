import assert from 'node:assert/strict';
import test from 'node:test';
import {CONTROLS,BOARDS,applyEvent,fileBytes,ledState,packet,plan,simulator,validPacket} from '../public/dialup-bbs/communications.mjs';
import {eventClock} from '../public/dialup-bbs/communications-clock.mjs';
const opts=(options={})=>({rate:2400,outcome:'normal',fault:'none',patrolMode:'auto',boards:[0,1,2],patrolFault:'none',...options});
const finish=s=>{while(s.step()){};return s.snapshot();};
test('deny illegal and unconnected success',()=>{
 const s=simulator('10',opts()).snapshot();
 assert.throws(()=>applyEvent(s,{state:'online',tx:[],rx:[],at:0}),/Illegal transition/);
 assert.throws(()=>applyEvent(s,{tx:[1],rx:[],at:0}),/active stage/);
 assert.throws(()=>plan('10',opts({outcome:'forged'})),RangeError);
 assert.throws(()=>plan('10',opts({rate:0})),RangeError);
});
test('protocol effects cannot commit in the wrong phase',()=>{
 const s=simulator('10',opts());s.step();const connection=s.snapshot();
 const transfer=plan('11',opts());
 assert.throws(()=>applyEvent(connection,transfer[2]),/Illegal effect for stage: confirm \/ initializing/);
 const patrol=plan('12',opts()).find(e=>e.effect?.type==='save');
 assert.throws(()=>applyEvent(connection,patrol),/Illegal effect for stage: save \/ initializing/);
 const t=simulator('11',opts());t.step();t.step();
 assert.throws(()=>applyEvent(t.snapshot(),{...transfer[2],rx:[21]}),/Illegal effect for stage: confirm \/ transfer/);
 assert.equal(t.snapshot().accepted.length,0);
 const corrupted=simulator('11',opts({fault:'once'}));for(let i=0;i<4;i++)corrupted.step();
 assert.throws(()=>applyEvent(corrupted.snapshot(),transfer[4]),/Illegal effect for stage: confirm \/ transfer/);
 assert.equal(corrupted.snapshot().accepted.length,128);
 assert.throws(()=>applyEvent(t.snapshot(),transfer.at(-1)),/cannot complete before EOT/);
});
test('Courier seven lamps and data signals follow the event',()=>{
 const s=simulator('09',opts()), initial=ledState(s.snapshot());
 assert.deepEqual(initial,{HS:false,AA:false,CD:false,RD:false,SD:false,TR:true,MR:true});
 s.step();assert.deepEqual(ledState(s.snapshot()),{...initial,SD:true,RD:true});
 for(let i=0;i<6;i++)s.step();
 assert.deepEqual(ledState(s.snapshot()),{...initial,HS:true,CD:true,SD:true});
 s.step();assert.deepEqual(ledState(s.snapshot()),{...initial,HS:true,CD:true,RD:true});
 s.step();assert.deepEqual(ledState(s.snapshot()),{...initial,HS:true,CD:true,TR:false});
 const end=finish(s);
 assert.deepEqual(ledState(end),{...initial,HS:true,TR:false});
});
test('AT connection and DTR in correct order, failures are not online',()=>{
 const s=simulator('10',opts()), trace=[];
 while(s.step())trace.push(s.snapshot().state);
 assert.deepEqual(trace,['initializing','ready','dialing','calling','negotiating','online','disconnecting','offline','done']);
 assert.match(s.snapshot().terminal,/> AT\r\nOK\r\n> ATV1X7&D2/);
 assert.match(s.snapshot().terminal,/CONNECT 28800[\s\S]*NO CARRIER/);
 for(const [outcome,code] of [['busy','BUSY'],['carrier','NO CARRIER'],['dialtone','NO DIAL TONE']]){
  const s=simulator('10',opts({outcome}));let end;assert.doesNotThrow(()=>{end=finish(s);});
  assert.equal(end.state,'failed');assert.ok(end.terminal.endsWith(code+'\r\n'));
  assert.ok(!end.terminal.includes('CONNECT'));assert.equal(end.highSpeed,false);
  assert.equal(s.retry(),true);assert.equal(s.snapshot().state,'idle');
 }
});
test('checksum byte and block complement XMODEM',()=>{
 const data=Array(128).fill(0);data[0]=255;data[1]=2;const f=packet(1,data);
 assert.deepEqual(f.slice(0,5),[1,1,254,255,2]);assert.equal(f.length,132);assert.equal(f[131],1);
 assert.ok(validPacket(f,1));assert.equal(validPacket(f,2),false);
 f[3]^=1;assert.equal(validPacket(f,1),false);
 for(const invalid of [Array(128).fill(-1),Array(127).fill(1)])assert.throws(()=>packet(1,invalid),RangeError);
 assert.deepEqual(CONTROLS,{SOH:1,EOT:4,ACK:6,NAK:21,CAN:24});
});
test('bad block does not advance; unique blocks and 8N1 wire accounting',()=>{
 const plain=finish(simulator('11',opts()));const r=simulator('11',opts({fault:'once'}));
 for(let i=0;i<5;i++)r.step();
 assert.equal(r.snapshot().accepted.length,128);
 const recovered=finish(r);
 assert.deepEqual(recovered.accepted,fileBytes());assert.deepEqual(recovered.accepted,plain.accepted);
 assert.deepEqual(recovered.confirmed,[1,2,3]);
 assert.equal(plain.tx,397);assert.equal(plain.rx,5);assert.equal(plain.tx+plain.rx,402);
 assert.equal(recovered.tx+recovered.rx,535);assert.equal(recovered.sentUseful,512);assert.equal(recovered.retries,1);
 const bad=finish(simulator('11',opts({fault:'repeat'})));assert.equal(bad.state,'failed');assert.equal(bad.accepted.length,128);assert.equal(bad.attempts,4);assert.equal(bad.tx+bad.rx,533);
 const fast=finish(simulator('11',opts({rate:9600})));
 assert.ok(Math.abs((plain.elapsed-fast.elapsed)-402*10000*(1/2400-1/9600))<.00001);
 const first=plan('11',opts());
 assert.deepEqual(first[0].rx,[21]);assert.deepEqual(first.at(-2).tx,[4]);assert.deepEqual(first.at(-1).rx,[6]);
});
test('confirming an already accepted block cannot duplicate bytes',()=>{
 const s=simulator('11',opts());s.step();s.step();s.step();
 const once=s.snapshot();
 const stale=applyEvent(once,plan('11',opts())[2]);
 assert.equal(stale.accepted.length,128);assert.deepEqual(stale.confirmed,[1]);
});
test('patrol stops on failure, retry preserves early logs without duplicating them',()=>{
 const p=simulator('12',opts({patrolFault:'board'}));
 const before=finish(p);assert.equal(before.state,'failed');
 assert.deepEqual(before.saved.map(x=>x.title),[BOARDS[0]]);
 assert.equal(p.retry(),true);
 const end=finish(p);assert.equal(end.state,'done');assert.deepEqual(end.saved.map(x=>x.title),BOARDS);
 assert.equal(end.log.filter(e=>e.label.includes('掲示板選択：お知らせ')).length,1);
 assert.ok(end.elapsed>before.elapsed);assert.equal(end.log.some(e=>e.label.includes('オフライン')),true);
 assert.throws(()=>plan('12',opts({boards:[]})),RangeError);
 const manual=simulator('12',opts({patrolMode:'manual'}));assert.equal(manual.start(),false);
 assert.deepEqual(finish(manual).saved,finish(simulator('12',opts())).saved);
});
test('simulator guards multiple starts, cancellation, complete reset',()=>{
 const s=simulator('10',opts());
 assert.equal(s.start(),true);assert.equal(s.start(),false);s.pause();assert.equal(s.snapshot().playing,false);
 assert.equal(s.start(),true);s.step();assert.equal(s.cancel(),true);assert.equal(s.step(),false);assert.equal(s.snapshot().playing,false);assert.equal(s.snapshot().state,'cancelled');assert.ok(s.snapshot().elapsed>0);
 s.reset();assert.deepEqual(s.snapshot(),simulator('10',opts()).snapshot());
});
test('event clock denies duplicate timers and stale work after stopping',()=>{
 const queue=[];
 const c=eventClock({schedule:(f,ms)=>{queue.push({f,ms});return queue.length;},unschedule:()=>{}});
 let fired=0;
 const opts={nextDelay:()=>fired<2?80:null,onEvent:()=>fired++};
 assert.equal(c.start(opts),true);assert.equal(c.start(opts),false);
 assert.equal(queue.length,1);assert.equal(queue[0].ms,80);
 c.stop();queue[0].f();assert.equal(fired,0);
 c.start(opts);queue[1].f();assert.equal(fired,1);assert.equal(queue.length,3);
 queue[2].f();assert.equal(fired,2);assert.equal(queue.length,3);
});
