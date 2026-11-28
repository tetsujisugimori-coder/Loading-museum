import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {sourceDigest,outputDigest,validateBuild} from './build-layer-composer.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.BBS_BROWSER||'chromium';
assert.ok(['chromium','webkit'].includes(engine));
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const dest=path.resolve('work/dialup-bbs');
await fs.mkdir(dest,{recursive:true});
const report={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),sourceHash:await sourceDigest(),outputHash:await outputDigest(),engine,expected:8,cases:[],status:'RUNNING'};
validateBuild(JSON.parse(await fs.readFile('out/.layer-build.json','utf8')),report);
const server=spawn(process.execPath,['scripts/serve-static-export.mjs','out'],{stdio:['ignore','pipe','inherit']});
let browser,context;
try{
 const [data]=await once(server.stdout,'data');const url=String(data).trim();
 for(const width of [375,390,765,1280])for(const motion of ['no-preference','reduce']){
  const c={width,motion,status:'RUNNING',checks:[]};report.cases.push(c);
  browser=await pw[engine].launch({headless:true});c.browserVersion=browser.version();
  context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
  const check=(name,ok)=>{assert.ok(ok,name);c.checks.push(name);};
  const focus=async id=>page.evaluate(id=>document.activeElement?.id===id,id);
  const ready=async id=>page.waitForFunction(id=>document.querySelector('#works [data-work="'+id+'"]')?.getAttribute('aria-pressed')==='true'&&document.getElementById('received')?.textContent.includes('/'),id);
  const press=async(id,key='Enter')=>{await page.locator('#'+id).focus();await page.keyboard.press(key);};
  const read=async id=>(await page.locator('#'+id).textContent())??'';
  const end=async()=>{await page.locator('#instant').click();return read('logical');};
  await page.goto(url);
  check('header count',/13 ROOMS \/ 298 OBJECTS/.test(await page.locator('.archiveMeta').innerText()));
  check('13 rooms',await page.locator('.roomDirectory > li').count()===13);
  const nav=page.getByRole('navigation',{name:'歴史と現代から展示を探す'});
  await nav.getByRole('button',{name:/Historical Motion/}).click();
  const search=nav.getByLabel('全館の作品・展示室・タグで検索');
  await search.fill('BBS');
  check('ten historical records',await nav.locator('.catalogResults li').count()===10);
  await nav.getByRole('button',{name:/Modern Motion/}).click();await search.fill('BBS');
  check('not modern records',await nav.locator('.catalogResults li').count()===0);
  await nav.getByRole('button',{name:/Historical Motion/}).click();await search.fill('日本語パソコン通信');
  check('unique searchable work',await nav.locator('.catalogResults li').count()===1);
  await nav.locator('.catalogResults a').click();await page.waitForURL('**/dialup-bbs/index.html#bbs-04');await ready('04');
  check('direct selected Japanese work',await read('work-title')==='04 日本語パソコン通信');
  check('actual module loaded',/^0 \/ [1-9]\d*$/.test(await read('received')));
  // The source data is fictional; do not infer a real BBS encoding from this result.
  const jp=await end();check('Japanese decoded',jp.includes('日本'));
  await page.locator('#encoding').selectOption('shift_jis');
  check('same Japanese final state',await end()===jp);
  await page.locator('#works [data-work="03"]').click();await ready('03');
  check('stable fragment on selection',new URL(page.url()).hash==='#bbs-03');
  await page.goBack();await ready('04');check('history restores selected work',await read('work-title')==='04 日本語パソコン通信');
  await page.locator('#works [data-work="03"]').click();await ready('03');
  await page.locator('#bps').selectOption('300');const a=await end();
  await page.locator('#bps').selectOption('2400');check('speed-independent final screen',await end()===a);
  await page.locator('#reset').click();await press('step');check('manual byte',/^1 \//.test(await read('received')));
  await page.locator('#reset').click();await page.locator('#bps').selectOption('300');
  if(motion==='no-preference'){
    await press('play');check('keyboard start focus',await focus('pause'));
    await page.keyboard.press('Space');check('keyboard stop focus',await focus('play')&&await read('status')==='停止');
    await page.keyboard.press('Enter');check('keyboard restart focus',await focus('pause'));
    await page.locator('#rate').focus();
    await page.waitForFunction(()=>document.getElementById('status').textContent==='完了');
    check('automatic completion does not steal focus',await focus('rate'));
    await page.locator('#reset').click();await page.locator('#bps').selectOption('2400');await page.locator('#rate').selectOption('2');
    await press('play');await page.waitForFunction(()=>document.getElementById('status').textContent==='完了');
    check('completion transfers focused stop',await focus('play'));
    await page.locator('#reset').click();await page.locator('#bps').selectOption('300');await press('play');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('play').disabled&&document.getElementById('pause').disabled);
    check('live reduced motion focus fallback',await focus('reset'));
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('play').disabled);
    check('restoring motion does not steal focus',await focus('reset'));
  }else{
    check('reduced playback disabled',await page.locator('#play').isDisabled()&&await page.locator('#pause').isDisabled());
    await press('step');check('reduced manual controls',/^1 \//.test(await read('received')));
  }
  await page.locator('#works [data-work="05"]').click();await ready('05');
  await page.locator('#bps').selectOption('2400');await page.locator('#scroll').selectOption('jump');const jump=await end();
  await page.locator('#scroll').selectOption('smooth');
  await page.locator('#seek').evaluate(el=>{el.value='220';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const transform=await page.locator('#screen > div').evaluate(el=>el.style.transform);
  check('scroll presentation preference',motion==='reduce'?transform==='translateY(0em)':transform!=='translateY(0em)');
  check('same final screen across scroll policies',await end()===jump);
  check('gallery no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('link',{name:/ミュージアムの展示室へ戻る/}).click();await page.waitForURL('**/#browse-ms-dos-pc-command-line');
  await page.waitForFunction(()=>document.querySelector('#ms-dos-pc-command-line-toggle')?.getAttribute('aria-expanded')==='true');
  check('room count',/20 EXHIBITS/.test(await page.locator('#ms-dos-pc-command-line-toggle').innerText()));
  check('ten room entries',await page.locator('#dialup-bbs-preview .dialupBbsExhibit').count()===10);
  await page.locator('#dialup-bbs-preview [data-museum-id="bbs-05"]').click();await page.waitForURL('**/dialup-bbs/index.html#bbs-05');await ready('05');
  check('room individual link selects work',await read('work-title')==='05 掲示板連続スクロール');
  check('no page errors',errors.length===0);c.errors=errors;c.status='PASS';
  await page.screenshot({path:path.join(dest,engine+'-'+width+'-'+motion+'.png')});
  await context.close();context=null;await browser.close();browser=null;
 }
 assert.equal(report.cases.length,8);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack||error);process.exitCode=1;}
finally{
 if(context)await context.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 server.kill();
 await fs.writeFile(path.join(dest,engine+'-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
