/** Stable always-run result: missing routing must never look like an unrelated skip. */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function evaluateTouchGate({scope, selected, checks, native, regression}) {
  if (scope !== 'success') throw Error('SCOPE_NOT_SUCCESS');
  if (checks !== 'success') throw Error('CONTRACT_TESTS_NOT_SUCCESS');
  if (!['true','false'].includes(selected)) throw Error('MISSING_SCOPE_DECISION');
  if (selected === 'true' && (native !== 'success' || regression !== 'success'))
    throw Error('SELECTED_DIAGNOSIS_NOT_SUCCESS');
  if (selected === 'false' && (native !== 'skipped' || regression !== 'skipped'))
    throw Error('UNRELATED_JOB_STATE_MISMATCH');
  return selected === 'true' ? 'SELECTED_CHECKS_PASS' : 'UNRELATED_EXPLICIT_SKIP';
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {console.log(evaluateTouchGate(JSON.parse(process.env.TOUCH_GATE_INPUT || 'null')));}
  catch (e) {console.error(e.message); process.exitCode = 1;}
}
