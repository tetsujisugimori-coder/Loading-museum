import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('out'),dest=path.resolve(process.env.SELECT_EVIDENCE_DIR||'docs/phase4a-evidence/select-browser');await mkdir(dest,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Loading-museum/,'');if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const engines=(process.env.BROWSERS||'chromium,webkit').split(','),widths=(process.env.WIDTHS||'375,390,765,1280').split(',').map(Number);
assert.ok(engines.length&&engines.every(e=>['chromium','webkit'].includes(e)));assert.ok(widths.length&&widths.every(w=>Number.isInteger(w)&&w>=320));
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const results={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),expected:engines.length*widths.length*2,cases:[],files:[]};let browser;
try{for(const engine of engines){browser=await pw[engine].launch({headless:true});for(const width of widths){const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<500}),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}/Loading-museum/`);const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();
  for(const control of [{id:'toast-stack',label:'通知の種類',index:0,value:'成功'},{id:'animated-accordion',label:'展開方式',index:5,value:'multiple'}]){
    await room.locator('nav button').nth(control.index).click();const stage=room.getByTestId('practical-stage'),select=stage.getByLabel(control.label);await stage.scrollIntoViewIfNeeded();await select.selectOption(control.value);await select.focus();assert.equal(await select.evaluate(e=>document.activeElement===e),true);assert.equal(await select.inputValue(),control.value);
    const styles=await select.evaluate(e=>{const s=getComputedStyle(e);return{color:s.color,background:s.backgroundColor,scheme:s.colorScheme,appearance:s.appearance,rect:e.getBoundingClientRect().toJSON()}});
    const png=await select.screenshot(),name=`${engine}-${width}-${control.id}-select.png`;await writeFile(path.join(dest,name),png);results.files.push({name,size:png.length,sha256:crypto.createHash('sha256').update(png).digest('hex')});
    // Decode the real screenshot; native WebKit painting can disagree with
    // computed background-color. Sample blank interior beyond the short label.
    const pixels=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return[.6,.7,.8].map(x=>[...ctx.getImageData(Math.floor(img.width*x),Math.floor(img.height*.5),1,1).data])},png.toString('base64'));
    const rgb=styles.color.match(/[\d.]+/g).slice(0,3).map(Number),fore=luminance(rgb),contrasts=pixels.map(pixel=>{const back=luminance(pixel.slice(0,3));return(Math.max(fore,back)+.05)/(Math.min(fore,back)+.05)});
    await select.press('Tab');assert.equal(await select.evaluate(e=>document.activeElement===e),false);
    if(control.id==='toast-stack'){await stage.getByRole('button',{name:'通知を追加',exact:true}).click();assert.equal(await stage.getByText('成功 #1',{exact:true}).count(),1)}else assert.match(await stage.locator('p[role=status]').textContent(),/複数展開/);
    const passed=styles.scheme==='light'&&Math.min(...contrasts)>=4.5;results.cases.push({engine,version:browser.version(),width,id:control.id,value:control.value,styles,pixels,contrasts,focusAndSelection:'PASS',status:passed?'PASS':'FAIL'});console.log(`${engine} ${width} ${control.id} ${passed?'PASS':'FAIL'} contrast=${Math.min(...contrasts).toFixed(2)}`);
  }assert.deepEqual(errors,[]);await page.close();}await browser.close();browser=null;}
  assert.equal(results.cases.length,results.expected);assert.equal(new Set(results.cases.map(c=>`${c.engine}/${c.width}/${c.id}`)).size,results.expected);assert.ok(results.cases.every(c=>c.status==='PASS'),'all native select pixels and explicit palettes must pass');
}catch(error){results.error=String(error.stack||error);process.exitCode=1}finally{if(browser)await browser.close();server.close();results.ended=new Date().toISOString();await writeFile(path.join(dest,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({expected:results.expected,passed:results.cases.filter(c=>c.status==='PASS').length,error:results.error}));}
