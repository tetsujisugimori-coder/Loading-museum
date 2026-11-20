import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { get } from "node:http";
import { join } from "node:path";
import test from "node:test";
import contract from "./NETWORK-CONTRACT-v1.json" with { type: "json" };
import { sha256 } from "./build-resources.mjs";
import { createRawEvidence } from "./raw-evidence.mjs";
import { freezeResourcePlan, startPinnedServer } from "./resource-evidence.mjs";
import { attachStageCNetwork, publishNetworkStopNotice } from "./stage-c-network-adapter.mjs";
import { bindStageCNetworkPolicy, preflightNetworkRules } from "./stage-c-network-policy.mjs";
import { createNetworkOperationGate } from "./stage-c-operation-gate.mjs";

const resource = "/Loading-museum/";
const bytes = Buffer.from("<main>synthetic</main>");
const slotId = "AP-01-I0";
const baseline = [resource, ...Array.from({ length: 8 }, (_, index) => resource + index)];
const optional = resource + "optional";
const entries = [...baseline, optional].map(resource =>
  ({ resource, bytes, sha256: sha256(bytes), contentType: "text/html" }));
const spec = {
  allowlist: Object.fromEntries(entries.map(({ resource, sha256 }) => [resource, { sha256 }])),
  baselinePathMultiset: Object.fromEntries(baseline.map(path => [path, 1])),
  baselineRequestCount: 9,
};

test("preflight binds the frozen route and byte inventory before any browser events", () => {
  const outputs = Object.fromEntries(Object.entries(contract.product.levels).map(([level, spec]) => [
    level, { files: Array(spec.buildFileCount), routes: Object.entries(spec.allowlist)
      .map(([resource, { mappedBuildFile: path, sha256 }]) => ({ resource, path, sha256 })) },
  ]));
  assert.equal(preflightNetworkRules({ outputs }).size, 10);
  assert.equal(preflightNetworkRules({ outputs }).get("AP-CAL-04"), null);
  assert.equal(preflightNetworkRules({ outputs }).get(slotId).baselineRequestCount, 9);
  outputs.I1.routes[0].sha256 = "0".repeat(64);
  assert.throws(() => preflightNetworkRules({ outputs }), /contract routes and build bytes differ/);
});

async function fixture(t, { calibration = false } = {}) {
  const directory = mkdtempSync("stage-c-network-test-");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const evidence = createRawEvidence(join(directory, "receipts"));
  const context = new EventEmitter();
  const controller = new AbortController();
  const id = calibration ? "AP-CAL-04" : slotId;
  const gate = createNetworkOperationGate(fault => {
    controller.abort(fault);
    publishNetworkStopNotice(directory, fault);
  });
  const server = await startPinnedServer(freezeResourcePlan(entries), controller.signal,
    reason => gate.requestStop({ slotId: id, reason }));
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await server.close();
  };
  t.after(close);
  const origin = new URL(server.originUrl).origin;
  const policy = bindStageCNetworkPolicy(id, origin, calibration ? null : spec);
  let phase = "page.goto";
  let reads = 0;
  const audit = attachStageCNetwork(context, policy, gate, controller.signal, () => phase);

  function begin(path, options = {}) {
    const request = {
      url: () => options.url ?? origin + path, method: () => options.method ?? "GET",
      headers: () => {
        if (options.headersThrow) throw new Error("synthetic unreadable headers");
        return options.validator ? { "if-none-match": options.validator } : {};
      },
      redirectedFrom: () => options.redirectedFrom,
      failure: () => ({ errorText: "synthetic cancellation" }),
    };
    context.emit("request", request);
    return request;
  }
  function finish(request, body = bytes, status = 200, worker = false) {
    context.emit("response", { request: () => request, status: () => status,
      fromServiceWorker: () => worker, body: async () => { reads++; return body; } });
    context.emit("requestfinished", request);
  }
  async function perform(path, options) {
    const request = begin(path, options);
    return new Promise((resolve, reject) => {
      get(origin + path, response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.once("error", reject);
        response.once("end", () => {
          finish(request, Buffer.concat(chunks), response.statusCode);
          resolve(response.statusCode);
        });
      }).once("error", reject);
    });
  }
  function seal({ interrupted = controller.signal.aborted, originEvents = server.events(), store = evidence } = {}) {
    audit.beginContextClose();
    return audit.sealAndPersist(store, originEvents, interrupted);
  }
  return { id, evidence, directory, context, gate, controller, origin, begin, finish, perform, seal, close, audit,
    setPhase: value => { phase = value; }, reads: () => reads };
}

for (const [name, paths, late, expected] of [
  ["nine initial requests", baseline, [], "BASELINE_MATCH"],
  ["extra known route", [...baseline, optional], [], "COUNT_DEVIATION"],
  ["one fewer request", baseline.slice(0, -1), [], "COUNT_DEVIATION"],
  ["duplicate allowed request", [...baseline, resource], [], "COUNT_DEVIATION"],
  ["same nine across different phases", baseline.slice(0, -1), baseline.slice(-1), "COUNT_DEVIATION"],
]) {
  test(`live loopback and synthetic browser events classify ${name}`, async t => {
    const f = await fixture(t);
    for (const path of paths) assert.equal(await f.perform(path), 200);
    f.setPhase("afterNavigation");
    for (const path of late) assert.equal(await f.perform(path), 200);
    assert.equal(f.reads(), 0, "body reads must stay deferred");
    assert.equal(await f.audit.collectBodies(f.controller.signal), paths.length + late.length);
    await f.close();
    const receipt = f.seal();
    assert.equal(receipt.classification, expected);
    assert.equal(receipt.auditVerdict, "PASS");
    assert.equal(receipt.evidenceStatus, "COMPLETE");
    assert.equal(receipt.persistence, "PASS");
    assert.equal(f.gate.snapshot().firstReason, null, "count deviation allows slot cleanup");
    const original = f.evidence.read(receipt.saved.filename);
    assert.equal(sha256(original), receipt.saved.sha256);
    const raw = JSON.parse(original);
    assert.equal(raw.associations.length, paths.length + late.length);
    for (const row of [...raw.requests, ...raw.originEvents]) {
      assert.equal(sha256(Buffer.from(row.bodyBase64, "base64")), row.bodySha256);
    }
  });
}

for (const [label, path, options, reason] of [
  ["unknown route", resource + "unknown", {}, "UNKNOWN_REQUEST"],
  ["external origin with unreadable headers", resource, { url: "https://example.invalid/", headersThrow: true }, "UNKNOWN_REQUEST"],
  ["query", resource + "?unexpected=1", {}, "UNKNOWN_REQUEST"],
  ["empty query delimiter", resource + "?", {}, "UNKNOWN_REQUEST"],
  ["wrong method", resource, { method: "POST" }, "UNAPPROVED_METHOD"],
  ["redirect chain", resource, { redirectedFrom: {} }, "UNAPPROVED_REDIRECT"],
]) {
  test(`detecting ${label} publishes stop and blocks the next command`, async t => {
    const f = await fixture(t);
    f.gate.assertMayStart("in-flight");
    f.begin(path, options);
    assert.equal(f.controller.signal.reason.reason, reason);
    assert.throws(() => f.gate.assertMayStart("following operation"), /STAGE_C_STOP_REQUESTED/);
    assert.deepEqual(JSON.parse(readFileSync(join(f.directory, "network-stop.notice.json"))), f.controller.signal.reason);
    const receipt = f.seal();
    assert.equal(receipt.classification, "NETWORK_AUDIT_FAIL");
    assert.equal(receipt.evidenceStatus, "INCOMPLETE");
  });
}

test("HTTP 302 is refused even if no redirected request arrives", async t => {
  const f = await fixture(t);
  const request = f.begin(resource);
  f.finish(request, Buffer.alloc(0), 302);
  assert.equal(f.controller.signal.reason.reason, "UNEXPECTED_HTTP_STATUS");
  assert.equal(f.seal().classification, "NETWORK_AUDIT_FAIL");
});

test("deferred body mismatch stops after preserving the mismatching body and existing primary", async t => {
  const f = await fixture(t);
  const primary = Buffer.from('{"primary":{"verdict":"FAIL"}}');
  f.evidence.write("primary.json", primary);
  const request = f.begin(resource);
  f.finish(request, Buffer.from("unexpected"));
  assert.equal(f.controller.signal.aborted, false);
  await f.audit.collectBodies(f.controller.signal);
  assert.equal(f.controller.signal.reason.reason, "BODY_HASH_MISMATCH");
  const receipt = f.seal();
  assert.equal(receipt.classification, "NETWORK_AUDIT_FAIL");
  assert.equal(Buffer.from(JSON.parse(f.evidence.read(receipt.saved.filename)).requests[0].bodyBase64, "base64").toString(), "unexpected");
  assert.deepEqual(f.evidence.read("primary.json"), primary);
});

for (const [kind, originRows, expected] of [
  ["verified 304", [{ status: 304, validator: '"fixture"', etag: '"fixture"' }], "COUNT_DEVIATION"],
  ["unverified 304", [{ status: 304, validator: '"fixture"', etag: null }], "NETWORK_AUDIT_FAIL"],
  ["unexplained cached body", [], "INCOMPLETE"],
  ["unmatched 304 validator", [{ status: 304, validator: '"different"', etag: '"different"' }], "INCOMPLETE"],
]) {
  test(`classifies ${kind} with browser 200 and original bytes`, async t => {
    const f = await fixture(t);
    f.finish(f.begin(resource, { validator: '"fixture"' }));
    await f.audit.collectBodies(f.controller.signal);
    const originEvents = originRows.map(row => ({ id: 1, resource, method: "GET", terminal: "FINISHED", bodySha256: null, ...row }));
    const receipt = f.seal({ originEvents });
    assert.equal(receipt.classification, expected);
    if (kind === "verified 304") {
      const raw = JSON.parse(f.evidence.read(receipt.saved.filename));
      assert.equal(raw.cacheRevalidated, true);
      assert.deepEqual(raw.associations[0], { requestId: 1, originId: 1, statusBrowser: 200, statusServer: 304 });
    }
  });
}

test("unproven service worker and missing lifecycle records cannot complete", async t => {
  const f = await fixture(t);
  f.finish(f.begin(resource), bytes, 200, true);
  await f.audit.collectBodies(f.controller.signal);
  const receipt = f.seal();
  assert.equal(receipt.classification, "INCOMPLETE");
  assert.ok(receipt.missing.includes("UNVERIFIED_SERVICE_WORKER"));
  assert.ok(receipt.missing.includes("UNEXPLAINED_BROWSER_ORIGIN_DIFFERENCE"));
});

test("calibration allows zero HTTP and refuses a known product route", async t => {
  const clean = await fixture(t, { calibration: true });
  clean.finish(clean.begin(null, { url: "data:text/plain,A" }));
  const receipt = clean.seal();
  assert.equal(receipt.classification, "BASELINE_MATCH");
  assert.equal(receipt.comparisonVerdict, "CALIBRATION_ZERO");
  const fault = await fixture(t, { calibration: true });
  fault.begin(resource);
  assert.equal(fault.seal().classification, "NETWORK_AUDIT_FAIL");
});

test("intentional shutdown with a cancellation stays incomplete", async t => {
  const f = await fixture(t);
  const request = f.begin(resource);
  f.controller.abort();
  f.audit.beginContextClose();
  f.context.emit("requestfailed", request);
  const receipt = f.seal();
  assert.equal(receipt.classification, "INCOMPLETE");
  assert.equal(f.gate.snapshot().firstReason, null);
  assert.equal(JSON.parse(f.evidence.read(receipt.saved.filename)).requests[0].terminal, "SHUTDOWN_FAILURE");
});

for (const kind of ["write", "readback"]) {
  test(`network ${kind} failure cannot emit a complete receipt`, async t => {
    const f = await fixture(t, { calibration: true });
    const name = `${f.id}.network.json`;
    if (kind === "write") f.evidence.write(name, bytes);
    const receipt = f.seal({ store: {
      write: f.evidence.write, read: kind === "readback" ? () => bytes : f.evidence.read,
    } });
    assert.equal(receipt.classification, "INCOMPLETE");
    assert.equal(receipt.persistence, "FAIL");
    assert.equal(receipt.evidenceStatus, "INCOMPLETE");
    assert.ok(receipt.missing.includes("NETWORK_RECEIPT_FAILED"));
    if (kind === "write") assert.deepEqual(f.evidence.read(name), bytes);
  });
}
