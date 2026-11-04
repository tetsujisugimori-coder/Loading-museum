// Keep process exit codes alongside logs; an interrupted run is never complete.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
const dest=process.env.LOCAL_EVIDENCE||'work/phase5b-local';fs.mkdirSync(dest,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const result={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),started:new Date().toISOString(),phases:[],complete:false};
const npm=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');fs.accessSync(npm);
for(const phase of ['lint','typecheck','test']){
 const log=fs.openSync(`${dest}/${phase}.log`,'w');
 const r=spawnSync(process.execPath,[npm,'run',phase],{stdio:['ignore',log,log]});
 fs.closeSync(log);result.phases.push({phase,exit:r.status,error:r.error?String(r.error):null});
 fs.writeFileSync(`${dest}/results.json`,JSON.stringify(result,null,2));if(r.status!==0){process.exitCode=1;break}
}
result.finished=new Date().toISOString();result.complete=result.phases.length===3&&result.phases.every(p=>p.exit===0);fs.writeFileSync(`${dest}/results.json`,JSON.stringify(result,null,2));if(!result.complete)process.exitCode=1;
