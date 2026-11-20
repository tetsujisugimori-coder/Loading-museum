"""One real WebKit stop-only observation, separate from all Stage C registered trials."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

from process_supervisor import run_supervised


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Expected absolute Playwright module path and browser cache")
    module = Path(sys.argv[1]).resolve(strict=True)
    browsers = Path(sys.argv[2]).resolve(strict=True)
    if module.name != "playwright" or not browsers.is_dir():
        raise SystemExit("Invalid WebKit test dependencies")
    root = Path(os.environ["RUNNER_TEMP"]).resolve() / "stage-c-webkit-stop-evidence"
    root.mkdir(mode=0o700, exist_ok=True)
    raw = root / "raw"
    raw.mkdir(mode=0o700)
    worker = Path(__file__).resolve().with_name("real-webkit-stop-worker.mjs")
    destination = root / "supervisor"
    node = shutil.which("node")
    if not node:
        raise SystemExit("No Node.js binary")

    receipt = None
    error = None
    try:
        receipt = run_supervised(
            "/", [node, str(worker), str(module), "/var/tmp/webkit-stop-proof.json"],
            destination, readonly=[(browsers, "/ms-playwright")],
            writable=[(raw, "/var/tmp")], soft_seconds=20, hard_seconds=50,
        )
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    proof_path = raw / "webkit-stop-proof.json"
    proof = None
    worker_receipt = None
    if proof_path.is_file():
        try:
            data = proof_path.read_bytes()
            proof = json.loads(data)
            worker_receipt = json.loads((destination / "worker.stdout").read_bytes())
            if worker_receipt.get("proofSha256") != hashlib.sha256(data).hexdigest():
                raise ValueError("Proof SHA-256 mismatch against worker stdout")
        except (OSError, ValueError, TypeError) as exc:
            error = f"PROOF_READBACK: {type(exc).__name__}: {exc}"

    success = (
        error is None and receipt is not None and proof is not None and
        proof.get("kind") == "STAGE_C_REAL_WEBKIT_STOP_ONLY" and
        proof.get("registeredTrials") == 0 and
        proof.get("browserType") == "webkit" and
        proof.get("observedWebkitProcesses") and
        proof.get("cleanup") == proof.get("persistence") == "PASS" and
        receipt.get("stopSource") == "TIME_LIMIT" and
        receipt.get("stopRequested") is True and
        receipt.get("stopCompleted") is True and
        receipt.get("namespaceExitObservedSeconds") is not None and
        receipt.get("withinHardDeadline") is True and
        receipt.get("hardKillSeconds") is None and
        receipt.get("supervisorError") is None and
        receipt.get("workerExit") == 1 and
        receipt.get("workerResultStatus") == "INCOMPLETE"
    )
    report = {
        "scope": "real WebKit one-shot stop only; not registered Stage C trials",
        "runtimeCompatibility": "Playwright 1.61.0 on Ubuntu 26.04; not equivalent to Stage C pinned 1.56.1",
        "registeredTrialCount": 0,
        "stopDiagnostic": "PASS" if success else "INCOMPLETE",
        "realWebkitObserved": bool(proof and proof.get("browserType") == "webkit"),
        "workerEvidencePresent": proof is not None,
        "supervisor": receipt, "error": error,
    }
    report_bytes = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    result_path = root / "result.json"
    with result_path.open("xb") as file:
        file.write(report_bytes)
        file.flush()
        os.fsync(file.fileno())
    if result_path.read_bytes() != report_bytes:
        raise SystemExit("INCOMPLETE: diagnostic result readback failed")
    print("stage_c_real_webkit_stop=" + json.dumps(report, sort_keys=True))
    if not success:
        raise SystemExit("INCOMPLETE: real WebKit stop completion was not proven")


if __name__ == "__main__":
    main()
