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
const report={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),sourceHash:await sourceDigest(),outputHash:await outputDigest(),engine,playwright:process.env.BBS_TEST_PLAYWRIGHT_VERSION||createRequire(import.meta.url)((process.env.PLAYWRIGHT_MODULE||'playwright')+'/package.json').version,expected:8,cases:[],status:'RUNNING'};
validateBuild(JSON.parse(await fs.readFile('out/.layer-build.json','utf8')),report);
const server=spawn(process.execPath,['scripts/serve-static-export.mjs','out'],{stdio:['ignore','pipe','inherit']});
let browser,context;
try{
 const [data]=await once(server.stdout,'data');const base=String(data).trim();
 browser=await pw[engine].launch({headless:true});
 for(const width of [375,390,765,1280])for(const motion of ['no-preference','reduce']){
  const c={width,motion,version:browser.version(),status:'RUNNING',checks:[],navigations:[],errors:[]};report.cases.push(c);
  context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion,hasTouch:width<500});
  await context.tracing.start({screenshots:true,snapshots:true,sources:false});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>c.errors.push(String(e)));
  page.on('crash',()=>c.errors.push('CRASH: '+page.url()));
  await page.exposeFunction('recordBbsTrustedClick',value=>{c.clicks??=[];c.clicks.push(value);});
  await page.addInitScript(()=>{
   sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen');
   window.addEventListener('click',event=>{
    const link=event.target?.closest('a[href]');
    if(link) window.recordBbsTrustedClick({href:link.href,isTrusted:event.isTrusted});
   },{capture:true});
  });
  const ok=(name,value)=>{assert.ok(value,name);c.checks.push(name);};
  const body=()=>page.locator('body').evaluate(x=>({...x.dataset}));
  const txt=id=>page.locator('#'+id).textContent();
  const button=id=>page.locator('#'+id);
  const choice=(id,v)=>button(id).selectOption(v);
  const select=async id=>{await page.locator('#communication-works [data-work="'+id+'"]').click();await ready(id);};
  const ready=id=>page.waitForFunction(id=>document.body.dataset.ready==='true'&&document.body.dataset.work===id,id);
  const roomReady=async()=>{
   await page.waitForFunction(()=>{
    const toggle=document.querySelector('#ms-dos-pc-command-line-toggle');
    const panel=document.querySelector('#dialup-bbs-preview')?.closest('.roomPanel');
    return toggle?.getAttribute('aria-expanded')==='true'&&panel?.dataset.open==='true'&&panel.getAnimations().every(a=>a.playState==='finished'||a.playState==='idle');
   });
  };
  const documentLink=async(link,target,appReady,operation)=>{
    const d={target:target.href,from:page.url(),trusted:false,request:null,response:null,committed:false,actual:null,initialized:false,operation:false};
    c.navigations.push(d);
    try{
      assert.equal(await link.evaluate(x=>x.href),target.href);
      const n=(c.clicks??[]).length;
      const expected=target.origin+target.pathname+target.search;
      const request=page.waitForRequest(r=>r.isNavigationRequest()&&r.url()===expected);
      const response=page.waitForResponse(r=>r.request().isNavigationRequest()&&r.url()===expected);
      const committed=page.waitForURL(target.href,{waitUntil:'commit'});
      const [req,res]=await Promise.all([request.then(r=>(d.request=r.url(),r)),response.then(r=>(d.response=r.status(),r)),committed.then(()=>{d.committed=true;}),link.click({noWaitAfter:true})]);
      d.trusted=(c.clicks??[]).slice(n).some(e=>e.href===target.href&&e.isTrusted);d.actual=page.url();
      assert.ok(d.trusted,'trusted click capture');assert.ok(req.isNavigationRequest());assert.equal(res.status(),200);assert.equal(d.actual,target.href);
      await appReady();d.initialized=true;await operation();d.operation=true;
    }finally{d.actual=page.url();}
  };
  const step=async (id='step')=>{await button(id).focus();await page.keyboard.press('Enter');};
  const count=async()=>Number((await body()).steps);
  const finish=async()=>{for(let i=0;i<30&&!await button('step').isDisabled();i++) await step();};
  const screenshot=name=>page.screenshot({path:path.join(dest,[engine,width,motion,'wave3',name].join('-')+'.png')});
  await page.goto(base);
  ok('global inventory 296, 13 rooms',/13 ROOMS \/ 296 OBJECTS/.test(await page.locator('.archiveMeta').innerText()));
  const nav=page.getByRole('navigation',{name:'歴史と現代から展示を探す'});
  await nav.getByRole('button',{name:/Historical Motion/}).click();
  await nav.getByLabel('全館の作品・展示室・タグで検索').fill('通信');
  const links=nav.locator('.catalogResults a[href*="/communications.html#"]');
  ok('each wave-three result occurs once',JSON.stringify((await links.evaluateAll(nodes=>nodes.map(n=>n.hash))).sort())===JSON.stringify(['#bbs-09','#bbs-10','#bbs-11','#bbs-12']));
  await documentLink(links.filter({hasText:'モデムのランプ'}),new URL('dialup-bbs/communications.html#bbs-09',base),()=>ready('09'),async()=>{
   ok('idle modem 7 lamps',await page.locator('#leds li').count()===7&&await page.locator('#leds li').filter({hasText:'CD 消灯'}).count()===1);
   await step();ok('keyboard advances and shows the TX/RX response',await count()===1&&(await txt('leds')).includes('SD 点灯')&&(await txt('leds')).includes('RD 点灯'));
  });
  if(motion==='reduce') ok('reduced motion uses steps only',await button('play').isDisabled());
  else{
   await step('play');ok('focus hands off on play',await button('pause').evaluate(el=>document.activeElement===el));
   await page.waitForFunction(()=>Number(document.body.dataset.steps)>1);
   await step('pause');const frozen=await count();
   await page.waitForTimeout(650);
   ok('paused playback stops clock',await count()===frozen&&(await body()).playing==='false');
   await step('play');await page.waitForFunction(n=>Number(document.body.dataset.steps)>n,frozen);
   await step('pause');ok('resume advances',await count()>frozen);
  }
  await finish();ok('modem releases DTR/carrier, holds high-speed latch',(await txt('leds')).includes('TR 消灯')&&(await txt('leds')).includes('CD 消灯')&&(await txt('leds')).includes('HS 点灯'));
  if(width===390&&motion==='no-preference')await screenshot('09');
  await select('10');
  for(const [value,code] of [['busy','BUSY'],['carrier','NO CARRIER'],['dialtone','NO DIAL TONE']]){
   await choice('outcome',value);await finish();
   ok('AT failure '+code,(await body()).phase==='failed'&&(await txt('terminal')).endsWith(code)&&!(await txt('terminal')).includes('CONNECT'));
  }
  await choice('outcome','normal');await finish();
  ok('AT connect and disconnect',(await txt('terminal')).includes('CONNECT 28800')&&(await txt('terminal')).endsWith('NO CARRIER')&&(await body()).phase==='done');
  await step('retry');ok('reconnect starts a fresh queue',(await body()).phase==='idle'&&await count()===0);
  if(width===390&&motion==='no-preference'){await finish();await screenshot('10');}
  await select('11');
  await choice('fault','once');for(let i=0;i<5;i++)await step();
  ok('bad block not accepted',await button('transfer-progress').evaluate(e=>e.value)===128&&(await txt('events')).includes('確定せず再送'));
  await finish();
  ok('retry completes without double counting',await button('transfer-progress').evaluate(e=>e.value)===384&&(await txt('wire')).includes('535 B')&&(await txt('comparison')).includes('402 B'));
  if(width===390&&motion==='no-preference')await screenshot('11');
  await choice('fault','repeat');await finish();ok('retry limit fails visibly',(await body()).phase==='failed'&&await button('transfer-progress').evaluate(e=>e.value)===128);
  await step('retry');await step();await step('stop');const stopped=await count();
  await page.waitForTimeout(450);ok('cancel halts queue',(await body()).phase==='cancelled'&&await count()===stopped&&await button('step').isDisabled());
  await select('12');await choice('patrol-mode','manual');await choice('patrol-fault','board');await finish();
  ok('manual patrol stops at configured failure',(await body()).phase==='failed'&&(await txt('patrol-progress')).includes('保存 1 件')&&await button('play').isDisabled());
  await step('retry');await finish();
  ok('retry saves missing logs only and opens offline viewer',await page.locator('#offline-log li').count()===3&&(await txt('patrol-progress')).includes('オフライン'));
  if(width===390&&motion==='no-preference')await screenshot('12');
  await step('reset');ok('reset clears all logged events',await count()===0&&await page.locator('#events li').count()===0);
  ok('layout fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(motion==='no-preference')await step('play');
  // This is a real user link across documents, without a virtual clock.
  await documentLink(page.locator('#room-link'),new URL('#browse-ms-dos-pc-command-line',base),roomReady,async()=>{
    ok('room initializes 10 indexed exhibits',await page.locator('#dialup-bbs-preview .dialupBbsExhibit').count()===10);
  });
  const roomLink=page.locator('#dialup-bbs-preview [data-museum-id="bbs-11"]');
  await roomLink.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{
   const e=document.querySelector('#dialup-bbs-preview [data-museum-id="bbs-11"]');
   if(!e)return false;const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  });
  await documentLink(roomLink,new URL('dialup-bbs/communications.html#bbs-11',base),()=>ready('11'),async()=>{
    ok('re-entry initializes without stale timers',await count()===0&&(await body()).playing==='false');
    await step();ok('re-entry can actually run work',await count()===1&&(await txt('events')).includes('NAK'));
  });
  ok('three traversals prove trusted click, request, status, commit, destination, ready and actual operation',c.navigations.length===3&&c.navigations.every(d=>d.trusted&&d.request&&d.response===200&&d.committed&&d.actual===d.target&&d.initialized&&d.operation));
  ok('no browser exceptions or crashes',c.errors.length===0);
  c.status='PASS';
  await context.tracing.stop();
  await context.close();context=null;
 }
 assert.equal(report.cases.length,8);report.status='PASS';
}catch(error){
 report.status='FAIL';report.error=String(error.stack||error);process.exitCode=1;
 const c=report.cases.at(-1);if(c?.status==='RUNNING') c.status='FAIL';
 if(context&&c)await context.tracing.stop({path:path.join(dest,`${engine}-${c.width}-${c.motion}-wave3-failure.zip`)}).catch(()=>{});
}finally{
 if(context)await context.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 server.kill();
 await fs.writeFile(path.join(dest,engine+'-communications-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
