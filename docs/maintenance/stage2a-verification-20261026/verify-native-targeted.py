"""Independent native WAAPI diagnostics; no product mutation or Animation mocks.
Browser-local click timing is synthetic input, not human latency or OS backgrounding.
Negative controls deliberately omit pause and deliver at terminal time; neither may pass.
"""
import os,json,time,traceback,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(os.environ['VERIFY_OUT']);results=[]
def save():OUT.write_text(json.dumps(results,ensure_ascii=False,indent=2))
with sync_playwright() as p:
 for engine in os.environ.get('TARGET_ENGINES','chromium,webkit').split(','):
  print('launch',engine,flush=True)
  b=getattr(p,engine).launch(headless=True,executable_path=os.environ['WAAPI_'+engine.upper()+'_PATH'])
  print('launched',engine,flush=True)
  context=b.new_context(viewport={'width':390,'height':900},has_touch=True,reduced_motion='no-preference');q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  print('navigating',engine,flush=True)
  q.goto(os.environ['WAAPI_URL']);q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill('Coin Pickup Arc');c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed()
  r={'engine':engine,'version':b.version,'width':390,'errors':errors,'pause':[],'normal':[]};results.append(r)
  try:
   c.get_by_role('button',name='観察モードを開く',exact=True).click();o=c.locator('.waapiObservation');o.scroll_into_view_if_needed()
   for mode,fraction in [('pause',.05),('pause',.5),('pause',.9),('omit-pause',.3),('terminal',1)]:
    for repeat in range(3 if mode=='pause' else 1):
     o.get_by_role('button',name='観察位置を先頭へ',exact=True).click()
     o.locator('[data-observation-target]').evaluate('async t=>await t.getAnimations()[0].ready')
     x=o.evaluate('''async(n,{fraction,mode})=>{const button=t=>[...n.querySelectorAll('button')].find(b=>b.textContent===t);const snap=a=>({clock:performance.now(),currentTime:a.currentTime,playState:a.playState,pending:a.pending});button('再生 / 再開').click();const a=n.querySelector('[data-observation-target]').getAnimations()[0],duration=a.effect.getTiming().duration,start=performance.now();while(a.currentTime<duration*fraction&&performance.now()-start<2500)await new Promise(r=>setTimeout(r,1));const input=snap(a);if(mode!=='omit-pause')button('一時停止').click();const immediate=snap(a);await a.ready;const ready=snap(a);await new Promise(r=>setTimeout(r,100));const held=snap(a);return {requestedFraction:fraction,duration,input,immediate,ready,held,deltaReady:ready.currentTime-input.currentTime,deltaHeld:held.currentTime-ready.currentTime,display:n.querySelector('[data-observation-reading]').textContent};}''',{'fraction':fraction,'mode':mode})
     x.update(mode=mode,repeat=repeat);x['midInput']=0<x['input']['currentTime']<x['duration'];x['pausePass']=x['midInput'] and x['ready']['playState']=='paused' and abs(x['deltaReady'])<.1 and abs(x['deltaHeld'])<.1
     x['verdict']=('PASS' if x['pausePass'] else ('INPUT_MISSED' if not x['midInput'] else 'FAIL')) if mode=='pause' else ('NEGATIVE_CONTROL_REJECTED' if not x['pausePass'] else 'NEGATIVE_CONTROL_FAILED');r['pause'].append(x);save()
   # Explicit seek/restart/rewind are also covered by the complete six-condition suite.
   c.get_by_role('button',name='通常モードへ戻る',exact=True).click()
   for action,paused in [('Replay',False),('COLLECT',False),('Replay',True),('COLLECT',True)]:
    q.emulate_media(reduced_motion='no-preference');c.get_by_role('button',name='Reset',exact=True).click()
    if action=='COLLECT':c.get_by_role('button',name='コインを取る',exact=True).click()
    else:c.get_by_role('button',name='Replay',exact=True).click()
    if paused:c.locator('[data-normal-game] [data-motion-target]').evaluate('async n=>{const a=n.getAnimations()[0];a.pause();await a.ready;}')
    before=c.locator('[data-normal-game] [data-motion-target]').evaluate('n=>{window.__coinAnimation=n.getAnimations()[0];const a=window.__coinAnimation;window.__reduceInput=null;matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",()=>{window.__reduceInput={time:a?.currentTime,state:a?.playState,pending:a?.pending,clock:performance.now(),duration:a?.effect.getTiming().duration}},{once:true});return {time:a?.currentTime,state:a?.playState,pending:a?.pending,clock:performance.now(),duration:a?.effect.getTiming().duration}}')
    q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(30)
    after=q.evaluate('()=>{const a=window.__coinAnimation;return {time:a?.currentTime,state:a?.playState,pending:a?.pending,clock:performance.now()}}')
    mediaInput=q.evaluate('window.__reduceInput')
    eligible=mediaInput and mediaInput.get('state') in ['running','paused'] and mediaInput.get('time') is not None and mediaInput['time']<mediaInput['duration']
    r['normal'].append({'action':action,'pausedDiagnostic':paused,'mediaInput':mediaInput,'before':before,'afterReduce':after,'expected':'idle','verdict':('PASS' if after.get('state')=='idle' else 'FAIL') if eligible else ('CANCELLED_TIMING_UNCERTAIN' if after.get('state')=='idle' else 'INPUT_MISSED'),'score':c.locator('[data-normal-game] output').inner_text()});save()
   r['status']='FAIL' if any(x['verdict'] in ['FAIL','NEGATIVE_CONTROL_FAILED'] for x in r['pause']+r['normal']) else 'PARTIAL' if any(x['verdict'] in ['INPUT_MISSED','CANCELLED_TIMING_UNCERTAIN'] for x in r['pause']+r['normal']) else 'PASS'
  except Exception as e:r.update(status='HARNESS_OR_PRODUCT_EXCEPTION',error=str(e),traceback=traceback.format_exc())
  save();print('closing',engine,flush=True);context.close();b.close();print('closed',engine,flush=True)
