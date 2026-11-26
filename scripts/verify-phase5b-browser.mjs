import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await realpath('out'),dest=path.resolve(process.env.EVIDENCE_DIR||'work/phase5b-browser');await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const file=await realpath(path.resolve(root,'.'+p));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('missing')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/Loading-museum/`;
const engines=(process.env.BROWSERS||'chromium,webkit').split(','),widths=(process.env.WIDTHS||'375,390,765,1280').split(',').map(Number),motions=(process.env.MOTIONS||'no-preference,reduce').split(',');
assert.ok(engines.every(e=>['chromium','webkit'].includes(e)));assert.ok(widths.every(w=>[375,390,765,1280].includes(w)));assert.ok(motions.every(m=>['no-preference','reduce'].includes(m)));
const ids=['kanban-board','node-flow-editor','schedule-grid','diff-viewer','theme-studio','shortcut-recorder'];
const selectedIds=process.env.EXHIBITS?process.env.EXHIBITS.split(','):ids;assert.ok(selectedIds.length&&selectedIds.every(id=>ids.includes(id)));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),trackedChanges:git('status','--porcelain','--untracked-files=no'),platform:process.platform,node:process.version,started:new Date().toISOString(),expected:engines.length*widths.length*motions.length*selectedIds.length,cases:[],files:[],errors:[],notTested:['physical iPhone Safari','VoiceOver','OS capture loss','WebKit native touch drag']};
report.sourceSHA256={};for(const file of git('ls-files','app/components/practical/Phase5B*','app/components/practical/phase5b*','app/data/phase5bExhibits.ts','app/components/PracticalRoom.tsx','app/page.tsx').split('\n'))report.sourceSHA256[file]=createHash('sha256').update(await readFile(file)).digest('hex');report.exportSHA256=createHash('sha256').update(await readFile(path.join(root,'index.html'))).digest('hex');
let browser,page;
async function drag(handle,dx,dy){await handle.scrollIntoViewIfNeeded();const b=await handle.boundingBox();assert.ok(b);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:5});await page.mouse.up();}
async function cancelDrag(stage,handle){const before=await stage.getByTestId('committed-data').textContent();await handle.scrollIntoViewIfNeeded();const b=await handle.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();(report.cancelFocus??=[]).push({case:report.current,phase:'down',focused:await page.evaluate(()=>JSON.stringify({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label')}))});await page.mouse.move(x+15,y+15,{steps:3});assert.equal(await stage.getByTestId('committed-data').textContent(),before,'Preview must not mutate committed data');await page.keyboard.press('Escape');report.cancelFocus.push({case:report.current,phase:'escape',focused:await page.evaluate(()=>JSON.stringify({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label')}))});await page.mouse.move(x+30,y+30,{steps:3});await page.mouse.up();assert.equal(await stage.getByTestId('committed-data').textContent(),before,'Cancelled pointer must not commit later');}
async function touchDrag(handle,dx,dy,cancel=false){await handle.scrollIntoViewIfNeeded();const b=await handle.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,session=await page.context().newCDPSession(page),scroll=await page.evaluate(()=>scrollY);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5}]});await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>scrollY),scroll,'Handle drag must not scroll page');await session.detach();}
try{
 if(process.env.REQUIRE_CLEAN==='1')assert.equal(report.trackedChanges,'','Tracked sources must match HEAD');
 for(const engine of engines){browser=await({chromium,webkit}[engine]).launch({headless:true});report[engine]=browser.version();
 for(const width of widths)for(const reducedMotion of motions){
  page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));await page.goto(url);assert.match(await page.locator('body').textContent(),/13 ROOMS \/ 292 OBJECTS/);
  const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();assert.equal(await room.locator('nav button').count(),29);
  for(let n=0;n<ids.length;n++){
   if(!selectedIds.includes(ids[n]))continue;report.current={engine,width,reducedMotion,id:ids[n]};await room.locator('nav button').nth(18+n).click();const stage=room.getByTestId('phase5b-stage');await stage.scrollIntoViewIfNeeded();
   const click=async name=>{const b=stage.getByRole('button',{name,exact:true});if(width<500)await b.tap();else await b.click()};
   const data=async()=>JSON.parse(await stage.getByTestId('committed-data').textContent());
   const label=name=>stage.getByLabel(name,{exact:true});
   if(n===0){
    await label('移動先').selectOption('1');await label('挿入位置').selectOption('1');await stage.getByRole('button',{name:'移動を確定',exact:true}).focus();await page.keyboard.press('Enter');assert.deepEqual((await data()).filter(c=>c.column===1).map(c=>c.id),['c3','c1']);await click('選択カードを編集');await label('カード名').fill('移動後も同じID');await click('編集を保存');assert.equal((await data()).find(c=>c.id==='c1').title,'移動後も同じID');
    await click('選択カードを編集');await label('カード名').fill('破棄する');await label('カード名').press('Escape');assert.equal((await data()).find(c=>c.id==='c1').title,'移動後も同じID');await click('選択カードを削除');assert.equal(await stage.getByRole('heading',{name:'カードの配置'}).evaluate(e=>e===document.activeElement),true);await click('Undo');assert.equal((await data()).find(c=>c.id==='c1').column,1);await click('Reset');
     // P3-01 independent browser regression: same visual slot cannot create a ghost Undo.
     await label('カード名').fill('追加カード');await click('カード追加');
     const beforeNoop=JSON.stringify(await data());await label('挿入位置').selectOption('2');await click('移動を確定');
     assert.equal(JSON.stringify(await data()),beforeNoop,'Same visible slot must not reorder backing data');
     await click('Undo');assert.equal((await data()).some(c=>c.id==='c4'),false,'One Undo must undo the addition, not an invisible move');
     await click('Redo');assert.equal((await data()).find(c=>c.id==='c4')?.title,'追加カード');await click('Reset');
    // Native mouse drag across columns (touch alternative is the form above).
    const handle=stage.getByRole('button',{name:'c1をドラッグ'}),drop=stage.locator('[data-drop-column="2"]').first();await stage.locator('.p5bKanban').scrollIntoViewIfNeeded();const a=await handle.boundingBox(),b=await drop.boundingBox();report.dragGeometry={a,b};assert.ok(a.y>=0&&b.y>=0&&a.y+a.height<=900&&b.y+b.height<=900,JSON.stringify({a,b}));await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();assert.equal((await data()).find(c=>c.id==='c1').column,2);
   }
   if(n===1){
    await click('接続を追加');assert.match(await stage.getByRole('status').textContent(),/既に/);await label('接続元').selectOption('n2');await label('接続先').selectOption('n1');await click('接続を追加');assert.match(await stage.getByRole('status').textContent(),/循環/);assert.equal((await data()).edges.length,1);
    await stage.locator('[data-node-id="n1"]').focus();await page.keyboard.press('ArrowRight');assert.equal((await data()).nodes[0].x,15);await drag(stage.getByRole('button',{name:'n1をドラッグ'}),24,24);assert.ok((await data()).nodes[0].x>15);await click('ノード削除');assert.equal((await data()).edges.length,0);assert.equal(await stage.getByRole('heading',{name:'処理の流れ'}).evaluate(e=>e===document.activeElement),true);await click('Undo');await click('Reset');await label('ノード名').fill('保存');await click('ノード追加');await label('接続元').selectOption('n2');await label('接続先').selectOption('n3');await click('接続を追加');assert.deepEqual((await data()).edges.at(-1),{from:'n2',to:'n3'});await click('n2からn3を切断');assert.equal((await data()).edges.length,1);
   }
   if(n===2){
    await label('終了時刻').fill('11:00');await stage.getByRole('button',{name:'予定を保存',exact:true}).focus();await page.keyboard.press('Enter');assert.equal((await data())[0].end,660);assert.match(await stage.locator('ul').textContent(),/重複: s2/);await label('終了時刻').fill('08:00');assert.equal(await stage.getByRole('button',{name:'予定を保存'}).isDisabled(),true);await click('編集取消');assert.equal(await label('終了時刻').inputValue(),'11:00');
    await drag(stage.getByRole('button',{name:'s1の時間移動'}),0,20);assert.equal((await data())[0].start,570);assert.equal((await data())[0].end,690);await drag(stage.getByRole('button',{name:'s1の長さ変更'}),0,20);assert.equal((await data())[0].end,720);await click('Undo');assert.equal((await data())[0].end,690);await stage.locator('[data-appointment=s1] > button').first().click();await click('予定削除');assert.equal(await stage.getByRole('heading',{name:'1日の予定'}).evaluate(e=>e===document.activeElement),true);await click('Reset');await click('新規予定');await label('予定名').fill('境界');await label('開始時刻').fill('19:45');await label('終了時刻').fill('20:00');await stage.getByRole('button',{name:'予定を保存',exact:true}).focus();await page.keyboard.press('Enter');assert.equal((await data()).at(-1).end,1200);
   }
   if(n===3){
    await click('次の差分');assert.equal(await page.evaluate(()=>document.activeElement.dataset.hunk),'2');await click('前の差分');assert.equal(await page.evaluate(()=>document.activeElement.dataset.hunk),'1');await label('比較対象').selectOption('same');assert.match(await stage.getByRole('status').textContent(),/差分なし/);await label('比較対象').selectOption('blank');assert.equal((await data()).length,0);await label('比較対象').selectOption('long');assert.equal((await data()).filter(r=>r.kind==='change').length,1);await label('旧版').fill('x'.repeat(24001));assert.match(await stage.getByRole('status').textContent(),/比較不可/);await click('Reset');assert.equal((await data()).filter(r=>r.hunk).length,3);
   }
   if(n===4){
    const outside=await room.evaluate(e=>({color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}));await label('背景色').fill('#000000');await label('文字色').fill('#000000');assert.match(await stage.getByRole('status').textContent(),/1.00:1.*注意/);
    await label('文字サイズ').focus();await label('文字サイズ').press('End');await label('余白').focus();await label('余白').press('End');await label('書体').selectOption('monospace');await label('アクセント色').fill('#9e5130');assert.equal((await data()).size,24);const styles=await stage.getByTestId('theme-preview').evaluate(e=>({size:getComputedStyle(e).fontSize,font:getComputedStyle(e).fontFamily,padding:getComputedStyle(e).padding}));assert.equal(styles.size,'24px');assert.equal(styles.padding,'28px');assert.match(styles.font,/monospace/);const parts=await stage.getByTestId('theme-preview').evaluate(e=>{const b=getComputedStyle(e.querySelector('button')),badge=getComputedStyle(e.querySelector('.studioBadge'));return {background:b.backgroundColor,color:b.color,size:b.fontSize,font:b.fontFamily,padding:b.padding,badge:badge.backgroundColor}});assert.equal(parts.background,'rgb(158, 81, 48)','Preview button must reflect accent setting');assert.equal(parts.badge,parts.background);assert.equal(parts.size,'24px');assert.equal(parts.padding,'28px');assert.match(parts.font,/monospace/);(report.themeObservations??=[]).push({...report.current,settings:await data(),parts,preview:styles});assert.deepEqual(await room.evaluate(e=>({color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})),outside);await click('Undo');await click('Redo');await click('Reset');assert.equal((await data()).size,16);await click('サンプル操作 0');assert.equal(await stage.getByRole('button',{name:'サンプル操作 1'}).count(),1);
   }
   if(n===5){
    const zone=stage.getByRole('region',{name:'ショートカット実行領域'});await click('キーを取得');await page.keyboard.press('Shift+L');assert.deepEqual(await data(),[{action:'count',key:'Shift+K'}]);await click('登録を確定');assert.deepEqual(await data(),[{action:'count',key:'Shift+L'}]);
     // P2-01: Alt+Shift is forbidden, and must not suppress the browser's default.
     const altRejected=await zone.evaluate(el=>{const e=new KeyboardEvent('keydown',{key:'L',shiftKey:true,altKey:true,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented});
     assert.equal(altRejected,false);assert.match(await stage.getByTestId('shortcut-result').textContent(),/カウント 0/);
     await label('操作').selectOption('light');await label('キーを選択（入力代替）').selectOption('Shift+L');assert.match(await stage.getByRole('alert').textContent(),/競合/);assert.equal(await stage.getByRole('button',{name:'登録を確定'}).isDisabled(),true);await click('登録取消');await click('キーを取得');
     const captureRejected=await zone.evaluate(el=>{const e=new KeyboardEvent('keydown',{key:'L',shiftKey:true,altKey:true,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented});
     assert.equal(captureRejected,false);assert.equal(await stage.getByRole('button',{name:'登録を確定'}).isDisabled(),true);
     await page.keyboard.press('Escape');await zone.focus();await page.keyboard.press('Shift+L');assert.match(await stage.getByTestId('shortcut-result').textContent(),/カウント 1/);await click('countの登録を削除');assert.equal(await stage.getByRole('heading',{name:'登録内容'}).evaluate(e=>e===document.activeElement),true);await click('Undo');await click('Reset');await click('ランプを切り替え');assert.match(await stage.getByTestId('shortcut-result').textContent(),/ランプ ON/);
   }
   if(n<3){await click('Reset');const handle=stage.getByRole('button',{name:n===0?'c1をドラッグ':n===1?'n1をドラッグ':'s1の時間移動'});await cancelDrag(stage,handle);
    if(engine==='chromium'&&width===375&&reducedMotion==='no-preference'){
     if(n===0){await stage.locator('.p5bKanban').scrollIntoViewIfNeeded();const a=await handle.boundingBox(),b=await stage.locator('[data-drop-column="2"]').first().boundingBox();await touchDrag(handle,b.x+b.width/2-(a.x+a.width/2),b.y+b.height/2-(a.y+a.height/2));assert.equal((await data()).find(c=>c.id==='c1').column,2);}
     if(n===1){await touchDrag(handle,20,20);assert.ok((await data()).nodes[0].x>10);const before=JSON.stringify(await data());await touchDrag(handle,20,20,true);assert.equal(JSON.stringify(await data()),before);}
     if(n===2){await touchDrag(handle,0,20);assert.equal((await data())[0].start,570);await touchDrag(stage.getByRole('button',{name:'s1の長さ変更'}),0,20);assert.equal((await data())[0].end,660);}
     (report.nativeTouch??=[]).push({...report.current,status:'PASS',pageScrollUnchanged:true,source:'Chromium CDP touch input; not physical device'});
    }
   }
   const geometry=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(geometry.scroll<=width,JSON.stringify(geometry));assert.deepEqual(errors,[]);
   if(width===375||width===1280){const name=`${engine}-${width}-${reducedMotion}-${ids[n]}.png`,png=await stage.screenshot();await writeFile(path.join(dest,name),png);report.files.push({name,sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length});}
   // Reset remains usable after the complete interaction sequence.
   await click('Reset');assert.equal(await stage.count(),1);report.cases.push({...report.current,status:'PASS',input:width<500?'trusted touch tap + native mouse drag + keyboard':'native mouse + keyboard',geometry,pageerrors:errors.length});console.log('PASS',engine,width,reducedMotion,ids[n]);
  }
  await room.getByRole('button',{name:'閉室して一覧へ戻る',exact:true}).click();assert.equal(await room.getByTestId('phase5b-stage').count(),0);await page.close();page=null;
 }
 await browser.close();browser=null;
 }
}catch(e){report.errors.push(String(e.stack||e));console.error(e);process.exitCode=1;if(page){await page.screenshot({path:path.join(dest,'failure.png'),fullPage:true}).catch(()=>{});await page.screenshot({path:path.join(dest,'failure-viewport.png')}).catch(()=>{});}}finally{if(page)await page.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await new Promise(r=>server.close(r));report.finished=new Date().toISOString();report.complete=report.cases.length===report.expected&&!report.errors.length;if(!report.complete)process.exitCode=1;await writeFile(path.join(dest,'results.json'),JSON.stringify(report,null,2));}
