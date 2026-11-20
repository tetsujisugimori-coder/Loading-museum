import { Buffer } from "node:buffer";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { i2RecorderInitSource } from "./i1-timing.mjs";

const slots = registration.slots.slice(0, registration.scope.calibrationSlots);
const capacity = registration.bounds.perSlotMarkCapacity;

// The isolated fixture commits directly to a DOM node and does not model React.
export async function runCalibrationPage({ fixture, capacity }) {
  const recorder = globalThis.__lm88StageCI1;
  const target = document.createElement("div");
  target.setAttribute("data-state", "dismissing");
  document.body.append(target);
  const token = 7;
  let generation = token;
  let invoked = 0;
  const cancelled = fixture === "cancelled-callback-fault";
  function callback() {
    invoked++;
    recorder.mark("callbackStarted", token, "dismissed", generation);
    if (token !== generation) return;
    recorder.mark("updateRequested", generation, "dismissed");
    target.setAttribute("data-state", "dismissed");
    recorder.mark("domStateAtCommit", generation, target.getAttribute("data-state"));
    recorder.mark("callbackEnded", generation, "dismissed");
  }
  recorder.mark("timerRegistered", generation, "dismissed");
  await new Promise(resolve => {
    const handle = setTimeout(callback, 0);
    if (cancelled) {
      generation++;
      clearTimeout(handle);
      recorder.mark("timerCancelled", token, "dismissed", generation);
    }
    setTimeout(resolve, 0);
  });
  if (fixture === "overflow-fault") {
    for (let index = 5; index <= capacity; index++) recorder.mark("domStateAtCommit", generation, "dismissed");
  }
  return { fixture, generation, invoked, cancelled, terminalState: target.getAttribute("data-state"), trace: recorder.finish() };
}

export function evaluateCalibrationReceipt(raw, fixture, slotId, streamId) {
  const cancelled = fixture === "cancelled-callback-fault";
  const overflow = fixture === "overflow-fault";
  const trace = raw?.trace;
  const expectedKinds = cancelled ? ["timerRegistered", "timerCancelled"] :
    ["timerRegistered", "callbackStarted", "updateRequested", "domStateAtCommit", "callbackEnded"];
  const expectedCount = overflow ? capacity : expectedKinds.length;
  const firstLost = overflow ? capacity + 1 : null;
  const controlsPass = registration.calibration.expectedTypes.includes(fixture) &&
    raw?.fixture === fixture && raw.generation === (cancelled ? 8 : 7) && raw.invoked === (cancelled ? 0 : 1) &&
    raw.cancelled === cancelled && raw.terminalState === (cancelled ? "dismissing" : "dismissed") &&
    trace?.slotId === slotId && trace.streamId === streamId && trace.level === "I2" &&
    trace.firstLost === firstLost && trace.complete === !overflow && Array.isArray(trace.events) &&
    trace.events.length === expectedCount && trace.events.every((event, index) =>
      event?.sequence === index + 1 && event.kind === (expectedKinds[index] ?? "domStateAtCommit") &&
      event.generation === 7 && event.activeGeneration === (event.kind === "timerCancelled" ? 8 : 7) &&
      event.state === "dismissed" && event.detail === null);
  const complete = controlsPass && !overflow && !cancelled;
  return { fixture, capacity, firstLost: trace?.firstLost, controlsPass, evidence: complete ? "COMPLETE" : "INCOMPLETE",
    cause: complete ? null : "UNKNOWN" };
}

/** The injected page owner closes each isolated session and any interrupted launch. */
export function createBrowserCalibration({ openPage, evidence }) {
  const read = new Set();
  return {
    async runCalibration(slot, signal) {
      if (!registration.executionAuthorization || registration.decision === "HOLD") {
        throw new Error("Stage C calibration execution is on HOLD");
      }
      if (!slots.some(expected => expected.id === slot.id && expected.fixture === slot.fixture && expected.level === slot.level)) {
        throw new Error("Unregistered calibration slot");
      }
      const streamId = `${slot.id}:calibration`;
      const session = await openPage(slot, signal);
      let raw;
      try {
        signal.throwIfAborted();
        await session.page.evaluate(i2RecorderInitSource(slot.id, streamId));
        signal.throwIfAborted();
        raw = await session.page.evaluate(runCalibrationPage, { fixture: slot.fixture, capacity });
        signal.throwIfAborted();
        if (session.errors.length) throw new Error("Calibration page error");
      } finally {
        await session.close(signal);
      }
      signal.throwIfAborted();
      const savedBytes = Buffer.from(JSON.stringify(raw));
      evidence.write(`${slot.id}.calibration.json`, savedBytes);
      return { ...evaluateCalibrationReceipt(raw, slot.fixture, slot.id, streamId), savedBytes };
    },
    readBackCalibration(slot, signal) {
      signal.throwIfAborted();
      const bytes = evidence.read(`${slot.id}.calibration.json`);
      read.add(slot.id);
      return bytes;
    },
    finalizeCalibration(signal) {
      signal.throwIfAborted();
      return { cleanup: "PASS", persistence: slots.every(slot => read.has(slot.id)) ? "PASS" : "INCOMPLETE" };
    },
  };
}
