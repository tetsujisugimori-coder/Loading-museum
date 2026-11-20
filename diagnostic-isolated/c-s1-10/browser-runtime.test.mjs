import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { createBrowserCalibration, evaluateCalibrationReceipt, runCalibrationPage } from "./browser-calibration.mjs";
import { prepareBrowserStageC } from "./browser-runtime.mjs";
import { i2RecorderInitSource } from "./i1-timing.mjs";
import { createRawEvidence } from "./raw-evidence.mjs";
import { auditDelivery, expectedDelivery, freezeResourcePlan, recordBrowserResponses } from "./resource-evidence.mjs";

const signal = new AbortController().signal;
const resource = "/Loading-museum/";
const bytes = Buffer.from("<html>fixture</html>");
const hash = createHash("sha256").update(bytes).digest("hex");
const entry = { resource, bytes, sha256: hash, contentType: "text/html", count: 1 };

function directory(t) {
  mkdirSync("work", { recursive: true });
  const temp = mkdtempSync("work/stage-c-evidence-");
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  return temp;
}

async function calibrationFixture(fixture) {
  const attributes = new Map();
  const target = { setAttribute: (key, value) => attributes.set(key, value), getAttribute: key => attributes.get(key) };
  const sandbox = vm.createContext({
    setTimeout, clearTimeout, document: { createElement: () => target, body: { append() {} } },
  });
  vm.runInContext(i2RecorderInitSource("fixture-slot", "fixture-stream"), sandbox);
  const result = await vm.runInContext(`(${runCalibrationPage.toString()})({ fixture: ${JSON.stringify(fixture)}, capacity: 4096 })`, sandbox);
  return JSON.parse(JSON.stringify(result));
}

for (const fixture of registration.calibration.expectedTypes) {
  test(`calibration contract recognizes ${fixture} and rejects a different epoch`, async () => {
    const raw = await calibrationFixture(fixture);
    const check = () => evaluateCalibrationReceipt(raw, fixture, "fixture-slot", "fixture-stream");
    const result = check();
    assert.equal(result.controlsPass, true);
    assert.equal(result.firstLost, fixture === "overflow-fault" ? 4097 : null);
    assert.equal(result.evidence, fixture.startsWith("normal-") ? "COMPLETE" : "INCOMPLETE");
    raw.trace.events[0].generation = 0;
    assert.equal(check().controlsPass, false);
  });
}

test("the current HOLD rejects registered calibration and runtime before launching", async t => {
  let launches = 0;
  const openPage = () => { launches++; };
  const calibration = createBrowserCalibration({ openPage, evidence: {} });
  await assert.rejects(calibration.runCalibration(registration.slots[0], signal), /on HOLD/);
  const trustedResources = new Map(registration.slots.slice(4).map(slot => [slot.id, [entry]]));
  const runtime = prepareBrowserStageC({
    webkit: { launch: openPage }, trustedResources, evidenceDirectory: join(directory(t), "new"),
  });
  await assert.rejects(runtime.run(), /on HOLD/);
  assert.equal(launches, 0);
});

test("exclusive original and independent file handle reject overwrite and symlink substitution", t => {
  const root = join(directory(t), "new");
  const store = createRawEvidence(root);
  store.write("primary.json", bytes);
  assert.deepEqual(store.read("primary.json"), bytes);
  assert.throws(() => store.write("primary.json", Buffer.from("other")), { code: "EEXIST" });
  assert.throws(() => store.read("../other"), /Invalid evidence filename/);
  symlinkSync("primary.json", join(root, "substitute.json"));
  assert.throws(() => store.read("substitute.json"), { code: "ELOOP" });
});

test("the byte audit requires both original sources and exactly the pinned resource occurrences", () => {
  const plan = freezeResourcePlan([entry]);
  const raw = [{ resource, bytes }];
  assert.deepEqual(auditDelivery(plan, raw, raw), expectedDelivery(plan));
  assert.throws(() => auditDelivery(plan, [], raw), /Resource count mismatch/);
  assert.throws(() => auditDelivery(plan, raw, [...raw, ...raw]), /Resource count mismatch/);
  assert.throws(() => auditDelivery(plan, raw, [{ resource, bytes: Buffer.from("different") }]), /Resource bytes mismatch/);
  assert.throws(() => freezeResourcePlan([{ ...entry, sha256: "0".repeat(64) }]), /Invalid fixed resource/);
});

test("the browser handler checks metadata immediately and reads no body before collection", async () => {
  const plan = freezeResourcePlan([entry]);
  const page = new EventEmitter();
  const origin = "http://127.0.0.1:7020";
  let reads = 0;
  const response = { url: () => origin + resource, status: () => 200, body: () => { reads++; return bytes; } };
  const capture = recordBrowserResponses(page, origin, plan);
  page.emit("response", response);
  capture.check();
  assert.equal(reads, 0);
  assert.deepEqual(await capture.collect(signal), [{ resource, bytes }]);
  assert.equal(reads, 1);
  const wrong = recordBrowserResponses(page, origin, plan);
  page.emit("response", { ...response, url: () => origin + resource + "unexpected" });
  assert.throws(() => wrong.check(), /Unplanned browser response metadata/);
  assert.throws(() => capture.check(), /Unplanned browser response metadata/);
  await assert.rejects(wrong.collect(signal), /Unplanned browser response metadata/);
  assert.equal(reads, 1);
});
