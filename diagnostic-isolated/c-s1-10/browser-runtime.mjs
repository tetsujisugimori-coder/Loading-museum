import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { observationPolicy } from "../../scripts/phase7d-api-plan.mjs";
import { createBrowserCalibration } from "./browser-calibration.mjs";
import { createRawEvidence } from "./raw-evidence.mjs";
import { freezeResourcePlan, startPinnedServer } from "./resource-evidence.mjs";
import { bindS1ReadMarkers } from "./s1-read-proof.mjs";
import { runS1Preparation, stageCS1FinishMarks } from "./s1-preparation.mjs";
import { attachStageCNetwork } from "./stage-c-network-adapter.mjs";
import { bindStageCNetworkPolicy } from "./stage-c-network-policy.mjs";
import { createNetworkOperationGate } from "./stage-c-operation-gate.mjs";
import { s1TargetGeneration } from "./s1-trace-audit.mjs";

const execute = promisify(execFile);
const auditor = fileURLToPath(new URL("./s1-trace-audit.mjs", import.meta.url));
function json(value) {
  return Buffer.from(JSON.stringify(value));
}

function assertAuthorized() {
  if (registration.decision === "HOLD" || registration.executionAuthorization !== true || registration.executable !== true) {
    throw new Error("Stage C browser execution is on HOLD");
  }
}

// trustedResources is supplied independently of the browser or its trace.
export function prepareBrowserStageC({ webkit, clock, stopSignal, trustedResources, networkRules, onNetworkStop, evidenceDirectory }) {
  const root = resolve(evidenceDirectory);
  const planBySlot = new Map();
  for (const slot of registration.slots.filter(slot => slot.originalProductTrial !== false)) {
    planBySlot.set(slot.id, freezeResourcePlan(trustedResources.get(slot.id)));
  }
  return { run };

  async function run() {
    assertAuthorized();
    const evidence = createRawEvidence(root);
    const sessions = new Map();
    const receipts = new Map();
    let cleanupFailed = false;
    let persistenceFailed = false;
    const networkStop = new AbortController();
    const gate = createNetworkOperationGate(fault => {
      networkStop.abort(fault);
      try { onNetworkStop?.(fault); }
      catch { persistenceFailed = true; }
    });
    const write = (name, bytes) => {
      try { evidence.write(name, bytes); }
      catch (error) { persistenceFailed = true; throw error; }
    };
    const read = name => {
      try { return evidence.read(name); }
      catch (error) { persistenceFailed = true; throw error; }
    };
    const save = (name, bytes) => {
      write(name, bytes);
      if (!read(name).equals(bytes)) {
        persistenceFailed = true;
        throw new Error(`Evidence readback mismatch: ${name}`);
      }
    };
    function persistNetwork(session, interrupted) {
      const { slotId } = session;
      const cleanup = session.closeStatus ?? "INCOMPLETE";
      const receipt = session.network?.sealAndPersist(evidence,
        session.server?.events() ?? [], interrupted || cleanup !== "PASS") ??
        { classification: "INCOMPLETE", auditVerdict: "INCOMPLETE", comparisonVerdict: "UNKNOWN",
          evidenceStatus: "INCOMPLETE", persistence: "INCOMPLETE", missing: ["NETWORK_CAPTURE_NOT_OPENED"] };
      receipts.set(slotId, { ...receipt, cleanup });
      sessions.delete(slotId);
      if (receipt.persistence !== "PASS") persistenceFailed = true;
      return receipts.get(slotId);
    }
    const openPage = async (slot, signal, plan) => {
      gate.assertMayStart(`${slot.id}:open`);
      signal.throwIfAborted();
      const session = { slotId: slot.id, errors: [], phase: "beforeNavigation" };
      let opening;
      let closing;
      session.close = () => {
        closing ??= (async () => {
          await opening?.catch(() => {});
          const failures = [];
          if (session.tracing) {
            try { await session.context.tracing.stop({ path: session.tracePath }); } catch (error) { failures.push(error); }
          }
          session.network?.beginContextClose();
          if (session.context) {
            try { await session.context.close(); } catch (error) { failures.push(error); }
          }
          if (session.browser) {
            try { await session.browser.close(); } catch (error) { failures.push(error); }
          }
          if (session.server) {
            try { await session.server.close(); } catch (error) { failures.push(error); }
          }
          session.closeStatus = failures.length ? "FAIL" : "PASS";
          if (failures.length) {
            cleanupFailed = true;
            throw new AggregateError(failures, "Stage C session cleanup failed");
          }
        })();
        return closing;
      };
      sessions.set(slot.id, session);
      opening = (async () => {
        session.checkOperation = label => {
          gate.assertMayStart(`${slot.id}:${label}`);
          signal.throwIfAborted();
        };
        if (plan) {
          session.server = await startPinnedServer(plan, signal,
            reason => gate.requestStop({ slotId: slot.id, reason }));
          session.originUrl = session.server.originUrl;
        }
        const policy = bindStageCNetworkPolicy(slot.id,
          session.originUrl ? new URL(session.originUrl).origin : "http://127.0.0.1", networkRules.get(slot.id));
        const policyName = `${slot.id}.network-policy.json`;
        save(policyName, json(policy));
        session.checkOperation("launch");
        session.browser = await webkit.launch({ headless: true });
        signal.throwIfAborted();
        if (session.browser.version() !== "26.0") throw new Error("Wrong WebKit version");
        session.checkOperation("newContext");
        const { width, height, touch, reducedMotion } = registration.environment.viewport;
        session.context = await session.browser.newContext({ viewport: { width, height }, hasTouch: touch, reducedMotion });
        signal.throwIfAborted();
        session.network = attachStageCNetwork(session.context, policy, gate, signal, () => session.phase);
        if (plan) {
          session.checkOperation("trace.start");
          session.tracePath = join(root, `${slot.id}.trace.zip`);
          await session.context.tracing.start(observationPolicy.trace);
          session.tracing = true;
          signal.throwIfAborted();
        }
        session.checkOperation("newPage");
        session.page = await session.context.newPage();
        session.page.on("pageerror", error => session.errors.push(String(error)));
        signal.throwIfAborted();
        if (plan) {
          session.streamId = `${slot.id}:product`;
          session.check = () => {
            session.checkOperation("product command");
            if (session.errors.length) throw new Error("Page error");
          };
        }
      })();
      try {
        await opening;
        return session;
      } catch (error) {
        await session.close();
        throw error;
      }
    };
    const calibrationRuntime = createBrowserCalibration({ openPage, evidence: { write, read } });
    const calibrationBytes = new Map();
    const calibration = {
      ...calibrationRuntime,
      async runCalibration(slot, signal) {
        const observed = await calibrationRuntime.runCalibration(slot, signal);
        calibrationBytes.set(slot.id, Buffer.from(observed.savedBytes));
        return observed;
      },
      readBackCalibration(slot, signal) {
        const bytes = calibrationRuntime.readBackCalibration(slot, signal);
        const matches = bytes.equals(calibrationBytes.get(slot.id));
        if (!matches) persistenceFailed = true;
        const receipt = persistNetwork(sessions.get(slot.id), !matches);
        if (receipt.classification !== "BASELINE_MATCH") throw new Error("Calibration network evidence incomplete");
        return bytes;
      },
    };
    const originalPrimary = new Map();
    const runtime = {
      openSlot(slot, signal) {
        return openPage(slot, signal, planBySlot.get(slot.id));
      },
      writePrimary(slot, bytes) {
        write(`${slot.id}.primary.json`, bytes);
        originalPrimary.set(slot.id, Buffer.from(bytes));
      },
      async collectBody(slot, session, followup, signal, input) {
        session.check();
        session.input = input;
        session.followupState = followup.state;
        save(`${slot.id}.followup.png`, followup.screenshot);
        save(`${slot.id}.followup.json`, json({ state: followup.state }));
        if (slot.level !== "I0") {
          signal.throwIfAborted();
          session.checkOperation("timing marks");
          session.marks = await session.page.evaluate(stageCS1FinishMarks);
          signal.throwIfAborted();
          save(`${slot.id}.marks.json`, json(session.marks ?? null));
          if (!session.marks?.complete) throw new Error("Incomplete timing marks");
        }
        session.phase = "deferredBody";
        session.bodyCalls = await session.network.collectBodies(signal);
      },
      async closeSlot(slot, session, signal) {
        session.phase = "cleanup";
        await session.close();
        signal.throwIfAborted();
        if (session.errors.length) throw new Error("Page error");
        const primaryBytes = read(`${slot.id}.primary.json`);
        if (!primaryBytes.equals(originalPrimary.get(slot.id))) {
          persistenceFailed = true;
          throw new Error("Saved primary bytes mismatch");
        }
        const primaryReceipt = JSON.parse(primaryBytes);
        const oracle = {
          slot, streamId: session.streamId, input: session.input,
          primaryState: primaryReceipt.primary.state, followupState: session.followupState,
          resourceCount: session.bodyCalls,
        };
        const oracleName = `${slot.id}.trace-input.json`;
        save(oracleName, json(oracle));
        signal.throwIfAborted();
        const { stdout } = await execute(process.execPath, [auditor, session.tracePath, join(root, oracleName)],
          { signal, maxBuffer: 8 * 1024 * 1024 });
        signal.throwIfAborted();
        const trace = JSON.parse(stdout);
        save(`${slot.id}.trace-audit.json`, json({ sha256: trace.sha256, calls: trace.calls.length }));
        if (slot.level !== "I0") {
          const generation = s1TargetGeneration(trace, session.marks);
          const timing = bindS1ReadMarkers({ primaryReceipt, followupState: session.followupState,
            generation, trace, marks: session.marks });
          save(`${slot.id}.timing.json`, json(timing));
          if (!timing.order) throw new Error("Unknown target generation or read order");
        }
        return persistNetwork(session, false);
      },
      async cleanup(_reason, signal, settlePrimary) {
        const active = [...sessions.values()];
        const outcomes = await Promise.allSettled(active.map(session => {
          session.phase = "cleanup";
          return session.close();
        }));
        signal.throwIfAborted();
        for (const session of active) persistNetwork(session, true);
        await settlePrimary();
        signal.throwIfAborted();
        const persistedPrimaryVerdicts = new Map();
        for (const [slotId, original] of originalPrimary) {
          try {
            const bytes = read(`${slotId}.primary.json`);
            if (!bytes.equals(original)) throw new Error("Saved primary bytes mismatch");
            persistedPrimaryVerdicts.set(slotId, JSON.parse(bytes).primary.verdict);
          } catch {
            persistenceFailed = true;
          }
        }
        return {
          persistedPrimaryVerdicts, networkReceipts: receipts,
          cleanup: !cleanupFailed && outcomes.every(outcome => outcome.status === "fulfilled") ? "PASS" : "FAIL",
          persistence: persistenceFailed ? "FAIL" : "PASS",
        };
      },
    };
    const result = await runS1Preparation({ clock, stopSignal, networkStopSignal: networkStop.signal,
      runtime, calibration });
    return { ...result, networkStop: gate.snapshot(),
      networkReceipts: Object.fromEntries(receipts) };
  }
}
