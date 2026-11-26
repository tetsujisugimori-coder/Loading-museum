import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { instrumentSwipeI1, originalSwipeSourceSha256 } from "./i1-probe.mjs";
import { createI1Recorder, diagnoseI1, i1RecorderInitSource } from "./i1-timing.mjs";

const slot = "AP-01-I1";
const stream = "test-context";
const generation = 7;
const state = "dismissed";
const primary = { slotId: slot, generation, state: "dismissing" };
const original = readFileSync(new URL("../../app/components/interactive-motion/GestureExhibits.tsx", import.meta.url), "utf8");
const marks = ["timerRegistered", "callbackStarted", "updateRequested", "reactCommitted"];

function recorderWith(...names) {
  const recorder = createI1Recorder(slot, stream);
  for (const name of names) recorder.mark(name, generation, state);
  return recorder;
}

function readOrder(beforeSequence, afterSequence = beforeSequence) {
  return { slotId: slot, streamId: stream, generation, beforeSequence, afterSequence };
}

test("I1 transform accepts only the fixed original and adds no DOM reads or awaits", () => {
  assert.equal(createHash("sha256").update(original).digest("hex"), originalSwipeSourceSha256);
  const output = instrumentSwipeI1(original);
  const start = "export function SwipeDismiss({active,reduced}:Props){";
  const untouched = original.slice(original.indexOf("type Props="), original.indexOf(start));
  assert.ok(output.includes(untouched));
  for (const expression of [/\.getAttribute\(/g, /\bawait\b/g, /\bMutationObserver\b/g]) {
    assert.equal([...original.matchAll(expression)].length, [...output.matchAll(expression)].length);
  }
  assert.match(output, /const change=\(next:string\)=>\{live\.current=next;recordSwipeI1\('updateRequested',epoch\.current,next\);setState\(next\);\};/);
  assert.match(output, /useLayoutEffect\(\(\)=>\{recordSwipeI1\('reactCommitted',epoch\.current,state\);\},\[state,epoch\]\)/);
  assert.match(output, /recordSwipeI1\('callbackStarted',gen,result,epoch\.current\);if\(gen===epoch\.current\)change\(result\);\},reduced\?0:240\);recordSwipeI1\('timerRegistered',gen,result\);/);
  assert.throws(() => instrumentSwipeI1(original + "\n"), /source hash mismatch/);
});

test("generated initializer and Node recorder produce identical marks", () => {
  const browserRealm = vm.createContext({});
  vm.runInContext(i1RecorderInitSource(slot, stream), browserRealm);
  const browserRecorder = browserRealm.__lm88StageCI1;
  const regular = recorderWith(...marks).finish();
  for (const name of marks) browserRecorder.mark(name, generation, state);
  assert.deepEqual(JSON.parse(JSON.stringify(browserRecorder.finish())), regular);
  assert.equal(Object.isFrozen(regular.events), true);
  assert.equal(Object.isFrozen(regular.events[0]), true);
  assert.throws(() => i1RecorderInitSource(slot, ""), /stream identity/);
});

test("timer registration before primary and callback after it separates a late callback", () => {
  const trace = recorderWith(...marks).finish();
  assert.deepEqual(diagnoseI1({ trace, primary, order: readOrder(1) }), {
    diagnosis: "CALLBACK_NOT_STARTED_AT_PRIMARY", reason: "REGISTERED_WITH_NO_PRE_PRIMARY_CALLBACK",
  });
});

test("complete registration with no callback also separates a callback absent at primary", () => {
  const trace = recorderWith("timerRegistered").finish();
  assert.equal(diagnoseI1({ trace, primary, order: readOrder(1) }).diagnosis, "CALLBACK_NOT_STARTED_AT_PRIMARY");
});

test("a pre-primary update and strictly later commit separate a pending React commit", () => {
  const trace = recorderWith(...marks).finish();
  assert.deepEqual(diagnoseI1({ trace, primary, order: readOrder(3) }), {
    diagnosis: "UPDATE_REQUESTED_COMMIT_NOT_OBSERVED_AT_PRIMARY", reason: "COMMIT_OBSERVED_LATER",
  });
});

test("a request without any commit retains the fact that there was no commit in the capture", () => {
  const trace = recorderWith(...marks.slice(0, 3)).finish();
  assert.deepEqual(diagnoseI1({ trace, primary, order: readOrder(3) }), {
    diagnosis: "UPDATE_REQUESTED_COMMIT_NOT_OBSERVED_AT_PRIMARY", reason: "COMMIT_NOT_IN_CAPTURE",
  });
});

test("host timestamps alone cannot put callback or commit before primary", () => {
  const trace = recorderWith(...marks).finish();
  assert.deepEqual(diagnoseI1({ trace, primary, order: { hostMs: 500, clockRunForSucceeded: true } }), {
    diagnosis: "UNKNOWN", reason: "PRIMARY_ORDER_UNPROVEN",
  });
});

for (const [name, first, last, reason] of [
  ["timer registration", 0, 1, "MISSING_OR_AMBIGUOUS_CHAIN"],
  ["callback", 1, 2, "CALLBACK_OR_UPDATE_ORDER_UNPROVEN"],
  ["update request", 2, 3, "CALLBACK_OR_UPDATE_ORDER_UNPROVEN"],
  ["React commit", 3, 4, "COMMIT_BEFORE_OR_NEAR_PRIMARY"],
]) {
  test(`${name} inside the uncertain primary interval keeps the verdict unknown`, () => {
    const trace = recorderWith(...marks).finish();
    assert.deepEqual(diagnoseI1({ trace, primary, order: readOrder(first, last) }), {
      diagnosis: "UNKNOWN", reason,
    });
  });
}

test("a commit already recorded at primary does not become a commit delay", () => {
  const trace = recorderWith(...marks).finish();
  assert.equal(diagnoseI1({ trace, primary, order: readOrder(4) }).reason, "COMMIT_BEFORE_OR_NEAR_PRIMARY");
});

test("wrong slot, stream, generation and invalid bounds are rejected", () => {
  const trace = recorderWith(...marks).finish();
  const order = readOrder(3);
  for (const wrong of [
    { ...order, slotId: "AP-02-I1" }, { ...order, streamId: "foreign" },
    { ...order, generation: generation + 1 }, { ...order, afterSequence: 5 },
    { ...order, beforeSequence: 4 },
  ]) assert.equal(diagnoseI1({ trace, primary, order: wrong }).reason, "PRIMARY_ORDER_UNPROVEN");
  assert.equal(diagnoseI1({ trace, primary: { ...primary, slotId: "other" }, order }).reason, "UNMATCHED_PRIMARY");
});

test("an earlier generation's completed swipe never supplies the target callback", () => {
  const recorder = createI1Recorder(slot, stream);
  for (const name of marks) recorder.mark(name, generation - 1, state);
  recorder.mark("timerRegistered", generation, state);
  const trace = recorder.finish();
  assert.equal(diagnoseI1({ trace, primary, order: readOrder(5) }).diagnosis, "CALLBACK_NOT_STARTED_AT_PRIMARY");
});

test("an intervening generation change and a rejected callback are not commit delays", () => {
  const recorder = recorderWith("timerRegistered");
  recorder.mark("callbackStarted", generation, state, generation + 1);
  const trace = recorder.finish();
  assert.equal(diagnoseI1({ trace, primary, order: readOrder(2) }).reason, "GENERATION_CHANGED");
});

test("missing or duplicate marks and a reset timeline are unknown", () => {
  const duplicate = recorderWith("timerRegistered", "callbackStarted", "callbackStarted").finish();
  assert.equal(diagnoseI1({ trace: duplicate, primary, order: readOrder(3) }).reason, "MISSING_OR_AMBIGUOUS_CHAIN");
  const missing = recorderWith("timerRegistered", "updateRequested").finish();
  assert.equal(diagnoseI1({ trace: missing, primary, order: readOrder(2) }).reason, "MISSING_OR_AMBIGUOUS_CHAIN");
  const recorder = recorderWith("timerRegistered");
  recorder.mark("reactCommitted", 0, "idle");
  assert.equal(diagnoseI1({ trace: recorder.finish(), primary, order: readOrder(1) }).reason, "INCOMPLETE_OR_INVALID_TRACE");
});

test("overflow at mark 4097 never becomes negative callback evidence", () => {
  const recorder = recorderWith("timerRegistered");
  for (let i = 1; i < 4096; i++) recorder.mark("reactCommitted", generation, "dismissing");
  recorder.mark("callbackStarted", generation, state);
  const trace = recorder.finish();
  assert.equal(trace.events.length, 4096);
  assert.equal(trace.firstLost, 4097);
  assert.equal(diagnoseI1({ trace, primary, order: readOrder(1) }).reason, "INCOMPLETE_OR_INVALID_TRACE");
});
