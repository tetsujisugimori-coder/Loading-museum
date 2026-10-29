"""Native browser checks for Issue #33. Local static export only; no publication."""
import json,os,sys,traceback
from playwright.sync_api import sync_playwright
results=[]
with sync_playwright() as p:
 for engine in os.environ.get('WAAPI_BROWSERS','chromium,webkit').split(','):
  browser=getattr(p,engine).launch(headless=True,executable_path=os.environ['WAAPI_'+engine.upper()+'_PATH'])
  for width in map(int,os.environ.get('WAAPI_WIDTHS','375,390,765').split(',')):
   context=browser.new_context(viewport={'width':width,'height':757});q=context.new_page();q.set_default_timeout(10000)
   r={'engine':engine,'version':browser.version,'width':width,'checks':[],'errors':[]};results.append(r)
   q.on('pageerror',lambda e:r['errors'].append(str(e)))
   try:
    q.goto(os.environ.get('WAAPI_URL','http://127.0.0.1:4201/Loading-museum/'),wait_until='networkidle')
    q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
    def card(name):
     c=q.locator('.waapiSampleCard').filter(has=q.get_by_role('heading',name=name,exact=True));c.scroll_into_view_if_needed();return c
    m=card('Menu Selection Cursor');r['menu']=[]
    for scale in [1,2]:
     if scale==2:m.evaluate('n=>{const es=[...n.querySelectorAll("*")];const sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]*2+"px")}')
     m.get_by_role('button',name='Reset',exact=True).click()
     for i in range(3):
      if i:m.get_by_role('button',name='↓ Down',exact=True).click()
      q.wait_for_timeout(300)
      g=m.locator('.gameMenu').evaluate('n=>{const a=n.querySelector("i").getBoundingClientRect(),b=n.querySelector(".isSelected").getBoundingClientRect();return {cursor:{top:a.top,bottom:a.bottom},target:{top:b.top,bottom:b.bottom},dy:(a.top+a.bottom-b.top-b.bottom)/2}}')
      g.update(scale=scale,index=i);r['menu'].append(g);assert abs(g['dy'])<1,g
     m.locator('.waapiPreviewStage').focus();q.keyboard.press('ArrowUp');assert 'COLLECTION' in m.locator('.isSelected').inner_text()
     m.get_by_role('button',name='Reset',exact=True).click();assert 'CONTINUE' in m.locator('.isSelected').inner_text()
    print(engine,width,'checkpoint',len(r['checks']),file=sys.stderr,flush=True);r['checks'].append('menu all3 positions normal/CSS200 geometry keyboard reset')
    r['timing']=[]
    for reduce in ['no-preference','reduce']:
     q.emulate_media(reduced_motion=reduce);q.wait_for_timeout(60)
     for name,start,action in [('Perfect Parry','ENEMY ATTACK','PARRY'),('Dodge Afterimage','ATTACK START','DODGE LEFT')]:
      q.emulate_media(reduced_motion=reduce);q.wait_for_timeout(60);c=card(name)
      for delay,expected in [(30,'EARLY'),(500,'PERFECT' if name=='Perfect Parry' else 'S-RANK'),(750,'LATE')]:
       c.get_by_role('button',name='RESET',exact=True).click()
       # Native DOM events within one browser task avoid transport delay skew.
       x=c.evaluate('''async(n,{start,action,delay})=>{const b=t=>[...n.querySelectorAll('button')].find(x=>x.textContent===t);b(start).click();const t=performance.now();await new Promise(r=>setTimeout(r,delay));const before=n.querySelector('output').textContent;const elapsed=performance.now()-t;b(action).click();await new Promise(r=>setTimeout(r,20));return {before,after:n.querySelector('output').textContent,elapsed}}''',{'start':start,'action':action,'delay':delay})
       x.update(name=name,motion=reduce,requested=delay);r['timing'].append(x);assert expected in x['after'],x
       if delay==30:assert 'ACTIVE WINDOW' not in x['before'],x
       if delay==500:assert 'ACTIVE WINDOW' in x['before'],x
      c.get_by_role('button',name=start,exact=True).click();q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(40);c.get_by_role('button',name='RESET',exact=True).click();q.wait_for_timeout(800);assert c.locator('output').inner_text()=='READY'
    print(engine,width,'checkpoint',len(r['checks']),file=sys.stderr,flush=True);r['checks'].append('parry/dodge early success late both motion modes and reset during toggle')
    q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(50)
    c=card('Battle Transition');c.get_by_role('button',name='ENCOUNTER',exact=True).click();q.wait_for_timeout(1100);assert 'sceneBATTLE' in c.locator('[data-scene=battle]').get_attribute('class')
    c.get_by_role('button',name='RESET',exact=True).click();c.get_by_role('button',name='ENCOUNTER',exact=True).click();q.evaluate('scrollTo(0,0)');q.wait_for_timeout(1200);c.scroll_into_view_if_needed();q.wait_for_timeout(80)
    r['battleOffscreen']={'text':c.locator('output').inner_text(),'class':c.locator('[data-scene=battle]').get_attribute('class')};assert 'sceneFIELD' in r['battleOffscreen']['class'];assert 'INTERRUPT' in r['battleOffscreen']['text']
    for i in range(2):c.get_by_role('button',name='ENCOUNTER',exact=True).click();c.get_by_role('button',name='RESET',exact=True).click();q.wait_for_timeout(1000);assert c.locator('output').inner_text()=='FIELD', {'expected':'FIELD','observed':c.locator('output').inner_text()}
    c.get_by_role('button',name='ENCOUNTER',exact=True).click();q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(1100);assert 'ENCOUNTER' not in c.locator('output').inner_text(), {'afterMotion':c.locator('output').inner_text()}
    print(engine,width,'checkpoint',len(r['checks']),file=sys.stderr,flush=True);r['checks'].append('battle completion offscreen interruption reset repeat motion toggle')
    q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(60);c=card('Combat Damage Feedback')
    c.evaluate('n=>{window.stageAnimations=[];const f=Element.prototype.animate;Element.prototype.animate=function(...args){const a=f.apply(this,args);if(this.closest("[data-sample-id=combat-damage-feedback]")){window.stageAnimations.push(a);a.pause();a.currentTime=100;}return a}}')
    c.get_by_role('button',name='CRITICAL',exact=True).click();q.evaluate("()=>{window.motionStarted=performance.now();window.motionEvents=[];matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',e=>motionEvents.push({time:performance.now()-motionStarted,matches:e.matches}))}");q.emulate_media(reduced_motion='reduce');q.wait_for_function('stageAnimations.every(a=>a.playState==="idle")',timeout=1500);r['combat']=q.evaluate('stageAnimations.map(a=>a.playState)');r['combatMediaEvents']=q.evaluate('({events:motionEvents,observedAfter:performance.now()-motionStarted})');assert len(r['combat'])==3 and all(s=='idle' for s in r['combat']),r['combat'];assert '999' in c.locator('output').inner_text()
    c.get_by_role('button',name='RESET',exact=True).click();assert c.locator('output').inner_text()=='READY';print(engine,width,'checkpoint',len(r['checks']),file=sys.stderr,flush=True);r['checks'].append('combat paused native animations cancelled by motion ON and logical result retained')
    c=card('Coin Pickup Arc');c.get_by_role('button',name='Reset',exact=True).click();q.wait_for_timeout(800);assert c.locator('output').inner_text()=='SCORE 0'
    q.evaluate('scrollTo(0,0)');q.wait_for_timeout(100);c.scroll_into_view_if_needed();q.wait_for_timeout(800);assert c.locator('output').inner_text()=='SCORE 0'
    c.get_by_role('button',name='COLLECT',exact=True).focus();q.keyboard.press('Enter');assert c.locator('output').inner_text()=='SCORE 100'
    c.evaluate('n=>{const b=[...n.querySelectorAll("button")].find(x=>x.textContent==="COLLECT");b.click();b.click()}');assert c.locator('output').inner_text()=='SCORE 100'
    c.get_by_role('button',name='Replay',exact=True).click();q.wait_for_timeout(800);assert c.locator('output').inner_text()=='SCORE 100'
    c.get_by_role('button',name='Reset',exact=True).click();q.wait_for_timeout(800);assert c.locator('output').inner_text()=='SCORE 0';print(engine,width,'checkpoint',len(r['checks']),file=sys.stderr,flush=True);r['checks'].append('coin demo/reentry no award explicit keyboard collect once rapid replay reset')
    assert not r['errors'];r['status']='PASS'
   except Exception as e:r['status']='FAIL';r['failure']=str(e);r['traceback']=traceback.format_exc()
   print(engine,width,r['status'],r.get('failure',''),file=sys.stderr,flush=True)
   open(os.environ.get('WAAPI_PARTIAL','/tmp/stage1-partial.json'),'w').write(json.dumps(results,ensure_ascii=False,indent=2))
   context.close()
   print('closed',engine,width,file=sys.stderr,flush=True)
  browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(x['status']=='PASS' for x in results) else 1)
