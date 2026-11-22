"""Owner-controlled launch contract and private Linux process handoff for Stage C."""
import array
import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import select
import signal
import socket
import stat
import struct
import subprocess
import time

APPROVAL = Path("/etc/loading-museum/stage-c-approval.json")
REGISTRATION = Path("docs/phase7d/stage-c-api-s1-10/registration.json")
EVIDENCE = Path("diagnostic-isolated/c-s1-10/stage-c-required-evidence.json")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def remaining(deadline_ns):
    return max(0, (deadline_ns - time.monotonic_ns()) / 1e9)


def _trusted_approval(path):
    # This trust anchor is installed by the owner/admin outside the worktree.
    # The launcher/worker UID must not be able to replace it or any parent.
    for parent in reversed(path.parents):
        info = parent.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise RuntimeError("Untrusted Stage C approval directory")
    with _open_approval(path) as stream:
        return stream.read(16385)


def _open_approval(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise RuntimeError("Untrusted Stage C approval file")
        return os.fdopen(fd, "rb")
    except BaseException:
        os.close(fd)
        raise


def _digest_fields(record, fields, length):
    for key in fields:
        value = record.get(key)
        if not isinstance(value, str) or not re.fullmatch(f"[a-f0-9]{{{length}}}", value):
            raise RuntimeError("Invalid Stage C approval field " + key)


def _git(repo, spec):
    return subprocess.check_output(
        ["git", "-C", str(repo), "rev-parse", "--verify", spec],
        env={"PATH": "/usr/bin:/bin", "LC_ALL": "C", "GIT_NO_REPLACE_OBJECTS": "1"},
        timeout=5, text=True,
    ).strip()


def checked_registration(repo):
    data = (repo / REGISTRATION).read_bytes()
    reg = json.loads(data)
    if reg["decision"] == "HOLD" or reg["executionAuthorization"] is not True or reg["executable"] is not True:
        raise RuntimeError("Stage C browser execution is on HOLD")
    return data, reg


def load_approval(repo):
    registration, reg = checked_registration(repo)
    body = _trusted_approval(APPROVAL)
    if len(body) > 16384:
        raise RuntimeError("Stage C approval is too large")
    record = json.loads(body)
    if record.get("schemaVersion") != 1 or record.get("executionAuthorized") is not True:
        raise RuntimeError("Stage C owner has not authorized execution")
    if type(record.get("launcherUid")) is not int or os.geteuid() == 0 or record["launcherUid"] != os.geteuid():
        raise RuntimeError("Stage C requires the designated non-root launcher account")
    if not isinstance(record.get("runId"), str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", record["runId"]):
        raise RuntimeError("Invalid Stage C run ID")
    _digest_fields(record, ("runtimeHead", "runtimeTree"), 40)
    _digest_fields(record, ("registrationSha256", "bindingSha256", "evidenceContractSha256"), 64)
    for key in ("repo", "package", "driver", "rootfs", "runs"):
        path = Path(record[key])
        if not path.is_absolute() or path.resolve(strict=True) != path or not path.is_dir():
            raise RuntimeError("Invalid Stage C approved path " + key)
        if key != "runs" and not os.statvfs(path).f_flag & os.ST_RDONLY:
            raise RuntimeError("Stage C approved source must be mounted read-only: " + key)
    if Path(record["repo"]) != repo or (_git(repo, "HEAD"), _git(repo, "HEAD^{tree}")) != (
            record["runtimeHead"], record["runtimeTree"]):
        raise RuntimeError("Stage C approved runtime HEAD/tree mismatch")
    # A status check can miss files marked assume-unchanged; verify tracked bytes below.
    evidence = (repo / EVIDENCE).read_bytes()
    if sha(registration) != record["registrationSha256"] or sha(evidence) != record["evidenceContractSha256"]:
        raise RuntimeError("Stage C registration or evidence contract does not match owner approval")
    plan = json.loads(evidence)
    if plan["slotIdsInOrder"] != [slot["id"] for slot in reg["slots"]]:
        raise RuntimeError("Stage C evidence order does not match approved registration")
    bounds = reg["bounds"]
    if (bounds["beginStopAndCleanupBySeconds"], bounds["absoluteCutoffSeconds"],
        bounds["cleanupGraceSecondsApproved"], bounds["cleanupGraceIsAdditionalTime"],
        bounds["trialRetries"], bounds["slotReplacement"]) != (1170, 1200, 30, False, 0, 0):
        raise RuntimeError("Stage C approved limits changed")
    manifest_bytes = (Path(record["package"]) / "binding.json").read_bytes()
    if sha(manifest_bytes) != record["bindingSha256"]:
        raise RuntimeError("Stage C binding does not match owner approval")
    binding = json.loads(manifest_bytes)
    if (binding.get("executionAuthorized") is not True or
        (binding.get("implementationHead"), binding.get("implementationTree")) !=
            (record["runtimeHead"], record["runtimeTree"])):
        raise RuntimeError("Stage C binding does not authorize the approved runtime")
    inventory = binding["runtimeFiles"]["repo"]
    required = (REGISTRATION, EVIDENCE, Path(__file__).resolve().relative_to(repo),
                Path("diagnostic-isolated/c-s1-10/stage-c-worker-inputs.mjs"))
    if (inventory.get(REGISTRATION.as_posix()) != record["registrationSha256"] or
        inventory.get(EVIDENCE.as_posix()) != record["evidenceContractSha256"] or
        binding["mandatoryEvidence"]["sha256"] != record["evidenceContractSha256"] or
        binding["mandatoryEvidence"]["expectedCompleteRunFileCount"] != 68 or
        binding["mandatoryEvidence"]["completeRunOnly"] is not True or
        not all(p.as_posix() in inventory for p in required)):
        raise RuntimeError("Stage C binding lacks the required launch and evidence files")
    # Check the actual checkout for every bound entry against both the approved
    # manifest and Git objects. The launcher, supervisor and workers use this tree.
    for name, digest in inventory.items():
        file = repo / name
        if file.resolve(strict=True) != file or not file.is_relative_to(repo) or not file.is_file():
            raise RuntimeError("Invalid Stage C runtime path " + name)
        actual = file.read_bytes()
        git_body = subprocess.check_output(
            ["git", "-C", str(repo), "cat-file", "blob", record["runtimeHead"] + ":" + name],
            env={"PATH": "/usr/bin:/bin", "LC_ALL": "C", "GIT_NO_REPLACE_OBJECTS": "1"}, timeout=5,
        )
        if sha(actual) != digest or actual != git_body:
            raise RuntimeError("Stage C approved runtime bytes mismatch " + name)
    return record, sha(body)


def paths(record):
    run = Path(record["runs"]) / record["runId"]
    receipts = run / "supervisor"
    return run, receipts, receipts.with_name(receipts.name + "-evidence") / "evidence"


def create_run(record):
    root = Path(record["runs"])
    info = root.stat()
    if info.st_uid != os.geteuid() or info.st_mode & 0o077:
        raise RuntimeError("Stage C runs directory must be private to the launcher")
    run, _, _ = paths(record)
    run.mkdir(mode=0o700)  # Owner-authorized run ID cannot be replayed.
    return run


def send(channel, body, fds=()):
    payload = json.dumps(body, separators=(",", ":")).encode()
    ancillary = [(socket.SOL_SOCKET, socket.SCM_RIGHTS, array.array("i", fds))] if fds else []
    if channel.sendmsg([payload], ancillary) != len(payload):
        raise RuntimeError("Incomplete Stage C control message")


def receive(channel, fd_count=0):
    fds = array.array("i")
    data, controls, flags, _ = channel.recvmsg(4096, socket.CMSG_SPACE(2 * fds.itemsize), socket.MSG_CMSG_CLOEXEC)
    try:
        for level, kind, raw in controls:
            if (level, kind) == (socket.SOL_SOCKET, socket.SCM_RIGHTS):
                fds.frombytes(raw[: len(raw) - len(raw) % fds.itemsize])
        if not data or flags & (socket.MSG_TRUNC | socket.MSG_CTRUNC) or len(fds) != fd_count:
            raise RuntimeError("Invalid Stage C control message")
        message = json.loads(data)
        if not isinstance(message, dict):
            raise RuntimeError("Invalid Stage C control payload")
        return message, tuple(fds)
    except BaseException:
        for fd in fds:
            os.close(fd)
        raise


def supervisor_channel(fd, repo):
    channel = socket.socket(fileno=fd)
    try:
        pid, uid, _ = struct.unpack("3i", channel.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
        if (channel.getsockopt(socket.SOL_SOCKET, socket.SO_TYPE) != socket.SOCK_SEQPACKET or
            pid != os.getppid() or uid != os.geteuid() or os.getsid(0) != os.getpid()):
            raise RuntimeError("Stage C supervisor needs a private channel from the product launcher")
        argv = Path(f"/proc/{pid}/cmdline").read_bytes().split(b"\0")[:-1]
        launcher = repo / "diagnostic-isolated/c-s1-10/stage_c_outer_observer.py"
        if (len(argv) < 3 or argv[-1] != b"--product" or
            (Path(f"/proc/{pid}/cwd") / os.fsdecode(argv[-2])).resolve(strict=True) != launcher):
            raise RuntimeError("Stage C supervisor parent is not the product launcher")
        channel.settimeout(5)
        message, fds = receive(channel, fd_count=2)
        return channel, message, fds
    except BaseException:
        channel.close()
        raise


def subreaper():
    # The outer process owns the run and adopts orphans on a forced supervisor exit.
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(36, 1, 0, 0, 0):  # PR_SET_CHILD_SUBREAPER
        raise OSError(ctypes.get_errno(), "Could not establish Stage C child reaper")


def ready(fd):
    return bool(select.select([fd], [], [], 0)[0])


def _group_exists(group):
    try:
        os.killpg(group, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def recover(proc, handles, seconds):
    """Request termination then observe exits and adopted-child reap independently."""
    errors = []
    reaped = []
    deadline = time.monotonic_ns() + round(seconds * 1e9)
    for fd in reversed(handles):
        try:
            if not ready(fd):
                signal.pidfd_send_signal(fd, signal.SIGKILL)
        except ProcessLookupError:
            pass
        except OSError as error:
            errors.append(f"OUTER_PIDFD_KILL_ERROR:{type(error).__name__}")
    try:
        if proc.returncode is None:
            os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    except OSError as error:
        errors.append(f"OUTER_KILL_ERROR:{type(error).__name__}")

    while True:
        supervisor_exited = proc.poll() is not None
        if supervisor_exited:
            try:
                while (pid := os.waitpid(-proc.pid, os.WNOHANG)[0]) > 0:
                    reaped.append(pid)
            except ChildProcessError:
                pass
        group_empty = not _group_exists(proc.pid)
        observed = tuple(ready(fd) for fd in handles)
        if supervisor_exited and group_empty and all(observed):
            break
        delay = remaining(deadline)
        if delay == 0:
            break
        time.sleep(min(0.01, delay))
    return {
        "supervisorReaped": supervisor_exited,
        "bwrapExitObserved": observed[0] if observed else None,
        "namespaceExitObserved": observed[1] if observed else None,
        "adoptedChildrenReaped": reaped,
        "processGroupEmpty": group_empty,
        "complete": supervisor_exited and group_empty and observed == (True, True),
        "errors": errors,
    }
