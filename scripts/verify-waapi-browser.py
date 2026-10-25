"""Read-only local static-export DOM regression. Requires installed Python Playwright/browsers.
Start a server exposing out/ at /Loading-museum/, then run with WAAPI_URL as needed.
No install, publication, screenshot or trace is performed by default.
"""
import json, os, traceback
from playwright.sync_api import sync_playwright
URL=os.environ.get('WAAPI_URL','http://127.0.0.1:4183/Loading-museum/')
results=[]
with sync_playwright() as p:
 for kind in os.environ.get('WAAPI_BROWSERS','chromium,webkit').split(','):
  path=os.environ.get('WAAPI_'+kind.upper()+'_PATH')
  try: browser=getattr(p,kind).launch(headless=True,**({'executable_path':path} if path else {}))
  except Exception as e:
   results.append({'browser':kind,'status':'UNVERIFIED','error':str(e)});continue
  for width in map(int, os.environ.get('WAAPI_WIDTHS','765,375,390').split(',')):
   context=browser.new_context(viewport={'width':width,'height':757})
   page=context.new_page(); page.set_default_timeout(10000); errors=[]; page.on('pageerror',lambda e:errors.append(str(e))); checks=[]
   try:
    page.goto(URL,wait_until='networkidle'); page.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
    cards=page.locator('.waapiSampleCard')
    if cards.count()==0: cards=page.locator('article').filter(has=page.locator('.waapiCardHeading'))
    assert cards.count()==47, cards.count()
    assert '9 ROOMS / 197 OBJECTS' in page.locator('.archiveMeta').inner_text()
    assert sum(map(int,page.locator('.waapiCategoryCounts b').all_text_contents()))==47
    names=cards.locator('h4').all_text_contents();assert len(set(names))==47
    for option in page.get_by_label('カテゴリ',exact=True).locator('option').all():
     value=option.get_attribute('value')
     if not value:continue
     expected=next(int(li.locator('b').inner_text()) for li in page.locator('.waapiCategoryCounts li').all() if li.locator('span').inner_text()==value)
     page.get_by_label('カテゴリ',exact=True).select_option(value);assert cards.count()==expected
    page.get_by_role('button',name='絞り込みを解除',exact=True).click()
    page.get_by_label('検索',exact=True).fill('no-such-specimen');assert cards.count()==0
    page.get_by_label('検索',exact=True).fill('Match-3');assert cards.count()==1
    assert '197 OBJECTS' in page.locator('.archiveMeta').inner_text()
    page.get_by_role('button',name='絞り込みを解除',exact=True).click();assert cards.count()==47;checks.append('catalog/categories/search')
    def card(name): return cards.filter(has=page.get_by_role('heading',name=name,exact=True))
    m=card('Match-3 Cascade'); cells=m.locator('.matchBoard button'); initial=cells.all_text_contents()
    for a,b,outcome in [(2,3,'NOT ADJACENT'),(0,4,'NOT ADJACENT'),(0,1,'NO MATCH'),(0,3,'MATCH 3'),(1,2,'MATCH')]:
     m.get_by_role('button',name='RESET',exact=True).click();cells.nth(a).click();cells.nth(b).click();m.get_by_role('button',name='SWAP',exact=True).click()
     text=m.locator('output').inner_text();assert outcome in text,text
     if outcome in ['NOT ADJACENT','NO MATCH']:assert cells.all_text_contents()==initial;assert 'SCORE 0' in text
     else:
      empty=m.locator('.matchBoard button:disabled').count();assert empty>=3;assert f'SCORE {empty*100}' in text;assert cells.all_text_contents()!=initial
    m.get_by_role('button',name='RESET',exact=True).click();assert cells.all_text_contents()==initial
    cells.nth(0).drag_to(cells.nth(3));assert m.locator('.matchBoard button:disabled').count()>=3
    m.get_by_role('button',name='RESET',exact=True).click();checks.append('match adjacency/score/reset/drag')
    f=card('Falling Block Line Clear')
    state=lambda:f.locator('[data-cell]').evaluate_all('(xs)=>xs.map(x=>x.dataset.blockId||null)')
    initial_blocks=state()
    for _ in range(2):
     f.get_by_role('button',name='DROP',exact=True).click();page.wait_for_timeout(500);after=state();assert after!=initial_blocks
     assert after[16]=='d' and after[19]=='e' and 'f' not in after;assert 'COMPACT' in f.locator('output').inner_text()
     # Block d must occupy row4, not merely retain old coordinates with altered opacity.
     d=f.locator('[data-block-id="d"]').bounding_box(); last=f.locator('[data-cell="19"]').bounding_box();assert abs(d['y']-last['y'])<1
     board_rect=f.locator('.blockBoard').bounding_box(); output_rect=f.locator('output').bounding_box();assert board_rect['y']+board_rect['height']<=output_rect['y'], 'result obscures bottom row'
     f.get_by_role('button',name='RESET',exact=True).click();assert state()==initial_blocks
    checks.append('falling board/compaction/reset')
    hp=card('HP Bar Damage / Heal')
    def hpcheck(value):
     assert f'{value} / 100 HP'==hp.locator('output').inner_text()
     values=hp.locator('.gameHp > div').evaluate('(x)=>[...x.children].map(n=>({style:n.style.width,actual:n.getBoundingClientRect().width/x.clientWidth*100}))')
     assert all(v['style']==f'{value}%' and abs(v['actual']-value)<1 for v in values),values
    hp.get_by_role('button',name='Damage',exact=True).click();hp.get_by_role('button',name='Reset',exact=True).click();page.wait_for_timeout(850);hpcheck(72)
    for _ in range(3):hp.get_by_role('button',name='Damage',exact=True).click()
    page.wait_for_timeout(850);hpcheck(0)
    for _ in range(3):hp.get_by_role('button',name='Reset',exact=True).click()
    page.wait_for_timeout(850);hpcheck(72);checks.append('hp immediate/repeated reset and damage')
    eq=card('Inventory Equip Snap')
    for _ in range(2):
     eq.get_by_role('button',name='EQUIP',exact=True).click();page.wait_for_timeout(500)
     page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(150);eq.scroll_into_view_if_needed();page.wait_for_timeout(150)
     assert eq.locator('.gameEquip > button').count()==0;assert 'IRON BLADE' in eq.locator('.equipSlot').inner_text();assert '24 (+12)' in eq.locator('output').inner_text()
     eq.get_by_role('button',name='UNEQUIP',exact=True).click();assert eq.locator('.gameEquip > button').count()==1;assert '12 (+0)' in eq.locator('output').inner_text()
    eq.get_by_role('button',name='EQUIP',exact=True).focus();page.keyboard.press('Enter');assert eq.locator('.gameEquip > button').count()==0
    eq.get_by_role('button',name='RESET',exact=True).click();assert eq.locator('.gameEquip > button').count()==1;checks.append('equip scroll/unequip/reset/keyboard')
    lock=card('Lock-on Reticle')
    def lockcheck(name):
     page.wait_for_timeout(380);target=lock.locator('.isLocked');assert target.get_attribute('aria-label')==name
     a=target.bounding_box();b=lock.locator('.lockReticle').bounding_box();assert abs(a['x']+a['width']/2-b['x']-b['width']/2)<2 and abs(a['y']+a['height']/2-b['y']-b['height']/2)<2,(a,b)
     assert name in lock.locator('output').inner_text()
    lock.scroll_into_view_if_needed();lockcheck('SCOUT')
    for name in ['WARDEN','DRONE','SCOUT']:lock.get_by_role('button',name='NEXT TARGET',exact=True).click();lockcheck(name)
    lock.locator('.gameLock').focus();page.keyboard.press('ArrowLeft');lockcheck('DRONE')
    lock.get_by_role('button',name='RESET',exact=True).click();lockcheck('SCOUT');checks.append('lock geometry/keyboard/reset')
    # Text-only enlargement of all current UI controls and explanatory text (not viewport emulation).
    for theme in ['light','dark']:
     page.emulate_media(color_scheme=theme)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))})')
    page.evaluate('''()=>{for(const e of document.querySelectorAll('button,input,select,label,h1,h2,h3,h4,p,output')) { e.dataset.oldFont=getComputedStyle(e).fontSize; } for(const e of document.querySelectorAll('[data-old-font]')) e.style.fontSize=(parseFloat(e.dataset.oldFont)*2)+'px';}''')
    lockcheck('SCOUT')
    for name in ['Match-3 Cascade','Falling Block Line Clear','HP Bar Damage / Heal','Inventory Equip Snap','Lock-on Reticle']:
     c=card(name);c.scroll_into_view_if_needed();assert c.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),name+' overflow at text200%'
    checks.append('light/dark media and text200% target overflow')
    layout=page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
    warnings=[] if layout['scrollWidth']<=layout['width']+1 else [{'wholePageText200Overflow':layout}]
    # Preserve this failure as PARTIAL; target cards passed but this is not a whole-site PASS.
    assert not errors,errors
    results.append({'browser':kind,'version':browser.version,'width':width,'status':'PARTIAL' if warnings else 'PASS','checks':checks,'warnings':warnings,'pageErrors':errors})
   except Exception as e:results.append({'browser':kind,'version':browser.version,'width':width,'status':'FAIL','checks':checks,'error':str(e),'traceback':traceback.format_exc(),'pageErrors':errors})
   context.close()
  browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
if any(r['status']=='FAIL' for r in results):raise SystemExit(1)

if any(r['status']=='PARTIAL' for r in results):raise SystemExit(2)
if any(r['status']=='UNVERIFIED' for r in results):raise SystemExit(3)
