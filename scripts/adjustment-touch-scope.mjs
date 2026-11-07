/** Select native touch diagnosis only for files that can affect Image Adjustment.
 * A selected diagnosis must still fail when WebKit native touch fails.
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const WATCHED_EXACT = new Set([
  '.github/workflows/diagnose-adjustment-touch.yml',
  '.github/workflows/verify-image-adjustment.yml',
  'app/components/PracticalRoom.tsx',
  'app/components/practical/ImageAdjustment.tsx',
  'app/components/practical/adjustment-model.ts',
  'app/components/practical/image-adjustment.css',
  'app/data/phase6aExhibits.ts',
  'scripts/adjustment-touch-contract.mjs',
  'scripts/adjustment-touch-scope.mjs',
  'scripts/diagnose-adjustment-touch.mjs',
  'scripts/verify-image-adjustment-browser.mjs',
  'tests/adjustment-model.test.ts',
  'tests/adjustment-touch-contract.test.mjs',
  'tests/adjustment-touch-scope.test.mjs',
  'tests/image-adjustment.test.tsx',
  'package.json',
  'package-lock.json',
]);
const WATCHED_PREFIXES = ['app/styles/', 'app/globals.', 'next.config.', 'postcss.config.', 'tsconfig.'];

export function isTouchRelatedPath(file) {
  if (typeof file !== 'string' || !file) return false;
  const normalized = file.replaceAll('\\', '/');
  return WATCHED_EXACT.has(normalized) || WATCHED_PREFIXES.some(prefix => normalized.startsWith(prefix));
}
export function shouldRunTouchDiagnosis(files) {
  if (!Array.isArray(files)) throw new TypeError('Expected changed file list');
  return files.some(isTouchRelatedPath);
}
function main() {
  const forced = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  let selected, related = [];
  if (forced) {
    selected = true;
  } else {
    const base = process.env.PR_BASE_SHA, head = process.env.PR_HEAD_SHA;
    if (![base, head].every(sha => /^[0-9a-f]{40}$/.test(sha ?? '')))
      throw new Error('Missing or invalid base/head SHA: refuse to skip native diagnosis');
    const changed = execFileSync('git', ['diff', '--name-only', '-z', base + '...' + head], {encoding:'utf8'})
      .split('\0').filter(Boolean);
    related = changed.filter(isTouchRelatedPath);
    selected = related.length > 0;
  }
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT unavailable');
  appendFileSync(process.env.GITHUB_OUTPUT, 'run_native=' + (selected ? 'true' : 'false') + '\n');
  console.log(JSON.stringify({decision: selected ? 'RUN_NATIVE_DIAGNOSIS' : 'SKIP_UNRELATED', forced, relatedFiles:related}));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch(error) {console.error(error); process.exitCode = 1;}
}
