/** Offline only: immutable API primary ledger and explicit observation gaps. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {digest,validateObservationReport,validateObservationTrial,validateObservationTrace} from './phase7d-api-contract.mjs';
import {observationPolicy} from './phase7d-api-plan.mjs';
import {traceOperations} from './phase7d-api-trace-spec.mjs';
export const observationStates={observed:'OBSERVED',notReached:'NOT_REACHED',noRecorder:'NO_RECORDING_MECHANISM',missing:'MISSING_RECORD',unknown:'INDETERMINATE'};
export function apiTrialDiagnosis(t,planned,trace){
 validateObservationTrial(t,planned);assert.ok(trace,'required original trace record');const raw=validateObservationTrace(t,trace);
 if(t.prefixFailure)assert.equal(t.prefixFailure.expected,{'keyboard-prefix':'dismissed','undo-prefix':'idle','prefix-start':'Loading','cancel-prefix':'Cancelled','success-prefix':'Success'}[t.prefixFailure.label],'fixed prefix oracle');
 assert.equal(trace.contexts?.length,1,'one original browser context');const context=trace.contexts[0];assert.equal(context.browserName,t.engine,'trace engine');assert.deepEqual(context.options.viewport,t.viewport,'trace viewport');assert.equal(context.options.reducedMotion,t.motion);assert.equal(context.options.hasTouch,true);
 let end=-Infinity;const ids=new Set();for(const c of trace.calls){assert.ok(c.after&&!ids.has(c.before.callId),'unique completed raw call');ids.add(c.before.callId);assert.ok(Number.isFinite(c.before.startTime)&&Number.isFinite(c.after.endTime),'raw time information');assert.ok(c.before.startTime>=end&&c.after.endTime>=c.before.startTime,'raw observation time order');end=c.after.endTime;}
 const specs=traceOperations(t,t.apis.map(a=>a.name));for(const [i,c]of trace.calls.entries())assert.equal(Boolean(c.after.error),t.apis.find(a=>a.name===specs[i].name).status==='ERROR','raw API status reconciliation');
 const primary=t.apis.find(a=>a.name==='primary.getAttribute'),followup=t.apis.find(a=>a.name==='followup.getAttribute');
 const primaryIndex=t.apis.findIndex(a=>a.name==='primary.getAttribute');
 const later=primary?t.apis.slice(primaryIndex+1).filter(a=>!['context.tracing.stop','context.close','browser.close'].includes(a.name)):[];
 const interventions=later.filter(a=>a.name!=='followup.getAttribute');
 const input=t.apis.find(a=>a.name===(t.case==='swipe'?'target.mouse.up':'target.Replay.second.click'));
 const points=t.apis.filter(a=>a.name.endsWith('.getAttribute')).map(a=>({seq:a.seq,api:a.name,status:a.status,value:a.result??null,hostStartMs:a.hostStartMs,hostEndMs:a.hostEndMs,commandedVirtualDateMs:a.commandedVirtualDateMs,sideOfPrimary:primary?(a.seq<primary.seq?'BEFORE':a.seq===primary.seq?'PRIMARY':'AFTER'):'PREFIX_BEFORE_UNREACHED_PRIMARY'}));
 return {id:t.id,plannedOrder:t.order,engine:t.engine,case:t.case,group:t.group,iteration:t.iteration,head:t.head,tree:t.tree,primary:t.primary?Object.freeze({...t.primary}):null,primaryFile:t.primaryFile??null,product:t.productStatus,diagnostic:t.diagnosticStatus,prefixFailure:t.prefixFailure??null,followup:t.followup,
  category:!t.primary?(primary?'NOT_TESTED_PRIMARY_VALUE_UNAVAILABLE':'NOT_TESTED_PRIMARY_UNREACHED'):t.primary.verdict==='FAIL'&&t.followup?.verdict==='PASS'?'PRIMARY_FAIL_LATER_TERMINAL':'RECORDED_PRIMARY',
  stages:{inputCommand:input?(input.status==='OK'?observationStates.observed:observationStates.unknown):observationStates.notReached,eventCallback:observationStates.noRecorder,stateUpdateRequest:observationStates.noRecorder,reactCommit:observationStates.noRecorder,domReflectionEvent:observationStates.noRecorder,primary:primary?(primary.status==='OK'?observationStates.observed:observationStates.unknown):observationStates.notReached,followup:followup?(followup.status==='OK'?observationStates.observed:observationStates.unknown):observationStates.notReached},domReads:points,recordedEventKinds:[...new Set((trace.events??[]).map(e=>e.class+'.'+e.method))],
  postPrimaryInterventions:interventions.map(a=>({seq:a.seq,name:a.name,result:a.result??null,hostStartMs:a.hostStartMs,hostEndMs:a.hostEndMs})),
  clock:{commandedLedgerSameAfterPrimary:primary&&followup?primary.commandedVirtualDateMs===followup.commandedVirtualDateMs:null,directBrowserClockAtPrimary:'NOT_RECORDED',crossClockConversion:'NOT_ESTABLISHED',hostPrimaryEndToFollowupEndMs:primary&&followup?followup.hostEndMs-primary.hostEndMs:null},rawTraceAudit:raw,
  conclusions:{rootCause:'UNKNOWN',postPrimaryInterventionCannotExplainItsOwnEarlierPrimary:true,followupReplacesPrimary:false,callbackAbsenceProven:false,measurementNeutrality:'UNKNOWN',domValueReadIsNotCommitTimestamp:true}};
}
export function analyzeApiPackage(pack,expected){
 assert.equal(pack.kind,'READ_ONLY_ORIGINAL_ZIP');assert.equal(pack.zip.bytes,expected.size);assert.equal(pack.zip.sha256,expected.sha256);assert.equal(pack.zip.crc,'PASS');
 const reportNames=Object.keys(pack.files).filter(n=>n==='report.json'||n.endsWith('/report.json'));assert.equal(reportNames.length,1,'one original report');const root=reportNames[0].slice(0,-'report.json'.length),file=n=>{const f=pack.files[root+n];assert.ok(f,'missing original evidence '+n);return f;};
 const r=file('report.json').json,m=file('manifest.json').json;assert.equal(m.report.name,'report.json');assert.equal(m.report.sha256,file('report.json').sha256);assert.deepEqual(m.files,r.files);assert.equal(new Set(r.files.map(f=>f.name)).size,r.files.length);
 for(const f of r.files){assert.ok(f.name&&!f.name.includes('/')&&!f.name.includes('\\'),'safe original basename');assert.equal(file(f.name).sha256,f.sha256,'original internal manifest '+f.name);}
 const expectedNames=[...r.files.map(f=>root+f.name),root+'report.json',root+'manifest.json',root+'independent-audit.json','observation-copy/diagnostic-build.json'];assert.deepEqual(Object.keys(pack.files).sort(),expectedNames.sort(),'entire original artifact inventory');
 const summary=validateObservationReport(r,{head:expected.head,tree:expected.tree,engines:[expected.engine]});assert.equal(r.runnerId,`github:${expected.run}:${expected.attempt}:diagnose:${expected.engine}`,'fixed run/attempt runner');
 const plan=file('plan.json');assert.equal(plan.sha256,r.registration.sha256);assert.equal(file('plan.sha256').text.trim(),plan.sha256+'  plan.json');assert.deepEqual(plan.json.plan,r.plan);assert.equal(plan.json.planSha256,r.planSha256);assert.equal(plan.json.head,r.head);assert.equal(plan.json.tree,r.tree);assert.deepEqual(plan.json.policy,observationPolicy);
 assert.equal(file('diagnostic-build.json').sha256,r.buildManifest.sha256);assert.deepEqual(file('diagnostic-build.json').json,r.buildManifest.data);
 assert.equal(pack.files['observation-copy/diagnostic-build.json'].sha256,file('diagnostic-build.json').sha256,'uploaded build sidecar byte identity');
 const rows=r.trials.map((t,i)=>{
  assert.deepEqual(file(t.id+'.json').json,t,'raw trial/summary equality');
  if(t.primary){assert.equal(file(t.primaryFile.name).sha256,t.primaryFile.sha256);assert.deepEqual(file(t.primaryFile.name).json,{id:t.id,head:t.head,tree:t.tree,planSha256:t.planSha256,primary:t.primary},'immutable primary original body');}
  for(const f of t.files)assert.ok(r.files.some(x=>x.name===f.name&&x.sha256===f.sha256&&x.kind===f.kind),'trial file manifest membership');
  const f=t.files.find(f=>f.kind==='trace');assert.ok(f,'original trace retained also for incomplete trials');return apiTrialDiagnosis(t,r.plan[i],pack.traces[root+f.name]);
 });
 const groups=Object.fromEntries(['N0','N1','D1','S1'].map(g=>[g,{PASS:rows.filter(t=>t.group===g&&t.product==='PASS').length,FAIL:rows.filter(t=>t.group===g&&t.product==='FAIL').length,NOT_TESTED:rows.filter(t=>t.group===g&&t.product==='NOT_TESTED').length}]));
 return {schema:1,kind:'OFFLINE_API_DIAGNOSIS',original:{run:expected.run,attempt:expected.attempt,head:r.head,tree:r.tree,zip:pack.zip,runnerId:r.runnerId,runnerSha256:r.runnerSha256,buildManifestSha256:r.buildManifest.sha256},evidenceAudit:'PASS',meaning:'Original byte/contract/trace audit is not product PASS.',originalAudit:{sha256:file('independent-audit.json').sha256,claim:file('independent-audit.json').json},summary,groups,policy:r.policy,rows,sourceClaims:{sourceHashes:r.buildManifest.data.sourceHashes,servedBuildBodies:'NOT_SAVED_IN_THIS_API_ARTIFACT',sourceBodyExecutionProof:'NOT_ESTABLISHED_BY_HASH_LIST',internalInstrumentation:false},rootCause:'UNKNOWN',browserLaunches:0,production108:'NO',observerNeutrality:'UNKNOWN',analyzerSha256:digest(fs.readFileSync(fileURLToPath(import.meta.url)))};
}
export function verifyApiSourceClaims(repo,result){
 const {head,tree,runnerSha256}=result.original,git=(...args)=>execFileSync('git',['-C',repo,...args],{maxBuffer:256*1024*1024});assert.equal(git('rev-parse',head+'^{tree}').toString().trim(),tree,'original source fixed tree');
 const index={},types=new Map([[head,'commit'],[tree,'tree']]);for(const row of git('ls-tree','-rtz',head).toString().split('\0').filter(Boolean)){const tab=row.indexOf('\t'),p=row.slice(tab+1),[mode,type,oid]=row.slice(0,tab).split(' ');assert.ok(['blob','tree'].includes(type));types.set(oid,type);if(type==='blob'){assert.ok(['100644','100755'].includes(mode));index[p]=oid;}}
 const claimed=result.sourceClaims.sourceHashes;assert.deepEqual(Object.keys(claimed).sort(),Object.keys(index).sort(),'fixed full source claim set');
 const ids=[...types.keys()],bytes=execFileSync('git',['-C',repo,'cat-file','--batch'],{input:ids.join('\n')+'\n',maxBuffer:256*1024*1024});const bodies=new Map();let offset=0;
 for(const id of ids){const end=bytes.indexOf(10,offset),[oid,type,n]=bytes.subarray(offset,end).toString().split(' '),size=Number(n);assert.equal(oid,id);assert.equal(type,types.get(id));assert.ok(Number.isSafeInteger(size)&&size>=0&&end>=offset);offset=end+1;const body=bytes.subarray(offset,offset+size);assert.equal(body.length,size);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`${type} ${size}\0`),body])).digest('hex'),oid,'Git object framing');bodies.set(id,body);offset+=size;assert.equal(bytes[offset++],10);}
 assert.equal(offset,bytes.length);
 for(const [p,oid]of Object.entries(index))assert.equal(digest(bodies.get(oid)),claimed[p],'original fixed Git source claim '+p);
 assert.equal(claimed['scripts/diagnose-phase7d-api.mjs'],runnerSha256,'original executed runner identity');
 return {status:'PASS',head,tree,treeObjects:[...types.values()].filter(t=>t==='tree').length,claimedSourceFiles:Object.keys(index).length,runnerSha256,scope:'Hash claims correspond to fixed Git source, not proof of captured source/build/HTTP execution bodies.'};
}
export function readOriginalApiArchive(file){return JSON.parse(execFileSync(process.env.PYTHON||'python',[fileURLToPath(new URL('./read-phase7d-offline-archive.py',import.meta.url)),file],{encoding:'utf8',maxBuffer:128*1024*1024}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const [archive,identityFile,destination,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.ok(archive&&identityFile&&destination,'archive, external identity JSON and exclusive output required');const expected=JSON.parse(fs.readFileSync(identityFile,'utf8'));const result=analyzeApiPackage(readOriginalApiArchive(archive),expected);result.gitSourceClaims=verifyApiSourceClaims(expected.gitRepository||process.cwd(),result);fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({evidenceAudit:result.evidenceAudit,summary:result.summary,groups:result.groups,rootCause:result.rootCause}));}catch(e){console.error(e.stack||e);process.exitCode=1;}
}
