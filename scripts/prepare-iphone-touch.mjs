/** Build a clean fixed checkout and bind served export bytes to that source identity. */
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {handoffManifest,exportHashes} from './serve-iphone-touch.mjs';
const before=await handoffManifest();
if(process.platform==='win32')execFileSync('cmd.exe',['/d','/s','/c','npm run build'],{stdio:'inherit'});
else execFileSync('npm',['run','build'],{stdio:'inherit'});
const after=await handoffManifest();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('SOURCE_CHANGED_DURING_BUILD');
await fs.mkdir('work',{recursive:true});await fs.writeFile('work/iphone-build.json',JSON.stringify({source:after,exportHashes:await exportHashes(),builtAt:new Date().toISOString()},null,2));
console.log('Fixed source and export recorded. Start serve-iphone-touch.mjs; no publishing.');
