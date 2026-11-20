import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";

const digest = data => createHash("sha256").update(data).digest("hex");

/** Plan entries come from independently pinned build outputs and expected request counts. */
export function freezeResourcePlan(entries) {
  const plan = new Map();
  for (const { resource, bytes, sha256, contentType, count } of entries) {
    const goodPath = typeof resource === "string" && resource.startsWith("/Loading-museum/") &&
      new URL(resource, "http://127.0.0.1").pathname + new URL(resource, "http://127.0.0.1").search === resource;
    if (!goodPath || plan.has(resource) || !(bytes instanceof Uint8Array) || digest(bytes) !== sha256 ||
        typeof contentType !== "string" || !contentType || !Number.isSafeInteger(count) || count <= 0) {
      throw new Error("Invalid fixed resource");
    }
    plan.set(resource, Object.freeze({ bytes: Buffer.from(bytes), sha256, contentType, count }));
  }
  if (!plan.size) throw new Error("Missing fixed resources");
  return plan;
}

function summary(plan, lookup) {
  return Buffer.from(JSON.stringify([...plan.keys()].sort().map(resource => ({ resource, ...lookup(resource) }))));
}

export function expectedDelivery(plan) {
  return summary(plan, resource => {
    const { bytes, sha256, count } = plan.get(resource);
    return { size: bytes.length, sha256, count };
  });
}

export function auditDelivery(plan, served, received) {
  function check(raw) {
    const counts = new Map();
    for (const { resource, bytes } of raw) {
      const expected = plan.get(resource);
      if (!expected || !(bytes instanceof Uint8Array) || bytes.length !== expected.bytes.length ||
          digest(bytes) !== expected.sha256) {
        throw new Error("Resource bytes mismatch");
      }
      counts.set(resource, (counts.get(resource) ?? 0) + 1);
    }
    return summary(plan, resource => {
      const expected = plan.get(resource);
      const count = counts.get(resource);
      if (count !== expected.count) throw new Error("Resource count mismatch");
      return { size: expected.bytes.length, sha256: expected.sha256, count };
    });
  }
  check(served);
  return check(received);
}

export async function startPinnedServer(plan, signal, onStop) {
  signal.throwIfAborted();
  const served = [];
  const counts = new Map();
  let error;
  function fail(reason, message) {
    if (error) return;
    error = new Error(message);
    onStop?.(reason);
  }
  const server = createServer((request, response) => {
    const resource = request.url;
    const entry = plan.get(resource);
    const count = (counts.get(resource) ?? 0) + 1;
    if (!entry || request.method !== "GET" || count > entry.count) {
      fail("UNPLANNED_SERVER_REQUEST", "Unplanned request");
      response.writeHead(404).end();
      return;
    }
    counts.set(resource, count);
    const bytes = Buffer.from(entry.bytes);
    response.once("finish", () => served.push({ resource, bytes }));
    response.once("close", () => {
      if (!response.writableFinished && !signal.aborted) fail("SERVER_RESPONSE_INTERRUPTED", "Server response interrupted");
    });
    response.writeHead(200, { "Content-Type": entry.contentType, "Content-Length": bytes.length });
    response.end(bytes);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  if (signal.aborted) {
    server.close();
    signal.throwIfAborted();
  }
  const port = server.address().port;
  return {
    originUrl: `http://127.0.0.1:${port}/Loading-museum/`,
    check() { if (error) throw error; },
    served: () => served.slice(),
    close() {
      return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        if (signal.aborted) server.closeAllConnections();
      });
    },
  };
}

export function recordBrowserResponses(page, originUrl, plan, onStop) {
  const origin = new URL(originUrl).origin;
  const pending = [], counts = new Map();
  let error;
  let collecting = false;
  const listener = response => {
    try {
      const url = new URL(response.url());
      const resource = url.pathname + url.search;
      const entry = plan.get(resource);
      const count = (counts.get(resource) ?? 0) + 1;
      if (url.origin !== origin || !entry || response.status() !== 200 || count > entry.count) {
        onStop?.("UNPLANNED_RESPONSE_METADATA");
        throw new Error("Unplanned browser response metadata");
      }
      if (collecting) throw new Error("Unplanned browser response metadata");
      counts.set(resource, count);
      pending.push({ resource, response });
    } catch (fault) {
      error ??= fault;
    }
  };
  page.on("response", listener);
  return {
    check() { if (error) throw error; },
    async collect(signal) {
      if (collecting) throw new Error("Browser response bodies already collected");
      collecting = true;
      if (error) throw error;
      const received = [];
      for (const { resource, response } of pending) {
        signal.throwIfAborted();
        received.push({ resource, bytes: Buffer.from(await response.body()) });
      }
      signal.throwIfAborted();
      if (error) throw error;
      return received;
    },
  };
}
