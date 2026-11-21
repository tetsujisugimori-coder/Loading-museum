import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, posix } from "node:path";

const base = "/Loading-museum/";
const mime = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
};
export const sha256 = data => createHash("sha256").update(data).digest("hex");

export function inventoryStaticBuild(root) {
  assert.ok(lstatSync(root).isDirectory(), "static output directory required");
  const files = [];
  function visit(relative) {
    const names = readdirSync(join(root, relative), { withFileTypes: true });
    names.sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)));
    for (const entry of names) {
      const path = posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else {
        assert.ok(entry.isFile(), "static build must contain only regular files");
        const bytes = readFileSync(join(root, path));
        files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  }
  visit("");
  assert.ok(files.some(file => file.path === "index.html"), "missing base route");
  const routes = [];
  for (const file of files) {
    const resource = base + file.path.split("/").map(encodeURIComponent).join("/");
    const contentType = mime[extname(file.path)] ?? "application/octet-stream";
    routes.push({ resource, path: file.path, contentType, sha256: file.sha256 });
    if (file.path === "index.html" || file.path.endsWith("/index.html")) {
      routes.push({ resource: resource.slice(0, -"index.html".length), path: file.path, contentType, sha256: file.sha256 });
    }
  }
  return { files, routes };
}

/** Occurrence counts are fixed by a separately reviewed request plan, before launch. */
export function bindStaticRequests(root, expectedInventory, requests) {
  assert.deepEqual(inventoryStaticBuild(root), expectedInventory, "fixed export inventory changed");
  const routes = new Map(expectedInventory.routes.map(route => [route.resource, route]));
  assert.ok(Array.isArray(requests) && requests.some(request => request.resource === base), "missing base request");
  return requests.map(({ resource, count }) => {
    const entry = routes.get(resource);
    assert.ok(entry && Number.isSafeInteger(count) && count > 0, "invalid fixed request");
    const bytes = readFileSync(join(root, entry.path));
    assert.equal(sha256(bytes), entry.sha256, "fixed request bytes changed");
    return { ...entry, bytes, count };
  });
}
