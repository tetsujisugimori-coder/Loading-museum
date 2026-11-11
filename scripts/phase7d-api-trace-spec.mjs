/** Independently specified protocol calls for Playwright1.56.1, not learned from an observed trial. */
import {apiSequence} from './phase7d-api-plan.mjs';
export function traceOperations(t,names=apiSequence(t.case,t.group)) {
 const exhibit=t.case==='swipe'?'swipe-dismiss':'status-morph',stage=`#modern-exhibit-${exhibit}`;
 const root=stage+` >> internal:testid=[data-testid="${t.case==='swipe'?'swipe-to-dismiss':'status-morph'}"s]`;
 const card=stage+' >> internal:role=button[name="スワイプするカード"i]';
 const button=name=>stage+` >> internal:role=button[name="${name}"s]`;
 const locate=selector=>({selector,strict:true,timeout:9000});
 const spec=(method,params={},result)=>({method,params,...(result===undefined?{}:{result})});
 const mapping={
  'context.newPage':()=>spec('newPage'),
  'page.addInitScript':()=>spec('addInitScript',{source:"(()=>sessionStorage.setItem('digital-motion-archive-title-seen-v1','seen'))(undefined)"}),
  'page.goto':()=>spec('goto',{url:t.url,timeout:9000,waitUntil:'load'}),
  'root.waitFor':()=>spec('waitForSelector',{...locate(root),omitReturnValue:true}),
  'root.scrollIntoViewIfNeeded':()=>spec('waitForSelector',{...locate(root),state:'attached'}),
  'details.closed.count':()=>spec('queryCount',{selector:stage+' >> details[open]'},0),
  'details.open.count':()=>spec('queryCount',{selector:stage+' >> details[open]'},2),
  'summary.click':()=>spec('click',locate(stage+' >> summary >> nth=0')),
  'mechanism.click':()=>spec('click',locate(stage+' >> internal:text="仕組みを見る"s')),
  'clock.install':()=>spec('clockInstall'),
  'clock.origin.evaluate':()=>spec('evaluateExpression',{expression:'()=>Date.now()+1000',isFunction:true,arg:{value:{v:'undefined'},handles:[]}}),
  'clock.pauseAt':()=>spec('clockPauseAt',{timeNumber:t.clockOrigin.requestedPauseAtMs}),
  'prefix.card.focus':()=>spec('focus',locate(card)),
  'prefix.keyboard.ArrowRight':()=>spec('keyboardPress',{key:'ArrowRight'}),
  'prefix.keyboard.Enter':()=>spec('keyboardPress',{key:'Enter'}),
  'prefix.Undo.click':()=>spec('click',locate(button('Undo'))),
  'prefix.card.scrollIntoViewIfNeeded':()=>spec('waitForSelector',{...locate(card),state:'attached'}),
  'target.card.boundingBox':()=>spec('waitForSelector',{...locate(card),state:'attached'}),
  'target.mouse.move.start':()=>spec('mouseMove',{x:t.inputRectangle.x+t.inputRectangle.width/2,y:t.inputRectangle.y+t.inputRectangle.height/2}),
  'target.mouse.move.drag':()=>spec('mouseMove',{x:t.inputRectangle.x+t.inputRectangle.width/2+130,y:t.inputRectangle.y+t.inputRectangle.height/2,steps:8}),
  'target.mouse.down':()=>spec('mouseDown'), 'target.mouse.up':()=>spec('mouseUp'),
  'prefix.start.focus':()=>spec('focus',locate(button('模擬処理を開始'))),
  'prefix.cancel.click':()=>spec('click',locate(button('取消'))),
  'prefix.Replay.click':()=>spec('click',locate(button('Replay'))),
  'target.Replay.first.click':()=>spec('click',locate(button('Replay'))),
  'target.Replay.second.click':()=>spec('click',locate(button('Replay'))),
  'target.result.selectOption':()=>spec('selectOption',{...locate(stage+' >> internal:label="模擬結果"s'),options:[{valueOrLabel:'Error'}]}),
  'page.screenshot':()=>spec('screenshot',{timeout:9000}),
  'intermediate.noop.evaluate':()=>spec('evaluateExpression',{expression:'()=>null',isFunction:true,arg:{value:{v:'undefined'},handles:[]}}),
 };
 const prefixStates={'keyboard-prefix.getAttribute':'dismissed','undo-prefix.getAttribute':'idle','prefix-start.getAttribute':'Loading','cancel-prefix.getAttribute':'Cancelled','success-prefix.getAttribute':'Success'};
 return names.filter(name=>!['browser.launch','browser.newContext','context.tracing.start','context.tracing.stop','context.close','browser.close'].includes(name)).map(name=> {
  if(name.endsWith('.getAttribute'))return {...spec('getAttribute',{...locate(root),name:'data-state'},prefixStates[name]),name};
  if(name.endsWith('.clock.runFor'))return {...spec('clockRunFor',{ticksNumber:{'keyboard-prefix.clock.runFor':500,'css-return-prefix.clock.runFor':300,'cancel-prefix.clock.runFor':4000,'success-prefix.clock.runFor':3000,'target.clock.runFor':t.case==='swipe'?500:3000}[name]}),name};
  if(!mapping[name])throw Error('Unknown expected API '+name);return {...mapping[name](),name};
 });
}
