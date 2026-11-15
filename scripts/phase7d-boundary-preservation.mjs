/** Boundary artifact contract. No browser launch; saved bodies, not flags, are the oracle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {instrumentBoundary,applyBoundaryFault} from './phase7d-boundary-instrument.mjs';
const sha=(b,algorithm='sha256')=>createHash(algorithm).update(b).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024});
const blobCache=new Map();
function loadBlobs(repo,ids){
 const missing=[...new Set(ids)].filter(id=>!blobCache.has(repo+'\0'+id));if(!missing.length)return;
 const data=execFileSync('git',['-C',repo,'cat-file','--batch'],{input:missing.join('\n')+'\n',maxBuffer:256*1024*1024});let offset=0;
 for(const id of missing){const end=data.indexOf(10,offset);assert.ok(end>=offset,'Git batch header');const [oid,type,length]=data.subarray(offset,end).toString().split(' '),size=Number(length);assert.equal(oid,id);assert.equal(type,'blob');assert.ok(Number.isSafeInteger(size)&&size>=0);offset=end+1;assert.ok(offset+size<data.length,'Git batch body');const bytes=Buffer.from(data.subarray(offset,offset+size));assert.equal(sha(Buffer.concat([Buffer.from(`blob ${size}\0`),bytes]),'sha1'),id,'Git batch object framing');blobCache.set(repo+'\0'+id,bytes);offset+=size;assert.equal(data[offset++],10,'Git batch separator');}
 assert.equal(offset,data.length,'Git batch exact consumption');
}
const targets={'app/components/interactive-motion/GestureExhibits.tsx':'swipe','app/components/interactive-motion/ReactiveExhibits.tsx':'status'};
const safe=p=>assert.ok(p&&!p.includes('\\')&&!p.includes(':')&&!path.posix.isAbsolute(p)&&!p.split('/').some(x=>!x||x==='.'||x==='..'),'unsafe saved path');
function read(root,p){safe(p);let at=root;assert.ok(!fs.lstatSync(at).isSymbolicLink(),'symlink root');for(const bit of p.split('/')){at=path.join(at,bit);assert.ok(!fs.lstatSync(at).isSymbolicLink(),'symlink path');}assert.ok(fs.statSync(at).isFile(),'regular saved file');return fs.readFileSync(at);}
const write=(root,p,b)=>{safe(p);fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),b,{flag:'wx'});};
const json=(root,p,d)=>write(root,p,JSON.stringify(d,null,2)+'\n');
function names(root,prefix=''){return fs.readdirSync(root).sort().flatMap(n=>{const p=path.join(root,n),s=fs.lstatSync(p);assert.ok(!s.isSymbolicLink(),'saved symlink');if(s.isDirectory())return names(p,prefix+n+'/');assert.ok(s.isFile(),'saved regular file');return [prefix+n];});}
function index(repo,head,tree){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.equal(git(repo,'rev-parse',head+'^{tree}').toString().trim(),tree,'fixed tree');
 assert.equal(git(repo,'rev-parse','--show-object-format').toString().trim(),'sha1','Git object format');
 const result={};for(const row of git(repo,'ls-tree','-rz',head).toString().split('\0').filter(Boolean)){const tab=row.indexOf('\t'),file=row.slice(tab+1),[mode,type,blob]=row.slice(0,tab).split(' ');safe(file);assert.equal(type,'blob');assert.ok(['100644','100755'].includes(mode));result[file]={mode,blob};}
 for(const p of [...Object.keys(targets),'package.json','package-lock.json','public/.nojekyll','scripts/prepare-phase7d-boundary.mjs','scripts/phase7d-boundary-instrument.mjs','scripts/phase7d-boundary-preservation.mjs'])assert.ok(result[p],'fixed required input '+p);
 loadBlobs(repo,Object.values(result).map(v=>v.blob));return result;
}
function relation(raw,original){if(raw.equals(original))return 'RAW_IDENTICAL';const s=original.toString('utf8');if(Buffer.from(s).equals(original)&&!s.includes('\r')&&!s.includes('\0')&&raw.equals(Buffer.from(s.replaceAll('\n','\r\n'))))return 'LF_TO_CRLF_ONLY';throw Error('execution source differs from fixed Git bytes beyond LF-to-CRLF');}
function transformed(raw,file,group,fault){if(!targets[file])return raw;let s=instrumentBoundary(raw.toString('utf8'),targets[file],group).source;if(fault&&fault.kind===targets[file])s=applyBoundaryFault(s,targets[file],fault.fault).source;return Buffer.from(s);}
function original(repo,blob){const b=blobCache.get(repo+'\0'+blob);assert.ok(b,'fixed Git blob loaded');assert.equal(sha(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b]),'sha1'),blob,'Git blob object framing');return b;}
const metadata=b=>({bytes:b.length,sha256:sha(b)});

export function captureBoundaryInputs(repo,head,tree,group,stage,saved,{fault=null}={}){
 assert.ok(['A','B','C'].includes(group));assert.equal(git(repo,'rev-parse','HEAD').toString().trim(),head,'execution checkout HEAD');
 const files=index(repo,head,tree),paths=Object.keys(files).sort();
 assert.deepEqual(git(repo,'ls-files','-z').toString().split('\0').filter(Boolean).sort(),paths,'index vs fixed HEAD input set');
 assert.equal(git(repo,'ls-files','--others','--exclude-standard','-z').length,0,'untracked inputs must be committed before boundary build');
 fs.mkdirSync(saved,{recursive:false});const m={schema:1,kind:'boundary-saved-inputs',head,tree,group,fault,paths,files:{},dependencies:{bodiesSaved:false,identity:'package.json/package-lock.json bodies plus full installed-file SHA256 table in boundary-build.json; compiler package bodies and host binary bodies not retained'},limits:['All tracked files copied by the existing builder are retained, including documentation; unchanged staged files reuse execution-source bodies.','Next compiler intermediates (.next) are not retained; final export is saved completely.','This is recorded source/build provenance, not an independent recompilation or proof of observer neutrality.']};
 for(const p of paths){const fixed=original(repo,files[p].blob),raw=read(repo,p),built=read(stage,p),expected=transformed(raw,p,group,fault);assert.deepEqual(built,expected,'staged transform '+p);const mapping=relation(raw,fixed);write(saved,'git-source/'+p+'.bin',fixed);write(saved,'execution-source/'+p+'.bin',raw);if(targets[p])write(saved,'transformed-source/'+p+'.bin',built);m.files[p]={...files[p],git:metadata(fixed),execution:metadata(raw),staged:metadata(built),relation:mapping,stagedBody:targets[p]?'transformed-source/'+p+'.bin':'execution-source/'+p+'.bin'};}
 json(saved,'inputs.json',m);return sha(read(saved,'inputs.json'));
}
function auditInputs(repo,head,tree,saved,{workspace=false,stage=null}={}){
 const m=JSON.parse(read(saved,'inputs.json'));assert.equal(m.schema,1);assert.equal(m.kind,'boundary-saved-inputs');assert.equal(m.head,head,'saved fixed HEAD');assert.equal(m.tree,tree,'saved fixed tree');assert.ok(['A','B','C'].includes(m.group));assert.equal(m.dependencies.bodiesSaved,false);
 const files=index(repo,head,tree),paths=Object.keys(files).sort();assert.deepEqual(m.paths,paths,'fixed source set');assert.deepEqual(Object.keys(m.files).sort(),paths,'source ledger set');
 for(const p of paths){const fixed=original(repo,files[p].blob),savedGit=read(saved,'git-source/'+p+'.bin'),raw=read(saved,'execution-source/'+p+'.bin'),built=read(saved,targets[p]?'transformed-source/'+p+'.bin':'execution-source/'+p+'.bin');assert.deepEqual(savedGit,fixed,'saved Git body '+p);const expected=transformed(raw,p,m.group,m.fault);assert.deepEqual(built,expected,'saved transformation '+p);assert.deepEqual(m.files[p],{...files[p],git:metadata(fixed),execution:metadata(raw),staged:metadata(built),relation:relation(raw,fixed),stagedBody:targets[p]?'transformed-source/'+p+'.bin':'execution-source/'+p+'.bin'},'saved source size/hash/blob '+p);if(workspace)assert.deepEqual(read(repo,p),raw,'execution input changed '+p);if(stage)assert.deepEqual(read(stage,p),built,'staged input changed '+p);}
 return m;
}
export function sealBoundaryOutputs(repo,head,tree,parent){
 const saved=path.join(parent,'preservation'),m=auditInputs(repo,head,tree,saved,{workspace:true,stage:parent}),output={};
 for(const p of names(path.join(parent,'out')))output[p]=metadata(read(path.join(parent,'out'),p));
 assert.ok(Object.hasOwn(output,'.nojekyll'),'mandatory hidden export .nojekyll');
 json(saved,'outputs.json',{schema:1,kind:'boundary-saved-outputs',head,tree,group:m.group,inputsSha256:sha(read(saved,'inputs.json')),files:output});
 return {schema:1,directory:'preservation',inputsSha256:sha(read(saved,'inputs.json')),outputsSha256:sha(read(saved,'outputs.json'))};
}
export function auditBoundaryPreservation(repo,head,tree,parent){
 const b=JSON.parse(read(parent,'boundary-build.json'));assert.equal(b.head,head,'build fixed HEAD');assert.equal(b.tree,tree,'build fixed tree');assert.equal(b.mode,'validation-only');assert.equal(b.success,true);assert.equal(b.originalSourcePreserved,true);assert.equal(b.dependencyBytesPreserved,false,'dependency hashes do not preserve package bodies');
 assert.equal(b.preservation?.schema,1,'saved boundary bodies contract required');assert.equal(b.preservation.directory,'preservation');const saved=path.join(parent,'preservation');assert.equal(sha(read(saved,'inputs.json')),b.preservation.inputsSha256,'input manifest binding');assert.equal(sha(read(saved,'outputs.json')),b.preservation.outputsSha256,'output manifest binding');
 const m=auditInputs(repo,head,tree,saved),o=JSON.parse(read(saved,'outputs.json'));assert.equal(o.schema,1);assert.equal(o.kind,'boundary-saved-outputs');assert.equal(o.head,head);assert.equal(o.tree,tree);assert.equal(o.group,b.group);assert.equal(m.group,b.group);assert.equal(o.inputsSha256,b.preservation.inputsSha256);assert.deepEqual(m.fault,b.fault?{kind:b.fault.kind,fault:b.fault.fault}:null,'declared transform fault');
 const sourceHashes=Object.fromEntries(m.paths.map(p=>[p,m.files[p].execution.sha256]));assert.deepEqual(b.sourceHashes,sourceHashes,'builder source hash set');assert.deepEqual(b.transformedHashes,Object.fromEntries(Object.keys(targets).map(p=>[p,m.files[p].staged.sha256])),'transformed hash set');
 assert.deepEqual(Object.keys(b.codeHashes).sort(),['scripts/phase7d-boundary-instrument.mjs','scripts/prepare-phase7d-boundary.mjs'].sort());for(const [p,h]of Object.entries(b.codeHashes))assert.equal(h,sourceHashes[p],'builder code binding');
 assert.ok(b.dependencyHashes&&Object.keys(b.dependencyHashes).length,'installed dependency identity table');for(const [p,h]of Object.entries(b.dependencyHashes)){safe(p);assert.match(h,/^[a-f0-9]{64}$/);}
 assert.deepEqual(names(saved).sort(),['inputs.json','outputs.json',...m.paths.flatMap(p=>['git-source/'+p+'.bin','execution-source/'+p+'.bin']),...Object.keys(targets).map(p=>'transformed-source/'+p+'.bin')].sort(),'saved body exact inventory');
 const outputs=Object.keys(o.files).sort();assert.ok(outputs.includes('.nojekyll'),'mandatory hidden export .nojekyll');assert.deepEqual(names(path.join(parent,'out')),outputs,'saved entire output inventory');assert.deepEqual(b.outputHashes,Object.fromEntries(outputs.map(p=>[p,o.files[p].sha256])),'builder output hash set');for(const p of outputs)assert.deepEqual(metadata(read(path.join(parent,'out'),p)),o.files[p],'saved output size/hash '+p);
 return {status:'PASS',head,tree,group:b.group,sourceBodies:m.paths.length,gitBodies:m.paths.length,transformedBodies:2,outputBodies:outputs.length,hiddenOutput:'.nojekyll',dependencyBodiesSaved:false,rawGitEqual:m.paths.every(p=>m.files[p].relation==='RAW_IDENTICAL'),crlfMapped:m.paths.filter(p=>m.files[p].relation==='LF_TO_CRLF_ONLY').length,scope:'Saved artifact body/set/size/hash/Git/declared transformation verification; not primary-result acceptance, independent recompilation, dependency-package body preservation or HTTP execution proof.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const [command,repo,head,tree,parent,...extra]=process.argv.slice(2);assert.equal(command,'audit');assert.equal(extra.length,0);console.log(JSON.stringify(auditBoundaryPreservation(path.resolve(repo),head,tree,path.resolve(parent)),null,2));}catch(error){console.error(String(error.stack||error));process.exitCode=1;}}
