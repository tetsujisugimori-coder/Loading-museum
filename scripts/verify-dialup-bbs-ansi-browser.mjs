import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {sourceDigest,outputDigest,validateBuild} from './build-layer-composer.mjs';
const pw=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
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
 const [data]=await once(server.stdout,'data');const base=String(data).trim();
 for(const width of [375,390,765,1280])for(const motion of ['no-preference','reduce']){
  const c={width,motion,status:'RUNNING',checks:[]};report.cases.push(c);
  browser=await pw[engine].launch({headless:true});c.version=browser.version();
  context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
  const check=(name,value)=>{assert.ok(value,name);c.checks.push(name);};
  const state=()=>page.locator('#work-title').getAttribute('data-observation').then(JSON.parse);
  const click=sel=>page.locator(sel).click();
  const documentLink=async(link,target)=>{
    assert.equal(await link.evaluate(el=>el.href),target.href);
    // Track the actual navigation rather than the action's implicit navigation wait.
    // The app-level readiness assertions below still have to succeed.
    await Promise.all([
      page.waitForURL(target.href,{waitUntil:'commit'}),
      link.click({noWaitAfter:true}),
    ]);
    assert.equal(new URL(page.url()).href,target.href);
  };
  const press=async(id,key='Enter')=>{await page.locator('#'+id).focus();await page.keyboard.press(key);};
  const focused=id=>page.evaluate(id=>document.activeElement?.id===id,id);
  const noOverflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  const read=id=>page.locator('#'+id).textContent();
  const ready=id=>page.waitForFunction(id=>JSON.parse(document.querySelector('#work-title')?.dataset.observation??'{}').work===id,id);
  const screenshot=name=>page.locator('section[aria-labelledby=work-title]').screenshot({path:path.join(dest,[engine,width,motion,name].join('-')+'.png')});
  await page.goto(base);
  check('inventory count',/13 ROOMS \/ 298 OBJECTS/.test(await page.locator('.archiveMeta').innerText()));
  const nav=page.getByRole('navigation',{name:'歴史と現代から展示を探す'});
  await nav.getByRole('button',{name:/Historical Motion/}).click();await nav.getByLabel('全館の作品・展示室・タグで検索').fill('ANSI');
  const matchingLinks=await nav.locator('.catalogResults a[href*="/ansi.html#"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).sort());
  check('ANSI search yields all 3 permanent works exactly once',matchingLinks.join(',')===['06','07','08'].map(n=>'./dialup-bbs/ansi.html#bbs-'+n).join(','));
  await nav.locator('.catalogResults a').filter({hasText:'ANSIアートが届くまで'}).click();
  await page.waitForURL('**/dialup-bbs/ansi.html#bbs-06');await ready('06');
  // Explicitly pause the virtual clock so host timer progress cannot race runFor.
  const epoch=Date.UTC(2026,0,1);
  await page.clock.install({time:epoch});
  await page.clock.pauseAt(epoch+60_000);
  check('no automatic start',!(await state()).playing&&(await state()).state.bytes===0);
  await press('step');const initial=(await state());check('first byte is pending ESC',initial.state.bytes===1&&initial.state.pending&&initial.state.writes===0);
  await press('step');await press('step');check('split CSI has no early effect',(await state()).state.commands.length===0);
  await press('step');check('CSI recognized only at final byte',(await state()).state.commands[0].sequence==='CSI 2J');
  await click('#reset');
  if(motion==='no-preference'){
    await press('play');check('focus on pause as started',await focused('pause'));
    await page.clock.runFor(240);
    const mid=await state();check('partial transfer',mid.state.bytes>0&&mid.state.bytes<240&&mid.playing);
    await page.keyboard.press('Space');
    const paused=await state();await page.clock.runFor(1500);
    check('no updates after pause',JSON.stringify(paused)===JSON.stringify(await state())&&await focused('play'));
    await page.keyboard.press('Enter');await page.locator('#bps').focus();
    await page.clock.runFor(2000);
    const finish=await page.evaluate(()=>({
      focus:document.activeElement?.id,
      status:document.getElementById('status').textContent,
      observation:JSON.parse(document.getElementById('work-title').dataset.observation),
    }));
    const failed=finish.focus!=='bps'||finish.observation.playing||finish.status!=='完了';
    if(failed)c.completionFailure={focus:finish.focus,status:finish.status,playing:finish.observation.playing,elapsedMs:finish.observation.time,receivedBytes:finish.observation.state.bytes};
    check('playback reaches completion',!finish.observation.playing&&finish.status==='完了');
    check('completion does not steal focus',finish.focus==='bps');
  }else{
    check('reduced: queue does not start',await page.locator('#play').isDisabled()&&await page.locator('#pause').isDisabled());
    await click('#instant');
  }
  const slow=await state();check('art finished with recorded controls',slow.state.bytes>slow.state.writes&&slow.state.commands.length>10&&slow.state.diagnostics.length===0);
  await page.locator('#bps').selectOption('28800');await press('instant','Space');
  check('instant completion moves focused control to reset',await focused('reset'));
  const fast=await state();
  check('identical art by speed',JSON.stringify(fast.state.cells)===JSON.stringify(slow.state.cells));
  check('8N1 wire deadline includes CSI',fast.time===fast.state.bytes*10000/28800&&slow.time===slow.state.bytes*10000/2400);
  check('06 no overflow',await noOverflow());if(width===390)await screenshot('art');
  await click('#ansi-works [data-work="07"]');await ready('07');
  const replay=async()=>{
    const frames=[];for(let i=0;i<6;i++){await press('step');frames.push(await state());}
    return frames;
  };
  const diff=await replay();await page.locator('#frame-mode').selectOption('full');
  const full=await replay();
  check('last frame moves focused step to reset',await focused('reset'));
  check('6 complete frame numbers',full.map(f=>f.state.cells[3].findIndex(x=>x.char==='<')).join(',')==='1,4,7,10,13,16');
  check('equal pixels and attributes per frame',full.every((f,i)=>JSON.stringify(f.state.cells)===JSON.stringify(diff[i].state.cells)));
  check('different frame traffic',full.at(-1).state.bytes>diff.at(-1).state.bytes&&full.at(-1).state.writes>diff.at(-1).state.writes&&full.at(-1).time>diff.at(-1).time);
  check('07 no overflow',await noOverflow());if(width===390)await screenshot('frames');
  if(motion==='no-preference'){
    await click('#reset');await press('play');await page.clock.runFor(100);
    check('07 starts actual replay',(await state()).playing&&(await state()).state.bytes>0);
  }
  await click('#ansi-works [data-work="08"]');await ready('08');
  const a=await state();await page.clock.runFor(1600);check('transition cancels replay and static default',!a.playing&&JSON.stringify(a)===JSON.stringify(await state()));
  const attrs=async prefix=>page.locator('#'+prefix+'-screen > div').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,attribute:n.dataset.attribute,background:n.dataset.background,color:getComputedStyle(n).color})));
  const blink=await attrs('blink'),bright=await attrs('bright');
  check('same attribute bytes and text in both panes',blink.every((v,i)=>v.attribute===bright[i].attribute&&v.text===bright[i].text));
  check('bit7 yields normal versus bright background',blink[1].attribute==='9f'&&blink[1].background==='1'&&bright[1].background==='9');
  await press('bright-mode');check('keyboard mode change',await focused('bright-mode')&&(await state()).selectedMode==='bright'&&(await read('bit-meaning')).includes('高輝度'));
  if(motion==='no-preference'){
    await press('play');await page.clock.runFor(1320);
    check('only blink pane dims after explicit start',(await state()).state.dim&&blink[1].color!==(await attrs('blink'))[1].color&&bright[1].color===(await attrs('bright'))[1].color);
    await press('pause','Space');const stopped=await state();await page.clock.runFor(1600);
    check('stop makes static',!stopped.state.dim&&JSON.stringify(stopped)===JSON.stringify(await state()));
  }else check('no blink in reduced mode',await page.locator('#play').isDisabled()&&!(await state()).state.dim);
  check('08 no overflow',await noOverflow());if(width===390)await screenshot('attributes');
  // Cross-document checks use normal advancing clocks and remain mandatory.
  await page.clock.resume();
  await page.goBack();await ready('07');check('history restores selected work',new URL(page.url()).hash==='#bbs-07');
  await documentLink(page.getByRole('link',{name:/ミュージアムの展示室へ戻る/}),new URL('#browse-ms-dos-pc-command-line',base));
  await page.waitForFunction(()=>document.querySelector('#ms-dos-pc-command-line-toggle')?.getAttribute('aria-expanded')==='true');
  check('12 indexed BBS works in existing room',await page.locator('#dialup-bbs-preview .dialupBbsExhibit').count()===12);
  // aria-expanded changes before the existing accordion stops clipping its links.
  await page.waitForFunction(()=>{
    const panel=document.querySelector('#dialup-bbs-preview')?.closest('.roomPanel');
    return panel?.dataset.open==='true'&&panel.getAnimations().every(a=>a.playState==='finished'||a.playState==='idle');
  });
  const roomLinkSelector='#dialup-bbs-preview [data-museum-id="bbs-08"]';
  const roomLink=page.locator(roomLinkSelector);
  await roomLink.scrollIntoViewIfNeeded();
  await page.waitForFunction(selector=>{
    const link=document.querySelector(selector);
    if(!link)return false;
    const {top,left,width,height}=link.getBoundingClientRect();
    return link.contains(document.elementFromPoint(left+width/2,top+height/2));
  },roomLinkSelector);
  await documentLink(roomLink,new URL('dialup-bbs/ansi.html#bbs-08',base));await ready('08');
  check('direct room entry selects 08',(await state()).work==='08');
  check('no page errors',errors.length===0);
  c.observation={slow,fast,frames:full.map((f,i)=>({fullBytes:f.state.bytes,diffBytes:diff[i].state.bytes,fullWrites:f.state.writes,diffWrites:diff[i].state.writes,fullMs:f.time,diffMs:diff[i].time})),blink,bright};
  c.status='PASS';await context.close();context=null;await browser.close();browser=null;
 }
 assert.equal(report.cases.length,8);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack||error);process.exitCode=1;const last=report.cases.at(-1);if(last?.status==='RUNNING')last.status='FAIL';}
finally{
 if(context)await context.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 server.kill();
 await fs.writeFile(path.join(dest,engine+'-ansi-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,cases:report.cases.map(x=>({...x,observation:undefined}))}));
}
