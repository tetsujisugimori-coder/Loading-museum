// Same real-input counterexample on old and new static exports. Pixel evidence is
// separate from SVG/data checks: a stored stroke alone cannot satisfy the test.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {recordDrawing,drawingTrace,expectedStroke,settledInk,drawingFaults} from './browser-regression-observation.mjs';
const require=createRequire(import.meta.url), engines=require(process.env.PLAYWRIGHT_MODULE||'playwright'), sharp=require('sharp');
const root=await realpath(process.env.EXPORT_DIR||'out'), dest=path.resolve(process.env.EVIDENCE_DIR||'flash-phase2-editing-evidence');await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const f=await realpath(path.resolve(root,'.'+p));if(!f.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(await readFile(f));}catch{res.statusCode=404;res.end('missing');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={kind:'implementation self-verification; trusted mouse/keyboard, synthetic cancel explicitly labelled',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),exportTree:process.env.EXPORT_TREE||execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),exportHead:process.env.EXPORT_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),exportRoot:root,buildIndexHash:createHash('sha256').update(await readFile(path.join(root,'index.html'))).digest('hex'),trackedChanges:execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(['app/components/then-now/PhaseTwoSecond.tsx','app/components/then-now/phase-two-second.css','scripts/verify-flash-phase2-editing.mjs','scripts/browser-regression-observation.mjs'].map(f=>[f,createHash('sha256').update(require('fs').readFileSync(f)).digest('hex')])),cases:[],notTested:['Physical Safari','VoiceOver','OS backgrounding']};
const current=panel=>panel.locator('.tn2Draw').evaluate(el=>[...el.querySelectorAll('polyline')].filter(n=>!n.closest('[data-onion-frame]')).map(n=>n.getAttribute('points')));
const thumb=(panel,i)=>panel.getByRole('button',{name:`フレーム ${i}`,exact:true}).locator('svg');
const thumbInk=(panel,i)=>thumb(panel,i).locator('polyline').evaluateAll(ns=>ns.map(n=>n.getAttribute('points')));
async function draw(page,panel,points){
 const surface=panel.locator('.tn2Draw');await surface.scrollIntoViewIfNeeded();await recordDrawing(surface);const b=await surface.boundingBox();
 const pt=([x,y])=>({x:b.x+b.width*x/320,y:b.y+b.height*y/220});
 await page.mouse.move(pt(points[0]).x,pt(points[0]).y);await page.mouse.down();
 for(const p of points.slice(1))await page.mouse.move(pt(p).x,pt(p).y,{steps:5});
 await page.mouse.up();const input=await drawingTrace(surface),expected=[expectedStroke(input)],settled=await settledInk(surface,expected);
 return {input,expected,settled};
}
async function pixelDelta(a,b){const x=await sharp(a).ensureAlpha().raw().toBuffer({resolveWithObject:true}),y=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(x.info,y.info);let changed=0;for(let i=0;i<x.data.length;i+=4)if(Math.max(...[0,1,2].map(k=>Math.abs(x.data[i+k]-y.data[i+k])))>20)changed++;return changed;}
let browser;
try{for(const engine of (process.env.BROWSERS||'chromium,webkit').split(',')){browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});report[engine]=browser.version();for(const width of (process.env.WIDTHS||'375,390,765,1280').split(',').map(Number)){
const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));await page.goto(`http://127.0.0.1:${server.address().port}/Loading-museum/`);const room=page.locator('#flash-special-exhibit');await room.locator('.flashRoomEntrance').click();await room.locator('nav button').nth(16).click();const card=room.locator('[data-study="tn-frame-lab"]');if(process.env.THUMBNAIL_NEGATIVE_CONTROL==='hidden')await page.addStyleTag({content:'.tn2Film polyline,.tn2Film circle{visibility:hidden!important}'});
for(const era of ['then','now']){const panel=card.locator(`[data-era=${era}]`),r={engine,width,era,checks:[],failures:[]};report.cases.push(r);const check=(name,fn)=>{try{fn();r.checks.push(name);}catch(e){r.failures.push({name,error:String(e)});}};
await panel.scrollIntoViewIfNeeded();const blank=await thumb(panel,1).screenshot();r.firstStroke=await draw(page,panel,[[40,45],[110,45],[110,85]]);const source=r.firstStroke.expected;check('stage stores real mouse stroke',()=>assert.equal(source.length,1));
await panel.getByRole('button',{name:'コマを複製して追加',exact:true}).click();await panel.getByRole('button',{name:'最後の線を戻す',exact:true}).click();r.copyStroke=await draw(page,panel,[[230,40],[230,135],[270,135]]);const copy=r.copyStroke.expected;await panel.getByRole('button',{name:'フレーム 1',exact:true}).click();await settledInk(panel.locator('.tn2Draw'),source);r.source=source;
// Compare actual current SVG, then both thumbnail SVGs and actual raster pixels.
r.sourceAfterCopy=await current(panel);r.thumbnailSource=await thumbInk(panel,1);r.thumbnailCopy=await thumbInk(panel,2);
// Kept outside data assertions so a missing renderer cannot masquerade as storage success.
r.sourcePixels=await pixelDelta(blank,await thumb(panel,1).screenshot());r.differentPixels=await pixelDelta(await thumb(panel,1).screenshot(),await thumb(panel,2).screenshot());
check('source unchanged after copy edit',()=>assert.deepEqual(r.sourceAfterCopy,source));check('source thumbnail equals stage ink',()=>assert.deepEqual(r.thumbnailSource,source));check('copy thumbnail equals copy stage ink',()=>assert.deepEqual(r.thumbnailCopy,copy));check('edited thumbnail visibly differs from blank',()=>assert.ok(r.sourcePixels>=20,`changed pixels ${r.sourcePixels}`));check('different drawings visibly distinguishable at native size',()=>assert.ok(r.differentPixels>=20,`changed pixels ${r.differentPixels}`));
await panel.locator('.tn2Film').screenshot({path:path.join(dest,`${engine}-${width}-${era}-film.png`)});await panel.locator('.tn2Draw').screenshot({path:path.join(dest,`${engine}-${width}-${era}-stage.png`)});
await panel.getByRole('button',{name:'オニオンスキン',exact:true}).click();const afterOnion=await current(panel),onionCount=await panel.locator('[data-onion-frame]').count(),otherInk=await current(card.locator(`[data-era=${era==='then'?'now':'then'}]`));check('onion toggle preserves current artwork',()=>assert.deepEqual(afterOnion,source));check('onion off removes adjacent layers',()=>assert.equal(onionCount,0));check('other era remains unedited',()=>assert.deepEqual(otherInk,[]));
await panel.getByRole('button',{name:'最後の線を戻す',exact:true}).click();await settledInk(panel.locator('.tn2Draw'),[]);const stageUndo=await current(panel),thumbUndo=await thumbInk(panel,1);check('Undo stage empty',()=>assert.deepEqual(stageUndo,[]));check('Undo thumbnail empty',()=>assert.deepEqual(thumbUndo,[]));
// A trusted stroke followed by a synthetic browser-cancellation event retains
// partial ink as one undoable stroke, and subsequent movement must be inert.
const s=panel.locator('.tn2Draw');await s.scrollIntoViewIfNeeded();await recordDrawing(s);const b=await s.boundingBox();
await page.mouse.move(b.x+b.width*.2,b.y+b.height*.2);await page.mouse.down();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.3,{steps:3});
await page.mouse.move(b.x+b.width*.45,b.y+b.height*.32);
const cancelInput=await drawingTrace(s),cancelExpected=[expectedStroke(cancelInput)];
r.cancelSettled=await settledInk(s,cancelExpected);const beforeCancel=await current(panel);
r.beforeCancel={now:await page.evaluate(()=>performance.now()),actual:beforeCancel,expected:cancelExpected};
const id=cancelInput.events.find(e=>e.type==='pointerdown'&&e.admitted).pointerId;
assert.equal(cancelInput.events.filter(e=>e.type==='pointermove'&&e.admitted).length,4);
await s.dispatchEvent('pointercancel',{pointerId:id,pointerType:'mouse',isPrimary:true});
await page.mouse.move(b.x+b.width*.8,b.y+b.height*.5);await page.mouse.up();
r.cancelAfter=await settledInk(s,cancelExpected);r.cancelTrace=await drawingTrace(s);
if(process.env.REGRESSION_DRAW_FAULT&&era===(process.env.REGRESSION_DRAW_FAULT_ERA||'then')){
 const name=process.env.REGRESSION_DRAW_FAULT,points=cancelExpected[0].split(' ');
 const variants={missingLast:points.slice(0,-1).join(' '),extraAfterCancel:cancelExpected[0]+' 319,219',changedExisting:['1,1',...points.slice(1)].join(' ')};
 assert.ok(Object.hasOwn(variants,name),'known test-only fault');
 await s.locator('[data-current-frame] polyline').evaluate((el,value)=>el.setAttribute('points',value),variants[name]);
 r.injectedFault={name,kind:'test-only DOM fault, normal exact assertion path',expected:cancelExpected,actual:await current(panel)};
}
const afterCancel=await current(panel);
check('cancel retains exact input-derived partial ink',()=>assert.deepEqual(afterCancel,cancelExpected));
check('settled beforeCancel matches independent input',()=>assert.deepEqual(beforeCancel,cancelExpected));
check('post-cancel move delivered but not admitted',()=>{const c=r.cancelTrace.events.findIndex(e=>e.type==='pointercancel');assert.ok(c>=0);assert.ok(r.cancelTrace.events.slice(c+1).some(e=>e.type==='pointermove'&&e.trusted&&!e.admitted));});
if(r.failures.length)throw Error(`normal cancel assertion failed: ${JSON.stringify(r.failures)}`);
r.cancelFaults=await drawingFaults(s,cancelExpected);
// Controlled early capture: the last move's capture listener precedes React DOM
// commit. This is a timing counterexample, not a reconstruction of the old CI.
const last=cancelInput.events.filter(e=>e.type==='pointermove'&&e.admitted).at(-1);
r.earlyCapture={actual:last.inkAtCapture,expected:cancelExpected,now:last.now,oldComparisonWouldFail:JSON.stringify(last.inkAtCapture)!==JSON.stringify(cancelExpected)};check('controlled early capture rejects stale expectation',()=>assert.equal(r.earlyCapture.oldComparisonWouldFail,true));
await panel.getByRole('button',{name:'最後の線を戻す',exact:true}).click();await settledInk(s,[]);
const cancelUndo=await current(panel),cancelThumb=await thumbInk(panel,1);check('cancelled stroke Undo leaves empty stage and thumbnail',()=>assert.deepEqual([cancelUndo,cancelThumb],[[],[]]));
// This specifically catches the old implicit "last stroke" target after Undo.
await page.evaluate(()=>{window.__editingInput=[];if(!window.__editingObserved){window.__editingObserved=true;for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','gotpointercapture','keydown','keyup','click','focusin','focusout','dragstart','dragend','drop'])document.addEventListener(type,e=>window.__editingInput.push({type,trusted:e.isTrusted,key:e.key,id:e.pointerId,primary:e.isPrimary,button:e.button,buttons:e.buttons,target:e.target.tagName,label:e.target.getAttribute?.('aria-label'),text:e.target.textContent?.slice(0,40),x:e.clientX,y:e.clientY,time:e.timeStamp}),true);}});r.committedStroke=await draw(page,panel,[[30,140],[85,150]]);const committed=r.committedStroke.expected;await s.scrollIntoViewIfNeeded();const c=await s.boundingBox();await recordDrawing(s);await page.mouse.move(c.x+c.width*.5,c.y+c.height*.5);await page.mouse.down();await page.mouse.move(c.x+c.width*.6,c.y+c.height*.6);r.secondStrokeInput=await drawingTrace(s);r.beforeUndoSettled=await settledInk(s,[...committed,expectedStroke(r.secondStrokeInput)]);const undo=panel.getByRole('button',{name:'最後の線を戻す',exact:true});r.selectedText=await page.evaluate(()=>String(getSelection()));r.undoBefore=await undo.evaluate(el=>({disabled:el.disabled,active:document.activeElement?.outerHTML,focused:document.hasFocus()}));await undo.focus();r.undoAfterFocus=await undo.evaluate(el=>({disabled:el.disabled,active:document.activeElement?.outerHTML,focused:document.hasFocus()}));await undo.evaluate(el=>{window.__undoEvents=[];for(const type of ['keydown','keyup','click'])el.addEventListener(type,e=>window.__undoEvents.push({type,key:e.key,trusted:e.isTrusted,time:e.timeStamp}));});await undo.press('Enter');r.undoEvents=await page.evaluate(()=>window.__undoEvents);check('Undo receives a trusted keyboard activation',()=>assert.equal(r.undoEvents.filter(e=>e.type==='click'&&e.trusted).length,1));await page.mouse.move(c.x+c.width*.8,c.y+c.height*.7);await page.mouse.up();r.undoSettled=await settledInk(s,committed);const afterUndoMove=await current(panel);r.committedBeforeSecondStroke=committed;r.afterUndoAndMove=afterUndoMove;r.inputTrace=await page.evaluate(()=>window.__editingInput);check('drawing does not invoke browser native drag',()=>assert.equal(r.inputTrace.filter(e=>e.type==='dragstart').length,0));r.undoThumbnail=await thumbInk(panel,1);check('Undo during stroke prevents stale input changing earlier stroke',()=>assert.deepEqual(afterUndoMove,committed));check('Undo preserves committed thumbnail',()=>assert.deepEqual(r.undoThumbnail,committed));
await card.getByRole('button',{name:'Reset',exact:true}).click();await settledInk(panel.locator('.tn2Draw'),[]);const resetInk=await current(panel),resetThumb=await thumbInk(panel,1),resetCount=await panel.locator('.tn2Lab').getAttribute('data-frames');check('Reset restores initial artwork and list',()=>assert.deepEqual([resetInk,resetThumb,resetCount],[[],[],'6']));r.status=r.failures.length?'FAIL':'PASS';await writeFile(path.join(dest,'results.json'),JSON.stringify(report,null,2));console.log(r.status,engine,width,era,r.failures.map(f=>f.name));}
assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();}await browser.close();browser=null;}
}catch(e){report.error=String(e.stack||e);const failed=report.cases.at(-1);if(failed&&!failed.status)failed.status='FAIL';process.exitCode=1;}finally{if(browser)await browser.close();report.status=report.error||report.cases.some(c=>c.status==='FAIL')?'FAIL':'PASS';if(report.status==='FAIL')process.exitCode=1;await writeFile(path.join(dest,'results.json'),JSON.stringify(report,null,2));await new Promise(r=>server.close(r));}
