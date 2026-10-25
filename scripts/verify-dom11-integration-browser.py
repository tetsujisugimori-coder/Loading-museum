"""Read-only DOM11 browser checks against an already-served local static export.
Requires Python Playwright and browsers. No install, build, publication, screenshots or trace.
Text enlargement is CSS-only, not OS text scaling or browser zoom.
"""
import json, os, traceback
from playwright.sync_api import sync_playwright
URL=os.environ.get('WAAPI_URL','http://127.0.0.1:4184/Loading-museum/')
results=[]
with sync_playwright() as p:
 for kind in os.environ.get('WAAPI_BROWSERS','chromium,webkit').split(','):
  path=os.environ.get('WAAPI_'+kind.upper()+'_PATH')
  try: browser=getattr(p,kind).launch(headless=True,**({'executable_path':path} if path else {}))
  except Exception as e:
   results.append({'browser':kind,'status':'UNVERIFIED','error':str(e)});continue
  for width in map(int,os.environ.get('WAAPI_WIDTHS','765,375,390').split(',')):
   context=browser.new_context(viewport={'width':width,'height':900})
   page=context.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));checks=[]
   try:
    page.goto(URL,wait_until='networkidle')
    toggle=page.get_by_role('button',name='ROOM / DOM-ANIMATION',exact=False)
    toggle.focus();page.keyboard.press('Enter')
    assert toggle.get_attribute('aria-expanded')=='true'
    cards=page.locator('.domOperation');assert cards.count()==17
    names=cards.locator('h4').all_text_contents();ids=cards.locator('.domOperationResult').evaluate_all('(xs)=>xs.map(x=>x.id)')
    assert len(set(ids))==17 and ids[10]=='operation-11-query-selector-all-result'
    assert ids[-1]=='operation-17-scroll-and-rect-result'
    checks.append('keyboard open; 17 DOM cards and ordered identity')
    card=cards.filter(has=page.get_by_role('heading',name='11. querySelectorAll でまとめて操作',exact=True))
    stage=card.locator('.domOperationStage');play=card.get_by_role('button',name='再生',exact=True);reset=card.get_by_role('button',name='リセット',exact=True)
    assert stage.locator('li').count()==0
    def selected():
     assert stage.locator('li').all_text_contents()==['P1','P2','P3','P4','P5','P6']
     assert stage.locator('.is-marked').all_text_contents()==['P2','P4','P6']
     assert stage.locator('li:not(.is-marked)').all_text_contents()==['P1','P3','P5']
     styles=stage.locator('li').evaluate_all('(xs)=>xs.map(x=>({text:x.textContent,bg:getComputedStyle(x).backgroundColor,color:getComputedStyle(x).color}))')
     assert styles[0]['bg']==styles[2]['bg']==styles[4]['bg']
     assert styles[1]['bg']==styles[3]['bg']==styles[5]['bg']
     assert styles[0]['bg']!=styles[1]['bg'],styles
     assert '偶数番号 P2/P4/P6' in card.locator('.domOperationResult').inner_text()
     return styles
    play.click();styles=selected();checks.append('initial click: actual even highlight and odd non-highlight; result text')
    reset.click();assert stage.locator('li').count()==0;assert 'リセットしました' in card.locator('.domOperationResult').inner_text()
    for _ in range(3):play.click();selected()
    checks.append('reset removes selection; 3 repeated plays retain 6 nodes/even set')
    reset.focus();page.keyboard.press('Space');assert stage.locator('li').count()==0
    play.focus();page.keyboard.press('Enter');selected()
    reset.focus();page.keyboard.press('Enter');assert stage.locator('li').count()==0
    play.focus();page.keyboard.press('Space');selected();checks.append('keyboard Enter/Space play/reset')
    # Apply the displayed educational example to its actual DOM, not a copied predicate.
    result=card.evaluate('''n=>{const scene=n.querySelector('ul');scene.querySelectorAll('li').forEach(x=>x.classList.remove('is-marked'));new Function('scene',n.querySelector('code').textContent)(scene);return [...scene.querySelectorAll('.is-marked')].map(x=>x.textContent);}''')
    assert result==['P2','P4','P6'];selected();checks.append('displayed code example applied to actual DOM')
    for theme in ['light','dark']:
     page.emulate_media(color_scheme=theme);selected()
    # Double each selected element's original computed size, without compounding inherited fonts.
    card.evaluate('''n=>{const xs=[n,...n.querySelectorAll('*')];const sizes=xs.map(x=>getComputedStyle(x).fontSize);xs.forEach((x,i)=>x.style.fontSize=(parseFloat(sizes[i])*2)+'px');}''')
    selected();card.scroll_into_view_if_needed()
    layout=card.evaluate('(n)=>({width:n.clientWidth,scroll:n.scrollWidth,viewport:innerWidth,right:n.getBoundingClientRect().right})')
    assert layout['scroll']<=layout['width']+1,layout
    assert layout['right']<=width+1,layout
    checks.append('light/dark; CSS text 200% target card no horizontal overflow')
    assert not errors,errors
    results.append({'browser':kind,'version':browser.version,'width':width,'height':900,'status':'PASS','checks':checks,'styles':styles,'layout':layout,'domIds':ids,'domNames':names,'pageErrors':errors})
   except Exception as e:results.append({'browser':kind,'version':browser.version,'width':width,'status':'FAIL','checks':checks,'error':str(e),'traceback':traceback.format_exc(),'pageErrors':errors})
   context.close()
  browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
if any(r['status']=='FAIL' for r in results):raise SystemExit(1)
if any(r['status']=='UNVERIFIED' for r in results):raise SystemExit(3)
