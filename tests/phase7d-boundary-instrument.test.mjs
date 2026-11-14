import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {instrumentSource} from '../scripts/phase7d-diagnostic-instrument.mjs';
import {instrumentBoundary,boundaryInitScript,applyBoundaryFault} from '../scripts/phase7d-boundary-instrument.mjs';
for(const [kind,file] of [['swipe','GestureExhibits.tsx'],['status','ReactiveExhibits.tsx']]){
 const input=readFileSync(`app/components/interactive-motion/${file}`,'utf8');
 test(`${kind}: A bytes unchanged`,()=>assert.equal(instrumentBoundary(input,kind,'A').source,input));
 for(const group of ['B','C'])test(`${kind}/${group}: bounded sink contract and separate boundaries compile`,()=>{
  const result=instrumentBoundary(input,kind,group);
  for(const phase of ['timer-callback','state-request','commit','dom-reflection'])assert.ok(result.source.includes(`'${phase}'`));
  if(group==='C')for(const phase of ['guard','cancel-request','cancel-processed','timer-register'])assert.ok(result.source.includes(`'${phase}'`));
  assert.deepEqual(ts.transpileModule(result.source,{fileName:'copy.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX}}).diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
  assert.equal(result.manifest.boundary.neutrality,'UNKNOWN');
  assert.notEqual(result.manifest.beforeSha256,result.manifest.afterSha256);
 });
 test(`${kind}: old B still lacks callback`,()=>assert.ok(!instrumentSource(input,kind,'B').source.includes("'timer-callback'")));
 for(const fault of ['callback-delay','callback-suppression','update-omission','generation-mismatch','guard-suppression'])test(`${kind}: source fault ${fault} changes executable bytes`,()=>{const source=instrumentBoundary(input,kind,'C').source;const result=applyBoundaryFault(source,kind,fault);assert.notEqual(result.source,source);assert.ok(result.source.includes("'fault-applied'"));assert.deepEqual(ts.transpileModule(result.source,{fileName:'copy.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX}}).diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);});
 test(`${kind}: unsupported fault fails closed`,()=>assert.throws(()=>applyBoundaryFault(input,kind,'commit-delay'),/NOT_TESTED/));
}
test('sink keeps ordered events, clocks, trial identity and overflow instead of silent truncation',()=>{
 const context={window:{},performance:{now:()=>12},Date};vm.runInNewContext(`(${boundaryInitScript.toString()})({trialId:'validation-1',limit:2})`,context);
 for(let n=0;n<3;n++)context.window.__phase7dDiagnosticEmit({phase:'commit'});
 const sink=context.window.__phase7dBoundary;assert.equal(sink.events.length,2);assert.equal(sink.events[1].sequence,2);assert.equal(sink.events[0].trialId,'validation-1');assert.equal(sink.events[0].browserPerformanceMs,12);assert.equal(sink.overflow,true);assert.equal(sink.dropped,1);
});
