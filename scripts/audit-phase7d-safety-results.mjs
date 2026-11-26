import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {validateSafetySummary,safetyPlan} from './phase7d-safety-result-contract.mjs';
export function auditSafetyDirectory(dir,{requireComplete=true}={}) {
  const summary=JSON.parse(fs.readFileSync(path.join(dir,'results.json')));
  const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json')));
  assert.deepEqual(plan.plan,safetyPlan);assert.equal(plan.head,summary.head);assert.equal(plan.tree,summary.tree);
  const result=validateSafetySummary(summary,{requireComplete});
  for(const row of summary.results){
    if(row.recordWritten){const record=JSON.parse(fs.readFileSync(path.join(dir,row.id,'result.json')));assert.deepEqual(record,row,'per-slot vs aggregate');}
    if(row.status==='PASS')for(const name of ['trace.zip','complete.har','served.json']){
      const stat=fs.statSync(path.join(dir,row.id,name));assert.ok(stat.isFile()&&stat.size>0,'required file missing');
    }
  }
  return {...result,head:summary.head,tree:summary.tree,productionTrialsExecuted:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try {assert.equal(process.argv.length,3);console.log(JSON.stringify(auditSafetyDirectory(path.resolve(process.argv[2])),null,2));}
  catch(error){console.error(String(error.stack||error));process.exitCode=1;}
}
