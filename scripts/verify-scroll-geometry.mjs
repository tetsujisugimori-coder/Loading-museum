/** Fixed, observational experiment. No product handlers, SDK or old evidence are changed. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createStandardServer,verifiedStandard} from './serve-standard-touch.mjs';
import {installRecorder} from '../diagnostics/scroll-geometry/recorder.mjs';
import {validate,compare} from '../diagnostics/scroll-geometry/contract.mjs';
import {valueToX} from '../diagnostics/standard-touch/contract.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const sha=b=>createHash('sha256').update(b).digest('hex');
const protocolBytes=await fs.readFile('diagnostics/scroll-geometry/protocol.json'),protocol=JSON.parse(protocolBytes);
const dir=path.resolve(process.env.SCROLL_EVIDENCE||'work/scroll-geometry');await fs.mkdir(dir,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('DIRTY_CHECKOUT');
const files=['diagnostics/scroll-geometry/protocol.json','diagnostics/scroll-geometry/recorder.mjs','diagnostics/scroll-geometry/contract.mjs','scripts/verify-scroll-geometry.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(f))])));
const binding={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),protocolHash:sha(protocolBytes),sourceHash:sha(JSON.stringify(sourceHashes))};
const manifest=await verifiedStandard();if(manifest.head!==binding.head)throw Error('BUILD_HEAD_MISMATCH');
const server=await createStandardServer({manifest});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,engines=(process.env.SCROLL_ENGINES||protocol.engines.join(',')).split(','),widths=(process.env.SCROLL_WIDTHS||protocol.widths.join(',')).split(',').map(Number);
if(new Set(engines).size!==engines.length||new Set(widths).size!==widths.length||engines.some(e=>!protocol.engines.includes(e))||widths.some(w=>!protocol.widths.includes(w)))throw Error('INVALID_OR_DUPLICATE_MATRIX');
const fullMatrix=engines.length===protocol.engines.length&&widths.length===protocol.widths.length;
const report={fullMatrix,schemaVersion:'iad-scroll-run-1',binding,sourceHashes,manifest,protocol,engines,widths,expectedRows:engines.length*widths.length*2*2*4*3*2,rows:[],pairs:[],errors:[],environment:{node:process.version,os:os.type(),release:os.release(),arch:os.arch(),playwright:require(path.join(path.dirname(require.resolve(process.env.PLAYWRIGHT_MODULE||'playwright')),'package.json')).version},startedAt:new Date().toISOString(),physicalInput:'NOT_TESTED',cause:'UNKNOWN'};
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function save(name,bytes){await fs.writeFile(path.join(dir,name),bytes);return {file:name,sha256:sha(bytes),bytes:bytes.length};}
try{for(const engine of engines){const browser=await pw[engine].launch();try{for(const width of widths)for(const motion of protocol.motion)for(const method of protocol.methods)for(const condition of Object.keys(protocol.conditions))for(let repetition=1;repetition<=protocol.repetitions;repetition++){
  const pairId=`${engine}-${width}-${motion}-${method}-${condition}-r${repetition}`,records=[];
  for(const surface of protocol.surfaces){const trialId=`${pairId}-${surface}`,requested=protocol.conditions[condition][surface],context=await browser.newContext({viewport:{width,height:protocol.height},hasTouch:true,reducedMotion:motion==='reduce'?'reduce':'no-preference'}),page=await context.newPage(),pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e)));await context.tracing.start(protocol.traceOptions);let record,error,images={};
    try{
      await page.addInitScript(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'));
      await page.goto(origin+(surface==='product'?'/Loading-museum/?standardProbe=1':'/standard/plain.html?standardProbe=1'));
      await page.waitForFunction(()=>!!window.__iadStandard);
      if(surface==='product'){await page.locator('#iad-setup').evaluate(el=>el.open=false);const room=page.locator('.phase4Room');await room.getByRole('button',{name:'部品展示室を開く',exact:true}).click();await room.locator('nav button').filter({hasText:'Image Adjustment'}).click();await page.locator('#iad-setup').evaluate(el=>el.open=true);}
      // Fixed-position range permits independent window scroll. The 12000px body only belongs to this experiment.
      await page.addStyleTag({content:`html{scroll-behavior:auto!important;overflow-anchor:none!important}body{min-height:12000px!important;overflow-anchor:none!important}input.iad-standard-range{top:${requested.rectY}px!important}#iad-standard-scale{top:${requested.rectY+45}px!important}`});
      await page.evaluate(y=>scrollTo(0,y),requested.scrollY);
      await page.locator('#iad-standard select[name=method]').selectOption(method);await page.locator('#iad-standard select[name=inputKind]').selectOption('playwright');await page.locator('#iad-standard select[name=mode]').selectOption('full');
      await page.locator('#iad-standard form button').click();await page.waitForFunction(()=>window.__iadStandard.state()==='recording');await frames(page);
      const identity={...binding,trialId,pairId,surface,condition,engine,width,motion,method,repetition,browserVersion:browser.version(),inputPath:method==='drag'?'Playwright mouse drag':'Playwright touchscreen tap',requested,layout:'experimental fixed range plus min-height body; unchanged product handlers'};
      await page.evaluate(installRecorder,identity);
      const initial=await page.evaluate(()=>window.__scrollGeometry.mark('construction-check'));
      const reasons=[];
      if(Math.abs(initial.scroll.y-requested.scrollY)>.5||Math.abs(initial.scroll.x)>.5)reasons.push('SCROLL_TARGET_NOT_ESTABLISHED');
      if(Math.abs(initial.rect.y-requested.rectY)>.5||Math.abs(initial.rect.x-24)>.5||Math.abs(initial.rect.width-(width-48))>.5||Math.abs(initial.rect.height-44)>.5)reasons.push('RECT_TARGET_NOT_ESTABLISHED');
      if(initial.value!==0)reasons.push('INITIAL_VALUE_NOT_ZERO');
      images.before=await save(trialId+'-before.png',await page.screenshot());
      if(reasons.length)throw Error('NOT_EXECUTABLE:'+reasons.join(','));
      const x=valueToX(50,initial.rect,-100,100),start=valueToX(0,initial.rect,-100,100),y=initial.rect.y+22;
      const command=async c=>page.evaluate(v=>window.__scrollGeometry.input(v),c);
      if(method==='drag'){
        await command({kind:'mouse.move',x:start,y});await page.mouse.move(start,y);
        await command({kind:'mouse.down',x:start,y});await page.mouse.down();
        for(let step=1;step<=10;step++){const xx=start+(x-start)*step/10;await command({kind:'mouse.move',x:xx,y,step});await page.mouse.move(xx,y);if(step===5){await frames(page);images.during=await save(trialId+'-during.png',await page.screenshot());}}
        await command({kind:'mouse.up',x,y});await page.mouse.up();
      }else{
        await command({kind:'touchscreen.tap',x,y});
        // tap is atomic at the Playwright API; in-contact PNG cannot be guaranteed.
        await page.touchscreen.tap(x,y);images.during=await save(trialId+'-tap-return.png',await page.screenshot());
      }
      await frames(page);await page.evaluate(()=>window.__scrollGeometry.mark('input-finished'));
      images.after=await save(trialId+'-after.png',await page.screenshot());
      record=await page.evaluate(()=>window.__scrollGeometry.finish());
      record.screenshotTiming=method==='tap'?{during:'NOT_CAPTURED_IN_CONTACT; tap-return is after atomic API returns'}:{during:'after move step5 while mouse held'};
      record.legacyV2BeforeSeal=await page.evaluate(()=>window.__iadStandard.report());
      await page.locator('#iad-seal').click();record.legacyV2=await page.evaluate(()=>window.__iadStandard.report());
      record.images=images;record.pageErrors=pageErrors;
      const result=validate(record,binding);if(!result.valid)throw Error('RECORD_INVALID:'+result.errors.join(','));
      if(pageErrors.length)throw Error('PAGE_ERRORS:'+pageErrors.join(','));
      records.push(record);
    }catch(e){error=String(e.stack||e);try{if(!record)record=await page.evaluate(()=>window.__scrollGeometry?.finish());}catch{/* Preserve original failure. */}}
    finally{
      const traceFile=trialId+'-trace.zip';await context.tracing.stop({path:path.join(dir,traceFile)});const trace=await fs.readFile(path.join(dir,traceFile));
      const payload=record??{identity:{...binding,trialId,pairId,surface,condition,engine,width,motion,method,repetition},error};
      const json=await save(trialId+'.json',Buffer.from(JSON.stringify(payload,null,2)));
      const row={trialId,pairId,condition,engine,width,motion,method,repetition,surface,json,images,trace:{file:traceFile,sha256:sha(trace),bytes:trace.length},result:record?validate(record,binding):null,error:error??null};report.rows.push(row);
      if(error)report.errors.push({trialId,error});await context.close();
      await fs.writeFile(path.join(dir,'report.partial.json'),JSON.stringify(report,null,2));
    }
  }
  if(records.length===2)report.pairs.push({pairId,condition,engine,width,motion,method,repetition,result:compare(records[0],records[1],binding)});
} }finally{await browser.close();}}}catch(e){report.errors.push({fatal:String(e.stack||e)});}
finally{await new Promise(r=>server.close(r));report.finishedAt=new Date().toISOString();report.status=!fullMatrix||report.errors.length||report.rows.length!==report.expectedRows||report.pairs.length!==report.expectedRows/2||report.pairs.some(p=>p.result.construction!=='ESTABLISHED')?'PARTIAL':'TECHNICAL_PASS';await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,rows:report.rows.length,pairs:report.pairs.length,errors:report.errors}));if(report.status!=='TECHNICAL_PASS')process.exitCode=1;}
