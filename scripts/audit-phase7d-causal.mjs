/** Independent evidence audit. Expected matrix is supplied by the caller, not report claims. */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {validateCausalReport,verifyCausalFiles} from './phase7d-causal-contract.mjs';
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!process.env.EXPECTED_HEAD||!process.env.EXPECTED_TREE||!process.env.DIAGNOSTIC_GROUP)throw Error('Usage: EXPECTED_HEAD=... EXPECTED_TREE=... DIAGNOSTIC_GROUP=A|B|C node scripts/audit-phase7d-causal.mjs evidence-directory');
const bytes=await fs.readFile(path.join(root,'report.json')),r=JSON.parse(bytes),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
if(manifest.report.name!=='report.json'||manifest.report.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('report manifest mismatch');
if(JSON.stringify(manifest.files)!==JSON.stringify(r.files))throw Error('file manifest mismatch');
const summary=validateCausalReport(r,{head:process.env.EXPECTED_HEAD,tree:process.env.EXPECTED_TREE,group:process.env.DIAGNOSTIC_GROUP,engines:(process.env.BROWSERS||'chromium,webkit').split(','),cases:(process.env.DIAGNOSTIC_CASES||'swipe,status').split(','),repeats:Number(process.env.DIAGNOSTIC_REPEATS||3),clean:process.env.REQUIRE_CLEAN!=='0'});
await verifyCausalFiles(root,r.files);
for(const t of r.trials){const raw=JSON.parse(await fs.readFile(path.join(root,`${t.id}.json`),'utf8'));if(JSON.stringify(raw)!==JSON.stringify(t))throw Error(`trial/report mismatch: ${t.id}`);}
const result={audit:'PASS',...summary,head:r.head,tree:r.tree,group:r.group,meaning:'Evidence integrity and diagnostic completeness are separate from product acceptance and causal identification.'};
await fs.writeFile(path.join(root,'independent-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
