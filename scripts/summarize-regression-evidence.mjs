// Evidence summary reads saved bytes; it does not decide browser acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.argv[2],files=[];
async function walk(dir){for(const ent of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else files.push(p);}}
await walk(root);const sha=b=>createHash('sha256').update(b).digest('hex');const summary={checkoutHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checkoutTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),sourceHashes:{},reports:[],images:[]};
for(const f of ['scripts/browser-regression-observation.mjs','scripts/verify-flash-phase2-editing.mjs','scripts/verify-regression-timing.mjs','scripts/verify-regression-independent.mjs','scripts/verify-regression-faults.mjs'])summary.sourceHashes[f]=sha(await fs.readFile(f));
for(const p of files){const b=await fs.readFile(p),name=path.relative(root,p);if(p.endsWith('.png'))summary.images.push({file:name,bytes:b.length,sha256:sha(b)});if(p.endsWith('.json')&&path.basename(p)!=='summary.json'){
 const r=JSON.parse(b);summary.reports.push({file:name,sha256:sha(b),head:r.head||r.harnessHead,tree:r.tree||r.harnessTree,exportHead:r.exportHead,exportTree:r.exportTree,status:r.status,error:r.error,cases:r.cases?.map(c=>({engine:c.engine,version:c.version,width:c.width,era:c.era,status:c.status,failures:c.failures,controls:c.cancelFaults||c.fault||c.controls,earlyCapture:c.earlyCapture,expected:c.beforeCancel?.expected,actual:c.cancelAfter?.actual,undoExpected:c.committedBeforeSecondStroke,undoActual:c.afterUndoAndMove,cycles:c.cycles?.length})),sourceHashes:r.sourceHashes,targets:r.targets,script:r.script,stepFault:r.stepFault,stepRecovery:r.stepRecovery,recovery:r.recovery});
}}
await fs.writeFile(path.join(root,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
