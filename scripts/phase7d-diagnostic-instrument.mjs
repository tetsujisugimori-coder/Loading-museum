/** Isolated-source diagnostic transform. Never applies changes to the product tree itself. */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function instrumentSource(input,kind,group){
 if(!['swipe','status'].includes(kind)||!['A','B','C'].includes(group))throw new Error('Unknown diagnostic kind/group');
 const manifest={kind,group,beforeSha256:sha(input),afterSha256:sha(input),replacements:[]};
 if(group==='A')return {source:input,manifest};
 let source=input;
 const replace=(old,next,label)=>{const n=source.split(old).length-1;if(n!==1)throw new Error(`${kind}/${group}: ${label}: expected one exact match, got ${n}`);source=source.replace(old,next);manifest.replacements.push(label);};
 const emit=(phase,fields='')=>`__phase7dEmit('${kind}','${phase}',{${fields}});`;
 const helper=`\nfunction __phase7dEmit(work:string,phase:string,fields:Record<string,unknown>){if(typeof window==='undefined')return;const sink=(window as unknown as {__phase7dDiagnosticEmit?:(event:Record<string,unknown>)=>void}).__phase7dDiagnosticEmit;if(sink)sink({work,phase,...fields});}\n`;
 replace("type Props={active:boolean;reduced:boolean};",helper+"type Props={active:boolean;reduced:boolean};",'diagnostic sink');
 if(kind==='swipe'){
  replace('useCallback,useEffect,useRef,useState,','useCallback,useEffect,useLayoutEffect,useRef,useState,','commit hook import');
  // Anchor changes inside Swipe only, not identical change functions in PressRelease.
  const marker='export function SwipeDismiss({active,reduced}:Props){';
  const pos=source.indexOf(marker);if(pos<0)throw new Error('Missing Swipe function');
  let prefix=source.slice(0,pos),body=source.slice(pos);source=body;
  replace("const change=(next:string)=>{live.current=next;setState(next);};",`const change=(next:string)=>{${emit('state-request','generation:epoch.current,requested:next')}live.current=next;setState(next);};\n useLayoutEffect(()=>{${emit('commit','generation:epoch.current,state,domState:root.current?.getAttribute(\'data-state\')??null')}});`,'swipe state and commit');
  replace('const up=(e:PointerEvent<HTMLButtonElement>)=>{const d=drag.current;',`const up=(e:PointerEvent<HTMLButtonElement>)=>{${emit('handler',"event:'pointerup',generation:epoch.current,hasDrag:!!drag.current,pointerId:e.pointerId")}const d=drag.current;`,'swipe handler');
  if(group==='C'){
   replace('const down=(e:PointerEvent<HTMLButtonElement>)=>{if(e.button!==0', `const down=(e:PointerEvent<HTMLButtonElement>)=>{${emit('handler',"event:'pointerdown',generation:epoch.current,pointerId:e.pointerId")}if(e.button!==0`, 'swipe down');
   replace("const settle=(distance:number,v:number)=>{const gen=invalidate(),result=swipeDecision(distance,v,threshold);",`const settle=(distance:number,v:number)=>{const gen=invalidate(),result=swipeDecision(distance,v,threshold);${emit('operation-start',"operationId:'swipe-'+gen,generation:gen,expected:result")}`,'swipe operation');
   replace("later(()=>{if(gen===epoch.current)change(result);},reduced?0:240);",`later(()=>{${emit('timer-callback','generation:epoch.current,token:gen')}${emit('guard','generation:epoch.current,token:gen,accepted:gen===epoch.current,rejection:gen===epoch.current?null:\'generation-mismatch\'')}if(gen===epoch.current)change(result);},reduced?0:240);`,'swipe callback guard');
  }
  source=prefix+source;
  if(group==='C')replace('const invalidate=useCallback(()=>{epoch.current++;', `const invalidate=useCallback(()=>{if(root.current?.getAttribute('data-testid')==='swipe-to-dismiss'){${emit('invalidate','generation:epoch.current,timerId:timer.current')}}epoch.current++;`, 'swipe invalidation');
  if(group==='C')replace('timer.current=setTimeout(fn,ms);',"timer.current=setTimeout(fn,ms);if(root.current?.getAttribute('data-testid')==='swipe-to-dismiss'){"+emit('timer-register','generation:epoch.current,timerId:timer.current,delay:ms')+'}','swipe timer registration');
 }else{
  replace("const set=(s:MorphState)=>{stateRef.current=s;setState(s);setEvents(e=>[...e.slice(-7),s]);};",`const set=(s:MorphState)=>{${emit('state-request','generation:generation.current,requested:s')}stateRef.current=s;setState(s);setEvents(e=>[...e.slice(-7),s]);};\n useLayoutEffect(()=>{${emit('commit',"generation:generation.current,state,domState:root.current?.getAttribute('data-state')??null")}});`,'status state and commit');
  replace('const run=()=>{if(!allowed.current)return;',`const run=()=>{${emit('handler',"event:'run',generation:generation.current,allowed:allowed.current")}if(!allowed.current)return;`,'status handler');
  if(group==='C'){
   replace("const token=generation.current;set('Loading');",`const token=generation.current;${emit('operation-start',"operationId:'status-'+token,generation:token,expected:outcome")}set('Loading');`,'status operation');
   replace('timer.current=setTimeout(()=>{if(token!==generation.current||!allowed.current)return;',`timer.current=setTimeout(()=>{${emit('timer-callback','generation:generation.current,token')}${emit('guard',"generation:generation.current,token,allowed:allowed.current,accepted:token===generation.current&&allowed.current,rejection:token!==generation.current?'generation-mismatch':!allowed.current?'not-allowed':null")}if(token!==generation.current||!allowed.current)return;`,'status callback guard');
   replace('},duration);};',`},duration);${emit('timer-register','generation:generation.current,timerId:timer.current,delay:duration') }};`,'status timer registration');
   replace('const invalidate=useCallback(()=>{generation.current++;',`const invalidate=useCallback(()=>{${emit('invalidate','generation:generation.current,timerId:timer.current')}generation.current++;`,'status invalidation');
  }
 }
 manifest.afterSha256=sha(source);return {source,manifest};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [kind,group,input,output]=process.argv.slice(2);
 if(!output||input===output)throw new Error('Usage: node script kind group input-copy output-copy; distinct paths required');
 const result=instrumentSource(await readFile(input,'utf8'),kind,group);await writeFile(output,result.source);await writeFile(output+'.instrumentation.json',JSON.stringify(result.manifest,null,2)+'\n');
}
