/** Synthetic aggregate fault probes only. Requires test-auditor.mjs fixture first. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {audit} from './frozen-source/scripts/audit-scroll-geometry.mjs';
const root=path.dirname(new URL(import.meta.url).pathname),dir=path.join(root,'synthetic-fixture');
const reportFile=path.join(dir,'report.json'),baseline=await fs.readFile(reportFile),binding=JSON.parse(await fs.readFile(path.join(root,'binding.json'))),results=[];
const cases=[
 ['errors_missing',r=>delete r.errors],['errors_null',r=>r.errors=null],['errors_object',r=>r.errors={}],
 ['fatal_cleanup_failure',r=>r.errors=[{fatal:'Synthetic context.close() cleanup failure'}]],
 ['fatal_browser_close_failure',r=>r.errors=[{fatal:'Synthetic browser.close() cleanup failure'}]],
 ['fullMatrix_false',r=>r.fullMatrix=false],['fullMatrix_missing',r=>delete r.fullMatrix],
 ['expectedRows_wrong',r=>r.expectedRows=767],['expectedRows_missing',r=>delete r.expectedRows],
 ['status_partial',r=>r.status='PARTIAL'],['status_unsupported',r=>r.status='UNSUPPORTED'],['status_missing',r=>delete r.status],
];
try{for(const[name,mutate]of cases){const r=JSON.parse(baseline);mutate(r);await fs.writeFile(reportFile,JSON.stringify(r));const a=await audit(dir,binding);const result={name,expected:'FAIL',actual:a.status,satisfied:a.status==='FAIL',errors:a.errors};results.push(result);console.log(JSON.stringify(result));}}
finally{await fs.writeFile(reportFile,baseline);}
await fs.writeFile(path.join(root,'aggregate-guards-results.json'),JSON.stringify({syntheticOnly:true,tests:results},null,2));
