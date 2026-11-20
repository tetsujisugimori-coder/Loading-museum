import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { observationPolicy } from "../../scripts/phase7d-api-plan.mjs";
import { createBrowserCalibration } from "./browser-calibration.mjs";
import { DeferredBodyAuditError } from "./offline-runner.mjs";
import { createRawEvidence } from "./raw-evidence.mjs";
import { auditDelivery, expectedDelivery, freezeResourcePlan, recordBrowserResponses, startPinnedServer } from "./resource-evidence.mjs";
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
  const expectedBodies = new Map([...planBySlot].map(([id, plan]) => [id, expectedDelivery(plan)]));
  return { run };

  async function run() {
    assertAuthorized();
    const evidence = createRawEvidence(root);
    const sessions = new Set();
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
    const openPage = async (slot, signal, plan) => {
      gate.assertMayStart(`${slot.id}:open`);
      signal.throwIfAborted();
      const session = { errors: [] };
      let opening;
      let closing;
      session.close = () => {
        closing ??= (async () => {
          await opening?.catch(() => {});
          const failures = [];
          if (session.tracing) {
            try { await session.context.tracing.stop({ path: session.tracePath }); } catch (error) { failures.push(error); }
          }
          if (session.context) {
            try { await session.context.close(); } catch (error) { failures.push(error); }
          }
          if (session.browser) {
            try { await session.browser.close(); } catch (error) { failures.push(error); }
          }
          if (session.server) {
            try { await session.server.close(); } catch (error) { failures.push(error); }
          }
          if (session.network) {
            const receipt = session.network.sealAndPersist(join(root, `${slot.id}.network.json`),
              signal.aborted || failures.length > 0);
            receipts.set(slot.id, receipt);
            if (!receipt.saved) persistenceFailed = true;
          }
          sessions.delete(session);
          if (failures.length) {
            cleanupFailed = true;
            throw new AggregateError(failures, "Stage C session cleanup failed");
          }
        })();
        return closing;
      };
      sessions.add(session);
      opening = (async () => {
        session.checkOperation = label => {
          gate.assertMayStart(`${slot.id}:${label}`);
          signal.throwIfAborted();
        };
        if (plan) {
          session.server = await startPinnedServer(plan, signal, reason => gate.requestStop({ slotId: slot.id, reason }));
          session.originUrl = session.server.originUrl;
        }
        const policy = bindStageCNetworkPolicy(slot.id,
          session.originUrl ? new URL(session.originUrl).origin : "http://127.0.0.1", networkRules.get(slot.id));
        const policyName = `${slot.id}.network-policy.json`;
        const policyBytes = json(policy);
        write(policyName, policyBytes);
        if (!read(policyName).equals(policyBytes)) {
          persistenceFailed = true;
          throw new Error("Network policy readback mismatch");
        }
        session.checkOperation("launch");
        session.browser = await webkit.launch({ headless: true });
        signal.throwIfAborted();
        if (session.browser.version() !== "26.0") throw new Error("Wrong WebKit version");
        session.checkOperation("newContext");
        const { width, height, touch, reducedMotion } = registration.environment.viewport;
        session.context = await session.browser.newContext({ viewport: { width, height }, hasTouch: touch, reducedMotion });
        signal.throwIfAborted();
        session.network = attachStageCNetwork(session.context, policy, gate);
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
          session.capture = recordBrowserResponses(session.page, session.originUrl, plan,
            reason => gate.requestStop({ slotId: slot.id, reason }));
          session.check = () => {
            session.checkOperation("product command");
            session.server.check();
            session.capture.check();
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
    const calibration = createBrowserCalibration({ openPage, evidence: { write, read } });
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
        write(`${slot.id}.followup.png`, followup.screenshot);
        write(`${slot.id}.followup.json`, json({ state: followup.state }));
        if (slot.level !== "I0") {
          signal.throwIfAborted();
          session.checkOperation("timing marks");
          session.marks = await session.page.evaluate(stageCS1FinishMarks);
          signal.throwIfAborted();
          write(`${slot.id}.marks.json`, json(session.marks ?? null));
          if (!session.marks?.complete) throw new Error("Incomplete timing marks");
        }
        const received = await session.capture.collect(signal);
        const served = session.server.served();
        for (const [kind, rows] of [["served", served], ["received", received]]) {
          write(`${slot.id}.${kind}.json`, json(rows.map(({ resource, bytes }) => ({ resource, base64: bytes.toString("base64") }))));
        }
        signal.throwIfAborted();
        session.check();
        return auditDelivery(planBySlot.get(slot.id), served, received);
      },
      async closeSlot(slot, session, signal) {
        await session.close();
        signal.throwIfAborted();
        try {
          session.server.check();
          session.capture.check();
        } catch (error) {
          throw new DeferredBodyAuditError("Additional resource delivery during cleanup", { cause: error });
        }
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
          resourceCount: [...planBySlot.get(slot.id).values()].reduce((sum, entry) => sum + entry.count, 0),
        };
        const oracleName = `${slot.id}.trace-input.json`;
        write(oracleName, json(oracle));
        signal.throwIfAborted();
        const { stdout } = await execute(process.execPath, [auditor, session.tracePath, join(root, oracleName)],
          { signal, maxBuffer: 8 * 1024 * 1024 });
        signal.throwIfAborted();
        const trace = JSON.parse(stdout);
        write(`${slot.id}.trace-audit.json`, json({ sha256: trace.sha256, calls: trace.calls.length }));
        if (slot.level === "I0") return;
        const generation = s1TargetGeneration(trace, session.marks);
        const timing = bindS1ReadMarkers({ primaryReceipt, followupState: session.followupState,
          generation, trace, marks: session.marks });
        write(`${slot.id}.timing.json`, json(timing));
        if (!timing.order) throw new Error("Unknown target generation or read order");
      },
      async cleanup() {
        const outcomes = await Promise.allSettled([...sessions].map(session => session.close()));
        return {
          cleanup: !cleanupFailed && outcomes.every(outcome => outcome.status === "fulfilled") ? "PASS" : "FAIL",
          persistence: persistenceFailed ? "FAIL" : "PASS",
        };
      },
    };
    const result = await runS1Preparation({ clock, stopSignal, networkStopSignal: networkStop.signal,
      runtime, calibration, expectedBodies });
    return { ...result, networkStop: gate.snapshot(),
      networkReceipts: Object.fromEntries(receipts) };
  }
}
