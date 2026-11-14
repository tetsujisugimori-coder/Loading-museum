import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {digest,validateObservationReport,validateObservationTrace} from './phase7d-api-contract.mjs';
import {verifyCausalFiles} from './phase7d-causal-contract.mjs';
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!process.env.EXPECTED_HEAD||!process.env.EXPECTED_TREE)throw Error('Expected HEAD/TREE and evidence directory required');
const bytes=await fs.readFile(path.join(root,'report.json')),r=JSON.parse(bytes),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json')));
assert.equal(manifest.report.name,'report.json');assert.equal(manifest.report.sha256,digest(bytes));assert.deepEqual(manifest.files,r.files);
const summary=validateObservationReport(r,{head:process.env.EXPECTED_HEAD,tree:process.env.EXPECTED_TREE,engines:(process.env.BROWSERS||'webkit,chromium').split(','),clean:process.env.REQUIRE_CLEAN!=='0'});
await verifyCausalFiles(root,r.files);
const buildBytes=await fs.readFile(path.join(root,'diagnostic-build.json'));assert.equal(digest(buildBytes),r.buildManifest.sha256,'original build manifest digest');assert.deepEqual(JSON.parse(buildBytes),r.buildManifest.data);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),r.head,'audit checkout HEAD');
assert.equal(digest(execFileSync('git',['show',r.head+':scripts/diagnose-phase7d-api.mjs'])),r.runnerSha256,'actual runner hash');
for(const [file,sha]of Object.entries(r.buildManifest.data.sourceHashes))assert.equal(digest(execFileSync('git',['show',r.head+':'+file],{maxBuffer:32*1024*1024})),sha,'committed source '+file);
if(process.env.DIAGNOSTIC_BUILD_DIR)for(const [file,sha]of Object.entries(r.buildManifest.data.outputHashes))assert.equal(digest(await fs.readFile(path.join(process.env.DIAGNOSTIC_BUILD_DIR,file))),sha,'actual output '+file);

const plan=JSON.parse(await fs.readFile(path.join(root,'plan.json')));assert.deepEqual(plan.plan,r.plan);assert.equal(plan.planSha256,r.planSha256);assert.deepEqual(plan.policy,r.policy);assert.equal(plan.head,r.head);assert.equal(plan.tree,r.tree);assert.equal(digest(await fs.readFile(path.join(root,'plan.json'))),r.registration.sha256);assert.equal((await fs.readFile(path.join(root,'plan.sha256'),'utf8')).trim(),r.registration.sha256+'  plan.json');
assert.equal(plan.environment.runnerId,r.runnerId);assert.equal(plan.environment.buildSha256,r.buildManifest.sha256);assert.equal(plan.environment.runnerSha256,r.runnerSha256);assert.equal(plan.environment.playwrightVersion,r.playwrightVersion);assert.deepEqual(plan.environment.os,r.os);assert.ok(Date.parse(plan.registeredAt)<=Date.parse(r.trials[0].started),'registration before first trial');
const audits=[];
for(const t of r.trials) {
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,`${t.id}.json`))),t,'raw trial/report equality');
  if(t.primary){const pb=await fs.readFile(path.join(root,t.primaryFile.name));assert.equal(digest(pb),t.primaryFile.sha256);assert.deepEqual(JSON.parse(pb),{id:t.id,head:t.head,tree:t.tree,planSha256:t.planSha256,primary:t.primary},'immutable original primary file');}
  for(const f of t.files)assert.ok(r.files.some(x=>JSON.stringify(x)===JSON.stringify(f)),'trial asset binding');
  const trace=t.files.find(f=>f.kind==='trace');
  if(trace) {
    const raw=JSON.parse(execFileSync('python3',['-c',`import json,sys,zipfile
z=zipfile.ZipFile(sys.argv[1]); rows=[]
for n in z.namelist():
 if n.endswith('.trace'): rows.extend(json.loads(s) for s in z.read(n).decode().splitlines())
before=[x for x in rows if x.get('type')=='before']; after={x['callId']:x for x in rows if x.get('type')=='after'}
print(json.dumps({'calls':[{'before':x,'after':after.get(x['callId'])} for x in before], 'hasAutomaticImages':any(x.get('type')=='screencast-frame' for x in rows) or any(n.endswith('.jpeg') for n in z.namelist()), 'hasSnapshots':any(x.get('type')=='frame-snapshot' for x in rows)}))`,path.join(root,trace.name)],{encoding:'utf8',maxBuffer:32*1024*1024}));
    audits.push({id:t.id,...validateObservationTrace(t,raw)});
  }
}
const result={auditorSha256:digest(await fs.readFile(new URL(import.meta.url))),audit:'PASS',...summary,head:r.head,tree:r.tree,runnerId:r.runnerId,rawTraceAudits:audits,meaning:'Technical evidence audit, not product acceptance. Primary FAIL remains FAIL.'};
await fs.writeFile(path.join(root,'independent-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(summary.complete!==summary.trials)process.exitCode=1;
