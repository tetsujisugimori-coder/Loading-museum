"""Exercise the PID supervisor with stand-alone processes, without a browser."""

import json
from pathlib import Path
import tempfile
import unittest

from process_supervisor import run_supervised


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


if __name__ == "__main__":
    unittest.main()
