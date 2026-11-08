/** Local, read-only diagnostic host. Never deploy this server or open an upload endpoint. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {probeManifest} from './adjustment-probe-manifest.mjs';
export const HANDOFF_FILES=['scripts/serve-iphone-touch.mjs','diagnostics/iphone-touch/controls.js','diagnostics/iphone-touch/index.html','scripts/prepare-iphone-touch.mjs','scripts/verify-iphone-touch-handoff.mjs'];
export async function handoffManifest({requireClean=true}={}) {
 const m=probeManifest({requireClean});
 return {...m,sourceHashes:{...m.sourceHashes,...Object.fromEntries(await Promise.all(HANDOFF_FILES.map(async f=>[f,createHash('sha256').update(await fs.readFile(f)).digest('hex')])))} };
}
export async function exportHashes(root=path.resolve('out')) {
 const result={};async function walk(dir){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const f=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('EXPORT_SYMLINK');if(entry.isDirectory())await walk(f);else result[path.relative(root,f).split(path.sep).join('/')]=createHash('sha256').update(await fs.readFile(f)).digest('hex');}}await walk(root);return result;
}
export async function verifiedManifest(){const source=await handoffManifest(),built=JSON.parse(await fs.readFile('work/iphone-build.json','utf8'));if(JSON.stringify(source)!==JSON.stringify(built.source))throw Error('BUILD_SOURCE_MISMATCH');const hashes=await exportHashes();if(JSON.stringify(hashes)!==JSON.stringify(built.exportHashes))throw Error('BUILD_EXPORT_MISMATCH');return {...source,build:{builtAt:built.builtAt,exportHashes:hashes}};}
export async function createDiagnosticServer({root=process.cwd(),manifest}={}) {
 const out=path.resolve(root,'out'),fixture=path.resolve(root,'docs/phase6a5/touch-reacceptance');
 const fixed=new Map([['/diagnostic/',path.resolve(root,'diagnostics/iphone-touch/index.html')],['/diagnostic/controls.js',path.resolve(root,'diagnostics/iphone-touch/controls.js')],['/diagnostic/recorder.js',path.join(fixture,'ios-range-instrument.js')],['/diagnostic/plain.html',path.join(fixture,'ios-native-range.html')]]);
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try {
   if(req.method!=='GET'){res.writeHead(405);res.end('Read only');return;}
   const u=new URL(req.url,'http://localhost');
   if(u.pathname==='/diagnostic/manifest.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(manifest));return;}
   let f=fixed.get(u.pathname);
   if(!f){let p=decodeURIComponent(u.pathname);if(!p.startsWith('/Loading-museum/'))throw Error('route');p=p.slice('/Loading-museum'.length);if(p.endsWith('/'))p+='index.html';f=path.resolve(out,'.'+p);const real=await fs.realpath(f);if(!real.startsWith(out+path.sep))throw Error('path');f=real;}
   let bytes=await fs.readFile(f);const ext=path.extname(f);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[ext]||'application/octet-stream');
   if(f===fixed.get('/diagnostic/plain.html'))bytes=Buffer.from(bytes.toString().replace('<script src="./ios-range-instrument.js"></script>',''));
   if(ext==='.html'&&u.searchParams.get('probe')==='1'){
    let html=bytes.toString();
    bytes=html.replace('</body>','<script src="/diagnostic/controls.js"></script></body>');
   }
   res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=process.env.DIAGNOSTIC_HOST||'127.0.0.1',port=Number(process.env.DIAGNOSTIC_PORT||4173);
 const manifest=await verifiedManifest();await fs.access('out/index.html');
 const server=await createDiagnosticServer({manifest});server.listen(port,host,()=>console.log(`Local diagnostic: http://${host}:${port}/diagnostic/ (no upload API; physical NOT_TESTED)`));
}
