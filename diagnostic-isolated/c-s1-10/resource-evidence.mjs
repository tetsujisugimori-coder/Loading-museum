import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";

const digest = data => createHash("sha256").update(data).digest("hex");

/** Copy the fixed build routes before opening the origin. */
export function freezeResourcePlan(entries) {
  const plan = new Map();
  for (const { resource, bytes, sha256, contentType } of entries) {
    const url = new URL(resource, "http://127.0.0.1");
    const goodPath = typeof resource === "string" && resource.startsWith("/Loading-museum/") &&
      url.pathname === resource;
    if (!goodPath || plan.has(resource) || !(bytes instanceof Uint8Array) || digest(bytes) !== sha256 ||
        typeof contentType !== "string" || !contentType) {
      throw new Error("Invalid fixed resource");
    }
    plan.set(resource, Object.freeze({ bytes: Buffer.from(bytes), sha256, contentType }));
  }
  if (!plan.size) throw new Error("Missing fixed resources");
  return plan;
}

export async function startPinnedServer(plan, signal, onStop) {
  signal.throwIfAborted();
  const events = [];
  const server = createServer((request, response) => {
    const resource = request.url;
    const entry = plan.get(resource);
    const valid = entry && request.method === "GET";
    const bytes = valid ? Buffer.from(entry.bytes) : null;
    const row = { id: events.length + 1, atHostMonotonicNs: process.hrtime.bigint().toString(),
      resource, method: request.method, validator: request.headers["if-none-match"] ?? null,
      etag: null, status: valid ? 200 : 404, terminal: null, bodySha256: null, bodyBase64: null };
    events.push(row);
    response.once("finish", () => {
      row.terminal = "FINISHED";
      row.finishedAtHostMonotonicNs = process.hrtime.bigint().toString();
      if (bytes) {
        row.bodySha256 = digest(bytes);
        row.bodyBase64 = bytes.toString("base64");
      }
    });
    response.once("close", () => {
      if (!response.writableFinished) row.terminal = "INTERRUPTED";
    });
    if (!valid) {
      onStop?.("UNPLANNED_SERVER_REQUEST");
      response.writeHead(404).end();
      return;
    }
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
    events: () => structuredClone(events),
    close() {
      return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        if (signal.aborted) server.closeAllConnections();
      });
    },
  };
}
