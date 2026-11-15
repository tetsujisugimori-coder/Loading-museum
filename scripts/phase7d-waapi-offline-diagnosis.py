"""Offline Stage 2A archive diagnosis. Never imports Playwright or changes evidence."""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import stat
import subprocess
import zipfile

HEAD = '179234d4351a988afcc7631795c7e162c8eb7882'
TREE = '2cf11528672af37db548fed2a46be3dcb8ccfae4'
NAMES = ['observation', 'style', 'layout', 'n2', 'stage1']

def require(ok, reason):
    if not ok:
        raise ValueError(reason)

def finite(value):
    return type(value) in [int, float] and math.isfinite(value)

def pause_diagnosis(m):
    require(all(k in m for k in ['name', 'pauseInput', 'settledPause']), 'missing recorded pause checkpoint')
    p, a = m['pauseInput'], m['settledPause']
    clocks = ['preflightStart', 'fontsReady', 'preflightDone', 'started', 'readyAt']
    require(all(finite(p.get(k)) for k in clocks), 'missing clock')
    require(all(p[x] <= p[y] for x, y in zip(clocks, clocks[1:])), 'clock order')
    require(all(k in p for k in ['before', 'immediate', 'readyAfterPause', 'frames']), 'missing pause transition')
    before, immediate = p['before'], p['immediate']
    require(type(p['frames']) is int and p['frames'] >= 0, 'invalid frame count')
    require(all(finite(v.get(k)) for v, k in [(before, 'clock'), (immediate, 'clock'), (p, 'readyAfterPause'), (before, 'time'), (immediate, 'time'), (a, 'time'), (a, 'duration')]), 'missing/nonfinite pause time')
    require(p['readyAt'] <= before['clock'] <= immediate['clock'] <= p['readyAfterPause'], 'pause clock order')
    duration = a['duration']
    require(duration > 0 and 0 <= before['time'] <= duration and 0 <= immediate['time'] <= duration and 0 <= a['time'] <= duration, 'invalid native time')
    require(before['native'] in ['running', 'finished'] and immediate['native'] == 'paused' and a['native'] == 'paused', 'contradictory pause transition')
    require(before['native'] != 'finished' or before['time'] == duration, 'finished before endpoint')
    reached = (before['native'] == 'running' and 0 < before['time'] < duration
               and 0 < a['time'] < duration and abs(before['time'] - a['time']) < .1)
    return {'name': m['name'], 'livePauseReached': reached,
            'clickToReadyContinuationMs': p['readyAt'] - p['started'],
            'before': copy.deepcopy(before), 'immediate': copy.deepcopy(immediate),
            'settled': copy.deepcopy(a), 'readyAfterPause': p['readyAfterPause'],
            'limits': 'readyAt is timestamp after await continuation, not promise resolve timestamp; no finish/cancel event timeline'}

def analyze_records(provenance, observations, expected_engine):
    p = provenance
    require(p['head'] == p['headAfter'] == HEAD and p['tree'] == p['treeAfter'] == TREE, 'foreign HEAD/tree')
    require(p['sourceSHA256'] == p['sourceSHA256After'] and p['sourceUnchanged'] and
            p['cleanRequirementMet'] and not p['trackedChanges'] and not p['trackedChangesAfter'], 'source/clean mismatch')
    require(p['engines'] == expected_engine and p['widths'] == '375,390,765', 'execution context mismatch')
    require([s['name'] for s in p['suites']] == NAMES, 'suite membership/order')
    require([x['width'] for x in observations] == [375, 390, 765], 'width membership/order')
    rows = []
    for x in observations:
        require(x['engine'] == expected_engine, 'foreign engine')
        require(x['status'] in ['PASS', 'PARTIAL'], 'unresolved observation error')
        require(not x['errors'] and not x.get('failure'), 'unexpected observation error')
        ms = [m for m in x['measurements'] if 'pauseInput' in m]
        require([m['name'] for m in ms] == ['Menu Selection Cursor', 'Coin Pickup Arc'], 'missing/duplicate pause checkpoint')
        pauses = [pause_diagnosis(m) for m in ms]
        failures = [v['name'] + ': mid-flight pause' for v in pauses if not v['livePauseReached']]
        require([v['path'] for v in x.get('pathFailures', [])] == failures, 'hidden/rewritten primary path failure')
        for failure in x.get('pathFailures', []):
            actual = next(m['settledPause'] for m in ms if failure['path'] == m['name'] + ': mid-flight pause')
            require(failure['observed'] == actual, 'primary observed bytes mismatch')
        require(x['status'] == ('PARTIAL' if failures else 'PASS'), 'rewritten primary status')
        rows.append({'width': x['width'], 'originalStatus': x['status'], 'pause': pauses,
                     'primaryPathFailures': copy.deepcopy(x.get('pathFailures', []))})
    observation_exit = 0 if all(x['status'] == 'PASS' for x in observations) else 1
    require(p['suites'][0]['exitCode'] == observation_exit, 'suite hides primary failure')
    require(p['status'] == ('PASS' if all(s['exitCode'] == 0 for s in p['suites']) else 'FAIL'), 'overall hides suite failure')
    return {'evidenceConsistency': 'PASS', 'originalOverall': p['status'],
            'suites': {s['name']: 'PASS' if s['exitCode'] == 0 else 'FAIL' for s in p['suites']},
            'observations': rows, 'cause': 'UNKNOWN', 'productAcceptance': 'NOT_ESTABLISHED',
            'limits': ['No browser protocol trace in this archive', 'No native finish/cancel event timestamps',
                       'No animation creation timestamp or React commit probe', 'No virtual-clock API in the fixed observation script',
                       'Source/build bodies not archived: hash correspondence does not prove executed bytes',
                       'Measurement neutrality and product-versus-harness causality UNKNOWN']}

def read_archive(path, official):
    b = path.read_bytes()
    require(len(b) == official['size_in_bytes'] and 'sha256:' + hashlib.sha256(b).hexdigest() == official['digest'], 'official ZIP identity')
    require(official['workflow_run']['id'] == 43708599164 and official['workflow_run']['head_sha'] == HEAD, 'official run identity')
    with zipfile.ZipFile(path) as z:
        require(z.testzip() is None, 'ZIP CRC')
        require(len(z.namelist()) == len(set(z.namelist())), 'duplicate ZIP entry')
        for i in z.infolist():
            q = PurePosixPath(i.filename)
            require(not q.is_absolute() and '..' not in q.parts and ':' not in i.filename and '\\' not in i.filename and not stat.S_ISLNK(i.external_attr >> 16), 'unsafe ZIP path')
        data = {n: z.read(n) for n in z.namelist()}
    p = json.loads(data['provenance.json'])
    engine = p['engines']
    require(official['name'] == f'stage2a-{engine}-{HEAD}', 'official engine identity')
    result = analyze_records(p, json.loads(data['observation.json']), engine)
    log = data['observation.log'].decode('utf-8').splitlines()
    require([line.strip() for line in log] == [f"{engine} {x['width']} {x['originalStatus']}" for x in result['observations']], 'observation log mismatch')
    for name in NAMES:
        require(name + '.json' in data and name + '.log' in data, 'missing suite body')
    return p, result, data

def git_claims(repo, p):
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args])
    require(git('rev-parse', HEAD + '^{tree}').decode().strip() == TREE, 'Git tree identity')
    objects = {}
    for row in git('ls-tree', '-rz', HEAD).split(b'\0'):
        if row:
            meta, name = row.split(b'\t', 1)
            mode, kind, oid = meta.decode().split()
            if kind == 'blob':
                objects[name.decode()] = oid
    paths = list(p['sourceSHA256'])
    require(all(n in objects for n in paths), 'source path absent from fixed Git')
    queries = ''.join(objects[n] + '\n' for n in paths).encode()
    output = subprocess.check_output(['git', '-C', str(repo), 'cat-file', '--batch'], input=queries)
    at = 0
    for name in paths:
        end = output.index(b'\n', at)
        oid, kind, size = output[at:end].decode().split()
        size = int(size); body = output[end + 1:end + 1 + size]; at = end + 2 + size
        require(kind == 'blob' and oid == objects[name] and hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + body).hexdigest() == oid, 'Git blob framing')
        require(hashlib.sha256(body).hexdigest() == p['sourceSHA256'][name], 'source hash claim mismatch')
    for s in p['suites']:
        scripts = {'observation':'verify-waapi-observation.py','style':'verify-waapi-observation-style.py','layout':'verify-waapi-acceptance-layout.py','n2':'verify-waapi-n2-event.py','stage1':'verify-waapi-stage1.py'}
        require(s['scriptSHA256'] == p['sourceSHA256']['scripts/' + scripts[s['name']]], 'suite script mismatch')
    return {'fixedGitHashCorrespondence': 'PASS', 'sourceClaims': len(paths), 'bodyPreservation': 'NOT_PRESENT', 'executionBytesBinding': 'NOT_PROVEN'}

if __name__ == '__main__':
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument('archive', type=Path); a.add_argument('official', type=Path); a.add_argument('repo', type=Path); a.add_argument('output', type=Path)
    args = a.parse_args()
    official = next(x for x in json.loads(args.official.read_text(encoding='utf-8')) if x['id'] == int(args.archive.stem.split('-')[1]))
    p, result, data = read_archive(args.archive, official)
    result.update(official=official, gitClaims=git_claims(args.repo, p), analyzerSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), browserLaunches=0)
    with args.output.open('x', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    print(json.dumps({'evidenceConsistency': result['evidenceConsistency'], 'suites': result['suites'], 'cause': result['cause']}))
