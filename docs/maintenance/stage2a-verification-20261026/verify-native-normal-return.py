"""Native normal-mode return checks. Synthetic visibilitychange is NOT OS backgrounding.
No Animation mock, product edits, publication, or score injection.
"""
import json, os, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT = Path(os.environ['VERIFY_NORMAL_OUT'])
results = []
def save(): OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2))
with sync_playwright() as p:
 for engine in ['chromium', 'webkit']:
  browser = getattr(p, engine).launch(headless=True, executable_path=os.environ['WAAPI_'+engine.upper()+'_PATH'])
  for name in ['Menu Selection Cursor', 'Coin Pickup Arc']:
   context = browser.new_context(viewport={'width':390,'height':900}, has_touch=True, reduced_motion='no-preference')
   page = context.new_page(); page.set_default_timeout(10000)
   r = {'engine':engine,'version':browser.version,'width':390,'name':name,'checks':[],'snapshots':[],'errors':[],'status':'RUNNING'}
   results.append(r); page.on('pageerror', lambda e, r=r: r['errors'].append(str(e)))
   try:
    page.goto(os.environ['WAAPI_URL'])
    page.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
    page.get_by_label('検索',exact=True).fill(name)
    card = page.locator('.waapiSampleCard'); card.scroll_into_view_if_needed()
    def click(label): card.get_by_role('button',name=label,exact=True).click()
    def snap(label):
     x=card.locator('[data-normal-game]').evaluate('''n=>({clock:performance.now(),hidden:n.hidden,selection:n.querySelector('.isSelected')?.textContent,score:n.querySelector('output')?.textContent,animations:n.getAnimations({subtree:true}).map(a=>({time:a.currentTime,state:a.playState,pending:a.pending}))})''')
     x['label']=label;r['snapshots'].append(x);save();return x
    def check(label, condition):
     r['checks'].append({'label':label,'pass':bool(condition)});save()
     assert condition,label
    menu=name.startswith('Menu')
    click('↓ Down' if menu else 'COLLECT')
    held='COLLECTION' if menu else 'SCORE 100'
    def retained(x):return held in (x.get('selection') or '') if menu else x.get('score')==held
    check('initial explicit state',retained(snap('explicit state')))
    click('観察モードを開く');click('通常モードへ戻る')
    page.wait_for_timeout(50);x=snap('mode return')
    check('mode return retains state',retained(x));check('mode return does not autoplay',not x['animations'])
    if menu:
     card.locator('[data-normal-game] .waapiPreviewStage').focus();page.keyboard.press('ArrowDown')
     x=snap('keyboard after observation');check('normal keyboard works','SETTINGS' in x['selection'])
     click('↑ Up');page.wait_for_timeout(250)
    else:
     click('Replay');x=snap('explicit Replay after observation')
     check('Replay retains score',retained(x));check('Replay creates native animation',len(x['animations'])>0)
    # Actual viewport scrolling; require the card to be beyond the IO 160px root margin.
    page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(100)
    outside=card.evaluate('n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight,outside:r.top>innerHeight+160||r.bottom< -160}}')
    r['outsideGeometry']=outside;check('offscreen condition actually reached',outside['outside'])
    x=snap('offscreen');check('offscreen cancels normal animation',not x['animations'])
    card.scroll_into_view_if_needed();page.wait_for_timeout(100);x=snap('offscreen return')
    check('reentry retains state',retained(x));check('reentry after observation does not autoplay',not x['animations'])
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(30)
    page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(30);x=snap('synthetic visibility return')
    check('synthetic visibility retains state',retained(x));check('synthetic visibility no spontaneous animation',not x['animations'])
    click('Reset');x=snap('Reset after observation')
    check('Reset restores initial state',('CONTINUE' in x['selection']) if menu else x['score']=='SCORE 0')
    check('Reset does not spontaneously replay',not x['animations'])
    if not menu:
     click('COLLECT');x=snap('COLLECT after Reset')
     check('COLLECT rearmed by Reset',x['score']=='SCORE 100')
     check('COLLECT disabled after acquisition',card.get_by_role('button',name='COLLECT',exact=True).is_disabled())
    page.get_by_role('button',name='サンプル一覧を閉じる',exact=False).click()
    check('gallery actually unmounted',page.locator('.waapiSampleCard').count()==0)
    page.get_by_role('button',name='サンプル一覧を見る',exact=False).click();card.scroll_into_view_if_needed()
    x=snap('gallery reopen')
    check('gallery reopen reinitializes state',('CONTINUE' in x['selection']) if menu else x['score']=='SCORE 0')
    # Finite entry motion may already have completed during browser-driver latency.
    # Do not infer autoplay success/failure solely from its absence at this late sample.
    r['reopenAutoplay']='not judged: snapshot may follow finite animation completion'
    check('no pageerror',not r['errors']);r['status']='PASS'
   except Exception as e:
    r.update(status='FAILED',error=str(e),traceback=traceback.format_exc())
    screenshot=OUT.parent/(engine+'-normal-return-'+('menu' if name.startswith('Menu') else 'coin')+'-failure.png')
    page.screenshot(path=str(screenshot),full_page=True);r['screenshot']=str(screenshot)
   finally:save();context.close()
  browser.close()
