import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const pw=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/tetsu/.codex/worktrees/3dc6/Math-Art-Lab/node_modules/playwright');
const root=path.resolve('review-source/out'), dest=path.resolve(process.env.EVIDENCE_DIR||'review-evidence/independent');
await fs.mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname.replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';let file=path.resolve(root,'.'+decodeURIComponent(p));assert.ok(file.startsWith(root+path.sep));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const expected=(process.env.BROWSERS||'chromium,webkit').split(',').length*(process.env.WIDTHS||'375,390,765,1280').split(',').length*(process.env.MOTIONS||'no-preference,reduce').split(',').length;
const report={head:'36f9cca37f174a56767614c6b0a22eb90f9d87e2',expected,started:new Date().toISOString(),oracle:'Independent DOM getScreenCTM inversion and intersection; no product model imports',cases:[],failures:[],images:[]};
const near=(a,b,t=.02)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}, tolerance ${t}`);
function placement(w,h,s,cx,cy){return {x:s*1000<=w?(w-s*1000)/2:Math.min(0,Math.max(w-s*1000,w/2-cx*s)),y:s*700<=h?(h-s*700)/2:Math.min(0,Math.max(h-s*700,h/2-cy*s))};}
let currentBrowser;
try{for(const engine of (process.env.BROWSERS||'chromium,webkit').split(',')){
 currentBrowser=await pw[engine].launch({headless:true});
 for(const width of (process.env.WIDTHS||'375,390,765,1280').split(',').map(Number))for(const motion of (process.env.MOTIONS||'no-preference,reduce').split(',')){
  const ctx=await currentBrowser.newContext({viewport:{width,height:932},hasTouch:width<500,isMobile:width<500,reducedMotion:motion});
  const page=await ctx.newPage(), errors=[], steps=[], measurements=[];
  page.on('pageerror',e=>errors.push(e.message));
  const label=`${engine}-${width}-${motion}`;
  steps.push=function(...items){console.log('STEP',label,...items);return Array.prototype.push.apply(this,items);};
  const row={engine,version:currentBrowser.version(),width,motion,steps,measurements};
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/Loading-museum/`);
   const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();await room.getByRole('button',{name:'Pan & Zoom / 拡大して探す',exact:true}).click();
   const stage=room.getByTestId('pan-zoom'),zone=stage.getByRole('group',{name:'図版の操作領域',includeHidden:true}),trans=stage.getByTestId('pz-transform'),input=stage.getByLabel('倍率（%）');
   const ready=()=>page.waitForFunction(()=>document.querySelector('.pzViewport')?.dataset.ready==='true');await ready();
   const btn=name=>stage.getByRole('button',{name,exact:true});
   const click=async name=>{await btn(name).click();};
   const painted=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Two rendering frames not observed within 8 seconds')),8000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));}));
   const g=async()=>{await painted();return zone.evaluate(el=>{const m=el.querySelector('[data-testid="pz-transform"]').getScreenCTM(),b=el.getBoundingClientRect();return {s:m.a,x:m.e-b.left,y:m.f-b.top,w:el.clientWidth,h:el.clientHeight};});};
   const matrix=async()=>{await painted();return trans.getAttribute('transform');};
   const center=q=>({x:(q.w/2-q.x)/q.s,y:(q.h/2-q.y)/q.s});
   const checkMini=async tag=>{const q=await g();const corners=[[0,0],[q.w,q.h]].map(([x,y])=>({x:Math.max(0,Math.min(1000,(x-q.x)/q.s)),y:Math.max(0,Math.min(700,(y-q.y)/q.s))}));const expected={x:corners[0].x,y:corners[0].y,width:corners[1].x-corners[0].x,height:corners[1].y-corners[0].y};const actual=await stage.getByTestId('pz-visible').evaluate(el=>Object.fromEntries(['x','y','width','height'].map(k=>[k,+el.getAttribute(k)])));for(const k in expected)near(actual[k],expected[k]);measurements.push({tag,geometry:q,miniExpected:expected,miniActual:actual});return q;};
   const zoomInput=async value=>{await input.fill(String(value));await input.press('Enter');};
   const mouseDrag=async(dx,dy,cancel=false)=>{await zone.scrollIntoViewIfNeeded();const b=await zone.boundingBox();await page.mouse.move(b.x+b.width*.53,b.y+b.height*.52);await page.mouse.down();await page.mouse.move(b.x+b.width*.53+dx,b.y+b.height*.52+dy,{steps:5});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();};
   const focusBridge=()=>click('三日月橋：この場所を見る');
   const original=await checkMini('fit');
   await focusBridge();await zoomInput(325);let before=await g(),c=center(before);await click('拡大');let after=await checkMini('center-button-487.5');near(after.s/before.s,1.5,.00001);near(center(after).x,c.x);near(center(after).y,c.y);
   before=after;c=center(before);await zoomInput(437);after=await g();near(center(after).x,c.x);near(center(after).y,c.y);steps.push('native form Enter and center button/input anchors');
   await zone.scrollIntoViewIfNeeded();let b=await zone.boundingBox();before=await g();const local={x:before.w*.43,y:before.h*.47},world={x:(local.x-before.x)/before.s,y:(local.y-before.y)/before.s};await page.mouse.dblclick(b.x+local.x,b.y+local.y);await page.waitForFunction(s=>{let e=document.querySelector('[data-testid="pz-transform"]');return e&&e.getScreenCTM().a>s;},before.s);after=await checkMini('off-center-native-doubleclick');const anchorError={x:after.x+world.x*after.s-local.x,y:after.y+world.y*after.s-local.y};near(anchorError.x,0,.8);near(anchorError.y,0,.8);row.anchorError=anchorError;steps.push('native off-center doubleclick anchor');
   // At fit the lower letterbox/edge is deliberately constrained: compare clamped geometry, not an impossible anchor.
   await click('Reset');await zone.scrollIntoViewIfNeeded();before=await g();b=await zone.boundingBox();let p={x:before.w*.04,y:before.h*.94},a={x:(p.x-before.x)/before.s,y:(p.y-before.y)/before.s};await page.mouse.dblclick(b.x+p.x,b.y+p.y);await page.waitForFunction(s=>document.querySelector('[data-testid="pz-transform"]')?.getScreenCTM().a>s,before.s);after=await g();let wanted={x:p.x-a.x*after.s,y:p.y-a.y*after.s};let expected={x:after.s*1000<=after.w?(after.w-after.s*1000)/2:Math.max(after.w-after.s*1000,Math.min(0,wanted.x)),y:after.s*700<=after.h?(after.h-after.s*700)/2:Math.max(after.h-after.s*700,Math.min(0,wanted.y))};near(after.x,expected.x,.8);near(after.y,expected.y,.8);measurements.push({tag:'constrained-doubleclick',wanted,expected,actual:after});steps.push('doubleclick with actual edge/letterbox correction');
   await zoomInput(9999);assert.equal(await input.inputValue(),'800');assert.ok(await btn('拡大').isDisabled());
   for(const [dx,dy] of [[5000,5000],[-5000,-5000],[5000,-5000],[-5000,5000]]){await mouseDrag(dx,dy);const q=await checkMini(`corner-${dx}-${dy}`);near(q.x,dx>0?0:q.w-1000*q.s);near(q.y,dy>0?0:q.h-700*q.s);}
   await zoomInput(-15);assert.equal(await input.inputValue(),'100');assert.ok(await btn('縮小').isDisabled());steps.push('native mouse all four boundaries and zoom clamps');
   // Independent landmark/clipping checks in both portrait and landscape viewport shapes.
   for(const [shape,w,h] of [['portrait',Math.min(173,original.w),620],['landscape',original.w,73]]){
    await zone.evaluate((el,d)=>{el.style.width=d.w+'px';el.style.height=d.h+'px';},{w,h});await page.waitForFunction(d=>{const e=document.querySelector('.pzViewport');return e.clientWidth===d.w&&e.clientHeight===d.h&&e.querySelector('svg')?.getAttribute('height')===String(d.h);},{w,h});
    for(const [name,x,y] of [['星見の観測所',270,190],['時計の庭',710,230],['三日月橋',505,440],['灯りの小屋',800,565],['風の木立',170,540]]){await click(name+'：この場所を見る');const q=await checkMini(`${shape}-${name}`);const e=placement(q.w,q.h,Math.min(q.w/1000,q.h/700)*4,x,y);near(q.x,e.x);near(q.y,e.y);assert.ok(q.x+x*q.s>=0&&q.x+x*q.s<=q.w);assert.ok(q.y+y*q.s>=0&&q.y+y*q.s<=q.h);}
   }
   await zone.evaluate(el=>{el.style.width='';el.style.height='';});await page.waitForFunction(d=>{const e=document.querySelector('.pzViewport');return e.clientWidth===d.w&&e.clientHeight===d.h&&e.querySelector('svg')?.getAttribute('height')===String(d.h);},original);steps.push('five landmarks and minimap in portrait and landscape windows');
   await focusBridge();before=await matrix();await mouseDrag(27,-19,true);assert.equal(await matrix(),before);await mouseDrag(-23,17);assert.notEqual(await matrix(),before);steps.push('native mouse commit and Escape rollback');
   // Programmatic release of REAL active capture: browser lostpointercapture, not OS capture-loss evidence.
   await zone.evaluate(el=>{window.__audit=[];for(const t of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])el.addEventListener(t,e=>window.__audit.push({type:t,id:e.pointerId,time:e.timeStamp,trusted:e.isTrusted}));});
   await focusBridge();before=await matrix();await zone.scrollIntoViewIfNeeded();b=await zone.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+18,b.y+b.height/2+14);await zone.evaluate(el=>{const e=window.__audit.findLast(x=>x.type==='pointerdown');el.releasePointerCapture(e.id);});await page.mouse.move(b.x+b.width/2+22,b.y+b.height/2+16);await page.mouse.up();assert.equal(await matrix(),before);steps.push('programmatic native capture release rollback (not OS loss)');
   // Synthetic ownership/lifetime probes, capture stub scoped to nonexistent synthetic IDs.
   await zone.evaluate(el=>{el.__saved=el.setPointerCapture;el.setPointerCapture=()=>{};});
   const ev=async(type,id=91,time)=>{await zone.evaluate((el,d)=>{const e=new PointerEvent(d.type,{bubbles:true,pointerId:d.id,pointerType:'mouse',button:0,clientX:d.type==='pointerdown'?120:151,clientY:d.type==='pointerdown'?120:143});if(d.time!==undefined)Object.defineProperty(e,'timeStamp',{value:d.time});el.dispatchEvent(e);},{type,id,time});await painted();};
   const synStart=async()=>{await ev('pointerdown');await ev('pointermove');assert.equal(await zone.getAttribute('data-dragging'),'true');};
   before=await matrix();await synStart();const provisional=await matrix();for(const t of ['pointermove','pointerup','pointercancel','lostpointercapture'])await ev(t,92);assert.equal(await matrix(),provisional);await ev('pointercancel');assert.equal(await matrix(),before);
   await ev('pointerdown',91,1000000);for(const t of ['pointermove','pointerup','pointercancel','lostpointercapture'])await ev(t,91,999999);assert.equal(await matrix(),before);assert.equal(await zone.getAttribute('data-dragging'),'true');await ev('pointermove',91,1000001);await ev('pointerup',91,1000002);assert.notEqual(await matrix(),before);steps.push('synthetic foreign pointer and reused owner ID with stale timestamps');
   for(const action of ['Reset','全体表示','拡大','mode','lostpointercapture']){await focusBridge();await synStart();if(action==='mode')await click((await btn('図版を移動：OFF').count())?'図版を移動：OFF':'図版を移動：ON');else if(action==='lostpointercapture')await ev(action);else await click(action);const stable=await matrix();await ev('pointermove');await ev('pointerup');assert.equal(await matrix(),stable);assert.equal(await zone.getAttribute('data-dragging'),'false');}steps.push('synthetic late events after Reset/fit/zoom/mode/lostcapture');
   // Real ResizeObserver, not mocked dimensions. Four zero/recovery pairs plus hidden while provisional drag exists.
   for(const [zero,changed,dragging] of [['width',false,false],['width',true,true],['height',false,true],['height',true,false],['hidden',true,true]]){
    await focusBridge();before=await g();c=center(before);if(dragging)await synStart();
    await zone.evaluate((el,z)=>{if(z==='hidden')el.style.display='none';else el.style[z]='0px';},zero);await page.waitForFunction(()=>document.querySelector('.pzViewport')?.dataset.ready==='false');assert.equal(await trans.count(),0);for(const n of ['拡大','縮小','全体表示','Reset','倍率を適用'])assert.ok(await btn(n).isDisabled());await ev('pointermove');await ev('pointerup');
    const w=changed?Math.max(120,original.w-31):original.w,h=changed?original.h+47:original.h;
    await zone.evaluate((el,d)=>{el.style.display='';el.style.width=d.w+'px';el.style.height=d.h+'px';},{w,h});await ready();after=await checkMini(`zero-${zero}-changed-${changed}-drag-${dragging}`);const scale=Math.min(after.w/1000,after.h/700)*4,e=placement(after.w,after.h,scale,c.x,c.y);near(after.s,scale,.000001);near(after.x,e.x);near(after.y,e.y);const stable=await matrix();await ev('pointermove');await ev('pointerup');assert.equal(await matrix(),stable);
    await zone.evaluate(el=>{el.style.width='';el.style.height='';});await page.waitForFunction(d=>{const e=document.querySelector('.pzViewport');return e.clientWidth===d.w&&e.clientHeight===d.h&&e.querySelector('svg')?.getAttribute('height')===String(d.h);},original);
   }steps.push('real layout width0/height0/hidden, same/different size, provisional drag and stale events');
   await zone.evaluate(el=>{el.setPointerCapture=el.__saved;delete el.__saved;});
   await click('Reset');await focusBridge();await click((await btn('図版を移動：OFF').count())?'図版を移動：OFF':'図版を移動：ON');await click('全体表示');assert.equal(await btn('図版を移動：ON').getAttribute('aria-pressed'),'true');assert.match(await stage.locator('.pzLandmarks').innerText(),/選択中/);await click('Reset');assert.ok(await btn('図版を移動：OFF').count());assert.doesNotMatch(await stage.locator('.pzLandmarks').innerText(),/選択中/);steps.push('fit retains selection/mode; Reset clears both');
   await focusBridge();before=await matrix();await input.focus();await input.press('Home');await input.press('ArrowRight');assert.equal(await matrix(),before);await zone.focus();await page.keyboard.press('Shift+ArrowLeft');assert.equal(await matrix(),before);await page.keyboard.press('ArrowLeft');assert.notEqual(await matrix(),before);await zoomInput(533);near((await g()).s/Math.min(original.w/1000,original.h/700),5.33,.00001);steps.push('native keyboard scope, modified keys, numeric editing and Enter');
   const overflow=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(overflow.scroll<=overflow.w);row.overflow=overflow;
   if(width===375||width===1280){await zone.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');const focus=await zone.evaluate(el=>({active:el===document.activeElement,outline:getComputedStyle(el).outline,rect:el.getBoundingClientRect().toJSON()}));assert.ok(focus.active);row.focus=focus;const file=path.join(dest,label+'-focus.png');await zone.scrollIntoViewIfNeeded();await page.screenshot({path:file});report.images.push(file);await focusBridge();const f=path.join(dest,label+'-exhibit.png');await stage.screenshot({path:f});report.images.push(f);}
   row.inputAudit=await page.evaluate(()=>window.__audit);
   // Stale events targeted at detached old node after exhibit replacement and after close.
   await zone.evaluate(el=>window.__oldZone=el);await focusBridge();await zone.scrollIntoViewIfNeeded();b=await zone.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+12,b.y+b.height/2+10);await room.getByRole('button',{name:'Kanban Board / 仕事を配置する',exact:true}).evaluate(el=>el.click());await page.mouse.up();await room.getByRole('button',{name:'Pan & Zoom / 拡大して探す',exact:true}).click();await ready();before=await matrix();await page.evaluate(()=>{for(const t of ['pointermove','pointerup'])window.__oldZone.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:1,clientX:900,clientY:900}));});assert.equal(await matrix(),before);
   await room.getByRole('button',{name:'閉室して一覧へ戻る',exact:true}).click();assert.ok(await room.getByRole('button',{name:'部品展示室を開く',exact:true}).evaluate(el=>el===document.activeElement));steps.push('native-drag exhibit switch, detached synthetic stale events, close focus return');
   assert.deepEqual(errors,[]);row.status='PASS';console.log('PASS independent',label,steps.length);
  }catch(e){row.status='FAIL';row.error=String(e.stack);report.failures.push({label,error:row.error});console.error('FAIL',label,e);await page.screenshot({path:path.join(dest,label+'-failure.png'),fullPage:true}).catch(()=>{});}
  report.cases.push(row);await fs.writeFile(path.join(dest,'results.json'),JSON.stringify(report,null,2));await ctx.close();
 }
 await currentBrowser.close();currentBrowser=null;
}}finally{if(currentBrowser)await currentBrowser.close();await new Promise(r=>server.close(r));report.finished=new Date().toISOString();report.complete=report.cases.length===expected&&!report.failures.length;for(const file of report.images){const bytes=await fs.readFile(file);report.imageHashes??={};report.imageHashes[path.basename(file)]=createHash('sha256').update(bytes).digest('hex');}await fs.writeFile(path.join(dest,'results.json'),JSON.stringify(report,null,2));if(!report.complete)process.exitCode=1;}
