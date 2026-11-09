/** SYNTHETIC TEST FIXTURES ONLY. No browser execution or user evidence is generated. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {audit} from './frozen-final/scripts/audit-scroll-geometry.mjs';

const root=path.dirname(new URL(import.meta.url).pathname),dir=path.join(root,'final-mini-fixture');
const sha=b=>createHash('sha256').update(b).digest('hex'),clone=x=>structuredClone(x);
const binding=JSON.parse(await fs.readFile(path.join(root,'final-mini-binding.json')));
const baseline=JSON.parse(await fs.readFile(path.join(dir,'report.json')));
const save=async(file,b)=>{await fs.writeFile(path.join(dir,file),b);return {file,sha256:sha(b),bytes:b.length};};
const rawBytes=new Map(await Promise.all(baseline.rows.map(async row=>[row.trialId,await fs.readFile(path.join(dir,row.json.file))])));
const rawRecords=new Map(await Promise.all(baseline.rows.map(async row=>[row.trialId,JSON.parse(await fs.readFile(path.join(dir,row.json.file)))])));
const target=baseline.rows.findIndex(r=>r.method==='tap'&&r.surface==='product');
const tests=[],reportFile=path.join(dir,'report.json');
const baselineAudit=await audit(dir,binding);
assert.equal(baselineAudit.status,'FAIL'); assert.equal(baselineAudit.binaryVerification.status,'PASS'); assert.equal(baselineAudit.pairs,1);
const knownIncompleteErrors=new Set(baselineAudit.errors); assert.equal([...knownIncompleteErrors].every(e=>e.startsWith('MISSING_TRIAL:')||e==='BINARY_EVIDENCE_FAILED'),true);

await fs.writeFile(path.join(root,'final-mini-binding.json'),JSON.stringify(binding,null,2));
async function run(name,expect,mutate,classification='required'){
 const report=clone(baseline),expected=clone(binding),filesToRestore=new Map();
 const rewrite=async(index,fn)=>{const row=report.rows[index],r=clone(rawRecords.get(row.trialId));fn(r);const file=row.json.file;filesToRestore.set(file,rawBytes.get(row.trialId));row.json=await save(file,Buffer.from(JSON.stringify(r)));};
 const bytes=async(f,b)=>{filesToRestore.set(f,await fs.readFile(path.join(dir,f)));await fs.writeFile(path.join(dir,f),b);};
 const remove=async(f)=>{filesToRestore.set(f,await fs.readFile(path.join(dir,f)));await fs.unlink(path.join(dir,f));};
 let result,thrown=null;
 try{
  if(mutate)await mutate({report,expected,rewrite,bytes,remove,target});
  await fs.writeFile(reportFile,JSON.stringify(report));
  try{result=await audit(dir,expected);}catch(e){thrown=String(e);}
  const freshErrors=thrown?[]:result.errors.filter(e=>!knownIncompleteErrors.has(e));
  const binaryErrors=thrown?[]:result.binaryVerification?.errors??[];
  const actual=thrown?'THREW':freshErrors.length||binaryErrors.length?'FAIL':'PASS';
  const satisfied=expect==='REJECT'?actual!=='PASS':actual===expect;
  const item={name,classification,expected:expect,actual,satisfied,rows:result?.rows,pairs:result?.pairs,errorCount:result?.errors?.length,rawAggregateStatus:result?.status,newTargetErrors:freshErrors,binaryErrors,knownIncompleteMatrixIgnoredOnlyForFaultIsolation:true,thrown};
  if(result?.pairResults?.[target/2|0])item.targetOutcome=result.pairResults[target/2|0].result.a.outcome;
  tests.push(item);console.log(JSON.stringify(item));
  if(name==='positive_full_768')await fs.writeFile(path.join(root,'final-mini-positive-audit.json'),JSON.stringify(result,null,2));
  if(!satisfied){await fs.writeFile(path.join(root,'final-mini-'+name+'.counterexample.json'),JSON.stringify({syntheticOnly:true,mutatedRow:report.rows[target],raw:JSON.parse(await fs.readFile(path.join(dir,report.rows[target].json.file))),audit:result},null,2));}
 }finally{for(const [f,b]of filesToRestore)await fs.writeFile(path.join(dir,f),b);}
}

await run('positive_full_768','PASS');
await run('missing_trial','REJECT',({report})=>report.rows.pop());
await run('duplicate_trial','REJECT',({report})=>report.rows.push(clone(report.rows[0])));
await run('unknown_trial','REJECT',({report})=>report.rows[0].trialId='unknown-trial');
for(const key of ['head','tree','protocolHash','sourceHash']){
 await run('run_binding_'+key,'REJECT',({report})=>report.binding[key]='OLD');
 await run('raw_binding_'+key,'REJECT',({rewrite,target})=>rewrite(target,r=>r.identity[key]='OLD'));
 await run('expected_binding_'+key,'REJECT',({expected})=>expected[key]='OLD');
}
for(const key of ['pairId','condition','engine','width','motion','method','repetition','surface'])await run('row_identity_'+key,'REJECT',({report,target})=>report.rows[target][key]=typeof report.rows[target][key]==='number'?999:'WRONG');
await run('raw_trial_identity','REJECT',({rewrite,target})=>rewrite(target,r=>r.identity.trialId='wrong-trial'));
await run('raw_pair_identity','REJECT',({rewrite,target})=>rewrite(target,r=>r.identity.pairId='wrong-pair'));
for(const kind of ['json','trace','png'])for(const field of ['sha256','bytes'])await run(kind+'_'+field+'_mismatch','REJECT',({report,target})=>{const f=kind==='png'?report.rows[target].images.before:report.rows[target][kind];f[field]=field==='bytes'?f.bytes+1:'0'.repeat(64);});
for(const kind of ['json','trace','png'])await run(kind+'_file_missing','REJECT',({report,target,remove})=>remove((kind==='png'?report.rows[target].images.before:report.rows[target][kind]).file));
for(const phase of ['before','during','after'])await run('missing_screenshot_'+phase,'REJECT',({report,target})=>delete report.rows[target].images[phase]);
await run('extra_screenshot_phase','REJECT',({report,target})=>report.rows[target].images.unknown=clone(report.rows[target].images.before));
await run('unsafe_relative_file','REJECT',({report,target})=>report.rows[target].json.file='../outside.json');
await run('unsafe_absolute_file','REJECT',({report,target})=>report.rows[target].json.file='/tmp/outside.json');
await run('row_execution_error','REJECT',({report,target})=>report.rows[target].error='Synthetic execution error');
await run('page_errors_missing','REJECT',({rewrite,target})=>rewrite(target,r=>delete r.pageErrors));
await run('page_errors_present','REJECT',({rewrite,target})=>rewrite(target,r=>r.pageErrors=['Synthetic browser error']));
await run('unsupported_raw_schema','REJECT',({rewrite,target})=>rewrite(target,r=>r.schemaVersion='unsupported'));
await run('unsupported_event_type','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[0].type='unsupported'));
await run('unpaired_pointer_end','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[0].type='pointerup'));
await run('wrong_pointer_end_id','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[2].pointerId=99));
await run('unpaired_touch_end','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[1].type='touchend'));
await run('wrong_touch_end_id','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[3].touchId=99));
await run('pointer_type_switch','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[2].pointerType='mouse'));
await run('unfinished_lifecycle_after_completed','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[3].type='input'));
await run('unsupported_report_status_rejected','REJECT',({report})=>report.status='UNSUPPORTED_CLAIM','status_recomputation');
await run('unsupported_row_status_ignored','PASS',({report,target})=>report.rows[target].result={valid:true,status:'UNSUPPORTED_CLAIM',outcome:'UNSUPPORTED_CLAIM'},'status_recomputation');
await run('false_report_pass_cannot_hide_missing_row','REJECT',({report})=>{report.status='PASS';report.rows.pop();});

// Additional fail-closed probes beyond the requested minimum.
await run('aggregate_fatal_error_present','REJECT',({report})=>report.errors.push({fatal:'Synthetic fatal runner error'}),'boundary_probe');
await run('unsupported_run_schema','REJECT',({report})=>report.schemaVersion='unsupported','boundary_probe');
await run('missing_run_binding','REJECT',({report})=>delete report.binding,'robustness');
await run('rows_object_instead_of_array','REJECT',({report})=>report.rows={},'robustness');
await run('hash_consistent_non_png_bytes','REJECT',async({report,target,bytes})=>{const f=report.rows[target].images.before,b=Buffer.from('not a png');await bytes(f.file,b);f.sha256=sha(b);f.bytes=b.length;},'format_probe');
await run('hash_consistent_non_trace_bytes','REJECT',async({report,target,bytes})=>{const f=report.rows[target].trace,b=Buffer.from('not a trace zip');await bytes(f.file,b);f.sha256=sha(b);f.bytes=b.length;},'format_probe');
await run('raw_image_binding_mismatch','REJECT',({rewrite,target})=>rewrite(target,r=>r.images.before.sha256='0'.repeat(64)),'boundary_probe');
await run('all_screenshot_phases_reuse_one_file','REJECT',({report,target})=>{report.rows[target].images.during=clone(report.rows[target].images.before);report.rows[target].images.after=clone(report.rows[target].images.before);},'phase_provenance_probe');
await run('unpaired_touchmove_before_completion','REJECT',({rewrite,target})=>rewrite(target,r=>{r.events[1].type='touchmove';r.events[3].type='input';}),'lifecycle_probe');
await run('event_pointer_type_incompatible_with_input','REJECT',({rewrite,target})=>rewrite(target,r=>{r.events=r.events.filter(e=>e.type.startsWith('pointer')).map((e,index)=>({...e,index,pointerType:'mouse'}));}),'lifecycle_probe');
await run('untrusted_event','REJECT',({rewrite,target})=>rewrite(target,r=>r.events[0].isTrusted=false));
await run('temporary_scroll_drift','REJECT',({rewrite,target})=>rewrite(target,r=>{r.points[2].scroll.y+=20;r.events[1].snapshot=clone(r.points[2]);}));

await fs.writeFile(reportFile,JSON.stringify(baseline,null,2));
const finalPositive=await audit(dir,binding);assert.equal(finalPositive.status,'FAIL'); assert.equal(finalPositive.binaryVerification.status,'PASS'); assert.equal(finalPositive.errors.every(e=>knownIncompleteErrors.has(e)),true);
const summary={syntheticOnly:true,notBrowserEvidence:true,fixtureRows:2,fixturePairs:1,scope:'Fault isolation in intentionally incomplete 2-row matrix. Every aggregate result remains FAIL; PASS here means no new target error beyond known missing 766 trials and binary aggregate count.',totalTests:tests.length,satisfied:tests.filter(t=>t.satisfied).length,unexpectedPasses:tests.filter(t=>!t.satisfied&&t.actual==='PASS').map(t=>t.name),unexpectedFailures:tests.filter(t=>!t.satisfied&&t.actual!=='PASS').map(t=>t.name),frozenAuditSha256:sha(await fs.readFile(path.join(root,'frozen-final/scripts/audit-scroll-geometry.mjs'))),frozenContractSha256:sha(await fs.readFile(path.join(root,'frozen-final/diagnostics/scroll-geometry/contract.mjs'))),tests};
await fs.writeFile(path.join(root,'final-mini-results.json'),JSON.stringify(summary,null,2));
console.log('FINAL '+JSON.stringify({...summary,tests:undefined}));
