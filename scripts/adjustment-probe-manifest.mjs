/** Prepare a clean-checkout identity for physical handoff, without writing product state. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const PROBE_SOURCE_FILES=[
 'docs/phase6a5/touch-reacceptance/ios-range-instrument.js',
 'docs/phase6a5/touch-reacceptance/ios-native-range.html',
 'scripts/adjustment-physical-contract.mjs',
 'scripts/adjustment-png-evidence.mjs',
 'scripts/adjustment-probe-manifest.mjs',
 'scripts/verify-adjustment-probe.mjs',
 'app/components/practical/ImageAdjustment.tsx',
 'app/components/practical/adjustment-model.ts',
 'app/components/practical/image-adjustment.css',
 'app/components/practical/practical.css'
];
export function probeManifest({requireClean=true}={}){
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
 if(requireClean&&git('status','--porcelain'))throw Error('DIRTY_CHECKOUT: commit the intended sources before physical handoff');
 return {head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),sourceHashes:Object.fromEntries(PROBE_SOURCE_FILES.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(probeManifest(),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
