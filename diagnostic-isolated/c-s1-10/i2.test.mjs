import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { instrumentSwipeI1, instrumentSwipeI2 } from "./i1-probe.mjs";
import {
  createI1Recorder, createI2Recorder, diagnoseI1, i2RecorderInitSource, orderFromS1DriverMarks,
} from "./i1-timing.mjs";

const source = readFileSync(new URL("../../app/components/interactive-motion/GestureExhibits.tsx", import.meta.url), "utf8");
const slotId = "AP-01-I1";
const streamId = "slot-stream";
const generation = 7;
const primary = { slotId, generation, state: "dismissing" };
const calls = { slotId, generation, primaryCallId: "call@30", followupCallId: "call@32" };

function driverMark(recorder, id, activeGeneration = generation) {
  recorder.mark("driverTargetMarked", activeGeneration, null, activeGeneration, id);
}

test("I1 listens for the existing driver mark without synchronous DOM reads", () => {
  const i1 = instrumentSwipeI1(source);
  assert.equal([...i1.matchAll(/\.getAttribute\(/g)].length, [...source.matchAll(/\.getAttribute\(/g)].length);
  assert.match(i1, /target\.addEventListener\('__playwright_mark_target__',onTargetMark\)/);
  assert.match(i1, /if\(event\.target!==target\)return/);
  assert.doesNotMatch(i1, /\bnew MutationObserver/);
});

test("I2 reads state only at target commit and mutation delivery, and cleans up observers", () => {
  const i1 = instrumentSwipeI1(source), i2 = instrumentSwipeI2(source);
  assert.equal([...i2.matchAll(/\.getAttribute\(/g)].length - [...i1.matchAll(/\.getAttribute\(/g)].length, 2);
  assert.match(i2, /recordSwipeI1\('domStateAtCommit',epoch\.current,root\.current\?\.getAttribute\('data-state'\)\?\?null\)/);
  assert.match(i2, /stateAtDelivery=target\.getAttribute\('data-state'\)/);
  assert.match(i2, /recordSwipeI1\('domMutationDelivered',generation,stateAtDelivery,generation,record\.oldValue\)/);
  assert.match(i2, /attributeFilter:\['data-state'\],attributeOldValue:true/);
  assert.match(i2, /if\(event\.target!==card\|\|\(event\.propertyName!=='transform'&&event\.propertyName!=='opacity'\)\)return/);
  assert.match(i2, /observer\.disconnect\(\);for\(const type of events\)card\.removeEventListener\(type,onTransition\)/);
  assert.equal([...i2.matchAll(/\bawait\b/g)].length, [...source.matchAll(/\bawait\b/g)].length);
});

test("I2 recorder retains the state at delivery and old attribute value separately", () => {
  const context = vm.createContext({});
  vm.runInContext(i2RecorderInitSource("AP-01-I2", streamId), context);
  const recorder = context.__lm88StageCI1;
  recorder.mark("domMutationDelivered", generation, "dismissed", generation, "idle");
  recorder.mark("domMutationDelivered", generation, "dismissed", generation, "dismissing");
  const transition = ["transitionend", "transform", 0.24];
  recorder.mark("transitionDelivered", generation, null, generation, transition);
  transition[2] = 4;
  const snapshot = JSON.parse(JSON.stringify(recorder.finish()));
  assert.deepEqual(snapshot.events.map(x => [x.kind, x.state, x.detail]), [
    ["domMutationDelivered", "dismissed", "idle"],
    ["domMutationDelivered", "dismissed", "dismissing"],
    ["transitionDelivered", null, ["transitionend", "transform", 0.24]],
  ]);
  assert.equal(snapshot.level, "I2");
  assert.equal(snapshot.complete, true);
});

test("I1 rejects I2-only events and I2 shares the single 4096-mark cap", () => {
  const i1 = createI1Recorder(slotId, streamId);
  i1.mark("domStateAtCommit", generation, "dismissed");
  assert.equal(i1.finish().complete, false);
  const i2 = createI2Recorder("AP-01-I2", streamId);
  i2.mark("updateRequested", generation, "dismissing");
  for (let i = 1; i < 4096; i++) i2.mark("domStateAtCommit", generation, "dismissing");
  i2.mark("domMutationDelivered", generation, "dismissed", generation, "dismissing");
  const trace = i2.finish();
  assert.equal(trace.events.length, 4096);
  assert.equal(trace.firstLost, 4097);
});

test("I2 retains missing observer evidence without claiming a complete capture", () => {
  const recorder = createI2Recorder("AP-01-I2", streamId);
  recorder.mark("observerUnavailable", generation, null, generation, "MutationObserver");
  const trace = recorder.finish();
  assert.equal(trace.complete, false);
  assert.equal(trace.events[0].detail, "MutationObserver");
});

test("driver call-ID pairing sets a conservative interval and preserves an ambiguous callback", () => {
  const recorder = createI1Recorder(slotId, streamId);
  recorder.mark("timerRegistered", generation, "dismissed");
  driverMark(recorder, calls.primaryCallId);
  recorder.mark("callbackStarted", generation, "dismissed");
  recorder.mark("updateRequested", generation, "dismissed");
  recorder.mark("reactCommitted", generation, "dismissed");
  driverMark(recorder, calls.followupCallId);
  const trace = recorder.finish();
  const order = orderFromS1DriverMarks(trace, calls);
  assert.deepEqual(order, { slotId, streamId, generation, beforeSequence: 2, afterSequence: 5 });
  assert.equal(diagnoseI1({ trace, primary, order }).diagnosis, "UNKNOWN");
  assert.equal(orderFromS1DriverMarks(trace, { ...calls, primaryCallId: "different" }), null);
  assert.equal(orderFromS1DriverMarks(trace, { ...calls, generation: generation + 1 }), null);
});

test("only unambiguous, distinct primary/follow-up call pairs supply an order", () => {
  const recorder = createI1Recorder(slotId, streamId);
  driverMark(recorder, calls.primaryCallId);
  driverMark(recorder, calls.primaryCallId);
  driverMark(recorder, calls.followupCallId);
  const trace = recorder.finish();
  assert.equal(orderFromS1DriverMarks(trace, calls), null);
  assert.equal(orderFromS1DriverMarks(trace, { ...calls, followupCallId: calls.primaryCallId }), null);
  assert.equal(orderFromS1DriverMarks({ ...trace, events: null }, calls), null);
});

test("driver bounds can distinguish a late callback from a pending commit when marks lie outside the interval", () => {
  for (const started of [false, true]) {
    const recorder = createI1Recorder(slotId, streamId);
    const add = kind => recorder.mark(kind, generation, "dismissed");
    add("timerRegistered");
    if (started) {
      add("callbackStarted");
      add("updateRequested");
    }
    driverMark(recorder, calls.primaryCallId);
    driverMark(recorder, calls.followupCallId);
    if (!started) {
      add("callbackStarted");
      add("updateRequested");
    }
    add("reactCommitted");
    const trace = recorder.finish();
    const order = orderFromS1DriverMarks(trace, calls);
    const expected = started ? "UPDATE_REQUESTED_COMMIT_NOT_OBSERVED_AT_PRIMARY" : "CALLBACK_NOT_STARTED_AT_PRIMARY";
    assert.equal(diagnoseI1({ trace, primary, order }).diagnosis, expected);
  }
});
