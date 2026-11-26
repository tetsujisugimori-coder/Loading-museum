"""One real WebKit stop-only observation, separate from all Stage C registered trials."""

import hashlib
import json
import os
from pathlib import Path
import re
import stat
import shutil
import sys

from process_supervisor import run_supervised


READY_NAME = "webkit-stop-ready.json"
PROOF_NAME = "webkit-stop-proof.json"
LAUNCHER = "/tmp/runtime/ms-playwright/webkit-2215/pw_run.sh"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def matches_browser_tree(rows, launcher_pid):
    launchers = {row["pid"] for row in rows if LAUNCHER in row["cmdline"].split()}
    if launcher_pid is not None:
        launchers &= {launcher_pid}
    return any(row["parentPid"] in launchers and re.search(r"\bMiniBrowser\b", row["cmdline"])
               for row in rows)


def read_ready(path, namespace):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except FileNotFoundError:
        return None
    with os.fdopen(fd, "rb") as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ValueError("READY is not a regular file")
        data = stream.read(16385)
    if len(data) > 16384:
        raise ValueError("Oversized READY receipt")
    ready = json.loads(data)
    if not isinstance(ready, dict):
        raise ValueError("Invalid READY receipt")
    rows = ready.get("observedWebkitProcesses")
    if not (
        ready.get("kind") == "STAGE_C_WEBKIT_READY"
        and ready.get("registeredTrials") == 0
        and ready.get("browserType") == "webkit"
        and ready.get("playwrightVersion") == "1.56.1"
        and ready.get("webkitVersion") == "26.0"
        and ready.get("pageTitle") == "stage-c-webkit-stop-fixture"
        and ready.get("workerNamespace") == namespace
        and re.fullmatch(r"[0-9]{1,20}", str(ready.get("readyAtNs")))
        and isinstance(rows, list)
        and all(
            isinstance(row, dict) and row.get("namespace") == namespace
            and type(row.get("pid")) is int and row["pid"] > 1
            and type(row.get("parentPid")) is int and row["parentPid"] > 0
            and row.get("state") not in (None, "UNKNOWN", "Z")
            and isinstance(row.get("cmdline"), str)
            for row in rows
        )
        and matches_browser_tree(rows, None)
        and any(re.search(r"WPE(?:Web|Network)Process", row["cmdline"]) for row in rows)
    ):
        raise ValueError("READY prerequisites or PID namespace mismatch")
    return data


def supervise(root, rootfs, command, readonly):
    raw = root / "raw"
    raw.mkdir(mode=0o700)
    destination = root / "supervisor"

    def check(namespace):
        data = read_ready(raw / READY_NAME, namespace)
        return None if data is None else digest(data)

    receipt = run_supervised(
        rootfs, command, destination, readonly=readonly, writable=[(raw, "/var/tmp")],
        soft_seconds=75, hard_seconds=100, ready_check=check,
    )
    report = {"stopDiagnostic": "INCOMPLETE", "registeredTrialCount": 0,
              "supervisor": receipt, "error": None}
    log = (destination / "worker.stderr").read_text(errors="replace")
    launches = re.findall(r"pw:browser <launched> pid=(\d+)", log)
    report["browserLaunchAttempts"] = len(re.findall(r"pw:browser <launching>", log))
    report["browserPids"] = launches
    try:
        ready_bytes = (raw / READY_NAME).read_bytes()
        ready = json.loads(ready_bytes)
        proof_bytes = (raw / PROOF_NAME).read_bytes()
        proof = json.loads(proof_bytes)
        worker = json.loads((destination / "worker.stdout").read_bytes())
        ready_sha, proof_sha = digest(ready_bytes), digest(proof_bytes)
        report.update(readySha256=ready_sha, proofSha256=proof_sha)
        rows = ready["observedWebkitProcesses"]
        if report["browserLaunchAttempts"] != 1 or len(launches) != 1 or not matches_browser_tree(
            rows, int(launches[0])
        ):
            raise ValueError("Single browser launch was not confirmed in READY")
        events = re.findall(rf"pw:browser \[pid={launches[0]}\] (<[^>]+>)", log)
        if events != ["<gracefully close start>", "<process did exit: exitCode=0, signal=null>",
                      "<gracefully close end>"]:
            raise ValueError("Clean WebKit process exit was not confirmed")
        if not (
            receipt["stopSource"] == "READY" and receipt["stopCompleted"]
            and receipt["withinHardDeadline"] and receipt["hardKillSeconds"] is None
            and receipt["supervisorError"] is None and receipt["readyError"] is None
            and receipt["workerExit"] == 1 and receipt["workerResultStatus"] == "INCOMPLETE"
            and proof["kind"] == "STAGE_C_REAL_WEBKIT_STOP_ONLY" and proof["stopCommand"] == "S"
            and proof["cleanup"] == proof["persistence"] == "PASS"
            and proof["remainingWebkitProcesses"] == []
            and ready_sha == receipt["readySha256"] == proof["readySha256"]
            and worker["proofSha256"] == proof_sha
            and all(proof[key] == value for key, value in ready.items() if key != "kind")
        ):
            raise ValueError("Incomplete READY or normal stop evidence")
        start = receipt["monotonicStartNs"]
        ready_written, received, context_closed, browser_closed = [
            (int(proof[key]) - start) / 1e9 for key in (
                "readyAtNs", "stopReceivedAtNs", "contextClosedAtNs", "browserClosedAtNs"
            )
        ]
        if not (
            0 <= ready_written <= receipt["readyObservedSeconds"] <= receipt["stopRequestedSeconds"]
            <= received <= context_closed <= browser_closed <= receipt["namespaceExitObservedSeconds"]
        ):
            raise ValueError("Invalid READY, stop and cleanup event order")
        report.update(stopDiagnostic="PASS", browserEvents=events,
                      readyWrittenSeconds=ready_written, stopReceivedSeconds=received,
                      contextClosedSeconds=context_closed, browserClosedSeconds=browser_closed,
                      stopToNamespaceExitSeconds=receipt["namespaceExitObservedSeconds"] - receipt["stopRequestedSeconds"])
    except (OSError, ValueError, TypeError, KeyError) as error:
        report["error"] = f"{type(error).__name__}: {error}"
    result = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    path = root / "result.json"
    with path.open("xb") as stream:
        stream.write(result)
        stream.flush()
        os.fsync(stream.fileno())
    if path.read_bytes() != result:
        raise RuntimeError("Diagnostic result readback failed")
    return report


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Expected absolute Playwright module path and browser cache")
    module = Path(sys.argv[1]).resolve(strict=True)
    browsers = Path(sys.argv[2]).resolve(strict=True)
    if module.name != "playwright" or not browsers.is_dir():
        raise SystemExit("Invalid WebKit test dependencies")
    root = Path(os.environ["RUNNER_TEMP"]).resolve() / "stage-c-webkit-stop-evidence"
    root.mkdir(mode=0o700, exist_ok=True)
    worker = Path(__file__).resolve().with_name("real-webkit-stop-worker.mjs")
    node = shutil.which("node")
    if not node:
        raise SystemExit("No Node.js binary")
    report = supervise(root, "/", [node, str(worker), str(module), f"/var/tmp/{PROOF_NAME}"],
                       [(browsers, "/tmp/runtime/ms-playwright")])
    print("stage_c_real_webkit_stop=" + json.dumps(report, sort_keys=True))
    if report["stopDiagnostic"] != "PASS":
        raise SystemExit("INCOMPLETE: real WebKit stop completion was not proven")


if __name__ == "__main__":
    main()
