import { Buffer } from "node:buffer";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };

const interrupted = Symbol("interrupted");
const slots = registration.slots.map(slot => Object.freeze({ ...slot }));
const primaryVerdicts = new Set(["PASS", "FAIL", "NOT_TESTED"]);
const { overflowFixture } = registration.calibration;
const stopAfterMs = registration.bounds.beginStopAndCleanupBySeconds * 1000;
const cutOffAfterMs = registration.bounds.absoluteCutoffSeconds * 1000;
const cleanupGraceMs = registration.bounds.cleanupGraceSecondsApproved * 1000;

export class DeferredBodyAuditError extends Error {}

// The clock is monotonic and schedules cancellable callbacks at absolute milliseconds.
function supervise(clock, stopSignal, networkStopSignal) {
  const start = clock.startedAt ?? clock.now();
  const work = new AbortController();
  const cleanup = new AbortController();
  const stop = { reason: null, requestedAtMs: null, completedAtMs: null, cutoffAtMs: null };
  const workStopped = Promise.withResolvers();
  const hardCutoff = Promise.withResolvers();
  const elapsed = () => clock.now() - start;
  let networkCutoffMs = Infinity;
  let cancelNetworkCutoff;

  function requestStop(reason, atMs) {
    if (stop.reason !== null) return;
    stop.reason = reason;
    stop.requestedAtMs = atMs;
    workStopped.resolve(interrupted);
    work.abort(reason);
  }

  function cutOff(atMs) {
    if (stop.cutoffAtMs !== null) return;
    stop.cutoffAtMs = atMs;
    requestStop("TIME_LIMIT", atMs);
    hardCutoff.resolve(interrupted);
    cleanup.abort("HARD_CUTOFF");
  }

  function checkDeadlines() {
    const age = elapsed();
    if (age >= Math.min(cutOffAfterMs, networkCutoffMs)) cutOff(age);
    else if (age >= stopAfterMs) requestStop("TIME_LIMIT", age);
    return age;
  }

  const cancelSoft = clock.scheduleAt(start + stopAfterMs, checkDeadlines);
  const cancelHard = clock.scheduleAt(start + cutOffAfterMs, checkDeadlines);
  const externalStop = () => requestStop("SUPERVISOR_STOP", checkDeadlines());
  const networkStop = () => {
    const now = checkDeadlines();
    requestStop("NETWORK_MISMATCH", now);
    networkCutoffMs = now + cleanupGraceMs;
    if (networkCutoffMs < cutOffAfterMs) {
      cancelNetworkCutoff = clock.scheduleAt(start + networkCutoffMs, checkDeadlines);
    }
  };
  if (networkStopSignal?.aborted) networkStop();
  else networkStopSignal?.addEventListener("abort", networkStop, { once: true });
  if (stopSignal?.aborted) externalStop();
  else stopSignal?.addEventListener("abort", externalStop, { once: true });

  async function bounded(operation, signal, limit) {
    checkDeadlines();
    if (signal.aborted) return interrupted;
    try {
      const result = await Promise.race([operation(signal), limit.promise]);
      checkDeadlines();
      return signal.aborted ? interrupted : result;
    } catch (error) {
      checkDeadlines();
      if (signal.aborted) return interrupted;
      throw error;
    }
  }

  // An await after bounded() can let a deadline fire before the caller writes a result.
  function commit(signal, apply) {
    const age = checkDeadlines();
    return signal.aborted ? interrupted : apply(age);
  }

  return {
    stop, requestStop,
    work: operation => bounded(operation, work.signal, workStopped),
    cleanup: operation => bounded(operation, cleanup.signal, hardCutoff),
    commitWork: apply => commit(work.signal, apply),
    commitCleanup: apply => commit(cleanup.signal, apply),
    close() {
      cancelSoft();
      cancelHard();
      cancelNetworkCutoff?.();
      networkStopSignal?.removeEventListener("abort", networkStop);
      stopSignal?.removeEventListener("abort", externalStop);
    },
  };
}

function bytesMatch(expected, actual) {
  return actual instanceof Uint8Array && expected.equals(actual);
}

function expectedCalibration(slot, observation) {
  if (observation?.fixture !== slot.fixture || observation.controlsPass !== true) return false;
  if (slot.id === overflowFixture.slotId) {
    return observation.capacity === overflowFixture.maxMarks &&
      observation.firstLost === overflowFixture.expectedFirstLost &&
      observation.evidence === overflowFixture.expectedEvidence &&
      observation.cause === overflowFixture.cause;
  }
  const cancelled = slot.fixture === "cancelled-callback-fault";
  return observation.firstLost === null &&
    observation.evidence === (cancelled ? "INCOMPLETE" : "COMPLETE") &&
    (!cancelled || observation.cause === "UNKNOWN");
}

async function calibrate(slot, record, adapter, supervisor) {
  const observed = await supervisor.work(signal => {
    record.state = "STARTED";
    return adapter.runCalibration(slot, signal);
  });
  if (observed === interrupted) return;
  const original = observed?.savedBytes;
  const valid = expectedCalibration(slot, observed) && original instanceof Uint8Array && original.length > 0;
  const expected = valid ? Buffer.from(original) : null;
  const evidence = observed?.evidence ?? "INCOMPLETE";
  const cause = observed?.cause ?? null;
  const committed = supervisor.commitWork(atMs => {
    record.evidence = evidence;
    record.cause = cause;
    if (!valid) {
      record.calibrationVerdict = "FAIL";
      supervisor.requestStop("CALIBRATION_OBSERVATION", atMs);
    }
  });
  if (committed === interrupted || !expected) return;
  let readBack;
  try {
    readBack = await supervisor.work(signal => adapter.readBackCalibration(slot, signal));
  } catch {
    readBack = null;
  }
  if (readBack === interrupted) return;
  const matches = bytesMatch(expected, readBack);
  supervisor.commitWork(atMs => {
    record.calibrationVerdict = matches ? "PASS" : "FAIL";
    if (matches) record.state = "COMPLETED";
    else supervisor.requestStop("CALIBRATION_READBACK", atMs);
  });
}

function finalizationStatus(value) {
  return value === "PASS" || value === "FAIL" ? value : "INCOMPLETE";
}

async function finalizeCalibration(adapter, supervisor, status) {
  let result;
  try {
    result = await supervisor.work(signal => adapter.finalizeCalibration(signal));
  } catch {
    result = null;
  }
  if (result === interrupted) return;
  const cleanup = finalizationStatus(result?.cleanup);
  const persistence = finalizationStatus(result?.persistence);
  supervisor.commitWork(atMs => {
    Object.assign(status, { cleanup, persistence });
    if (cleanup !== "PASS" || persistence !== "PASS") {
      supervisor.requestStop("CALIBRATION_FINALIZATION_FAILURE", atMs);
    }
  });
}

async function observeProduct(slot, record, adapter, expectedBody, supervisor) {
  const primary = await supervisor.work(signal => {
    record.state = "STARTED";
    record.primaryVerdict = "NOT_TESTED";
    return adapter.observePrimary(slot, signal);
  });
  if (primary === interrupted) return;
  const valid = primaryVerdicts.has(primary);
  supervisor.commitWork(atMs => {
    if (valid) record.primaryVerdict = primary;
    else supervisor.requestStop("INVALID_PRIMARY", atMs);
  });
  const followup = await supervisor.work(signal => adapter.observeFollowup(slot, signal));
  if (followup === interrupted) return;

  let body;
  try {
    body = await supervisor.work(signal => adapter.collectBody(slot, signal));
  } catch {
    body = null;
  }
  if (body === interrupted) return;
  const matches = bytesMatch(expectedBody, body);
  const finalizeSlot = typeof adapter.finalizeProductSlot === "function";
  const committed = supervisor.commitWork(atMs => {
    if (!matches) {
      failBodyAudit(record, supervisor, atMs);
      return;
    }
    record.auditVerdict = "PASS";
    if (!finalizeSlot) {
      record.evidence = "COMPLETE";
      record.state = "COMPLETED";
    }
  });
  if (committed === interrupted || !matches || !finalizeSlot) return;
  try {
    const result = await supervisor.work(signal => adapter.finalizeProductSlot(slot, signal));
    if (result === interrupted) return;
    supervisor.commitWork(() => {
      record.evidence = "COMPLETE";
      record.state = "COMPLETED";
    });
  } catch (error) {
    supervisor.commitWork(atMs => {
      if (error instanceof DeferredBodyAuditError) failBodyAudit(record, supervisor, atMs);
      else supervisor.requestStop("PRODUCT_FINALIZATION_FAILURE", atMs);
    });
  }
}

function failBodyAudit(record, supervisor, atMs) {
  record.auditVerdict = "FAIL";
  record.evidence = "INCOMPLETE";
  record.state = "COMPLETED";
  record.mismatchDetectedAtMs = atMs;
  supervisor.requestStop("DEFERRED_BODY", atMs);
}

/**
 * Runs the registered sequence against synthetic adapters. Calibration production and
 * readback use separate adapter methods. finalizeCalibration verifies calibration cleanup
 * and persistence before product work. Expected body bytes are snapshotted from the fixture
 * plan before observation. All active work takes a stop signal.
 * The hard cutoff ends this supervisor's wait and aborts cleanup. Adapter termination and
 * real evidence provenance require separate verification before a browser integration.
 */
export async function runOfflineStageC({ clock, stopSignal, networkStopSignal, adapter, expectedBodies }) {
  const supervisor = supervise(clock, stopSignal, networkStopSignal);
  const records = slots.map(({ id }) => ({
    id, state: "NOT_STARTED", primaryVerdict: null, auditVerdict: null,
    calibrationVerdict: null, evidence: null, cause: null, mismatchDetectedAtMs: null,
  }));
  const calibrationFinalization = { cleanup: "INCOMPLETE", persistence: "INCOMPLETE" };
  let cleanup = "INCOMPLETE";
  let persistence = "INCOMPLETE";
  try {
    const fixtureBodies = new Map();
    for (const slot of slots.slice(registration.scope.calibrationSlots)) {
      const bytes = expectedBodies.get(slot.id);
      if (!(bytes instanceof Uint8Array)) throw new TypeError(`Missing expected body: ${slot.id}`);
      fixtureBodies.set(slot.id, Buffer.from(bytes));
    }
    try {
      for (const [index, slot] of slots.entries()) {
        if (supervisor.stop.reason !== null) break;
        if (index === registration.scope.calibrationSlots) {
          await finalizeCalibration(adapter, supervisor, calibrationFinalization);
          const { cleanup, persistence } = calibrationFinalization;
          if (cleanup !== "PASS" || persistence !== "PASS") break;
        }
        if (slot.originalProductTrial === false) {
          await calibrate(slot, records[index], adapter, supervisor);
        } else {
          await observeProduct(slot, records[index], adapter, fixtureBodies.get(slot.id), supervisor);
        }
      }
    } catch {
      supervisor.commitWork(atMs => supervisor.requestStop("ADAPTER_FAILURE", atMs));
    }

    for (const record of records) {
      if (record.state === "STARTED") {
        record.state = "STARTED_INTERRUPTED";
        record.evidence = "INCOMPLETE";
      }
    }

    try {
      const result = await supervisor.cleanup(signal => adapter.cleanup(supervisor.stop.reason, signal));
      if (result !== interrupted) {
        const cleanupResult = result?.cleanup === "PASS" ? "PASS" : "FAIL";
        const persistenceResult = result?.persistence === "PASS" ? "PASS" : "FAIL";
        supervisor.commitCleanup(atMs => {
          cleanup = cleanupResult;
          persistence = persistenceResult;
          if (cleanup !== "PASS" || persistence !== "PASS") supervisor.requestStop("FINALIZATION_FAILURE", atMs);
          else if (supervisor.stop.reason !== null) supervisor.stop.completedAtMs = atMs;
        });
      }
    } catch {
      supervisor.commitCleanup(atMs => {
        cleanup = "FAIL";
        supervisor.requestStop("FINALIZATION_FAILURE", atMs);
      });
    }
    return { records, stop: supervisor.stop, calibrationFinalization, cleanup, persistence };
  } finally {
    supervisor.close();
  }
}
