/** Independent RED -> GREEN source replay. Does not run or modify the application. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {expected,originalCases,completeCases} from './fixtures.mjs';
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){assert.ok(['--baseline','--current','--out'].includes(args[i])&&args[i+1],'Usage: node replay.mjs [--baseline path] [--current path] [--out path]');options[args[i]]=args[i+1];}
const baseline=options['--baseline']?path.resolve(options['--baseline']):new URL('./contract-before.mjs',import.meta.url).pathname;
const current=path.resolve(options['--current']||'diagnostics/scroll-geometry/contract.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>sha(JSON.stringify(canonical(v)));
const old=await import(pathToFileURL(baseline)),now=await import(pathToFileURL(current));
function inspect(contract,fixture){try{const r=contract.compare(structuredClone(fixture.a),structuredClone(fixture.b),expected);return {valid:r.valid,construction:r.construction,comparison:r.comparison,outcome:r.a?.outcome,cause:r.a?.cause,errors:[...new Set([...(r.errors||[]),...(r.a?.errors||[]),...(r.b?.errors||[])])],targetErrors:[...(r.a?.protocolTargets?.errors||[]),...(r.b?.protocolTargets?.errors||[])]};}catch(e){return {thrown:String(e)};}}
const original=originalCases(),complete=completeCases();
const rows=[...original.map(x=>({...x,suite:'original'})),...complete.map(x=>({...x,suite:'complete'}))].map(f=>({suite:f.suite,name:f.name,fixtureSha256:digest({name:f.name,a:f.a,b:f.b}),before:inspect(old,f),after:inspect(now,f)}));
const preserved=new Set(['protocol-complete positive control','valid pointer and touch completion','valid WebKit-style pointer cancel then touchend','valid both cancellation families','cancelled pointer with unfinished touch retained','unobserved cause claimed']);
const failures=[];
for(const r of rows){
 if(r.before.thrown||r.after.thrown)failures.push(r.name+': comparator threw');
 if(r.suite==='original'){
  if(!r.before.valid||r.before.construction!=='ESTABLISHED')failures.push(r.name+': immutable baseline no longer reproduces acceptance');
  if(r.after.construction==='ESTABLISHED')failures.push(r.name+': original incomplete evidence still accepted');
 }else if(preserved.has(r.name)){
  if(!r.after.valid||r.after.construction!=='ESTABLISHED')failures.push(r.name+': complete control rejected');
  const outcome=/cancel/i.test(r.name)?'CANCELLED':'COMPLETED';
  if(r.after.outcome!==outcome)failures.push(r.name+': wrong control outcome');
  if(r.after.cause!=='UNKNOWN')failures.push(r.name+': causal overclaim');
 }else if(r.after.construction==='ESTABLISHED')failures.push(r.name+': counterexample still establishes construction');
}
const report={schemaVersion:'iad-independent-source-replay-1',baselineSha256:sha(await fs.readFile(baseline)),currentSha256:sha(await fs.readFile(current)),fixtureSetSha256:digest({original,complete}),cases:rows.length,redToGreen:rows.filter(r=>r.before.construction==='ESTABLISHED'&&r.after.construction!=='ESTABLISHED').length,completeControlsPreserved:rows.filter(r=>r.suite==='complete'&&preserved.has(r.name)&&r.after.valid&&r.after.construction==='ESTABLISHED').length,failures,rows};
if(options['--out'])await fs.writeFile(path.resolve(options['--out']),JSON.stringify(report,null,2)+'\n');
console.log(`baseline SHA256 ${report.baselineSha256}\ncurrent SHA256 ${report.currentSha256}\nfixture set SHA256 ${report.fixtureSetSha256}`);
for(const r of rows)console.log(`${r.suite}: ${r.name} | ${r.before.construction}/${r.before.outcome} -> ${r.after.construction}/${r.after.outcome} | ${r.after.errors.join(',')||r.after.targetErrors.join(',')||'no errors'}`);
console.log(JSON.stringify({cases:report.cases,redToGreen:report.redToGreen,completeControlsPreserved:report.completeControlsPreserved,failures}));
if(failures.length)process.exitCode=1;
