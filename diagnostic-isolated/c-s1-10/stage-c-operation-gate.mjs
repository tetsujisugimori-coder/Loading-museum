import assert from "node:assert/strict";

export function createNetworkOperationGate(onStop) {
  let firstReason = null;
  const denied = [];
  return {
    requestStop(data) {
      assert.ok(data?.slotId && data?.reason, "reason needed");
      if (firstReason === null) {
        firstReason = Object.freeze({ ...data, mismatchDetectedAtNs: process.hrtime.bigint().toString() });
        onStop?.(firstReason);
      }
    },
    assertMayStart(action) {
      if (!action || typeof action !== "string") throw new Error("action id required");
      if (firstReason !== null) {
        denied.push(action);
        throw new Error("STAGE_C_STOP_REQUESTED: " + action);
      }
    },
    snapshot: () => ({ firstReason, deniedNewOperations: denied.slice() }),
  };
}
