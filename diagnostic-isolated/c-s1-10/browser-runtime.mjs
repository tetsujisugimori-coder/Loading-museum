import { Buffer } from "node:buffer";
import { join, resolve } from "node:path";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { observationPolicy } from "../../scripts/phase7d-api-plan.mjs";
import { createBrowserCalibration } from "./browser-calibration.mjs";
import { DeferredBodyAuditError } from "./offline-runner.mjs";
import { createRawEvidence } from "./raw-evidence.mjs";
import { auditDelivery, expectedDelivery, freezeResourcePlan, recordBrowserResponses, startPinnedServer } from "./resource-evidence.mjs";
import { bindS1ReadMarkers } from "./s1-read-proof.mjs";
import { runS1Preparation } from "./s1-preparation.mjs";

function json(value) {
  return Buffer.from(JSON.stringify(value));
}

function assertAuthorized() {
  if (registration.decision === "HOLD" || registration.executionAuthorization !== true) {
    throw new Error("Stage C browser execution is on HOLD");
  }
}

// trustedResources is supplied independently of the browser or its trace. The
// OS-level supervisor and independent trace decoder are supplied by the caller.
export function prepareBrowserStageC({ webkit, clock, trustedResources, evidenceDirectory, readTrace, targetGeneration }) {
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
    let cleanupFailed = false;
    let persistenceFailed = false;
    const write = (name, bytes) => {
      try { evidence.write(name, bytes); }
      catch (error) { persistenceFailed = true; throw error; }
    };
    const read = name => {
      try { return evidence.read(name); }
      catch (error) { persistenceFailed = true; throw error; }
    };
    const openPage = async (slot, signal, prepare) => {
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
        session.browser = await webkit.launch({ headless: true });
        signal.throwIfAborted();
        if (session.browser.version() !== "26.0") throw new Error("Wrong WebKit version");
        const { width, height, touch, reducedMotion } = registration.environment.viewport;
        session.context = await session.browser.newContext({ viewport: { width, height }, hasTouch: touch, reducedMotion });
        signal.throwIfAborted();
        if (prepare) {
          session.tracePath = join(root, `${slot.id}.trace.zip`);
          await session.context.tracing.start(observationPolicy.trace);
          session.tracing = true;
          signal.throwIfAborted();
        }
        session.page = await session.context.newPage();
        session.page.on("pageerror", error => session.errors.push(String(error)));
        signal.throwIfAborted();
        if (prepare) await prepare(session);
        signal.throwIfAborted();
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
        const plan = planBySlot.get(slot.id);
        return openPage(slot, signal, async session => {
          session.server = await startPinnedServer(plan, signal);
          session.originUrl = session.server.originUrl;
          session.streamId = `${slot.id}:product`;
          session.capture = recordBrowserResponses(session.page, session.originUrl, plan);
          session.check = () => {
            session.server.check();
            session.capture.check();
            if (session.errors.length) throw new Error("Page error");
          };
        });
      },
      writePrimary(slot, bytes) {
        write(`${slot.id}.primary.json`, bytes);
        originalPrimary.set(slot.id, Buffer.from(bytes));
      },
      async collectBody(slot, session, followup, signal) {
        session.check();
        session.followupState = followup.state;
        write(`${slot.id}.followup.png`, followup.screenshot);
        write(`${slot.id}.followup.json`, json({ state: followup.state }));
        if (slot.level !== "I0") {
          signal.throwIfAborted();
          session.marks = await session.page.evaluate(() => globalThis.__lm88StageCI1?.finish());
          signal.throwIfAborted();
          if (!session.marks?.complete) throw new Error("Incomplete timing marks");
          write(`${slot.id}.marks.json`, json(session.marks));
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
        if (slot.level === "I0") return;
        const trace = await readTrace(session.tracePath, signal);
        signal.throwIfAborted();
        const primaryReceipt = JSON.parse(primaryBytes);
        const generation = targetGeneration(trace, session.marks, slot);
        const timing = bindS1ReadMarkers({ primaryReceipt, followupState: session.followupState,
          generation, trace, marks: session.marks });
        write(`${slot.id}.timing.json`, json(timing));
      },
      async cleanup() {
        const outcomes = await Promise.allSettled([...sessions].map(session => session.close()));
        return {
          cleanup: !cleanupFailed && outcomes.every(outcome => outcome.status === "fulfilled") ? "PASS" : "FAIL",
          persistence: persistenceFailed ? "FAIL" : "PASS",
        };
      },
    };
    return runS1Preparation({ clock, runtime, calibration, expectedBodies });
  }
}
