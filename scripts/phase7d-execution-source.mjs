/** Execution-time source bytes, distinct from Git objects and line-ending correspondence. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const hash=(b,algorithm='sha256')=>createHash(algorithm).update(b).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:16*1024*1024});
const roots=['app/','public/','scripts/','tests/','.github/workflows/'];
const configs=['.gitattributes','package.json','package-lock.json','eslint.config.mjs','next.config.ts','tsconfig.json'];
const required=['package.json','package-lock.json','scripts/phase7d-execution-source.mjs','scripts/phase7d-boundary-contract.mjs','scripts/phase7d-safety-browser.mjs','.github/workflows/phase7d-safety-validation.yml'];
const scopes=['safety-contracts','isolated-browser'];
const safe=p=>assert.ok(p&&!p.includes('\\')&&!path.posix.isAbsolute(p)&&!p.split('/').some(x=>x==='..'||x==='.'),'unsafe relative path');
function regular(root,p){safe(p);let at=root;for(const bit of p.split('/')){at=path.join(at,bit);assert.ok(!fs.lstatSync(at).isSymbolicLink(),'symlink input rejected');}assert.ok(fs.statSync(at).isFile());return fs.readFileSync(at);}
function tracked(root,head){assert.match(head,/^[a-f0-9]{40}$/);const result={};for(const item of git(root,'ls-tree','-rz',head).toString().split('\0').filter(Boolean)){const tab=item.indexOf('\t'),file=item.slice(tab+1),[mode,type,blob]=item.slice(0,tab).split(' ');if(!configs.includes(file)&&!roots.some(p=>file.startsWith(p)))continue;safe(file);assert.equal(type,'blob');assert.ok(['100644','100755'].includes(mode));result[file]={blob,mode};}for(const file of required)assert.ok(result[file],'required execution source '+file);return result;}
function relation(raw,original){if(raw.equals(original))return 'RAW_IDENTICAL';const text=original.toString('utf8');if(Buffer.from(text).equals(original)&&!text.includes('\r')&&!text.includes('\0')&&raw.equals(Buffer.from(text.replaceAll('\n','\r\n'))))return 'LF_TO_CRLF_ONLY';throw Error('checkout differs from fixed Git bytes beyond permitted LF-to-CRLF transformation');}
function walk(root,prefix=''){return fs.readdirSync(root).sort().flatMap(n=>{const p=path.join(root,n),s=fs.lstatSync(p);assert.ok(!s.isSymbolicLink(),'saved symlink rejected');return s.isDirectory()?walk(p,prefix+n+'/'):[prefix+n];});}
function workspaceSet(root,paths){const actual=[];for(const prefix of roots){const dir=path.join(root,prefix);if(fs.existsSync(dir))actual.push(...walk(dir,prefix));}for(const p of configs)if(fs.existsSync(path.join(root,p)))actual.push(p);assert.deepEqual(actual.sort(),paths,'checkout execution file set (extra or missing)');}
const write=(p,b)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b,{flag:'wx'});};
export function captureExecutionSource(root,head,dest,{scope}={}){
 assert.ok(scopes.includes(scope),'fixed execution scope');assert.equal(git(root,'rev-parse','HEAD').toString().trim(),head,'checkout HEAD');
 const index=tracked(root,head),paths=Object.keys(index).sort();workspaceSet(root,paths);fs.mkdirSync(dest,{recursive:false});
 const manifest={schema:1,scope,head,tree:git(root,'rev-parse',head+'^{tree}').toString().trim(),capturedAt:new Date().toISOString(),platform:process.platform,node:process.version,paths,files:{},semantics:'saved checkout bytes before execution; Git blobs and raw line-ending relation are separate; no historical backfill'};
 for(const p of paths){const original=git(root,'cat-file','blob',index[p].blob),raw=regular(root,p);assert.equal(hash(Buffer.concat([Buffer.from(`blob ${original.length}\0`),original]),'sha1'),index[p].blob,'Git blob object format');const mapping=relation(raw,original);write(path.join(dest,'files',p),raw);write(path.join(dest,'git-blobs',p),original);manifest.files[p]={...index[p],gitSize:original.length,gitSha256:hash(original),rawSize:raw.length,rawSha256:hash(raw),relation:mapping};}
 write(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export function auditExecutionSource(root,head,dest,{scope,verifyCheckout=true}={}){
 assert.ok(scopes.includes(scope));const m=JSON.parse(regular(dest,'manifest.json'));assert.equal(m.schema,1);assert.equal(m.scope,scope);assert.equal(m.head,head);assert.equal(m.tree,git(root,'rev-parse',head+'^{tree}').toString().trim());
 const index=tracked(root,head),paths=Object.keys(index).sort();if(verifyCheckout)workspaceSet(root,paths);assert.deepEqual(m.paths,paths,'fixed execution target set');assert.deepEqual(Object.keys(m.files).sort(),paths,'manifest file set');assert.deepEqual(walk(dest).sort(),['manifest.json',...paths.flatMap(p=>['files/'+p,'git-blobs/'+p])].sort(),'saved actual file set');
 for(const p of paths){const original=git(root,'cat-file','blob',index[p].blob),savedGit=regular(dest,'git-blobs/'+p),raw=regular(dest,'files/'+p);assert.deepEqual(savedGit,original,'saved Git blob bytes');assert.equal(hash(Buffer.concat([Buffer.from(`blob ${savedGit.length}\0`),savedGit]),'sha1'),index[p].blob);const expected={...index[p],gitSize:original.length,gitSha256:hash(original),rawSize:raw.length,rawSha256:hash(raw),relation:relation(raw,original)};assert.deepEqual(m.files[p],expected,'saved source manifest');if(verifyCheckout)assert.deepEqual(regular(root,p),raw,'actual execution checkout changed after capture');}
 return {status:'PASS',head,tree:m.tree,scope,count:paths.length,sourceBodies:'READ_BACK',rawGitEqual:Object.values(m.files).every(f=>f.relation==='RAW_IDENTICAL'),crlfMapped:Object.values(m.files).filter(f=>f.relation==='LF_TO_CRLF_ONLY').length,platform:m.platform,scopeLimit:'fixed tracked execution inputs; dependencies identified by package-lock, not dependency-package byte snapshot; build and HTTP bytes require separate evidence'};
}
export function compareExecutionSources(a,b){assert.equal(a.head,b.head);assert.equal(a.tree,b.tree);assert.deepEqual(a.paths,b.paths);const rawEqual=a.paths.every(p=>a.files[p].rawSha256===b.files[p].rawSha256);return {rawByteEquality:rawEqual?'PASS':'FAIL',gitByteCorrespondence:a.paths.every(p=>a.files[p].gitSha256===b.files[p].gitSha256)?'PASS':'FAIL'};}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const [mode,root,head,dest,scope,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.ok(['capture','audit'].includes(mode));console.log(JSON.stringify(mode==='capture'?captureExecutionSource(path.resolve(root),head,path.resolve(dest),{scope}):auditExecutionSource(path.resolve(root),head,path.resolve(dest),{scope}),null,2));}catch(e){console.error(String(e.stack||e));process.exitCode=1;}}
