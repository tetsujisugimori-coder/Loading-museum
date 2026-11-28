import assert from 'node:assert/strict';
import test from 'node:test';
import { ansiComparisonBytes, createRipStream, hitRipRegion, MENU_CHOICES, modelMilliseconds, parseRipCommand, ripDemoBytes, RIP_LIMITS } from '../public/dialup-bbs/ripscrip.mjs';
import { createAnsiTerminal } from '../public/dialup-bbs/ansi-terminal.mjs';

const data = v=>new TextEncoder().encode(v);
function stream(text) {
  const decoder = createRipStream();
  decoder.feed(typeof text === 'string' ? data(text) : text);
  decoder.finish();
  return decoder.snapshot();
}

test('1.54 commands decode two-column base 36, preserving draw and fill states',()=>{
  assert.deepEqual(parseRipCommand('L00010A0E'),{op:'L',values:[0,1,10,14]});
  assert.deepEqual(parseRipCommand('C1E180M'),{op:'C',values:[50,44,22]});
  assert.deepEqual(parseRipCommand('P03010105090905'),{op:'P',values:[1,1,5,9,9,5]});
  const {draws} = stream('!|c0E|S0103|L00010A0E|R00010A0E|B00010A0E|p03010105050909|@0011HELLO\r\n');
  assert.deepEqual(draws.map(d=>[d.op,d.color,d.fill??null]),[['L',14,null],['R',14,null],['B',3,null],['p',14,3],['@',14,null]]);
  assert.equal(draws.at(-1).text,'HELLO');
});

test('every possible split including marker, command, escapes and CRLF preserves stream semantics',()=>{
  const bytes=ripDemoBytes();
  const expected=stream(bytes);
  assert.equal(expected.accepted,102); assert.equal(expected.draws.length,69);
  assert.equal(expected.recent.every(e=>e.kind==='accepted'),true);
  for(let split=0;split<=bytes.length;split++){
    const reader=createRipStream();
    reader.feed(bytes.subarray(0,split)); reader.feed(bytes.subarray(split)); reader.finish();
    assert.deepEqual(reader.snapshot(),expected,'split '+split);
  }
  const reader=createRipStream();
  for(const byte of data('!|@0011A\\|B\\!C\\\\D\r\n')) reader.feed(Uint8Array.of(byte));
  reader.finish(); assert.equal(reader.snapshot().draws[0].text,'A|B!C\\D');
});

test('normal prose is not executed; malformed, truncated and unsupported input does not draw',()=>{
  for(const sequence of ['text !|X0000\n','!x|X0000\n','!|Z0000\n','!|L0B0M\n','!|L0000000a\n','!|X0000','!|cZZ\n','!|S0201\n','!|@0000ABC\\?\n','!|@0000ABC\\\n','!|LZZ000000\n','!|C000000\n','!|P020000ZZ00\n']){
    assert.equal(stream(sequence).draws.length,0,JSON.stringify(sequence));
  }
  assert.equal(stream('!|XZZ00|X0000\n').draws.length,1);
  assert.equal(stream('!|X0000\x1b\n!|X0001\n').draws.length,1);
  assert.equal(stream('!|X0000|*\n').draws.length,0);
});

test('resource caps and error recovery do not retain unbounded geometry',()=>{
  const limit = stream('!|@0000'+'a'.repeat(RIP_LIMITS.token)+'\n!|X0000\n');
  assert.equal(limit.draws.length,1);
  assert.ok(limit.recent.some(e=>e.reason==='token-limit'));
  const count = stream('!|X0000\n'.repeat(RIP_LIMITS.commands+5));
  assert.equal(count.halted,true); assert.equal(count.draws.length,RIP_LIMITS.commands);
  const wireCap = stream(' '.repeat(RIP_LIMITS.bytes+1));
  assert.equal(wireCap.halted,true); assert.equal(wireCap.bytes,RIP_LIMITS.bytes);
  const field = '!|1M00001122330000000A^M\n';
  const regionCap = stream(field.repeat(RIP_LIMITS.regions+1));
  assert.equal(regionCap.regions.length,RIP_LIMITS.regions);
  assert.ok(regionCap.recent.some(e=>e.reason==='region-limit'));
});

test('canonical 1M binds displayed field, last overlapping region wins, keyboard shares only intended simulated responses',()=>{
  const fields=stream(ripDemoBytes()).regions;
  assert.deepEqual(fields.map(r=>r.response),MENU_CHOICES.map(c=>c.response));
  assert.equal(hitRipRegion(fields,40,163)?.response,'B\r');
  assert.equal(hitRipRegion(fields,305,216)?.response,'B\r');
  assert.equal(hitRipRegion(fields,306,216),null);
  assert.equal(hitRipRegion(fields,NaN,200),null);
  assert.equal(hitRipRegion(fields,-1,200),null);
  assert.equal(hitRipRegion([...fields,{...fields[0],response:'Z'}],100,190)?.response,'Z');
  assert.equal(stream('!|1M00001122331000000A^M\n').regions.length,0);
});

test('fixed 8N1 model and actual ANSI/RIP byte streams compare identical actions, not identical graphics',()=>{
  assert.equal(modelMilliseconds(30,300),1000);
  assert.equal(modelMilliseconds(120,1200),1000);
  assert.equal(modelMilliseconds(240,2400),1000);
  assert.equal(modelMilliseconds(960,9600),1000);
  assert.throws(()=>modelMilliseconds(1,0),RangeError);
  assert.throws(()=>modelMilliseconds(-1,9600),RangeError);
  const ansi=createAnsiTerminal({columns:44,rows:11});
  ansi.feed(ansiComparisonBytes());
  const cells=ansi.snapshot().cells.map(row=>row.map(cell=>cell.char).join('')).join('\n');
  for(const choice of MENU_CHOICES) assert.ok(cells.includes(choice.display));
  assert.equal(ansi.snapshot().diagnostics.length,0);
  assert.equal(ansi.snapshot().bytes,261);
  assert.equal(ripDemoBytes().length,915);
});
