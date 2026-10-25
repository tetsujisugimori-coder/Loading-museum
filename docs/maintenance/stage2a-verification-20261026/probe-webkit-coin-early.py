"""Early natural-pause supplement; no seek-derived start time, native ready/rAF timing.
Only 0 < input <= 20% duration qualifies as early. Other inputs remain measured misses.
"""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
results=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True,executable_path=os.environ['WAAPI_WEBKIT_PATH']);q=b.new_page(viewport={'width':int(os.environ.get('EARLY_WIDTH','390')),'height':900});q.goto(os.environ['WAAPI_URL']);q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill(os.environ.get('EARLY_TARGET','Coin Pickup Arc'));c=q.locator('.waapiSampleCard');c.get_by_role('button',name='観察モードを開く',exact=True).click();o=c.locator('.waapiObservation');o.scroll_into_view_if_needed()
 for i in range(6):
  o.get_by_role('button',name='観察位置を先頭へ',exact=True).click();o.locator('[data-observation-target]').evaluate('async t=>await t.getAnimations()[0].ready')
  x=o.evaluate('''async n=>{const button=t=>[...n.querySelectorAll('button')].find(b=>b.textContent===t),snap=a=>({clock:performance.now(),time:a.currentTime,state:a.playState,pending:a.pending});button('再生 / 再開').click();const a=n.querySelector('[data-observation-target]').getAnimations()[0],start=snap(a);await a.ready;const readyPlay=snap(a),limit=performance.now()+1500;while(!(a.currentTime>0)&&performance.now()<limit)await new Promise(requestAnimationFrame);const input=snap(a);button('一時停止').click();const immediate=snap(a);await a.ready;const readyPause=snap(a);await new Promise(r=>setTimeout(r,100));return {duration:a.effect.getTiming().duration,start,readyPlay,input,immediate,readyPause,held:snap(a)}}''')
  x['target']=os.environ.get('EARLY_TARGET','Coin Pickup Arc');x['width']=int(os.environ.get('EARLY_WIDTH','390'));x['repeat']=i;x['earlyInput']=0<x['input']['time']<=x['duration']*.2;x['positionHeld']=abs(x['input']['time']-x['readyPause']['time'])<.1 and abs(x['readyPause']['time']-x['held']['time'])<.1;x['verdict']='PASS' if x['earlyInput'] and x['positionHeld'] else 'POSITION_FAILURE' if not x['positionHeld'] else 'EARLY_INPUT_MISSED';results.append(x);Path(os.environ['EARLY_OUT']).write_text(json.dumps(results,indent=2))
 b.close()
