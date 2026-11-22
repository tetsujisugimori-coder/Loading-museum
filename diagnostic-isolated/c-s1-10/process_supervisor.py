"""Own the Linux PID namespace for the bounded Stage C worker."""

import json
import fcntl
import hashlib
import os
from pathlib import Path
import select
import re
import signal
import socket
import stat
import struct
import subprocess
import sys
import time


def _namespace_handle(pid, metadata):
    namespace = metadata["pid-namespace"]
    init = metadata["child-pid"]
    handle = os.pidfd_open(init)
    try:
        with open(f"/proc/{init}/status", encoding="utf-8") as status:
            fields = dict(line.rstrip().split(":", 1) for line in status if ":" in line)
        if (
            int(fields["PPid"]) != pid or fields["NSpid"].split()[-1] != "1" or
            os.readlink(f"/proc/{init}/ns/pid") != f"pid:[{namespace}]" or
            os.readlink("/proc/self/ns/pid") == f"pid:[{namespace}]" or
            select.select([handle], [], [], 0)[0]
        ):
            raise RuntimeError("The worker lacks an independently owned PID namespace")
    except BaseException:
        os.close(handle)
        raise
    return handle


def run_supervised(rootfs, command, destination, *, readonly=(), writable=(),
                   soft_seconds=1170, hard_seconds=1200, network_notice=None, ready_check=None):
    """Request cleanup over stdin, then kill namespace PID 1 if needed."""
    if not 0 < soft_seconds < hard_seconds <= 1200 or soft_seconds > 1170:
        raise ValueError("Invalid Stage C deadlines")
    if ready_check is not None and network_notice is not None:
        raise ValueError("READY diagnostics and product network stops are mutually exclusive")
    start = time.monotonic_ns()

    def elapsed():
        return (time.monotonic_ns() - start) / 1_000_000_000

    path = Path(destination)
    path.mkdir(mode=0o700)
    argv = ["/usr/bin/bwrap", "--unshare-user", "--unshare-pid", "--die-with-parent",
            "--ro-bind", str(Path(rootfs).resolve()), "/", "--proc", "/proc", "--dev", "/dev",
            "--tmpfs", "/tmp", "--tmpfs", "/dev/shm", "--dir", "/tmp/runtime",
            "--setenv", "XDG_RUNTIME_DIR", "/tmp/runtime", "--unsetenv", "NODE_EXTRA_CA_CERTS",
            "--setenv", "PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright",
            "--setenv", "STAGE_C_MONOTONIC_START_NS", str(start)]
    for option, pairs in (("--ro-bind", readonly), ("--bind", writable)):
        for source, target in pairs:
            argv.extend([option, str(Path(source).resolve()), target])

    stop_at = None
    network_fault = None
    stop_source = None
    kill_at = None
    root_exit = None
    namespace_exit = None
    supervisor_error = None
    emergency_kill_at = None
    ready_at = None
    ready_sha = None
    ready_error = None
    # Leave time to observe exit before the contractual deadline.
    hard_dispatch = max(soft_seconds, hard_seconds - 0.1)
    hard_limit = hard_seconds
    with (path / "worker.stdout").open("xb") as out, (path / "worker.stderr").open("xb") as err:
        read_end, write_end = os.pipe()
        proc = None
        handle = None
        try:
            proc = subprocess.Popen([*argv, "--info-fd", str(write_end), "--", *command],
                                    pass_fds=(write_end,), start_new_session=True,
                                    stdin=subprocess.PIPE, stdout=out, stderr=err)
            os.close(write_end)
            write_end = None
            with os.fdopen(read_end, "rb", buffering=0) as info:
                read_end = None
                if not select.select([info], [], [], min(5, hard_dispatch))[0]:
                    raise RuntimeError("No PID namespace receipt before startup deadline")
                metadata = json.loads(info.read(4096))
                handle = _namespace_handle(proc.pid, metadata)
            if elapsed() < soft_seconds - min(0.05, soft_seconds / 10):
                os.write(proc.stdin.fileno(), b"G")

            while True:
                if network_notice is not None and network_fault is None:
                    try:
                        notice = json.loads(Path(network_notice).read_bytes())
                    except FileNotFoundError:
                        pass
                    else:
                        if not isinstance(notice, dict) or not isinstance(notice.get("slotId"), str) or not isinstance(notice.get("reason"), str):
                            raise RuntimeError("Invalid Stage C network stop notice")
                        detected = int(notice["mismatchDetectedAtNs"])
                        if not start <= detected <= time.monotonic_ns():
                            raise RuntimeError("Invalid Stage C network stop timestamp")
                        network_fault = notice
                        hard_limit = min(hard_seconds, (detected - start) / 1e9 + 30)
                        hard_dispatch = min(hard_dispatch, hard_limit - 0.1)
                age = elapsed()
                exited = bool(select.select([handle], [], [], 0)[0])
                reached_soft = age >= soft_seconds - min(0.05, soft_seconds / 10)
                if ready_check is not None and stop_at is None and ready_error is None and not reached_soft and not exited:
                    try:
                        digest = ready_check(f"pid:[{metadata['pid-namespace']}]")
                    except (OSError, ValueError) as error:
                        ready_error = f"{type(error).__name__}: {error}"
                    else:
                        age = elapsed()
                        exited = bool(select.select([handle], [], [], 0)[0])
                        reached_soft = age >= soft_seconds - min(0.05, soft_seconds / 10)
                        if digest is not None and not reached_soft and not exited:
                            ready_at, ready_sha = age, digest
                if stop_at is None and (network_fault is not None or (not exited and (reached_soft or ready_at is not None))):
                    stop_at = elapsed() if ready_at is not None else age
                    if ready_check is not None:
                        stop_source = "READY" if ready_at is not None else "READY_TIMEOUT"
                    else:
                        stop_source = "NETWORK_MISMATCH" if network_fault is not None else "TIME_LIMIT"
                    try:
                        os.write(proc.stdin.fileno(), b"S")
                    except BrokenPipeError:
                        pass
                if exited:
                    namespace_exit = age
                    break
                if kill_at is None and age >= hard_dispatch:
                    kill_at = age
                    try:
                        signal.pidfd_send_signal(handle, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                if age >= hard_limit:
                    break
                time.sleep(min(0.005, hard_limit - age))
            root_exit = proc.poll()
        except (OSError, ValueError, TypeError, KeyError, RuntimeError) as error:
            supervisor_error = f"{type(error).__name__}: {error}"
            if proc is not None and stop_at is None:
                stop_at = elapsed()
                stop_source = "SUPERVISOR_FAILURE"
                try:
                    os.write(proc.stdin.fileno(), b"S")
                except OSError:
                    pass
        finally:
            if handle is not None:
                try:
                    if not select.select([handle], [], [], 0)[0]:
                        if kill_at is None:
                            emergency_kill_at = elapsed()
                        try:
                            signal.pidfd_send_signal(handle, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                finally:
                    os.close(handle)
            if proc is not None:
                proc.stdin.close()
                if handle is None and supervisor_error and proc.poll() is None:
                    proc.kill()
                    emergency_kill_at = elapsed()
                try:
                    proc.wait(timeout=max(0, hard_limit - elapsed()))
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.poll()
                root_exit = proc.returncode
            for fd in (read_end, write_end):
                if fd is not None:
                    os.close(fd)
            for stream in (out, err):
                stream.flush()
                try:
                    os.fsync(stream.fileno())
                except OSError as error:
                    supervisor_error = f"{type(error).__name__}: {error}"
    within_hard_deadline = namespace_exit is not None and namespace_exit <= hard_seconds
    worker_result = {}
    if within_hard_deadline and kill_at is None and emergency_kill_at is None and supervisor_error is None:
        try:
            candidate = json.loads((path / "worker.stdout").read_bytes())
            if isinstance(candidate, dict):
                worker_result = candidate
        except (OSError, ValueError):
            pass
    worker_requested = worker_result.get("stopRequested") is True
    worker_finalized = worker_result.get("cleanup") == worker_result.get("persistence") == "PASS"
    worker_records = worker_result.get("records")
    worker_completed = (
        stop_at is None and network_fault is None and root_exit == 0 and
        worker_result.get("stopRequested") is False and worker_finalized and
        isinstance(worker_records, list) and len(worker_records) == 10 and
        all(isinstance(row, dict) and row.get("state") == "COMPLETED" for row in worker_records)
    )
    result = {
        "softDeadlineSeconds": soft_seconds, "hardDeadlineSeconds": hard_seconds,
        "stopRequested": stop_at is not None or worker_requested,
        "stopCompleted": worker_requested and worker_result.get("stopCompleted") is True and worker_finalized and
            namespace_exit is not None and namespace_exit <= hard_limit and
            (ready_check is None or stop_source == "READY"),
        "stopRequestedSeconds": stop_at, "stopSource": stop_source,
        "hardKillSeconds": kill_at if kill_at is not None else emergency_kill_at,
        "supervisorError": supervisor_error,
        "networkMismatchDetected": network_fault,
        "withinNetworkStopGrace": None if network_fault is None else
            namespace_exit is not None and namespace_exit <= hard_limit,
        "namespaceExitObservedSeconds": namespace_exit, "workerExit": root_exit,
        "withinHardDeadline": within_hard_deadline,
        "workerResultStatus": "COMPLETE" if worker_completed else "INCOMPLETE",
    }
    if ready_check is not None:
        result.update(monotonicStartNs=start, readyObservedSeconds=ready_at,
                      readySha256=ready_sha, readyError=ready_error)
    receipt_bytes = (json.dumps(result, indent=2) + "\n").encode("utf-8")
    with (path / "supervisor.json").open("xb") as receipt:
        receipt.write(receipt_bytes)
        receipt.flush()
        os.fsync(receipt.fileno())
    if (path / "supervisor.json").read_bytes() != receipt_bytes:
        raise RuntimeError("Stage C supervisor receipt readback mismatch")
    return result


def _enable_private_loopback(outer_namespace):
    if os.readlink("/proc/self/ns/net") == outer_namespace:
        raise RuntimeError("The worker must have an isolated network")
    interfaces = [line.partition(":")[0].strip()
                  for line in Path("/proc/net/dev").read_text().splitlines()[2:]]
    if interfaces != ["lo"]:
        raise RuntimeError("Unexpected interface in Stage C network")
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as control:
        query = struct.pack("16sh22x", b"lo", 0)
        flags = struct.unpack("16sh22x", fcntl.ioctl(control, 0x8913, query))[1]
        # bwrap initializes lo; verify its state without requiring CAP_NET_ADMIN.
        if not flags & 0x1:
            raise RuntimeError("Stage C loopback interface is down")
    with socket.socket() as check:
        check.bind(("127.0.0.1", 0))



# Rootfs provenance is anchored to the externally approved binding.json SHA-256.
# This preflight is not itself an execution authorization.
def _rootfs_inventory(root):
    """Recompute the CI inventory, including permissions, owners and symlinks."""
    root = Path(root).resolve(strict=True)
    if not root.is_dir():
        raise RuntimeError("Stage C rootfs directory missing")
    digest = hashlib.sha256()
    counts = {"file": 0, "directory": 0, "symlink": 0, "special": 0}
    stack = [(root, "")]
    while stack:
        parent, prefix = stack.pop()
        with os.scandir(parent) as directory:
            entries = sorted(directory, key=lambda entry: entry.name, reverse=True)
        for entry in entries:
            relative = (prefix + "/" + entry.name).lstrip("/")
            info = entry.stat(follow_symlinks=False)
            row = {"path": relative, "mode": stat.S_IMODE(info.st_mode),
                   "uid": info.st_uid, "gid": info.st_gid}
            if stat.S_ISDIR(info.st_mode):
                row["kind"] = "directory"
                stack.append((Path(entry.path), relative))
            elif stat.S_ISLNK(info.st_mode):
                row.update(kind="symlink", target=os.readlink(entry.path))
            elif stat.S_ISREG(info.st_mode):
                file_hash = hashlib.sha256()
                with open(entry.path, "rb") as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        file_hash.update(chunk)
                row.update(kind="file", bytes=info.st_size, sha256=file_hash.hexdigest())
            else:
                row.update(kind="special", type=stat.S_IFMT(info.st_mode))
            counts[row["kind"]] += 1
            digest.update((json.dumps(row, sort_keys=True, separators=(",", ":"),
                                      ensure_ascii=False) + "\n").encode("utf-8"))
    return digest.hexdigest(), counts


def _verify_rootfs_lock(rootfs, package, manifest):
    """Reject unbound OCI provenance or rootfs bytes before launching bwrap."""
    lock = manifest.get("rootfsLock")
    if not isinstance(lock, dict) or lock.get("schemaVersion") != 1:
        raise RuntimeError("Missing approved Stage C rootfs lock")
    required = ("ociManifestSha256", "ociConfigSha256", "inventorySha256",
                "receiptSha256", "imageInspectSha256")
    if any(not isinstance(lock.get(key), str) or
           not re.fullmatch(r"[a-f0-9]{64}", lock[key]) for key in required):
        raise RuntimeError("Incomplete Stage C rootfs digest lock")
    expected_counts = lock.get("entryCounts")
    if (not isinstance(expected_counts, dict) or
        set(expected_counts) != {"file", "directory", "symlink", "special"} or
        any(type(value) is not int or value < 0 for value in expected_counts.values())):
        raise RuntimeError("Invalid Stage C rootfs count lock")
    package_root = Path(package).resolve(strict=True)
    if not package_root.is_dir():
        raise RuntimeError("Stage C package directory missing")

    def read_anchor(name, expected_sha):
        file = package_root / name
        if file.is_symlink() or not file.is_file() or not file.resolve(strict=True).is_relative_to(package_root):
            raise RuntimeError("Missing fixed rootfs provenance: " + name)
        body = file.read_bytes()
        if hashlib.sha256(body).hexdigest() != expected_sha:
            raise RuntimeError("Stage C rootfs provenance hash mismatch: " + name)
        return json.loads(body)

    receipt = read_anchor("rootfs-receipt.json", lock["receiptSha256"])
    inspect = read_anchor("image-inspect.json", lock["imageInspectSha256"])
    if (not isinstance(inspect, list) or len(inspect) != 1 or
        not isinstance(inspect[0], dict) or
        inspect[0].get("Id") != "sha256:" + lock["ociConfigSha256"] or
        inspect[0].get("Os") != "linux" or inspect[0].get("Architecture") != "amd64" or
        not isinstance(inspect[0].get("RepoDigests"), list) or
        "mcr.microsoft.com/playwright@sha256:" + lock["ociManifestSha256"]
            not in inspect[0]["RepoDigests"]):
        raise RuntimeError("Fixed OCI image provenance mismatch")
    if (not isinstance(receipt, dict) or
        any(receipt.get(field) != lock[field] for field in
            ("ociManifestSha256", "ociConfigSha256", "inventorySha256")) or
        receipt.get("entryCounts") != expected_counts or
        receipt.get("mount") != "PASS" or receipt.get("dependencyClosure") != "PASS" or
        receipt.get("executionAuthorized") is not False or
        receipt.get("registeredTrials") != 0):
        raise RuntimeError("Fixed OCI rootfs receipt mismatch")
    actual_hash, actual_counts = _rootfs_inventory(rootfs)
    if actual_hash != lock["inventorySha256"] or actual_counts != expected_counts:
        raise RuntimeError("Actual Stage C rootfs differs from approved inventory")
    return {"rootfsInventorySha256": actual_hash, "entryCounts": actual_counts,
            "ociManifestSha256": lock["ociManifestSha256"]}


def _verify_package(package, expected_sha, roots):
    manifest_file = Path(package) / "binding.json"
    contents = manifest_file.read_bytes()
    if not re.fullmatch("[0-9a-f]{64}", expected_sha) or hashlib.sha256(contents).hexdigest() != expected_sha:
        raise RuntimeError("Approved Stage C manifest hash mismatch")
    manifest = json.loads(contents)
    runtime_paths = ("browser-calibration.mjs", "browser-runtime.mjs", "offline-runner.mjs",
                     "process_supervisor.py", "resource-evidence.mjs", "s1-preparation.mjs",
                     "stage-c-worker.mjs", "stage-c-network-adapter.mjs",
                     "stage-c-network-ledger.mjs", "stage-c-network-policy.mjs",
                     "stage-c-operation-gate.mjs", "NETWORK-CONTRACT-v1.json", "build-resources.mjs",
                     "raw-evidence.mjs", "s1-trace-audit.mjs")
    if any(f"diagnostic-isolated/c-s1-10/{name}" not in manifest["runtimeFiles"]["repo"] for name in runtime_paths):
        raise RuntimeError("Stage C network integration needs a newly bound runtime inventory")
    for label, root in roots.items():
        base = Path(root).resolve()
        if not manifest["runtimeFiles"][label]:
            raise RuntimeError("Missing Stage C runtime inventory")
        for path, sha in manifest["runtimeFiles"][label].items():
            file = (base / path).resolve(strict=True)
            if not file.is_relative_to(base) or not file.is_file():
                raise RuntimeError("Stage C runtime file escaped its fixed root")
            with file.open("rb") as stream:
                if hashlib.file_digest(stream, "sha256").hexdigest() != sha:
                    raise RuntimeError(f"Stage C runtime file changed: {label}/{path}")
    _verify_rootfs_lock(roots["rootfs"], package, manifest)


def main():
    repo = Path(__file__).resolve().parents[2]
    registration = json.loads((repo / "docs/phase7d/stage-c-api-s1-10/registration.json").read_bytes())
    if (registration["decision"] == "HOLD" or registration["executionAuthorization"] is not True or
            registration["executable"] is not True):
        sys.exit("Stage C browser execution is on HOLD")

    args = sys.argv[1:]
    if len(args) == 5:
        os.execv("/usr/bin/unshare", ["/usr/bin/unshare", "--user", "--map-root-user", "--net", "--",
                 sys.executable, "-IB", __file__, *args, os.readlink("/proc/self/ns/net")])
    if len(args) != 6:
        sys.exit("Expected rootfs, Playwright driver directory, package directory, approved manifest SHA-256 and receipt directory")
    rootfs, driver, package, expected_sha, destination, outer_namespace = args
    # Use the same resolved directory for both the preflight and bwrap mount.
    rootfs = str(Path(rootfs).resolve(strict=True))
    _enable_private_loopback(outer_namespace)
    _verify_package(package, expected_sha, {"rootfs": rootfs, "driver": driver, "repo": repo})
    raw = Path(destination).with_name(Path(destination).name + "-evidence")
    raw.mkdir(mode=0o700)
    result = run_supervised(
        rootfs, ["/usr/bin/node", "/mnt/diagnostic-isolated/c-s1-10/stage-c-worker.mjs",
                 "/media/binding.json", expected_sha, "/media/outputs", "/srv/entry.js", "/var/tmp/evidence"],
        destination, readonly=[(repo, "/mnt"), (driver, "/srv"), (package, "/media")],
        writable=[(raw, "/var/tmp")],
        soft_seconds=registration["bounds"]["beginStopAndCleanupBySeconds"],
        hard_seconds=registration["bounds"]["absoluteCutoffSeconds"],
        network_notice=raw / "evidence" / "network-stop.notice.json",
    )
    sys.exit(0 if result["workerResultStatus"] == "COMPLETE" and
             not result["stopRequested"] and result["networkMismatchDetected"] is None else 1)


if __name__ == "__main__":
    main()
