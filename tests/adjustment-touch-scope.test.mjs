import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isTouchRelatedPath, shouldRunTouchDiagnosis} from '../scripts/adjustment-touch-scope.mjs';

test('selects changes relevant to adjustment or its runtime', () => {
  for (const path of [
    'app/components/practical/ImageAdjustment.tsx',
    'scripts/diagnose-adjustment-touch.mjs',
    '.github/workflows/diagnose-adjustment-touch.yml',
    'app/components/PracticalRoom.tsx',
    'package-lock.json',
    'next.config.mjs',
    'app/globals.css'
  ]) assert.equal(shouldRunTouchDiagnosis(['README.md',path]),true,path);
});
test('does not run for unrelated work and docs', () => {
  assert.equal(shouldRunTouchDiagnosis(['README.md','docs/phase6a5/review-handoff.md']),false);
  assert.equal(shouldRunTouchDiagnosis(['app/components/practical/SomeOtherLab.tsx']),false);
  assert.equal(shouldRunTouchDiagnosis([]),false);
});
test('no accidental prefix match and Windows separator behavior', () => {
  assert.equal(isTouchRelatedPath('app/components/practical/ImageAdjustment.tsx.old'),false);
  assert.equal(isTouchRelatedPath('docs/next.config.mjs'),false);
  assert.equal(isTouchRelatedPath('app\\components\\practical\\ImageAdjustment.tsx'),true);
  assert.equal(isTouchRelatedPath('app/styles/museum.css'),true);
  assert.throws(()=>shouldRunTouchDiagnosis('file'),TypeError);
});
test('entrypoint: docs skipped, change selected, manual forced, invalid SHA fails closed', async () => {
  const {mkdtempSync,mkdirSync,writeFileSync,readFileSync} = await import('node:fs');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const {execFileSync,spawnSync} = await import('node:child_process');
  const dir=mkdtempSync(join(tmpdir(),'iad-scope-'));
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  git('init','-q');git('config','user.name','Test');git('config','user.email','ci@example.test');
  writeFileSync(join(dir,'README.md'),'base\n');git('add','.');git('commit','-qm','base');
  const base=git('rev-parse','HEAD');
  writeFileSync(join(dir,'README.md'),'docs\n');git('add','.');git('commit','-qm','docs');
  const docs=git('rev-parse','HEAD');
  mkdirSync(join(dir,'app/components/practical'),{recursive:true});
  writeFileSync(join(dir,'app/components/practical/ImageAdjustment.tsx'),'change\n');
  git('add','.');git('commit','-qm','touch');
  const code=git('rev-parse','HEAD');
  const script=new URL('../scripts/adjustment-touch-scope.mjs',import.meta.url).pathname;
  const run=(event,head)=>{
    const output=join(dir,'output');writeFileSync(output,'');
    const result=spawnSync(process.execPath,[script],{cwd:dir,
      env:{...process.env,GITHUB_EVENT_NAME:event,PR_BASE_SHA:base,PR_HEAD_SHA:head,GITHUB_OUTPUT:output}});
    return {status:result.status,out:readFileSync(output,'utf8')};
  };
  assert.deepEqual(run('pull_request',docs),{status:0,out:'run_native=false\n'});
  assert.deepEqual(run('pull_request',code),{status:0,out:'run_native=true\n'});
  assert.deepEqual(run('workflow_dispatch',''),{status:0,out:'run_native=true\n'});
  const invalid=run('pull_request','unknown');
  assert.notEqual(invalid.status,0);assert.equal(invalid.out,'');
});
