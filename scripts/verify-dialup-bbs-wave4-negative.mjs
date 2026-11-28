import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const dest=path.resolve('work/dialup-bbs');
await fs.mkdir(dest,{recursive:true});
const root=await fs.mkdtemp(path.join(dest,'wave4-mutants-'));
const rip='tests/dialup-bbs-ripscrip.test.mjs',door='tests/dialup-bbs-door-game.test.mjs';
const vars=[
 ['wrong-base','ripscrip.mjs','), 36))','), 10))',rip,'two-column base 36'],
 ['allow-offscreen','ripscrip.mjs',"else if (!paired(values)) return error('out-of-range');",'else if (false) return error(\'out-of-range\');',rip,'malformed, truncated'],
 ['double-request','door-game-model.mjs',"if (pending) return {accepted:false,code:'busy'};","if (false) return {accepted:false,code:'busy'};",door,'rejects duplicates'],
 ['no-turn-cost','door-game-model.mjs','turns:s.turns-1','turns:s.turns',door,'exact hand-calculated'],
];
const run=(test,name)=>spawnSync(process.execPath,['--test','--test-reporter=tap',...(name?['--test-name-pattern='+name]:[]),test],{cwd:root,encoding:'utf8',timeout:20000});
const evidence={results:[],status:'FAIL'};
try{
 await fs.mkdir(path.join(root,'public'),{recursive:true});
 await fs.cp('public/dialup-bbs',path.join(root,'public/dialup-bbs'),{recursive:true});
 await fs.mkdir(path.join(root,'tests'));
 for(const test of [rip,door]){await fs.copyFile(test,path.join(root,test));assert.equal(run(test).status,0);}
 for(const [name,file,needle,change,test,filter] of vars){
  const p=path.join(root,'public/dialup-bbs',file),old=await fs.readFile(p,'utf8');
  assert.equal(old.split(needle).length,2,name+' selector');
  await fs.writeFile(p,old.replace(needle,change));
  const r=run(test,filter);
  const log=r.stdout+'\n'+r.stderr;
  assert.equal(r.status,1,name+' '+log);assert.match(log,/^not ok 1 - /m);assert.ok(log.includes(filter));
  if(name==='no-turn-cost'){assert.match(log,/name: 'TypeError'/);assert.match(log,/error: 'invalid game state'/);}
  else assert.match(log,/AssertionError/);
  evidence.results.push({name,exitCode:r.status,status:'REJECTED',log});
  await fs.writeFile(p,old);
 }
 evidence.status='PASS';
}finally{
 await fs.writeFile(path.join(dest,'wave4-negative.json'),JSON.stringify(evidence,null,2)+'\n');
 await fs.rm(root,{recursive:true,force:true});
}
console.log(evidence.results.map(v=>v.name+': '+v.status).join('\n'));
