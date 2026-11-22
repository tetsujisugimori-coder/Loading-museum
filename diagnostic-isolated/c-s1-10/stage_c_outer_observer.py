"""Host-side terminal clock audit for Stage C. Does not start registered trials itself.

This wrapper is intentionally separate from the fixed product entry point: it must
be explicitly selected and included in a newly reviewed package before any use.
The audit JSON is written *after* the time verdict and is not counted as product
primary evidence. Failure to save the audit must never be treated as approval.
"""

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import signal
import stat
import subprocess
import time


REQUIRED = ("supervisor.json", "worker.stdout", "worker.stderr")


def _readback(path):
    """Two independent no-follow opens, with a directory sync before readback."""
    path = Path(path)
    parent_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)

    def read_once():
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise ValueError("Evidence is not a regular file")
            os.fsync(fd)
            with os.fdopen(fd, "rb", closefd=False) as stream:
                return stream.read()
        finally:
            os.close(fd)

    a, b = read_once(), read_once()
    if a != b:
        raise ValueError("Independent evidence readback mismatch")
    return a


def _time_verdict(start_ns, terminal_ns, limit_seconds, valid):
    if not isinstance(start_ns, int) or not isinstance(terminal_ns, int) or terminal_ns < start_ns:
        return "UNKNOWN"
    if terminal_ns - start_ns > round(limit_seconds * 1_000_000_000):
        return "OVER_LIMIT"
    return "WITHIN_LIMIT" if valid else "UNKNOWN"


def _save_audit(path, report):
    """Exclusive post-verdict audit; never modifies the measured supervisor files."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o400)
    try:
        with os.fdopen(fd, "wb", closefd=False) as stream:
            stream.write(payload)
            stream.flush()
        os.fsync(fd)
    finally:
        os.close(fd)
    parent_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)
    if _readback(path) != payload:
        raise RuntimeError("Outer observer audit readback mismatch")


def _complete_run_paths(contract_path, evidence_root):
    """Freeze exact full-run evidence names; do not infer success from worker data."""
    raw = _readback(contract_path)
    plan = json.loads(raw)
    names = plan.get("fullCompletionEvidenceFiles")
    ids = plan.get("slotIdsInOrder")
    if (plan.get("schemaVersion") != 1 or plan.get("kind") != "LM88_STAGE_C_COMPLETE_RUN_EVIDENCE" or
            plan.get("status") != "NON_EXECUTABLE_HOLD" or plan.get("registeredTrials") != 0 or
            not isinstance(ids, list) or len(ids) != 10 or len(set(ids)) != 10 or
            not isinstance(names, list) or len(names) != 68 or len(set(names)) != len(names) or
            any(not isinstance(n, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", n) for n in names)):
        raise ValueError("Invalid fixed Stage C evidence contract")
    return [Path(evidence_root).resolve() / n for n in names], hashlib.sha256(raw).hexdigest()


def observe(command, receipts, audit_path, *, required_evidence=(), evidence_contract=None,
            evidence_root=None, expected_contract_sha256=None, limit_seconds=1200,
            recovery_wait_seconds=0.2):
    """Monitor an inner supervisor as a distinct OS process, without WebKit.

    All mandatory evidence paths must be fixed by the caller before launch. This
    observer does not certify the completeness of any undeclared product artifacts.
    """
    if not command or not 0 < limit_seconds <= 1200 or recovery_wait_seconds < 0:
        raise ValueError("Invalid outer observer arguments")
    receipts = Path(receipts).resolve()
    audit_path = Path(audit_path).resolve()
    evidence = [*(receipts / name for name in REQUIRED), *(Path(p).resolve() for p in required_evidence)]
    if len(set(evidence)) != len(evidence) or audit_path in evidence:
        raise ValueError("Duplicate evidence or audit path in required evidence")
    if audit_path.exists():
        raise FileExistsError(audit_path)
    if (evidence_contract is None) != (evidence_root is None):
        raise ValueError("Evidence contract and root must be provided together")
    full_paths, contract_sha = ([], None)
    if evidence_contract is not None:
        full_paths, contract_sha = _complete_run_paths(evidence_contract, evidence_root)
        if expected_contract_sha256 is not None and contract_sha != expected_contract_sha256:
            raise ValueError("Evidence contract SHA-256 mismatch")
        if len(set([*evidence, *full_paths])) != len(evidence) + len(full_paths):
            raise ValueError("Duplicate paths in fixed evidence contract")

    start_ns = time.monotonic_ns()  # Authoritative clock; setup and subprocess launch count.
    hard_ns = start_ns + round(limit_seconds * 1_000_000_000)
    env = dict(os.environ, STAGE_C_OUTER_MONOTONIC_START_NS=str(start_ns))
    proc = None
    exit_ns = None
    timed_out = False
    errors = []
    hashes = {}
    inner = None
    full_evidence_status = "NOT_CHECKED"
    try:
        proc = subprocess.Popen(command, env=env, start_new_session=True,
                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL)
        try:
            proc.wait(timeout=max(0, (hard_ns - time.monotonic_ns()) / 1e9))
            exit_ns = time.monotonic_ns()  # Observed exit, not an inferred kernel timestamp.
        except subprocess.TimeoutExpired:
            timed_out = True
            errors.append("OUTER_HARD_CUTOFF")
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            except OSError as error:
                errors.append(f"OUTER_KILL_ERROR:{type(error).__name__}")
            try:
                proc.wait(timeout=recovery_wait_seconds)  # Recovery is outside the budget.
            except (subprocess.TimeoutExpired, OSError) as error:
                errors.append(f"OUTER_REAP_ERROR:{type(error).__name__}")
    except OSError as error:
        errors.append(f"OUTER_LAUNCH_ERROR:{type(error).__name__}")

    if not timed_out and exit_ns is not None:
        for path in evidence:
            try:
                content = _readback(path)
                hashes[str(path)] = {"sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}
                if path == receipts / "supervisor.json":
                    inner = json.loads(content)
            except (OSError, ValueError, TypeError) as error:
                errors.append(f"EVIDENCE_ERROR:{path.name}:{type(error).__name__}")
        if not isinstance(inner, dict):
            errors.append("MISSING_SUPERVISOR_RECEIPT")
        else:
            if evidence_contract is not None and inner.get("monotonicStartNs") != start_ns:
                errors.append("OUTER_INNER_CLOCK_MISMATCH")
            if inner.get("workerResultStatus") == "COMPLETE":
                if evidence_contract is None:
                    errors.append("COMPLETE_RUN_WITHOUT_EVIDENCE_CONTRACT")
                else:
                    full_evidence_status = "PASS"
                    for path in full_paths:
                        try:
                            content = _readback(path)
                            hashes[str(path)] = {"sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}
                        except (OSError, ValueError) as error:
                            errors.append(f"FULL_RUN_EVIDENCE_ERROR:{path.name}:{type(error).__name__}")
                            full_evidence_status = "INCOMPLETE"
            else:
                full_evidence_status = "NOT_APPLICABLE_INCOMPLETE_WORKER"
            ns_exit = inner.get("namespaceExitObservedNs")
            if (not isinstance(ns_exit, int) or ns_exit < start_ns or ns_exit > exit_ns or
                    not isinstance(inner.get("workerExit"), int) or inner.get("supervisorError") is not None):
                errors.append("INCOMPLETE_NAMESPACE_OR_REAP")

    final_ns = time.monotonic_ns()  # After supervisor exit AND independent evidence readback.
    verdict = "OVER_LIMIT" if timed_out else _time_verdict(
        start_ns, final_ns, limit_seconds, exit_ns is not None and not errors)
    report = {
        "schemaVersion": 1, "kind": "STAGE_C_OUTER_TERMINAL_OBSERVATION",
        "monotonicStartNs": start_ns, "hardDeadlineNs": hard_ns,
        "supervisorExitObservedNs": exit_ns,
        "terminalCompletionObservedNs": final_ns,
        "totalWallVerdict": verdict,
        "supervisorReturncode": None if proc is None else proc.poll(),
        "innerWorkerResultStatus": inner.get("workerResultStatus") if isinstance(inner, dict) else None,
        "innerWithinHardDeadline": inner.get("withinHardDeadline") if isinstance(inner, dict) else None,
        "requiredEvidence": hashes, "errors": errors,
        "completeRunEvidenceStatus": full_evidence_status,
        "evidenceContractSha256": contract_sha,
        "auditRole": "POST_VERDICT_RECORD_NOT_PRODUCT_PRIMARY_EVIDENCE",
    }
    _save_audit(audit_path, report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipts", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--required-evidence", action="append", default=[], type=Path)
    parser.add_argument("--limit-seconds", type=float, default=1200)
    parser.add_argument("--evidence-contract", type=Path, required=True)
    parser.add_argument("--evidence-root", type=Path, required=True)
    parser.add_argument("--evidence-contract-sha256", required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    result = observe(command, args.receipts, args.audit,
                     required_evidence=args.required_evidence, evidence_contract=args.evidence_contract,
                     evidence_root=args.evidence_root, expected_contract_sha256=args.evidence_contract_sha256,
                     limit_seconds=args.limit_seconds)
    print(json.dumps({"totalWallVerdict": result["totalWallVerdict"],
                      "terminalCompletionObservedNs": result["terminalCompletionObservedNs"]}))
    return 0 if result["totalWallVerdict"] == "WITHIN_LIMIT" else 1


if __name__ == "__main__":
    raise SystemExit(main())
