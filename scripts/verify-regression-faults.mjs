// Same normal executable under faults; fresh outputs and strict contracts make
// process failure, stale/empty JSON and incomplete recovery fail closed.
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {validateExit,validateDrawingFault,validateDrawingRecovery,validateStepResult} from './regression-result-contract.mjs';
const root=process.env.EVIDENCE_DIR||'work/regression-faults';await mkdir(root,{recursive:true});
const git=ref=>execFileSync('git',['rev-parse',ref],{encoding:'utf8'}).trim();
const buildHash=createHash('sha256').update(await readFile(path.join(process.env.EXPORT_DIR||'out','index.html'))).digest('hex');
const identity={buildHash,head:git('HEAD'),tree:git('HEAD^{tree}'),exportHead:process.env.EXPORT_HEAD||git('HEAD'),exportTree:process.env.EXPORT_TREE||git('HEAD^{tree}')};
const engines=(process.env.BROWSERS||'chromium,webkit').split(','),widths=(process.env.WIDTHS||'375,390,765,1280').split(',').map(Number);
const drawingKeys=engines.flatMap(e=>widths.flatMap(w=>['then','now'].map(era=>`${e}/${w}/${era}`))),stepKeys=engines.flatMap(e=>widths.map(w=>`${e}/${w}`));
const report={kind:'same normal harness, fresh nonce/identity/complete cases, injected DOM faults and recovery',...identity,cases:[]};
async function run(name,script,extra={}){
 const dir=await mkdtemp(path.join(root,name+'-')),runId=randomUUID();const env={...process.env,EVIDENCE_DIR:dir,REGRESSION_RUN_ID:runId};
 delete env.REGRESSION_DRAW_FAULT;delete env.REGRESSION_DRAW_FAULT_ERA;delete env.REGRESSION_STEP_FAULT;Object.assign(env,extra);
 const result=spawnSync(process.execPath,[script],{env,encoding:'utf8'});await writeFile(path.join(dir,'executable.log'),(result.stdout||'')+(result.stderr||''));
 const data=JSON.parse(await readFile(path.join(dir,script.includes('editing')?'results.json':'report.json'),'utf8'));
 return{dir,runId,result,data,expected:{...identity,runId}};
}
try{
 for(const era of ['then','now'])for(const fault of ['missingLast','extraAfterCancel','changedExisting']){
  const r=await run(`${era}-${fault}`,'scripts/verify-flash-phase2-editing.mjs',{REGRESSION_DRAW_FAULT:fault,REGRESSION_DRAW_FAULT_ERA:era});
  validateExit(r.result,true);const c=validateDrawingFault(r.data,r.expected,{engine:engines[0],width:widths[0],era,fault});
  report.cases.push({era,fault,dir:r.dir,runId:r.runId,exit:r.result.status,harnessHead:r.data.head,exportHead:r.data.exportHead,expected:c.injectedFault.expected,actual:c.injectedFault.actual,assertion:c.failures,status:'PASS'});
 }
 const step=await run('step-never-stops','scripts/verify-regression-timing.mjs',{REGRESSION_STEP_FAULT:'neverStops'});validateExit(step.result,true);validateStepResult(step.data,step.expected,[stepKeys[0]],true);
 report.stepFault={dir:step.dir,runId:step.runId,exit:step.result.status,status:step.data.status,error:step.data.error,assertion:'same settledVisibility as normal/practical'};
 const r=await run('recovery','scripts/verify-flash-phase2-editing.mjs');validateExit(r.result,false);validateDrawingRecovery(r.data,r.expected,drawingKeys);
 report.recovery={dir:r.dir,runId:r.runId,exit:r.result.status,status:r.data.status,head:r.data.head,exportHead:r.data.exportHead,cases:r.data.cases.length};
 const s=await run('step-recovery','scripts/verify-regression-timing.mjs');validateExit(s.result,false);validateStepResult(s.data,s.expected,stepKeys,false);report.stepRecovery={dir:s.dir,runId:s.runId,exit:s.result.status,status:s.data.status};report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack||e);process.exitCode=1;}finally{await writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
