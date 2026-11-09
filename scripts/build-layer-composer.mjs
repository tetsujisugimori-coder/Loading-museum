import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
export const sha=b=>createHash('sha256').update(b).digest('hex');
export async function sourceDigest(){const files=git('ls-files','app','public','scripts','package.json','package-lock.json','next.config.ts','tsconfig.json').split('\n');let data='';for(const p of files)data+=p+' '+sha(await fs.readFile(p))+'\n';return sha(data)}
export async function outputDigest(root='out'){async function walk(dir){const all=[];for(const e of(await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,e.name);if(e.isDirectory())all.push(...await walk(p));else if(e.name!=='.layer-build.json')all.push([p,sha(await fs.readFile(p))]);}return all;}return sha(JSON.stringify(await walk(root)))}
export function validateBuild(m,e){assert.equal(m.success,true);for(const k of ['head','tree','sourceHash','outputHash']){assert.equal(typeof m[k],'string');assert.ok(m[k]);assert.equal(m[k],e[k],`build ${k}`)}assert.equal(m.dirty,'');}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const before={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),sourceHash:await sourceDigest(),dirty:git('status','--porcelain')};assert.equal(before.dirty,'','bind build only from clean source');
 execFileSync('npm',['run','build'],{stdio:'inherit'});assert.equal(git('rev-parse','HEAD'),before.head);assert.equal(git('status','--porcelain'),'');assert.equal(await sourceDigest(),before.sourceHash);
 const manifest={...before,success:true,outputHash:await outputDigest(),finished:new Date().toISOString()};await fs.writeFile('out/.layer-build.json',JSON.stringify(manifest,null,2));console.log('Bound production build',manifest.head,manifest.outputHash);
}
