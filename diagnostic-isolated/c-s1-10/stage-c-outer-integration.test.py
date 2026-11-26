"""Synthetic-only evidence contract and clock handshake checks."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from stage_c_launch import create_run, paths, sha, subreaper, load_approval, REGISTRATION, EVIDENCE
from stage_c_outer_observer import observe, _complete_run_paths, _readback

FAKE = '''import json, os, pathlib, sys, time
r = pathlib.Path(sys.argv[1]); r.mkdir()
s = int(os.environ["STAGE_C_OUTER_MONOTONIC_START_NS"])
(r/"worker.stdout").write_bytes(b"synthetic")
(r/"worker.stderr").write_bytes(b"")
(r/"supervisor.json").write_text(json.dumps({
  "monotonicStartNs": s + int(sys.argv[2]),
  "namespaceExitObservedNs": time.monotonic_ns(),
  "workerExit": 0, "supervisorError": None,
  "workerResultStatus": sys.argv[3], "withinHardDeadline": True,
}))
'''

FAKE_PRODUCT = r"""
import json, os, pathlib, socket, subprocess, sys, time
sys.path.insert(0, sys.argv[2])
from stage_c_launch import receive, send
control = socket.socket(fileno=int(sys.argv[1]))
receipt = pathlib.Path(sys.argv[3])
evidence = pathlib.Path(sys.argv[4])
mode = sys.argv[5]
claim, fds = receive(control, fd_count=2)
owner, endpoint = (socket.socket(fileno=fd) for fd in fds)
children = [subprocess.Popen([sys.executable, "-c", "import time;time.sleep(30)"]) for _ in range(2)]
handles = [os.pidfd_open(child.pid) for child in children]
namespace = "pid:[1]"
send(control, {"state": "AWAITING_GO", "runId": claim["runId"], "pidNamespace": namespace}, handles)
ack, _ = receive(control)
assert ack == {"state": "MONITORED", "runId": claim["runId"]}
start = json.loads(endpoint.makefile("rb").readline())
assert all(start[k] == claim[k] for k in ("runId", "ticket", "approvalSha256"))
assert start["startNs"] == str(claim["startNs"]) and start["pidNamespace"] == namespace
if mode == "timeout":
    time.sleep(30)
for child in children:
    child.kill()
    child.wait()
receipt.mkdir()
(receipt / "worker.stdout").write_text("dummy")
(receipt / "worker.stderr").write_bytes(b"")
(receipt / "supervisor.json").write_text(json.dumps({
    "namespaceExitObservedNs": time.monotonic_ns(), "monotonicStartNs": claim["startNs"],
    "workerExit": 0, "supervisorError": None, "workerResultStatus": "COMPLETE",
    "productRunId": claim["runId"] if mode == "normal" else "other",
}))
evidence.mkdir(parents=True)
contract = json.loads((pathlib.Path(sys.argv[2]) / "stage-c-required-evidence.json").read_bytes())
for name in contract["fullCompletionEvidenceFiles"]:
    (evidence / name).write_text("current fixture")
"""

CONTRACT = Path(__file__).with_name('stage-c-required-evidence.json')

class IntegrationTests(unittest.TestCase):
    def paths(self, d):
        root=Path(d)/'product-evidence'
        root.mkdir()
        files,sha=_complete_run_paths(CONTRACT,root)
        self.assertEqual(len(files),68)
        self.assertEqual(len(sha),64)
        for p in files:
            p.write_bytes(b'fixed fixture')
        return root, files

    def test_complete_run_all_68_full_evidence_paths(self):
        with tempfile.TemporaryDirectory() as d:
            root, files=self.paths(d)
            r,a=Path(d)/'supervisor',Path(d)/'audit.json'
            result=observe([sys.executable,'-c',FAKE,str(r),'0','COMPLETE'],r,a,
                           evidence_contract=CONTRACT,evidence_root=root,limit_seconds=5)
            self.assertEqual(result['totalWallVerdict'],'WITHIN_LIMIT')
            self.assertEqual(result['completeRunEvidenceStatus'],'PASS')
            self.assertEqual(len(result['requiredEvidence']),71)

    def test_complete_run_missing_file_is_not_time_success(self):
        with tempfile.TemporaryDirectory() as d:
            root, files=self.paths(d)
            files[-1].unlink()
            r,a=Path(d)/'supervisor',Path(d)/'audit.json'
            result=observe([sys.executable,'-c',FAKE,str(r),'0','COMPLETE'],r,a,
                           evidence_contract=CONTRACT,evidence_root=root,limit_seconds=5)
            self.assertEqual(result['totalWallVerdict'],'UNKNOWN')
            self.assertEqual(result['completeRunEvidenceStatus'],'INCOMPLETE')

    def test_clock_mismatch_refuses_complete(self):
        with tempfile.TemporaryDirectory() as d:
            root, files=self.paths(d)
            r,a=Path(d)/'supervisor',Path(d)/'audit.json'
            result=observe([sys.executable,'-c',FAKE,str(r),'1','COMPLETE'],r,a,
                           evidence_contract=CONTRACT,evidence_root=root,limit_seconds=5)
            self.assertEqual(result['totalWallVerdict'],'UNKNOWN')
            self.assertIn('OUTER_INNER_CLOCK_MISMATCH',result['errors'])

    def test_incomplete_worker_keeps_time_only_with_explicit_no_full_claim(self):
        with tempfile.TemporaryDirectory() as d:
            root, files=self.paths(d)
            files[-1].unlink()
            r,a=Path(d)/'supervisor',Path(d)/'audit.json'
            result=observe([sys.executable,'-c',FAKE,str(r),'0','INCOMPLETE'],r,a,
                           evidence_contract=CONTRACT,evidence_root=root,limit_seconds=5)
            self.assertEqual(result['totalWallVerdict'],'WITHIN_LIMIT')
            self.assertEqual(result['completeRunEvidenceStatus'],'NOT_APPLICABLE_INCOMPLETE_WORKER')

    def test_manifest_hash_mismatch_rejected_before_launch(self):
        with tempfile.TemporaryDirectory() as d:
            r,a=Path(d)/'supervisor',Path(d)/'audit.json'
            with self.assertRaisesRegex(ValueError,'SHA-256 mismatch'):
                observe([sys.executable,'-c','raise Exception("launched")'],r,a,
                        evidence_contract=CONTRACT,evidence_root=Path(d),
                        expected_contract_sha256='0'*64,limit_seconds=5)
            self.assertFalse(r.exists())

    def test_reject_path_escape_before_launch(self):
        with tempfile.TemporaryDirectory() as d:
            data=json.loads(CONTRACT.read_bytes());data['fullCompletionEvidenceFiles'][0]='../escape'
            bad=Path(d)/'contract.json';bad.write_text(json.dumps(data))
            r,a=Path(d)/'supervisor',Path(d)/'audit.json'
            with self.assertRaisesRegex(ValueError,'Invalid fixed'):
                observe([sys.executable,'-c','raise Exception("launched")'],r,a,
                        evidence_contract=bad,evidence_root=Path(d),limit_seconds=5)
            self.assertFalse(r.exists())

class ProductLaunchTests(unittest.TestCase):
    def supervise_fixture(self, root, mode, seconds):
        approval = {"runs": str(root), "runId": "fixture"}
        run = create_run(approval)
        _, receipts, evidence = paths(approval)
        control, child = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        with control, child:
            command = [sys.executable, "-B", "-c", FAKE_PRODUCT, str(child.fileno()),
                       str(CONTRACT.parent.resolve()), str(receipts), str(evidence), mode]
            return observe(command, receipts, run / "audit.json", evidence_contract=CONTRACT, evidence_root=evidence,
                           expected_contract_sha256=sha(CONTRACT.read_bytes()), limit_seconds=seconds,
                           recovery_wait_seconds=1, _product=(control, child, "fixture", "0" * 64))

    def test_started_run_uses_current_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            outcome = self.supervise_fixture(Path(d), "normal", 4)
            self.assertEqual(outcome["supervisorReturncode"], 0)
            self.assertEqual(outcome["productRunId"], "fixture")
            self.assertEqual(outcome["totalWallVerdict"], "WITHIN_LIMIT", outcome)
            self.assertEqual(outcome["auditStorageStatus"], "PASS")
            self.assertEqual(outcome["completeRunEvidenceStatus"], "PASS")
            self.assertEqual(len(outcome["requiredEvidence"]), 71)
            data = (Path(d) / "fixture" / "audit.json").read_bytes()
            body = json.loads(data)
            for key in ("auditStorageStatus", "auditFileSha256", "auditFileBytes"):
                self.assertNotIn(key, body)
            self.assertEqual(outcome["auditFileSha256"], sha(data))
            self.assertEqual(outcome["auditFileBytes"], len(data))

    def test_terminal_audit_readback_failures_do_not_create_storage_receipt(self):
        for fault, expected in (("timeout", "TimeoutError"), ("mismatch", "RuntimeError")):
            with self.subTest(fault=fault), tempfile.TemporaryDirectory() as d:
                def faulted_readback(path, **kwargs):
                    if Path(path).name == "audit.json":
                        if fault == "timeout":
                            time.sleep(15)
                        else:
                            return b"mismatched terminal bytes"
                    return _readback(path, **kwargs)

                with patch("stage_c_outer_observer._readback", side_effect=faulted_readback):
                    outcome = self.supervise_fixture(Path(d), "normal", 4)
                body = json.loads((Path(d) / "fixture" / "audit.json").read_bytes())
                self.assertEqual(body["totalWallVerdict"], "WITHIN_LIMIT")
                self.assertEqual(body["completeRunEvidenceStatus"], "PASS")
                self.assertEqual(len(body["requiredEvidence"]), 71)
                self.assertEqual(outcome["auditStorageStatus"], "INCOMPLETE")
                self.assertEqual(outcome["auditStorageError"], expected)
                for key in ("auditStorageStatus", "auditFileSha256", "auditFileBytes"):
                    self.assertNotIn(key, body)
                self.assertNotIn("auditFileSha256", outcome)
                self.assertNotIn("auditFileBytes", outcome)

    def test_other_run_receipt_cannot_claim_time_success(self):
        with tempfile.TemporaryDirectory() as d:
            outcome = self.supervise_fixture(Path(d), "wrong", 4)
            self.assertEqual(outcome["totalWallVerdict"], "UNKNOWN", outcome)
            self.assertIn("PRODUCT_EVIDENCE_RUN_MISMATCH", outcome["errors"])

    def test_outer_deadline_kills_and_reaps_adopted_tree(self):
        subreaper()
        with tempfile.TemporaryDirectory() as d:
            outcome = self.supervise_fixture(Path(d), "timeout", 0.8)
            self.assertEqual(outcome["totalWallVerdict"], "OVER_LIMIT", outcome)
            self.assertIn("OUTER_HARD_CUTOFF", outcome["errors"])
            recovery = outcome["outerRecovery"]
            self.assertTrue(recovery["complete"], recovery)
            self.assertEqual(len(recovery["adoptedChildrenReaped"]), 2)
            self.assertTrue(recovery["bwrapExitObserved"])
            self.assertTrue(recovery["namespaceExitObserved"])

    def test_product_evidence_cannot_point_to_old_run(self):
        with tempfile.TemporaryDirectory() as d:
            run = Path(d)
            control, child = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
            with control, child, patch("stage_c_outer_observer.subprocess.Popen") as launch:
                with self.assertRaisesRegex(ValueError, "product evidence must use the new run directory"):
                    observe([sys.executable], run / "supervisor", run / "audit.json",
                            evidence_contract=CONTRACT, evidence_root=run / "old",
                            _product=(control, child, "fixture", "0" * 64))
                launch.assert_not_called()

    def test_replays_cannot_take_existing_run_directory(self):
        with tempfile.TemporaryDirectory() as d:
            approval = {"runs": d, "runId": "one"}
            create_run(approval)
            with self.assertRaises(FileExistsError):
                create_run(approval)

    def test_hold_is_checked_before_external_approval(self):
        repo = CONTRACT.resolve().parents[2]
        with patch("stage_c_launch._trusted_approval", side_effect=AssertionError("read after HOLD")):
            with self.assertRaisesRegex(RuntimeError, "execution is on HOLD"):
                load_approval(repo)

    def test_owner_pins_reject_changed_registration_evidence_and_binding(self):
        with tempfile.TemporaryDirectory() as d:
            repo = Path(d).resolve()
            stage = repo / EVIDENCE.parent
            stage.mkdir(parents=True)
            (repo / REGISTRATION.parent).mkdir(parents=True)
            (repo / REGISTRATION).write_text(json.dumps({
                "decision": "APPROVED", "executionAuthorization": True, "executable": True,
                "slots": [{"id": "fixture"}], "bounds": {
                    "beginStopAndCleanupBySeconds": 1170, "absoluteCutoffSeconds": 1200,
                    "cleanupGraceSecondsApproved": 30, "cleanupGraceIsAdditionalTime": False,
                    "trialRetries": 0, "slotReplacement": 0,
                },
            }))
            (repo / EVIDENCE).write_text('{"slotIdsInOrder":["fixture"]}')
            helper = stage / "stage_c_launch.py"
            worker_inputs = stage / "stage-c-worker-inputs.mjs"
            helper.write_text("fixture launcher")
            worker_inputs.write_text("fixture worker inputs")
            source = {file.relative_to(repo).as_posix(): sha(file.read_bytes())
                      for file in (helper, worker_inputs, repo / REGISTRATION, repo / EVIDENCE)}

            def git(*args):
                return subprocess.check_output(["git", "-C", str(repo), *args], stderr=subprocess.PIPE, text=True).strip()

            git("init", "-q")
            git("add", ".")
            git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture")
            head, tree = git("rev-parse", "HEAD"), git("rev-parse", "HEAD^{tree}")
            registration_sha, evidence_sha = source[REGISTRATION.as_posix()], source[EVIDENCE.as_posix()]
            binding = {
                "executionAuthorized": True, "implementationHead": head, "implementationTree": tree,
                "mandatoryEvidence": {"sha256": evidence_sha, "expectedCompleteRunFileCount": 68, "completeRunOnly": True},
                "runtimeFiles": {"repo": source},
            }
            (repo / "binding.json").write_text(json.dumps(binding))
            approval = {
                **dict.fromkeys(("repo", "package", "rootfs", "driver", "runs"), str(repo)),
                "schemaVersion": 1, "executionAuthorized": True, "launcherUid": 123,
                "runId": "fixture", "runtimeHead": head, "runtimeTree": tree,
                "registrationSha256": registration_sha, "evidenceContractSha256": evidence_sha,
                "bindingSha256": sha((repo / "binding.json").read_bytes()),
            }
            class ReadOnly:
                f_flag = os.ST_RDONLY
            with patch("stage_c_launch.os.geteuid", return_value=123), \
                 patch("stage_c_launch.os.statvfs", return_value=ReadOnly()), \
                 patch("stage_c_launch.__file__", str(helper)):
                for pin, message in (
                    ("runtimeTree", "HEAD/tree"), ("registrationSha256", "registration or evidence"),
                    ("evidenceContractSha256", "registration or evidence"), ("bindingSha256", "binding does not match"),
                ):
                    with self.subTest(pin=pin):
                        bad = {**approval, pin: "0" * len(approval[pin])}
                        with patch("stage_c_launch._trusted_approval", return_value=json.dumps(bad).encode()):
                            with self.assertRaisesRegex(RuntimeError, message):
                                load_approval(repo)
                approved_bytes = json.dumps(approval).encode()
                with patch("stage_c_launch._trusted_approval", return_value=approved_bytes):
                    self.assertEqual(load_approval(repo), (approval, sha(approved_bytes)))
                    worker_inputs.write_text("dirty fixture worker inputs")
                    with self.assertRaisesRegex(RuntimeError, "approved runtime bytes mismatch"):
                        load_approval(repo)


if __name__ == '__main__': unittest.main()
