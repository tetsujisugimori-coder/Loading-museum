/** New browser observation of the physical-test recorder. NOT physical-device acceptance. */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {probeManifest} from './adjustment-probe-manifest.mjs';
import {validateProbe,compareProbeTrials,loadProbeFile} from './adjustment-physical-contract.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=path.resolve(process.env.PROBE_EVIDENCE||'work/touch-probe'),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
await fs.mkdir(output,{recursive:true});
const expected=probeManifest({requireClean:process.env.REQUIRE_CLEAN==='1'});
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(expected,null,2));
const report={...expected,dirty:git('status','--porcelain'),node:process.version,platform:process.platform,playwright:require(`${process.env.PLAYWRIGHT_MODULE||'playwright'}/package.json`).version,cases:[],controls:[],errors:[],physicalDeviceResult:'NOT_TESTED',webKitNativeDrag:'NOT_TESTED: public Touchscreen drag API unavailable'};
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;let root;if(p.startsWith('/fixture/')){root=path.resolve('docs/phase6a5/touch-reacceptance');p=p.slice('/fixture'.length);}else{root=path.resolve('out');p=p.replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';}const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
try{for(const engine of ['chromium','webkit']){const browser=await pw[engine].launch();try{
 const records=[];
 for(const method of (engine==='chromium'?['mouse','tap','drag']:['mouse','tap']))for(const capture of [false,true]){
  let geometry;
  for(const surface of ['product','plain-html']){const context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
   const metadata={...expected,trialId:`${engine}-${method}-${capture}`,repetition:1,method,inputKind:'playwright',device:'emulated 390x1000',os:process.platform,browser:`${engine} ${browser.version()}`,operator:'automated recorder validation',sessionId:'pr72-probe-validation',capture};
   await page.addInitScript(m=>window.__iadTouchProbeConfig=m,metadata);
   let range;
   if(surface==='product'){await page.goto(origin+'/Loading-museum/');const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();await room.locator('nav button').filter({hasText:'Image Adjustment'}).click();range=page.getByLabel('Brightness スライダー',{exact:true});await range.scrollIntoViewIfNeeded();geometry=await range.boundingBox();}
   else{await page.goto(origin+`/fixture/ios-native-range.html?x=${geometry.x}&y=${geometry.y}&w=${geometry.width}&h=${geometry.height}`);range=page.locator('#probe-range');}
   await range.evaluate((el,capture)=>{el.style.touchAction='auto';if(capture)el.addEventListener('pointerdown',e=>el.setPointerCapture(e.pointerId));},capture);
   await page.addScriptTag({path:'docs/phase6a5/touch-reacceptance/ios-range-instrument.js'});
   const before=await range.boundingBox(),b=before;
   if(method==='mouse')await page.mouse.click(b.x+b.width*.75,b.y+b.height/2);
   else if(method==='tap')await page.touchscreen.tap(b.x+b.width*.75,b.y+b.height/2);
   else{const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width*.5,y:b.y+b.height/2,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*.75,y:b.y+b.height/2,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const r=await page.evaluate(()=>window.__iadTouchProbe.finish());
   const filename=`${metadata.trialId}-${surface}`,png=await page.screenshot();r.png={file:filename+'.png',sha256:createHash('sha256').update(png).digest('hex')};await fs.writeFile(path.join(output,r.png.file),png);await fs.writeFile(path.join(output,filename+'.json'),JSON.stringify(r,null,2));
   assert.deepEqual(await range.boundingBox(),before,'recorder changes geometry');assert.equal(errors.length,0,'pageerror');
   const validated=validateProbe(r,expected);loadProbeFile(path.join(output,filename+'.json'));records.push(r);
   // Export-time blur and late events must not overwrite the sealed result.
   await page.evaluate(()=>{document.activeElement.blur();document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:99}));});
   const {png:pngEvidence,...sealedReport}=r;void pngEvidence;
   assert.deepEqual(await page.evaluate(()=>window.__iadTouchProbe.report()),sealedReport);
   report.cases.push({file:filename+'.json',engine,method,capture,surface,validation:validated,png:r.png,status:'PASS'});
  }finally{await context.close();}
  }
 }
 const compared=compareProbeTrials(records,expected,{minimumRepetitions:1,requiredMethods:engine==='chromium'?['mouse','tap','drag']:['mouse','tap']});report.controls.push({engine,pairedComparison:compared});
 // Synthetic unit checks test observer coverage only, never native acceptance.
 const context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true}),page=await context.newPage();
 try{await page.goto(origin+'/fixture/ios-native-range.html?x=0&y=0&w=280&h=32');const before=await page.locator('#probe-range').boundingBox();assert.equal(before.x,0);assert.equal(before.y,0);
 const events=await page.evaluate(()=>{const r=document.querySelector('#probe-range');r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:123,pointerType:'touch'}));document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:123,pointerType:'touch'}));document.body.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerId:123,pointerType:'touch'}));return window.__iadTouchProbe.finish().events.filter(e=>e.phase==='capture'&&e.pointerId===123);});
 assert.deepEqual(events.map(e=>e.type),['pointerdown','pointerup','lostpointercapture']);assert(events.every(e=>e.isTrusted===false));report.controls.push({engine,zeroCoordinates:before,syntheticLostCapture:events,status:'PASS'});
 }finally{await context.close();}
 }finally{await browser.close();}}
}catch(e){report.errors.push(String(e.stack||e));process.exitCode=1;}finally{server.close();if(report.cases.length!==20)report.errors.push('INCOMPLETE_EXPECTED_20_CASES');report.status=report.errors.length?'FAIL':'RECORDER_VALIDATION_PASS';report.nativeProductAcceptance=report.errors.length?'NOT_TESTED':report.cases.some(c=>c.validation.acceptance==='FAIL')?'FAIL':'PASS';await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,cases:report.cases.length,errors:report.errors,nativeProductAcceptance:report.nativeProductAcceptance,physicalDeviceResult:'NOT_TESTED'}));}
