"""Actual native IO callback and old Animation timeline; delegate callbacks unchanged."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True,executable_path=os.environ['WAAPI_WEBKIT_PATH'])
 for repeat in range(3):
  context=b.new_context(viewport={'width':390,'height':900},has_touch=True,reduced_motion='no-preference');q=context.new_page()
  q.add_init_script('''(()=>{window.__io=[];const Native=IntersectionObserver;window.IntersectionObserver=class extends Native{constructor(cb,opts){super((es,o)=>{window.__io.push({clock:performance.now(),entries:es.map(e=>({id:e.target.dataset.sampleId,intersecting:e.isIntersecting,top:e.boundingClientRect.top,bottom:e.boundingClientRect.bottom}))});cb(es,o)},opts)}}})()''')
  q.goto(os.environ['WAAPI_URL']);q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill('Menu Selection Cursor');c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed()
  def click(n):c.get_by_role('button',name=n,exact=True).click()
  click('↓ Down');click('観察モードを開く');click('通常モードへ戻る');q.wait_for_timeout(50)
  c.locator('[data-normal-game] .waapiPreviewStage').focus();q.keyboard.press('ArrowDown');click('↑ Up');q.wait_for_timeout(int(os.environ.get('IO_DELAY_MS','250')))
  x=c.evaluate('''async n=>{const a=n.querySelector('[data-normal-game]').getAnimations({subtree:true})[0],snapshot=label=>({label,clock:performance.now(),old:a?{time:a.currentTime,state:a.playState,pending:a.pending}:null,dom:n.querySelector('[data-normal-game]').getAnimations({subtree:true}).map(x=>({time:x.currentTime,state:x.playState,pending:x.pending})),selection:n.querySelector('.isSelected').textContent,io:window.__io.slice(-6)});const result=[snapshot('before scroll')];scrollTo(0,0);const start=performance.now();for(const t of [100,300,1000]){await new Promise(r=>setTimeout(r,Math.max(0,t-(performance.now()-start))));result.push(snapshot(t+'ms after scroll'))}return result}''')
  out.append({'repeat':repeat,'preScrollWaitMs':int(os.environ.get('IO_DELAY_MS','250')),'samples':x});Path(os.environ['IO_OUT']).write_text(json.dumps(out,ensure_ascii=False,indent=2));context.close()
 b.close()
