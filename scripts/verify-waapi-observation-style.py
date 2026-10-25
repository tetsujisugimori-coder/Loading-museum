"""Final CSS-only follow-up; distinct from the complete native observation run."""
import hashlib,json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=os.environ.get('WAAPI_RESULT','/tmp/observation-style.json')
results=[]
artifacts={str(p):hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in [Path('app/components/WaapiGameObservation.tsx'),Path('app/globals.css'),Path('out/index.html')]}
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=getattr(p,engine).launch(headless=True,executable_path=os.environ['WAAPI_'+engine.upper()+'_PATH'])
  for width in [375,390,765]:
   context=b.new_context(viewport={'width':width,'height':900},has_touch=True,reduced_motion='no-preference');q=context.new_page();q.set_default_timeout(10000)
   r={'engine':engine,'version':b.version,'width':width,'artifactSHA256':artifacts,'checks':[],'measurements':[],'pageErrors':[]};results.append(r);q.on('pageerror',lambda e:r['pageErrors'].append(str(e)))
   try:
    q.goto(os.environ.get('WAAPI_URL','http://127.0.0.1:4201/Loading-museum/'),wait_until='networkidle');q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
    for name in ['Menu Selection Cursor','Coin Pickup Arc']:
     q.get_by_label('検索',exact=True).fill(name);c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed();normal=c.locator('[data-normal-game]')
     if name.startswith('Menu'):
      c.get_by_role('button',name='↓ Down',exact=True).click();assert 'COLLECTION' in normal.locator('.isSelected').inner_text()
     else:
      c.get_by_role('button',name='Reset',exact=True).click();assert normal.locator('output').inner_text()=='SCORE 0'
     toggle=c.locator('.waapiObservationToggle');toggle.focus();q.keyboard.press('Shift+Tab');q.keyboard.press('Tab');g=toggle.evaluate('n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {height:r.height,width:r.width,outline:s.outline,outlineWidth:parseFloat(s.outlineWidth),color:s.color,background:s.backgroundColor,focused:document.activeElement===n,focusVisible:n.matches(":focus-visible")}}')
     assert g['height']>=40 and g['outlineWidth']>0 and g['focused'],g
     q.keyboard.press('Space');o=c.locator('.waapiObservation');q.wait_for_function('(n)=>n.dataset.controller!=="inactive"',arg=o.element_handle());assert toggle.get_attribute('aria-pressed')=='true'
     step=o.get_by_role('button',name='1ステップ進む',exact=True);step.focus();q.keyboard.press('Enter')
     q.wait_for_function('(n)=>{const a=n.querySelector("[data-observation-target]").getAnimations()[0];return a && !a.pending && Math.abs(a.currentTime-1000/60)<.1}',arg=o.element_handle())
     toggle.focus();q.keyboard.press('Space');assert toggle.get_attribute('aria-pressed')=='false'
     if name.startswith('Menu'):assert 'COLLECTION' in normal.locator('.isSelected').inner_text()
     else:assert normal.locator('output').inner_text()=='SCORE 0'
     toggle.tap();o=c.locator('.waapiObservation');o.scroll_into_view_if_needed()
     c.evaluate('n=>{const es=[...n.querySelectorAll("*")],sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]*2+"px")}')
     for theme in ['light','dark']:
      q.emulate_media(color_scheme=theme);assert o.evaluate('n=>n.scrollWidth<=n.clientWidth+1')
     g200=toggle.bounding_box();assert g200['height']>=40,g200
     r['measurements'].append({'name':name,'toggle':g,'text200Toggle':g200,'observationSize':o.evaluate('n=>({client:n.clientWidth,scroll:n.scrollWidth})')})
     r['checks'].append(name+': toggle >=40px/focus/keyboard Space mode toggle/Enter step/native time/normal state preserved/touch toggle/CSS200/both media no observation overflow')
     if (engine,width,name) in [('chromium',375,'Coin Pickup Arc'),('webkit',390,'Menu Selection Cursor')]:
      folder=Path(os.environ.get('WAAPI_SCREENSHOTS','/tmp/loading-observe-style-shots'));folder.mkdir(parents=True,exist_ok=True);c.screenshot(path=str(folder/f'{engine}-{width}-{name.split()[0]}-text200.png'))
    assert not r['pageErrors'];r['status']='PASS'
   except Exception as e:r['status']='FAIL';r['failure']=str(e);r['traceback']=traceback.format_exc()
   finally:
    Path(OUT).write_text(json.dumps(results,ensure_ascii=False,indent=2));print(engine,width,r['status'],r.get('failure',''),flush=True);context.close()
  b.close()
raise SystemExit(0 if all(r['status']=='PASS' for r in results) else 1)
