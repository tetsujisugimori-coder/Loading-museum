import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const file = 'app/components/practical/image-crop-model.ts', original = fs.readFileSync(file), source = original.toString('utf8');
const dest = process.env.CONTROL_DIR || 'work/image-crop-controls'; fs.mkdirSync(dest, { recursive: true }); const results = [];
const faults = [
  { name: 'provisional-incorrectly-confirmed', from: "case 'confirm': return { ...base, committed: editing };", to: "case 'confirm': return { ...base, committed: state.editing };" },
  { name: 'fixed-ratio-not-preserved', from: 'height = fixedHeight(width, selection.ratio);', to: 'height = width;' },
  { name: 'display-rounded-again', from: 'String(value);', to: 'String(Number(value.toFixed(6)));', precision: true },
  { name: 'minimum-loosened', from: 'rect.width < MIN_SIZE || rect.height < MIN_SIZE', to: 'rect.width < MIN_SIZE - 1e-6 || rect.height < MIN_SIZE - 1e-6', precision: true },
  { name: 'overflow-rounded-away', from: 'return error <= 0;', to: 'return error <= Number.POSITIVE_INFINITY;', precision: true },
];
try {
  for (const fault of faults) {
    assert.ok(source.includes(fault.from), 'mutation must be applied'); fs.writeFileSync(file, source.replace(fault.from, fault.to));
    const args = fault.precision ? ['--experimental-strip-types', 'scripts/verify-image-crop-precision-model.mjs'] : ['node_modules/vitest/vitest.mjs', 'run', '--maxWorkers=2', 'tests/image-crop.test.tsx'];
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60000, env: { ...process.env, PRECISION_MODEL_DIR: `${dest}/${fault.name}` } });
    const log = (r.stdout || '') + (r.stderr || ''); fs.writeFileSync(`${dest}/${fault.name}.log`, log);
    assert.equal(r.error, undefined); assert.equal(r.signal, null); assert.equal(r.status, 1);
    if (fault.precision) assert.ok(JSON.parse(fs.readFileSync(`${dest}/${fault.name}/results.json`, 'utf8')).checks.some(c => c.status === 'FAIL' && c.error.includes('AssertionError')));
    else assert.match(log, /AssertionError/);
    results.push({ name: fault.name, result: 'REJECTED', exit: r.status, sourceSHA256Before: undefined }); fs.writeFileSync(file, original);
  }
} finally { fs.writeFileSync(file, original); fs.writeFileSync(`${dest}/results.json`, JSON.stringify({ results, originalBytesRestored: fs.readFileSync(file).equals(original) }, null, 2)); }
assert.equal(results.length, faults.length); console.log(`PASS: all ${faults.length} source faults rejected, original bytes restored`);
