import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };

const markCapacity = registration.bounds.perSlotMarkCapacity;
const kinds = ["timerRegistered", "callbackStarted", "updateRequested", "reactCommitted"];

function validMark(mark, kinds) {
  return kinds.includes(mark?.kind) && typeof mark.state === "string" && mark.state.length > 0 &&
    Number.isSafeInteger(mark.generation) && mark.generation >= 0 &&
    Number.isSafeInteger(mark.activeGeneration) && mark.activeGeneration >= mark.generation &&
    (mark.kind === "callbackStarted" || mark.activeGeneration === mark.generation);
}

function makeRecorder(slotId, streamId, capacity, kinds) {
  const events = [];
  let firstLost = null;
  let invalid = false;
  let sealed = false;
  return Object.freeze({
    mark(kind, generation, state, activeGeneration = generation) {
      if (sealed) return;
      if (events.length === capacity) {
        firstLost = capacity + 1;
        return;
      }
      const event = { sequence: events.length + 1, kind, generation, state, activeGeneration };
      if (!validMark(event, kinds) || activeGeneration < (events.at(-1)?.activeGeneration ?? 0)) invalid = true;
      else events.push(Object.freeze(event));
    },
    finish() {
      sealed = true;
      return Object.freeze({
        slotId, streamId, events: Object.freeze(events.slice()),
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
  return makeRecorder(slotId, streamId, markCapacity, kinds);
}

/** Source for the isolated I1 context only. Constructing it performs no browser operation. */
export function i1RecorderInitSource(slotId, streamId) {
  validateIdentity(slotId, streamId);
  return `(() => {
    ${validMark.toString()}
    const recorder = (${makeRecorder.toString()})(${JSON.stringify(slotId)}, ${JSON.stringify(streamId)}, ${markCapacity}, ${JSON.stringify(kinds)});
    Object.defineProperty(globalThis, "__lm88StageCI1", { value: recorder });
  })();`;
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
  if (trace?.complete !== true || trace.firstLost !== null || !Array.isArray(trace.events) ||
      typeof trace.slotId !== "string" || !trace.slotId || typeof trace.streamId !== "string" || !trace.streamId ||
      trace.events.length > markCapacity ||
      !trace.events.every((event, index, events) => validMark(event, kinds) && event.sequence === index + 1 &&
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
