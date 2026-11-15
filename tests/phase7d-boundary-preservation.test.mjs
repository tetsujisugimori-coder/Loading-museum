import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {captureBoundaryInputs,sealBoundaryOutputs,auditBoundaryPreservation} from '../scripts/phase7d-boundary-preservation.mjs';
import {instrumentBoundary} from '../scripts/phase7d-boundary-instrument.mjs';
const temp=path.resolve(process.env.BOUNDARY_PRESERVATION_TEMP||'../boundary-preservation-unit');fs.mkdirSync(temp,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const targets={'app/components/interactive-motion/GestureExhibits.tsx':'swipe','app/components/interactive-motion/ReactiveExhibits.tsx':'status'};
export function preservationFixture(group='C',{crlf=false}={}){
 const dir=fs.mkdtempSync(path.join(temp,'boundary-synthetic-')),repo=path.join(dir,'repo'),parent=path.join(dir,'build');fs.mkdirSync(repo);fs.mkdirSync(parent);
 const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();git('init','-q');git('config','user.name','boundary synthetic fixture');git('config','user.email','synthetic@example.invalid');git('config','core.autocrlf','false');
 const files=[...Object.keys(targets),'scripts/phase7d-boundary-instrument.mjs','scripts/phase7d-diagnostic-instrument.mjs','scripts/prepare-phase7d-boundary.mjs','scripts/phase7d-boundary-preservation.mjs','package.json','package-lock.json','public/.nojekyll'];
 for(const p of files){fs.mkdirSync(path.dirname(path.join(repo,p)),{recursive:true});fs.writeFileSync(path.join(repo,p),fs.readFileSync(p));}git('add','.');git('commit','-qm','fixed synthetic boundary input');const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
 const m={schema:1,mode:'validation-only',head,tree,group,sourceHashes:{},transformedHashes:{},codeHashes:{},dependencyHashes:{'synthetic/compiler.js':'a'.repeat(64)},dependencyBytesPreserved:false,originalSourcePreserved:false,success:false,outputHashes:{},fixture:'SYNTHETIC_NO_BUILD_NO_BROWSER'};
 for(const p of files){let b=fs.readFileSync(path.join(repo,p));if(crlf&&b.toString('utf8').includes('\n')){b=Buffer.from(b.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));fs.writeFileSync(path.join(repo,p),b);}m.sourceHashes[p]=hash(b);const stage=targets[p]?Buffer.from(instrumentBoundary(b.toString('utf8'),targets[p],group).source):b;fs.mkdirSync(path.dirname(path.join(parent,p)),{recursive:true});fs.writeFileSync(path.join(parent,p),stage);if(targets[p])m.transformedHashes[p]=hash(stage);}
 for(const p of ['scripts/phase7d-boundary-instrument.mjs','scripts/prepare-phase7d-boundary.mjs'])m.codeHashes[p]=m.sourceHashes[p];
 captureBoundaryInputs(repo,head,tree,group,parent,path.join(parent,'preservation'));
 fs.mkdirSync(path.join(parent,'out'));for(const [p,b]of [['.nojekyll',''],['index.html','synthetic page'],['bundle.js','synthetic output; not browser executed']]){fs.writeFileSync(path.join(parent,'out',p),b);m.outputHashes[p]=hash(b);}
 m.preservation=sealBoundaryOutputs(repo,head,tree,parent);m.originalSourcePreserved=true;m.success=true;fs.writeFileSync(path.join(parent,'boundary-build.json'),JSON.stringify(m));
 return {dir,repo,parent,head,tree,m,git,audit:()=>auditBoundaryPreservation(repo,head,tree,parent)};
}
for(const group of ['A','B','C'])test('synthetic complete source/transform/output normal '+group,()=>{const f=preservationFixture(group),r=f.audit();assert.equal(r.status,'PASS');assert.equal(r.outputBodies,3);assert.equal(r.dependencyBodiesSaved,false);assert.equal(r.sourceBodies,Object.keys(f.m.sourceHashes).length);});
for(const [label,mutate,reason]of [
 ['only .nojekyll missing',f=>fs.renameSync(path.join(f.parent,'out/.nojekyll'),path.join(f.dir,'retained-nojekyll')),/saved entire output inventory/],
 ['hash-only source',f=>fs.renameSync(path.join(f.parent,'preservation/execution-source'),path.join(f.dir,'retained-source-bodies')),/ENOENT/],
 ['source one byte',f=>fs.appendFileSync(path.join(f.parent,'preservation/execution-source/package.json.bin'),'!'),/execution source differs/],
 ['output one byte',f=>fs.appendFileSync(path.join(f.parent,'out/bundle.js'),'!'),/saved output size\/hash/],
 ['extra output',f=>fs.writeFileSync(path.join(f.parent,'out/unexpected.js'),'extra'),/saved entire output inventory/],
 ['extra saved source',f=>fs.writeFileSync(path.join(f.parent,'preservation/execution-source/extra.js'),'extra'),/saved body exact inventory/],
 ['changed transformed source',f=>fs.appendFileSync(path.join(f.parent,'preservation/transformed-source',Object.keys(targets)[0]+'.bin'),'!'),/saved transformation/],
 ['foreign HEAD',f=>{f.git('commit','--allow-empty','-qm','other HEAD');f.head=f.git('rev-parse','HEAD');},/build fixed HEAD/],
 ['hash-only dependency claimed saved',f=>{f.m.dependencyBytesPreserved=true;fs.writeFileSync(path.join(f.parent,'boundary-build.json'),JSON.stringify(f.m));},/dependency hashes do not preserve/],
])test('reject '+label+' by preservation contract, not import or timeout',()=>{const f=preservationFixture();mutate(f);assert.throws(()=>auditBoundaryPreservation(f.repo,f.head,f.tree,f.parent),reason);});
test('same fixture legacy hidden-excluding upload is RED; explicit hidden-inclusive ZIP roundtrip is GREEN',()=>{
 const f=preservationFixture(),lost=path.join(f.dir,'legacy-artifact'),kept=path.join(f.dir,'retrieved-artifact');fs.cpSync(f.parent,lost,{recursive:true,filter:p=>!path.relative(f.parent,p).split(path.sep).some(s=>s.startsWith('.'))});assert.throws(()=>auditBoundaryPreservation(f.repo,f.head,f.tree,lost));
 const zip=path.join(f.dir,'roundtrip.zip');execFileSync(process.env.PYTHON||'python',['-c',"import pathlib,sys,zipfile\np=pathlib.Path(sys.argv[1]);z=zipfile.ZipFile(sys.argv[2],'x',zipfile.ZIP_DEFLATED)\nfor f in sorted(p.rglob('*')):\n if f.is_file():z.write(f,f.relative_to(p).as_posix())\nz.close()\nwith zipfile.ZipFile(sys.argv[2]) as z:\n assert z.testzip() is None\n z.extractall(sys.argv[3])",f.parent,zip,kept]);assert.equal(auditBoundaryPreservation(f.repo,f.head,f.tree,kept).status,'PASS');
 const result=spawnSync(process.execPath,['scripts/phase7d-boundary-preservation.mjs','audit',f.repo,f.head,f.tree,kept],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);fs.renameSync(path.join(kept,'out/.nojekyll'),path.join(f.dir,'retrieved-nojekyll-retained'));
 const bad=spawnSync(process.execPath,['scripts/phase7d-boundary-preservation.mjs','audit',f.repo,f.head,f.tree,kept],{encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/saved entire output inventory/);assert.doesNotMatch(bad.stderr,/ERR_MODULE_NOT_FOUND|SyntaxError|Timeout/);
 fs.writeFileSync(path.join(f.dir,'same-input-red-green.json'),JSON.stringify({kind:'SYNTHETIC_NO_BUILD_NO_BROWSER',head:f.head,tree:f.tree,legacyUpload:'REJECTED_MISSING_SAVED_BODIES_AND_HIDDEN',inclusiveRoundtrip:'PASS',onlyNojekyllMissing:'REJECTED',oldAuditorMisacceptanceClaimed:false}));
});
test('LF/CRLF source correspondence does not assert raw byte identity',()=>{const f=preservationFixture('A',{crlf:true}),r=f.audit();assert.equal(r.rawGitEqual,false);assert.ok(r.crlfMapped>0);});
test('boundary workflow includes explicit saved bodies, hidden output and independent artifact audit',()=>{const y=fs.readFileSync('.github/workflows/phase7d-boundary-validation.yml','utf8');assert.match(y,/include-hidden-files: true/);assert.match(y,/work\/boundary-build\/preservation\//);assert.match(y,/node scripts\/phase7d-boundary-preservation.mjs audit/);assert.doesNotMatch(y,/node_modules\/\s*$/m);});
test('saved TSX bodies stay outside actual TypeScript target discovery while staged TSX stays included',()=>{const f=preservationFixture(),config=JSON.parse(fs.readFileSync('tsconfig.json','utf8')),parsed=ts.parseJsonConfigFileContent(config,ts.sys,f.parent),files=parsed.fileNames.map(p=>path.resolve(p));for(const p of Object.keys(targets))assert.ok(files.includes(path.resolve(f.parent,p)),'real staged TSX remains checked');assert.ok(!files.some(p=>p.startsWith(path.resolve(f.parent,'preservation')+path.sep)),'archived body is not a compiler input');});
