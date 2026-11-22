import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { sha256 } from "./build-resources.mjs";
import { preflightNetworkRules } from "./stage-c-network-policy.mjs";

export async function withStageCWorkerInputs(args, run) {
  const [manifestPath, expectedManifestSha, root, driverEntry, evidenceDirectory] = args;
  assert.match(expectedManifestSha ?? "", /^[a-f0-9]{64}$/);
  const manifestBytes = readFileSync(manifestPath);
  assert.equal(sha256(manifestBytes), expectedManifestSha, "approved manifest hash mismatch");
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.sourceHead, registration.source.experimentSourceHead);
  assert.equal(manifest.sourceTree, registration.source.experimentSourceTree);
  const networkRules = preflightNetworkRules(manifest);

  const now = () => Number(process.hrtime.bigint() / 1_000_000n);
  const rawStart = process.env.STAGE_C_MONOTONIC_START_NS;
  assert.match(rawStart ?? "", /^\d+$/);
  const start = Number(BigInt(rawStart) / 1_000_000n);
  assert.ok(Number.isSafeInteger(start) && start <= now(), "invalid supervisor clock");
  const clock = {
    startedAt: start, now,
    scheduleAt(deadline, callback) {
      const timer = setTimeout(callback, Math.max(0, deadline - now()));
      return () => clearTimeout(timer);
    },
  };

  const stop = new AbortController();
  const ready = Promise.withResolvers();
  function command(chunk) {
    for (const char of chunk.toString("ascii")) {
      if (char === "G") ready.resolve();
      else if (char === "S") {
        stop.abort();
        ready.resolve();
      } else {
        stop.abort();
        ready.reject(new Error("Invalid supervisor command"));
      }
    }
  }
  function disconnected() {
    stop.abort();
    ready.reject(new Error("Lost Stage C supervisor"));
  }
  process.stdin.on("data", command);
  process.stdin.once("end", disconnected);
  try {
    await ready.promise;
    stop.signal.throwIfAborted();
    return await run({
      manifest, root, networkRules, clock, stopSignal: stop.signal, evidenceDirectory,
      loadWebKit() {
        stop.signal.throwIfAborted();
        const requireDriver = createRequire(driverEntry);
        assert.equal(requireDriver("playwright/package.json").version, "1.56.1");
        return requireDriver("playwright").webkit;
      },
    });
  } finally {
    process.stdin.off("data", command).off("end", disconnected).pause();
  }
}
