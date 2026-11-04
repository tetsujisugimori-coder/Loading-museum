import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const file='app/components/practical/pan-zoom-model.ts',original=fs.readFileSync(file),s=original.toString('utf8');
const dir='work/panzoom-controls';fs.mkdirSync(dir,{recursive:true});const results=[];
const mutants=[
 {name:'pointer-anchor-forced-to-center',from:'const point = worldAt(v, anchor),',to:'anchor = { x: v.width / 2, y: v.height / 2 }; const point = worldAt(v, anchor),'},
 {name:'minimap-fixed-full-world',from:'return { x, y, width: clamp(b.x, 0, WORLD.width) - x, height: clamp(b.y, 0, WORLD.height) - y };',to:'return { x: 0, y: 0, width: 1000, height: 700 };'},
];
try{for(const m of mutants){assert.ok(s.includes(m.from));fs.writeFileSync(file,s.replace(m.from,m.to));const r=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--maxWorkers=2','tests/pan-zoom.test.tsx'],{encoding:'utf8',timeout:60000});fs.writeFileSync(`${dir}/${m.name}.log`,(r.stdout||'')+(r.stderr||''));assert.equal(r.error,undefined);assert.equal(r.status,1);assert.match((r.stdout||'')+(r.stderr||''),/AssertionError/);results.push({name:m.name,status:'REJECTED',exit:r.status});fs.writeFileSync(file,original)}}finally{fs.writeFileSync(file,original);fs.writeFileSync(`${dir}/results.json`,JSON.stringify({results,restored:fs.readFileSync(file).equals(original)},null,2))}
assert.equal(results.length,2);console.log('PASS: two source faults detected, original bytes restored');
