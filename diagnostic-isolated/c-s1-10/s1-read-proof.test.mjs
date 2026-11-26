import assert from "node:assert/strict";
import test from "node:test";
import { createI1Recorder } from "./i1-timing.mjs";
import { bindS1ReadMarkers } from "./s1-read-proof.mjs";

const slotId = "AP-01-I1", streamId = "slot-I1", pageId = "page@1", generation = 7;
const selector = '#modern-exhibit-swipe-dismiss >> internal:testid=[data-testid="swipe-to-dismiss"s]';
const primaryReceipt = { slotId, streamId, primary: { apiSeq: 30, state: "dismissing", verdict: "FAIL" } };

function fixture() {
  const calls = [];
  function call(method, kind, params, value) {
    const callId = `call@${10 + calls.length}`;
    const before = { method, class: kind, callId, params };
    if (kind !== "BrowserContext") before.pageId = pageId;
    const after = { callId, result: { value } };
    calls.push({ before, after });
    return callId;
  }
  function read(value) {
    return call("getAttribute", "Frame", { selector, name: "data-state", strict: true, timeout: 9000 }, value);
  }
  call("clockRunFor", "BrowserContext", { ticksNumber: 500 });
  read("dismissed");
  read("idle");
  call("clockRunFor", "BrowserContext", { ticksNumber: 300 });
  call("mouseUp", "Page", {});
  call("clockRunFor", "BrowserContext", { ticksNumber: 500 });
  const primaryCallId = read("dismissing");
  call("screenshot", "Page", { timeout: 9000 });
  const followupCallId = read("dismissed");
  const recorder = createI1Recorder(slotId, streamId);
  recorder.mark("timerRegistered", generation, "dismissed");
  recorder.mark("driverTargetMarked", generation, null, generation, primaryCallId);
  recorder.mark("callbackStarted", generation, "dismissed");
  recorder.mark("updateRequested", generation, "dismissed");
  recorder.mark("reactCommitted", generation, "dismissed");
  recorder.mark("driverTargetMarked", generation, null, generation, followupCallId);
  return {
    trace: { calls, hasAutomaticImages: false, hasSnapshots: false },
    primaryReceipt: structuredClone(primaryReceipt), followupState: "dismissed", generation, marks: recorder.finish(),
  };
}

test("S1 binds the third and fourth target reads to independently preserved primary and follow-up", () => {
  const result = bindS1ReadMarkers(fixture());
  assert.deepEqual(result.order, { slotId, streamId, generation, beforeSequence: 2, afterSequence: 5 });
  assert.equal(result.primaryCallId, "call@16");
  assert.equal(result.followupCallId, "call@18");
  assert.equal(result.diagnosis, "UNKNOWN");
  assert.equal(result.reason, "CALLBACK_OR_UPDATE_ORDER_UNPROVEN");
});

for (const [label, modify, reason] of [
  ["wrong slot", o => { o.primaryReceipt.slotId = "AP-01-I0"; }, "PRIMARY_RECEIPT_MISMATCH"],
  ["foreign recorder", o => { o.primaryReceipt.streamId = "different"; }, "PRIMARY_RECEIPT_MISMATCH"],
  ["wrong source-read ordinal", o => { o.primaryReceipt.primary.apiSeq = 31; }, "PRIMARY_RECEIPT_MISMATCH"],
  ["different raw primary", o => { o.trace.calls[6].after.result.value = "dismissed"; }, "TRACE_READS_DO_NOT_MATCH"],
  ["different raw followup", o => { o.trace.calls[8].after.result.value = "dismissing"; }, "TRACE_READS_DO_NOT_MATCH"],
  ["different page", o => { o.trace.calls[8].before.pageId = "page@2"; }, "TRACE_READS_DO_NOT_MATCH"],
  ["additional getAttribute", o => { o.trace.calls.push(structuredClone(o.trace.calls[8])); }, "UNEXPECTED_READ_SEQUENCE"],
  ["additional operation before primary", o => { o.trace.calls.splice(6, 0, o.trace.calls[7]); }, "UNEXPECTED_READ_SEQUENCE"],
  ["wrong command duration", o => { o.trace.calls[5].before.params.ticksNumber = 499; }, "UNEXPECTED_READ_SEQUENCE"],
  ["automatic snapshots enabled", o => { o.trace.hasSnapshots = true; }, "TRACE_UNAVAILABLE"],
  ["no primary marker", o => { o.marks = { ...o.marks, events: o.marks.events.slice(2) }; }, "DRIVER_MARKS_UNPROVEN"],
]) {
  test(`S1 keeps ${label} unknown`, () => {
    const setup = fixture();
    modify(setup);
    assert.deepEqual(bindS1ReadMarkers(setup), { order: null, diagnosis: "UNKNOWN", reason });
  });
}
