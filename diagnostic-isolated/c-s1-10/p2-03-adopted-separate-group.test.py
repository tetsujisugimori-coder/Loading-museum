"""P2-03 regression: an adopted process in a different process group must be reaped.

Synthetic Linux subprocesses only. No browser, bwrap, product worker, or registered slots.
This test is GREEN only if detached adopted children are also reaped.
"""
import json
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import tempfile
import time
import unittest

from stage_c_launch import recover, subreaper

SPAWNER = r'''
import json, os, pathlib, subprocess, sys, time
record = pathlib.Path(sys.argv[1])
children = []
for independent_group in (False, False, True):
    child = subprocess.Popen(
        [sys.executable, '-c', 'import time; time.sleep(30)'],
        start_new_session=independent_group,
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    children.append(child.pid)
pending_record = record.with_suffix('.tmp')
pending_record.write_text(json.dumps(children))
os.replace(pending_record, record)
time.sleep(0.25)
'''


class SeparateGroupAdoptionTest(unittest.TestCase):
    def test_recovery_must_not_claim_complete_with_unreaped_detached_adopted_child(self):
        if sys.platform != 'linux' or not hasattr(os, 'pidfd_open'):
            self.skipTest('Linux pidfd/subreaper required')
        subreaper()
        scratch = Path.cwd() / 'work'
        scratch.mkdir(mode=0o700, exist_ok=True)
        supervisor = None
        children = []
        handles = []
        with tempfile.TemporaryDirectory(prefix='stage-c-p203-', dir=scratch) as work:
            record = Path(work) / 'children.json'
            try:
                supervisor = subprocess.Popen(
                    [sys.executable, '-c', SPAWNER, str(record)],
                    start_new_session=True,
                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
                deadline = time.monotonic() + 3
                while not record.exists() and time.monotonic() < deadline:
                    time.sleep(0.005)
                self.assertTrue(record.is_file(), 'synthetic supervisor did not report child PIDs')
                children = json.loads(record.read_text())
                self.assertEqual(len(children), 3)
                self.assertNotEqual(os.getpgid(children[2]), supervisor.pid,
                                    'third descendant must use a different process group')
                handles = [os.pidfd_open(pid) for pid in children]
                supervisor.wait(timeout=3)
                # The subreaper, not init, must be the direct parent of each orphan.
                for pid in children:
                    status = (Path('/proc') / str(pid) / 'status').read_text()
                    self.assertIn(f'PPid:\t{os.getpid()}', status)
                for pid in children:
                    os.kill(pid, signal.SIGKILL)
                for fd in handles:
                    self.assertTrue(select.select([fd], [], [], 3)[0],
                                    'synthetic child did not reach an observable exit')
                # First two handles simulate exited bwrap and namespace-init PIDs.
                # The detached child is a zombie in another group and must also be reaped.
                outcome = recover(supervisor, tuple(handles[:2]), 0.25)
                self.assertTrue(set(children[:2]).issubset(outcome['adoptedChildrenReaped']), outcome)
                if children[2] not in outcome['adoptedChildrenReaped']:
                    self.assertFalse(outcome['complete'],
                                     'P2-03: false COMPLETE with an unreaped adopted child')
                self.assertIn(children[2], outcome['adoptedChildrenReaped'],
                              'P2-03: reap all adopted children, not only the supervisor group')
                self.assertTrue(outcome['complete'], outcome)
            finally:
                for pid in children:
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                for pid in children:
                    try:
                        os.waitpid(pid, 0)
                    except ChildProcessError:
                        pass
                for fd in handles:
                    os.close(fd)
                if supervisor is not None:
                    if supervisor.poll() is None:
                        try:
                            os.killpg(supervisor.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                    supervisor.wait(timeout=3)


    def test_recovery_kills_live_detached_adopted_child(self):
        if sys.platform != 'linux' or not hasattr(os, 'pidfd_open'):
            self.skipTest('Linux pidfd/subreaper required')
        subreaper()
        scratch = Path.cwd() / 'work'
        scratch.mkdir(mode=0o700, exist_ok=True)
        supervisor = None
        children = []
        handles = []
        with tempfile.TemporaryDirectory(prefix='stage-c-p203-live-', dir=scratch) as work:
            record = Path(work) / 'children.json'
            try:
                supervisor = subprocess.Popen(
                    [sys.executable, '-c', SPAWNER, str(record)], start_new_session=True,
                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
                deadline = time.monotonic() + 3
                while not record.exists() and time.monotonic() < deadline:
                    time.sleep(0.005)
                self.assertTrue(record.is_file())
                children = json.loads(record.read_text())
                self.assertEqual(len(children), 3)
                handles = [os.pidfd_open(pid) for pid in children[:2]]
                supervisor.wait(timeout=3)
                for pid in children:
                    status = (Path('/proc') / str(pid) / 'status').read_text()
                    self.assertIn(f'PPid:\t{os.getpid()}', status)
                self.assertNotEqual(os.getpgid(children[2]), supervisor.pid)
                self.assertFalse(select.select([handles[0]], [], [], 0)[0])
                outcome = recover(supervisor, tuple(handles), 1.5)
                self.assertEqual(set(outcome['adoptedChildrenReaped']), set(children), outcome)
                self.assertTrue(outcome['complete'], outcome)
                for pid in children:
                    with self.assertRaises(ChildProcessError):
                        os.waitpid(pid, os.WNOHANG)
            finally:
                for pid in children:
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                for pid in children:
                    try:
                        os.waitpid(pid, 0)
                    except ChildProcessError:
                        pass
                for fd in handles:
                    os.close(fd)
                if supervisor is not None:
                    if supervisor.poll() is None:
                        try:
                            os.killpg(supervisor.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                    supervisor.wait(timeout=3)


if __name__ == '__main__':
    unittest.main()
