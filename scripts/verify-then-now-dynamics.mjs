// Small supplemental control: real pointer speed + distance, compared across the pair.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),engines=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await realpath('out'),dest=path.resolve(process.env.EVIDENCE_DIR||'docs/then-now-evidence/pointer-dynamics');await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname.replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const file=await realpath(path.resolve(root,'.'+p));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('missing');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases:[],errors:[]};let browser;
try{for(const name of (process.env.BROWSERS||'chromium,webkit').split(',')){
browser=await engines[name].launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
await page.goto(`http://127.0.0.1:${server.address().port}/Loading-museum/`);const room=page.locator('#flash-special-exhibit');await room.locator('.flashRoomEntrance').click();await room.locator('nav button').nth(6).click();const card=room.locator('[data-study=tn-cursor-creature]');await card.getByRole('button',{name:'両方を開始',exact:true}).press('Enter');const data={engine:name,width:1280};
for(const era of ['now','then']){
const panel=card.locator(`[data-era=${era}]`),svg=panel.locator('svg');await panel.getByRole('button',{name:'注視',exact:true}).click();await svg.scrollIntoViewIfNeeded();const b=await svg.boundingBox();
await page.mouse.move(b.x+b.width*.01,b.y+b.height*.5);await page.mouse.move(b.x+b.width*.04,b.y+b.height*.5);await page.waitForFunction(era=>document.querySelector(`[data-era=${era}] .tnReadout`)?.dataset.reaction==='WATCH',era);data[era+'Far']=await panel.locator('.tnReadout').textContent();
await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.waitForFunction(({era,expected})=>document.querySelector(`[data-era=${era}] .tnReadout`)?.dataset.reaction===expected&&(era==='now'||Number(document.querySelector(`[data-era=${era}] .tnReadout`)?.textContent.match(/距離 (\d+)/)?.[1])<30),{era,expected:era==='now'?'RETREAT':'WATCH'});data[era+'Near']=await panel.locator('.tnReadout').textContent();
if(era==='now')assert.ok(Number(data[era+'Near'].match(/入力速度 (\d+)/)?.[1])>650,data[era+'Near']);await svg.screenshot({path:path.join(dest,`${name}-${era}-fast-pointer.png`)});await page.mouse.move(0,0);await page.waitForFunction(era=>document.querySelector(`[data-era=${era}] .tnReadout`)?.dataset.reaction==='REST',era);
}
assert.deepEqual(errors,[]);await room.locator('.flashRoomCloseRow button').click();assert.equal(await room.locator('[data-study]').count(),0);result.cases.push({...data,status:'PASS'});console.log('PASS',name,'real pointer distance/speed pair');await browser.close();browser=null;
}}catch(e){result.errors.push(String(e.stack||e));console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));result.complete=!result.errors.length&&result.cases.length===(process.env.BROWSERS||'chromium,webkit').split(',').length;if(!result.complete)process.exitCode=1;await writeFile(path.join(dest,'results.json'),JSON.stringify(result,null,2));}
