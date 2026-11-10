"""Stage 2B local native acceptance. No retries, no publication.
Synthetic visibilitychange is not OS tab backgrounding; touch is browser emulation.
Records exact HEAD plus dirty source hashes rather than calling an uncommitted run HEAD evidence.
"""
import datetime, hashlib, importlib.metadata, json, os, re, subprocess, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
DEST = Path(os.environ.get('EVIDENCE_DIR', ROOT / 'work/stage2b-browser')).resolve()
DEST.mkdir(parents=True, exist_ok=True)
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
files = git('ls-files','--cached','--others','--exclude-standard','--','app','scripts','tests','package.json').splitlines()
report = {'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD'),'trackedChanges':git('status','--porcelain','--untracked-files=no'),'playwright':importlib.metadata.version('playwright'),'sourceSHA256':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files if (ROOT/f).is_file()},'exportSHA256':hashlib.sha256((ROOT/'out/index.html').read_bytes()).hexdigest(),'limitations':['Touch is browser emulation, not a physical device.','Visibility case uses synthetic document.hidden/visibilitychange, not OS backgrounding.'],'results':[]}
server = subprocess.Popen(['node',str(ROOT/'scripts/serve-static-export.mjs'),str(ROOT/'out')],cwd=ROOT,stdout=subprocess.PIPE,text=True)
url = server.stdout.readline().strip()
assert url.startswith('http://127.0.0.1:'),url

def save(): (DEST/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
try:
 with sync_playwright() as p:
  for engine in os.environ.get('BROWSERS','chromium,webkit').split(','):
   for width in map(int,os.environ.get('WIDTHS','375,390,765,1280').split(',')):
    r={'engine':engine,'width':width,'checks':[],'measurements':[],'pageerrors':[],'status':'RUNNING'};report['results'].append(r);browser=None
    try:
     browser=getattr(p,engine).launch(headless=True);r['version']=browser.version
     context=browser.new_context(viewport={'width':width,'height':900},has_touch=True,reduced_motion='no-preference')
     q=context.new_page();q.set_default_timeout(10000);q.on('pageerror',lambda error:r['pageerrors'].append(str(error)))
     q.goto(url,wait_until='networkidle');q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
     assert q.locator('.waapiSampleCard').count()==47
     assert '13 ROOMS / 280 OBJECTS' in q.locator('.archiveMeta').inner_text()
     r['checks'].append('Inventory 280 exhibits / 13 rooms / 47 WAAPI')
     def button(root,name): return root.get_by_role('button',name=name,exact=True)
     def snap(o):
      return o.evaluate('''o=>{const h=o.querySelector('[data-timing-hero]'),a=h.getAnimations()[0] || window.__stage2bAnimations?.get(h),s=getComputedStyle(h),m=new DOMMatrixReadOnly(s.transform);return {time:Number(o.dataset.timingTime),input:Number(o.dataset.timingInput),result:o.dataset.timingResult,phase:o.dataset.timingPhase,controller:o.dataset.controller,native:a?.playState,nativeTime:a?.currentTime,transform:s.transform,x:m.m41,scale:m.a,opacity:Number(s.opacity),trails:h.querySelectorAll('i').length,reading:o.querySelector('[data-observation-reading]').textContent}}''')
     def settle(o):
      q.wait_for_function('(o)=>o.dataset.controller!=="inactive"',arg=o.element_handle())
      o.locator('[data-timing-hero]').evaluate('''async h=>{window.__stage2bAnimations ??= new WeakMap();const a=h.getAnimations()[0] || window.__stage2bAnimations.get(h);if(a){window.__stage2bAnimations.set(h,a);await a.ready;}}''')
     def seek(o,value):
      o.get_by_role('slider',name='観察時間（ms）').evaluate('''(n,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,String(v));n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));}''',value)
      settle(o);x=snap(o);assert abs(x['time']-value)<.02,x;return x
     for name in ['Perfect Parry','Dodge Afterimage']:
      dodge=name.startswith('Dodge')
      q.get_by_label('検索',exact=True).fill(name)
      c=q.locator('.waapiSampleCard').filter(has=q.get_by_role('heading',name=name,exact=True));c.scroll_into_view_if_needed()
      normal=c.locator('[data-normal-game]')
      button(normal,'ATTACK START' if dodge else 'ENEMY ATTACK').click();q.wait_for_timeout(470)
      button(normal,'DODGE RIGHT' if dodge else 'PARRY').click()
      live=normal.locator('output').inner_text();live_input=normal.locator('[data-live-input]').inner_text()
      elapsed=float(re.search(r'([\d.]+) ms',live_input).group(1));expected='EARLY' if elapsed<420 else 'LATE' if elapsed>680 else 'S-RANK' if dodge else 'PERFECT PARRY'
      assert expected in live,(elapsed,live)
      button(c,'観察モードを開く').click();o=c.locator('.waapiTimingObservation');o.scroll_into_view_if_needed();settle(o)
      assert live in c.locator('[data-held-game-state]').inner_text()
      for value,result in [(419,'EARLY'),(420,'PERFECT'),(680,'PERFECT'),(681,'LATE')]:
       o.get_by_role('spinbutton',name='シミュレーション入力時刻（ms）').fill(str(value));button(o,'この入力を確定').click();settle(o)
       assert snap(o)['result']==result
       for at in [0,value,value+210,value+420,1420,0]:
        x=seek(o,at);assert x['input']==value and x['result']==result,x
        assert abs(x['nativeTime']-max(0,min(420,at-value)))<.02,x
       r['checks'].append(f'{name}: {value}ms {result}; immutable result across before/input/middle/end/rewind')
      button(o,'観察Reset').click();settle(o)
      states=[seek(o,at) for at in [0,550,760,969.99,970,1420,760]]
      assert states[0]['phase']=='before-input' and states[1]['phase']=='effect-running' and states[4]['phase']=='effect-ended'
      assert abs(states[2]['x']-(66 if dodge else 0))<.1 and abs(states[2]['scale']-(1 if dodge else 1.22))<.01,states[2]
      assert abs(states[4]['x'])<.01 and abs(states[4]['scale']-1)<.01,states[4]
      assert states[2]['transform']==states[6]['transform']
      assert all(x['trails']==(3 if dodge else 0) for x in states)
      r['measurements'].append({'name':name,'liveInput':elapsed,'liveResult':live,'nativePositions':states})
      seek(o,0);button(o,'1ステップ進む').tap();settle(o);assert abs(snap(o)['time']-1000/60)<.02
      button(o,'1ステップ戻る').focus();assert button(o,'1ステップ戻る').evaluate('(n)=>n===document.activeElement');q.keyboard.press('Enter');settle(o);assert snap(o)['time']==0
      slider=o.get_by_role('slider',name='観察時間（ms）');slider.focus();q.keyboard.press('ArrowRight');assert snap(o)['time']>0
      seek(o,600);button(o,'再生 / 再開').click();q.wait_for_timeout(60);button(o,'一時停止').click();settle(o);paused=snap(o);assert 600<paused['time']<1420,paused
      q.wait_for_timeout(60);assert abs(snap(o)['time']-paused['time'])<.02
      button(o,'再生 / 再開').click();q.wait_for_timeout(60);button(o,'一時停止').click();assert snap(o)['time']>paused['time']
      button(o,'再生 / 再開').click();button(o,'観察Reset').click();q.wait_for_timeout(80);assert snap(o)['time']==0 and snap(o)['input']==550
      # Runtime preference change must stop playback while preserving manually inspectable frames.
      button(o,'再生 / 再開').click();context.set_default_timeout(10000);q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(80);settle(o)
      assert button(o,'再生 / 再開').is_disabled();held=snap(o)['time'];q.wait_for_timeout(50);assert snap(o)['time']==held
      button(o,'1ステップ進む').tap();assert snap(o)['time']>held
      q.emulate_media(reduced_motion='no-preference');settle(o);assert snap(o)['controller']=='paused'
      seek(o,600);button(o,'再生 / 再開').click()
      q.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
      q.wait_for_timeout(50);assert snap(o)['controller']=='inactive';assert o.locator('[data-timing-hero]').evaluate('(h)=>h.getAnimations().length')==0
      q.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))");settle(o);assert snap(o)['controller']=='paused'
      # Actual offscreen movement follows the gallery IntersectionObserver contract.
      seek(o,600);button(o,'再生 / 再開').click();q.evaluate('window.scrollTo(0,0)')
      q.wait_for_function('(o)=>o.dataset.controller==="inactive"',arg=o.element_handle())
      assert o.locator('[data-timing-hero]').evaluate('(h)=>h.getAnimations().length')==0
      o.scroll_into_view_if_needed();settle(o);assert snap(o)['controller']=='paused'
      # Scope overflow to page and observation. Capture the timeline, with no public upload.
      o.scroll_into_view_if_needed();geometry=q.evaluate('()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth})');assert geometry['scroll']<=width,geometry
      assert o.evaluate('(n)=>n.scrollWidth<=n.clientWidth+1')
      o.screenshot(path=str(DEST/f'{engine}-{width}-{name.split()[0]}.png'))
      old=o.locator('[data-timing-hero]').element_handle();button(c,'通常モードへ戻る').click();assert old.evaluate('(n)=>n.getAnimations().length')==0
      assert normal.locator('output').inner_text()==live and normal.locator('[data-live-input]').inner_text()==live_input
      # Pending attack explicitly interrupts on mode transition, never gets replayed by seek.
      button(normal,'ATTACK START' if dodge else 'ENEMY ATTACK').click();button(c,'観察モードを開く').click();assert 'INTERRUPTED' in c.locator('[data-held-game-state]').inner_text()
      o=c.locator('.waapiTimingObservation');settle(o);button(o,'再生 / 再開').click();old=o.locator('[data-timing-hero]').element_handle()
      q.get_by_role('button',name='サンプル一覧を閉じる',exact=False).click();assert old.evaluate('(n)=>n.getAnimations().length')==0
      q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
      r['checks'].append(f'{name}: native geometry, play/pause/resume, tap/keyboard/focus/slider, Reset, preference switch, synthetic hidden, actual offscreen, mode/gallery teardown, live-state preservation, no horizontal overflow')
     assert not r['pageerrors'],r['pageerrors'];r['status']='PASS'
    except Exception as e:
     r['status']='FAIL';r['error']=str(e);r['traceback']=traceback.format_exc()
    finally:
     if browser: browser.close()
     save()
finally:
 server.terminate();server.wait(timeout=10)
 report['finished']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
print(json.dumps({'evidence':str(DEST/'results.json'),'results':[{k:r[k] for k in ['engine','width','status']} for r in report['results']]},ensure_ascii=False))
raise SystemExit(0 if all(r['status']=='PASS' for r in report['results']) else 1)
