import { createHash } from "node:crypto";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const key = (resource, validator) => JSON.stringify([resource, validator]);
const own = (object, name) => Object.hasOwn(object, name) ? object[name] : null;

export function auditNetwork({ policy, requests, originEvents, violations, captureInterrupted }) {
  const faults = violations.filter(finding => !finding.incomplete).map(finding => finding.code);
  const missing = violations.filter(finding => finding.incomplete).map(finding => finding.code);
  if (captureInterrupted) missing.push("CAPTURE_INTERRUPTED");
  const buckets = new Map();
  const byPath = Object.create(null);
  const byPhase = Object.create(null);
  const originByPath = Object.create(null);
  const allowlist = policy.spec?.allowlist ?? {};
  let cacheRevalidated = false;

  for (const row of originEvents) {
    const { resource, method, status, terminal, validator, etag, bodySha256 } = row;
    const expected = own(allowlist, resource);
    const validRequest = expected && method === "GET";
    originByPath[resource] = (own(originByPath, resource) ?? 0) + 1;
    if (!validRequest) faults.push("UNPLANNED_SERVER_REQUEST");
    if (terminal !== "FINISHED") missing.push("ORIGIN_RESPONSE_INCOMPLETE");
    if (validRequest && terminal === "FINISHED") {
      if (status === 200 && bodySha256 !== expected.sha256) faults.push("ORIGIN_BODY_MISMATCH");
      else if (status === 304 && (!validator || !etag || validator !== etag || bodySha256 !== null)) {
        faults.push("UNVERIFIED_304");
      } else if (status !== 200 && status !== 304) faults.push("UNEXPECTED_ORIGIN_STATUS");
    }
    const identity = key(resource, validator);
    if (!buckets.has(identity)) buckets.set(identity, { browser: [], origin: [] });
    buckets.get(identity).origin.push(row);
  }
  for (const row of requests) {
    const { resource, validator, phase, terminal, status, serviceWorker, bodySha256 } = row;
    const expected = own(allowlist, resource);
    if (resource) byPath[resource] = (own(byPath, resource) ?? 0) + 1;
    byPhase[phase] = (own(byPhase, phase) ?? 0) + 1;
    if (serviceWorker !== false) missing.push("UNVERIFIED_SERVICE_WORKER");
    if (terminal !== "FINISHED" || status === null || bodySha256 === null) missing.push("BROWSER_RESPONSE_INCOMPLETE");
    else if (expected && bodySha256 !== expected.sha256) faults.push("BODY_HASH_MISMATCH");
    const identity = key(resource, validator);
    if (!buckets.has(identity)) buckets.set(identity, { browser: [], origin: [] });
    buckets.get(identity).browser.push(row);
  }
  const associations = [];
  for (const { browser, origin } of buckets.values()) {
    // Equal-bodies HTTP 200 repeats are equivalent. A mixed 200/304 bucket
    // cannot be paired by guessing the order of concurrent requests.
    if (browser.length !== origin.length || new Set(origin.map(row => row.status)).size > 1) {
      missing.push("UNEXPLAINED_BROWSER_ORIGIN_DIFFERENCE");
      continue;
    }
    for (const [index, row] of browser.entries()) {
      const server = origin[index];
      associations.push({ requestId: row.id, originId: server.id, statusBrowser: row.status, statusServer: server.status });
      if (server.status === 304) cacheRevalidated = true;
    }
  }
  const countDeviation = !policy.calibration && (
    requests.length !== policy.spec.baselineRequestCount ||
    Object.keys(byPath).length !== Object.keys(policy.spec.baselinePathMultiset).length ||
    Object.entries(policy.spec.baselinePathMultiset).some(([path, count]) => byPath[path] !== count) ||
    requests.some(row => row.phase !== "page.goto") || cacheRevalidated);
  const classification = faults.length ? "NETWORK_AUDIT_FAIL" : missing.length ? "INCOMPLETE" :
    countDeviation ? "COUNT_DEVIATION" : "BASELINE_MATCH";
  return {
    classification, auditVerdict: faults.length ? "FAIL" : missing.length ? "INCOMPLETE" : "PASS",
    evidenceStatus: missing.length ? "INCOMPLETE" : "COMPLETE",
    comparisonVerdict: faults.length ? "UNRELIABLE" : missing.length ? "UNKNOWN" :
      policy.calibration ? "CALIBRATION_ZERO" : classification,
    faults: [...new Set(faults)], missing: [...new Set(missing)], byPath, originByPath, byPhase, associations,
    browserTotal: requests.length, originTotal: originEvents.length, cacheRevalidated,
  };
}

export function observeNetwork(context, policy, { onStop, isStopping, phase }) {
  const rows = new Map();
  const ignored = new WeakSet();
  const responses = new Map();
  const events = [], violations = [];
  let closing = false;
  let sequence = 0;
  let bodyCalls = 0;
  let requestSequence = 0;
  const event = (kind, row, fields = {}) => events.push({
    sequence: ++sequence, atHostMonotonicNs: process.hrtime.bigint().toString(), kind,
    requestId: row?.id ?? null, ...fields,
  });
  function finding(code, row, incomplete = false) {
    violations.push({ code, requestId: row?.id ?? null, incomplete });
    event("finding", row, { code, incomplete });
    if (!incomplete) onStop({ slotId: policy.slotId, reason: code, requestId: row?.id ?? null });
  }
  function requestRow(request) {
    const row = rows.get(request);
    if (ignored.has(request)) return null;
    if (!row) finding("EVENT_WITHOUT_REQUEST", null, true);
    return row;
  }
  const handlers = {
    request(request) {
      const row = { id: ++requestSequence, phase: phase(), url: null, resource: null, method: null,
        validator: null, redirectedFrom: null, status: null, serviceWorker: "UNKNOWN",
        terminal: null, bodySha256: null, bodyBase64: null };
      if (rows.has(request)) { finding("DUPLICATE_REQUEST_EVENT", rows.get(request), true); return; }
      rows.set(request, row);
      try { row.url = request.url(); }
      catch { finding("REQUEST_URL_UNREADABLE", row, true); return; }
      let url;
      try { url = new URL(row.url); }
      catch { finding("BAD_REQUEST_URL", row); return; }
      if (policy.calibration && !["http:", "https:"].includes(url.protocol)) {
        ignored.add(request);
        rows.delete(request);
        return;
      }
      event("request", row, { phase: row.phase });
      row.resource = url.pathname;
      if (policy.calibration || url.origin !== policy.origin || url.username || url.password ||
          ![url.origin + url.pathname, url.origin + url.pathname + url.hash].includes(row.url) ||
          !own(policy.spec.allowlist, row.resource)) finding("UNKNOWN_REQUEST", row);
      try {
        row.method = request.method();
        if (row.method !== "GET") finding("UNAPPROVED_METHOD", row);
      } catch {
        finding("REQUEST_METHOD_UNREADABLE", row, true);
      }
      try {
        row.validator = request.headers?.()["if-none-match"] ?? null;
        const predecessor = request.redirectedFrom?.();
        if (predecessor) {
          row.redirectedFrom = rows.get(predecessor)?.id ?? "UNKNOWN";
          finding("UNAPPROVED_REDIRECT", row);
        }
      } catch {
        finding("REQUEST_METADATA_UNREADABLE", row, true);
      }
    },
    response(response) {
      let row;
      try { row = requestRow(response.request()); }
      catch { finding("RESPONSE_REQUEST_UNREADABLE", null, true); return; }
      if (!row) return;
      if (responses.has(row)) { finding("DUPLICATE_RESPONSE", row, true); return; }
      responses.set(row, response);
      try {
        row.status = response.status();
        row.serviceWorker = response.fromServiceWorker?.() ?? "UNKNOWN";
        event("response", row, { status: row.status, serviceWorker: row.serviceWorker });
        if (row.status !== 200) finding("UNEXPECTED_HTTP_STATUS", row);
      } catch {
        finding("RESPONSE_METADATA_UNREADABLE", row, true);
      }
    },
    requestfinished(request) {
      const row = requestRow(request);
      if (!row) return;
      if (row.terminal) { finding("DUPLICATE_TERMINAL", row, true); return; }
      row.terminal = "FINISHED";
      event("requestfinished", row);
    },
    requestfailed(request) {
      const row = requestRow(request);
      if (!row) return;
      if (row.terminal) { finding("DUPLICATE_TERMINAL", row, true); return; }
      const shutdown = closing || isStopping();
      row.terminal = shutdown ? "SHUTDOWN_FAILURE" : "FAILED";
      try { row.failure = request.failure()?.errorText ?? null; }
      catch { row.failure = null; }
      event("requestfailed", row, { shutdown, failure: row.failure });
      if (!shutdown) finding("NETWORK_FAILURE", row);
    },
  };
  for (const [name, listener] of Object.entries(handlers)) context.on(name, listener);
  return {
    beginContextClose() { closing = true; },
    async collectBodies(signal) {
      for (const [row, response] of responses) {
        signal.throwIfAborted();
        if (row.status !== 200 || row.bodySha256 !== null) continue;
        const expected = own(policy.spec?.allowlist ?? {}, row.resource);
        if (!expected) continue;
        try {
          bodyCalls++;
          const bytes = Buffer.from(await response.body());
          signal.throwIfAborted();
          row.bodySha256 = sha256(bytes);
          row.bodyBase64 = bytes.toString("base64");
          event("response_body", row, { bytes: bytes.length, sha256: row.bodySha256 });
          if (row.bodySha256 !== expected.sha256) finding("BODY_HASH_MISMATCH", row);
        } catch (error) {
          if (signal.aborted) throw error;
          finding("BROWSER_BODY_UNREADABLE", row, true);
        }
      }
      return bodyCalls;
    },
    finalise(originEvents, captureInterrupted) {
      for (const [name, listener] of Object.entries(handlers)) context.off(name, listener);
      const requests = [...rows.values()];
      const adjudication = auditNetwork({ policy, requests, originEvents, violations, captureInterrupted });
      return {
        schemaVersion: 1, kind: "STAGE_C_NETWORK_LEDGER", slotId: policy.slotId, level: policy.level,
        policySha256: sha256(JSON.stringify(policy)), fixedSourceHead: policy.fixedSourceHead,
        fixedBuildBindingSha256: policy.fixedBuildBindingSha256, captureInterrupted,
        requests, events, originEvents, violations, ...adjudication,
      };
    },
  };
}
