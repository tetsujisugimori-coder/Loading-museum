import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { createBrowserCalibration, evaluateCalibrationReceipt, runCalibrationPage } from "./browser-calibration.mjs";
import { prepareBrowserStageC } from "./browser-runtime.mjs";
import { i2RecorderInitSource } from "./i1-timing.mjs";
import { createRawEvidence } from "./raw-evidence.mjs";
import { freezeResourcePlan } from "./resource-evidence.mjs";

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

test("the fixed resource plan takes an independent byte snapshot and rejects changed bytes", () => {
  const original = { ...entry, bytes: Buffer.from(bytes) };
  const plan = freezeResourcePlan([original]);
  original.bytes.fill(0);
  assert.deepEqual(plan.get(resource).bytes, bytes);
  assert.throws(() => freezeResourcePlan([original]), /Invalid fixed resource/);
});
