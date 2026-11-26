import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { bindStaticRequests, inventoryStaticBuild } from "./build-resources.mjs";
import { s1TargetGeneration } from "./s1-trace-audit.mjs";

test("the complete static output inventory includes hidden files and rejects changed bytes", t => {
  mkdirSync("work", { recursive: true });
  const root = mkdtempSync("work/stage-c-static-");
  t.after(() => rmSync(root, { force: true, recursive: true }));
  writeFileSync(join(root, "index.html"), "<main>synthetic</main>");
  writeFileSync(join(root, ".nojekyll"), "");
  mkdirSync(join(root, "sub page"));
  writeFileSync(join(root, "sub page", "index.html"), "<main>sub</main>");
  const inventory = inventoryStaticBuild(root);
  assert.deepEqual(inventory.files.map(file => file.path), [".nojekyll", "index.html", "sub page/index.html"]);
  assert.ok(inventory.routes.some(route => route.resource === "/Loading-museum/sub%20page/"));
  const requests = [{ resource: "/Loading-museum/", count: 1 }];
  assert.equal(bindStaticRequests(root, inventory, requests)[0].bytes.toString(), "<main>synthetic</main>");
  assert.throws(() => bindStaticRequests(root, inventory, [{ ...requests[0], count: 0 }]), /invalid fixed request/);
  writeFileSync(join(root, ".nojekyll"), "\n");
  assert.throws(() => bindStaticRequests(root, inventory, requests), /fixed export inventory changed/);
});

test("target generation requires all four read IDs, the Undo transition and one bound timer", () => {
  const ids = ["keyboard", "undo", "primary", "followup"];
  const trace = { calls: ids.map(callId => ({ before: { method: "getAttribute", callId } })) };
  const marks = { complete: true, events: [
    { kind: "driverTargetMarked", sequence: 5, generation: 1, detail: ids[0] },
    { kind: "driverTargetMarked", sequence: 7, generation: 2, detail: ids[1] },
    { kind: "timerRegistered", sequence: 10, generation: 4 },
    { kind: "driverTargetMarked", sequence: 12, generation: 4, detail: ids[2] },
    { kind: "driverTargetMarked", sequence: 13, generation: 4, detail: ids[3] },
  ] };
  assert.equal(s1TargetGeneration(trace, marks), 4);
  marks.events[2].generation = 3;
  assert.equal(s1TargetGeneration(trace, marks), null);
  marks.events[2].generation = 4;
  marks.events[4].generation++;
  assert.equal(s1TargetGeneration(trace, marks), null);
});

test("the production worker exits on HOLD before opening an execution package", () => {
  const worker = fileURLToPath(new URL("./stage-c-worker.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [worker], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /execution is on HOLD/);
});
