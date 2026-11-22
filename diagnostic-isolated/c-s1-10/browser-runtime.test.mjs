import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { createBrowserCalibration, evaluateCalibrationReceipt, runCalibrationPage } from "./browser-calibration.mjs";
import { prepareBrowserStageC, runBrowserStageCDiagnostic } from "./browser-runtime.mjs";
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

test("diagnostic failure stores incomplete evidence and cannot reopen an existing result", async t => {
  const evidenceDirectory = join(directory(t), "diagnostic");
  const stop = new AbortController();
  const closed = [];
  const context = new EventEmitter();
  context.tracing = {
    async start() {},
    async stop() { closed.push("trace"); },
  };
  context.newPage = async () => Object.assign(new EventEmitter(), {
    async goto() { throw new Error("intentional incomplete navigation"); },
  });
  context.close = async () => {
    closed.push("context");
    // Simulate the supervisor's S arriving during cleanup, after the network failure.
    stop.abort();
  };
  let launches = 0;
  const webkit = { async launch() {
    launches++;
    return { version: () => "26.0", newContext: async () => context,
      async close() { closed.push("browser"); } };
  } };
  const options = {
    webkit, stopSignal: stop.signal, stopCommandReceivedNs: () => "123456789",
    evidenceDirectory, trustedResources: [entry],
    networkRules: new Map([["AP-01-I0", { allowlist: { [resource]: { sha256: hash } },
      baselineRequestCount: 1, baselinePathMultiset: { [resource]: 1 } }]]),
  };
  const result = await runBrowserStageCDiagnostic(options);
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.stopRequested, true);
  assert.equal(result.supervisorStopCommandReceivedNs, "123456789");
  assert.equal(result.stopCompleted, false);
  assert.equal(result.registeredTrialsStarted, 0);
  assert.match(result.error, /intentional incomplete navigation/);
  assert.deepEqual(closed, ["trace", "context", "browser"]);
  assert.deepEqual(result.closed, ["context", "browser", "server"]);
  await assert.rejects(runBrowserStageCDiagnostic(options), { code: "EEXIST" });
  assert.equal(launches, 1);
});
