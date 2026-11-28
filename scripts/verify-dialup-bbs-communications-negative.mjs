import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const dest=path.resolve('work/dialup-bbs');
await mkdir(dest,{recursive:true});
const root=await mkdtemp(path.join(dest,'communications-mutants-'));
const mutations=[
 ['unconnected-success','communications.mjs','if(e.state && !legal',"if(snapshot.state!=='idle' && e.state && !legal",'deny illegal'],
 ['effect-in-initialization','communications.mjs','if(!allowed) throw','if(!allowed&&snapshot.state!=="initializing") throw','protocol effects'],
 ['wrong-led','communications.mjs','RD:signal.rx','RD:signal.tx','Courier seven lamps'],
 ['failure-advances','communications.mjs',"response('BUSY','failed'","response('BUSY','online'",'AT connection'],
 ['checksum-ignored','communications.mjs','&& frame[131]===sum(frame.slice(3,131))','','checksum byte'],
 ['duplicate-accepted','communications.mjs',' && !s.confirmed.includes(e.effect.block)','', 'confirming an already accepted'],
 ['bytes-ignore-control-and-retries','communications.mjs','tx:snapshot.tx+e.tx.length,rx:snapshot.rx+e.rx.length','tx:snapshot.tx+(e.effect?.type==="attempt"?128:0),rx:snapshot.rx','bad block'],
 ['patrol-failure-ignored','communications.mjs',"if(i===1&&patrolFault==='board')","if(i===1&&patrolFault==='never')",'patrol stops'],
 ['stale-timer','communications-clock.mjs','if(!running||token!==generation) return;','if(!onEvent) return;', 'event clock'],
 ['multiple-timers','communications-clock.mjs','if(running) return false;','if(!onEvent) return false;', 'event clock'],
];
const run=(args)=>spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:20000});
const cases=[];
const requireRejected=(name,trial,needle)=>{
 const output=trial.stdout+'\n'+trial.stderr;assert.equal(trial.error,undefined,name);assert.equal(trial.status,1,name+' '+output);assert.match(output,/AssertionError|Assertion failed/);assert.ok(output.includes(needle),name);
 cases.push({name,status:'REJECTED',exitCode:trial.status,message:output});
};
try{
 await mkdir(path.join(root,'public'),{recursive:true});
 await cp('public/dialup-bbs',path.join(root,'public/dialup-bbs'),{recursive:true});
 await mkdir(path.join(root,'tests'));
 await cp('tests/dialup-bbs-communications.test.mjs',path.join(root,'tests/dialup-bbs-communications.test.mjs'));
 const normal=run(['--test','tests/dialup-bbs-communications.test.mjs']);assert.equal(normal.status,0,normal.stdout+'\n'+normal.stderr);
 for(const [name,file,needle,replacement,pattern] of mutations){
  const destination=path.join(root,'public/dialup-bbs',file);
  const original=await readFile(destination,'utf8');assert.equal(original.split(needle).length,2,name);
  await writeFile(destination,original.replace(needle,replacement));
  requireRejected(name,run(['--test','--test-name-pattern='+pattern,'tests/dialup-bbs-communications.test.mjs']),pattern);
  await writeFile(destination,original);
 }
 await mkdir(path.join(root,'app'));
 await cp('app/data',path.join(root,'app/data'),{recursive:true});
 await cp('tests/dialup-bbs-registration.test.ts',path.join(root,'tests/dialup-bbs-registration.test.ts'));
 const checkRegistration=()=>run([path.resolve('node_modules/vitest/vitest.mjs'),'run','--maxWorkers=2','tests/dialup-bbs-registration.test.ts']);
 const registry=checkRegistration();assert.equal(registry.status,0,registry.stdout+'\n'+registry.stderr);
 const target=path.join(root,'app/data/dialupBbsExhibits.ts');
 const original=await readFile(target,'utf8');
 for(const [name,v] of [
  ['lost-inventory',original.split('\n').filter(line=>!line.includes("{id:'bbs-12'")).join('\n')],
  ['mutated-fixed-ID',original.replace("{id:'bbs-12'","{id:'bbs-99'")],
 ]){
  assert.notEqual(v,original,name);await writeFile(target,v);
  requireRejected(name,checkRegistration(),'preserves ten historical BBS IDs');
 }
 await writeFile(path.join(dest,'communications-negative.json'),JSON.stringify({status:'PASS',cases},null,2)+'\n');
 console.log(cases.map(c=>c.name+': '+c.status).join('\n'));
}finally{await rm(root,{recursive:true,force:true});}
