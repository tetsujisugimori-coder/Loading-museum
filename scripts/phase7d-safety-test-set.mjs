import fs from 'node:fs';import assert from 'node:assert/strict';import {sha256} from './phase7d-safety-provenance.mjs';
const files=fs.readdirSync('tests').filter(n=>/^phase7d-.*\.test\.tsx?$/.test(n)).map(n=>'tests/'+n).sort();
const command=JSON.parse(fs.readFileSync('package.json')).scripts.test;for(const f of files)assert.ok(command.split(/\s+/).includes(f),'missing standard test: '+f);assert.equal(files.length,4);assert.ok(!command.includes('phase7d-*'));
console.log(JSON.stringify({platform:process.platform,files,filesSha256:sha256(JSON.stringify(files)),sourceHashes:Object.fromEntries(files.map(f=>[f,sha256(fs.readFileSync(f))]))},null,2));
