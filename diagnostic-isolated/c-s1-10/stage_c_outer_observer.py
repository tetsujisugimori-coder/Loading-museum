"""Host-side terminal clock audit for Stage C. Does not start registered trials itself.

The product entry uses owner-controlled approval and private launch channels.
The generic observation CLI supports synthetic and separately scoped checks.
The audit JSON is written after the time verdict. A save failure is incomplete.
"""

import argparse
import hashlib
import json
import os
import re
import secrets
import select
from pathlib import Path
import signal
import socket
import stat
import subprocess
import sys
import time

if sys.flags.isolated:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
from stage_c_launch import EVIDENCE, create_run, load_approval, paths, ready, receive, recover, remaining, send, subreaper


REQUIRED = ("supervisor.json", "worker.stdout", "worker.stderr")


def _readback(path, *, sync=True):
    """Two independent no-follow opens, with a directory sync before readback."""
    path = Path(path)
    if path.parent.resolve(strict=True) != path.parent:
        raise ValueError("Evidence parent is outside its fixed path")
    parent_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        if sync:
            os.fsync(parent_fd)

        def read_once():
            fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent_fd)
            try:
                if not stat.S_ISREG(os.fstat(fd).st_mode):
                    raise ValueError("Evidence is not a regular file")
                if sync:
                    os.fsync(fd)
                with os.fdopen(fd, "rb", closefd=False) as stream:
                    return stream.read()
            finally:
                os.close(fd)

        a, b = read_once(), read_once()
        if a != b:
            raise ValueError("Independent evidence readback mismatch")
        return a
    finally:
        os.close(parent_fd)


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
    observed = _readback(path)
    if observed != payload:
        raise RuntimeError("Outer observer audit readback mismatch")
    return {"auditFileSha256": hashlib.sha256(observed).hexdigest(), "auditFileBytes": len(observed)}


def _complete_run_paths(contract_path, evidence_root):
    """Freeze exact full-run evidence names; do not infer success from worker data."""
    raw = _readback(contract_path, sync=False)
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


def _bounded_io(operation, deadline_ns):
    """A stuck filesystem call cannot hold the process that decides the deadline."""
    receiving, writing = socket.socketpair()
    try:
        pid = os.fork()
        if pid == 0:
            receiving.close()
            try:
                value = {"value": operation()}
            except BaseException as error:
                value = {"error": type(error).__name__}
            try:
                with writing:
                    writing.sendall(json.dumps(value).encode())
            finally:
                os._exit(0)

        writing.close()
        chunks = bytearray()
        try:
            while True:
                left = remaining(deadline_ns)
                if left == 0 or not select.select([receiving], [], [], left)[0]:
                    raise TimeoutError("Stage C evidence I/O expired")
                chunk = receiving.recv(65536)
                if not chunk:
                    break
                chunks.extend(chunk)
                if len(chunks) > 4 * 1024 * 1024:
                    raise ValueError("Stage C evidence response too large")
            payload = json.loads(chunks)
            if "error" in payload:
                raise RuntimeError("Stage C evidence I/O error: " + payload["error"])
            return payload["value"]
        finally:
            if not os.waitpid(pid, os.WNOHANG)[0]:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                # A task in kernel I/O may still be uninterruptible. A late
                # reap never changes the already observed deadline outcome.
                reap_until = time.monotonic_ns() + 20_000_000
                while not os.waitpid(pid, os.WNOHANG)[0] and remaining(reap_until):
                    time.sleep(0.001)
    finally:
        receiving.close()
        writing.close()


def _observed_evidence(receipts, evidence, full_paths, has_contract, start_ns, exit_ns, run_id):
    errors, hashes, inner = [], {}, None
    full_status = "NOT_CHECKED"
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
        return inner, hashes, full_status, errors
    if has_contract and inner.get("monotonicStartNs") != start_ns:
        errors.append("OUTER_INNER_CLOCK_MISMATCH")
    if run_id is not None and inner.get("productRunId") != run_id:
        errors.append("PRODUCT_EVIDENCE_RUN_MISMATCH")
    if inner.get("workerResultStatus") == "COMPLETE":
        if not has_contract:
            errors.append("COMPLETE_RUN_WITHOUT_EVIDENCE_CONTRACT")
        else:
            full_status = "PASS"
            for path in full_paths:
                try:
                    content = _readback(path)
                    hashes[str(path)] = {"sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}
                except (OSError, ValueError) as error:
                    errors.append(f"FULL_RUN_EVIDENCE_ERROR:{path.name}:{type(error).__name__}")
                    full_status = "INCOMPLETE"
    else:
        full_status = "NOT_APPLICABLE_INCOMPLETE_WORKER"
    ns_exit = inner.get("namespaceExitObservedNs")
    if (not isinstance(ns_exit, int) or not start_ns <= ns_exit <= exit_ns or
        not isinstance(inner.get("workerExit"), int) or inner.get("supervisorError") is not None):
        errors.append("INCOMPLETE_NAMESPACE_OR_REAP")
    return inner, hashes, full_status, errors


def observe(command, receipts, audit_path, *, required_evidence=(), evidence_contract=None,
            evidence_root=None, expected_contract_sha256=None, limit_seconds=1200,
            recovery_wait_seconds=0.2, _product=None):
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
    if _product is not None:
        expected_root = receipts.with_name(receipts.name + "-evidence") / "evidence"
        if receipts.exists() or expected_root.parent.exists() or evidence_root != expected_root:
            raise ValueError("Stage C product evidence must use the new run directory")
    full_paths, contract_sha = ([], None)
    if evidence_contract is not None:
        full_paths, contract_sha = _complete_run_paths(evidence_contract, evidence_root)
        if expected_contract_sha256 is not None and contract_sha != expected_contract_sha256:
            raise ValueError("Evidence contract SHA-256 mismatch")
        if len(set([*evidence, *full_paths])) != len(evidence) + len(full_paths):
            raise ValueError("Duplicate paths in fixed evidence contract")

    start_ns = time.monotonic_ns()  # Authoritative clock; setup and subprocess launch count.
    hard_ns = start_ns + round(limit_seconds * 1_000_000_000)
    env = dict(os.environ)
    control, child, run_id, approval_sha = _product or (None, None, None, None)
    if control is None:
        env["STAGE_C_OUTER_MONOTONIC_START_NS"] = str(start_ns)
    else:
        env.pop("STAGE_C_OUTER_MONOTONIC_START_NS", None)
    proc = None
    exit_ns = None
    deadline_exceeded_ns = None
    errors = []
    handles = ()
    worker_socket = inner_socket = None
    recovery = None
    hashes, inner, full_status = {}, None, "NOT_CHECKED"
    try:
        proc = subprocess.Popen(command, env=env, start_new_session=True,
                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL, pass_fds=(child.fileno(),) if child else ())
        if control is not None:
            child.close()
            control.settimeout(remaining(hard_ns))
            ticket = secrets.token_hex(32)
            worker_socket, inner_socket = socket.socketpair()
            send(control, {"startNs": start_ns, "runId": run_id, "approvalSha256": approval_sha, "ticket": ticket},
                 (worker_socket.fileno(), inner_socket.fileno()))
            inner_socket.close()
            arm, handles = receive(control, fd_count=2)
            if (arm.get("state") != "AWAITING_GO" or arm.get("runId") != run_id or
                not re.fullmatch(r"pid:\[\d+\]", arm.get("pidNamespace", "")) or
                arm["pidNamespace"] == os.readlink("/proc/self/ns/pid") or
                any(os.readlink(f"/proc/self/fd/{fd}") != "anon_inode:[pidfd]" for fd in handles)):
                raise RuntimeError("Invalid Stage C process handles")
            send(control, {"state": "MONITORED", "runId": run_id})
            # The outer monitor is the only sender of a production GO. Keep
            # one clock even during the supervisor's package preflight.
            if time.monotonic_ns() < start_ns + 1_170_000_000_000 and not any(ready(fd) for fd in handles):
                worker_socket.settimeout(remaining(hard_ns))
                worker_start = {"runId": run_id, "ticket": ticket, "startNs": str(start_ns),
                                "approvalSha256": approval_sha, "pidNamespace": arm["pidNamespace"],
                                "outerPidNamespace": os.readlink("/proc/self/ns/pid")}
                worker_socket.sendall(json.dumps(worker_start).encode() + b"\n")
        proc.wait(timeout=remaining(hard_ns))
        exit_ns = time.monotonic_ns()
        if control is not None and not all(ready(fd) for fd in handles):
            errors.append("PRODUCT_PROCESS_EXIT_UNOBSERVED")
        inner, hashes, full_status, errors_read = _bounded_io(
            lambda: _observed_evidence(receipts, evidence, full_paths, evidence_contract is not None,
                                       start_ns, exit_ns, run_id), hard_ns)
        errors.extend(errors_read)
    except (subprocess.TimeoutExpired, TimeoutError, BlockingIOError):
        deadline_exceeded_ns = time.monotonic_ns()
        errors.append("OUTER_EVIDENCE_DEADLINE" if exit_ns is not None else "OUTER_HARD_CUTOFF")
    except (OSError, RuntimeError, ValueError) as error:
        errors.append(f"OUTER_OBSERVATION_ERROR:{type(error).__name__}")
    finally:
        if proc is not None and (exit_ns is None or "PRODUCT_PROCESS_EXIT_UNOBSERVED" in errors):
            recovery = recover(proc, handles, recovery_wait_seconds)
            errors.extend(recovery["errors"])
            if not recovery["supervisorReaped"]:
                errors.append("OUTER_REAP_UNCONFIRMED")
        for fd in handles:
            os.close(fd)
        for stream in (worker_socket, inner_socket):
            if stream is not None:
                stream.close()

    final_ns = time.monotonic_ns()  # After supervisor exit AND independent evidence readback.
    verdict = "OVER_LIMIT" if deadline_exceeded_ns is not None else _time_verdict(
        start_ns, final_ns, limit_seconds, exit_ns is not None and not errors)
    report = {
        "schemaVersion": 1, "kind": "STAGE_C_OUTER_TERMINAL_OBSERVATION",
        "monotonicStartNs": start_ns, "hardDeadlineNs": hard_ns,
        "deadlineExceededObservedNs": deadline_exceeded_ns,
        "supervisorExitObservedNs": exit_ns,
        "terminalCompletionObservedNs": final_ns,
        "totalWallVerdict": verdict,
        "supervisorReturncode": None if proc is None else proc.poll(),
        "innerWorkerResultStatus": inner.get("workerResultStatus") if isinstance(inner, dict) else None,
        "innerWithinHardDeadline": inner.get("withinHardDeadline") if isinstance(inner, dict) else None,
        "requiredEvidence": hashes, "errors": errors,
        "completeRunEvidenceStatus": full_status,
        "evidenceContractSha256": contract_sha,
        "auditRole": "POST_VERDICT_RECORD_NOT_PRODUCT_PRIMARY_EVIDENCE",
    }
    if control is None:
        _save_audit(audit_path, report)
    else:
        # The stored body is an observation. The caller receives its storage
        # receipt only after synchronization and independent readback succeed.
        report.update(productRunId=run_id, ownerApprovalSha256=approval_sha, outerRecovery=recovery)
        audit_deadline_ns = time.monotonic_ns() + 2_000_000_000
        try:
            receipt = _bounded_io(lambda: _save_audit(audit_path, report), audit_deadline_ns)
            if time.monotonic_ns() >= audit_deadline_ns:
                raise TimeoutError("Stage C audit receipt arrived after its storage deadline")
        except (OSError, RuntimeError, ValueError) as error:
            report.update(auditStorageStatus="INCOMPLETE", auditStorageError=type(error).__name__)
        else:
            report.update(receipt, auditStorageStatus="PASS")
    return report


def product_main():
    repo = Path(__file__).resolve().parents[2]
    approval, digest = load_approval(repo)
    subreaper()
    run = create_run(approval)
    _, receipts, evidence = paths(approval)
    control, child = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
    try:
        command = [sys.executable, "-EsB", str(Path(__file__).with_name("process_supervisor.py").resolve()),
                   "--product-channel", str(child.fileno())]
        result = observe(command, receipts, run / "terminal.json", evidence_contract=repo / EVIDENCE,
                         evidence_root=evidence, expected_contract_sha256=approval["evidenceContractSha256"],
                         recovery_wait_seconds=1, _product=(control, child, approval["runId"], digest))
    finally:
        control.close()
        child.close()
    print(json.dumps(result, ensure_ascii=False))
    return 0 if (result["totalWallVerdict"] == "WITHIN_LIMIT" and result["supervisorReturncode"] == 0 and
                 result["completeRunEvidenceStatus"] == "PASS" and result["auditStorageStatus"] == "PASS") else 1


def main():
    if sys.argv[1:] == ["--product"]:
        try:
            return product_main()
        except (OSError, RuntimeError, ValueError, TypeError, KeyError, subprocess.SubprocessError) as error:
            print(str(error), file=sys.stderr)
            return 1
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
