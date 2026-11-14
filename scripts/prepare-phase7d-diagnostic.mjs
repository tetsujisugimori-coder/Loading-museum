import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {instrumentSource} from './phase7d-diagnostic-instrument.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const group=process.env.DIAGNOSTIC_GROUP??'A';
if(!['A','B','C'].includes(group))throw Error('invalid group');
const root=process.cwd(),head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
const destination=path.resolve(process.env.DIAGNOSTIC_COPY_DIR??`work/phase7d-causal-build-${group}-${Date.now()}`);
await fs.mkdir(path.dirname(destination),{recursive:true});
await fs.mkdir(destination,{recursive:false});
const files=git('ls-files','-z').split('\0').filter(Boolean);
const sourceHashes={};
for(const file of files){const data=await fs.readFile(file);sourceHashes[file]=sha(data);await fs.mkdir(path.dirname(path.join(destination,file)),{recursive:true});await fs.writeFile(path.join(destination,file),data);}
const changes=[];
for(const [file,kind] of [['app/components/interactive-motion/GestureExhibits.tsx','swipe'],['app/components/interactive-motion/ReactiveExhibits.tsx','status']]){const p=path.join(destination,file);const transformed=instrumentSource(await fs.readFile(p,'utf8'),kind,group);await fs.writeFile(p,transformed.source);changes.push(transformed.manifest);}
// A local hardlink copy avoids Turbopack's external-symlink restriction. No dependency install or version change.
execFileSync('cp',['-al',path.join(root,'node_modules'),path.join(destination,'node_modules')]);
const started=new Date().toISOString();
execFileSync('npm',['run','build'],{cwd:destination,stdio:'inherit'});
const outputHashes={};
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else outputHashes[path.relative(path.join(destination,'out'),p)]=sha(await fs.readFile(p));}}
await walk(path.join(destination,'out'));
for(const file of files)if(sha(await fs.readFile(path.join(root,file)))!==sourceHashes[file])throw Error(`source changed while building: ${file}`);
const manifest={schema:1,head,tree,group,sourceHashes,changes,outputHashes,started,finished:new Date().toISOString(),node:process.version,platform:process.platform,success:true,originalSourcePreserved:true};
await fs.writeFile(path.join(destination,'diagnostic-build.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({build:path.join(destination,'out'),manifest:path.join(destination,'diagnostic-build.json')}));
