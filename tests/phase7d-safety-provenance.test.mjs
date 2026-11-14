import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {capture,audit,sha256} from '../scripts/phase7d-safety-provenance.mjs';
const safetyTemp=path.resolve(process.env.SAFETY_TEMP||'work/safety/temp');fs.mkdirSync(safetyTemp,{recursive:true});
function fixture(){const root=fs.mkdtempSync(path.join(safetyTemp,'safety-prov-'));const repo=path.join(root,'repo'),build=path.join(root,'build'),http=path.join(root,'http');for(const p of [repo,build,http])fs.mkdirSync(p);const git=(...a)=>execFileSync('git',['-C',repo,...a],{encoding:'utf8'}).trim();git('init','-q');git('config','user.name','test');git('config','user.email','test@example.invalid');for(const f of ['source','contract','runner','auditor'])fs.writeFileSync(path.join(repo,f),f);git('add','.');git('commit','-qm','fixed');const head=git('rev-parse','HEAD');fs.writeFileSync(path.join(build,'app.js'),'const x=1;');fs.copyFileSync(path.join(build,'app.js'),path.join(http,'app.js'));const m=capture(repo,head,build,'contract',['runner','auditor']);const s={head,tree:m.source.tree,trialId:'validation-1',environment:{node:process.version},buildManifestSha256:sha256(JSON.stringify(m)),responses:[{path:'app.js',url:'http://127.0.0.1:1234/app.js',status:200,sha256:m.build['app.js'].sha256}]};return {repo,build,http,head,m,s,run:()=>audit(repo,head,build,m,http,s)};}
test('normal fixed Git object/source/build/HTTP bytes accepted',()=>assert.equal(fixture().run().status,'PASS'));
for(const [name,mutate] of Object.entries({
 'different HEAD':f=>f.m.source.head='0'.repeat(40),
 'source byte':f=>fs.appendFileSync(path.join(f.repo,'source'),'!'),
 'build replacement':f=>fs.writeFileSync(path.join(f.build,'app.js'),'other'),
 'manifest mismatch':f=>f.s.buildManifestSha256='0'.repeat(64),
 'tool version':f=>f.m.tools.runner='0'.repeat(64),
 'contract hash':f=>f.m.contractSha256='0'.repeat(64),
 'missing required source':f=>fs.unlinkSync(path.join(f.repo,'auditor')),
 'additional build':f=>fs.writeFileSync(path.join(f.build,'extra.js'),'extra'),
 'HTTP replacement':f=>fs.writeFileSync(path.join(f.http,'app.js'),'other'),
 'HTTP missing':f=>fs.unlinkSync(path.join(f.http,'app.js')),
 'HTTP extra':f=>fs.writeFileSync(path.join(f.http,'extra.js'),'extra'),
 'wrong blob':f=>f.m.source.files.source.blob='0'.repeat(40),
 'trial absent':f=>delete f.s.trialId,
}))test('reject '+name,()=>{const f=fixture();mutate(f);assert.throws(f.run);});
test('fixed policy rejects coordinated replacement but keeps normal identity build',()=>{const f=fixture(),policy={contract:'contract',tools:['runner','auditor'],sourceToBuild:{'app.js':'source'}};const bytes=fs.readFileSync(path.join(f.repo,'source'));for(const dir of [f.build,f.http])fs.writeFileSync(path.join(dir,'app.js'),bytes);Object.assign(f.m,capture(f.repo,f.head,f.build,'contract',['runner','auditor']));f.s.buildManifestSha256=sha256(JSON.stringify(f.m));f.s.responses[0].sha256=sha256(bytes);const check=()=>audit(f.repo,f.head,f.build,f.m,f.http,f.s,policy);assert.equal(check().status,'PASS');const changed=Buffer.from('coordinated swap');for(const dir of [f.build,f.http])fs.writeFileSync(path.join(dir,'app.js'),changed);f.m.build['app.js']={size:changed.length,sha256:sha256(changed)};f.s.buildManifestSha256=sha256(JSON.stringify(f.m));f.s.responses[0].sha256=sha256(changed);assert.throws(check,/identity-copy build/);});
test('fixed policy rejects self-selected contract and tool set',()=>{const f=fixture(),policy={contract:'contract',tools:['runner','auditor']};assert.equal(audit(f.repo,f.head,f.build,f.m,f.http,f.s,policy).status,'PASS');f.m.contract='source';f.m.contractSha256=f.m.source.files.source.sha256;f.s.buildManifestSha256=sha256(JSON.stringify(f.m));assert.throws(()=>audit(f.repo,f.head,f.build,f.m,f.http,f.s,policy),/fixed contract/);f.m.contract='contract';f.m.contractSha256=f.m.source.files.contract.sha256;delete f.m.tools.auditor;f.s.buildManifestSha256=sha256(JSON.stringify(f.m));assert.throws(()=>audit(f.repo,f.head,f.build,f.m,f.http,f.s,policy),/required tool set/);});
