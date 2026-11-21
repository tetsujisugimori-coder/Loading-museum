import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };

const markCapacity = registration.bounds.perSlotMarkCapacity;
const kinds = ["timerRegistered", "callbackStarted", "updateRequested", "reactCommitted"];
const i1Kinds = [...kinds, "driverTargetMarked"];
const i2Kinds = [...i1Kinds, "domStateAtCommit", "domMutationDelivered", "transitionDelivered", "observerUnavailable",
  "timerCancelled", "callbackEnded"];

function validMark(mark, kinds) {
  if (!kinds.includes(mark?.kind) || !Number.isSafeInteger(mark.generation) || mark.generation < 0 ||
      !Number.isSafeInteger(mark.activeGeneration) || mark.activeGeneration < mark.generation ||
      (!["callbackStarted", "timerCancelled"].includes(mark.kind) && mark.activeGeneration !== mark.generation) ||
      (mark.kind === "timerCancelled" && mark.activeGeneration <= mark.generation)) return false;
  const { kind, state, detail } = mark;
  if (kind === "driverTargetMarked") return state === null && typeof detail === "string" && detail.length > 0;
  if (kind === "observerUnavailable") return state === null && ["target", "MutationObserver"].includes(detail);
  if (kind === "domStateAtCommit") return (state === null || typeof state === "string") && detail === null;
  if (kind === "domMutationDelivered") {
    return (state === null || typeof state === "string") && (detail === null || typeof detail === "string");
  }
  if (kind === "transitionDelivered") {
    return state === null && Array.isArray(detail) && detail.length === 3 &&
      ["transitionrun", "transitionstart", "transitionend", "transitioncancel"].includes(detail[0]) &&
      ["transform", "opacity"].includes(detail[1]) && Number.isFinite(detail[2]) && detail[2] >= 0;
  }
  return typeof state === "string" && state.length > 0 && detail === null;
}

function makeRecorder(slotId, streamId, level, capacity, kinds) {
  const events = [];
  let firstLost = null;
  let invalid = false;
  let sealed = false;
  return Object.freeze({
    mark(kind, generation, state, activeGeneration = generation, detail = null) {
      if (sealed) return;
      if (events.length === capacity) {
        firstLost = capacity + 1;
        return;
      }
      const event = { sequence: events.length + 1, kind, generation, state, activeGeneration, detail };
      if (!validMark(event, kinds) || activeGeneration < (events.at(-1)?.activeGeneration ?? 0)) invalid = true;
      else {
        if (Array.isArray(detail)) event.detail = Object.freeze(detail.slice());
        events.push(Object.freeze(event));
        if (kind === "observerUnavailable") invalid = true;
      }
    },
    finish() {
      sealed = true;
      return Object.freeze({
        slotId, streamId, level, events: Object.freeze(events.slice()),
        firstLost, complete: firstLost === null && !invalid,
      });
    },
  });
}

function validateIdentity(slotId, streamId) {
  if (![slotId, streamId].every(value => typeof value === "string" && value.length > 0)) {
    throw new TypeError("I1 needs a slot and stream identity");
  }
}

export function createI1Recorder(slotId, streamId) {
  validateIdentity(slotId, streamId);
  return makeRecorder(slotId, streamId, "I1", markCapacity, i1Kinds);
}

export function createI2Recorder(slotId, streamId) {
  validateIdentity(slotId, streamId);
  return makeRecorder(slotId, streamId, "I2", markCapacity, i2Kinds);
}

function initSource(slotId, streamId, level, acceptedKinds) {
  validateIdentity(slotId, streamId);
  return `(() => {
    ${validMark.toString()}
    const recorder = (${makeRecorder.toString()})(${JSON.stringify(slotId)}, ${JSON.stringify(streamId)}, ${JSON.stringify(level)}, ${markCapacity}, ${JSON.stringify(acceptedKinds)});
    Object.defineProperty(globalThis, "__lm88StageCI1", { value: recorder });
  })();`;
}

/** Source for the isolated context only. Constructing it performs no browser operation. */
export function i1RecorderInitSource(slotId, streamId) {
  return initSource(slotId, streamId, "I1", i1Kinds);
}

export function i2RecorderInitSource(slotId, streamId) {
  return initSource(slotId, streamId, "I2", i2Kinds);
}

/**
 * Both call IDs must come from authenticated primary and common follow-up operations
 * on this same slot, in the original order. Playwright's synchronous target mark
 * precedes each getAttribute body. The next mark provides a conservative upper
 * bound without asserting that no work intervened after the first mark.
 */
export function orderFromS1DriverMarks(trace, { slotId, generation, primaryCallId, followupCallId }) {
  if (trace?.complete !== true || trace.firstLost !== null || !Array.isArray(trace.events) ||
      trace.slotId !== slotId || typeof trace.streamId !== "string" ||
      typeof primaryCallId !== "string" || !primaryCallId || typeof followupCallId !== "string" ||
      !followupCallId || primaryCallId === followupCallId) return null;
  const marks = id => trace.events.filter(mark => mark?.kind === "driverTargetMarked" && mark.detail === id);
  const primary = marks(primaryCallId);
  const followup = marks(followupCallId);
  if (primary.length !== 1 || followup.length !== 1 ||
      primary[0].generation !== generation || followup[0].generation !== generation ||
      primary[0].sequence >= followup[0].sequence) return null;
  return {
    slotId, streamId: trace.streamId, generation,
    beforeSequence: primary[0].sequence, afterSequence: followup[0].sequence - 1,
  };
}

function unknown(reason) {
  return { diagnosis: "UNKNOWN", reason };
}

/**
 * The caller supplies independently established bounds for the original DOM sample.
 * beforeSequence is the last mark guaranteed to precede the sample. afterSequence
 * bounds the last mark that could precede it. Both refer to this recorder's stream.
 * Host timestamps and a successful runFor do not supply those bounds.
 */
export function diagnoseI1({ trace, primary, order }) {
  const acceptedKinds = trace?.level === "I1" ? i1Kinds : trace?.level === "I2" ? i2Kinds : null;
  if (trace?.complete !== true || trace.firstLost !== null || !Array.isArray(trace.events) ||
      !acceptedKinds ||
      typeof trace.slotId !== "string" || !trace.slotId || typeof trace.streamId !== "string" || !trace.streamId ||
      trace.events.length > markCapacity ||
      !trace.events.every((event, index, events) => validMark(event, acceptedKinds) && event.kind !== "observerUnavailable" && event.sequence === index + 1 &&
        event.activeGeneration >= (events[index - 1]?.activeGeneration ?? 0))) {
    return unknown("INCOMPLETE_OR_INVALID_TRACE");
  }
  if (primary?.state !== "dismissing" || !Number.isSafeInteger(primary.generation) || primary.generation < 0 ||
      primary.slotId !== trace.slotId) {
    return unknown("UNMATCHED_PRIMARY");
  }
  const { beforeSequence, afterSequence } = order ?? {};
  if (order?.streamId !== trace.streamId || order?.slotId !== trace.slotId || order?.generation !== primary.generation ||
      !Number.isSafeInteger(beforeSequence) || !Number.isSafeInteger(afterSequence) ||
      beforeSequence < 0 || afterSequence < beforeSequence || afterSequence > trace.events.length) {
    return unknown("PRIMARY_ORDER_UNPROVEN");
  }
  if (trace.events.some(event => event.activeGeneration > primary.generation && event.sequence <= afterSequence)) {
    return unknown("GENERATION_CHANGED");
  }

  const relevant = trace.events.filter(event => event.generation === primary.generation && event.state === "dismissed");
  const byKind = kinds.map(kind => relevant.filter(event => event.kind === kind));
  const [registered, callback, request, commit] = byKind.map(([event]) => event);
  const ordered = [registered, callback, request, commit];
  if (!registered || registered.sequence > beforeSequence || byKind.some(events => events.length > 1) ||
      ordered.some((event, index) => event && index > 0 &&
        (!ordered[index - 1] || ordered[index - 1].sequence >= event.sequence))) {
    return unknown("MISSING_OR_AMBIGUOUS_CHAIN");
  }
  if (!callback || callback.sequence > afterSequence) {
    return { diagnosis: "CALLBACK_NOT_STARTED_AT_PRIMARY", reason: "REGISTERED_WITH_NO_PRE_PRIMARY_CALLBACK" };
  }
  if (callback.sequence > beforeSequence || callback.activeGeneration !== primary.generation ||
      !request || request.sequence > beforeSequence) {
    return unknown("CALLBACK_OR_UPDATE_ORDER_UNPROVEN");
  }
  if (commit && commit.sequence <= afterSequence) return unknown("COMMIT_BEFORE_OR_NEAR_PRIMARY");
  return {
    diagnosis: "UPDATE_REQUESTED_COMMIT_NOT_OBSERVED_AT_PRIMARY",
    reason: commit ? "COMMIT_OBSERVED_LATER" : "COMMIT_NOT_IN_CAPTURE",
  };
}
