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
                   soft_seconds=1170, hard_seconds=1200, network_notice=None):
    """Request cleanup over stdin, then kill namespace PID 1 if needed."""
    if not 0 < soft_seconds < hard_seconds <= 1200 or soft_seconds > 1170:
        raise ValueError("Invalid Stage C deadlines")
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
                handle = _namespace_handle(proc.pid, json.loads(info.read(4096)))
            if elapsed() < soft_seconds - min(0.05, soft_seconds / 10):
                os.write(proc.stdin.fileno(), b"G")

            while True:
                if network_notice is not None and network_fault is None:
                    try:
                        network_fault = json.loads(Path(network_notice).read_bytes())
                    except FileNotFoundError:
                        pass
                    else:
                        detected = int(network_fault["mismatchDetectedAtNs"])
                        if not start <= detected <= time.monotonic_ns():
                            raise RuntimeError("Invalid Stage C network stop timestamp")
                        hard_limit = min(hard_seconds, (detected - start) / 1e9 + 30)
                        hard_dispatch = min(hard_dispatch, hard_limit - 0.1)
                age = elapsed()
                exited = bool(select.select([handle], [], [], 0)[0])
                reached_soft = age >= soft_seconds - min(0.05, soft_seconds / 10)
                if stop_at is None and (network_fault is not None or (reached_soft and not exited)):
                    stop_at = age
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
        finally:
            if handle is not None:
                try:
                    if not select.select([handle], [], [], 0)[0]:
                        try:
                            signal.pidfd_send_signal(handle, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                finally:
                    os.close(handle)
            if proc is not None:
                proc.stdin.close()
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
                os.fsync(stream.fileno())
    result = {
        "softDeadlineSeconds": soft_seconds, "hardDeadlineSeconds": hard_seconds,
        "stopRequestedSeconds": stop_at, "stopSource": stop_source, "hardKillSeconds": kill_at,
        "networkMismatchDetected": network_fault,
        "withinNetworkStopGrace": None if network_fault is None else
            namespace_exit is not None and namespace_exit <= hard_limit,
        "namespaceExitObservedSeconds": namespace_exit, "workerExit": root_exit,
        "withinHardDeadline": namespace_exit is not None and namespace_exit <= hard_seconds,
    }
    with (path / "supervisor.json").open("x", encoding="utf-8") as receipt:
        json.dump(result, receipt, indent=2)
        receipt.write("\n")
        receipt.flush()
        os.fsync(receipt.fileno())
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
        fcntl.ioctl(control, 0x8914, struct.pack("16sh22x", b"lo", flags | 1))
    with socket.socket() as check:
        check.bind(("127.0.0.1", 0))


def _verify_package(package, expected_sha, roots):
    manifest_file = Path(package) / "binding.json"
    contents = manifest_file.read_bytes()
    if not re.fullmatch("[0-9a-f]{64}", expected_sha) or hashlib.sha256(contents).hexdigest() != expected_sha:
        raise RuntimeError("Approved Stage C manifest hash mismatch")
    manifest = json.loads(contents)
    if not manifest.get("requests") or not manifest.get("networkRules"):
        raise RuntimeError("Independently fixed network and delivery plans are required")
    runtime_paths = ("browser-calibration.mjs", "browser-runtime.mjs", "offline-runner.mjs",
                     "process_supervisor.py", "resource-evidence.mjs", "s1-preparation.mjs",
                     "stage-c-worker.mjs", "stage-c-network-adapter.mjs",
                     "stage-c-network-ledger.mjs", "stage-c-network-policy.mjs",
                     "stage-c-operation-gate.mjs")
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
    sys.exit(0 if result["withinHardDeadline"] and result["workerExit"] == 0
             and result["networkMismatchDetected"] is None else 1)


if __name__ == "__main__":
    main()
