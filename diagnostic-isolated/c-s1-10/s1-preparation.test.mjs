import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { apiSequence } from "../../scripts/phase7d-api-plan.mjs";
import { DeferredBodyAuditError } from "./offline-runner.mjs";
import { runS1Preparation } from "./s1-preparation.mjs";

const slots = registration.slots.slice(registration.scope.calibrationSlots);
const stepNames = apiSequence("swipe", "S1");
const saved = { cleanup: "PASS", persistence: "PASS" };

function fixture({ onTargetAdvance = null } = {}) {
  const raw = new Map(), products = new Map(), primary = new Map(), opened = [];
  const expectedBodies = new Map(slots.map(slot => [slot.id, Buffer.from(slot.id)]));
  const timers = new Map();
  let now = 0;
  const clock = {
    now: () => now,
    scheduleAt(at, callback) {
      timers.set(at, callback);
      return () => timers.delete(at);
    },
    advance(at) {
      now = at;
      for (const [limit, callback] of [...timers]) {
        if (at >= limit && timers.delete(limit)) callback();
      }
    },
  };
  const calibration = {
    runCalibration(slot) {
      const savedBytes = Buffer.from(slot.id);
      raw.set(slot.id, savedBytes);
      const overflow = slot.fixture === "overflow-fault";
      const fault = overflow || slot.fixture === "cancelled-callback-fault";
      return {
        fixture: slot.fixture, controlsPass: true, savedBytes, capacity: 4096,
        firstLost: overflow ? 4097 : null, evidence: fault ? "INCOMPLETE" : "COMPLETE",
        cause: fault ? "UNKNOWN" : null,
      };
    },
    readBackCalibration: slot => Buffer.from(raw.get(slot.id)),
    finalizeCalibration: () => saved,
  };
  const runtime = {
    openSlot(slot) {
      opened.push(slot.id);
      const calls = stepNames.slice(0, 4);
      products.set(slot.id, calls);
      const log = (name, value) => () => { calls.push(name); return value; };
      let reads = 0, advances = 0, details = 0, moves = 0;
      const root = {
        waitFor: log("root.waitFor"),
        scrollIntoViewIfNeeded: log("root.scrollIntoViewIfNeeded"),
        getAttribute(name) {
          assert.equal(name, "data-state");
          const read = [
            ["keyboard-prefix.getAttribute", "dismissed"],
            ["undo-prefix.getAttribute", "idle"],
            ["primary.getAttribute", "dismissing"],
            ["followup.getAttribute", "dismissed"],
          ][reads++];
          return log(...read)();
        },
      };
      const card = {
        focus: log("prefix.card.focus"),
        scrollIntoViewIfNeeded: log("prefix.card.scrollIntoViewIfNeeded"),
        boundingBox: log("target.card.boundingBox", { x: 10, y: 20, width: 60, height: 30 }),
      };
      const stage = {
        getByTestId(name) { assert.equal(name, "swipe-to-dismiss"); return root; },
        getByText(label, options) {
          assert.deepEqual([label, options], ["仕組みを見る", { exact: true }]);
          return { click: log("mechanism.click") };
        },
        locator(selector) {
          if (selector === "summary") return { first: () => ({ click: log("summary.click") }) };
          assert.equal(selector, "details[open]");
          return { count: () => details++ === 0 ? log("details.closed.count", 0)() : log("details.open.count", 2)() };
        },
        getByRole(role, options) {
          assert.equal(role, "button");
          if (options.name === "Undo") return { click: log("prefix.Undo.click") };
          assert.equal(options.name, "スワイプするカード");
          return card;
        },
      };
      const page = {
        setDefaultTimeout(ms) { assert.equal(ms, 9000); },
        addInitScript(source) {
          if (slot.level === "I0") assert.equal(source, "(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'))(undefined)");
          else assert.match(source, /__lm88StageCI1/);
          calls.push("page.addInitScript");
        },
        goto(url) {
          assert.equal(url, "http://127.0.0.1:9010/Loading-museum/#modern-exhibit-swipe-dismiss");
          calls.push("page.goto");
        },
        locator(selector) { assert.equal(selector, "#modern-exhibit-swipe-dismiss"); return stage; },
        evaluate: log("clock.origin.evaluate", 1000),
        clock: {
          install: log("clock.install"),
          pauseAt(value) { assert.equal(value, 1000); calls.push("clock.pauseAt"); },
          runFor(ms) {
            const [label, expected] = [
              ["keyboard-prefix.clock.runFor", 500], ["css-return-prefix.clock.runFor", 300], ["target.clock.runFor", 500],
            ][advances++];
            assert.equal(ms, expected);
            calls.push(label);
            return label === "target.clock.runFor" ? onTargetAdvance?.() : undefined;
          },
        },
        keyboard: {
          press(key) { assert.equal(key, "ArrowRight"); calls.push("prefix.keyboard.ArrowRight"); },
        },
        mouse: {
          move(x, y, options) {
            const [label, expected] = [
              ["target.mouse.move.start", [40, 35, undefined]], ["target.mouse.move.drag", [170, 35, { steps: 8 }]],
            ][moves++];
            assert.deepEqual([x, y, options], expected);
            calls.push(label);
          },
          down: log("target.mouse.down"),
          up: log("target.mouse.up"),
        },
        screenshot: log("page.screenshot", Buffer.from("png")),
      };
      return { page, originUrl: "http://127.0.0.1:9010/Loading-museum/", streamId: slot.id };
    },
    writePrimary(slot, bytes) {
      products.get(slot.id).push("writePrimary");
      assert.equal(primary.has(slot.id), false);
      primary.set(slot.id, JSON.parse(bytes.toString()).primary);
    },
    collectBody(slot, _session, followup) {
      products.get(slot.id).push("collectBody");
      assert.equal(followup.state, "dismissed");
      assert.deepEqual(followup.screenshot, Buffer.from("png"));
      return Buffer.from(slot.id);
    },
    closeSlot(slot) { products.get(slot.id).push(...stepNames.slice(-3)); },
    cleanup: () => saved,
  };
  return { clock, calibration, runtime, expectedBodies, products, primary, opened };
}

test("the registered 4+6 slots keep original S1 input, primary save and deferred collection order", async () => {
  const setup = fixture();
  const result = await runS1Preparation(setup);
  assert.deepEqual(result.records.map(row => row.id), registration.slots.map(slot => slot.id));
  assert.deepEqual(setup.opened, slots.map(slot => slot.id));
  const expected = [...stepNames];
  expected.splice(expected.indexOf("primary.getAttribute") + 1, 0, "writePrimary");
  expected.splice(expected.indexOf("followup.getAttribute") + 1, 0, "collectBody");
  for (const slot of slots) {
    assert.deepEqual(setup.products.get(slot.id), expected);
    assert.deepEqual(setup.primary.get(slot.id), { apiSeq: 30, state: "dismissing", verdict: "FAIL" });
  }
  assert.ok(result.records.slice(4).every(row => row.auditVerdict === "PASS" && row.primaryVerdict === "FAIL"));
});

test("mismatched deferred bytes fail only the attempted audit and stop future slots", async () => {
  const setup = fixture();
  setup.runtime.collectBody = () => Buffer.from("different");
  const result = await runS1Preparation(setup);
  assert.deepEqual(setup.opened, [slots[0].id]);
  assert.equal(result.records[4].primaryVerdict, "FAIL");
  assert.equal(result.records[4].auditVerdict, "FAIL");
  assert.ok(result.records.slice(5).every(row => row.state === "NOT_STARTED"));
});

test("primary persistence failure preserves the verdict and starts no screenshot or later slot", async () => {
  const setup = fixture();
  setup.runtime.writePrimary = () => { throw new Error("exclusive save failed"); };
  const result = await runS1Preparation(setup);
  assert.equal(result.records[4].primaryVerdict, "FAIL");
  assert.equal(result.records[4].state, "STARTED_INTERRUPTED");
  assert.deepEqual(setup.opened, [slots[0].id]);
  assert.equal(setup.products.get(slots[0].id).includes("page.screenshot"), false);
});

test("product cleanup failure keeps the primary and byte audit, and stops later slots", async () => {
  const setup = fixture();
  setup.runtime.closeSlot = () => { throw new Error("trace flush failed"); };
  const result = await runS1Preparation(setup);
  assert.equal(result.stop.reason, "PRODUCT_FINALIZATION_FAILURE");
  assert.equal(result.records[4].primaryVerdict, "FAIL");
  assert.equal(result.records[4].auditVerdict, "PASS");
  assert.equal(result.records[4].evidence, "INCOMPLETE");
  assert.equal(result.records[4].state, "STARTED_INTERRUPTED");
  assert.deepEqual(setup.opened, [slots[0].id]);
});

test("an unexpected response during cleanup fails the byte audit without replacing the primary", async () => {
  const setup = fixture();
  setup.runtime.closeSlot = () => { throw new DeferredBodyAuditError("unexpected response"); };
  const result = await runS1Preparation(setup);
  assert.equal(result.stop.reason, "DEFERRED_BODY");
  assert.equal(result.records[4].primaryVerdict, "FAIL");
  assert.equal(result.records[4].auditVerdict, "FAIL");
  assert.equal(result.records[4].evidence, "INCOMPLETE");
  assert.deepEqual(setup.opened, [slots[0].id]);
});

test("the sequence refuses an origin URL that changes the registered route", async () => {
  const setup = fixture();
  const open = setup.runtime.openSlot;
  setup.runtime.openSlot = slot => ({ ...open(slot), originUrl: "http://127.0.0.1:9010/Loading-museum/?mode=other" });
  const result = await runS1Preparation(setup);
  assert.equal(result.stop.reason, "ADAPTER_FAILURE");
  assert.equal(result.records[4].primaryVerdict, "NOT_TESTED");
  assert.equal(setup.products.get(slots[0].id).includes("page.goto"), false);
  assert.deepEqual(setup.opened, [slots[0].id]);
});

test("settling the in-flight target clock after the soft deadline cannot read primary", async () => {
  const reached = Promise.withResolvers(), pending = Promise.withResolvers();
  const setup = fixture({ onTargetAdvance() { reached.resolve(); return pending.promise; } });
  const running = runS1Preparation(setup);
  await reached.promise;
  setup.clock.advance(1_170_000);
  const result = await running;
  pending.resolve();
  await setImmediate();
  assert.equal(result.records[4].state, "STARTED_INTERRUPTED");
  assert.equal(result.records[4].primaryVerdict, "NOT_TESTED");
  assert.equal(setup.products.get(slots[0].id).includes("primary.getAttribute"), false);
  assert.deepEqual(setup.opened, [slots[0].id]);
});

test("an outer stop request interrupts a pending operation before observing primary", async () => {
  const reached = Promise.withResolvers(), pending = Promise.withResolvers();
  const setup = fixture({ onTargetAdvance() { reached.resolve(); return pending.promise; } });
  const controller = new AbortController();
  const running = runS1Preparation({ ...setup, stopSignal: controller.signal });
  await reached.promise;
  controller.abort();
  const result = await running;
  pending.resolve();
  await setImmediate();
  assert.equal(result.stop.reason, "SUPERVISOR_STOP");
  assert.equal(result.records[4].state, "STARTED_INTERRUPTED");
  assert.equal(result.records[4].primaryVerdict, "NOT_TESTED");
  assert.deepEqual(setup.opened, [slots[0].id]);
});
