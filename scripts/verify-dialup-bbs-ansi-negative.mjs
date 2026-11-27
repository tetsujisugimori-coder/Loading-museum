import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

// Only case-private disposable source copies are removed, not original evidence.
const dest=path.resolve('work/dialup-bbs');
await mkdir(dest,{recursive:true});const scratch=await mkdtemp(path.join(dest,'negative-scratch-'));
const negatives=[
 ['ignore-wire-controls','ansi-scenarios.mjs','wireTime(bytes.length,bps)','wireTime(terminal.snapshot().writes,bps)','all four speeds'],
 ['lose-split-csi','ansi-terminal.mjs','for(const byte of bytes){',"mode='text';for(const byte of bytes){",'CSI split'],
 ['ignore-cursor','ansi-terminal.mjs','y=Math.min(rows-1,(values[0]||1)-1);x=Math.min(columns-1,(values[1]||1)-1);','y=0;x=0;','cursor overwrite'],
 ['no-overwrite','ansi-terminal.mjs','cells[y][x]={char:String.fromCharCode(byte),attr};','if(cells[y][x].char===\' \')cells[y][x]={char:String.fromCharCode(byte),attr};','cursor overwrite'],
 ['drop-bit7','ansi-terminal.mjs','Boolean(attr&128)','false','all 256 identical bytes'],
 ['same-mode-twice','ansi-terminal.mjs',"mode==='bright'?15:7",'7','all 256 identical bytes'],
 ['stale-callback-after-stop','ansi-playback.mjs','if(token!==generation||!running)return;','if(!tick)return;','only one clock'],
 ['allow-duplicate-schedule','ansi-playback.mjs','if(running)return false;','if(!tick)return false;','only one clock'],
];
const out=[];
function runUnit(root,title){
 const options=title?['--test-name-pattern='+title]:[];
 return spawnSync(process.execPath,['--test',...options,'tests/dialup-bbs-ansi.test.mjs'],{cwd:root,encoding:'utf8',timeout:20000});
}
function requireRejection(name,p,needle){
 assert.equal(p.error,undefined,name);assert.equal(p.status,1,name);
 const log=p.stdout+'\n'+p.stderr;
 assert.match(log,/AssertionError/,name);assert.ok(log.includes(needle),name);
 out.push({name,exitCode:p.status,status:'REJECTED'});
}
try{
 await mkdir(path.join(scratch,'public'),{recursive:true});
 await cp('public/dialup-bbs',path.join(scratch,'public/dialup-bbs'),{recursive:true});
 await mkdir(path.join(scratch,'tests'));
 await cp('tests/dialup-bbs-ansi.test.mjs',path.join(scratch,'tests/dialup-bbs-ansi.test.mjs'));
 assert.equal(runUnit(scratch).status,0,'unmodified control');
 for(const [name,file,old,mutant,title] of negatives){
   const p=path.join(scratch,'public/dialup-bbs',file),original=await readFile(p,'utf8');
   assert.equal(original.split(old).length,2,name);
   await writeFile(p,original.replace(old,mutant));
   requireRejection(name,runUnit(scratch,title),title);
   await writeFile(p,original);
 }
 await mkdir(path.join(scratch,'app'));await cp('app/data',path.join(scratch,'app/data'),{recursive:true});
 await cp('tests/dialup-bbs-registration.test.ts',path.join(scratch,'tests/dialup-bbs-registration.test.ts'));
 const vitest=path.resolve('node_modules/vitest/vitest.mjs');
 const runRegistration=()=>spawnSync(process.execPath,[vitest,'run','--maxWorkers=2','tests/dialup-bbs-registration.test.ts'],{cwd:scratch,encoding:'utf8',timeout:20000});
 const registration=runRegistration();
 assert.equal(registration.status,0,registration.stdout+'\n'+registration.stderr);
 const file=path.join(scratch,'app/data/dialupBbsExhibits.ts'),original=await readFile(file,'utf8');
 for(const [name,mutant] of [
  ['lose-exhibit',original.split('\n').filter(s=>!s.includes("{id:'bbs-06'")).join('\n')],
  ['change-permanent-id',original.replace("{id:'bbs-06'","{id:'bbs-09'")],
 ]){
  assert.notEqual(mutant,original,name);await writeFile(file,mutant);
  requireRejection(name,runRegistration(),'exactly six historical');
 }
 assert.equal(out.length,10);
 await writeFile(path.join(dest,'ansi-negative.json'),JSON.stringify({status:'PASS',cases:out},null,2)+'\n');
 console.log(out.map(c=>c.name+': '+c.status).join('\n'));
}finally{await rm(scratch,{recursive:true,force:true});}
