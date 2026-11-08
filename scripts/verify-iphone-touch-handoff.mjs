/** Browser validation of preparation only, not physical iPhone acceptance. */
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {createDiagnosticServer,verifiedManifest} from './serve-iphone-touch.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=path.resolve(process.env.HANDOFF_EVIDENCE||'work/iphone-handoff');await fs.mkdir(dir,{recursive:true});
const manifest=await verifiedManifest(),server=await createDiagnosticServer({manifest});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const report={manifest,physicalDevice:'NOT_TESTED',physicalNeutrality:'NOT_TESTED',rows:[],errors:[],node:process.version};
try{for(const engine of ['chromium','webkit']){const browser=await pw[engine].launch();try{for(const method of ['mouse','tap'])for(const surface of ['product','plain'])for(let rep=0;rep<2;rep++){
 const modes=rep?['full','minimal','off','absent']:['absent','off','minimal','full'];let baseline;
 for(const mode of modes){const context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));const suffix=mode==='absent'?'':'?probe=1';
 await page.goto(origin+(surface==='product'?'/Loading-museum/':'/diagnostic/plain.html')+suffix);
 let range;if(surface==='product'){const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();await room.locator('nav button').filter({hasText:'Image Adjustment'}).click();range=page.getByLabel('Brightness スライダー',{exact:true});}else range=page.locator('#probe-range');
 await range.scrollIntoViewIfNeeded();
 if(mode!=='absent'){
  for(const [k,v]of Object.entries({device:'automated emulator',os:process.platform,browser:engine,operator:'CI-not-physical',sessionId:'ci-handoff'}))await page.locator(`#iad73 input[name=${k}]`).fill(v);
  await page.locator('#iad73 select[name=method]').selectOption(method);await page.locator('#iad73 select[name=inputKind]').selectOption('playwright');await page.locator('#iad73 select[name=mode]').selectOption(mode);await page.locator('#iad73 form button').click();await page.waitForFunction(()=>window.__iad73?.state()==='recording');
 }
 const before=await range.boundingBox();assert(before);
 const x=before.x+before.width*.75,y=before.y+before.height/2;if(method==='mouse')await page.mouse.click(x,y);else await page.touchscreen.tap(x,y);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const final=await range.evaluate(el=>{const s=document.querySelector('[data-testid=image-adjustment]');return {value:el.value,preview:s?.dataset.preview??null,committed:s?.dataset.committed??null,history:s?.dataset.history??null,pending:s?.dataset.pending??null};});
 let sealed=null;
 if(mode!=='absent'){
  // Real pointer delivery to seal control, rather than synthetic click.
  const sb=await page.locator('#iad73-seal').boundingBox();if(method==='tap')await page.touchscreen.tap(sb.x+sb.width/2,sb.y+sb.height/2);else await page.locator('#iad73-seal').click();sealed=await page.evaluate(()=>window.__iad73.report());assert.equal(sealed.final.value,final.value);if(surface==='product')assert.equal(sealed.final.history,Number(final.history));
  if(mode==='full')assert.equal(sealed.events.filter(e=>e.phase==='capture'&&e.type==='pointerdown').length,1,'seal pointer is excluded');
  await page.evaluate(()=>{document.activeElement?.blur();document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));});assert.deepEqual(await page.evaluate(()=>window.__iad73.report()),sealed,'sealed output immutable');
  // Automated records cannot become operator-attested physical evidence.
  assert.equal(sealed.metadata.inputKind,'playwright');sealed.handoff.automatedPreparationCheck=true;
 }
 const row={engine,browser:browser.version(),method,surface,rep,mode,before,final,errors,sealed};
 if(!baseline)baseline={before,final};else{assert.deepEqual(before,baseline.before,'mode changes geometry');assert.deepEqual(final,baseline.final,'instrumentation changes final UI');}
 assert.deepEqual(errors,[]);const name=`${engine}-${method}-${surface}-${rep}-${mode}`;const png=await page.screenshot();await fs.writeFile(path.join(dir,name+'.png'),png);row.png={file:name+'.png',sha256:createHash('sha256').update(png).digest('hex')};report.rows.push(row);
 }finally{await context.close();}
 }
}}finally{await browser.close();}}
}catch(e){report.errors.push(e.stack);process.exitCode=1;}finally{await new Promise(r=>server.close(r));report.expectedRows=64;report.status=report.errors.length||report.rows.length!==64?'FAIL':'PREPARATION_CHECKS_PASS';if(report.status==='FAIL')process.exitCode=1;await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,rows:report.rows.length,errors:report.errors,physicalDevice:report.physicalDevice}));}
