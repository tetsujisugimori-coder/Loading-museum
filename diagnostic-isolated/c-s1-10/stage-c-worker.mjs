import { join } from "node:path";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { prepareBrowserStageC } from "./browser-runtime.mjs";
import { publishNetworkStopNotice } from "./stage-c-network-adapter.mjs";
import { bindContractBuild } from "./stage-c-network-policy.mjs";
import { withStageCWorkerInputs } from "./stage-c-worker-inputs.mjs";

// A HOLD exits before reading build files, importing Playwright or opening evidence.
if (registration.decision === "HOLD" || registration.executionAuthorization !== true || registration.executable !== true) {
  throw new Error("Stage C browser execution is on HOLD");
}
await withStageCWorkerInputs(process.argv.slice(2), async ({
  manifest, root, networkRules, clock, stopSignal, evidenceDirectory, loadWebKit,
}) => {
  const trustedResources = new Map();
  for (const slot of registration.slots.filter(slot => slot.originalProductTrial !== false)) {
    trustedResources.set(slot.id, bindContractBuild(join(root, slot.level), manifest.outputs[slot.level]));
  }
  const result = await prepareBrowserStageC({ webkit: loadWebKit(), clock, stopSignal, trustedResources,
    networkRules, onNetworkStop: fault => publishNetworkStopNotice(evidenceDirectory, fault), evidenceDirectory }).run();
  if (result.stopRequested || result.cleanup !== "PASS" || result.persistence !== "PASS" ||
      result.records.some(row => row.state !== "COMPLETED")) process.exitCode = 1;
  if (clock.now() < clock.startedAt + registration.bounds.absoluteCutoffSeconds * 1000) console.log(JSON.stringify(result));
}, { product: true });
