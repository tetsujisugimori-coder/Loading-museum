import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {instrumentSource} from '../scripts/phase7d-diagnostic-instrument.mjs';
import {instrumentBoundary} from '../scripts/phase7d-boundary-instrument.mjs';

for (const [kind, file] of [['swipe','GestureExhibits.tsx'], ['status','ReactiveExhibits.tsx']]) {
  const input = readFileSync(`app/components/interactive-motion/${file}`, 'utf8');
  test(`${kind}: boundary B records callback separately without changing legacy transform`, () => {
    const legacy = instrumentSource(input, kind, 'B');
    const result = instrumentBoundary(input, kind, 'B');
    assert.doesNotMatch(legacy.source, /'timer-callback'/);
    assert.match(result.source, /'timer-callback'/);
    assert.match(result.source, /'state-request'/);
    assert.match(result.source, /'commit'/);
    assert.equal((result.source.match(/setTimeout\(/g) || []).length, (input.match(/setTimeout\(/g) || []).length);
    assert.deepEqual(ts.transpileModule(result.source, {fileName:'copy.tsx', reportDiagnostics:true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX}}).diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error), []);
    assert.notEqual(result.manifest.beforeSha256, result.manifest.afterSha256);
  });
  test(`${kind}: boundary A and C retain legacy transforms`, () => {
    for (const group of ['A', 'C']) assert.deepEqual(instrumentBoundary(input, kind, group), instrumentSource(input, kind, group));
  });
  test(`${kind}: a missing callback anchor fails closed`, () => {
    const changed = kind === 'swipe' ? input.replace('if(gen===epoch.current)change(result);', 'if(gen===epoch.current){change(result);}') : input.replace('if(token!==generation.current||!allowed.current)return;', 'if(!allowed.current)return;');
    assert.throws(() => instrumentBoundary(changed, kind, 'B'), /callback: expected one exact match/);
  });
}
