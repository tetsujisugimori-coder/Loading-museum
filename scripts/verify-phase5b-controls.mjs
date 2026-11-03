// Actual source mutations, isolated from built browser output; always restore bytes.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const file='app/components/practical/phase5b-model.ts',original=fs.readFileSync(file),source=original.toString('utf8').replaceAll('\r\n','\n'),dest=process.env.CONTROL_DIR||'work/phase5b-controls';fs.mkdirSync(dest,{recursive:true});
const cases=[
 {name:'move-no-op',needle:'const card=cards.find(c=>c.id===id);',replacement:'return cards; const card=cards.find(c=>c.id===id);',test:'tests/phase5b-editors.test.tsx'},
 {name:'wrong-card-identity',needle:'target.splice(index,0,{...card,column});',replacement:'target.splice(index,0,{...cards.find(c=>c.id!==id),column});',test:'tests/phase5b-editors.test.tsx'},
 {name:'cycle-accepted',needle:"return reaches(to)?'循環する接続はできません':'';",replacement:"return '';",test:'tests/phase5b-editors.test.tsx'},
 {name:'diff-order-reversed',needle:'return result;\n}',replacement:'return result.reverse();\n}',test:'tests/phase5b-compare.test.tsx'}
];
const results=[];
try{for(const c of cases){assert.ok(source.includes(c.needle),`Mutation location missing: ${c.name}`);fs.writeFileSync(file,source.replace(c.needle,c.replacement));const r=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--maxWorkers=2',c.test],{encoding:'utf8',timeout:60000});fs.writeFileSync(path.join(dest,`${c.name}.log`),(r.stdout||'')+(r.stderr||''));assert.equal(r.error,undefined);assert.notEqual(r.status,0,'Mutant unexpectedly survived');assert.match(r.stdout,/AssertionError|failed/);results.push({name:c.name,exit:r.status,status:'REJECTED',test:c.test});fs.writeFileSync(file,original);}}
finally{fs.writeFileSync(file,original);fs.writeFileSync(path.join(dest,'results.json'),JSON.stringify({results,restored:fs.readFileSync(file).equals(original),complete:results.length===cases.length},null,2))}
assert.equal(results.length,cases.length);console.log('PASS: all four source mutations rejected; original bytes restored');
