import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {sourceDigest,outputDigest,validateBuild} from './build-layer-composer.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const engines=(process.env.BROWSERS||'chromium,webkit').split(','),widths=(process.env.WIDTHS||'375,390,765,1280').split(',').map(Number),motions=['no-preference','reduce'];
assert.ok(engines.length&&engines.every(x=>['chromium','webkit'].includes(x)));assert.ok(widths.length&&widths.every(x=>[375,390,765,1280].includes(x)));assert.equal(new Set(engines).size,engines.length);assert.equal(new Set(widths).size,widths.length);
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim(),hash=b=>createHash('sha256').update(b).digest('hex');
const dest=path.resolve(process.env.EVIDENCE_DIR||'work/phase7d',new Date().toISOString().replaceAll(':','-'));await fs.mkdir(dest,{recursive:true});
const report={status:'RUNNING',head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),sourceHash:await sourceDigest(),outputHash:await outputDigest(),dirty:git('status','--porcelain'),started:new Date().toISOString(),expected:engines.length*widths.length*2,cases:[],files:[],webkitExecutable:process.env.WEBKIT_PATH||'Playwright default',limitations:['Physical iOS Safari, VoiceOver and physical touch drag NOT_TESTED','Tab visibility event is simulated; real background-tab lifecycle NOT_TESTED','Range values use native keyboard events; WebKit native range touch acceptance is not claimed','Each work uses a fresh context; cross-work browser history is not part of the timing oracle']};
if(process.env.REQUIRE_CLEAN==='1'){assert.equal(report.dirty,'');validateBuild(JSON.parse(await fs.readFile('out/.layer-build.json','utf8')),{...report});}
const save=async(name,bytes)=>{await fs.writeFile(path.join(dest,name),bytes);report.files.push({name,sha256:hash(bytes)});};
const server=spawn(process.execPath,['scripts/serve-static-export.mjs','out'],{stdio:['ignore','pipe','inherit']});const [data]=await once(server.stdout,'data');const url=String(data).trim();let browser,context;
try{
 for(const engine of engines){for(const width of widths)for(const motion of motions){
  // Isolate each matrix condition so discarded contexts and trace caches cannot accumulate.
  report.attempting={engine,width,motion,stage:'launch'};browser=await pw[engine].launch({headless:true,...(engine==='webkit'&&process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{})});
  report.attempting.stage='execution';const c={engine,width,motion,browserVersion:browser.version(),status:'RUNNING',works:[],checks:[]};report.cases.push(c);
  context=await browser.newContext({viewport:{width,height:1000},reducedMotion:motion,hasTouch:true});await context.tracing.start({screenshots:true,snapshots:true});let page=await context.newPage();page.setDefaultTimeout(9000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));await page.goto(url);
  assert.match(await page.locator('.archiveMeta').innerText(),/13 ROOMS \/ 292 OBJECTS/);assert.equal(await page.locator('.roomDirectory > li').count(),13);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));c.checks.push('inventory-no-overflow');
  const nav=page.getByRole('navigation',{name:'歴史と現代から展示を探す'});const history=nav.getByRole('button',{name:/Historical Motion/});await history.focus();await page.keyboard.press('Enter');assert.equal(await history.getAttribute('aria-pressed'),'true');await nav.getByLabel('全館の作品・展示室・タグで検索').fill('Cursor Creature');assert.equal(await nav.locator('.catalogResults li').count(),1);const crossHref=await nav.locator('.catalogResults a').getAttribute('href');await nav.getByRole('button',{name:/Modern Motion/}).click();await nav.getByLabel('全館の作品・展示室・タグで検索').fill('Cursor Creature');assert.equal(await nav.locator('.catalogResults a').getAttribute('href'),crossHref);await nav.locator('.catalogResults a').click();await page.waitForFunction(()=>document.querySelector('#flash-special-exhibit')?.getAttribute('data-open')==='true');await page.locator(crossHref).waitFor({state:'visible'});c.checks.push('cross-reference-single-instance');
  await page.goto(url+'#finder');await page.waitForFunction(()=>document.querySelector('#macintosh-birth-room-toggle')?.getAttribute('aria-expanded')==='true');await page.locator('#finder').waitFor({state:'visible'});await page.goto(url+'#loading-gallery');await page.locator('#loading-gallery').waitFor({state:'visible'});c.checks.push('old-url-anchors');
  await context.tracing.stop({path:path.join(dest,`${engine}-${width}-${motion}-navigation-trace.zip`)});report.files.push({name:`${engine}-${width}-${motion}-navigation-trace.zip`,sha256:hash(await fs.readFile(path.join(dest,`${engine}-${width}-${motion}-navigation-trace.zip`)))});await context.close();context=null;
  const ids=['press-release','hold-confirm','magnetic-attraction','swipe-dismiss','focus-halo','status-morph'];
  for(const id of ids){
   context=await browser.newContext({viewport:{width,height:1000},reducedMotion:motion,hasTouch:true});await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();page.setDefaultTimeout(9000);page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
   await page.goto(url+`#modern-exhibit-${id}`);const stage=page.locator(`#modern-exhibit-${id}`),root=stage.getByTestId(id==='hold-confirm'?'hold-to-confirm':id==='swipe-dismiss'?'swipe-to-dismiss':id);await root.waitFor();await root.scrollIntoViewIfNeeded();const work={id,checks:[]};c.works.push(work);
   assert.equal(await stage.locator('details[open]').count(),0);await stage.locator('summary').first().click();await stage.getByText('仕組みを見る',{exact:true}).click();assert.equal(await stage.locator('details[open]').count(),2);work.checks.push('three-layers-initially-closed');
   const button=name=>stage.getByRole('button',{name,exact:true}),state=()=>root.getAttribute('data-state');
   await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
   if(id==='press-release'){
    const target=stage.getByRole('button',{name:'押して離す'});await target.focus();await page.keyboard.down('Space');await page.clock.runFor(200);assert.equal(await state(),'holding');assert.ok(Number(await root.getAttribute('data-depth'))>0);await page.keyboard.up('Space');await page.clock.runFor(1100);assert.equal(await state(),'idle');
    await page.keyboard.down('Space');await page.clock.runFor(50);await page.keyboard.press('Escape');await page.keyboard.up('Space');await page.clock.runFor(1500);assert.equal(await state(),'cancelled');
   }
   if(id==='hold-confirm'){
    const target=stage.getByRole('button',{name:'長押しで確定'});await target.focus();await page.keyboard.down('Space');await page.clock.runFor(100);await page.keyboard.up('Space');await page.clock.runFor(4000);assert.equal(await state(),'cancelled');await button('Reset').click();await target.focus();await page.keyboard.down('Space');await page.clock.runFor(3200);assert.equal(await state(),'confirmed');await page.keyboard.up('Space');
   }
   if(id==='swipe-dismiss'){
    const target=stage.getByRole('button',{name:'スワイプするカード'});await target.focus();await page.keyboard.press('ArrowRight');await page.clock.runFor(500);assert.equal(await state(),'dismissed');await button('Undo').click();assert.equal(await state(),'idle');
    await page.clock.runFor(300);await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+130,b.y+b.height/2,{steps:8});await page.mouse.up();await page.clock.runFor(500);assert.equal(await state(),'dismissed');await button('Undo').click();
   }
   if(id==='magnetic-attraction'){
    const target=stage.getByRole('button',{name:'磁力の対象。矢印キーで仮想ポインターを動かす'});await target.focus();await page.keyboard.press('ArrowRight');assert.equal(await state(),'Attracted');assert.equal(Number(await root.getAttribute('data-x'))>0,motion==='no-preference');await page.keyboard.press('Escape');assert.equal(await state(),'Rest');await button('仮想ポインターを左へ').click();assert.equal(await state(),'Attracted');
    work.geometry=await stage.getByTestId('magnetic-measured').innerText();const actual=await target.evaluate(el=>{const b=el.getBoundingClientRect(),s=el.parentElement.getBoundingClientRect();return {x:b.left+b.width/2-s.left-s.width/2,y:b.top+b.height/2-s.top-s.height/2};});const observed=work.geometry.match(/\((-?[\d.]+), (-?[\d.]+) CSS px\)/);assert.ok(observed,'numeric measured geometry');assert.ok(Math.abs(Number(observed[1])-actual.x)<.02);assert.ok(Math.abs(Number(observed[2])-actual.y)<.02);work.measuredGeometry={actual,text:work.geometry};work.checks.push('dom-measurement-independently-matched');
   }
   if(id==='focus-halo'){
    await button('入口').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'詳しく見る');assert.match(await stage.getByTestId('halo-observation').innerText(),/詳しく見る/);await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'入口');assert.equal(await stage.getByTestId('focus-halo-decoration').getAttribute('aria-hidden'),'true');
   }
   if(id==='status-morph'){
    await button('模擬処理を開始').focus();await page.keyboard.press('Enter');assert.equal(await state(),'Loading');await button('取消').click();await page.clock.runFor(4000);assert.equal(await state(),'Cancelled');await button('Replay').click();await page.clock.runFor(3000);assert.equal(await state(),'Success');await stage.getByLabel('模擬結果',{exact:true}).selectOption('Error');await button('Replay').click();await button('Replay').click();await page.clock.runFor(3000);assert.equal(await state(),'Error');
   }
   work.checks.push('specific-editing-and-continuous-input','cancel-no-stale-write','keyboard-operation');
   await button('Reset').click();const box=await button('Reset').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);work.checks.push('automated-touch-reset');
   const expectedStopped={'press-release':'cancelled','hold-confirm':'cancelled','swipe-dismiss':'cancelled','magnetic-attraction':'Rest','focus-halo':'Idle','status-morph':'Cancelled'}[id];
   const beginActive=async()=>{
    await button('Reset').click();await root.scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.clock.runFor(30);
    if(id==='press-release'||id==='hold-confirm'){await stage.getByRole('button',{name:id==='press-release'?'押して離す':'長押しで確定',exact:true}).focus();await page.keyboard.down('Space');await page.clock.runFor(50);assert.ok(['pressed','holding'].includes(await state()));}
    if(id==='swipe-dismiss'){await stage.getByRole('button',{name:'スワイプするカード'}).focus();await page.keyboard.press('ArrowRight');assert.ok(['dismissing','dismissed'].includes(await state()));}
    if(id==='magnetic-attraction'){await button('仮想ポインターを右へ').click();assert.equal(await state(),'Attracted');}
    if(id==='focus-halo'){await button('入口').focus();assert.equal(await state(),'Following');}
    if(id==='status-morph'){await button('模擬処理を開始').click();assert.equal(await state(),'Loading');}
   };
   // Swipe's reduced-mode settlement can finish immediately, so use a held pointer drag as the lifecycle subject.
   const beginLifecycle=async()=>{await beginActive();if(id==='swipe-dismiss'){await button('Reset').click();const target=stage.getByRole('button',{name:'スワイプするカード'}),b=await target.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+30,b.y+b.height/2,{steps:3});assert.equal(await state(),'dragging');}};
   const releaseInput=async()=>{await page.keyboard.up('Space');await page.mouse.up();};
   await beginLifecycle();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(4000);assert.equal(await state(),expectedStopped);await releaseInput();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(4000);assert.equal(await state(),expectedStopped);work.checks.push('active-hidden-cancel-no-auto-resume');
   await beginLifecycle();await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(150);await page.clock.runFor(100);await page.waitForTimeout(150);assert.equal(await state(),expectedStopped);await releaseInput();await root.scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.clock.runFor(4000);assert.equal(await state(),expectedStopped);work.checks.push('active-offscreen-cancel-no-auto-resume');
   await page.clock.resume();await page.setViewportSize({width:width===375?390:375,height:850});await root.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width,height:1000});await root.scrollIntoViewIfNeeded();
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>document.documentElement.style.fontSize='');work.checks.push('resize-200percent-no-overflow');
   await save(`${engine}-${width}-${motion}-${id}.png`,await stage.screenshot());await save(`${engine}-${width}-${motion}-${id}.json`,JSON.stringify({id,state:await root.getAttribute('data-state'),text:await root.innerText()},null,2));
   await page.locator('.modernRoom').getByRole('button',{name:'展示室を閉じる',exact:true}).click();assert.equal(await root.count(),0);work.checks.push('close-unmount');
   const traceName=`${engine}-${width}-${motion}-${id}-trace.zip`;await context.tracing.stop({path:path.join(dest,traceName)});report.files.push({name:traceName,sha256:hash(await fs.readFile(path.join(dest,traceName)))});await context.close();context=null;
  }
  assert.deepEqual(errors,[]);c.checks.push('no-browser-errors');c.status='PASS';await browser.close();browser=null;console.log(`${engine}/${width}/${motion} PASS`);
 }}
 assert.equal(report.cases.length,report.expected);assert.ok(report.cases.every(c=>c.status==='PASS'&&c.works.length===6));report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack||error);if(report.cases.at(-1)?.status==='RUNNING')report.cases.at(-1).status='FAIL';console.error(report.error);process.exitCode=1;}finally{if(context){await context.tracing.stop({path:path.join(dest,'failure-trace.zip')}).catch(()=>{});await context.close();}if(browser)await browser.close();server.kill();report.finished=new Date().toISOString();await fs.writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2));console.log('Evidence '+dest);}
