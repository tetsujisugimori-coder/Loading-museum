import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fstatSync, readFileSync, readlinkSync } from "node:fs";
import { createRequire } from "node:module";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { sha256 } from "./build-resources.mjs";
import { preflightNetworkRules } from "./stage-c-network-policy.mjs";

function productApproval(manifest, expectedManifestSha) {
  assert.equal(manifest.executionAuthorized, true, "Stage C binding does not authorize execution");
  assert.ok(fstatSync(0).isSocket(), "Stage C product needs an inherited launcher socket");
  execFileSync("/usr/bin/python3", ["-IB", "/tmp/stage-c-process-supervisor.py", "--check-product-peer"],
    { stdio: [0, "ignore", "pipe"] });
  const body = readFileSync("/tmp/stage-c-owner-approval.json");
  const approval = JSON.parse(body);
  assert.equal(approval.schemaVersion, 1);
  assert.equal(approval.executionAuthorized, true);
  assert.equal(approval.bindingSha256, expectedManifestSha);
  assert.equal(approval.runtimeHead, manifest.implementationHead);
  assert.equal(approval.runtimeTree, manifest.implementationTree);
  assert.equal(approval.evidenceContractSha256, manifest.mandatoryEvidence.sha256);
  const registrationBytes = readFileSync(new URL("../../docs/phase7d/stage-c-api-s1-10/registration.json", import.meta.url));
  assert.equal(approval.registrationSha256, sha256(registrationBytes));
  return { digest: sha256(body), runId: approval.runId };
}

export function validateProductStart(line, approval, ticket, rawStart, namespace) {
  const start = JSON.parse(line);
  assert.match(ticket ?? "", /^[a-f0-9]{64}$/);
  assert.equal(start.ticket, ticket, "Stage C product start ticket mismatch");
  assert.equal(start.runId, approval.runId);
  assert.equal(start.approvalSha256, approval.digest);
  assert.equal(start.startNs, rawStart);
  assert.match(start.outerPidNamespace ?? "", /^pid:\[\d+\]$/);
  assert.notEqual(start.outerPidNamespace, namespace, "Stage C product needs a private PID namespace");
  assert.equal(start.pidNamespace, namespace);
}

export async function withStageCWorkerInputs(args, run, { product = false } = {}) {
  const [manifestPath, expectedManifestSha, root, driverEntry, evidenceDirectory] = args;
  assert.match(expectedManifestSha ?? "", /^[a-f0-9]{64}$/);
  const manifestBytes = readFileSync(manifestPath);
  assert.equal(sha256(manifestBytes), expectedManifestSha, "approved manifest hash mismatch");
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.sourceHead, registration.source.experimentSourceHead);
  assert.equal(manifest.sourceTree, registration.source.experimentSourceTree);
  const approval = product ? productApproval(manifest, expectedManifestSha) : null;
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
  let stopCommandReceivedNs = null;
  const ready = Promise.withResolvers();
  let handshake = product ? "" : null;
  function command(chunk) {
    let input = chunk.toString("ascii");
    if (handshake !== null && !input.startsWith("S")) {
      handshake += input;
      const end = handshake.indexOf("\n");
      try {
        assert.ok(handshake.length <= 4096, "Oversized Stage C product start");
        if (end === -1) return;
        validateProductStart(handshake.slice(0, end), approval, process.env.STAGE_C_PRODUCT_TICKET,
          rawStart, readlinkSync("/proc/self/ns/pid"));
        input = handshake.slice(end + 1);
        handshake = null;
        ready.resolve();
      } catch (error) {
        stop.abort();
        ready.reject(error);
        return;
      }
    }
    for (const char of input) {
      if (char === "G" && !product) ready.resolve();
      else if (char === "S") {
        stopCommandReceivedNs ??= process.hrtime.bigint().toString();
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
    if (product) {
      assert.ok(now() < start + registration.bounds.beginStopAndCleanupBySeconds * 1000,
        "Stage C product GO arrived after the stop boundary");
    }
    return await run({
      manifest, root, networkRules, clock, stopSignal: stop.signal, evidenceDirectory,
      stopCommandReceivedNs: () => stopCommandReceivedNs,
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
