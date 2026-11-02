import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await realpath('out'),dest=path.resolve(process.env.EVIDENCE_DIR||'docs/then-now-evidence/browser');await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const file=await realpath(path.resolve(root,'.'+p));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('missing');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/Loading-museum/`;
const engines=(process.env.BROWSERS||'chromium,webkit').split(','),widths=(process.env.WIDTHS||'375,390,1280').split(',').map(Number);
const studies=[['tn-vector-morph',2],['tn-cursor-creature',6],['tn-kinetic-type',1],['tn-physics',7],['tn-intro',12],['tn-sound',11]].slice(0,process.env.PHASE==='first'?3:6);
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),expected:engines.length*widths.length*studies.length,cases:[],errors:[]};
let browser,page;
try{for(const engine of engines){browser=await({chromium,webkit}[engine]).launch({headless:true});report[engine]=browser.version();for(const width of widths){page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>{sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen');window.__tnAudio=[];const Native=window.AudioContext;if(Native)window.AudioContext=class extends Native{constructor(...args){super(...args);window.__tnAudio.push(this);}};});
await page.goto(url);const room=page.locator('#flash-special-exhibit');await room.locator('.flashRoomEntrance').click();assert.equal(await room.locator('nav button').count(),18);
for(const [id,category] of studies){report.current={engine,width,id};await page.emulateMedia({reducedMotion:'no-preference'});await room.locator('nav button').nth(category).click();const card=room.locator(`[data-study="${id}"]`),now=card.locator('[data-era=now]'),then=card.locator('[data-era=then]');await card.scrollIntoViewIfNeeded();
const click=async(scope,name)=>{const b=scope.getByRole('button',{name,exact:true});if(width<500)await b.tap();else await b.click();};
const range=async(scope,label,value)=>{const slider=scope.getByRole('slider',{name:label,exact:true});await slider.focus();await slider.press('Home');const min=Number(await slider.getAttribute('min')),max=Number(await slider.getAttribute('max'));for(let i=0;i<20&&Number(await slider.inputValue())+(max-min)/10<=value;i++)await slider.press('PageUp');for(let i=0;i<100&&Number(await slider.inputValue())<value;i++)await slider.press('ArrowRight');assert.equal(Number(await slider.inputValue()),value);};
await click(card,'両方を開始');
if(id==='tn-vector-morph'){
await page.waitForFunction(()=>Number(document.querySelector('[data-study=tn-vector-morph] [data-progress]')?.dataset.progress)>.03);await click(card,'両方を停止');await range(now,'中間形状 %',50);const before=await now.locator('.tnShape').getAttribute('points');await range(now,'対応点のずれ',3);assert.notEqual(await now.locator('.tnShape').getAttribute('points'),before);assert.match(await now.locator('.tnReadout').textContent(),/t=0.50/);await click(then,'形を切替');assert.match(await then.locator('.tnReadout').textContent(),/円/);
}
if(id==='tn-cursor-creature'){
await click(now,'追従');await click(now,'左へ誘う');const svg=now.locator('svg');await svg.focus();await svg.press('ArrowRight');await svg.press('Enter');assert.match(await now.locator('.tnReadout').textContent(),/合図 1/);await svg.press('Escape');assert.equal(await now.locator('.tnReadout').getAttribute('data-reaction'),'REST');await click(now,'注視');await svg.scrollIntoViewIfNeeded();const box=await svg.boundingBox();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);await page.waitForFunction(()=>document.querySelector('[data-study=tn-cursor-creature] [data-era=now] .tnReadout')?.dataset.reaction!=='REST');await page.mouse.move(0,0);await page.waitForFunction(()=>document.querySelector('[data-study=tn-cursor-creature] [data-era=now] .tnReadout')?.dataset.reaction==='REST');await click(now,'回避');await click(now,'右へ誘う');
}
if(id==='tn-kinetic-type'){
await page.waitForFunction(()=>Number(document.querySelector('[data-study=tn-kinetic-type] [data-progress]')?.dataset.progress)>.03);await click(card,'両方を停止');await range(now,'時間位置 %',50);const transforms=await now.locator('[data-letter]').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('transform')));assert.equal(new Set(transforms).size,6);await click(now,'言葉を切替');assert.match(await now.locator('.tnReadout').textContent(),/EXPAND/);await range(now,'時間位置 %',50);await range(now,'文字の間隔',8);await click(then,'演出を切替');assert.match(await then.locator('.tnReadout').textContent(),/spread/);
}
if(id==='tn-physics')throw Error('second-phase physics acceptance not yet implemented');
if(id==='tn-intro')throw Error('second-phase intro acceptance not yet implemented');
if(id==='tn-sound')throw Error('second-phase sound acceptance not yet implemented');
const geometry=await card.evaluate(e=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,cardWidth:e.getBoundingClientRect().width,overflow:[...e.querySelectorAll('button,input,svg,select')].filter(n=>n.getBoundingClientRect().right>innerWidth+.5||n.getBoundingClientRect().left<-.5).length}));assert.ok(geometry.pageWidth<=width,JSON.stringify(geometry));assert.equal(geometry.overflow,0);assert.deepEqual(errors,[]);
if(width===375||width===1280)await card.screenshot({path:path.join(dest,`${engine}-${width}-${id}.png`)});
await page.emulateMedia({reducedMotion:'reduce'});await click(card,'Reset');assert.equal(await card.getAttribute('data-reduced'),'true');
if(id==='tn-vector-morph'){await range(now,'中間形状 %',50);assert.match(await now.locator('.tnReadout').textContent(),/t=0.50/);}
if(id==='tn-cursor-creature'){await click(card,'両方を開始');await click(now,'合図を送る');assert.match(await now.locator('.tnReadout').textContent(),/合図 1/);}
if(id==='tn-kinetic-type'){await range(now,'時間位置 %',50);assert.match(await now.locator('.tnReadout').textContent(),/進行 50%/);}
for(let i=0;i<4;i++){await click(card,(await card.getByRole('button',{name:'両方を開始',exact:true}).count())?'両方を開始':'両方を停止');}
await room.locator('.flashRoomCloseRow button').click();assert.equal(await room.locator('[data-study]').count(),0);await room.locator('.flashRoomEntrance').click();assert.equal(await card.getAttribute('data-playing'),'false');assert.deepEqual(errors,[]);
report.cases.push({engine,width,id,status:'PASS',geometry,reduced:true,closeReset:true});console.log('PASS',engine,width,id);
}await page.close();page=null;}await browser.close();browser=null;}}catch(e){report.errors.push(String(e.stack||e));console.error(e);if(page){report.diagnostic=await page.evaluate(()=>({scrollY,viewport:innerHeight,card:[...document.querySelectorAll('.tnMount,.tnCard')].map(e=>({tag:e.className,attributes:[...e.attributes].map(a=>[a.name,a.value]),box:e.getBoundingClientRect().toJSON()})),state:[...document.querySelectorAll('.tnReadout')].map(e=>e.textContent)})).catch(()=>null);await page.screenshot({path:path.join(dest,'failure.png'),fullPage:false}).catch(()=>{});}process.exitCode=1;}finally{if(page)await page.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await new Promise(r=>server.close(r));report.finished=new Date().toISOString();report.complete=report.cases.length===report.expected&&!report.errors.length;if(!report.complete)process.exitCode=1;await writeFile(path.join(dest,'results.json'),JSON.stringify(report,null,2));}
