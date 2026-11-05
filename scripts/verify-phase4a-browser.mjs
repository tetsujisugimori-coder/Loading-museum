import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('out'),dest=path.resolve(process.env.EVIDENCE_DIR||'docs/phase4a-evidence/browser');await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw Error('path');await stat(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('missing')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/Loading-museum/`;
const engines=(process.env.BROWSERS||'chromium,webkit').split(','),widths=(process.env.WIDTHS||'375,390,765,1280').split(',').map(Number);
assert.ok(engines.length&&engines.every(e=>['chromium','webkit'].includes(e)));assert.ok(widths.length&&widths.every(w=>Number.isInteger(w)&&w>=320));
const allIds=['toast-stack','undo-snackbar','inline-validation','search-suggestions','sliding-tabs','animated-accordion'];
const ids=process.env.EXHIBITS?process.env.EXHIBITS.split(','):allIds;assert.ok(ids.length&&ids.every(id=>allIds.includes(id))&&new Set(ids).size===ids.length);
const results={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),expected:engines.length*widths.length*ids.length,cases:[],files:[],errors:[]};
let browser,page;
async function save(name,buffer){await writeFile(path.join(dest,name),buffer);results.files.push({name,size:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')});}
try{
  for(const engine of engines){browser=await({chromium,webkit}[engine]).launch({headless:true});
    for(const width of widths){page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<500});const errors=[];page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(url);assert.match(await page.locator('body').textContent(),/265 OBJECTS/);
      const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
      const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();const choices=room.locator('nav button');assert.equal(await choices.count(),26);
      for(let index=0;index<ids.length;index++){
        const id=ids[index],started=new Date().toISOString(),observations=[];results.currentCase={engine,width,id,observations};
        await choices.nth(allIds.indexOf(ids[index])).click();const article=room.locator('article'),stage=article.getByTestId('practical-stage');await stage.scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>document.querySelector('.phase4Stage')?.dataset.active==='true');
        const click=async name=>{await article.getByRole('button',{name,exact:true}).click();await stage.scrollIntoViewIfNeeded();};
        const reset=async()=>{await click('Reset');await page.waitForFunction(()=>document.querySelector('.phase4Stage')?.dataset.active==='true');};
        const reduce=async()=>{const start=Date.now();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.phase4Stage')?.dataset.reduced==='true',null,{timeout:5000});observations.push({reducedPreferenceObservedMs:Date.now()-start});};
        const before=await stage.screenshot();let rendered;
        if(id==='toast-stack'){
          // Capacity and individual removal are independent of wall-clock speed.
          // Freeze the documented observation clock while preparing this state.
          await click('停止');
          for(let n=0;n<5;n++)await click('通知を追加');assert.equal(await stage.locator('[data-row]').count(),4);assert.equal(await stage.locator('[data-row]').getByText('情報 #1',{exact:true}).count(),0);
          await stage.getByRole('button',{name:'通知 3 を解除',exact:true}).focus();await click('通知 3 を解除');assert.equal(await stage.locator('[data-row]').count(),3);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'通知スタック');
          await stage.getByLabel('通知の種類').selectOption('成功');await click('通知を追加');assert.equal(await stage.getByText('成功 #6',{exact:true}).count(),1);rendered=await stage.screenshot();
          await article.getByLabel('動きの速さ').selectOption('1600');await click('再生');
          const reflow=await stage.evaluate(async e=>{const row=e.querySelector('[data-row="5"]'),oldTop=row.offsetTop,samples=[],start=performance.now();e.querySelector('button[aria-label="通知 4 を解除"]').click();await new Promise(resolve=>{const sample=stamp=>{samples.push({ms:stamp-start,top:row.getBoundingClientRect().top-row.parentElement.getBoundingClientRect().top});if(stamp-start<1800)requestAnimationFrame(sample);else resolve()};requestAnimationFrame(sample)});return{oldTop,newTop:row.offsetTop,samples}});
          observations.push({reflow});assert.ok(reflow.newTop<reflow.oldTop);assert.ok(reflow.samples.some(sample=>sample.top>reflow.newTop+.5&&sample.top<reflow.oldTop-.5),'reflow must paint an intermediate position');
          await click('停止');const remaining=await stage.locator('[data-row]').allTextContents();await page.waitForTimeout(250);assert.deepEqual(await stage.locator('[data-row]').allTextContents(),remaining);
          await reset();await click('通知を追加');await reduce();await stage.locator('[data-row]').getByText('情報 #1',{exact:true}).waitFor({state:'detached',timeout:7000});assert.equal(await stage.locator('[data-row]').count(),0);
          await reset();await click('通知を追加');await page.evaluate(()=>window.scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('.phase4Stage')?.dataset.active==='false');const text=await stage.locator('[data-row]').textContent();await page.waitForTimeout(250);assert.equal(await stage.locator('[data-row]').textContent(),text);await stage.scrollIntoViewIfNeeded();
          observations.push('cap4/oldest dismissal; middle removal/reflow; types; independent finite lifetime; pause/offscreen; reduced expiry; reset then reoperate');
        }
        if(id==='undo-snackbar'){
          await click('展示のしおりを模擬削除');assert.equal(await stage.locator('[data-row]').count(),2);assert.equal(await stage.getByRole('button',{name:'Undo',exact:true}).evaluate(e=>document.activeElement===e),true);await click('Undo');await page.waitForTimeout(700);
          assert.equal(await stage.locator('[data-row]').count(),3);assert.equal(await stage.locator('[data-row]').nth(1).getAttribute('data-row'),'1');
          await click('図録メモを模擬削除');await click('展示のしおりを模擬削除');await click('Undo');assert.equal(await stage.getByRole('button',{name:'図録メモを模擬削除'}).count(),0);assert.equal(await stage.getByRole('button',{name:'展示のしおりを模擬削除'}).count(),1);rendered=await stage.screenshot();
          await reset();await click('図録メモを模擬削除');await reduce();await stage.getByRole('button',{name:'Undo',exact:true}).waitFor({state:'detached',timeout:7000});assert.match(await stage.locator('p[role=status]').textContent(),/期限切れ/);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'操作の取り消し状態');
          await reset();await click('図録メモを模擬削除');await click('今すぐ確定');assert.equal(await stage.getByRole('button',{name:'Undo',exact:true}).count(),0);await reset();assert.equal(await stage.locator('[data-row]').count(),3);
          observations.push('remove/restore original position and focus; consecutive deletion commits older pending; expiry; explicit commit; reset restores three');
        }
        if(id==='inline-validation'){
          const input=stage.getByRole('textbox');await input.fill('a');assert.equal(await input.getAttribute('aria-invalid'),'false');await input.press('Enter');assert.equal(await input.getAttribute('aria-invalid'),'true');await page.waitForTimeout(450);rendered=await stage.screenshot();
          const heightError=await stage.locator('.phase4Message').evaluate(e=>e.getBoundingClientRect().height);assert.ok(heightError>0);await input.fill('美術館');assert.equal(await input.evaluate(e=>document.activeElement===e),true);await input.press('Enter');assert.equal(await input.getAttribute('aria-invalid'),'false');
          await input.dispatchEvent('compositionstart');await input.fill('に');await input.dispatchEvent('keydown',{key:'Enter',isComposing:true,keyCode:229});assert.equal(await stage.getAttribute('data-state'),'composing');assert.equal(await input.getAttribute('aria-invalid'),'false');await input.fill('日本語');await input.dispatchEvent('compositionend',{data:'日本語'});await input.press('Enter');assert.equal(await stage.getAttribute('data-state'),'valid');
          await reset();assert.equal(await stage.getAttribute('data-state'),'empty');await stage.getByRole('textbox').fill('再操作');await stage.getByRole('textbox').press('Enter');await reduce();assert.equal(await stage.getAttribute('data-state'),'valid');
          observations.push('untouched/editing/error/valid; message measured height; focus retained; synthetic composition suppresses Enter; reset and reduced reoperation');
        }
        if(id==='search-suggestions'){
          const input=stage.getByRole('combobox');await input.fill('a');assert.equal(await stage.getByRole('option').first().textContent(),'Accordion Notes');await input.fill('at');assert.deepEqual(await stage.getByRole('option').allTextContents(),['Motion Atlas','Search Atlas','Animation Basics']);await input.fill('ta');await input.press('ArrowDown');await input.press('Enter');assert.equal(await input.inputValue(),'Tabs Guide');assert.equal(await input.getAttribute('aria-expanded'),'false');assert.equal(await input.evaluate(e=>document.activeElement===e),true);rendered=await stage.screenshot();
          await input.fill('zzzz');assert.equal(await stage.getByText('候補なし',{exact:true}).count(),1);await input.fill('Guide');const option=stage.getByRole('option',{name:'Toast Guide',exact:true});if(width<500)await option.tap();else await option.click();assert.equal(await input.inputValue(),'Toast Guide');await input.press('ArrowDown');await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
          await reset();await article.getByLabel('動きの速さ').selectOption('1600');await stage.getByRole('combobox').fill('Search');await reduce();await stage.getByRole('combobox').press('ArrowDown');await stage.getByRole('combobox').press('Enter');assert.match(await stage.locator('p[role=status]').textContent(),/Search Atlas/);
          observations.push('filter/add/remove/reorder; active descendant; keyboard and click/tap choose; no results; Escape; rapid edits; reset and reduced');
        }
        if(id==='sliding-tabs'){
          const tabs=stage.getByRole('tab'),band=stage.locator('.phase4TabIndicator');await page.waitForTimeout(700);const initial=await band.boundingBox();await tabs.nth(1).click();await page.waitForTimeout(220);const middle=await band.boundingBox();rendered=await stage.screenshot();await page.waitForTimeout(500);const final=await band.boundingBox(),target=await tabs.nth(1).boundingBox();assert.ok(Math.abs(final.x-target.x)<1&&Math.abs(final.width-target.width)<1);assert.notEqual(initial.width,final.width);assert.ok(middle.x>initial.x&&middle.x<final.x);
          await tabs.nth(1).press('End');await tabs.nth(2).press('ArrowRight');await tabs.nth(0).press('ArrowLeft');assert.equal(await tabs.nth(2).getAttribute('aria-selected'),'true');assert.equal(await stage.getByRole('tabpanel').count(),1);assert.match(await stage.getByRole('tabpanel').textContent(),/資料へ/);
          await reduce();await tabs.nth(0).click();await page.waitForTimeout(50);const reduced=await band.boundingBox(),first=await tabs.nth(0).boundingBox();assert.ok(Math.abs(reduced.x-first.x)<1);await reset();assert.equal(await stage.getByRole('tab').first().getAttribute('aria-selected'),'true');
          observations.push({indicator:{initial,middle,final,target}},'width/position/content; roving keyboard wrap; rapid changes; reduced snap; reset');
        }
        if(id==='animated-accordion'){
          const settled=()=>page.waitForFunction(()=>[...document.querySelectorAll('.phase4AccordionSection')].every(s=>s.querySelector('.phase4AccordionPanel').dataset.phase===(s.querySelector('button').getAttribute('aria-expanded')==='true'?'open':'closed')),null,{timeout:5000});await article.getByLabel('動きの速さ').selectOption('1600');const short=stage.getByRole('button',{name:'短い説明',exact:true}),long=stage.getByRole('button',{name:'操作と観察',exact:true});
          const reversal=await stage.evaluate(async e=>{const panel=e.querySelector('.phase4AccordionPanel'),button=e.querySelector('h4 button'),target=panel.firstElementChild.getBoundingClientRect().height,samples=[],start=performance.now();let reversed=false,reversalHeight=0,frame=0,complete=false;return await new Promise(resolve=>{const finish=timedOut=>{if(complete)return;complete=true;cancelAnimationFrame(frame);clearTimeout(timer);resolve({target,reversed,reversalHeight,timedOut,samples,finalHeight:panel.getBoundingClientRect().height,phase:panel.dataset.phase})};const timer=setTimeout(()=>finish(true),5000);button.click();const sample=stamp=>{const height=panel.getBoundingClientRect().height;samples.push({ms:stamp-start,height,phase:panel.dataset.phase});if(!reversed&&stamp-start>=250&&height>.5&&height<target-.5){reversed=true;reversalHeight=height;button.click()}if(reversed&&panel.dataset.phase==='closed'&&Math.round(height)===0)finish(false);else frame=requestAnimationFrame(sample)};frame=requestAnimationFrame(sample)})});observations.push({reversal});assert.equal(reversal.timedOut,false);assert.equal(reversal.reversed,true);assert.ok(reversal.reversalHeight>0&&reversal.reversalHeight<reversal.target);assert.equal(Math.round(reversal.finalHeight),0);assert.equal(reversal.phase,'closed');
          await short.click();await settled();await long.click();await settled();rendered=await stage.screenshot();assert.equal(await short.getAttribute('aria-expanded'),'false');assert.equal(await stage.getByRole('region').count(),1);
          await stage.getByLabel('展開方式').selectOption('multiple');await short.click();await page.waitForTimeout(300);
          await stage.evaluate(e=>{window.__phase4MediaTrace=[];const sample=type=>window.__phase4MediaTrace.push({type,stamp:performance.now(),matches:matchMedia('(prefers-reduced-motion: reduce)').matches,reduced:e.dataset.reduced,phases:[...e.querySelectorAll('.phase4AccordionPanel')].map(p=>p.dataset.phase)});const media=matchMedia('(prefers-reduced-motion: reduce)');const nativeChange=()=>sample('native-change');media.addEventListener('change',nativeChange,{once:true});const observer=new MutationObserver(()=>sample('dom-change'));observer.observe(e,{attributes:true,subtree:true,attributeFilter:['data-reduced','data-phase']});sample('before');window.__phase4MediaCleanup=()=>{media.removeEventListener('change',nativeChange);observer.disconnect()};});
          await reduce();await settled();observations.push({mediaObserved:await stage.evaluate(e=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,reduced:e.dataset.reduced,trace:window.__phase4MediaTrace}))});await page.evaluate(()=>window.__phase4MediaCleanup?.());assert.equal(await stage.getByRole('region').count(),2);for(const p of await stage.getByRole('region').all())assert.equal(await p.getAttribute('data-phase'),'open');await short.press('End');assert.match(await page.evaluate(()=>document.activeElement.textContent),/資料と補足/);await reset();assert.equal(await stage.getByRole('region').count(),0);
          observations.push('midflight reversal from current height; variable content; single/multiple; adjacent layout; reduced finish; heading keyboard; reset');
        }
        await page.emulateMedia({reducedMotion:'no-preference'});assert.ok(observations.length);assert.notDeepEqual(before,rendered,`${id}: visible state must change`);
        await save(`${engine}-${width}-${id}-before.png`,before);await save(`${engine}-${width}-${id}-after.png`,rendered);
        const geometry=await article.evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,stage:e.querySelector('.phase4Stage').getBoundingClientRect().toJSON()}));assert.ok(geometry.scrollWidth<=geometry.width+1,`${id}: horizontal overflow`);
        await reset();assert.equal(await article.getByTestId('practical-stage').count(),1);await page.waitForTimeout(100);const stable=await stage.textContent();await page.waitForTimeout(750);assert.equal(await stage.textContent(),stable,`${id}: stale callback after Reset`);assert.equal(await stage.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,`${id}: Reset must dispose motion`);
        await room.getByRole('button',{name:'部品展示室を閉じる',exact:true}).click();assert.equal(await room.getByTestId('practical-stage').count(),0);await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();assert.equal(await room.getByTestId('practical-stage').count(),1);
        results.cases.push({engine,version:browser.version(),width,id,status:'PASS',started,ended:new Date().toISOString(),geometry,observations});console.log(`${engine} ${width} ${id} PASS`);
      }
      assert.deepEqual(errors,[]);const afterStorage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));assert.deepEqual(afterStorage.local,storage.local); // title intro may mark session as seen; phase4 never writes storage
      assert.ok(Object.keys(afterStorage.session).every(key=>key in storage.session||key.includes('title')));
      results.errors.push(...errors);await page.close();
    }await browser.close();browser=null;
  }
  assert.equal(results.cases.length,results.expected);assert.equal(new Set(results.cases.map(c=>`${c.engine}/${c.width}/${c.id}`)).size,results.expected);
}catch(error){results.error=String(error.stack||error);process.exitCode=1;if(page){try{results.failure={url:page.url(),text:await page.locator('.phase4Room article').textContent(),state:await page.evaluate(()=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,stage:[...document.querySelectorAll('.phase4Stage')].map(e=>({active:e.dataset.active,reduced:e.dataset.reduced,phases:[...e.querySelectorAll('.phase4AccordionPanel')].map(p=>p.dataset.phase)})),trace:window.__phase4MediaTrace}))};await save('failure.png',await page.screenshot());}catch{}}}
finally{if(browser)await browser.close();server.close();results.ended=new Date().toISOString();await writeFile(path.join(dest,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({expected:results.expected,passed:results.cases.length,error:results.error}));}
