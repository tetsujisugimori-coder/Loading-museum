import assert from "node:assert/strict";
import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { runBrowserStageCDiagnostic } from "./browser-runtime.mjs";
import { publishNetworkStopNotice } from "./stage-c-network-adapter.mjs";
import { bindContractBuild } from "./stage-c-network-policy.mjs";
import { withStageCWorkerInputs } from "./stage-c-worker-inputs.mjs";

function children() {
  const rows = [];
  for (const pid of readdirSync("/proc").map(Number).filter(pid => pid > 1 && pid !== process.pid)) {
    try {
      rows.push({ pid, name: readFileSync(`/proc/${pid}/comm`, "utf8").trim(),
        namespace: readlinkSync(`/proc/${pid}/ns/pid`) });
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error;
    }
  }
  return rows;
}

const args = process.argv.slice(2);
assert.equal(args.length, 5, "Expected Stage C diagnostic inputs");
await withStageCWorkerInputs(args, async ({
  manifest, root, networkRules, stopSignal, evidenceDirectory, loadWebKit,
}) => {
  const interfaces = readFileSync("/proc/net/dev", "utf8").trimEnd().split("\n").slice(2)
    .map(line => line.split(":")[0].trim());
  assert.deepEqual(interfaces, ["lo"]);
  const apparmor = readFileSync("/proc/self/attr/current", "utf8").trim();
  assert.equal(apparmor, "bwrap//&unpriv_bwrap (enforce)");
  const state = readFileSync("/proc/self/status", "utf8");
  for (const key of ["CapEff", "CapPrm", "CapAmb"]) {
    assert.match(state, new RegExp(`^${key}:\\s+0{16}$`, "m"));
  }
  assert.match(state, /^NoNewPrivs:\s+1$/m);
  assert.match(state, /^Seccomp:\s+2$/m);
  const namespaces = Object.fromEntries(["user", "pid", "net"].map(name => [name, readlinkSync("/proc/self/ns/" + name)]));
  const trustedResources = bindContractBuild(join(root, "I0"), manifest.outputs.I0);
  const result = await runBrowserStageCDiagnostic({
    webkit: loadWebKit(), stopSignal, trustedResources, networkRules, evidenceDirectory,
    onNetworkStop: fault => publishNetworkStopNotice(evidenceDirectory, fault),
    observe: children,
  });
  console.log(JSON.stringify({ ...result, namespaces, apparmor, state, interfaces, pid: process.pid,
    uid: process.getuid(), gid: process.getgid(), uidMap: readFileSync("/proc/self/uid_map", "utf8").trim(),
    gidMap: readFileSync("/proc/self/gid_map", "utf8").trim(),
    supervisorStartNs: process.env.STAGE_C_MONOTONIC_START_NS }));
  if (result.status !== "PASS") process.exitCode = 1;
});
