// Targeted R2 repetition and negative control on the same static main/PR builds.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {recordVisibility,settledVisibility} from './browser-regression-observation.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await realpath(process.env.EXPORT_DIR||'out'),dest=process.env.EVIDENCE_DIR||'work/regression-timing';await mkdir(dest,{recursive:true});
const report={runId:process.env.REGRESSION_RUN_ID||null,harnessHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),harnessTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),exportTree:process.env.EXPORT_TREE||execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),exportHead:process.env.EXPORT_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),root,indexSHA256:createHash('sha256').update(await readFile(path.join(root,'index.html'))).digest('hex'),cases:[],notTested:['physical input','physical Safari','OS backgrounding'],clock:'performance.now; separate test IntersectionObserver + DOM MutationObserver, not compositor paint'};
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const f=await realpath(path.resolve(root,'.'+p));assert.ok(f.startsWith(root+path.sep));res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(await readFile(f));}catch{res.statusCode=404;res.end('missing');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{for(const engine of (process.env.BROWSERS||'chromium,webkit').split(',')){
 browser=await pw[engine].launch({headless:true,...(engine==='chromium'&&process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 for(const width of (process.env.WIDTHS||'375,390,765,1280').split(',').map(Number)){
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(10000);const r={engine,version:browser.version(),width,cycles:[]};report.cases.push(r);
  await page.goto(`http://127.0.0.1:${server.address().port}/Loading-museum/`);const room=page.locator('.practicalRoom:not(.phase4Room)');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();
  const stage=room.getByTestId('practical-stage');await recordVisibility(stage);
  for(let i=0;i<3;i++){
   await stage.scrollIntoViewIfNeeded();const visible=await settledVisibility(stage,true);
   await page.evaluate(()=>window.scrollTo(0,0));if(process.env.REGRESSION_STEP_FAULT==='neverStops'){await settledVisibility(stage,false);await stage.evaluate(el=>el.setAttribute('data-active','true'));r.injectedFault='neverStops';}const offscreen=await settledVisibility(stage,false);
   await stage.scrollIntoViewIfNeeded();const reentry=await settledVisibility(stage,true);
   // A newer scroll interrupts the prior scroll request; expect the latest geometry.
   await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('.practicalRoom:not(.phase4Room) .practicalStage').scrollIntoView({block:'center'});});
   const interrupted=await settledVisibility(stage,true);r.cycles.push({visible,offscreen,reentry,interrupted});
  }
  await stage.screenshot({path:path.join(dest,`${engine}-${width}-visible.png`)});
  await page.evaluate(()=>window.scrollTo(0,0));await settledVisibility(stage,false);
  await stage.evaluate(el=>el.setAttribute('data-active','true'));
  let faultError;try{await settledVisibility(stage,false);}catch(e){faultError=String(e);}
  assert.match(faultError||'',/visibility did not settle within 10000ms/,'a stage that fails to stop must be rejected');
  r.fault={kind:'test-only DOM active=true while offscreen',rejected:true,error:faultError};
  await stage.evaluate(el=>el.setAttribute('data-active','false'));r.recovery=await settledVisibility(stage,false);
  await stage.scrollIntoViewIfNeeded();r.finalReentry=await settledVisibility(stage,true);
  r.newExhibitMounted=await page.locator('.beforeAfterCompare').count();assert.equal(r.newExhibitMounted,0);r.status='PASS';await page.close();console.log(JSON.stringify({engine,width,status:r.status,faultRejected:r.fault.rejected}));
 }await browser.close();browser=null;
}}catch(e){report.error=String(e.stack||e);const c=report.cases.at(-1);if(c)c.status='FAIL';process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));report.status=report.error?'FAIL':'PASS';await writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2));}
