import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {sourceDigest,outputDigest,validateBuild} from './build-layer-composer.mjs';

const require=createRequire(import.meta.url), moduleName=process.env.PLAYWRIGHT_MODULE||'playwright';
const pw=require(moduleName),engine=process.env.BBS_BROWSER||'chromium';
assert.ok(['chromium','webkit'].includes(engine));
const dest=path.resolve('work/dialup-bbs'), git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
await fs.mkdir(dest,{recursive:true});
const result={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),sourceHash:await sourceDigest(),outputHash:await outputDigest(),
 engine,playwright:require(moduleName+'/package.json').version,runner:{run:process.env.GITHUB_RUN_ID??null,attempt:process.env.GITHUB_RUN_ATTEMPT??null,node:process.version},cases:[],status:'RUNNING'};
validateBuild(JSON.parse(await fs.readFile('out/.layer-build.json','utf8')),result);
const server=spawn(process.execPath,['scripts/serve-static-export.mjs','out'],{stdio:['ignore','pipe','inherit']});
let context,browser;
try{
 const [bytes]=await once(server.stdout,'data'),base=String(bytes).trim(),site=new URL(base);
 browser=await pw[engine].launch({headless:true,...(process.env.BBS_EXECUTABLE?{executablePath:process.env.BBS_EXECUTABLE}:{})});
 for(const width of [375,390,765,1280])for(const motion of ['no-preference','reduce']){
  const c={width,motion,browserVersion:browser.version(),status:'RUNNING',checks:[],navigations:[],errors:[],network:[]};result.cases.push(c);
  context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion,hasTouch:width<500});
  await context.tracing.start({screenshots:true,snapshots:true,sources:false});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>c.errors.push(String(e)));
  page.on('crash',()=>c.errors.push('CRASH: '+page.url()));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==site.origin)c.network.push(r.url());});
  let active;
  await page.exposeFunction('recordWave4Click',({href,isTrusted})=>{if(active?.target===href&&isTrusted)active.trusted=true;});
  await page.addInitScript(()=>{
   sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen');
   window.addEventListener('click',e=>{const link=e.target?.closest('a[href]');if(link)window.recordWave4Click({href:link.href,isTrusted:e.isTrusted});},true);
  });
  const check=(name,v)=>{assert.ok(v,name);c.checks.push(name);};
  const by=id=>page.locator('#'+id),txt=id=>by(id).innerText();
  const shot=label=>page.screenshot({path:path.join(dest,`wave4-${engine}-${width}-${motion}-${label}.png`)});
  const go=async(link,target,initialize,operation,timeout=15000)=>{
   const d={target:target.href,trusted:false,request:null,response:null,committed:false,actual:null,initialized:false,operation:false};
   c.navigations.push(d);active=d;
   try{
    assert.equal(await link.evaluate(el=>el.href),target.href);
    const documentUrl=target.origin+target.pathname+target.search;
    const a=page.waitForRequest(r=>r.isNavigationRequest()&&r.url()===documentUrl,{timeout}).then(r=>{d.request=r.url();});
    const b=page.waitForResponse(r=>r.request().isNavigationRequest()&&r.url()===documentUrl,{timeout}).then(r=>{d.response=r.status();});
    const commit=page.waitForURL(target.href,{waitUntil:'commit',timeout}).then(()=>{d.committed=true;});
    const states=await Promise.allSettled([a,b,commit,link.click({noWaitAfter:true,timeout})]);d.actual=page.url();
    const rejected=states.find(x=>x.status==='rejected');if(rejected)throw rejected.reason;
    assert.equal(d.response,200);assert.equal(d.actual,target.href);assert.ok(d.request&&d.committed&&d.trusted,'trusted click and document commit required');
    await initialize();d.initialized=true;await operation();d.operation=true;
   }catch(e){d.error=String(e);throw e;}finally{d.actual=page.url();active=null;}
  };
  const roomTarget=new URL('#browse-ms-dos-pc-command-line',base);
  const roomReady=async()=>{await page.waitForFunction(()=>{
   const toggle=document.querySelector('#ms-dos-pc-command-line-toggle');
   const panel=document.querySelector('#dialup-bbs-preview')?.closest('.roomPanel');
   return toggle?.getAttribute('aria-expanded')==='true'&&panel?.dataset.open==='true'&&panel.getAnimations().every(a=>['finished','idle'].includes(a.playState));
  });
   const link=page.locator('#dialup-bbs-preview a[href$="door-game.html#bbs-14"]').filter({hasText:'第4便・BBSゲームを開く'});
   // In WebKit an offscreen content-visibility descendant can briefly alternate
   // visibility until its own region, not just the room header, is revealed.
   await link.scrollIntoViewIfNeeded();
   await link.waitFor({state:'visible'});
  };
  const ripTarget=new URL('dialup-bbs/ripscrip.html#bbs-13',base),doorTarget=new URL('dialup-bbs/door-game.html#bbs-14',base);
  const ripReady=()=>page.locator('html[data-ripscrip-ready="true"] #rip-canvas').waitFor({state:'visible'});
  const doorReady=()=>page.locator('#bbs-14[data-ready="true"]').waitFor({state:'visible'});
  const ripBytes=()=>by('rip-progress').evaluate(el=>[el.value,el.max]);
  const ripStep=()=>by('rip-step').press('Enter');
  const phase=()=>by('bbs-14').getAttribute('data-phase');
  const doorDo=async(id)=>{await by('door-'+id).click();if(await by('door-instant').getAttribute('aria-disabled')==='false')await by('door-instant').click();};
  const roomLink=target=>page.locator('#dialup-bbs-preview a').filter({hasText:target});
  await page.goto(base);
  check('global 13 rooms / 298 exhibits',/13 ROOMS \/ 298 OBJECTS/.test(await page.locator('.archiveMeta').innerText()));
  const search=page.getByRole('navigation',{name:'歴史と現代から展示を探す'});
  await search.getByRole('button',{name:/Historical Motion/}).click();
  await search.getByLabel('全館の作品・展示室・タグで検索').fill('RIPscrip');
  const ripSearch=search.locator('.catalogResults a[href$="ripscrip.html#bbs-13"]');
  check('search shows one permanent link',await ripSearch.count()===1);
  await go(ripSearch,ripTarget,ripReady,async()=>{await ripStep();check('keyboard feeds one byte', (await ripBytes())[0]===1);});
  await by('rip-rate').selectOption('300');
  await by('rip-start').click();
  if(motion==='no-preference'){
   await page.waitForFunction(()=>document.querySelector('#rip-progress').value>1);
   await by('rip-pause').click();const frozen=(await ripBytes())[0];await page.waitForTimeout(250);
   check('pause actually stops reception',(await ripBytes())[0]===frozen);
   await by('rip-start').click();await page.waitForFunction(n=>document.querySelector('#rip-progress').value>n,frozen);
   await by('rip-pause').click();
  }
  await by('rip-instant').press('Enter');
  check('all actual bytes delivered',(await ripBytes()).join('/')==='915/915');
  check('known graphics count',Number(await by('rip-canvas').getAttribute('data-draws'))===69);
  check('ANSI example renders independently',(await txt('rip-ansi-screen')).includes('STARLINE'));
  await by('rip-regions').locator('[data-rip-region="0"]').press('Enter');
  check('keyboard region sends B + CR',(await txt('rip-response')).includes('B <CR>'));
  const box=await by('rip-canvas').boundingBox();assert.ok(box);
  const point={x:box.width*400/640,y:box.height*185/350};
  if(width<500)await by('rip-canvas').tap({position:point});else await by('rip-canvas').click({position:point});
  check('logical region has input handling',(await txt('rip-response')).includes('F <CR>'));
  check('RIP no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===390&&motion==='no-preference')await shot('ripscrip');
  await go(by('room-link'),roomTarget,roomReady,async()=>{await roomLink('第4便・BBSゲーム').waitFor({state:'visible'});check('room shows both new exhibits',await roomLink('第4便・RIPscrip').count()===1);});
  await go(roomLink('第4便・RIPscrip'),ripTarget,ripReady,async()=>{check('re-entry abandons old receive state',(await ripBytes())[0]===0);await ripStep();check('re-entry really operates',(await ripBytes())[0]===1);});
  await go(by('room-link'),roomTarget,roomReady,async()=>{await roomLink('第4便・BBSゲーム').waitFor({state:'visible'});check('room BBS group has both permanent links',await roomLink('第4便・RIPscrip').count()===1);});
  await go(roomLink('第4便・BBSゲーム'),doorTarget,doorReady,async()=>{await doorDo('enter');check('Door enters registration',await phase()==='registration');});
  await doorDo('register');check('registration starts from six turns',await phase()==='game'&&(await txt('door-turns'))==='6');
  await by('door-speed').selectOption('300');
  await doorDo('explore');check('exploring consumes only one turn',(await txt('door-turns'))==='5');
  await by('door-command').fill('F');await by('door-command').press('Enter');
  if(await by('door-instant').getAttribute('aria-disabled')==='false')await by('door-instant').click();
  check('deterministic fight advances once',(await txt('door-turns'))==='4'&&(await txt('door-hp'))==='12'&&(await txt('door-gold'))==='18'&&(await txt('door-xp'))==='8');
  await by('door-speed').selectOption('9600');await doorDo('rest');
  if(motion==='reduce')await by('door-buy').dblclick();else await doorDo('buy');
  check('rest and purchase change correct fields',(await txt('door-hp'))==='18'&&(await txt('door-supplies'))==='1');
  check('Door no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===390&&motion==='no-preference')await shot('door');
  await doorDo('exit');check('returns to simulated BBS',await phase()==='bbs');
  const saved=[await txt('door-turns'),await txt('door-hp'),await txt('door-gold'),await txt('door-xp')];
  await go(by('room-link'),roomTarget,roomReady,async()=>{await roomLink('第4便・BBSゲーム').waitFor({state:'visible'});check('room retains Door link',await roomLink('第4便・BBSゲーム').count()===1);});
  await go(roomLink('第4便・BBSゲーム'),doorTarget,doorReady,async()=>{await doorDo('enter');check('real re-entry restores same state',await phase()==='game'&&JSON.stringify([await txt('door-turns'),await txt('door-hp'),await txt('door-gold'),await txt('door-xp')])===JSON.stringify(saved));});
  if(width===375&&motion==='no-preference'){
   await go(by('room-link'),roomTarget,roomReady,async()=>{await roomLink('第4便・RIPscrip').waitFor({state:'visible'});check('negative control room ready',await roomLink('第4便・RIPscrip').count()===1);});
   await page.route('**/ripscrip-gallery.mjs',route=>route.abort());
   await assert.rejects(go(roomLink('第4便・RIPscrip'),ripTarget,
     ()=>page.locator('html[data-ripscrip-ready="true"]').waitFor({state:'attached',timeout:1800}),async()=>{},6000),/Timeout/);
   const rejected=c.navigations.at(-1);
   check('HTTP 200 without app initialization is rejected',rejected.trusted&&rejected.committed&&rejected.response===200&&rejected.actual===ripTarget.href&&!rejected.initialized&&!rejected.operation);
  }
  check('no page errors or external I/O',c.errors.length===0&&c.network.length===0);
  await context.tracing.stop();await context.close();context=null;c.status='PASS';
 }
 result.status='PASS';assert.equal(result.cases.length,8);
}catch(e){
 result.status='FAIL';result.error=String(e);if(result.cases.length)result.cases.at(-1).status='FAIL';
 if(context)await context.tracing.stop({path:path.join(dest,`wave4-${engine}-failure.trace.zip`)}).catch(()=>{});
 throw e;
}finally{
 await browser?.close();server.kill();
 await fs.writeFile(path.join(dest,`wave4-${engine}.json`),JSON.stringify(result,null,2)+'\n');
}
console.log(`Wave 4 ${engine}: ${result.cases.length} conditions, ${result.cases.reduce((n,c)=>n+c.checks.length,0)} checks`);
