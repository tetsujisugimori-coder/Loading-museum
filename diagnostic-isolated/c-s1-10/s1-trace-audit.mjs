import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { traceOperations } from "../../scripts/phase7d-api-trace-spec.mjs";
import { inspectPlaywrightTrace } from "../../scripts/phase7d-trace-evidence.mjs";
import { stageCS1FinishMarks, stageCS1InitSource } from "./s1-preparation.mjs";

const pageMethods = new Set(["addInitScript", "keyboardPress", "mouseMove", "mouseDown", "mouseUp", "screenshot"]);
const contextMethods = new Set(["newPage", "clockInstall", "clockPauseAt", "clockRunFor"]);
const allowedEvents = new Set(["context-options", "before", "after", "log", "input", "event"]);
const evalParams = expression => ({ expression, isFunction: true, arg: { value: { v: "undefined" }, handles: [] } });

/** Decodes the original ZIP independently of Playwright and of the runner's API ledger. */
export function auditS1Trace(bytes, { slot, streamId, input, primaryState, followupState, resourceCount }) {
  const raw = inspectPlaywrightTrace(bytes);
  assert.equal(raw.context.browserName, "webkit");
  assert.equal(raw.context.origin, "library");
  assert.equal(raw.context.platform, "linux");
  const { width, height, touch, reducedMotion } = registration.environment.viewport;
  assert.deepEqual(raw.context.options.viewport, { width, height });
  assert.equal(raw.context.options.hasTouch, touch);
  assert.equal(raw.context.options.reducedMotion, reducedMotion);
  assert.match(raw.context.options.userAgent, / Version\/26\.0 /);
  assert.ok([...raw.entries.keys()].every(name => ["trace.trace", "trace.network", "trace.stacks"].includes(name)),
    "unexpected trace artifacts");
  assert.ok(raw.events.every(row => allowedEvents.has(row.type)), "unexpected trace events or automatic observations");
  assert.match(input.destination, /^http:\/\/127\.0\.0\.1:\d+\/Loading-museum\/#modern-exhibit-swipe-dismiss$/);
  assert.ok(Number.isSafeInteger(input.pauseAt) && input.pauseAt > 0, "invalid original clock observation");
  assert.ok(["x", "y", "width", "height"].every(key => Number.isFinite(input.rectangle[key])) &&
    input.rectangle.width > 0 && input.rectangle.height > 0, "invalid original input rectangle");
  const spec = traceOperations({ case: "swipe", group: "S1", url: input.destination,
    clockOrigin: { requestedPauseAtMs: input.pauseAt }, inputRectangle: input.rectangle });
  assert.equal(spec[1].method, "addInitScript");
  spec[1].params.source = stageCS1InitSource(slot, streamId);
  if (slot.level !== "I0") spec.push({ method: "evaluateExpression", params: evalParams(stageCS1FinishMarks.toString()) });

  const page = raw.calls[1]?.pageId;
  assert.match(page ?? "", /^page@\w+$/);
  assert.ok(raw.calls.length >= spec.length, "missing raw operations");
  let previousEnd = -Infinity;
  for (const [index, expected] of spec.entries()) {
    const before = raw.calls[index];
    const after = raw.after.get(before.callId);
    const kind = contextMethods.has(expected.method) ? "BrowserContext" : pageMethods.has(expected.method) ? "Page" : "Frame";
    assert.equal(before.method, expected.method, expected.name);
    assert.equal(before.class, kind, "unexpected protocol owner");
    assert.equal(before.pageId, kind === "BrowserContext" ? undefined : page, "foreign operation page");
    assert.deepEqual(before.params, expected.params, expected.name ?? "mark collection");
    assert.ok(Number.isFinite(before.startTime) && before.startTime >= previousEnd &&
      Number.isFinite(after?.endTime) && !after.error,
      "missing or failed operation completion");
    previousEnd = after.endTime;
    const value = after.result?.value;
    if (expected.result !== undefined) assert.equal(value, expected.result, expected.name);
    if (expected.name === "clock.origin.evaluate") assert.deepEqual(value, { n: input.pauseAt });
    if (expected.name === "primary.getAttribute") assert.equal(value, primaryState, "original primary mismatch");
    if (expected.name === "followup.getAttribute") assert.equal(value, followupState, "original follow-up mismatch");
  }

  // The pinned driver may omit body calls when tracing snapshots is disabled.
  // If it records them, only complete deferred calls are admitted here.
  const deferred = raw.calls.slice(spec.length);
  assert.ok(deferred.length === 0 || deferred.length === resourceCount, "unexpected deferred calls");
  assert.ok(deferred.every(call => call.class === "Response" && call.method === "body" &&
    Object.keys(call.params ?? {}).length === 0 && raw.after.has(call.callId) && !raw.after.get(call.callId).error),
  "unexpected operation after the original sequence");
  return { sha256: raw.sha256, calls: raw.calls.slice(0, spec.length).map(before =>
    ({ before, after: raw.after.get(before.callId) })), hasAutomaticImages: false, hasSnapshots: false };
}

/** Bind the target epoch using all four independently checked Playwright call IDs. */
export function s1TargetGeneration(trace, marks) {
  const reads = trace.calls.filter(call => call.before.method === "getAttribute");
  if (reads.length !== 4 || marks?.complete !== true || !Array.isArray(marks.events)) return null;
  const readMarks = reads.map(({ before }) => marks.events.filter(mark =>
    mark.kind === "driverTargetMarked" && mark.detail === before.callId));
  if (!readMarks.every(matches => matches.length === 1)) return null;
  const [keyboard, undo, primary, followup] = readMarks.flat();
  if (!(keyboard.sequence < undo.sequence && undo.sequence < primary.sequence && primary.sequence < followup.sequence &&
      keyboard.generation < undo.generation && undo.generation < primary.generation && primary.generation === followup.generation)) return null;
  const timers = marks.events.filter(mark => mark.kind === "timerRegistered" && mark.sequence > undo.sequence &&
    mark.sequence < primary.sequence);
  if (timers.length !== 1 || timers[0].generation !== primary.generation) return null;
  return primary.generation;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tracePath, oraclePath] = process.argv.slice(2);
  assert.ok(tracePath && oraclePath);
  assert.ok(statSync(tracePath).size <= 64 * 1024 * 1024, "trace size limit");
  const oracle = JSON.parse(readFileSync(oraclePath));
  console.log(JSON.stringify(auditS1Trace(readFileSync(tracePath), oracle)));
}
