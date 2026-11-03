import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {once} from 'node:events';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn('node',[process.env.MUSEUM_SERVER||'scripts/serve-static-export.mjs','out']);
const [data]=await once(server.stdout,'data');const url=String(data).trim();
const browser=await chromium.launch({headless:true});const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),runs:[]};
try{for(const mode of ['keyboard-then-direct','direct-only','keyboard-settled-then-direct'])for(let iteration=0;iteration<12;iteration++){
const page=await browser.newPage({viewport:{width:375,height:900},hasTouch:true});await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));await page.goto(url);
const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();await room.locator('nav button').nth(14).click();const stage=room.getByTestId('phase5-stage');await stage.scrollIntoViewIfNeeded();const viewport=stage.getByRole('region');
await viewport.evaluate(e=>{window.trace=[];window.snap=kind=>{const rows=[...document.querySelectorAll('[data-virtual-row]')];const s={kind,at:performance.now(),top:e.scrollTop,modelTop:Number(document.querySelector('[data-scroll-top]').textContent),label:Number(document.querySelector('[data-dom-count]').textContent),rows:rows.length,first:rows[0]?.dataset.id,last:rows.at(-1)?.dataset.id};window.trace.push(s);return s;};e.addEventListener('scroll',()=>window.snap('scroll'));e.addEventListener('scrollend',()=>window.snap('scrollend'));new MutationObserver(()=>window.snap('mutation')).observe(document.querySelector('.phase5Virtual'),{childList:true,subtree:true,characterData:true});window.snap('initial');});
if(mode!=='direct-only'){await viewport.focus();await viewport.press('PageDown');await page.waitForFunction(()=>Number(document.querySelector('[data-scroll-top]')?.textContent)>0);if(mode==='keyboard-settled-then-direct')await page.waitForFunction(()=>window.trace.some(x=>x.kind==='scrollend'));}
await viewport.evaluate(e=>{window.snap('before-direct');e.scrollTop=300000;window.snap('after-direct');});await page.waitForFunction(()=>Number(document.querySelector('[data-scroll-top]')?.textContent)>100000);
const bounded=await stage.locator('[data-virtual-row]').count();const a=await stage.evaluate(()=>window.snap('label-read'));const b=await stage.evaluate(()=>window.snap('rows-read'));
await page.evaluate(()=>new Promise(resolve=>{let frames=0;const tick=()=>{window.snap('raf');if(++frames===30)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)}));
result.runs.push({mode,iteration,bounded,split:{label:a.label,rows:b.rows,mismatch:a.label!==b.rows},trace:await page.evaluate(()=>window.trace)});await page.close();
} }finally{await browser.close();server.kill();await writeFile(process.argv[2],JSON.stringify(result,null,2));}
console.log(result.head,result.runs.filter(x=>x.split.mismatch).map(x=>[x.mode,x.iteration,x.split]));
