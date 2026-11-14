/** Separate-process provenance audit. Git identity and SHA-256 have distinct meanings. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:8*1024*1024});
export function inventory(root) {
 const result={};
 function walk(dir,prefix='') {for(const name of fs.readdirSync(dir).sort()){const p=path.join(dir,name),rel=prefix+name,s=fs.lstatSync(p);assert.ok(!s.isSymbolicLink(),'symlink rejected');if(s.isDirectory())walk(p,rel+'/');else{assert.ok(s.isFile(),'regular files only');const b=fs.readFileSync(p);result[rel]={size:b.length,sha256:sha256(b)};}}}
 walk(root); return result;
}
export function sourceInventory(root,head) {
 assert.match(head,/^[0-9a-f]{40}$/); const tree=git(root,'rev-parse',head+'^{tree}').toString().trim();
 const files={}; for(const row of git(root,'ls-tree','-rz',head).toString().split('\0').filter(Boolean)) {
  const [meta,file]=row.split('\t'),[mode,type,blob]=meta.split(' '); assert.equal(type,'blob'); assert.ok(['100644','100755'].includes(mode),'nonregular Git source');
  const bytes=git(root,'cat-file','blob',blob),actual=fs.readFileSync(path.join(root,file));
  const objectHash=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');assert.equal(objectHash,blob,'Git object hash');assert.deepEqual(actual,bytes,'source differs from fixed HEAD: '+file);
  files[file]={blob,size:bytes.length,sha256:sha256(bytes)};
 } return {head,tree,files};
}
export function capture(root,head,build,contract,tools) {
 const source=sourceInventory(root,head);const required=[contract,...tools]; for(const f of required)assert.ok(source.files[f],'required source absent: '+f);
 return {schema:1,source,contract,contractSha256:source.files[contract].sha256,tools:Object.fromEntries(tools.map(f=>[f,source.files[f].sha256])),build:inventory(build)};
}
export function audit(root,head,build,manifest,servedRoot,servedManifest,policy) {
 if(policy){assert.equal(manifest.contract,policy.contract,'fixed contract path');assert.deepEqual(Object.keys(manifest.tools).sort(),[...policy.tools].sort(),'required tool set');if(policy.sourceToBuild){assert.deepEqual(Object.keys(manifest.build).sort(),Object.keys(policy.sourceToBuild).sort(),'fixed build set');for(const [out,src] of Object.entries(policy.sourceToBuild)){const b=fs.readFileSync(path.join(root,src));assert.deepEqual(fs.readFileSync(path.join(build,out)),b,'identity-copy build/source bytes');}}}
 assert.equal(manifest.schema,1);assert.deepEqual(manifest.source,sourceInventory(root,head),'HEAD/tree/blob/source binding');
 assert.equal(manifest.contractSha256,manifest.source.files[manifest.contract]?.sha256,'contract hash');assert.ok(Object.keys(manifest.tools).length,'tools required');for(const [f,h] of Object.entries(manifest.tools))assert.equal(h,manifest.source.files[f]?.sha256,'tool identity');
 assert.deepEqual(inventory(build),manifest.build,'build set and bytes');assert.ok(Object.keys(manifest.build).length,'empty build');
 assert.equal(servedManifest.head,head);assert.equal(servedManifest.tree,manifest.source.tree);assert.equal(servedManifest.buildManifestSha256,sha256(JSON.stringify(manifest)),'manifest binding');
 assert.ok(servedManifest.trialId&&servedManifest.environment,'trial/environment required');assert.ok(servedManifest.responses.length,'responses required');
 const paths=new Set(); for(const r of servedManifest.responses){assert.equal(r.status,200);assert.ok(!paths.has(r.path),'duplicate response');paths.add(r.path);assert.ok(r.path&&!r.path.includes('..')&&!path.isAbsolute(r.path),'safe response path');const b=fs.readFileSync(path.join(servedRoot,r.path));assert.deepEqual({size:b.length,sha256:sha256(b)},manifest.build[r.path],'HTTP response/build bytes: '+r.path);assert.equal(r.sha256,sha256(b));assert.ok(new URL(r.url).pathname===('/'+r.path)||(r.path==='index.html'&&new URL(r.url).pathname==='/'),'URL binding');}
 assert.deepEqual(Object.keys(inventory(servedRoot)).sort(),[...paths].sort(),'extra/missing captured execution resource');assert.ok([...paths].some(p=>p.endsWith('.js')),'no JavaScript captured');
 return {status:'PASS',head,tree:manifest.source.tree,sourceCount:Object.keys(manifest.source.files).length,buildCount:Object.keys(manifest.build).length,httpCount:paths.size,scope:'captured HTTP responses only; unrequested build resources not browser execution proof'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const [root,head,build,m,served,s]=process.argv.slice(2);console.log(JSON.stringify(audit(root,head,build,JSON.parse(fs.readFileSync(m)),served,JSON.parse(fs.readFileSync(s)),{contract:'scripts/phase7d-boundary-contract.mjs',tools:['scripts/phase7d-safety-browser.mjs','scripts/phase7d-safety-provenance.mjs','scripts/phase7d-safety-fixture/fixture.js'],sourceToBuild:{'index.html':'scripts/phase7d-safety-fixture/index.html','fixture.js':'scripts/phase7d-safety-fixture/fixture.js'}}),null,2));}
