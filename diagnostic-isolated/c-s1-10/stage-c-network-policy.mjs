import assert from "node:assert/strict";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import contract from "./NETWORK-CONTRACT-v1.json" with { type: "json" };
import { bindStaticRequests } from "./build-resources.mjs";

export function bindStageCNetworkPolicy(slotId, origin, spec) {
  const url = new URL(origin);
  assert.equal(url.origin, origin);
  assert.equal(url.protocol, "http:");
  assert.equal(url.hostname, "127.0.0.1");
  const slot = registration.slots.find(slot => slot.id === slotId);
  assert.ok(slot);
  const calibration = slot.originalProductTrial === false;
  assert.equal(spec === null, calibration);
  return { slotId, origin, level: slot.level, calibration,
    fixedSourceHead: contract.scope.localSourceHeadReported,
    fixedBuildBindingSha256: contract.trustedBuild.bindingSha256, spec };
}

// Bind each of the fixed served paths before any browser is launched. The old
// manifest's requests field described exact occurrences and is no longer a policy input.
export function preflightNetworkRules(manifest) {
  assert.deepEqual(registration.slots.map(slot => slot.id), contract.scope.registeredSlots);
  for (const [level, spec] of Object.entries(contract.product.levels)) {
    const { files, routes } = manifest.outputs[level];
    assert.equal(files.length, spec.buildFileCount);
    assert.equal(routes.length, spec.routeInventoryCount);
    assert.deepEqual(Object.fromEntries(routes.map(({ resource, path, sha256 }) =>
      [resource, { mappedBuildFile: path, sha256 }])), spec.allowlist, "contract routes and build bytes differ");
  }
  return new Map(registration.slots.map(slot => [slot.id,
    slot.originalProductTrial === false ? null : contract.product.levels[slot.level]]));
}

export function bindContractBuild(root, inventory) {
  // An occurrence count of one here selects one copy of each static file per route.
  // No occurrence count is passed to the server or observer.
  return bindStaticRequests(root, inventory, inventory.routes.map(({ resource }) => ({ resource, count: 1 })))
    .map(({ count, ...entry }) => entry);
}
