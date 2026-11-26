import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { apiSequence, targets } from "../../scripts/phase7d-api-plan.mjs";
import { diagnoseI1, orderFromS1DriverMarks } from "./i1-timing.mjs";

const s1Root = '#modern-exhibit-swipe-dismiss >> internal:testid=[data-testid="swipe-to-dismiss"s]';
const primarySeq = apiSequence("swipe", "S1").indexOf("primary.getAttribute") + 1;
const instrumented = registration.slots.filter(slot => slot.level === "I1" || slot.level === "I2");

function unresolved(reason) {
  return { order: null, diagnosis: "UNKNOWN", reason };
}

function completed(call) {
  return typeof call.before.callId === "string" && call.before.callId.length > 0 &&
    call.after?.callId === call.before.callId && !call.after.error;
}

function isTargetRead(call) {
  const { before, after } = call;
  return before.class === "Frame" && before.params?.name === "data-state" &&
    before.params.selector === s1Root && before.params.strict === true && before.params.timeout === 9000 &&
    typeof before.pageId === "string" && before.pageId.length > 0 && typeof after?.result?.value === "string" &&
    completed(call);
}

/**
 * Joins decoded Playwright calls to a separately obtained primary record and the
 * host's follow-up value. The caller must establish archival integrity, identify
 * the target generation and independently audit the complete input sequence.
 */
export function bindS1ReadMarkers({ primaryReceipt, followupState, generation, trace, marks }) {
  const slot = instrumented.find(entry => entry.id === primaryReceipt?.slotId);
  const primary = primaryReceipt?.primary;
  if (!slot || marks?.level !== slot.level || marks?.slotId !== slot.id || !marks.streamId ||
      primaryReceipt.streamId !== marks.streamId || primary?.apiSeq !== primarySeq ||
      typeof primary.state !== "string" || primary.verdict !== (primary.state === targets.swipe.expected ? "PASS" : "FAIL") ||
      typeof followupState !== "string" || !Number.isSafeInteger(generation) || generation < 0) {
    return unresolved("PRIMARY_RECEIPT_MISMATCH");
  }
  const calls = trace?.calls;
  if (trace?.hasAutomaticImages !== false || trace?.hasSnapshots !== false || !Array.isArray(calls) ||
      !calls.every(call => call?.before && typeof call.before.method === "string")) {
    return unresolved("TRACE_UNAVAILABLE");
  }
  const reads = calls.filter(call => call.before.method === "getAttribute");
  const clocks = calls.filter(call => call.before.method === "clockRunFor");
  const pictures = calls.filter(call => call.before.method === "screenshot");
  if (reads.length !== 4 || !reads.every(isTargetRead) ||
      new Set(reads.map(call => call.before.callId)).size !== 4 ||
      clocks.length !== 3 || pictures.length !== 1 ||
      !clocks.every((call, index) => completed(call) && call.before.class === "BrowserContext" &&
        call.before.params?.ticksNumber === [500, 300, 500][index])) {
    return unresolved("UNEXPECTED_READ_SEQUENCE");
  }
  const [prefix, undo, primaryRead, followupRead] = reads;
  const page = primaryRead.before.pageId;
  const [picture] = pictures;
  const boundary = calls.indexOf(primaryRead);
  const mouseUp = calls[boundary - 2];
  if (calls[calls.indexOf(clocks[0]) + 1] !== prefix ||
      calls[calls.indexOf(undo) + 1] !== clocks[1] ||
      !mouseUp || mouseUp.before.method !== "mouseUp" || mouseUp.before.pageId !== page || !completed(mouseUp) ||
      calls[boundary - 1] !== clocks[2] || calls[boundary + 1] !== picture || calls[boundary + 2] !== followupRead ||
      !completed(picture) || picture.before.class !== "Page" || picture.before.pageId !== page ||
      picture.before.params?.timeout !== 9000 || !reads.every(call => call.before.pageId === page) ||
      prefix.after.result.value !== "dismissed" || undo.after.result.value !== "idle" ||
      primaryRead.after.result.value !== primary.state || followupRead.after.result.value !== followupState) {
    return unresolved("TRACE_READS_DO_NOT_MATCH");
  }
  const primaryCallId = primaryRead.before.callId, followupCallId = followupRead.before.callId;
  const order = orderFromS1DriverMarks(marks, { slotId: slot.id, generation, primaryCallId, followupCallId });
  if (!order) return unresolved("DRIVER_MARKS_UNPROVEN");
  const finding = diagnoseI1({ trace: marks, primary: { slotId: slot.id, state: primary.state, generation }, order });
  return { order, primaryCallId, followupCallId, ...finding };
}
