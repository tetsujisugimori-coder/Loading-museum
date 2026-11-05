import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const file = 'app/components/practical/image-crop-model.ts', original = fs.readFileSync(file), source = original.toString('utf8');
const dest = process.env.CONTROL_DIR || 'work/image-crop-controls'; fs.mkdirSync(dest, { recursive: true }); const results = [];
const faults = [
  { name: 'provisional-incorrectly-confirmed', from: "case 'confirm': return { ...base, committed: editing };", to: "case 'confirm': return { ...base, committed: state.editing };" },
  { name: 'fixed-ratio-not-preserved', from: 'height = width / r;', to: 'height = width;' },
];
try {
  for (const fault of faults) {
    assert.ok(source.includes(fault.from), 'mutation must be applied'); fs.writeFileSync(file, source.replace(fault.from, fault.to));
    const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--maxWorkers=2', 'tests/image-crop.test.tsx'], { encoding: 'utf8', timeout: 60000 });
    const log = (r.stdout || '') + (r.stderr || ''); fs.writeFileSync(`${dest}/${fault.name}.log`, log);
    assert.equal(r.error, undefined); assert.equal(r.signal, null); assert.equal(r.status, 1); assert.match(log, /AssertionError/);
    results.push({ name: fault.name, result: 'REJECTED', exit: r.status, sourceSHA256Before: undefined }); fs.writeFileSync(file, original);
  }
} finally { fs.writeFileSync(file, original); fs.writeFileSync(`${dest}/results.json`, JSON.stringify({ results, originalBytesRestored: fs.readFileSync(file).equals(original) }, null, 2)); }
assert.equal(results.length, faults.length); console.log('PASS: both source faults rejected, original bytes restored');
