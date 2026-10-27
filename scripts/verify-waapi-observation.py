"""Stage 2A native WAAPI checks. Serve a local static export; never publish.
Requires Python Playwright and installed browsers. Each engine/width can run separately.
The hidden-tab case dispatches a synthetic visibilitychange; it is NOT real OS backgrounding.
"""
import hashlib, json, os, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('WAAPI_URL','http://127.0.0.1:4201/Loading-museum/')
OUT=os.environ.get('WAAPI_RESULT','/tmp/observation-result.json')
results=[]
ROOT=Path(__file__).resolve().parents[1]
artifacts={str(path):hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in [Path("app/components/WaapiGameObservation.tsx"),Path("app/globals.css"),Path("out/index.html")] if (ROOT/path).is_file()}

def live_pause_reached(before,settled,duration):
 return before['native']=='running' and settled['native']=='paused' and 0<before['time']<duration and 0<settled['time']<duration and abs(before['time']-settled['time'])<.1
pause_controls=[]
for label,before,after,expected in [
 ('live-held',{'time':50,'native':'running'},{'time':50,'native':'paused'},True),
 ('natural-endpoint',{'time':220,'native':'finished'},{'time':220,'native':'paused'},False),
 ('seek-only-not-live',{'time':50,'native':'paused'},{'time':50,'native':'paused'},False),
 ('pause-drift',{'time':50,'native':'running'},{'time':60,'native':'paused'},False)]:
 actual=live_pause_reached(before,after,220);assert actual==expected;pause_controls.append({'name':label,'expected':expected,'actual':actual})

def save(): Path(OUT).write_text(json.dumps(results,ensure_ascii=False,indent=2))
with sync_playwright() as p:
 for engine in os.environ.get('WAAPI_BROWSERS','chromium,webkit').split(','):
  for width in map(int,os.environ.get('WAAPI_WIDTHS','375,390,765').split(',')):
   r={'engine':engine,'width':width,'checks':[],'measurements':[],'errors':[],'status':'RUNNING','artifactSHA256':artifacts,'pausePredicateControls':pause_controls};results.append(r)
   browser=None
   try:
    path=os.environ.get('WAAPI_'+engine.upper()+'_PATH')
    browser=getattr(p,engine).launch(headless=True,**({'executable_path':path} if path else {}))
    r['version']=browser.version
    context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='no-preference',has_touch=True)
    q=context.new_page();q.set_default_timeout(10000);q.on('pageerror',lambda e:r['errors'].append(str(e)))
    q.goto(URL,wait_until='networkidle');q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
    assert q.locator('.waapiSampleCard').count()==47
    assert '197 OBJECTS' in q.locator('.archiveMeta').inner_text()
    assert sum(map(int,q.locator('.waapiCategoryCounts b').all_text_contents()))==47
    def card(name):
     q.get_by_label('検索',exact=True).fill(name)
     c=q.locator('.waapiSampleCard').filter(has=q.get_by_role('heading',name=name,exact=True));c.scroll_into_view_if_needed();return c
    def snapshot(o):
     return o.evaluate('''o=>{const t=o.querySelector('[data-observation-target]'),a=t.getAnimations()[0],rect=t.getBoundingClientRect(),stage=o.querySelector("[data-observation-stage]").getBoundingClientRect(),end=o.querySelector("[data-observation-end]")?.getBoundingClientRect();return {relative:{x:rect.x-stage.x,y:rect.y-stage.y,endCenter:end?(end.top+end.bottom)/2-stage.top:null},time:a?.currentTime,native:a?.playState,pending:a?.pending,controller:o.dataset.controller,reading:o.querySelector('[data-observation-reading]').textContent,rect:{x:rect.x,y:rect.y,w:rect.width,h:rect.height},opacity:getComputedStyle(t).opacity,transform:getComputedStyle(t).transform,duration:a?.effect.getTiming().duration}}''')
    def stable(o):
     q.wait_for_function('(n)=>n.dataset.controller!=="inactive" && n.querySelector("[data-observation-target]").getAnimations().length>0',arg=o.element_handle(),timeout=1000)
     o.locator('[data-observation-target]').evaluate('async t=>{const a=t.getAnimations()[0];if(a)await a.ready;}')
    def seek(o,value):
     slider=o.get_by_role('slider',name='観察時間（ms）')
     slider.evaluate('''(n,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,String(v));n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));}''',value)
     stable(o);q.wait_for_timeout(35)
     x=snapshot(o);assert abs(x['time']-value)<.1,x;assert f'{value:.2f}' in x['reading'],x;assert f"native currentTime: {x['time']:.2f} ms" in x['reading'],x;return x
    def begin(c):
     c.get_by_role('button',name='観察モードを開く',exact=True).click();o=c.locator('.waapiObservation');o.scroll_into_view_if_needed();stable(o);return o
    def button(o,name):return o.get_by_role('button',name=name,exact=True)
    for name in ['Menu Selection Cursor','Coin Pickup Arc']:
     c=card(name);normal=c.locator('[data-normal-game]')
     if name.startswith('Menu'):
      c.get_by_role('button',name='↓ Down',exact=True).click();q.wait_for_timeout(260)
      assert 'COLLECTION' in normal.locator('.isSelected').inner_text()
     else:
      c.get_by_role('button',name='Reset',exact=True).click();q.wait_for_timeout(900)
      assert normal.locator('output').inner_text()=='SCORE 0'
     o=begin(c);x=snapshot(o);duration=x['duration'];assert duration>0 and x['time']==0 and x['native']=='paused',x
     r['measurements'].append({'name':name,'initial':x})
     # Native playback and pause are driven through actual buttons, not a mocked Animation.
     pause_input=o.evaluate('''async n=>{
      const b=t=>[...n.querySelectorAll('button')].find(b=>b.textContent===t);
      const started=performance.now();b('再生 / 再開').click();
      const a=n.querySelector('[data-observation-target]').getAnimations()[0];
      await a.ready;const readyAt=performance.now();let frames=0;
      while(!(a.currentTime>0)&&performance.now()-started<1000){await new Promise(resolve=>requestAnimationFrame(resolve));frames++;}
      const before={time:a.currentTime,clock:performance.now(),native:a.playState,pending:a.pending};
      b('一時停止').click();const immediate={time:a.currentTime,clock:performance.now(),native:a.playState,pending:a.pending};
      await a.ready;return {started,readyAt,frames,before,immediate,readyAfterPause:performance.now()};
     }''');stable(o);a=snapshot(o)
     r['measurements'].append({'name':name,'pauseInput':pause_input,'settledPause':a})
     assert f"native currentTime: {a['time']:.2f} ms" in a['reading'],a
     if 0<pause_input['before']['time']<duration:
      assert abs(a['time']-pause_input['before']['time'])<.1, {'pauseTimeDrift':{'input':pause_input,'settled':a}}
     if not live_pause_reached(pause_input['before'],a,duration):
      r.setdefault('pathFailures',[]).append({'path':name+': mid-flight pause','expected':'0 < native currentTime < duration','observed':a})
      # Continue independent seek/step/cleanup cases; this does not pass the failed pause path.
      a=seek(o,duration/3)
     q.wait_for_timeout(100);b=snapshot(o);assert abs(a['time']-b['time'])<.1 and a['transform']==b['transform'],(a,b)
     button(o,'再生 / 再開').click();q.wait_for_timeout(30);button(o,'一時停止').click();stable(o);b=snapshot(o);assert b['time']>=a['time'],(a,b)
     seek(o,duration/2)
     seek_pause=o.evaluate('''n=>{const b=t=>[...n.querySelectorAll('button')].find(b=>b.textContent===t);b('再生 / 再開').click();const a=n.querySelector('[data-observation-target]').getAnimations()[0];const input=a.currentTime;b('一時停止').click();return input;}''')
     stable(o);assert abs(snapshot(o)['time']-seek_pause)<.1,{'seekResumePauseInput':seek_pause,'settled':snapshot(o)}
     r['measurements'].append({'name':name,'explicitSeekResumePause':{'input':seek_pause,'settled':snapshot(o)}})
     button(o,'観察位置を先頭へ').click();stable(o);assert snapshot(o)['time']==0
     button(o,'1ステップ進む').tap();stable(o);assert abs(snapshot(o)['time']-1000/60)<.1
     button(o,'1ステップ戻る').focus();q.keyboard.press('Enter');stable(o);assert snapshot(o)['time']==0
     assert button(o,'1ステップ戻る').is_disabled()
     positions=[seek(o,v) for v in [0,duration/2,duration-0.01,duration]]
     assert button(o,'1ステップ進む').is_disabled()
     button(o,'1ステップ戻る').click();stable(o);assert abs(snapshot(o)['time']-(duration-1000/60))<.1
     button(o,'最初から再生').click();q.wait_for_function('(n)=>n.dataset.controller==="finished"',arg=o.element_handle())
     assert snapshot(o)['native']=='finished',snapshot(o)
     seek(o,duration/2);button(o,'再生 / 再開').click();q.wait_for_function('(n)=>n.dataset.controller==="finished"',arg=o.element_handle())
     r['measurements'].append({'name':name,'pause':a,'positions':positions})
     if name.startswith('Menu'):
      assert positions[0]['relative']['y']<positions[1]['relative']['y']<positions[-1]['relative']['y'],positions
      assert abs(positions[-1]['relative']['y']+positions[-1]['rect']['h']/2-positions[-1]['relative']['endCenter'])<1
      seek(o,duration/2);ease=snapshot(o);o.get_by_label('観察のeasing',exact=True).select_option('linear');stable(o);linear=snapshot(o)
      assert linear['time']==ease['time'] and abs(linear['relative']['y']-ease['relative']['y'])>1,(ease,linear)
      assert 'COLLECTION' in normal.locator('.isSelected').inner_text()
     else:
      assert positions[0]['rect']['x']!=positions[1]['rect']['x'] and float(positions[-1]['opacity'])<float(positions[0]['opacity']),positions
      assert normal.locator('output').inner_text()=='SCORE 0'
     # Keyboard slider and focus, rapid alternating seeks and controls.
     slider=o.get_by_role('slider',name='観察時間（ms）');slider.focus();q.keyboard.press('Home');stable(o);assert snapshot(o)['time']==0
     q.keyboard.press('End');stable(o);assert snapshot(o)['time']==duration
     assert slider.evaluate('n=>document.activeElement===n')
     box=slider.bounding_box();slider.tap(position={'x':box['width']/2,'y':box['height']/2});stable(o)
     pointer_value=float(slider.input_value());pointer_state=snapshot(o)
     assert 0<pointer_value<duration and abs(pointer_state['time']-pointer_value)<.1,{'rangeValue':pointer_value,'native':pointer_state}
     r['measurements'].append({'name':name,'nativeTouchRange':{'value':pointer_value,'snapshot':pointer_state}})
     for value in [duration*.9,duration*.1,duration*.8,0]:seek(o,value)
     for _ in range(3):button(o,'再生 / 再開').click();button(o,'一時停止').click()
     stable(o);assert o.locator('[data-observation-target]').evaluate('n=>n.getAnimations().length')==1
     # Cancel on offscreen, restore at preserved time without automatic restart.
     seek(o,duration/3);o.evaluate('n=>window.oldObservation=n.querySelector("[data-observation-target]").getAnimations()[0]')
     q.evaluate('scrollTo(0,0)');q.wait_for_function('oldObservation.playState==="idle"',timeout=1000)
     assert q.evaluate('oldObservation.playState')=='idle'
     q.wait_for_function('(n)=>n.dataset.controller==="inactive"',arg=o.element_handle(),timeout=1000)
     inactive=snapshot(o);assert 'native currentTime: 未取得（null）' in inactive['reading'],inactive
     r['measurements'].append({'name':name,'offscreenNullReading':inactive})
     o.scroll_into_view_if_needed();q.wait_for_timeout(100);stable(o);assert snapshot(o)['native']=='paused';assert abs(snapshot(o)['time']-duration/3)<.1
     # Synthetic visibility is expressly separate from true browser/OS backgrounding.
     button(o,'最初から再生').click();q.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
     q.wait_for_timeout(50);assert snapshot(o)['controller']=='inactive'
     q.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");q.wait_for_timeout(60);stable(o);assert snapshot(o)['native']=='paused'
     # Mid-flight reduced motion cancels old native Animation and recreates a static preview.
     o.evaluate('n=>window.preReduce=n.querySelector("[data-observation-target]").getAnimations()[0]');button(o,'最初から再生').click()
     q.emulate_media(reduced_motion='reduce');q.wait_for_function('preReduce.playState==="idle"')
     assert button(o,'再生 / 再開').is_disabled();stable(o);assert snapshot(o)['native']=='paused'
     seek(o,duration/2);button(o,'1ステップ戻る').click();stable(o);assert abs(snapshot(o)['time']-(duration/2-1000/60))<.1
     q.emulate_media(reduced_motion='no-preference');q.wait_for_function('(n)=>!n.disabled',arg=button(o,'再生 / 再開').element_handle());stable(o);assert snapshot(o)['native']=='paused'
     button(o,'最初から再生').click();q.wait_for_timeout(35);button(o,'一時停止').click();stable(o);assert snapshot(o)['time']>0
     r['checks'].append(name+': native time/play/pause/resume/steps/seek/boundaries/finished rewind/easing/keyboard/rapid/offscreen/synthetic visibility/media change; excludes any separately recorded pathFailures')
     c.get_by_role('button',name='通常モードへ戻る',exact=True).click()
     if name.startswith('Menu'):
      assert 'COLLECTION' in normal.locator('.isSelected').inner_text()
      c.get_by_role('button',name='↓ Down',exact=True).click();q.wait_for_timeout(300)
      normal.evaluate('async n=>{const animations=n.getAnimations({subtree:true});await Promise.race([Promise.all(animations.map(a=>a.finished.catch(()=>{}))),new Promise((_,reject)=>setTimeout(()=>reject(Error("normal menu animation did not settle")),1000))])}')
      g=normal.locator('.isSelected').evaluate('n=>{let a=n.querySelector("i").getBoundingClientRect(),b=n.getBoundingClientRect();return (a.top+a.bottom-b.top-b.bottom)/2}')
      assert abs(g)<1,g
     else:
      assert normal.locator('output').inner_text()=='SCORE 0';c.get_by_role('button',name='COLLECT',exact=True).click();assert normal.locator('output').inner_text()=='SCORE 100'
      o=begin(c);seek(o,duration);seek(o,0);c.get_by_role('button',name='通常モードへ戻る',exact=True).click();assert normal.locator('output').inner_text()=='SCORE 100';assert c.get_by_role('button',name='COLLECT',exact=True).is_disabled()
      c.get_by_role('button',name='Replay',exact=True).click();q.wait_for_timeout(850);assert normal.locator('output').inner_text()=='SCORE 100'
      c.get_by_role('button',name='Reset',exact=True).click();assert normal.locator('output').inner_text()=='SCORE 0'
     r['checks'].append(name+': normal state retained; original input and Reset contract')
     if name.startswith('Menu'):
      o=begin(c);seek(o,duration/2)
      q.set_viewport_size({'width':375 if width!=375 else 390,'height':900});o.evaluate('n=>n.scrollIntoView({block:"center",behavior:"instant"})');q.wait_for_timeout(100);stable(o)
      before=snapshot(o);assert abs(before['time']-duration/2)<.1 and before['native']=='paused',before
      o.locator('.gameMenu').evaluate("n=>n.style.fontFamily='serif'");q.wait_for_timeout(100);stable(o)
      after=snapshot(o);assert abs(after['time']-duration/2)<.1 and after['native']=='paused',after
      q.set_viewport_size({'width':width,'height':900});o.evaluate('n=>n.scrollIntoView({block:"center",behavior:"instant"})');q.wait_for_timeout(100);stable(o)
      r['measurements'].append({'resizeAndFontAtHeldTime':{'before':before,'after':after}})
      c.get_by_role('button',name='通常モードへ戻る',exact=True).click()
     # Narrow layout, CSS text-only expansion and light/dark media are not actual zoom.
     o=begin(c)
     for theme in ['light','dark']:
      q.emulate_media(color_scheme=theme);assert o.evaluate('n=>n.scrollWidth<=n.clientWidth+1')
     c.evaluate('n=>{const es=[...n.querySelectorAll("*")];const fs=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=fs[i]*2+"px")}')
     q.wait_for_timeout(100);o.scroll_into_view_if_needed();stable(o);seek(o,duration)
     overflow=o.evaluate('n=>({scroll:n.scrollWidth,width:n.clientWidth,overflow:[...n.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().right>n.getBoundingClientRect().right+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,100),right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})');assert overflow['scroll']<=overflow['width']+1,overflow
     if name.startswith('Menu'):
      g=o.evaluate('n=>{let a=n.querySelector("[data-observation-target]").getBoundingClientRect(),b=n.querySelector("[data-observation-end]").getBoundingClientRect();return (a.top+a.bottom-b.top-b.bottom)/2}');assert abs(g)<1,g
     shot=os.environ.get('WAAPI_SCREENSHOTS')
     if shot:
      Path(shot).mkdir(parents=True,exist_ok=True);o.screenshot(path=f'{shot}/{engine}-{width}-{name.split()[0]}-text200.png')
     r['checks'].append(name+': both color media/CSS text200 no observation overflow/end geometry')
     # Closing gallery unmounts preview and cancels old native animation.
     o.evaluate('n=>window.closedAnimation=n.querySelector("[data-observation-target]").getAnimations()[0]')
     q.get_by_role('button',name='サンプル一覧を閉じる',exact=False).click();assert q.evaluate('closedAnimation.playState')=='idle'
     q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
     r['checks'].append(name+': close/unmount cancellation')
    assert not r['errors'];r['status']='PARTIAL' if r.get('pathFailures') else 'PASS'
   except Exception as e:r['status']='FAIL';r['failure']=str(e);r['traceback']=traceback.format_exc()
   finally:
    save();print(engine,width,r['status'],r.get('failure',''),flush=True)
    if browser:browser.close()
save()
raise SystemExit(0 if all(x['status']=='PASS' for x in results) else 1)
