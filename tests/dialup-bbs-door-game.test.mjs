import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnsiTerminal } from '../public/dialup-bbs/ansi-terminal.mjs';
import { advanceDoorDay, callerScores, clearDoorSave, createDoorSession, DOOR_STORAGE_KEY, doorWire, makeAdventurer,
  playDoorCommand, readDoorSave, validateAdventurer, writeDoorSave } from '../public/dialup-bbs/door-game-model.mjs';

const adventurer=()=>makeAdventurer('SABLE');
function enter(s, ...args) {
  const p=s.admit(...args);
  assert.equal(p.accepted,true);
  return s.commit(p.id);
}

test('BBS opens the door, registers a preset alias, exits and re-enters the same game',()=>{
  const s=createDoorSession();
  assert.equal(s.snapshot().phase,'bbs');
  assert.equal(enter(s,'enter',null,2400).phase,'registration');
  assert.equal(s.admit('register','real name',2400).code,'wrong-phase');
  assert.deepEqual(enter(s,'register','SABLE',2400).state,adventurer());
  assert.equal(enter(s,'command','Q',2400).phase,'bbs');
  const resume=enter(s,'enter',null,2400);
  assert.equal(resume.code,'resume');
  assert.deepEqual(resume.state,adventurer());
});

test('combat, rest, purchase and the kit have an exact hand-calculated result',()=>{
  let s=adventurer();
  s=playDoorCommand(s,'E').state;
  assert.equal(s.encounter,1);
  const fight=playDoorCommand(s,'F');
  assert.equal(fight.code,'victory');
  assert.deepEqual(fight.state,{...adventurer(),turns:4,hp:12,gold:18,xp:8,roll:1});
  const rest=playDoorCommand(fight.state,'R');
  assert.equal(rest.state.hp,18);
  const buy=playDoorCommand(rest.state,'B');
  assert.deepEqual([buy.state.turns,buy.state.gold,buy.state.supplies],[2,14,1]);
  const use=playDoorCommand({...buy.state,hp:9},'U');
  assert.deepEqual([use.state.turns,use.state.hp,use.state.supplies],[1,15,0]);
});

test('defeat costs one action and no imaginary loot; can recover after defeat',()=>{
  const s={...adventurer(),hp:1,encounter:1};
  const fail=playDoorCommand(s,'F');
  assert.equal(fail.code,'retreat');
  assert.deepEqual([fail.state.hp,fail.state.turns,fail.state.gold,fail.state.xp,fail.state.encounter],[0,5,12,0,null]);
  assert.equal(playDoorCommand(fail.state,'E').code,'exhausted');
  const recover=playDoorCommand(fail.state,'R');
  assert.deepEqual([recover.state.hp,recover.state.turns],[7,4]);
});

test('turn depletion blocks action but not rank, help or exit; next day refills, retains score and models other callers',()=>{
  const s={...adventurer(),turns:0,gold:20,hp:3,xp:4,encounter:2};
  const denied=playDoorCommand(s,'E');
  assert.equal(denied.code,'turn-limit');
  assert.strictEqual(denied.state,s);
  for(const cmd of ['L','H','Q'])assert.strictEqual(playDoorCommand(s,cmd).state,s);
  const next=advanceDoorDay(s);
  assert.deepEqual(next.state,{...adventurer(),day:2,gold:20,xp:4});
  assert.match(next.lines[0],/DAY 2: WREN/);
  assert.deepEqual(callerScores(next.state),[['WREN',20],['LARCH',14],['TARN',11],['SABLE',4]]);
});

test('wrong-phase requests, malformed commands, repeat encounter and unaffordable transactions do not mutate',()=>{
  const s=adventurer();
  for(const [raw,code] of [['<x>','invalid'],['T','invalid'],['F','no-encounter'],['U','cannot-use'],['R','full-hp']]){
    const r=playDoorCommand(s,raw);
    assert.equal(r.code,code);
    assert.strictEqual(r.state,s);
  }
  const e=playDoorCommand(s,'E').state;
  for(const c of ['E','R','B']) assert.strictEqual(playDoorCommand(e,c).state,e);
  for(const data of [{gold:3},{supplies:9}]){
    const poor={...s,...data};assert.strictEqual(playDoorCommand(poor,'B').state,poor);
  }
  assert.equal(createDoorSession(s).admit('command','E',2400).code,'wrong-phase');
});

test('start rejects duplicates; game updates once at last byte; stale completion and abort cannot mutate',()=>{
  const s=createDoorSession(adventurer());
  enter(s,'enter',null,2400);
  const p=s.admit('command','E',300);
  assert.equal(p.accepted,true);
  assert.equal(s.admit('command','E',300).code,'busy');
  assert.deepEqual(s.snapshot().state,adventurer());
  assert.equal(s.commit(p.id).state.turns,5);
  assert.equal(s.commit(p.id).committed,false);
  const q=s.admit('command','F',300);
  s.abort();
  assert.equal(s.commit(q.id).committed,false);
  assert.equal(s.snapshot().state.turns,5);
  const next=s.admit('command','F',300);
  assert.notEqual(q.id,next.id);
  assert.equal(s.commit(next.id).state.turns,4);
});

test('300/9600 alter only 8N1 timeline, not serial bytes, state or turn cost',()=>{
  const games=[300,9600].map(speed=>{
    const s=createDoorSession(adventurer());
    enter(s,'enter',null,speed);
    const p=s.admit('command','E',speed);
    const bytes=p.wire.tx.length+p.wire.rx.length;
    assert.ok(Math.abs(p.wire.totalMs-(120+10000*bytes/speed))<1e-6);
    assert.equal(p.wire.events[0].kind,'tx');
    assert.equal(p.wire.events.at(-1).kind,'rx');
    assert.deepEqual(p.wire.tx,[69,13]);
    assert.equal(p.wire.rx[0],27);
    return { ...s.commit(p.id), wire:p.wire };
  });
  assert.deepEqual(games[0].state,games[1].state);
  assert.deepEqual(games[0].wire.rx,games[1].wire.rx);
  assert.ok(games[0].wire.totalMs>games[1].wire.totalMs);
});

test('shared ANSI engine retains incomplete CSI and displays full replies without diagnostics',()=>{
  const t=createAnsiTerminal({columns:40,rows:8});
  const {rx}=doorWire('E',['A TEST LINE'],2400);
  t.feed(rx.slice(0,1));
  assert.equal(t.snapshot().pending,true);
  for(const b of rx.slice(1))t.feed([b]);
  const result=t.snapshot();
  assert.equal(result.pending,false);
  assert.equal(result.cells[0].map(c=>c.char).join('').trim(),'A TEST LINE');
  assert.equal(result.diagnostics.length,0);
  assert.equal(result.commands.length,2);
});

test('scoped save and clear preserve unrelated data; invalid, unknown and oversized saves are refused',()=>{
  const map=new Map([['another:exhibit','original']]);
  const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  assert.deepEqual(readDoorSave(storage),{status:'empty',state:null});
  assert.equal(writeDoorSave(storage,adventurer()),'saved');
  assert.deepEqual(readDoorSave(storage),{status:'loaded',state:adventurer()});
  for(const invalid of ['bad','{"version":9}',JSON.stringify({...adventurer(),turns:-1}),JSON.stringify({...adventurer(),roll:99}),'x'.repeat(513)]){
    map.set(DOOR_STORAGE_KEY,invalid);
    assert.deepEqual(readDoorSave(storage),{status:'invalid',state:null});
    assert.equal(map.get(DOOR_STORAGE_KEY),invalid);
  }
  assert.equal(clearDoorSave(storage),'empty');
  assert.deepEqual([...map],[['another:exhibit','original']]);
});

test('failed storage does not stop the in-memory game and bad save shape is rejected',()=>{
  const fail=()=>{throw new Error('unavailable storage');};
  const storage={getItem:fail,setItem:fail,removeItem:fail};
  assert.deepEqual(readDoorSave(storage),{status:'memory-only',state:null});
  assert.equal(writeDoorSave(storage,adventurer()),'memory-only');
  assert.equal(clearDoorSave(storage),'memory-only');
  assert.throws(()=>writeDoorSave(storage,{...adventurer(),unknown:'x'}),TypeError);
  assert.equal(validateAdventurer({...adventurer(),turns:1,roll:5}),true);
  const session=createDoorSession();
  enter(session,'enter',null,300);
  const created=enter(session,'register','FERN',300);
  assert.equal(writeDoorSave(storage,created.state),'memory-only');
  assert.equal(enter(session,'command','E',300).state.turns,5);
});
