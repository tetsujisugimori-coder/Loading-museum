/** Read actual preserved bytes independently; no browser execution. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {instrumentBoundary,applyBoundaryFault} from './phase7d-boundary-instrument.mjs';import {pathToFileURL} from 'node:url';
import {validateIsolatedPlan,validateIsolatedResults,classifyControlledCase} from './phase7d-isolated-browser-contract.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const resource=url=>{let p=decodeURIComponent(new URL(url).pathname).replace(/^\/Loading-museum(?=\/)/,'').replace(/^\//,'');if(!p||p.endsWith('/'))p+='index.html';assert.ok(!p.split('/').includes('..'));return p;};
export function auditIsolatedBuilds(plan){
 assert.deepEqual(Object.keys(plan.builds).sort(),['normal','update-omission'],'fixed two build conditions');
 const git=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024});const tracked=git('ls-tree','-rz','--name-only',plan.head).toString().split('\0').filter(Boolean).sort();
 for(const [kind,build] of Object.entries(plan.builds)){
  const manifestBytes=fs.readFileSync(path.join(build.dir,'boundary-build.json'));assert.equal(sha(manifestBytes),build.manifestSha256);const manifest=JSON.parse(manifestBytes);assert.equal(manifest.head,plan.head);assert.equal(manifest.tree,plan.tree);assert.equal(manifest.success,true);assert.equal(manifest.schema,1);assert.equal(manifest.group,'C');assert.equal(manifest.mode,'validation-only');assert.equal(manifest.fault?.fault,kind==='update-omission'?'update-omission':undefined);
  assert.deepEqual(Object.keys(manifest.sourceHashes).sort(),tracked,'isolated copied source set');
  const actualSources=[];function sourceWalk(d,p=''){for(const n of fs.readdirSync(d)){const rel=p+n;if(!p&&['node_modules','.next','out','boundary-build.json','build.log','tsconfig.tsbuildinfo','next-env.d.ts'].includes(n))continue;const f=path.join(d,n),st=fs.lstatSync(f);assert.ok(!st.isSymbolicLink(),'unexpected isolated source symlink');if(st.isDirectory())sourceWalk(f,rel+'/');else actualSources.push(rel);}}sourceWalk(build.dir);assert.deepEqual(actualSources.sort(),tracked,'unregistered isolated source file');
  const generatedTypes={};for(const rel of ['next-env.d.ts','tsconfig.tsbuildinfo']){const f=path.join(build.dir,rel);if(fs.existsSync(f)){const b=fs.readFileSync(f);generatedTypes[rel]={size:b.length,sha256:sha(b)};}}assert.deepEqual(generatedTypes,build.generatedTypes||{},'fixed generated type/build metadata');
  assert.deepEqual(manifest.outputHashes,Object.fromEntries(Object.entries(build.files).map(([p,v])=>[p,v.sha256])),'manifest output hashes vs fixed output files');
  for(const [rel,hash]of Object.entries(manifest.sourceHashes)){const original=git('show',plan.head+':'+rel);assert.equal(sha(original),hash,'manifest source hash vs Git actual blob');let expected=original;if(['app/components/interactive-motion/GestureExhibits.tsx','app/components/interactive-motion/ReactiveExhibits.tsx'].includes(rel)){const target=rel.includes('Gesture')?'swipe':'status';let transformed=instrumentBoundary(original.toString(),target,'C').source;if(kind==='update-omission'&&target==='status')transformed=applyBoundaryFault(transformed,target,'update-omission').source;expected=Buffer.from(transformed);}assert.deepEqual(fs.readFileSync(path.join(build.dir,rel)),expected,'independently transformed Git bytes vs actual isolated source');const b=fs.readFileSync(path.join(build.dir,rel));assert.equal(sha(b),manifest.transformedHashes[rel]||hash,'actual isolated source: '+rel);}
  const actual=[];function visit(d,p=''){for(const n of fs.readdirSync(d)){const f=path.join(d,n);if(fs.statSync(f).isDirectory())visit(f,p+n+'/');else actual.push(p+n);}}visit(path.join(build.dir,'out'));assert.deepEqual(actual.sort(),Object.keys(build.files).sort(),'build output set');
  for(const [rel,item]of Object.entries(build.files)){const b=fs.readFileSync(path.join(build.dir,'out',rel));assert.deepEqual({size:b.length,sha256:sha(b)},item,'actual output bytes: '+rel);}
 }
 return true;
}
export function auditIsolatedDirectory(dest){
 const plan=read(path.join(dest,'plan.json')),summary=read(path.join(dest,'results.json'));assert.equal(summary.head,plan.head);assert.equal(summary.tree,plan.tree);assert.equal(summary.productionTrialsExecuted,0);validateIsolatedPlan(plan);const counts=validateIsolatedResults(summary.results);
 auditIsolatedBuilds(plan);
 for(const r of summary.results){const dir=path.join(dest,r.id);assert.equal(r.validation,classifyControlledCase(r));
  if(r.primary)assert.deepEqual(read(path.join(dir,'primary.json')),r.primary,'immutable primary differs');else assert.ok(!fs.existsSync(path.join(dir,'primary.json')),'unexpected primary');
  if(r.kind==='save-failure'&&r.attempted){assert.ok(r.persistenceErrors.length);assert.ok(fs.statSync(path.join(dir,'result.json')).isDirectory());}else{const saved=read(path.join(dir,'result.json'));const {validation,...expected}=r;assert.deepEqual(saved,expected);}
  if(r.evidence!=='COMPLETE')continue;
  const build=r.scope==='MODEL_REAL_BROWSER'?plan.fixture:plan.builds[r.kind].files;
  const har=read(path.join(dir,'complete.har'));assert.ok(har.log?.entries.length,'HAR missing');const found=new Map();
  for(const e of har.log.entries){assert.equal(e.response.status,200);const rel=resource(e.request.url);assert.ok(build[rel],'unexpected HAR resource');assert.equal(typeof e.response.content.text,'string');const bytes=Buffer.from(e.response.content.text,e.response.content.encoding==='base64'?'base64':'utf8');assert.deepEqual({size:bytes.length,sha256:sha(bytes)},build[rel]);const disk=fs.readFileSync(path.join(dir,'http',rel));assert.deepEqual(disk,bytes,'HAR/HTTP actual bytes mismatch');found.set(rel,sha(bytes));}
  const captured=new Set();for(const e of r.http){assert.equal(e.status,200);const b=fs.readFileSync(path.join(dir,'http',e.path));assert.deepEqual({size:b.length,sha256:sha(b)},build[e.path]);assert.equal(e.sha256,sha(b));assert.equal(found.get(e.path),e.sha256);captured.add(e.path);}
  assert.deepEqual([...captured].sort(),[...found.keys()].sort());assert.ok([...found.keys()].some(f=>f.endsWith('.js')),'missing JS bytes');
  const files=[];function walk(d,p=''){for(const n of fs.readdirSync(d)){const x=path.join(d,n);if(fs.statSync(x).isDirectory())walk(x,p+n+'/');else files.push(p+n);}}walk(path.join(dir,'http'));assert.deepEqual(files.sort(),[...found.keys()].sort(),'extra/missing HTTP bytes');
  const trace=fs.readFileSync(path.join(dir,'trace.zip'));assert.ok(trace.length>22&&trace.subarray(0,4).equals(Buffer.from([80,75,3,4])),'trace not ZIP');
 }
 return {...counts,head:plan.head,tree:plan.tree,verdicts:summary.results.map(r=>({id:r.id,validation:r.validation,evidence:r.evidence,primary:r.primary?.verdict||'NOT_TESTED'})),scope:'requested HTTP resources and fixed controlled cases; native crash not claimed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{assert.equal(process.argv.length,3);console.log(JSON.stringify(auditIsolatedDirectory(path.resolve(process.argv[2])),null,2));}catch(e){console.error(e.stack||e);process.exitCode=1;}}
