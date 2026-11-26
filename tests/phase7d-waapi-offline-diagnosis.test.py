"""Synthetic recorded-protocol controls; no real browser or original evidence edits."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('diagnosis', Path(__file__).resolve().parents[1] / 'scripts/phase7d-waapi-offline-diagnosis.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)

def fixture():
    def pause(name):
        return {'name': name, 'pauseInput': {'preflightStart': 0, 'fontsReady': 1, 'preflightDone': 2,
            'started': 3, 'readyAt': 30, 'frames': 0, 'before': {'clock': 30, 'time': 27, 'native': 'running'},
            'immediate': {'clock': 31, 'time': 27, 'native': 'paused'}, 'readyAfterPause': 32},
            'settledPause': {'duration': 220, 'time': 27, 'native': 'paused'}}
    p = {'head': d.HEAD, 'headAfter': d.HEAD, 'tree': d.TREE, 'treeAfter': d.TREE,
         'sourceSHA256': {'synthetic': 'not an authenticated archive'}, 'sourceSHA256After': {'synthetic': 'not an authenticated archive'},
         'sourceUnchanged': True, 'cleanRequirementMet': True, 'trackedChanges': '', 'trackedChangesAfter': '',
         'engines': 'webkit', 'widths': '375,390,765', 'suites': [{'name': n, 'exitCode': 0} for n in d.NAMES], 'status': 'PASS'}
    obs = [{'engine': 'webkit', 'width': w, 'status': 'PASS', 'errors': [], 'measurements': [pause(n) for n in ['Menu Selection Cursor', 'Coin Pickup Arc']]} for w in [375,390,765]]
    return p, obs

def fail_fixture():
    p, obs = fixture(); m = obs[0]['measurements'][0]
    m['pauseInput']['before'].update(time=220, native='finished')
    m['pauseInput']['immediate']['time'] = 220
    m['settledPause']['time'] = 220
    obs[0].update(status='PARTIAL', pathFailures=[{'path': 'Menu Selection Cursor: mid-flight pause', 'observed': copy.deepcopy(m['settledPause'])}])
    p['suites'][0]['exitCode'] = 1; p['status'] = 'FAIL'
    return p, obs

class Controls(unittest.TestCase):
    def reject(self, mutate, reason, failed=False):
        p, obs = fail_fixture() if failed else fixture()
        mutate(p, obs)
        with self.assertRaisesRegex(ValueError, reason): d.analyze_records(p, obs, 'webkit')

    def test_normal(self):
        p, obs = fixture(); self.assertEqual(d.analyze_records(p, obs, 'webkit')['originalOverall'], 'PASS')
    def test_original_failure_retained(self):
        p, obs = fail_fixture(); before = copy.deepcopy((p, obs)); r = d.analyze_records(p, obs, 'webkit')
        self.assertEqual(r['originalOverall'], 'FAIL'); self.assertEqual((p, obs), before)
    def test_recorded_checkpoint_missing(self):
        self.reject(lambda p,o: o[0]['measurements'][0].pop('pauseInput'), 'missing/duplicate pause checkpoint')
    def test_time_missing(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput'].pop('readyAt'), 'missing clock')
    def test_contradictory_transition(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput']['immediate'].update(native='running'), 'contradictory')
    def test_foreign_head(self):
        self.reject(lambda p,o: p.update(head='0'*40), 'foreign HEAD')
    def test_observation_order(self):
        self.reject(lambda p,o: o.reverse(), 'width membership/order')
    def test_clock_order(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput'].update(readyAt=2), 'clock order')
    def test_primary_afterwrite(self):
        self.reject(lambda p,o: o[0].update(status='PASS'), 'rewritten primary status', True)
    def test_hide_failure_with_success(self):
        self.reject(lambda p,o: o[0].update(pathFailures=[]), 'hidden/rewritten', True)
    def test_hide_suite_failure(self):
        self.reject(lambda p,o: p['suites'][0].update(exitCode=0), 'suite hides', True)
    def test_extra_checkpoint(self):
        self.reject(lambda p,o: o[0]['measurements'].append(copy.deepcopy(o[0]['measurements'][0])), 'missing/duplicate')
    def test_immediate_time_missing(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput']['immediate'].pop('time'), 'missing/nonfinite')
    def test_immediate_time_outside_duration(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput']['immediate'].update(time=999999), 'invalid native time')
    def test_nonfinite_clock(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput'].update(readyAt=float('inf')), 'missing clock')
    def test_bool_clock(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput'].update(readyAt=True), 'missing clock')
    def test_negative_frames(self):
        self.reject(lambda p,o: o[0]['measurements'][0]['pauseInput'].update(frames=-1), 'invalid frame count')
    def test_changed_source_claim(self):
        self.reject(lambda p,o: p.update(sourceSHA256After={}), 'source/clean mismatch')

if __name__ == '__main__': unittest.main(verbosity=2)
