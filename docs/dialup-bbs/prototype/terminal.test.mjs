import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivals, decode, terminal, scrollTimeline, snapshot, scenarios} from './terminal.mjs';
const chars = s => s.decoded.map(e => e.char).join('');
const ascii = s => Array.from(s, (char, atMs) => ({char, atMs}));
for (const bps of [300, 1200, 2400]) {
  for (const frame of [{dataBits: 8, parity: 'none'}, {dataBits: 7, parity: 'even'}]) {
    test(`100 bytes ${bps} ${frame.dataBits}`, () => {
      const events = arrivals(Array(100).fill(65), {bps, ...frame});
      assert.equal(events.at(-1).atMs, 1000000 / bps);
      assert.equal(events[0].atMs, 10000 / bps);
    });
  }
}
test('03 boundary and deterministic replay', () => {
  const s = scenarios['03'];
  assert.equal(chars(snapshot(s, 0)), '');
  assert.equal(chars(snapshot(s, 10000 / 300)), 'A');
  assert.equal(chars(snapshot(s)), 'ABC');
  assert.deepEqual(snapshot(s, 0), snapshot(s, 0));
});
test('04 split ISO-2022-JP escape and character pairs', () => {
  const s = scenarios['04']; const wire = arrivals(s.bytes, s.transport);
  for (const [i, expected] of [[0,'A'],[1,'A'],[2,'A'],[3,'A'],[4,'A'],[5,'A日'],[6,'A日'],[7,'A日本'],[8,'A日本'],[9,'A日本'],[10,'A日本'],[11,'A日本B']]) {
    assert.equal(chars(snapshot(s, wire[i].atMs)), expected);
  }
  assert.deepEqual(snapshot(s).cells[0], ['A','日',null,'本',null,'B',' ',' ']);
});
test('Shift_JIS split bytes', () => {
  const wire = arrivals([0x93,0xfa], {bps: 300});
  assert.deepEqual(decode(wire, 'shift_jis'), [{char:'日',atMs:wire[1].atMs}]);
});
test('invalid byte, incomplete sequence, unsupported control and invalid grid rejected', () => {
  assert.throws(() => arrivals([128], {bps: 300, dataBits: 7}));
  assert.throws(() => arrivals([65], {bps: 0}));
  assert.throws(() => decode(arrivals([0x93], {bps: 300}), 'shift_jis'));
  assert.throws(() => decode(arrivals([27,36], {bps: 300}), 'iso-2022-jp'));
  assert.throws(() => terminal(ascii('\x1b')));
  assert.throws(() => terminal([], {columns:1,rows:2}));
});
test('CR LF BS TAB wrap and wide overwrite', () => {
  assert.deepEqual(terminal(ascii('AB\rC\nD'), {columns:4,rows:2}).cells, [['C','B',' ',' '],[' ','D',' ',' ']]);
  assert.deepEqual(terminal(ascii('AB\bC'), {columns:4,rows:1}).cells[0], ['A','C',' ',' ']);
  assert.equal(terminal(ascii('A\tB'), {columns:10,rows:1}).cells[0][8], 'B');
  assert.deepEqual(terminal(ascii('ABC日'), {columns:4,rows:2}).cells[1], ['日',null,' ',' ']);
  assert.deepEqual(terminal(ascii('日\rA'), {columns:4,rows:1}).cells[0], ['A',' ',' ',' ']);
});
test('05 line scroll, queued smooth presentation and unchanged logical grid', () => {
  const state = snapshot(scenarios['05']); const original = structuredClone(state);
  assert.deepEqual(state.cells.map(row => row.join('').trim()), ['THREE','FOUR']);
  assert.equal(state.scrolls.length, 2);
  const jump = scrollTimeline(state.scrolls,'jump'); const smooth = scrollTimeline(state.scrolls,'smooth');
  assert.equal(jump[0].startMs, jump[0].endMs);
  assert.ok(Math.abs(smooth[0].endMs-smooth[0].startMs-1000/6)<1e-9);
  assert.equal(smooth[1].startMs, smooth[0].endMs);
  assert.deepEqual(state, original);
});
test('transport speed changes times only, not final decoded data or grid', () => {
  for (const s of Object.values(scenarios)) {
    const a = snapshot(s); const b = snapshot({...s,transport:{...s.transport,bps:1200}});
    assert.equal(chars(a),chars(b)); assert.deepEqual(a.cells,b.cells);
  }
});
