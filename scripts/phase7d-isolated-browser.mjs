/** Explicit isolated validation only. No production108 import or execution path. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {isolatedPlan,isolatedSettings,validateIsolatedPlan,validateIsolatedResults,classifyControlledCase,assessControlledCase,isolatedProcessExitCode} from './phase7d-isolated-browser-contract.mjs';
import {auditIsolatedBuilds} from './audit-phase7d-isolated-browser.mjs';
import {boundaryInitScript} from './phase7d-boundary-instrument.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const err=e=>String(e?.stack||e);
function bundleInventory(dir){const out={};function walk(d,p=''){for(const n of fs.readdirSync(d).sort()){const f=path.join(d,n),st=fs.lstatSync(f);if(st.isSymbolicLink()){const resolved=fs.realpathSync(f);assert.ok(resolved.startsWith(path.resolve(dir)+path.sep));const b=fs.readFileSync(f);out[p+n]={link:fs.readlinkSync(f),size:b.length,sha256:sha(b)};}else if(st.isDirectory())walk(f,p+n+'/');else{const b=fs.readFileSync(f);out[p+n]={size:b.length,sha256:sha(b)};}}}walk(dir);return out;}
function inventory(dir){const out={};function walk(d,p=''){for(const n of fs.readdirSync(d).sort()){const f=path.join(d,n),s=fs.lstatSync(f);assert.ok(!s.isSymbolicLink());if(s.isDirectory())walk(f,p+n+'/');else{const b=fs.readFileSync(f);out[p+n]={size:b.length,sha256:sha(b)};}}}walk(dir);return out;}
export function planIdentity(pw,moduleName){const require=createRequire(import.meta.url);const version=require(path.join(path.dirname(require.resolve(moduleName)),'package.json')).version;assert.equal(version,'1.56.1');return{playwright:version,node:process.version,platform:process.platform,executables:Object.fromEntries(['chromium','webkit'].map(e=>{const p=pw[e].executablePath();return[e,{path:p,sha256:sha(fs.readFileSync(p)),bundleFiles:bundleInventory(path.dirname(p))}];}))};}
export async function prepareIsolated(dest,builds,pw,moduleName){
 fs.mkdirSync(dest,{recursive:false});
 const source=await import('./phase7d-execution-source.mjs');
 const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
 source.captureExecutionSource(process.cwd(),head,path.join(dest,'execution-source'),{scope:'isolated-browser'});
 const buildRecords={};for(const [k,dir]of Object.entries(builds)){const manifest=read(path.join(dir,'boundary-build.json'));assert.equal(manifest.head,head);assert.equal(manifest.tree,tree);assert.equal(manifest.success,true);assert.equal(manifest.group,'C');assert.equal(manifest.fault?.fault,k==='update-omission'?'update-omission':undefined);const files=inventory(path.join(dir,'out'));assert.deepEqual(Object.fromEntries(Object.entries(files).map(([f,x])=>[f,x.sha256])),manifest.outputHashes);const generatedTypes={};for(const rel of ['next-env.d.ts','tsconfig.tsbuildinfo']){const p=path.join(dir,rel);if(fs.existsSync(p)){const b=fs.readFileSync(p);generatedTypes[rel]={size:b.length,sha256:sha(b)};}}buildRecords[k]={dir,generatedTypes,manifestSha256:sha(fs.readFileSync(path.join(dir,'boundary-build.json'))),files};}
 const fixture=inventory('scripts/phase7d-safety-fixture');
 const plan={schema:1,head,tree,environment:planIdentity(pw,moduleName),...structuredClone(isolatedSettings),builds:buildRecords,fixture,plan:isolatedPlan,productionTrialsExecuted:0,retries:0,policy:'INDEPENDENT_FIXED_CASES; interruption skips next sentinel; unexpected preflight error stops all; no retries'};
 auditIsolatedBuilds(plan);write(path.join(dest,'plan.json'),plan);return plan;
}
function resourcePath(url){let p=decodeURIComponent(new URL(url).pathname).replace(/^\/Loading-museum(?=\/)/,'').replace(/^\//,'');if(!p||p.endsWith('/'))p+='index.html';assert.ok(p&&!p.split('/').includes('..'));return p;}
async function serverFor(root){const server=http.createServer((req,res)=>{try{const rel=resourcePath('http://localhost'+req.url),p=path.resolve(root,rel);assert.ok(p.startsWith(path.resolve(root)+path.sep));const b=fs.readFileSync(p);res.setHeader('content-type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.css')?'text/css':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end('missing');}});await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});return{server,url:`http://127.0.0.1:${server.address().port}`};}
async function modelOperation(page,r,base){
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto(base+'/?fault=normal&__isolated_trial='+encodeURIComponent(r.id)+'&__isolated_head='+r.head+'&__isolated_tree='+r.tree);await page.locator('#start').click();await page.clock.runFor(100);
 if(r.kind==='interruption'){await page.close();throw Error('CONTROLLED_PAGE_INTERRUPTION: page.close before primary observation; not native crash');}
 const value=await page.evaluate(()=>window.safetySnapshot());r.primary={state:value.dom,verdict:value.dom==='Done'&&value.committed==='Done'?'PASS':'FAIL',expected:'Done',observation:value};
}
async function reactOperation(page,r,base){
 await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
 await page.addInitScript(boundaryInitScript,{trialId:r.id,operationId:'whole-trial',limit:4096});
 await page.goto(base+'/Loading-museum/?__isolated_trial='+encodeURIComponent(r.id)+'&__isolated_head='+r.head+'&__isolated_tree='+r.tree+'#modern-exhibit-status-morph');const stage=page.locator('#modern-exhibit-status-morph'),root=stage.getByTestId('status-morph');await root.waitFor();await root.scrollIntoViewIfNeeded();assert.equal(await stage.locator('details[open]').count(),0);await stage.locator('summary').first().click();await stage.getByText('仕組みを見る',{exact:true}).click();assert.equal(await stage.locator('details[open]').count(),2);
 const button=name=>stage.getByRole('button',{name,exact:true}),check=async s=>assert.equal(await root.getAttribute('data-state'),s);
 await page.clock.install();const pause=await page.evaluate(()=>Date.now()+1000);await page.clock.pauseAt(pause);
 await button('模擬処理を開始').focus();await page.keyboard.press('Enter');await check('Loading');await button('取消').click();await page.clock.runFor(4000);await check('Cancelled');await button('Replay').click();await page.clock.runFor(3000);await check('Success');await stage.getByLabel('模擬結果',{exact:true}).selectOption('Error');await button('Replay').click();await button('Replay').click();
 await page.clock.runFor(3000);const state=await root.getAttribute('data-state');r.primary={state,verdict:state==='Error'?'PASS':'FAIL',expected:'Error'};
}
export async function runCleanupStep(row,stage,fn){
 if(stage==='browser.close')row.browserCloseAttempted=true;
 try{await fn();if(stage==='browser.close')row.browserCloseSucceeded=true;}
 catch(e){row.cleanupErrors.push({stage,error:err(e),code:e?.code||null});}
}
export async function runIsolated(dest,pw,moduleName){
 const plan=read(path.join(dest,'plan.json'));assert.equal(plan.head,git('rev-parse','HEAD'));assert.equal(plan.tree,git('rev-parse','HEAD^{tree}'));validateIsolatedPlan(plan);auditIsolatedBuilds(plan);assert.deepEqual(plan.environment,planIdentity(pw,moduleName));assert.equal(plan.productionTrialsExecuted,0);
 const source=await import('./phase7d-execution-source.mjs');source.auditExecutionSource(process.cwd(),plan.head,path.join(dest,'execution-source'),{scope:'isolated-browser'});
 assert.deepEqual(inventory('scripts/phase7d-safety-fixture'),plan.fixture);
 for(const b of Object.values(plan.builds)){assert.deepEqual(inventory(path.join(b.dir,'out')),b.files);assert.equal(sha(fs.readFileSync(path.join(b.dir,'boundary-build.json'))),b.manifestSha256);}
 // Reserve every slot before launch, including known unstarted sentinels.
 const rows=plan.plan.map(p=>({...p,head:plan.head,tree:plan.tree,attempted:false,primary:null,boundary:null,evidence:'NOT_TESTED',operationError:null,cleanupErrors:[],persistenceErrors:[],pageErrors:[],http:[],traceSaved:false,harSaved:false,browserCloseAttempted:false,browserCloseSucceeded:false,contextCloseSucceeded:false,saveFailureInjected:false,productionTrialsExecuted:0}));
 write(path.join(dest,'registration.json'),{head:plan.head,tree:plan.tree,planSha256:sha(fs.readFileSync(path.join(dest,'plan.json'))),rows});
 let stopReason=null;
 for(const r of rows){const dir=path.join(dest,r.id);fs.mkdirSync(dir);let browser,context,server;const captures=[];let cursor=0;const close=(stage,fn)=>runCleanupStep(r,stage,fn);const drain=async()=>{while(cursor<captures.length){const b=captures.slice(cursor);cursor=captures.length;const rs=await Promise.all(b);for(const x of rs)if(x)throw Error(x);}};
  try{
   if(r.kind==='unstarted'||stopReason){r.stopReason=stopReason||'reserved sentinel after controlled interruption';continue;}
   const build=r.scope==='MODEL_REAL_BROWSER'?path.resolve('scripts/phase7d-safety-fixture'):path.join(plan.builds[r.kind].dir,'out');const files=r.scope==='MODEL_REAL_BROWSER'?plan.fixture:plan.builds[r.kind].files;
   const served=await serverFor(build);server=served.server;r.attempted=true;r.evidence='INCOMPLETE';browser=await pw[r.engine].launch({headless:true,executablePath:plan.environment.executables[r.engine].path});r.browserVersion=browser.version();context=await browser.newContext({viewport:plan.viewport,reducedMotion:plan.motion,hasTouch:true,recordHar:{path:path.join(dir,'complete.har'),content:'embed',mode:'full'}});await context.tracing.start(plan.trace);const page=await context.newPage();page.setDefaultTimeout(plan.apiTimeoutMs);page.on('pageerror',e=>r.pageErrors.push(String(e)));
   page.on('response',res=>{const job=(async()=>{const url=res.url();if(!url.startsWith(served.url))throw Error('unexpected external response');const rel=resourcePath(url);if(!files[rel])throw Error('unregistered response resource: '+rel);assert.equal(res.status(),200);const bytes=await res.body();assert.deepEqual({size:bytes.length,sha256:sha(bytes)},files[rel]);const file=path.join(dir,'http',rel);fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file))assert.deepEqual(fs.readFileSync(file),bytes);else fs.writeFileSync(file,bytes,{flag:'wx'});r.http.push({url,path:rel,size:bytes.length,sha256:sha(bytes),status:res.status()});})();captures.push(job.then(()=>null,e=>err(e)));});
   if(r.scope==='MODEL_REAL_BROWSER')await modelOperation(page,r,served.url);else await reactOperation(page,r,served.url);
   write(path.join(dir,'primary.json'),r.primary); // persist BEFORE post-primary browser observation/cleanup
   if(r.scope==='NEXT_REACT_ISOLATED')r.boundary=await page.evaluate(()=>window.__phase7dBoundary);
   if(r.kind==='save-failure'){fs.mkdirSync(path.join(dir,'result.json'));r.saveFailureInjected=true;r.saveFailureTargetType='directory';} // real host write rejection, not a synthetic log edit
  }catch(e){r.operationError=err(e);if(!r.operationError.includes('CONTROLLED_PAGE_INTERRUPTION'))stopReason='unexpected operation failure at '+r.id;}finally{
   if(context)await close('trace.stop',async()=>{await context.tracing.stop({path:path.join(dir,'trace.zip')});r.traceSaved=fs.statSync(path.join(dir,'trace.zip')).size>0;});
   await close('response.capture',drain);
   if(context)await close('context.close',async()=>{await context.close();r.contextCloseSucceeded=true;r.harSaved=fs.statSync(path.join(dir,'complete.har')).size>0;if(r.kind==='cleanup-exception')throw Error('CONTROLLED_CONTEXT_CLOSE_REJECTION after real context.close; not browser crash');});
   if(browser)await close('browser.close',()=>browser.close());await close('response.capture.final',drain);
   if(server)await close('server.close',()=>new Promise((ok,no)=>server.close(e=>e?no(e):ok())));
   if(r.attempted)r.evidence=r.primary&&!r.operationError&&!r.cleanupErrors.length&&!r.pageErrors.length&&r.traceSaved&&r.harSaved&&r.http.length?'COMPLETE':'INCOMPLETE';
   try{write(path.join(dir,'result.json'),r);}catch(e){r.persistenceErrors.push({stage:'result.json',error:err(e),code:e?.code||null});r.evidence='INCOMPLETE';process.stderr.write(JSON.stringify({id:r.id,error:err(e)})+'\n');}
  }
 }
 return finalizeIsolatedResults(dest,plan,rows);
}
export function finalizeIsolatedResults(dest,plan,rows){
 const raw={head:plan.head,tree:plan.tree,results:rows,productionTrialsExecuted:0,realBrowserLaunches:rows.filter(r=>r.attempted).length,nativeCrashClaim:false};
 write(path.join(dest,'raw-results.json'),raw);
 try{validateIsolatedResults(rows);const summary={...raw,processExitCode:isolatedProcessExitCode(rows),results:rows.map(r=>({...r,validation:classifyControlledCase(r),assessment:assessControlledCase(r)}))};write(path.join(dest,'results.json'),summary);return summary;}
 catch(e){try{write(path.join(dest,'validation-error.json'),{error:err(e),processExitCode:1,rawResults:'raw-results.json'});}catch(saveError){process.stderr.write(JSON.stringify({stage:'validation-error.save',originalError:err(e),error:err(saveError)})+'\n');}throw e;}
}
async function main(){assert.equal(process.env.ISOLATED_VALIDATION,'1','explicit isolated validation required');assert.ok(!process.env.PRODUCTION_108,'production forbidden');const [command,dest,...rest]=process.argv.slice(2);assert.ok(['prepare','run'].includes(command));assert.equal(rest.length,command==='prepare'?2:0);const require=createRequire(import.meta.url),moduleName=process.env.PLAYWRIGHT_MODULE||'playwright',pw=require(moduleName);if(command==='prepare')await prepareIsolated(path.resolve(dest),{normal:path.resolve(rest[0]),'update-omission':path.resolve(rest[1])},pw,moduleName);else{const summary=await runIsolated(path.resolve(dest),pw,moduleName);process.exitCode=isolatedProcessExitCode(summary.results);}}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(err(e));process.exitCode=1;});
