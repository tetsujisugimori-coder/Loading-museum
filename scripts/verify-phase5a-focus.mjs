import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await realpath('out'),dest=path.resolve(process.env.EVIDENCE_DIR||'phase5a-focus-evidence');
await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const file=await realpath(path.resolve(root,'.'+p));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('missing')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const results={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),platform:process.platform,node:process.version,trackedChanges:execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),cases:[],errors:[]};
results.expected=(process.env.BROWSERS||'chromium,webkit').split(',').length*(process.env.PROBE_RED?7:9);
let browser,page;
try {
 for(const engine of (process.env.BROWSERS||'chromium,webkit').split(',')){
  browser=await ({chromium,webkit}[engine]).launch({headless:true});results[engine]=browser.version();
  page=await browser.newPage({viewport:{width:390,height:900}});page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
  await page.goto(`http://127.0.0.1:${server.address().port}/Loading-museum/`);
  const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();
  await room.locator('nav button').nth(15).click();
  const stage=room.getByTestId('phase5-stage'),reset=room.locator('article').getByRole('button',{name:'Reset',exact:true});
  const add=stage.getByRole('button',{name:'条件を追加',exact:true});
  const snapshot=()=>stage.evaluate(el=>({active:{tag:document.activeElement.tagName,text:document.activeElement.tagName==='BODY'?null:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label')},addDisabled:[...el.querySelectorAll('button')].find(b=>b.textContent==='条件を追加').disabled,conditions:[...el.querySelectorAll('fieldset')].map(f=>({legend:f.querySelector('legend').textContent,value:f.querySelector('input').value}))}));
  for(const scenario of [{name:'six-middle',count:6,index:2},{name:'six-first',count:6,index:0},{name:'six-last',count:6,index:5},{name:'middle',count:3,index:1},{name:'one-zero',count:1,index:0},{name:'or-delete',count:6,index:2,or:true},{name:'reduced-reset',count:6,index:2,reduced:true}]){
   await page.emulateMedia({reducedMotion:scenario.reduced?'reduce':'no-preference'});await reset.click();
   if(scenario.or)await stage.getByLabel('条件の結合').selectOption('OR');
   for(let i=1;i<scenario.count;i++)await add.click();
   const remove=stage.locator('fieldset').nth(scenario.index).getByRole('button');
   await remove.focus();const before=await snapshot();
   await stage.evaluate(el=>{window.phase5FocusEvents=[];const snap=kind=>window.phase5FocusEvents.push({kind,active:document.activeElement.tagName,disabled:[...el.querySelectorAll('button')].find(b=>b.textContent==='条件を追加').disabled,count:el.querySelectorAll('fieldset').length});window.phase5FocusObserver=new MutationObserver(()=>snap('mutation'));window.phase5FocusObserver.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});document.addEventListener('focusin',()=>snap('focusin'),{signal:(window.phase5FocusAbort=new AbortController()).signal});});
   await page.keyboard.press('Enter');await stage.locator('fieldset').count().then(n=>assert.equal(n,scenario.count-1));
   const after=await snapshot(),events=await page.evaluate(()=>{window.phase5FocusObserver.disconnect();window.phase5FocusAbort.abort();return window.phase5FocusEvents});
   const focusRestored=await add.evaluate(el=>el===document.activeElement);
   await page.keyboard.press('Shift+Tab');const shiftTab=await snapshot();await page.keyboard.press('Tab');const tab=await snapshot();
   const keyboardReturn=await add.evaluate(el=>el===document.activeElement);
   // Use the current keyboard location to re-add when focus was restored.
   if(keyboardReturn)await page.keyboard.press('Enter');else await add.click();
   assert.equal(await stage.locator('fieldset').count(),scenario.count);
   const record={engine,scenario:scenario.name,before,after,events,shiftTab,tab,readded:true,focusRestored,keyboardReturn,status:focusRestored&&keyboardReturn?'PASS':'RED'};
   results.cases.push(record);console.log(record.status,engine,scenario.name);
   if(!process.env.PROBE_RED){assert.equal(focusRestored,true,scenario.name+' post-commit focus');assert.equal(keyboardReturn,true,scenario.name+' Shift+Tab / Tab return');}
  }
  if(!process.env.PROBE_RED){
   await room.locator('nav button').nth(13).click();
   await stage.getByRole('button',{name:'2026-11-14',exact:true}).press('Enter');
   await stage.getByRole('button',{name:'2026-11-12',exact:true}).press('Enter');
   assert.equal(await stage.locator('p[role=status]').textContent(),'開始: 2026-11-12 ／ 終了: 2026-11-14');
   const closed=stage.getByRole('button',{name:'2026-11-13 休館日',exact:true});
   assert.equal(await closed.isDisabled(),true);assert.equal(await closed.getAttribute('data-range'),'true');
   await reset.click();await stage.getByRole('button',{name:'翌月',exact:true}).click();await stage.getByRole('button',{name:'翌月',exact:true}).click();
   await stage.getByRole('button',{name:'2027-01-02',exact:true}).press('Enter');await stage.getByRole('button',{name:'前月',exact:true}).click();await stage.getByRole('button',{name:'2026-12-30',exact:true}).press('Enter');
   assert.equal(await stage.locator('p[role=status]').textContent(),'開始: 2026-12-30 ／ 終了: 2027-01-02');
   results.cases.push({engine,scenario:'date-endpoints-reverse-cross-year',status:'PASS'});
   await room.locator('nav button').nth(17).click();
   const search=stage.getByLabel('候補を検索');await search.focus();await search.press('ArrowDown');
   const candidate=stage.locator('p[role=status]').first();
   assert.equal(await search.evaluate(el=>el===document.activeElement),true);assert.match(await candidate.textContent(),/アクセシビリティ（2 \/ 8）、未選択/);
   const described=await search.getAttribute('aria-describedby');assert.ok(described.split(' ').includes(await candidate.getAttribute('id')));
   await search.press('Enter');assert.equal(await stage.getByRole('button',{name:'アクセシビリティ',exact:true}).getAttribute('aria-pressed'),'true');assert.match(await candidate.textContent(),/選択済み/);
   await search.press('Enter');assert.equal(await stage.locator('[data-chip]').count(),0);
   await search.press('ArrowUp');await search.press('ArrowUp');await search.fill('入力');assert.match(await candidate.textContent(),/入力（1 \/ 1）/);
   // Synthetic composition verifies the handler, not a physical OS IME session.
   await search.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});assert.equal(await stage.locator('[data-chip]').count(),0);
   await search.press('Enter');await stage.getByLabel('選択上限').selectOption('1');await search.fill('通知');assert.match(await candidate.textContent(),/上限のため追加不可/);await search.press('Enter');assert.equal(await stage.locator('[data-chip]').count(),1);
   await search.fill('no-match');assert.equal(await candidate.textContent(),'現在の候補: 候補なし');await search.press('Escape');assert.match(await candidate.textContent(),/1 \/ 8/);
   await reset.click();await search.fill('入力');await search.press('Enter');assert.equal(await stage.locator('[data-chip]').count(),1);
   await stage.screenshot({path:path.join(dest,`${engine}-390-chips.png`)});
   results.cases.push({engine,scenario:'chips-focus-candidate-composition-cap-reset',status:'PASS',physicalIME:'NOT_TESTED',screenReader:'NOT_TESTED'});
  }
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.close();page=null;await browser.close();browser=null;
 }
}catch(e){results.errors.push(String(e.stack||e));process.exitCode=1;console.error(e)}finally{if(page)await page.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await new Promise(r=>server.close(r));results.finished=new Date().toISOString();results.complete=results.cases.length===results.expected&&!results.errors.length;if(!results.complete)process.exitCode=1;await writeFile(path.join(dest,'results.json'),JSON.stringify(results,null,2));}
