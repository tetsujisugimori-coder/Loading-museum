import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { runOfflineStageC } from "./offline-runner.mjs";

const calibrationIds = registration.calibration.order;
const productIds = registration.slots.slice(4).map(slot => slot.id);
const productRows = result => result.records.slice(4);
const allProductSlotsUnstarted = result =>
  assert.deepEqual(productRows(result).map(row => row.state), Array(6).fill("NOT_STARTED"));

function manualClock() {
  const start = 42_000;
  let elapsed = 0;
  const timers = new Map();
  return {
    now: () => start + elapsed,
    scheduleAt(time, callback) {
      const key = Symbol();
      timers.set(key, { time, callback });
      return () => timers.delete(key);
    },
    advanceTo(ms, { fireTimers = true } = {}) {
      assert.ok(ms >= elapsed);
      elapsed = ms;
      if (!fireTimers) return;
      for (const [key, timer] of [...timers].sort((a, b) => a[1].time - b[1].time)) {
        if (timer.time > start + elapsed || !timers.delete(key)) continue;
        timer.callback();
      }
    },
    pendingTimers: () => timers.size,
  };
}

function settleAcrossDeadline(clock, deadline, value) {
  clock.advanceTo(deadline - 1);
  queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => clock.advanceTo(deadline))));
  return Promise.resolve(value);
}

function fixture() {
  const expectedBodies = new Map(productIds.map(id => [id, Buffer.from(`expected body ${id}`)]));
  const saved = new Map();
  const calls = [];
  const clock = manualClock();
  const adapter = {
    runCalibration(slot, signal) {
      assert.equal(signal.aborted, false);
      calls.push(["calibrate", slot.id]);
      const overflow = slot.fixture === "overflow-fault";
      const manufacturedFault = overflow || slot.fixture === "cancelled-callback-fault";
      const bytes = Buffer.concat([Buffer.from(slot.id), Buffer.from([0, 255])]);
      saved.set(slot.id, bytes);
      return {
        fixture: slot.fixture,
        savedBytes: Buffer.from(bytes),
        controlsPass: true,
        evidence: manufacturedFault ? "INCOMPLETE" : "COMPLETE",
        cause: manufacturedFault ? "UNKNOWN" : null,
        firstLost: overflow ? 4097 : null,
        capacity: 4096,
      };
    },
    readBackCalibration(slot) {
      calls.push(["readback", slot.id]);
      return Buffer.from(saved.get(slot.id));
    },
    finalizeCalibration(signal) {
      assert.equal(signal.aborted, false);
      calls.push(["finalize-calibration"]);
      return { cleanup: "PASS", persistence: "PASS" };
    },
    observePrimary(slot) {
      calls.push(["primary", slot.id]);
      return "FAIL";
    },
    observeFollowup(slot) {
      calls.push(["followup", slot.id]);
    },
    collectBody(slot) {
      calls.push(["body", slot.id]);
      return Buffer.from(expectedBodies.get(slot.id));
    },
    cleanup(reason) {
      calls.push(["cleanup", reason]);
      return { cleanup: "PASS", persistence: "PASS" };
    },
  };
  return { clock, adapter, calls, expectedBodies };
}

test("all four independent matches allow six product slots, in registered order", async () => {
  const setup = fixture();
  const result = await runOfflineStageC(setup);
  const calibrationCalls = calibrationIds.flatMap(id => [["calibrate", id], ["readback", id]]);
  const productCalls = productIds.flatMap(id => [["primary", id], ["followup", id], ["body", id]]);
  assert.deepEqual(setup.calls, [...calibrationCalls, ["finalize-calibration"], ...productCalls, ["cleanup", null]]);
  assert.deepEqual(result.records.map(row => row.id), [...calibrationIds, ...productIds]);
  assert.ok(result.records.every(row => row.state === "COMPLETED"));
  assert.ok(result.records.slice(0, 4).every(row => row.calibrationVerdict === "PASS"));
  assert.equal(result.records[3].evidence, "INCOMPLETE");
  assert.equal(result.records[3].cause, "UNKNOWN");
  assert.equal(result.records[3].primaryVerdict, null);
  assert.ok(productRows(result).every(row => row.primaryVerdict === "FAIL" && row.auditVerdict === "PASS"));
  assert.deepEqual(result.calibrationFinalization, { cleanup: "PASS", persistence: "PASS" });
  assert.equal(setup.clock.pendingTimers(), 0);
});

for (const [label, finish, status] of [
  ["cleanup failure", () => ({ cleanup: "FAIL", persistence: "PASS" }), { cleanup: "FAIL", persistence: "PASS" }],
  ["persistence failure", () => ({ cleanup: "PASS", persistence: "FAIL" }), { cleanup: "PASS", persistence: "FAIL" }],
  ["missing persistence", () => ({ cleanup: "PASS" }), { cleanup: "PASS", persistence: "INCOMPLETE" }],
  ["rejection", () => Promise.reject(new Error("finalization failed")), { cleanup: "INCOMPLETE", persistence: "INCOMPLETE" }],
]) {
  test(`calibration finalization ${label} blocks all product slots despite four matches`, async () => {
    const setup = fixture();
    setup.adapter.finalizeCalibration = finish;
    const result = await runOfflineStageC(setup);
    assert.ok(result.records.slice(0, 4).every(row => row.calibrationVerdict === "PASS"));
    allProductSlotsUnstarted(result);
    assert.equal(setup.calls.some(([operation]) => operation === "primary"), false);
    assert.deepEqual(result.calibrationFinalization, status);
    assert.equal(result.stop.reason, "CALIBRATION_FINALIZATION_FAILURE");
    assert.equal(result.cleanup, "PASS");
  });
}

test("pending calibration finalization holds all product slots and cannot release them after 1170 seconds", async () => {
  const setup = fixture();
  const entered = Promise.withResolvers();
  const pending = Promise.withResolvers();
  setup.adapter.finalizeCalibration = signal => {
    entered.resolve(signal);
    return pending.promise;
  };
  const running = runOfflineStageC(setup);
  const signal = await Promise.race([entered.promise, running.then(() => null)]);
  assert.ok(signal);
  assert.equal(setup.calls.some(([operation]) => operation === "primary"), false);
  setup.clock.advanceTo(1_170_000);
  const result = await running;
  assert.equal(signal.aborted, true);
  assert.equal(result.stop.reason, "TIME_LIMIT");
  allProductSlotsUnstarted(result);
  pending.resolve({ cleanup: "PASS", persistence: "PASS" });
  await setImmediate();
  assert.deepEqual(result.calibrationFinalization, { cleanup: "INCOMPLETE", persistence: "INCOMPLETE" });
  allProductSlotsUnstarted(result);
});

for (const [label, fail] of [
  ["mismatching bytes", () => Buffer.from("different bytes")],
  ["missing bytes", () => null],
  ["failed readback", () => { throw new Error("read failed"); }],
]) {
  test(`three matches and a fourth record with ${label} leave all product slots unstarted`, async () => {
    const setup = fixture();
    const read = setup.adapter.readBackCalibration;
    setup.adapter.readBackCalibration = slot => slot.id === "AP-CAL-04" ? fail() : read(slot);
    const result = await runOfflineStageC(setup);
    assert.deepEqual(result.records.slice(0, 4).map(row => row.calibrationVerdict), ["PASS", "PASS", "PASS", "FAIL"]);
    assert.equal(result.stop.reason, "CALIBRATION_READBACK");
    assert.equal(setup.calls.some(([operation]) => operation === "primary"), false);
    allProductSlotsUnstarted(result);
  });
}

test("pending fourth readback cannot release any product slot and the deadline stops it", async () => {
  const setup = fixture();
  const read = setup.adapter.readBackCalibration;
  const pending = Promise.withResolvers();
  const entered = Promise.withResolvers();
  setup.adapter.readBackCalibration = (slot, signal) => {
    if (slot.id !== "AP-CAL-04") return read(slot);
    entered.resolve(signal);
    return pending.promise;
  };
  const running = runOfflineStageC(setup);
  const signal = await entered.promise;
  assert.equal(setup.calls.some(([operation]) => operation === "primary"), false);
  setup.clock.advanceTo(1_170_000);
  const result = await running;
  assert.equal(signal.aborted, true);
  assert.equal(result.records[3].state, "STARTED_INTERRUPTED");
  assert.equal(result.records[3].calibrationVerdict, null);
  allProductSlotsUnstarted(result);
  pending.resolve(Buffer.from("too late"));
  await setImmediate();
  allProductSlotsUnstarted(result);
});

test("only the registered 4097th mark satisfies the expected overflow calibration", async () => {
  const setup = fixture();
  const produce = setup.adapter.runCalibration;
  setup.adapter.runCalibration = (slot, signal) => {
    const observation = produce(slot, signal);
    if (slot.id === "AP-CAL-04") observation.firstLost = 4096;
    return observation;
  };
  const result = await runOfflineStageC(setup);
  assert.equal(result.records[3].calibrationVerdict, "FAIL");
  assert.equal(result.stop.reason, "CALIBRATION_OBSERVATION");
  assert.equal(setup.calls.some(([op, id]) => op === "readback" && id === "AP-CAL-04"), false);
  allProductSlotsUnstarted(result);
});

test("the manufactured cancellation cannot be accepted as complete evidence", async () => {
  const setup = fixture();
  const produce = setup.adapter.runCalibration;
  setup.adapter.runCalibration = (slot, signal) => {
    const observation = produce(slot, signal);
    if (slot.id === "AP-CAL-02") observation.evidence = "COMPLETE";
    return observation;
  };
  const result = await runOfflineStageC(setup);
  assert.equal(result.records[1].calibrationVerdict, "FAIL");
  assert.equal(result.records[2].state, "NOT_STARTED");
  allProductSlotsUnstarted(result);
});

test("the runner snapshots original calibration bytes before the reader can change them", async () => {
  const setup = fixture();
  const produce = setup.adapter.runCalibration;
  let shared;
  setup.adapter.runCalibration = (slot, signal) => {
    const observation = produce(slot, signal);
    shared = observation.savedBytes;
    return observation;
  };
  setup.adapter.readBackCalibration = () => {
    shared[0] ^= 255;
    return shared;
  };
  const result = await runOfflineStageC(setup);
  assert.equal(result.records[0].calibrationVerdict, "FAIL");
  assert.equal(result.records[1].state, "NOT_STARTED");
  allProductSlotsUnstarted(result);
});

test("the next slot waits until the pending delayed body matches", async () => {
  const setup = fixture();
  const collect = setup.adapter.collectBody;
  const entered = Promise.withResolvers();
  const pending = Promise.withResolvers();
  setup.adapter.collectBody = slot => {
    const bytes = collect(slot);
    if (slot.id !== productIds[0]) return bytes;
    entered.resolve(bytes);
    return pending.promise;
  };
  const running = runOfflineStageC(setup);
  const bytes = await entered.promise;
  assert.deepEqual(setup.calls.slice(-3), [["primary", productIds[0]], ["followup", productIds[0]], ["body", productIds[0]]]);
  await setImmediate();
  assert.equal(setup.calls.filter(([op]) => op === "primary").length, 1);
  pending.resolve(bytes);
  const result = await running;
  assert.ok(productRows(result).every(row => row.auditVerdict === "PASS"));
});

for (const [primary, body] of [
  ["PASS", () => Buffer.from("replacement")],
  ["FAIL", () => null],
  ["NOT_TESTED", () => Promise.reject(new Error("body collection failed"))],
]) {
  test(`delayed body failure preserves primary ${primary} and prevents later slots`, async () => {
    const setup = fixture();
    const entered = Promise.withResolvers();
    const pending = Promise.withResolvers();
    const cleanupEntered = Promise.withResolvers();
    const cleaning = Promise.withResolvers();
    const observe = setup.adapter.observePrimary;
    setup.adapter.observePrimary = slot => {
      observe(slot);
      return primary;
    };
    setup.adapter.collectBody = () => {
      entered.resolve();
      return pending.promise.then(body);
    };
    setup.adapter.cleanup = reason => {
      cleanupEntered.resolve(reason);
      return cleaning.promise;
    };
    const running = runOfflineStageC(setup);
    await entered.promise;
    setup.clock.advanceTo(100);
    pending.resolve();
    assert.equal(await cleanupEntered.promise, "DEFERRED_BODY");
    setup.clock.advanceTo(140);
    cleaning.resolve({ cleanup: "PASS", persistence: "PASS" });
    const result = await running;
    const [first, ...later] = productRows(result);
    assert.equal(first.primaryVerdict, primary);
    assert.equal(first.auditVerdict, "FAIL");
    assert.equal(first.mismatchDetectedAtMs, 100);
    assert.equal(result.stop.requestedAtMs, 100);
    assert.equal(result.stop.completedAtMs, 140);
    assert.equal(result.stop.cutoffAtMs, null);
    assert.ok(later.every(row => row.state === "NOT_STARTED"));
    assert.equal(setup.calls.filter(([op]) => op === "primary").length, 1);
  });
}

test("detectable errors stop before body collection and preserve the frozen primary result", async () => {
  const setup = fixture();
  setup.adapter.observeFollowup = () => { throw new Error("metadata mismatch"); };
  const result = await runOfflineStageC(setup);
  assert.equal(result.stop.reason, "ADAPTER_FAILURE");
  assert.equal(productRows(result)[0].primaryVerdict, "FAIL");
  assert.equal(setup.calls.some(([op]) => op === "body"), false);
  assert.ok(productRows(result).slice(1).every(row => row.state === "NOT_STARTED"));
});

test("a changed fixture plan cannot make replacement body bytes pass", async () => {
  const setup = fixture();
  const collect = setup.adapter.collectBody;
  setup.adapter.collectBody = slot => {
    setup.expectedBodies.set(slot.id, Buffer.from("replacement"));
    return collect(slot);
  };
  const result = await runOfflineStageC(setup);
  assert.equal(productRows(result)[0].auditVerdict, "FAIL");
  assert.ok(productRows(result).slice(1).every(row => row.state === "NOT_STARTED"));
});

test("1170 seconds cancels work and 1200 seconds ends a hung cleanup", async () => {
  const setup = fixture();
  const inBody = Promise.withResolvers();
  const reading = Promise.withResolvers();
  const inCleanup = Promise.withResolvers();
  const cleaning = Promise.withResolvers();
  setup.adapter.collectBody = (_slot, signal) => {
    inBody.resolve(signal);
    return reading.promise;
  };
  setup.adapter.cleanup = (reason, signal) => {
    inCleanup.resolve({ reason, signal });
    return cleaning.promise;
  };
  const running = runOfflineStageC(setup);
  const workSignal = await inBody.promise;
  setup.clock.advanceTo(1_169_999);
  assert.equal(workSignal.aborted, false);
  setup.clock.advanceTo(1_170_000);
  const cleanup = await inCleanup.promise;
  assert.equal(workSignal.aborted, true);
  assert.equal(cleanup.reason, "TIME_LIMIT");
  let returned = false;
  void running.then(() => { returned = true; });
  setup.clock.advanceTo(1_199_999);
  await setImmediate();
  assert.equal(returned, false);
  assert.equal(cleanup.signal.aborted, false);
  setup.clock.advanceTo(1_200_000);
  const result = await running;
  assert.equal(cleanup.signal.aborted, true);
  assert.deepEqual(result.stop, {
    reason: "TIME_LIMIT", requestedAtMs: 1_170_000, completedAtMs: null, cutoffAtMs: 1_200_000,
  });
  assert.equal(result.cleanup, "INCOMPLETE");
  assert.equal(result.persistence, "INCOMPLETE");
  assert.equal(productRows(result)[0].primaryVerdict, "FAIL");
  assert.equal(productRows(result)[0].state, "STARTED_INTERRUPTED");
  assert.equal(productRows(result)[0].evidence, "INCOMPLETE");
  assert.ok(productRows(result).slice(1).every(row => row.state === "NOT_STARTED"));
  assert.equal(setup.clock.pendingTimers(), 0);
  const snapshot = structuredClone(result);
  reading.reject(new Error("late body error"));
  cleaning.resolve({ cleanup: "PASS", persistence: "PASS" });
  await setImmediate();
  assert.deepEqual(result, snapshot);
});

test("no new body operation starts at exactly 1170 seconds even before the timer callback", async () => {
  const setup = fixture();
  setup.adapter.observeFollowup = () => setup.clock.advanceTo(1_170_000, { fireTimers: false });
  const result = await runOfflineStageC(setup);
  assert.equal(result.stop.requestedAtMs, 1_170_000);
  assert.equal(result.stop.completedAtMs, 1_170_000);
  assert.equal(result.stop.cutoffAtMs, null);
  assert.equal(setup.calls.some(([op]) => op === "body"), false);
  assert.ok(productRows(result).slice(1).every(row => row.state === "NOT_STARTED"));
});

test("body result delivered across 1170 seconds cannot mark the slot complete", async () => {
  const setup = fixture();
  const collect = setup.adapter.collectBody;
  setup.adapter.collectBody = slot => settleAcrossDeadline(setup.clock, 1_170_000, collect(slot));
  const result = await runOfflineStageC(setup);
  const [first, ...later] = productRows(result);
  assert.equal(result.stop.requestedAtMs, 1_170_000);
  assert.equal(first.state, "STARTED_INTERRUPTED");
  assert.equal(first.evidence, "INCOMPLETE");
  assert.equal(first.auditVerdict, null);
  assert.equal(first.primaryVerdict, "FAIL");
  assert.ok(later.every(row => row.state === "NOT_STARTED"));
});

test("cleanup result delivered across 1200 seconds cannot record PASS or stop completion", async () => {
  const setup = fixture();
  let cleanupSignal;
  setup.adapter.cleanup = (_reason, signal) => {
    cleanupSignal = signal;
    setup.clock.advanceTo(1_170_000);
    return settleAcrossDeadline(setup.clock, 1_200_000, { cleanup: "PASS", persistence: "PASS" });
  };
  const result = await runOfflineStageC(setup);
  assert.equal(cleanupSignal.aborted, true);
  assert.deepEqual(result.stop, {
    reason: "TIME_LIMIT", requestedAtMs: 1_170_000, completedAtMs: null, cutoffAtMs: 1_200_000,
  });
  assert.equal(result.cleanup, "INCOMPLETE");
  assert.equal(result.persistence, "INCOMPLETE");
});

test("a network stop during post-primary work preserves FAIL and blocks later slots", async () => {
  const setup = fixture();
  const networkStop = new AbortController();
  setup.adapter.observeFollowup = (slot, signal) => {
    setup.clock.advanceTo(40);
    networkStop.abort({ slotId: slot.id, reason: "UNKNOWN_REQUEST" });
    assert.equal(signal.aborted, true);
    return new Promise(() => {});
  };
  const result = await runOfflineStageC({ ...setup, networkStopSignal: networkStop.signal });
  const [first, ...remaining] = productRows(result);
  assert.equal(first.primaryVerdict, "FAIL");
  assert.equal(first.evidence, "INCOMPLETE");
  assert.ok(remaining.every(row => row.state === "NOT_STARTED"));
  assert.ok(!setup.calls.some(([operation]) => operation === "body"));
  assert.deepEqual(result.stop, {
    reason: "NETWORK_MISMATCH", requestedAtMs: 40, completedAtMs: 40, cutoffAtMs: null,
  });
});

test("a hung cleanup ends 30 seconds after an early network stop", async () => {
  const setup = fixture();
  const networkStop = new AbortController();
  const cleaning = Promise.withResolvers();
  setup.adapter.observeFollowup = () => networkStop.abort();
  setup.adapter.cleanup = (_reason, signal) => {
    cleaning.resolve(signal);
    return new Promise(() => {});
  };
  const running = runOfflineStageC({ ...setup, networkStopSignal: networkStop.signal });
  const cleanupSignal = await cleaning.promise;
  setup.clock.advanceTo(29_999);
  assert.equal(cleanupSignal.aborted, false);
  setup.clock.advanceTo(30_000);
  const result = await running;
  assert.equal(cleanupSignal.aborted, true);
  assert.equal(result.stop.cutoffAtMs, 30_000);
  assert.equal(result.stop.completedAtMs, null);
  assert.equal(result.cleanup, "INCOMPLETE");
});

test("network stop racing primary return retains the independently read-back verdict", async () => {
  const setup = fixture();
  const networkStop = new AbortController();
  const persistedPrimaryVerdicts = new Map();
  setup.adapter.observePrimary = slot => {
    persistedPrimaryVerdicts.set(slot.id, "FAIL");
    queueMicrotask(() => networkStop.abort());
    return "FAIL";
  };
  setup.adapter.cleanup = () => ({ cleanup: "PASS", persistence: "PASS", persistedPrimaryVerdicts });
  const result = await runOfflineStageC({ ...setup, networkStopSignal: networkStop.signal });
  const [row, ...remaining] = productRows(result);
  assert.equal(row.primaryVerdict, "FAIL");
  assert.equal(row.state, "STARTED_INTERRUPTED");
  assert.ok(remaining.every(other => other.state === "NOT_STARTED"));
  assert.ok(!setup.calls.some(([operation]) => operation === "followup"));
});

for (const [classification, auditVerdict, evidenceStatus, cleanup, persistence, state] of [
  ["COUNT_DEVIATION", "PASS", "COMPLETE", "PASS", "PASS", "COMPLETED"],
  ["NETWORK_AUDIT_FAIL", "FAIL", "COMPLETE", "PASS", "PASS", "STARTED_INTERRUPTED"],
  ["INCOMPLETE", "INCOMPLETE", "INCOMPLETE", "FAIL", "PASS", "STARTED_INTERRUPTED"],
  ["INCOMPLETE", "INCOMPLETE", "INCOMPLETE", "PASS", "FAIL", "STARTED_INTERRUPTED"],
]) {
  test(`network contract finalization ${classification}/${cleanup}/${persistence} stops later slots and keeps the primary`, async () => {
    const setup = fixture();
    setup.adapter.finalizeProductSlot = slot => {
      setup.calls.push(["finalize-product", slot.id]);
      return { classification, auditVerdict, evidenceStatus, cleanup, persistence };
    };
    setup.adapter.cleanup = reason => {
      setup.calls.push(["cleanup", reason]);
      return { cleanup, persistence };
    };
    const result = await runOfflineStageC({ ...setup, expectedBodies: undefined });
    const [first, ...rest] = productRows(result);
    assert.equal(first.primaryVerdict, "FAIL");
    assert.equal(first.networkClassification, classification);
    assert.equal(first.auditVerdict, auditVerdict);
    assert.equal(first.state, state);
    assert.ok(rest.every(row => row.state === "NOT_STARTED"));
    assert.deepEqual(setup.calls.slice(-2), [["finalize-product", first.id], ["cleanup", classification]]);
    assert.equal(result.stopRequested, true);
    assert.equal(result.stopCompleted, cleanup === "PASS" && persistence === "PASS");
  });
}

test("only the saved baseline comparison permits another mock slot", async () => {
  const setup = fixture();
  const second = productIds[1];
  setup.adapter.finalizeProductSlot = ({ id }) => ({
    classification: id === second ? "COUNT_DEVIATION" : "BASELINE_MATCH",
    auditVerdict: "PASS", evidenceStatus: "COMPLETE", cleanup: "PASS", persistence: "PASS",
  });
  const result = await runOfflineStageC({ ...setup, expectedBodies: undefined });
  const [first, next, ...rest] = productRows(result);
  assert.equal(first.networkClassification, "BASELINE_MATCH");
  assert.equal(next.id, second);
  assert.equal(next.networkClassification, "COUNT_DEVIATION");
  assert.ok(rest.every(row => row.state === "NOT_STARTED"));
});
