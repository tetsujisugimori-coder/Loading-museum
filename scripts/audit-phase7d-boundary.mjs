/** Independent boundary evidence checks. No product success flag is an oracle. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {boundaryPlan,boundaryTargets} from './phase7d-boundary-plan.mjs';
import {boundaryContract,boundarySequence,digest} from './phase7d-boundary-contract.mjs';
import {traceOperations} from './phase7d-api-trace-spec.mjs';
import {boundaryInitScript} from './phase7d-boundary-instrument.mjs';
export const collectExpression='()=>window.__phase7dBoundary';
const lifecycle=['browser.launch','browser.newContext','context.tracing.start','context.tracing.stop','context.close','browser.close'];
export function validateBoundaryTrial(t,planned) {
 assert.equal(t.plannedId,planned.id,'allocation id');assert.equal(t.id,'validation-'+planned.id,'validation namespace');
 for(const k of ['order','engine','case','group','iteration'])assert.equal(t[k],planned[k],'allocation '+k);
 const target=boundaryTargets[t.case]; assert.equal(t.expected,target.expected,'oracle expectation');
 assert.deepEqual(t.viewport,{width:target.width,height:target.height},'viewport');assert.equal(t.motion,target.motion,'motion');
 assert.ok(Array.isArray(t.apis)&&Array.isArray(t.pageErrors),'API/error arrays');
 const execution=t.apis.filter(a=>!lifecycle.slice(3).includes(a.name));
 const expected=boundarySequence(t.case,t.group).filter(n=>!lifecycle.slice(3).includes(n));
 assert.deepEqual(execution.map(a=>a.name),expected.slice(0,execution.length),'API ordered prefix');
 let previous=-Infinity;
 for(const [i,a] of t.apis.entries()){assert.equal(a.seq,i+1,'API sequence');assert.ok(Number.isFinite(a.hostStartMs)&&Number.isFinite(a.hostEndMs),'host times');assert.ok(a.hostStartMs>=previous&&a.hostEndMs>=a.hostStartMs,'host order');previous=a.hostEndMs;assert.ok(['OK','ERROR'].includes(a.status),'API status');}
 const prefixExpected={'details.closed.count':0,'details.open.count':2,'keyboard-prefix.getAttribute':'dismissed','undo-prefix.getAttribute':'idle','prefix-start.getAttribute':'Loading','cancel-prefix.getAttribute':'Cancelled','success-prefix.getAttribute':'Success'};
 for(const a of t.apis){if(a.status==='OK'&&Object.hasOwn(prefixExpected,a.name)&&a.result!==prefixExpected[a.name]){assert.equal(t.evidenceStatus,'INCOMPLETE','prefix failure evidence');assert.equal(execution.at(-1).name,a.name,'prefix failure must stop execution');}}
 const reads=t.apis.filter(a=>a.name==='primary.getAttribute');assert.ok(reads.length<=1,'one primary');
 if(reads[0]?.status==='OK'){
  const p=reads[0],advance=t.apis[p.seq-2];assert.equal(advance.name,'target.clock.runFor','immediate primary');assert.equal(advance.milliseconds,target.advance,'deadline');assert.equal(advance.virtualAfterMs-advance.virtualBeforeMs,target.advance,'virtual deadline');assert.equal(p.commandedVirtualDateMs,advance.virtualAfterMs,'primary virtual ledger');
  assert.deepEqual(t.primary,{apiSeq:p.seq,state:p.result,verdict:p.result===target.expected?'PASS':'FAIL'},'immutable primary oracle');assert.ok(t.primaryFile,'primary persistence');
 }else assert.equal(t.primary,null,'no invented primary');
 assert.equal(t.diagnosticStatus,t.evidenceStatus,'evidence status consistency');assert.ok(['COMPLETE','INCOMPLETE'].includes(t.evidenceStatus),'known evidence status');
 const complete=t.evidenceStatus==='COMPLETE';
 if(t.pageErrors.length){assert.equal(t.productStatus,'FAIL','page errors product failure');assert.equal(complete,false,'page errors incomplete');}
 if(complete){assert.deepEqual(t.apis.map(a=>a.name),boundarySequence(t.case,t.group),'complete API sequence');assert.ok(t.apis.every(a=>a.status==='OK'),'complete API status');assert.ok(t.primary&&!t.error,'complete evidence');}
 if(t.primary?.verdict==='FAIL')assert.equal(t.productStatus,'FAIL','primary FAIL preserved');
 if(!t.primary)assert.notEqual(t.productStatus,'PASS','missing primary not success');
 const sink=t.boundary??t.instrumentation??t.internalLog;
 if(t.group!=='A'&&complete){assert.ok(sink?.installed,'instrumentation installed');assert.equal(sink.overflow,false,'overflow');assert.equal(sink.dropped,0,'dropped logs');assert.deepEqual(sink.errors,[],'instrument errors');assert.ok(Array.isArray(sink.events)&&sink.events.length,'missing logs');for(const [i,e]of sink.events.entries()){assert.equal(e.sequence,i+1,'event order');assert.equal(e.trialId,t.validationId??t.id,'event trial');assert.ok(Number.isFinite(e.virtualDateMs)&&Number.isFinite(e.browserPerformanceMs),'event clocks');}}
 return {primary:t.primary?.verdict??'NOT_TESTED',evidence:complete?'COMPLETE':'INCOMPLETE',cause:'UNKNOWN'};
}
export function boundaryRawSpec(t) {
 const specs=[];
 for(const name of t.apis.map(a=>a.name)){
  if(lifecycle.includes(name))continue;
  if(name==='boundary.addInitScript'){
   const arg={trialId:t.validationId??t.id,operationId:'whole-trial',limit:4096};
   specs.push({name,method:'addInitScript',params:{source:`(${boundaryInitScript.toString()})(${JSON.stringify(arg)})`}});
  }else if(name==='boundary.collect')specs.push({name,method:'evaluateExpression',params:{expression:collectExpression,isFunction:true,arg:{value:{v:'undefined'},handles:[]}}});
  else specs.push(...traceOperations(t,[name]));
 }
 return specs;
}
export function decodeTraceValue(x,refs=new Map()) {
 if(x===null||typeof x!=='object')return x;
 if('ref' in x){assert.ok(refs.has(x.ref),'trace value reference');return refs.get(x.ref);}
 if('n' in x)return x.n;if('s' in x)return x.s;if('b' in x)return x.b;
 if('v' in x)return ({null:null,undefined:undefined,NaN:NaN,Infinity:Infinity,'-Infinity':-Infinity,'-0':-0})[x.v];
 if(x.a){const a=[];if(x.id)refs.set(x.id,a);for(const v of x.a)a.push(decodeTraceValue(v,refs));return a;}
 if(x.o){const o={};if(x.id)refs.set(x.id,o);for(const {k,v}of x.o)o[k]=decodeTraceValue(v,refs);return o;}
 throw Error('unsupported raw trace value');
}
export function validateBoundaryTrace(t,raw){
 assert.equal(raw.contexts?.length,1,'one raw context');const context=raw.contexts[0];assert.equal(context.browserName,t.engine,'raw engine');assert.deepEqual(context.options?.viewport,t.viewport,'raw viewport');assert.equal(context.options?.reducedMotion,t.motion,'raw motion');assert.equal(context.options?.hasTouch,true,'raw touch');
 assert.equal(raw.hasAutomaticImages,false,'automatic images');assert.equal(raw.hasSnapshots,false,'automatic snapshots');
 const spec=boundaryRawSpec(t);assert.equal(raw.calls.length,spec.length,'raw API count');
 const ids=new Set();let last=-Infinity;
 for(const [i,s]of spec.entries()){
  const c=raw.calls[i];assert.ok(c.before&&c.after,'raw completion missing');assert.ok(!ids.has(c.before.callId),'duplicate raw call');ids.add(c.before.callId);
  assert.equal(c.before.method,s.method,'raw API '+s.name);assert.deepEqual(c.before.params,s.params,'raw args '+s.name);
  if(Number.isFinite(c.before.startTime)){assert.ok(c.before.startTime>=last,'raw order');last=c.before.startTime;}
  const a=t.apis.find(a=>a.name===s.name);if(a.status==='OK')assert.ok(!c.after.error,'raw API error');
  if(s.result!==undefined&&t.evidenceStatus==='COMPLETE')assert.equal(c.after.result?.value,s.result,'raw prefix expectation');
  if(s.method==='getAttribute'&&a.status==='OK')assert.equal(c.after.result?.value,a.result,'raw primary/prefix result');
  if(s.name==='boundary.collect'&&a.status==='OK')assert.deepEqual(decodeTraceValue(c.after.result?.value),t.instrumentation,'raw instrumentation result');
  if(s.name==='clock.origin.evaluate')assert.equal(c.after.result?.value?.n,t.clockOrigin.requestedPauseAtMs,'clock origin');
 }
 return {status:'PASS',calls:raw.calls.length,primaryVerdict:t.primary?.verdict??'NOT_TESTED',limitations:['Input bounding rectangle host record has no independently recorded raw DOM rectangle response in this protocol.','Internal instrumentation event ordering is not proof of neutrality or a product root cause.']};
}
export async function verifyBoundaryBytes(root,hashes){
 assert.ok(hashes&&Object.keys(hashes).length,'nonempty byte bindings');
 const base=path.resolve(root);
 for(const [name,hash]of Object.entries(hashes)){
  const file=path.resolve(base,name);assert.ok(file.startsWith(base+path.sep),'path escape');assert.match(hash,/^[a-f0-9]{64}$/,'SHA-256');assert.equal(digest(await fs.readFile(file)),hash,'actual bytes '+name);
 }
 return Object.keys(hashes).length;
}
export function readBoundaryTrace(file){
 const script=`import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1]); names=z.namelist()\nif len(names)!=len(set(names)): raise ValueError('duplicate ZIP entry')\nif z.testzip(): raise ValueError('CRC failure')\nrows=[]\nfor n in names:\n if n.endswith('.trace'): rows.extend(json.loads(s) for s in z.read(n).decode().splitlines())\nb=[x for x in rows if x.get('type')=='before']; a=[x for x in rows if x.get('type')=='after']\nif len({x['callId'] for x in a})!=len(a): raise ValueError('duplicate after')\nends={x['callId']:x for x in a}\nprint(json.dumps({'contexts':[x for x in rows if x.get('type')=='context-options'], 'calls':[{'before':x,'after':ends.get(x['callId'])} for x in b], 'hasAutomaticImages':any(x.get('type')=='screencast-frame' for x in rows) or any(n.endswith('.jpeg') for n in names), 'hasSnapshots':any(x.get('type')=='frame-snapshot' for x in rows)}))`;
 return JSON.parse(execFileSync(process.env.PYTHON||'python',['-c',script,file],{encoding:'utf8',maxBuffer:64*1024*1024}));
}

export function validateAttemptJournal(t,journal,primary){
 const ends=journal.filter(x=>x.kind==='api-end').map(({kind,hostUtc,hostMs,...a})=>a);
 assert.deepEqual(ends,t.apis,'journal/API equality');
 const starts=journal.filter(x=>x.kind==='api-start');assert.deepEqual(starts.map(a=>[a.seq,a.name]),t.apis.map(a=>[a.seq,a.name]),'journal starts');
 let time=-Infinity;for(const e of journal){assert.ok(Number.isFinite(e.hostMs)&&e.hostMs>=time,'journal monotonic');time=e.hostMs;}
 if(t.primary){
  assert.deepEqual(primary,{id:t.id,plannedId:t.plannedId,attempt:t.attempt,head:t.head,tree:t.tree,contractSha256:t.contractSha256,primary:t.primary},'immutable primary file');
  const persist=journal.filter(e=>e.kind==='primary-persisted');assert.equal(persist.length,1,'one primary persistence');assert.equal(persist[0].sha256,t.primaryFile.sha256,'primary persistence digest');
  const at=journal.indexOf(persist[0]),p=journal.findIndex(e=>e.kind==='api-end'&&e.name==='primary.getAttribute');assert.equal(at,p+1,'persist directly after primary');
  const collect=journal.findIndex(e=>e.kind==='api-start'&&e.name==='boundary.collect');if(collect>=0)assert.ok(collect>at,'collection after persistence');
 }else assert.equal(primary,null,'missing primary');
}
export async function auditBoundaryDirectory(root,{sourceRoot,buildRoot,head,tree}){
 assert.ok(sourceRoot&&buildRoot&&head&&tree,'independent source/build roots and HEAD/tree required');
 const read=async n=>JSON.parse(await fs.readFile(path.join(root,n),'utf8'));
 const r=await read('registration.json');assert.equal(r.mode,'validation');assert.equal(r.head,head);assert.equal(r.tree,tree);assert.equal(r.productionTrialsExecuted,0);
 assert.deepEqual(r.contract,boundaryContract,'formal contract');assert.equal(r.contractSha256,digest(JSON.stringify(boundaryContract)),'contract hash');
 assert.deepEqual(r.slots,boundaryPlan().map(p=>({...p,status:'NOT_EXECUTED'})),'all 108 unexecuted production slots retained');
 const required=['scripts/phase7d-boundary-plan.mjs','scripts/phase7d-boundary-contract.mjs','scripts/phase7d-boundary-instrument.mjs','scripts/diagnose-phase7d-boundary.mjs','scripts/phase7d-api-plan.mjs','scripts/phase7d-api-trace-spec.mjs','scripts/audit-phase7d-boundary.mjs','scripts/prepare-phase7d-boundary.mjs'];
 for(const file of required)assert.ok(r.sourceHashes[file],'required executable binding '+file);
 await verifyBoundaryBytes(sourceRoot,r.sourceHashes);
 const bb=await fs.readFile(path.join(root,'build-manifest.json'));assert.equal(digest(bb),r.buildManifestSha256,'original build manifest');const b=JSON.parse(bb);
 assert.equal(b.head,head);assert.equal(b.tree,tree);assert.ok(['A','B','C'].includes(b.group));assert.equal(b.success,true);assert.equal(b.originalSourcePreserved,true);
 await verifyBoundaryBytes(sourceRoot,b.sourceHashes);await verifyBoundaryBytes(buildRoot,b.outputHashes);
 async function names(dir,prefix=''){let result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())result.push(...await names(path.join(dir,e.name),name+'/'));else{assert.ok(e.isFile(),'regular file');result.push(name);}}return result.sort();}
 assert.deepEqual(await names(buildRoot),Object.keys(b.outputHashes).sort(),'entire actual build inventory');
 assert.ok(Array.isArray(r.validationPlan)&&r.validationPlan.length>0&&r.validationPlan.length<=12,'validation selection required');assert.equal(new Set(r.validationPlan.map(p=>p.id)).size,r.validationPlan.length,'validation unique');
 assert.equal(r.expectedAttempts,r.validationPlan.length,'registered attempt count');
 for(const [i,p]of r.validationPlan.entries())assert.deepEqual(p,{...boundaryPlan().find(x=>x.id===p.id),validationId:'validation-'+p.id,attempt:'attempt-'+String(i+1).padStart(5,'0')},'registered validation allocation');
 const entries=(await fs.readdir(root,{withFileTypes:true})).filter(e=>e.isDirectory()&&e.name.startsWith('attempt-')).map(e=>e.name).sort();assert.ok(entries.length,'no validation attempts');
 assert.ok(entries.length<=r.validationPlan.length,'unregistered attempts');
 const audits=[];
 for(const [i,dir]of entries.entries()){
  assert.equal(dir,`attempt-${String(i+1).padStart(5,'0')}`,'attempt history gap/replacement');const ar=path.join(root,dir),a=JSON.parse(await fs.readFile(path.join(ar,'attempt.json'),'utf8'));
  assert.equal(a.plannedId,r.validationPlan[i].id,'registered validation order');
  assert.equal(a.head,head);assert.equal(a.tree,tree);assert.equal(a.contractSha256,r.contractSha256);assert.equal(a.buildManifestSha256,r.buildManifestSha256);
  const planned=boundaryPlan().find(p=>p.id===a.plannedId);assert.ok(planned,'registered planned id');assert.equal(a.validationId,'validation-'+planned.id);assert.equal(planned.group,b.group,'build group');
  const exists=await fs.stat(path.join(ar,'trial.json')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
  if(!exists){const pb=await fs.readFile(path.join(ar,'primary.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});const p=pb?JSON.parse(pb):null;if(p){assert.equal(p.id,a.validationId,'interrupted primary id');assert.equal(p.plannedId,a.plannedId);assert.equal(p.attempt,dir);assert.equal(p.head,head);assert.equal(p.tree,tree);assert.equal(p.contractSha256,r.contractSha256);assert.equal(p.primary.verdict,p.primary.state===boundaryTargets[planned.case].expected?'PASS':'FAIL','interrupted primary oracle');}audits.push({attempt:dir,status:'INTERRUPTED',primary:p?.primary.verdict??'NOT_TESTED',evidence:'INCOMPLETE',primaryTraceVerification:'UNKNOWN'});continue;}
  const m=JSON.parse(await fs.readFile(path.join(ar,'manifest.json'),'utf8'));await verifyBoundaryBytes(ar,m.files);
  assert.deepEqual((await fs.readdir(ar)).filter(n=>n!=='manifest.json').sort(),Object.keys(m.files).sort(),'attempt inventory');
  for(const n of ['attempt.json','trial.json','journal.jsonl'])assert.ok(m.files[n],'required evidence '+n);
  const t=JSON.parse(await fs.readFile(path.join(ar,'trial.json'),'utf8'));assert.equal(t.attempt,dir);assert.equal(t.head,head);assert.equal(t.tree,tree);assert.equal(t.contractSha256,r.contractSha256);assert.equal(t.buildSha256,r.buildManifestSha256);
  const verdict=validateBoundaryTrial(t,planned),journal=(await fs.readFile(path.join(ar,'journal.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  const primary=t.primary?JSON.parse(await fs.readFile(path.join(ar,'primary.json'),'utf8')):null;
  if(t.primary){assert.equal(t.primaryFile.name,'primary.json');assert.equal(t.primaryFile.sha256,m.files['primary.json']);}
  validateAttemptJournal(t,journal,primary);
  for(const f of t.files)assert.equal(f.sha256,m.files[f.name],'trial file binding');
  const trace=t.files.find(f=>f.kind==='trace');if(verdict.evidence==='COMPLETE')assert.ok(trace,'complete trace required');
  const raw=trace?validateBoundaryTrace(t,readBoundaryTrace(path.join(ar,trace.name))):{status:'NOT_TESTED'};
  audits.push({attempt:dir,...verdict,raw});
 }
 for(let i=entries.length;i<r.validationPlan.length;i++)audits.push({plannedId:r.validationPlan[i].id,status:'NOT_EXECUTED',evidence:'INCOMPLETE'});
 return {audit:audits.every(a=>a.evidence==='COMPLETE')?'PASS':'PARTIAL',head,tree,productionTrialsExecuted:0,attempts:audits,auditorSha256:digest(await fs.readFile(new URL(import.meta.url))),authenticity:'Separate supplied source/build bytes compared. This does not prove provenance against coordinated tampering or establish instrument neutrality.',cause:'UNKNOWN'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{const result=await auditBoundaryDirectory(path.resolve(process.argv[2]),{sourceRoot:process.env.BOUNDARY_SOURCE_ROOT,buildRoot:process.env.BOUNDARY_BUILD_DIR,head:process.env.EXPECTED_HEAD,tree:process.env.EXPECTED_TREE});console.log(JSON.stringify(result,null,2));if(result.audit!=='PASS')process.exitCode=1;}catch(e){console.error(JSON.stringify({audit:'FAIL',error:String(e.stack??e)}));process.exitCode=1;}
}






