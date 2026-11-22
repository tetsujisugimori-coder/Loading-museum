"""Exercise the PID supervisor with stand-alone processes, without a browser."""

import errno
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from process_supervisor import run_supervised, _rootfs_inventory, _verify_package, _kill_dispatch_deadline


class ProcessSupervisorTest(unittest.TestCase):
    def worker(self, command, *, bad_notice=None):
        with tempfile.TemporaryDirectory(prefix="stage-c-supervisor-", dir=Path.cwd()) as directory:
            root = Path(directory)
            dest = root / "evidence"
            notice = root / "notice.json"
            if bad_notice is not None:
                notice.write_bytes(bad_notice)
            receipt = run_supervised(
                "/", ["/usr/bin/python3", "-c", command], dest,
                soft_seconds=0.65, hard_seconds=1.1, network_notice=notice,
            )
            self.assertEqual(receipt, json.loads((dest / "supervisor.json").read_bytes()))
            return receipt

    def test_orderly_stop_records_completion_separately_from_request(self):
        result = self.worker(
            "import json,sys; assert sys.stdin.buffer.read(2) == b'GS'; "
            "print(json.dumps(dict(stopRequested=True, stopCompleted=True, cleanup='PASS', persistence='PASS'))); "
            "sys.exit(1)"
        )
        self.assertTrue(result["stopRequested"])
        self.assertTrue(result["stopCompleted"])
        self.assertEqual(result["workerExit"], 1)
        self.assertEqual(result["workerResultStatus"], "INCOMPLETE")
        self.assertIsNone(result["hardKillSeconds"])

    def test_unresponsive_worker_is_killed_without_claiming_completion(self):
        result = self.worker("import time; time.sleep(10)")
        self.assertTrue(result["stopRequested"])
        self.assertFalse(result["stopCompleted"])
        self.assertIsNotNone(result["hardKillSeconds"])
        self.assertTrue(result["withinHardDeadline"])
        self.assertEqual(result["workerResultStatus"], "INCOMPLETE")
        self.assertEqual(result["sigkillAttempts"][0]["outcome"], "RETURNED")
        self.assertEqual(result["sigkillAttempts"][0]["cause"], "HARD_DISPATCH")
        self.assertLessEqual(result["sigkillAttempts"][0]["attemptNs"],
                             result["sigkillAttempts"][0]["returnNs"])
        self.assertIsNotNone(result["pidfdReadyObservedNs"])
        self.assertIsNotNone(result["namespaceExitObservedNs"])
        self.assertIsNone(result["kernelExitActualNs"])

    def test_sigkill_error_does_not_prevent_reaping_or_incomplete_receipt(self):
        # No bwrap or browser: simulate the supervisor's namespace PID 1 with a local process.
        original_popen = subprocess.Popen
        for failure_point in ("HARD_DISPATCH", "FINALIZER"):
            with self.subTest(failure_point=failure_point):
                children = []
                sends = []

                def launch(_command, *, pass_fds, stdin, stdout, stderr, start_new_session):
                    proc = original_popen(
                        [sys.executable, "-c", "import time; time.sleep(5)"],
                        stdin=subprocess.PIPE, stdout=stdout, stderr=stderr,
                        start_new_session=True,
                    )
                    children.append(proc)
                    os.write(pass_fds[0], json.dumps({"child-pid": proc.pid}).encode())
                    return proc

                def injected_sigkill(_pidfd, _signal):
                    sends.append(_signal)
                    if failure_point == "HARD_DISPATCH" or len(sends) == 2:
                        raise PermissionError(errno.EPERM, "synthetic SIGKILL denial")
                    # Deliberately do not send a signal: force the FINALIZER path.

                try:
                    with tempfile.TemporaryDirectory(prefix="stage-c-sigkill-error-") as directory:
                        receipt_path = Path(directory) / "evidence" / "supervisor.json"
                        with (patch("process_supervisor.subprocess.Popen", side_effect=launch),
                              patch("process_supervisor._namespace_handle",
                                    side_effect=lambda pid, metadata: os.pidfd_open(pid)),
                              patch("process_supervisor.signal.pidfd_send_signal",
                                    side_effect=injected_sigkill)):
                            result = run_supervised(
                                "/", [sys.executable, "-c", "pass"], receipt_path.parent,
                                soft_seconds=0.1, hard_seconds=0.35,
                            )
                        self.assertEqual(json.loads(receipt_path.read_bytes()), result)
                        self.assertIn("PermissionError", result["supervisorError"])
                        self.assertEqual(result["workerResultStatus"], "INCOMPLETE")
                        self.assertFalse(result["stopCompleted"])
                        self.assertFalse(result["withinHardDeadline"])
                        attempts = result["sigkillAttempts"]
                        self.assertEqual([row["cause"] for row in attempts],
                                         ["HARD_DISPATCH", "FINALIZER"])
                        self.assertEqual(attempts[-1]["outcome"], "ERROR:PermissionError:1")
                        if failure_point == "HARD_DISPATCH":
                            self.assertEqual(attempts[0]["outcome"], "ERROR:PermissionError:1")
                        else:
                            self.assertEqual(attempts[0]["outcome"], "RETURNED")
                finally:
                    for child in children:
                        if child.poll() is None:
                            child.kill()
                        child.wait(timeout=5)

    def test_bad_stop_notice_records_error_and_incomplete_shutdown(self):
        for notice in (b"{", b"[]", b'{"slotId":"fixture","reason":"TEST","mismatchDetectedAtNs":null}'):
            with self.subTest(notice=notice):
                result = self.worker("import time; time.sleep(10)", bad_notice=notice)
                self.assertEqual(result["stopSource"], "SUPERVISOR_FAILURE")
                self.assertIsNotNone(result["supervisorError"])
                self.assertTrue(result["stopRequested"])
                self.assertFalse(result["stopCompleted"])
                self.assertEqual(result["workerResultStatus"], "INCOMPLETE")

    def test_worker_cannot_claim_completion_after_ignoring_the_stop_command(self):
        result = self.worker(
            "import json,sys; assert sys.stdin.buffer.read(2) == b'GS'; "
            "print(json.dumps(dict(stopRequested=False, stopCompleted=False, cleanup='PASS', "
            "persistence='PASS', records=[dict(state='COMPLETED')]*10)))"
        )
        self.assertTrue(result["stopRequested"])
        self.assertFalse(result["stopCompleted"])
        self.assertEqual(result["workerExit"], 0)
        self.assertEqual(result["workerResultStatus"], "INCOMPLETE")

    def test_zero_exit_without_worker_evidence_is_incomplete(self):
        result = self.worker("pass")
        self.assertEqual(result["workerExit"], 0)
        self.assertEqual(result["workerResultStatus"], "INCOMPLETE")


class KillDispatchTimingTest(unittest.TestCase):
    def test_preserves_contract_cutoff_with_observation_margin(self):
        self.assertEqual(_kill_dispatch_deadline(105, 75), 100)
        self.assertEqual(_kill_dispatch_deadline(1200, 1170), 1195)
        self.assertAlmostEqual(_kill_dispatch_deadline(1.1, 0.65), 0.875)
        self.assertEqual(_kill_dispatch_deadline(56, 26), 51)


class RootfsLockPreflightTest(unittest.TestCase):
    """Synthetic rootfs and manifest, with no browser or bwrap startup."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="stage-c-rootfs-lock-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.rootfs = self.base / "rootfs"
        self.package = self.base / "package"
        self.driver = self.base / "driver"
        self.repo = self.base / "repo"
        for directory in (self.rootfs, self.package, self.driver, self.repo):
            directory.mkdir()
        (self.rootfs / "bin").mkdir()
        (self.rootfs / "bin" / "node").write_bytes(b"fake fixed node")
        (self.rootfs / "node-link").symlink_to("bin/node")
        (self.driver / "entry.js").write_bytes(b"synthetic driver")
        runtime_paths = (
            "browser-calibration.mjs", "browser-runtime.mjs", "offline-runner.mjs",
            "process_supervisor.py", "resource-evidence.mjs", "s1-preparation.mjs",
            "stage-c-worker.mjs", "stage-c-network-adapter.mjs",
            "stage-c-network-ledger.mjs", "stage-c-network-policy.mjs",
            "stage-c-operation-gate.mjs", "NETWORK-CONTRACT-v1.json", "build-resources.mjs",
            "raw-evidence.mjs", "s1-trace-audit.mjs")
        repo_hashes = {}
        for name in runtime_paths:
            relative = "diagnostic-isolated/c-s1-10/" + name
            file = self.repo / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(b"synthetic " + name.encode())
            repo_hashes[relative] = hashlib.sha256(file.read_bytes()).hexdigest()
        inventory, counts = _rootfs_inventory(self.rootfs)
        self.oci, self.config = "a" * 64, "b" * 64
        receipt = {"ociManifestSha256": self.oci, "ociConfigSha256": self.config,
                   "inventorySha256": inventory, "entryCounts": counts,
                   "mount": "PASS", "dependencyClosure": "PASS",
                   "executionAuthorized": False, "registeredTrials": 0}
        image = [{"Id": "sha256:" + self.config, "Os": "linux", "Architecture": "amd64",
                  "RepoDigests": ["mcr.microsoft.com/playwright@sha256:" + self.oci]}]
        (self.package / "rootfs-receipt.json").write_text(json.dumps(receipt))
        (self.package / "image-inspect.json").write_text(json.dumps(image))
        self.binding = {"runtimeFiles": {
            "repo": repo_hashes,
            "rootfs": {"bin/node": hashlib.sha256((self.rootfs / "bin/node").read_bytes()).hexdigest()},
            "driver": {"entry.js": hashlib.sha256((self.driver / "entry.js").read_bytes()).hexdigest()}},
            "rootfsLock": {"schemaVersion": 1, "ociManifestSha256": self.oci,
                "ociConfigSha256": self.config, "inventorySha256": inventory,
                "entryCounts": counts,
                "receiptSha256": hashlib.sha256((self.package / "rootfs-receipt.json").read_bytes()).hexdigest(),
                "imageInspectSha256": hashlib.sha256((self.package / "image-inspect.json").read_bytes()).hexdigest()}}

    def verify(self):
        contents = json.dumps(self.binding).encode()
        (self.package / "binding.json").write_bytes(contents)
        _verify_package(self.package, hashlib.sha256(contents).hexdigest(),
                        {"repo": self.repo, "rootfs": self.rootfs, "driver": self.driver})

    def rejected(self, expected):
        with self.assertRaises((RuntimeError, OSError, KeyError, ValueError)) as caught:
            self.verify()
        self.assertIn(expected, str(caught.exception))

    def test_unmodified_synthetic_rootfs_passes_preflight(self):
        self.verify()

    def test_changed_rootfs_file_is_rejected(self):
        (self.rootfs / "bin/node").write_bytes(b"modified")
        self.rejected("runtime file changed")

    def test_unlisted_rootfs_file_is_rejected(self):
        (self.rootfs / "unexpected").write_text("extra")
        self.rejected("Actual Stage C rootfs differs")

    def test_changed_symlink_is_rejected(self):
        (self.rootfs / "node-link").unlink()
        (self.rootfs / "node-link").symlink_to("missing")
        self.rejected("Actual Stage C rootfs differs")

    def test_missing_provenance_is_rejected(self):
        (self.package / "rootfs-receipt.json").unlink()
        self.rejected("Missing fixed rootfs provenance")

    def test_replaced_provenance_bytes_are_rejected(self):
        (self.package / "image-inspect.json").write_text("{}")
        self.rejected("rootfs provenance hash mismatch")

    def test_oci_digest_mismatch_is_rejected(self):
        self.binding["rootfsLock"]["ociManifestSha256"] = "c" * 64
        self.rejected("Fixed OCI image provenance mismatch")

    def test_missing_digest_lock_is_rejected(self):
        del self.binding["rootfsLock"]
        self.rejected("Missing approved Stage C rootfs lock")

    def test_deleted_rootfs_file_is_rejected(self):
        (self.rootfs / "bin/node").unlink()
        with self.assertRaises((RuntimeError, OSError, KeyError, ValueError)):
            self.verify()


if __name__ == "__main__":
    unittest.main()
