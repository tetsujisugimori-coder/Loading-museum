/** Pins expected bytes from this checked-out commit, separately from run output. */
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('DIRTY_EXPECTED_SOURCE');
const files=['diagnostics/scroll-geometry/protocol.json','diagnostics/scroll-geometry/recorder.mjs','diagnostics/scroll-geometry/contract.mjs','scripts/verify-scroll-geometry.mjs'];
const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(f))])));
console.log(JSON.stringify({head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),protocolHash:hashes[files[0]],sourceHash:sha(JSON.stringify(hashes))},null,2));
