import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { apiSequence, targets } from "../../scripts/phase7d-api-plan.mjs";
import { i1RecorderInitSource, i2RecorderInitSource } from "./i1-timing.mjs";
import { runOfflineStageC } from "./offline-runner.mjs";

const primarySeq = apiSequence("swipe", "S1").indexOf("primary.getAttribute") + 1;
const initialize = () => sessionStorage.setItem("digital-motion-archive-title-seen-v1", "seen");
const swipe = targets.swipe;

async function checked(signal, operation) {
  signal.throwIfAborted();
  const result = await operation();
  signal.throwIfAborted();
  return result;
}

function sessionUrl(originUrl) {
  const url = new URL(originUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/Loading-museum/") {
    throw new Error("S1 build must use its fixed loopback URL");
  }
  url.hash = "modern-exhibit-swipe-dismiss";
  return url.href;
}

function setupScript(slot, streamId) {
  if (slot.level === "I0") return initialize;
  const init = slot.level === "I1" ? i1RecorderInitSource : i2RecorderInitSource;
  return `(${initialize.toString()})();\n${init(slot.id, streamId)}`;
}

async function sampleOriginalPrimary(session, slot, signal) {
  const { page, streamId, originUrl } = session;
  const call = operation => checked(signal, () => {
    session.check?.();
    return operation();
  });
  const destination = sessionUrl(originUrl);
  signal.throwIfAborted();
  page.setDefaultTimeout(9000);
  await call(() => page.addInitScript(setupScript(slot, streamId)));
  await call(() => page.goto(destination));
  const stage = page.locator("#modern-exhibit-swipe-dismiss");
  const root = stage.getByTestId("swipe-to-dismiss");
  await call(() => root.waitFor());
  await call(() => root.scrollIntoViewIfNeeded());
  assert.equal(await call(() => stage.locator("details[open]").count()), 0);
  await call(() => stage.locator("summary").first().click());
  await call(() => stage.getByText("仕組みを見る", { exact: true }).click());
  assert.equal(await call(() => stage.locator("details[open]").count()), 2);

  await call(() => page.clock.install());
  const pauseAt = await call(() => page.evaluate(() => Date.now() + 1000));
  await call(() => page.clock.pauseAt(pauseAt));
  const button = name => stage.getByRole("button", { name, exact: true });
  const card = stage.getByRole("button", { name: "スワイプするカード" });
  await call(() => card.focus());
  await call(() => page.keyboard.press("ArrowRight"));
  await call(() => page.clock.runFor(500));
  assert.equal(await call(() => root.getAttribute("data-state")), "dismissed", "keyboard-prefix");
  await call(() => button("Undo").click());
  assert.equal(await call(() => root.getAttribute("data-state")), "idle", "undo-prefix");
  await call(() => page.clock.runFor(300));
  await call(() => card.scrollIntoViewIfNeeded());
  const rect = await call(() => card.boundingBox());
  assert.ok(rect);
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  await call(() => page.mouse.move(x, y));
  await call(() => page.mouse.down());
  await call(() => page.mouse.move(x + 130, y, { steps: 8 }));
  await call(() => page.mouse.up());
  await call(() => page.clock.runFor(swipe.advance));
  const state = await call(() => root.getAttribute("data-state"));
  return { root, primary: Object.freeze({ apiSeq: primarySeq, state, verdict: state === swipe.expected ? "PASS" : "FAIL" }) };
}

/**
 * Exercises the dedicated registration with injected sessions and synthetic calibration.
 * A session provider owns browser/context/trace setup and cleanup, including any still
 * in flight when aborted. writePrimary is a synchronous, exclusive host save.
 * The injected body collector supplies bytes for the independently fixed expectedBodies.
 */
export function runS1Preparation({ clock, runtime, calibration, expectedBodies }) {
  const active = new Map();
  const adapter = {
    runCalibration: (slot, signal) => calibration.runCalibration(slot, signal),
    readBackCalibration: (slot, signal) => calibration.readBackCalibration(slot, signal),
    finalizeCalibration: signal => calibration.finalizeCalibration(signal),
    async observePrimary(slot, signal) {
      const session = await checked(signal, async () => {
        const opened = await runtime.openSlot(slot, signal);
        active.set(slot.id, { session: opened });
        return opened;
      });
      const row = active.get(slot.id);
      const { root, primary } = await sampleOriginalPrimary(session, slot, signal);
      row.root = root;
      const bytes = Buffer.from(JSON.stringify({ slotId: slot.id, streamId: session.streamId, primary }));
      try {
        assert.equal(runtime.writePrimary(slot, bytes), undefined, "primary save must finish synchronously");
      } catch {
        row.primaryWriteFailed = true;
      }
      return primary.verdict;
    },
    async observeFollowup(slot, signal) {
      const row = active.get(slot.id);
      if (row.primaryWriteFailed) throw new Error("S1 primary record could not be saved");
      const screenshot = await checked(signal, () => {
        row.session.check?.();
        return row.session.page.screenshot();
      });
      const state = await checked(signal, () => {
        row.session.check?.();
        return row.root.getAttribute("data-state");
      });
      row.followup = { screenshot, state };
    },
    async collectBody(slot, signal) {
      const { session, followup } = active.get(slot.id);
      return checked(signal, () => runtime.collectBody(slot, session, followup, signal));
    },
    async finalizeProductSlot(slot, signal) {
      const { session } = active.get(slot.id);
      await checked(signal, () => runtime.closeSlot(slot, session, signal));
      active.delete(slot.id);
    },
    cleanup(reason, signal) {
      return runtime.cleanup(reason, signal);
    },
  };
  return runOfflineStageC({ clock, adapter, expectedBodies });
}
