import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.webkit.launch(headless=True,executable_path='/tmp/loading-native/webkit/pw_run.sh');q=b.new_page(viewport={'width':390,'height':900});q.goto('http://127.0.0.1:4201/Loading-museum/');q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill('Menu Selection Cursor');c=q.locator('.waapiSampleCard');c.get_by_role('button',name='観察モードを開く',exact=True).click();o=c.locator('.waapiObservation');o.scroll_into_view_if_needed();results=[]
 for i in range(4):
  o.get_by_role('button',name='観察位置を先頭へ',exact=True).click();o.locator('[data-observation-target]').evaluate('async t=>await t.getAnimations()[0].ready')
  x=o.evaluate('''async n=>{const b=t=>[...n.querySelectorAll('button')].find(b=>b.textContent===t);b('再生 / 再開').click();const a=n.querySelector('[data-observation-target]').getAnimations()[0];const started=performance.now();while(!(a.currentTime>0)&&performance.now()-started<1000)await new Promise(r=>setTimeout(r,1));const before={time:a.currentTime,clock:performance.now(),native:a.playState,pending:a.pending};b('一時停止').click();const immediate={time:a.currentTime,clock:performance.now(),native:a.playState,pending:a.pending};await a.ready;return {before,immediate,settled:{time:a.currentTime,clock:performance.now(),native:a.playState,pending:a.pending},display:n.querySelector('[data-observation-reading]').textContent};}''');results.append(x)
 print(json.dumps(results,ensure_ascii=False,indent=2));b.close()
