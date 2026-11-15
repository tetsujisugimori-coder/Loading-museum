import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hash,bytes,clone} from './core.mjs';
import {audit} from './auditor.mjs';
import {recorder} from './recorder.mjs';
import {transform,transformFile,createBlob} from './transform.mjs';
import {fixtures,event,base,expected,seal} from './fixtures.mjs';
const dest=process.argv[2];assert(dest);mkdirSync(dest,{recursive:false});const results=[];
for(const f of fixtures()){const before=bytes(f);const result=audit(f.input,f.expected);if(f.reason){assert(result.reasons.includes(f.reason),`${f.id}: ${JSON.stringify(result)}`);assert.equal(result.auditResult,'FAIL');}else{assert.equal(result.auditResult,'PASS',f.id);assert.equal(result.productResult,f.expected.primary.verdict);}assert(bytes(f).equals(before));results.push({id:f.id,reason:f.reason,result,inputSha256:hash(before)});writeFileSync(`${dest}/${f.id}.json`,JSON.stringify({fixture:f,result},null,2),{flag:'wx'});}
const r=recorder({slot:'synthetic-1',level:'I0',generation:0});for(let i=1;i<=4096;i++)assert(r.accept(event(i,'callback')));assert.equal(r.accept(event(4097,'callback')),false);assert.equal(r.snapshot().firstLost.seq,4097);assert.equal(r.snapshot().complete,false);
const head='5de4b08a2dc881ad2afcbe805b0776cb944ff882',path='scripts/diagnose-phase7d-api.mjs';
const input=execFileSync('git',['show',`${head}:${path}`]);const anchor='const state=await api(\'primary.getAttribute\',()=>root.getAttribute(\'data-state\'));';const start=input.indexOf(anchor);assert(start>=0);const fixed={head,tree:'89a84488c489161f167e06df34fbc25cca0a4c6e',path,blob:createBlob(input),sha256:hash(input)};
const replacement='/* isolated normalization only; not executable runner */';const output=Buffer.concat([input.subarray(0,start),Buffer.from(replacement),input.subarray(start+Buffer.byteLength(anchor))]);
const c={schemaVersion:1,...fixed,start,end:start+Buffer.byteLength(anchor),anchor,contextStart:Math.max(0,start-60),contextEnd:start+Buffer.byteLength(anchor)+60,replacement,contextSha256:'',postSha256:hash(output)};c.contextSha256=hash(input.subarray(c.contextStart,c.contextEnd));assert(transform(input,c,fixed).equals(output));
const neg=[['unknown field',x=>x.extra=1],['unknown schema',x=>x.schemaVersion=2],['blob',x=>x.blob='0'.repeat(40)],['span',x=>x.start++],['context',x=>x.contextSha256=hash('bad')],['post',x=>x.postSha256=hash('bad')],['missing',x=>delete x.anchor]];
for(const [id,mutate]of neg){const bad=clone(c);mutate(bad);assert.throws(()=>transform(input,bad,fixed));results.push({id:`transform-${id}`,result:'REJECTED'});}
const duplicate=Buffer.concat([input,Buffer.from(anchor)]);const df={...fixed,sha256:hash(duplicate),blob:createBlob(duplicate)};assert.throws(()=>transform(duplicate,{...c,...df},df),/ANCHOR_AMBIGUOUS/);
writeFileSync(`${dest}/source-original.mjs`,input,{flag:'wx'});transformFile(`${dest}/source-original.mjs`,`${dest}/normalized.txt`,c,fixed);assert.throws(()=>transformFile(`${dest}/source-original.mjs`,`${dest}/normalized.txt`,c,fixed),/EEXIST/);assert(readFileSync(`${dest}/source-original.mjs`).equals(input));writeFileSync(`${dest}/transform-contract.json`,JSON.stringify({fixed,contract:c},null,2));
const good=base();good.bodies[0].body='fault';good.bodies[0].actualSha256=hash('fault');seal(good);const ex=expected(base());ex.expectedFault='BODY_HASH_MISMATCH';const a=audit(good,ex);assert.equal(a.technicalControl,'PASS');assert.equal(a.productResult,'PASS');assert.equal(a.auditResult,'FAIL');
writeFileSync(`${dest}/results.json`,JSON.stringify({browserRuns:0,results,recorder4097:'PASS',exclusiveOutput:'PASS',expectedOnlyFault:a,oldImplementationRed:'NOT_TESTED_NO_OLD_IMPLEMENTATION'},null,2),{flag:'wx'});console.log(`PASS ${results.length} fixture/transform rows, recorder capacity, exclusive output, expected-only classification`);
