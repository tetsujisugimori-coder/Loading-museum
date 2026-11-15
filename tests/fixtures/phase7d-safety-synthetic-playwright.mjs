// Synthetic lifecycle substitute only. NOT a real browser or product fault reproduction.
import fs from 'node:fs';
import path from 'node:path';
export function syntheticPlaywright({fault='normal',bytes,dest}) {
  let launches=0;const events=[];
  const engine={launch:async()=>{
    const index=++launches,active=index===1;events.push({index,event:'launch'});
    let mode='normal',released=false,cancelled=false,evaluations=0;
    const listeners={};let harPath,tracePath,urls=[];
    const snapshot=()=>({committed:cancelled?'Cancelled':(mode==='normal'||released||mode==='dom-delay'?'Done':'Idle'),
      dom:cancelled?'Cancelled':(mode==='normal'||released?'Done':'Idle'),pending:mode!=='normal'&&!released,
      events:cancelled?[{kind:'guard',accepted:false}]:[{kind:'commit'}]});
    const page={setDefaultTimeout(){},on(name,fn){listeners[name]=fn;},clock:{install:async()=>{},runFor:async()=>{}},
      goto:async url=>{mode=new URL(url).searchParams.get('fault');urls=[url,new URL('/fixture.js',url).href];
        for(const [i,name] of ['index.html','fixture.js'].entries())listeners.response?.({url:()=>urls[i],status:()=>200,
          body:async()=>{if(active&&fault==='capture-reject'&&i===1)throw Error('synthetic capture rejection');return bytes[name];}});},
      locator:selector=>({click:async()=>{if(selector==='#cancel')cancelled=true;if(selector==='#release')released=true;}}),
      evaluate:async()=>{evaluations++;if(active&&fault==='operation-and-cleanup'&&evaluations===2)throw Error('PRIMARY_OPERATION_ERROR');return snapshot();}};
    return {newContext:async options=>{harPath=options.recordHar.path;return {
      tracing:{start:async()=>{},stop:async options=>{events.push({index,event:'trace.stop'});tracePath=options.path;
        if(active&&fault==='trace-stop')throw Error('TRACE_STOP_ERROR');
        if(!(active&&fault==='trace-missing'))fs.copyFileSync(new URL('./phase7d-safety-synthetic-trace.zip',import.meta.url),tracePath);}},
      newPage:async()=>page,
      close:async()=>{events.push({index,event:'context.close'});if(active&&fault==='late-pageerror')listeners.pageerror?.(Error('LATE_PAGE_ERROR'));
        if(active&&['context-close','both-close','operation-and-cleanup','har-finalization'].includes(fault))throw Error(fault==='har-finalization'?'HAR_FINALIZATION_ERROR':'CONTEXT_CLOSE_ERROR');
        if(!(active&&fault==='har-missing'))fs.writeFileSync(harPath,JSON.stringify({log:{version:'1.2',creator:{name:'SYNTHETIC'},entries:['index.html','fixture.js'].map((name,i)=>({request:{url:urls[i]},response:{status:200,content:{text:bytes[name].toString('base64'),encoding:'base64'}}}))}}));
      }};},
      close:async()=>{events.push({index,event:'browser.close'});if(active&&fault==='late-capture')listeners.response?.({url:()=>urls[1],status:()=>200,body:async()=>{throw Error('LATE_CAPTURE_ERROR');}});
        if(active&&['browser-close','both-close','operation-and-cleanup'].includes(fault))throw Error('BROWSER_CLOSE_ERROR');
        if(active&&['served-save','result-save'].includes(fault))fs.mkdirSync(path.join(dest,'fixture-chromium-normal',fault==='served-save'?'served.json':'result.json'));
      }};
  }};
  return {pw:{chromium:engine,webkit:engine},events};
}
