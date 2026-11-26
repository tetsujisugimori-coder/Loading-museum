"""Short, synthetic-only checks. No bwrap, browser, registered worker or CI."""

import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

from stage_c_outer_observer import _time_verdict, observe

FAKE = '''import json, os, pathlib, sys, time
out = pathlib.Path(sys.argv[1]); out.mkdir()
start = int(os.environ["STAGE_C_OUTER_MONOTONIC_START_NS"])
(out / "worker.stdout").write_bytes(b"synthetic")
(out / "worker.stderr").write_bytes(b"")
(out / "supervisor.json").write_text(json.dumps({
    "namespaceExitObservedNs": time.monotonic_ns(), "workerExit": 0,
    "supervisorError": None, "workerResultStatus": "INCOMPLETE",
    "withinHardDeadline": True}))
time.sleep(float(sys.argv[2]))
'''


class TerminalObserverTests(unittest.TestCase):
    def test_mathematical_boundary_and_fail_closed(self):
        self.assertEqual(_time_verdict(0, 1_200_000_000_000, 1200, True), "WITHIN_LIMIT")
        self.assertEqual(_time_verdict(0, 1_200_000_000_001, 1200, True), "OVER_LIMIT")
        self.assertEqual(_time_verdict(0, 1_199_000_000_000, 1200, False), "UNKNOWN")
        self.assertEqual(_time_verdict(3, 2, 1200, True), "UNKNOWN")

    def test_finished_supervisor_with_negative_product_result_still_meets_time_only(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            outcome = observe([sys.executable, "-c", FAKE, str(receipts), "0"],
                              receipts, audit, limit_seconds=5)
            self.assertEqual(outcome["totalWallVerdict"], "WITHIN_LIMIT")
            self.assertEqual(outcome["innerWorkerResultStatus"], "INCOMPLETE")
            self.assertEqual(outcome, json.loads(audit.read_bytes()))
            self.assertEqual(len(outcome["requiredEvidence"]), 3)
            self.assertLessEqual(outcome["terminalCompletionObservedNs"], outcome["hardDeadlineNs"])

    def test_supervisor_exits_but_evidence_is_missing(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            outcome = observe([sys.executable, "-c", "pass"], receipts, audit, limit_seconds=5)
            self.assertEqual(outcome["totalWallVerdict"], "UNKNOWN")
            self.assertIn("MISSING_SUPERVISOR_RECEIPT", outcome["errors"])

    def test_hung_supervisor_is_killed_at_short_hard_limit(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            outcome = observe([sys.executable, "-c", "import time;time.sleep(10)"],
                              receipts, audit, limit_seconds=0.15)
            self.assertEqual(outcome["totalWallVerdict"], "OVER_LIMIT")
            self.assertIn("OUTER_HARD_CUTOFF", outcome["errors"])
            self.assertIsNone(outcome["supervisorExitObservedNs"])

    def test_late_readback_is_over_limit_even_when_pid_exit_is_within(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            from stage_c_outer_observer import _readback
            def slow_readback(path):
                if Path(path).name == "worker.stderr":
                    time.sleep(30)
                return _readback(path)
            start = time.monotonic()
            with patch("stage_c_outer_observer._readback", side_effect=slow_readback):
                outcome = observe([sys.executable, "-c", FAKE, str(receipts), "0"],
                                  receipts, audit, limit_seconds=0.7)
            self.assertLess(time.monotonic() - start, 3)
            self.assertIsNotNone(outcome["supervisorExitObservedNs"])
            self.assertEqual(outcome["totalWallVerdict"], "OVER_LIMIT")
            self.assertIn("OUTER_EVIDENCE_DEADLINE", outcome["errors"])
            self.assertGreaterEqual(outcome["deadlineExceededObservedNs"], outcome["hardDeadlineNs"])
            self.assertEqual(outcome, json.loads(audit.read_bytes()))

    def test_required_raw_evidence_cannot_be_omitted(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            required = Path(root) / "primary.json"
            outcome = observe([sys.executable, "-c", FAKE, str(receipts), "0"],
                              receipts, audit, required_evidence=[required], limit_seconds=5)
            self.assertEqual(outcome["totalWallVerdict"], "UNKNOWN")
            self.assertTrue(any("primary.json" in err for err in outcome["errors"]))

    def test_extra_synthetic_receipt_cannot_claim_missing_namespace_exit(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            fake = FAKE.replace('"namespaceExitObservedNs": time.monotonic_ns()',
                                '"namespaceExitObservedNs": None')
            outcome = observe([sys.executable, "-c", fake, str(receipts), "0"],
                              receipts, audit, limit_seconds=5)
            self.assertEqual(outcome["totalWallVerdict"], "UNKNOWN")
            self.assertIn("INCOMPLETE_NAMESPACE_OR_REAP", outcome["errors"])

    def test_audit_exclusive_no_overwrite(self):
        with tempfile.TemporaryDirectory() as root:
            receipts, audit = Path(root) / "receipts", Path(root) / "audit.json"
            audit.write_bytes(b"original")
            with self.assertRaises(FileExistsError):
                observe([sys.executable, "-c", FAKE, str(receipts), "0"], receipts, audit)
            self.assertEqual(audit.read_bytes(), b"original")


if __name__ == "__main__":
    unittest.main()
