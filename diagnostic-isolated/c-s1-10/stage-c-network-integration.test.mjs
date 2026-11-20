import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { get } from "node:http";
import { join } from "node:path";
import test from "node:test";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { sha256 } from "./build-resources.mjs";
import { freezeResourcePlan, startPinnedServer } from "./resource-evidence.mjs";
import { attachStageCNetwork, publishNetworkStopNotice } from "./stage-c-network-adapter.mjs";
import { bindStageCNetworkPolicy, preflightNetworkRules } from "./stage-c-network-policy.mjs";
import { createNetworkOperationGate } from "./stage-c-operation-gate.mjs";

const resource = "/Loading-museum/";
const optional = "/Loading-museum/optional.txt";
const entry = { method: "GET", pathname: resource, resourceTypes: ["document"], queryKeys: [],
  queryValues: {}, allowedStatuses: [200], min: 1, max: 1 };
const optionalRule = { ...entry, pathname: optional, resourceTypes: ["fetch"], min: 0 };
const slotId = "AP-01-I0";

test("preflight rejects missing slots, calibration traffic and incompatible exact delivery counts", () => {
  const networkRules = {}, requests = {};
  for (const slot of registration.slots) {
    networkRules[slot.id] = slot.originalProductTrial === false ? [] : [entry, optionalRule];
    if (slot.originalProductTrial !== false) requests[slot.id] = [{ resource, count: 1 }];
  }
  const inventory = { routes: [{ resource }, { resource: optional }] };
  const manifest = { networkRules, requests, outputs: { I0: inventory, I1: inventory, I2: inventory } };
  assert.equal(preflightNetworkRules(manifest).size, 10);
  const badCalibration = structuredClone(manifest);
  badCalibration.networkRules["AP-CAL-04"] = [entry];
  assert.throws(() => preflightNetworkRules(badCalibration), /zero HTTP requests/);
  const missingRoute = structuredClone(manifest);
  missingRoute.networkRules[slotId].pop();
  assert.throws(() => preflightNetworkRules(missingRoute), /must cover fixed routes exactly/);
  const badCount = structuredClone(manifest);
  badCount.requests[slotId][0].count = 2;
  assert.throws(() => preflightNetworkRules(badCount), /conflicts with network bounds/);
});

function performRequest(context, origin, path) {
  const url = origin + path;
  const request = { url: () => url, method: () => "GET", resourceType: () => "document" };
  context.emit("request", request);
  return new Promise((resolve, reject) => {
    get(url, response => {
      context.emit("response", { request: () => request, status: () => response.statusCode });
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.once("error", reject);
      response.once("end", () => {
        context.emit("requestfinished", request);
        resolve({ status: response.statusCode, body: Buffer.concat(chunks) });
      });
    }).once("error", reject);
  });
}

test("real loopback HTTP with synthetic context events publishes stop and blocks the next operation", async t => {
  const directory = mkdtempSync("stage-c-network-test-");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const networkStop = new AbortController();
  const gate = createNetworkOperationGate(fault => {
    networkStop.abort(fault);
    publishNetworkStopNotice(directory, fault);
  });
  const bytes = Buffer.from("<main>synthetic</main>");
  const plan = freezeResourcePlan([{ resource, bytes, sha256: sha256(bytes), contentType: "text/html", count: 1 }]);
  const server = await startPinnedServer(plan, networkStop.signal, reason => gate.requestStop({ slotId, reason }));
  t.after(() => server.close());
  const origin = new URL(server.originUrl).origin;
  const context = new EventEmitter();
  const observation = attachStageCNetwork(context, bindStageCNetworkPolicy(slotId, origin, [entry]), gate);
  gate.assertMayStart("navigation");
  assert.deepEqual(await performRequest(context, origin, resource), { status: 200, body: bytes });

  gate.assertMayStart("in-flight synthetic request");
  assert.equal((await performRequest(context, origin, resource + "unknown")).status, 404);
  assert.equal(networkStop.signal.reason.reason, "UNKNOWN_REQUEST");
  assert.throws(() => gate.assertMayStart("following operation"), /STAGE_C_STOP_REQUESTED/);
  const notice = JSON.parse(readFileSync(join(directory, "network-stop.notice.json")));
  assert.deepEqual(notice, networkStop.signal.reason);
  const receipt = observation.sealAndPersist(join(directory, "receipt.json"), true);
  assert.equal(receipt.networkPolicyVerdict, "FAIL");
  assert.equal(receipt.saved.sha256, sha256(readFileSync(join(directory, "receipt.json"))));
});

test("calibration context with no HTTP seals successfully and rejects any HTTP event", t => {
  const directory = mkdtempSync("stage-c-network-test-");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const origin = "http://127.0.0.1";
  const policy = bindStageCNetworkPolicy("AP-CAL-04", origin, []);
  const context = new EventEmitter();
  const gate = createNetworkOperationGate();
  const clean = attachStageCNetwork(context, policy, gate);
  assert.equal(clean.sealAndPersist(join(directory, "clean.json"), false).networkPolicyVerdict, "PASS");
  const observation = attachStageCNetwork(context, policy, gate);
  context.emit("request", { url: () => origin + resource, method: () => "GET", resourceType: () => "document" });
  assert.equal(gate.snapshot().firstReason.reason, "UNKNOWN_REQUEST");
  assert.equal(observation.sealAndPersist(join(directory, "fault.json"), true).networkPolicyVerdict, "FAIL");
});
