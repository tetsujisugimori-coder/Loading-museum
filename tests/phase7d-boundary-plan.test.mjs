import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundaryPlan, boundaryTargets} from '../scripts/phase7d-boundary-plan.mjs';

test('fixed 108 unique trials with exactly balanced group positions', () => {
  const plan = boundaryPlan();
  assert.equal(plan.length, 108);
  assert.equal(new Set(plan.map(x => x.id)).size, 108);
  for (const [engine, count] of [['webkit', 12], ['chromium', 6]]) {
    for (const kind of ['swipe', 'status']) {
      const rows = plan.filter(x => x.engine === engine && x.case === kind);
      assert.equal(rows.length, count * 3);
      for (const group of ['A', 'B', 'C']) {
        assert.equal(rows.filter(x => x.group === group).length, count);
        for (let position = 0; position < 3; position++) {
          assert.equal(rows.filter((x, i) => i % 3 === position && x.group === group).length, count / 3);
        }
      }
    }
  }
});
test('fixed target deadlines and oracle', () => {
  assert.deepEqual(boundaryTargets.swipe, {width: 765, height: 1000, motion: 'no-preference', advance: 500, expected: 'dismissed'});
  assert.deepEqual(boundaryTargets.status, {width: 375, height: 1000, motion: 'no-preference', advance: 3000, expected: 'Error'});
});
test('engine selection is explicit and rejects duplicate or unknown engines', () => {
  assert.equal(boundaryPlan(['webkit']).length, 72);
  assert.equal(boundaryPlan(['chromium']).length, 36);
  for (const engines of [[], ['webkit', 'webkit'], ['firefox']]) assert.throws(() => boundaryPlan(engines));
});
