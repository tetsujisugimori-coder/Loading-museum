import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { observeNetwork, saveNetworkLedger } from "./stage-c-network-ledger.mjs";

export function attachStageCNetwork(context, trustedPolicy, gate, signal) {
  const { slotId } = trustedPolicy;
  const ledger = observeNetwork(context, trustedPolicy, {
    onStop: fault => gate.requestStop(fault), isStopping: () => signal?.aborted,
  });
  return {
    beginContextClose: ledger.beginContextClose,
    // Context closure must finish before sealing. On interruption this records partial evidence.
    sealAndPersist(path, interrupted) {
      try {
        const record = ledger.finalise({ interrupted });
        if (!interrupted) gate.acceptNetworkLedger(record);
        const saved = saveNetworkLedger(path, record);
        return { networkPolicyVerdict: record.networkPolicyVerdict, evidenceStatus: record.evidenceStatus, saved };
      } catch (error) {
        gate.requestStop({ slotId, reason: "NETWORK_RECEIPT_FAILED" });
        return { networkPolicyVerdict: "INCOMPLETE", evidenceStatus: "INCOMPLETE", error: String(error) };
      }
    },
  };
}

// Publish atomically so the namespace-owning supervisor never reads a partial notice.
export function publishNetworkStopNotice(directory, fault) {
  const pending = join(directory, "network-stop.pending");
  writeFileSync(pending, JSON.stringify(fault), { flag: "wx", mode: 0o400, flush: true });
  renameSync(pending, join(directory, "network-stop.notice.json"));
}
