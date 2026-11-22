"""Synthetic-only evidence contract and clock handshake checks."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from stage_c_outer_observer import observe, _complete_run_paths

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

if __name__ == '__main__': unittest.main()
