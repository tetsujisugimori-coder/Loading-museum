"""Read-only local static-export DOM regression. Requires installed Python Playwright/browsers.
Start a server exposing out/ at /Loading-museum/, then run with WAAPI_URL as needed.
No install, publication, screenshot or trace is performed by default.
"""
import json, os, traceback, re
from playwright.sync_api import sync_playwright
URL=os.environ.get('WAAPI_URL','http://127.0.0.1:4183/Loading-museum/')
def category_coverage_valid(option_count, expected, executed=None):
 return expected>0 and option_count==expected+1 and (executed is None or executed==expected)
category_controls=[
 {'name':'complete category coverage','pass':category_coverage_valid(9,8,8)},
 {'name':'empty locator rejected','pass':not category_coverage_valid(0,8,0)},
 {'name':'empty expected set rejected','pass':not category_coverage_valid(1,0,0)},
 {'name':'unexecuted category rejected','pass':not category_coverage_valid(9,8,0)}]
assert all(x['pass'] for x in category_controls)
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
    category_label=page.locator('.waapiFilters label').filter(has_text=re.compile('^カテゴリ'))
    assert category_label.count()==1
    assert category_label.evaluate('n=>[...n.childNodes].filter(x=>x.nodeType===Node.TEXT_NODE).map(x=>x.textContent).join("").trim()')=='カテゴリ'
    category=category_label.locator('select')
    category_options=category.locator('option').all()
    expected_categories=page.locator('.waapiCategoryCounts li').count()
    assert category_coverage_valid(len(category_options),expected_categories)
    category_checked=0
    for option in category_options:
     value=option.get_attribute('value')
     if not value:continue
     expected=next(int(li.locator('b').inner_text()) for li in page.locator('.waapiCategoryCounts li').all() if li.locator('span').inner_text()==value)
     category.select_option(value);assert cards.count()==expected;category_checked+=1
    assert category_coverage_valid(len(category_options),expected_categories,category_checked)
    page.get_by_role('button',name='絞り込みを解除',exact=True).click()
    page.get_by_label('検索',exact=True).fill('no-such-specimen');assert cards.count()==0
    page.get_by_label('検索',exact=True).fill('Match-3');assert cards.count()==1
    assert '197 OBJECTS' in page.locator('.archiveMeta').inner_text()
    page.get_by_role('button',name='絞り込みを解除',exact=True).click();assert cards.count()==47;checks.append('catalog/categories/search')
    def card(name): return cards.filter(has=page.get_by_role('heading',name=name,exact=True))
    m=card('Match-3 Cascade'); cells=m.locator('.matchBoard button'); initial=cells.all_text_contents()
    for a,b,outcome in [(2,3,'NOT ADJACENT'),(0,4,'NOT ADJACENT'),(0,1,'NO MATCH'),(4,5,'MATCH 3'),(8,11,'MATCH 8')]:
     m.get_by_role('button',name='RESET',exact=True).click();cells.nth(a).click();cells.nth(b).click();m.get_by_role('button',name='SWAP',exact=True).click()
     text=m.locator('output').inner_text();assert outcome in text,text
     if outcome in ['NOT ADJACENT','NO MATCH']:assert cells.all_text_contents()==initial;assert 'SCORE 0' in text
     else:
      empty=m.locator('.matchBoard button:disabled').count();assert empty>=3;assert f'SCORE {empty*100}' in text;assert cells.all_text_contents()!=initial
    m.get_by_role('button',name='RESET',exact=True).click();assert cells.all_text_contents()==initial
    cells.nth(8).drag_to(cells.nth(11));assert m.locator('.matchBoard button:disabled').count()>=3
    assert 'CASCADE ×2' in m.locator('output').inner_text();assert 'SCORE 800' in m.locator('output').inner_text()
    m.get_by_role('button',name='RESET',exact=True).click();checks.append('match adjacency/score/reset/real drag')
    # Native WAAPI trace: pause actual animations to inspect exchange, erase, fall, next erase.
    cells.nth(8).click();cells.nth(11).click();m.get_by_role('button',name='SWAP',exact=True).click()
    assert '1段目 5石 → 2段目 3石' in m.locator('.matchSteps').inner_text()
    motion=m.locator('.matchBoard').evaluate('''board=>{
      const animations=board.getAnimations({subtree:true});animations.forEach(a=>a.pause());
      const ghosts=[...board.querySelectorAll('[data-gem-token]')];
      const stages=[0,320,540,900,1120,1480].map(time=>{animations.forEach(a=>a.currentTime=time);return ghosts.map(n=>({id:Number(n.dataset.gemToken),opacity:Number(getComputedStyle(n).opacity),matrix:getComputedStyle(n).transform}));});
      animations.forEach(a=>a.currentTime=900); // mid-cascade, before the second erase
      return {count:animations.length,stages,buttonFont:getComputedStyle(board.querySelector("button")).font,ghostFont:getComputedStyle(ghosts[0]).font};
    }''')
    assert motion['count']==24,motion
    assert motion['buttonFont']==motion['ghostFont'],motion
    assert motion['stages'][0][8]['matrix']!=motion['stages'][1][8]['matrix'],'swapped stone did not move'
    assert sum(x['opacity']<.01 for x in motion['stages'][2])==5,motion
    assert any(a['matrix']!=b['matrix'] for a,b in zip(motion['stages'][2],motion['stages'][3])),'survivors did not fall'
    assert sum(x['opacity']<.01 for x in motion['stages'][4])==8,motion
    assert cells.all_text_contents()==['·','·','·','·','◆','·','·','◆','·','·','●','◆']
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("[...document.querySelectorAll('.matchBoard')].every(n=>n.getAnimations({subtree:true}).length===0)")
    assert 'SCORE 800' in m.locator('output').inner_text()
    m.get_by_role('button',name='RESET',exact=True).click();page.wait_for_timeout(1600);assert cells.all_text_contents()==initial
    page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(80)
    # Keyboard starts a new ordinary replay, then Reset interrupts it.
    cells.nth(8).focus();page.keyboard.press('Enter');cells.nth(11).focus();page.keyboard.press('Enter');m.get_by_role('button',name='SWAP',exact=True).focus();page.keyboard.press('Enter')
    assert m.locator('.matchBoard').evaluate('(n)=>n.getAnimations({subtree:true}).length')>0
    m.get_by_role('button',name='RESET',exact=True).click();page.wait_for_timeout(1600);assert cells.all_text_contents()==initial
    assert 'SCORE 0' in m.locator('output').inner_text();checks.append('native trace swap/5 erase/fall/3 erase; runtime reduce; keyboard; reset interruption')
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
     # Preserve the delay-expiry wait above, then await actual CSS convergence rather than
     # assuming the compositor has painted its final frame at a fixed wall-clock instant.
     hp.locator('.gameHp > div').evaluate('(x)=>x.dataset.hpProbe = "active"')
     page.wait_for_function('(value)=>{const x=document.querySelector("[data-hp-probe=active]");return x && [...x.children].every(n=>n.style.width===`${value}%` && Math.abs(n.getBoundingClientRect().width/x.clientWidth*100-value)<1)}',arg=value,timeout=3000)
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
    # Freeze newly created native WAAPI effects at their real start so a slow remote
    # driver cannot miss a 320ms effect before the mid-flight media switch.
    page.evaluate('''()=>{const original=Element.prototype.animate;Element.prototype.animate=function(...args){const a=original.apply(this,args);const c=this.closest('[data-pause-probe]');if(c){a.pause();(c.probeAnimations??=[]).push(a);}return a;};}''')
    for c,action,reset in [(f,'DROP','RESET'),(eq,'EQUIP','RESET'),(lock,'NEXT TARGET','RESET')]:
     c.evaluate('(n)=>{n.dataset.pauseProbe="active";n.probeAnimations=[]}')
     c.get_by_role('button',name=reset,exact=True).click();page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(80)
     c.get_by_role('button',name=action,exact=True).click()
     assert c.evaluate('(n)=>{const a=n.probeAnimations;a.forEach(x=>x.currentTime=Number(x.effect.getTiming().duration)/2);return a.length}')>0
     expected=c.locator('output').inner_text()
     page.emulate_media(reduced_motion='reduce')
     page.wait_for_function('()=>{const n=document.querySelector("[data-pause-probe]");return n && n.probeAnimations.length>0 && n.probeAnimations.every(a=>a.playState==="idle")}',timeout=3000)
     remaining=c.evaluate('(n)=>n.probeAnimations.filter(a=>a.playState!=="idle").map(a=>({type:a.constructor.name,state:a.playState,time:a.currentTime,target:a.effect.target.className,keyframes:a.effect.getKeyframes()}))')
     assert not remaining,(action,remaining)
     assert c.locator('output').inner_text()==expected
     page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(100);c.scroll_into_view_if_needed();page.wait_for_timeout(100)
     assert c.locator('output').inner_text()==expected
     c.get_by_role('button',name=reset,exact=True).click();page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(80)
     c.evaluate('(n)=>n.probeAnimations=[]');c.get_by_role('button',name=action,exact=True).click();assert c.evaluate('(n)=>n.probeAnimations.some(a=>a.playState==="paused")')
     c.get_by_role('button',name=reset,exact=True).click();assert c.evaluate('(n)=>n.probeAnimations.every(a=>a.playState==="idle")');c.evaluate('(n)=>delete n.dataset.pauseProbe')
    hp.get_by_role('button',name='Damage',exact=True).click();page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(500);hpcheck(48)
    hp.get_by_role('button',name='Reset',exact=True).click();page.wait_for_timeout(850);hpcheck(72)
    page.emulate_media(reduced_motion='no-preference');checks.append('five targets retain logical state on runtime media change and resume next action')
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
    results.append({'browser':kind,'version':browser.version,'width':width,'status':'PARTIAL' if warnings else 'PASS','checks':checks,'categoryPredicateControls':category_controls,'categoryExpected':expected_categories,'categoryExecuted':category_checked,'warnings':warnings,'pageErrors':errors})
   except Exception as e:results.append({'browser':kind,'version':browser.version,'width':width,'status':'FAIL','checks':checks,'error':str(e),'traceback':traceback.format_exc(),'pageErrors':errors})
   context.close()
  browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
if any(r['status']=='FAIL' for r in results):raise SystemExit(1)

if any(r['status']=='PARTIAL' for r in results):raise SystemExit(2)
if any(r['status']=='UNVERIFIED' for r in results):raise SystemExit(3)
