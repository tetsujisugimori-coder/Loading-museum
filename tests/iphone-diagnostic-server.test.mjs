import {createHash} from 'node:crypto';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createDiagnosticServer} from '../scripts/serve-iphone-touch.mjs';
test('read only allowlist, opt-in injection and original bytes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'iad73-'));for(const d of ['out','diagnostics/iphone-touch','docs/phase6a5/touch-reacceptance'])await fs.mkdir(path.join(root,d),{recursive:true});
 const html='<body>product</body>';await fs.writeFile(path.join(root,'out/index.html'),html);await fs.writeFile(path.join(root,'secret'),'private');
 await fs.writeFile(path.join(root,'docs/phase6a5/touch-reacceptance/ios-native-range.html'),'<body><script src="./ios-range-instrument.js"></script></body>');
 const hash=x=>createHash('sha256').update(x).digest('hex');const manifest={head:'test',build:{exportHashes:{'index.html':hash(html)}},sourceHashes:{'docs/phase6a5/touch-reacceptance/ios-native-range.html':hash('<body><script src="./ios-range-instrument.js"></script></body>')}};const s=await createDiagnosticServer({root,manifest});await new Promise(r=>s.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${s.address().port}`;
 try{assert.equal(await(await fetch(url+'/Loading-museum/')).text(),html);assert.match(await(await fetch(url+'/Loading-museum/?probe=1')).text(),/controls.js/);assert.equal(await fs.readFile(path.join(root,'out/index.html'),'utf8'),html);
 assert.doesNotMatch(await(await fetch(url+'/diagnostic/plain.html?probe=1')).text(),/ios-range-instrument.js/);
 for(const p of ['/secret','/package.json','/Loading-museum/%2e%2e/secret','/Loading-museum/%2e%2e%2fsecret'])assert.equal((await fetch(url+p)).status,404);
 assert.equal((await fetch(url+'/diagnostic/manifest.json',{method:'POST',body:'secret'})).status,405);
 assert.deepEqual(await(await fetch(url+'/diagnostic/manifest.json')).json(),manifest);
 await fs.writeFile(path.join(root,'out/index.html'),'CHANGED AFTER START');assert.equal((await fetch(url+'/Loading-museum/')).status,409);
 await fs.writeFile(path.join(root,'docs/phase6a5/touch-reacceptance/ios-native-range.html'),'ALTERED');assert.equal((await fetch(url+'/diagnostic/plain.html?probe=1')).status,409);
 await fs.symlink(path.join(root,'secret'),path.join(root,'out/link'));assert.equal((await fetch(url+'/Loading-museum/link')).status,404);
 }finally{await new Promise(r=>s.close(r));await fs.rm(root,{recursive:true,force:true});}
});
