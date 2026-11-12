/** Validation build only. Original product, dependencies and old120 builders are not modified. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {instrumentBoundary,applyBoundaryFault} from './phase7d-boundary-instrument.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['--no-optional-locks',...args],{encoding:'utf8'}).trim();
const root=process.cwd(),group=process.env.BOUNDARY_GROUP??'A';
if(!['A','B','C'].includes(group))throw Error('invalid BOUNDARY_GROUP');
const destination=path.resolve(process.env.BOUNDARY_COPY_DIR??`work/boundary-validation-build-${group}-${Date.now()}`);
if(destination===root||!destination.startsWith(root+path.sep))throw Error('isolated build must be new child directory of worktree');
await fs.mkdir(path.dirname(destination),{recursive:true});
await fs.mkdir(destination,{recursive:false});
const manifest={schema:1,mode:'validation-only',head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),group,sourceHashes:{},changes:[],dependencyHashes:{},dependencyBytesPreserved:false,transformedHashes:{},codeHashes:{},outputHashes:{},started:new Date().toISOString(),node:process.version,platform:process.platform,success:false,originalSourcePreserved:false,copyDirectory:destination};
const manifestPath=path.join(destination,'boundary-build.json');
try {
 const files=[...new Set([...git('ls-files','-z').split('\0'),...git('ls-files','--others','--exclude-standard','-z').split('\0').filter(f=>f.includes('boundary') && (f.startsWith('scripts/')||f.startsWith('tests/')))])].filter(Boolean);
 for(const file of files){const data=await fs.readFile(path.join(root,file));manifest.sourceHashes[file]=sha(data);await fs.mkdir(path.dirname(path.join(destination,file)),{recursive:true});await fs.writeFile(path.join(destination,file),data,{flag:'wx'});}
 // The new builder may be untracked during validation: retain exact executed preparation bytes too.
 for(const file of ['scripts/phase7d-boundary-instrument.mjs','scripts/prepare-phase7d-boundary.mjs'])manifest.codeHashes[file]=sha(await fs.readFile(path.join(root,file)));
 for(const [file,kind] of [['app/components/interactive-motion/GestureExhibits.tsx','swipe'],['app/components/interactive-motion/ReactiveExhibits.tsx','status']]){
  const p=path.join(destination,file);let transformed=instrumentBoundary(await fs.readFile(p,'utf8'),kind,group);
  manifest.changes.push(transformed.manifest);
  if(process.env.BOUNDARY_FAULT&&process.env.BOUNDARY_FAULT_KIND===kind){const fault=applyBoundaryFault(transformed.source,kind,process.env.BOUNDARY_FAULT);transformed.source=fault.source;manifest.fault=fault.manifest;}
  await fs.writeFile(p,transformed.source);manifest.transformedHashes[file]=sha(await fs.readFile(p));
 }
 // Same-volume hardlinks preserve installed dependency bytes; builds must never write inside node_modules.
 async function linkTree(src,dst){await fs.mkdir(dst);for(const e of await fs.readdir(src,{withFileTypes:true})){const a=path.join(src,e.name),b=path.join(dst,e.name);if(e.isDirectory())await linkTree(a,b);else if(e.isSymbolicLink()){const target=await fs.readlink(a),resolved=await fs.realpath(a),dependencyRoot=await fs.realpath(path.join(root,'node_modules'));if(path.isAbsolute(target)||!resolved.startsWith(dependencyRoot+path.sep))throw Error('external dependency symlink rejected: '+a);await fs.symlink(target,b,(await fs.stat(a)).isDirectory()?'dir':'file');}else {manifest.dependencyHashes[path.relative(path.join(root,'node_modules'),a).split(path.sep).join('/')]=sha(await fs.readFile(a));await fs.link(a,b);}}}
 await linkTree(path.join(root,'node_modules'),path.join(destination,'node_modules'));
 const log=await fs.open(path.join(destination,'build.log'),'wx');
 try {execFileSync(process.execPath,[path.join(destination,'node_modules/next/dist/bin/next'),'build'],{cwd:destination,stdio:['ignore',log.fd,log.fd],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});manifest.buildExitCode=0;}catch(error){manifest.buildExitCode=error.status??null;throw error;}finally{await log.close();}
 async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else manifest.outputHashes[path.relative(path.join(destination,'out'),p).split(path.sep).join('/')]=sha(await fs.readFile(p));}}
 await walk(path.join(destination,'out'));
 for(const [file,hash] of Object.entries(manifest.sourceHashes))if(sha(await fs.readFile(path.join(root,file)))!==hash)throw Error(`source changed during build: ${file}`);
 manifest.originalSourcePreserved=true;for(const [file,hash] of Object.entries(manifest.dependencyHashes))if(sha(await fs.readFile(path.join(root,'node_modules',file)))!==hash)throw Error('dependency bytes changed during build: '+file);manifest.dependencyBytesPreserved=true;manifest.success=true;
}catch(error){manifest.error=String(error);process.exitCode=1;}finally{manifest.finished=new Date().toISOString();await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({build:path.join(destination,'out'),manifest:manifestPath,success:manifest.success}));}



