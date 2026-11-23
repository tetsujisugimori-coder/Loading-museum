// Issue #89 single NONREGISTERED WebKit navigation. Native runner, source rebuild.
// This is not the approved I0 binary or the QEMU TCG environment.
'use strict';
const fs=require('node:fs'), http=require('node:http'), path=require('node:path');
const crypto=require('node:crypto'),os=require('node:os');
const {performance}=require('node:perf_hooks');
const {webkit}=require(process.env.PLAYWRIGHT_MODULE);
const outDir=path.resolve('work/issue89-native-webkit');
fs.mkdirSync(outDir,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const start=performance.now(),millis=()=>Math.round((performance.now()-start)*1000)/1000;
const report={kind:'NONREGISTERED_ISSUE89_NATIVE_WEBKIT_SINGLE',
 originalRunId:'lm88-stage-c-20261123-4e82836bc834',
 sourceHead:'f4215a8bce9a74cb79a21156cd54b79b78450704',
 originalHtmlSha256:'249d5e2a9d4418023993127a0c263d680ad6003230856c7831288202cd431499',
 browserVersion:null, registeredTrialsStarted:0, gotoCount:0, events:[], cpu:[], http:[], errors:[],
 env:{node:process.version,cpuModel:os.cpus()[0]?.model,logicalCpus:os.cpus().length,runner:'github-ubuntu-24.04-native-not-QEMU-TCG'}};
const ev=(kind,extra={})=>report.events.push({atMs:millis(),kind,...extra});
let browser,context,page,server,sampler;
const pidMax=new Map();
function sampleCpu(){
 try{
  const map=new Map();
  for(const id of fs.readdirSync('/proc')) {
   if(!/^[0-9]+$/.test(id))continue;
   try {const raw=fs.readFileSync('/proc/'+id+'/stat','utf8'),i=raw.lastIndexOf(')'),f=raw.slice(i+2).split(' ');
     map.set(+id,{parent:+f[1],ticks:+f[11]+(+f[12]),name:raw.slice(raw.indexOf('(')+1,i)});}
   catch{}
  }
  const seen=new Set([process.pid]);let more=true;
  while(more){more=false;for(const [pid,data] of map){if(!seen.has(pid)&&seen.has(data.parent)){seen.add(pid);more=true;}}}
  const live=[];
  for(const pid of seen){if(pid===process.pid)continue;const p=map.get(pid);if(!p)continue;
    pidMax.set(pid,Math.max(pidMax.get(pid)||0,p.ticks));live.push({pid,name:p.name,ticks:p.ticks});}
  report.cpu.push({atMs:millis(),childTicksCumulative:[...pidMax.values()].reduce((a,b)=>a+b,0),
    nodeCpuMs:(process.cpuUsage().user+process.cpuUsage().system)/1000,live:live.slice(0,24)});
 }catch(e){ev('CPU_SAMPLE_ERROR',{error:String(e)});}
}
async function readyState(label){
 try{
  const p=page.evaluate(()=>({
   state:document.readyState,
   lifecycle:globalThis.__issue89Life||[],
   navigation:performance.getEntriesByType('navigation').map(x=>({
     responseEnd:x.responseEnd,domContentLoadedEventEnd:x.domContentLoadedEventEnd,loadEventEnd:x.loadEventEnd}))
  }));
  const val=await Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(Error('READYSTATE_TIMEOUT')),1000))]);
  ev('readyState',{label,...val});
 }catch(e){ev('readyStateError',{label,error:String(e).slice(0,400)});}
}
const root=path.resolve('out');
const mimetype=n=>n.endsWith('.html')?'text/html; charset=utf-8':n.endsWith('.css')?'text/css; charset=utf-8':n.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream';
function serve(req,res){
 const reqPath=new URL(req.url,'http://127.0.0.1').pathname;
 let data=Buffer.from('not found'),status=404;
 if(reqPath.startsWith('/Loading-museum/')){
  let rel=reqPath.slice('/Loading-museum/'.length);if(!rel||rel.endsWith('/'))rel+='index.html';
  const file=path.resolve(root,rel);
  try{if(file.startsWith(root+path.sep)&&fs.statSync(file).isFile()){data=fs.readFileSync(file);status=200;}}catch{}
 }
 res.writeHead(status,{'Content-Type':mimetype(reqPath.endsWith('/')?'index.html':reqPath),'Content-Length':data.length,'Cache-Control':'no-store'});
 res.end(data);report.http.push({atMs:millis(),path:reqPath,status,size:data.length,sha256:sha(data)});
}
async function run(){
 if(!fs.existsSync('out/index.html'))throw Error('next export not found');
 report.buildHtmlSha256=sha(fs.readFileSync('out/index.html'));
 report.originalBuildIdentical=report.buildHtmlSha256===report.originalHtmlSha256;
 server=http.createServer(serve);
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await webkit.launch({headless:true,timeout:30000});
 report.browserVersion=browser.version();
 context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 await context.addInitScript(()=>{
  const life=[];Object.defineProperty(window,'__issue89Life',{value:life});
  const mark=kind=>{const datum={kind,ms:performance.now(),state:document.readyState};
   life.push(datum);console.log('ISSUE89_LIFE '+JSON.stringify(datum));};
  mark('init');
  document.addEventListener('readystatechange',()=>mark('readystatechange'));
  document.addEventListener('DOMContentLoaded',()=>mark('DOMContentLoaded'));
  window.addEventListener('load',()=>mark('load'));
 });
 page=await context.newPage();
 for(const kind of ['domcontentloaded','load','crash','close'])page.on(kind,()=>ev('playwright_'+kind));
 page.on('pageerror',e=>ev('pageerror',{error:String(e).slice(0,1800)}));
 page.on('console',m=>{const s=m.text();
   if(s.startsWith('ISSUE89_LIFE ')){try{ev('document_lifecycle',JSON.parse(s.slice(13)));}catch(e){ev('lifecycleParseError',{error:String(e)});}}
   else if(m.type()==='error')ev('console_error',{text:s.slice(0,800)});});
 for(const kind of ['request','requestfinished','requestfailed','response'])page.on(kind,r=>{
  const q=kind==='response'?r.request():r;
  ev(kind,{path:new URL(q.url()).pathname,...(kind==='response'?{status:r.status()}:{}),
    ...(kind==='requestfailed'?{failure:q.failure()}: {})});});
 sampler=setInterval(sampleCpu,250);sampleCpu();
 await readyState('pre-navigation');
 report.gotoCount++;
 const url='http://127.0.0.1:'+server.address().port+'/Loading-museum/#modern-exhibit-swipe-dismiss';
 const navigation={atMs:millis(),timeoutMs:9000,waitUntil:'load',status:'STARTED'};
 report.navigation=navigation;
 try{
  const resp=await page.goto(url,{waitUntil:'load',timeout:9000});
  navigation.status='RESOLVED';navigation.httpStatus=resp?.status()||null;
 }catch(e){navigation.status='ERROR';navigation.error=String(e).slice(0,1900);}
 navigation.finishedMs=millis();
 await readyState('immediately_after');
 if(navigation.status!=='RESOLVED'){await new Promise(r=>setTimeout(r,3000));await readyState('3s_later_no_retry');}
}
async function finalize(){
 if(sampler)clearInterval(sampler);sampleCpu();
 if(context)try{await Promise.race([context.close(),new Promise((_,rej)=>setTimeout(()=>rej(Error('context close timeout')),7000))]);}catch(e){report.errors.push(String(e));}
 if(browser)try{await Promise.race([browser.close(),new Promise((_,rej)=>setTimeout(()=>rej(Error('browser close timeout')),7000))]);}catch(e){report.errors.push(String(e));}
 if(server)await new Promise(resolve=>server.close(()=>resolve()));
 report.terminalAtMs=millis();
 fs.writeFileSync(path.join(outDir,'observation.json'),JSON.stringify(report,null,2)+'\n');
 console.log('ISSUE89_OBSERVATION '+JSON.stringify({navigation:report.navigation,buildIdentical:report.originalBuildIdentical,
  webkit:report.browserVersion,events:report.events.filter(x=>/load|readyState|crash|pageerror/i.test(x.kind)).slice(0,40),
  cpuSampleCount:report.cpu.length,served:report.http.length,errors:report.errors}));
}
run().catch(e=>{report.errors.push(String(e?.stack||e));process.exitCode=1;}).finally(finalize);
