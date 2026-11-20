import { linkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "./build-resources.mjs";
import { observeNetwork } from "./stage-c-network-ledger.mjs";

export function attachStageCNetwork(context, policy, gate, signal, phase) {
  const { slotId } = policy;
  const ledger = observeNetwork(context, policy, {
    onStop: fault => gate.requestStop(fault), isStopping: () => signal.aborted, phase,
  });
  return {
    beginContextClose: ledger.beginContextClose,
    collectBodies: ledger.collectBodies,
    sealAndPersist(evidence, originEvents, interrupted) {
      const record = ledger.finalise(originEvents, interrupted);
      const filename = `${slotId}.network.json`;
      const bytes = Buffer.from(JSON.stringify(record, null, 2) + "\n");
      try {
        evidence.write(filename, bytes);
        const saved = evidence.read(filename);
        if (!saved.equals(bytes)) throw new Error("Network receipt readback mismatch");
        const { classification, auditVerdict, comparisonVerdict, evidenceStatus, faults, missing } = record;
        return { classification, auditVerdict, comparisonVerdict, evidenceStatus, faults, missing,
          persistence: "PASS", saved: { filename, bytes: saved.length, sha256: sha256(saved) } };
      } catch (error) {
        return { classification: record.classification === "NETWORK_AUDIT_FAIL" ? record.classification : "INCOMPLETE",
          auditVerdict: record.auditVerdict === "FAIL" ? "FAIL" : "INCOMPLETE",
          evidenceStatus: "INCOMPLETE", comparisonVerdict: record.auditVerdict === "FAIL" ? "UNRELIABLE" : "UNKNOWN",
          persistence: "FAIL", missing: [...record.missing, "NETWORK_RECEIPT_FAILED"],
          faults: record.faults, error: String(error) };
      }
    },
  };
}

export function publishNetworkStopNotice(directory, fault) {
  const pending = join(directory, "network-stop.pending");
  writeFileSync(pending, JSON.stringify(fault), { flag: "wx", mode: 0o400, flush: true });
  linkSync(pending, join(directory, "network-stop.notice.json"));
}
