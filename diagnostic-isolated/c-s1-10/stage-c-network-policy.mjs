import assert from "node:assert/strict";
import registration from "../../docs/phase7d/stage-c-api-s1-10/registration.json" with { type: "json" };
import { validatePolicy } from "./stage-c-network-ledger.mjs";

const entryPath = "/Loading-museum/";

// At preflight the only placeholder is the server port. No requests have been made.
export function bindStageCNetworkPolicy(slotId, origin, rules) {
  return validatePolicy({
    schemaVersion: 1, slotId, origin, rules,
    unknownRequestAction: "STOP_NEW_OPERATIONS",
    redirectHandling: "COUNT_EACH_HOP",
    cacheHandling: "OBSERVE_UNDETERMINED",
  });
}

export function preflightNetworkRules(manifest) {
  assert.ok(manifest.networkRules && manifest.requests, "independently fixed network and delivery plans required");
  assert.deepEqual(Object.keys(manifest.networkRules).sort(), registration.slots.map(slot => slot.id).sort());
  const productIds = registration.slots.filter(slot => slot.originalProductTrial !== false).map(slot => slot.id);
  assert.deepEqual(Object.keys(manifest.requests).sort(), productIds.sort(), "delivery plan must cover only product slots");
  const bySlot = new Map();
  for (const slot of registration.slots) {
    const { rules } = bindStageCNetworkPolicy(slot.id, "http://127.0.0.1", manifest.networkRules[slot.id]);
    if (slot.originalProductTrial === false) {
      assert.deepEqual(rules, [], "calibration fixture must use zero HTTP requests");
    } else {
      const routes = manifest.outputs[slot.level].routes.map(route => route.resource).sort();
      assert.deepEqual(rules.map(rule => rule.pathname).sort(), routes, "network rules must cover fixed routes exactly");
      const delivery = manifest.requests[slot.id];
      const counts = new Map(delivery.map(({ resource, count }) => [resource, count]));
      assert.equal(delivery.length, counts.size, "duplicate delivery route");
      assert.ok([...counts.keys()].every(resource => routes.includes(resource)), "unbound delivery route");
      for (const rule of rules) {
        assert.equal(rule.method, "GET");
        assert.deepEqual(rule.queryKeys, [], "pinned server only serves literal paths");
        assert.deepEqual(rule.allowedStatuses, [200]);
        const exact = counts.get(rule.pathname) ?? 0;
        // The production server and the response-body audit currently use the same exact count.
        // A broader observer allowance would promise traffic the server still rejects.
        assert.deepEqual([rule.min, rule.max], [exact, exact],
          "approved network counts must match the exact delivery plan");
        if (rule.pathname === entryPath) {
          assert.ok(exact >= 1, "initial document must occur");
          assert.deepEqual(rule.resourceTypes, ["document"], "entry route requires document requests");
        }
      }
    }
    bySlot.set(slot.id, rules);
  }
  return bySlot;
}
