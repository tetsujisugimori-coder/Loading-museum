"""Stage 2A acceptance: native target-card layout, real input and Turn Order.
CSS text expansion/media emulation are not physical OS/device accessibility tests.
"""
import json,os,datetime,traceback
from playwright.sync_api import sync_playwright
OUT=os.environ['WAAPI_RESULT'];results=[]
names=['Menu Selection Cursor','Coin Pickup Arc','Match-3 Cascade','HP Bar Damage / Heal','Turn Order Reflow','Battle Transition']
geometry="""n=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const bounds=rect(n);const es=[...n.querySelectorAll('h4,p,output,label,button')].filter(e=>!e.closest('details:not([open])'));const elements=es.map(e=>{const cs=getComputedStyle(e),box=rect(e),range=document.createRange();range.selectNodeContents(e);const textRects=[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));const clips=[];for(let a=e;a;a=a.parentElement){const st=getComputedStyle(a);if(['hidden','clip','auto','scroll'].includes(st.overflowY))clips.push(rect(a));if(a===n)break;}return {clips,overflowY:cs.overflowY,tag:e.tagName,text:e.textContent,box,scroll:e.scrollWidth,client:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,visible:e.getClientRects().length>0&&cs.visibility!=='hidden'&&[e,...(function*(x){while(x.parentElement){x=x.parentElement;yield x}})(e)].every(x=>getComputedStyle(x).opacity!=='0'&&!x.hidden),color:cs.color,background:cs.backgroundColor,textRects}});const collisions=[];for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){if(es[i].contains(es[j])||es[j].contains(es[i]))continue;const a=elements[i].box,b=elements[j].box;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)collisions.push([elements[i].text,elements[j].text]);}return {bounds,viewport:innerWidth,scroll:n.scrollWidth,client:n.clientWidth,elements,collisions,heading:n.querySelector('h4')?.textContent,background:getComputedStyle(n).backgroundColor,descriptionCount:n.querySelectorAll('.waapiDescription').length,reducedCount:n.querySelectorAll('.waapiReduced').length}}"""
def layout_valid(g):
 inventory=all(any(e['tag']=='BUTTON' and e['text']==label for e in g['elements']) for label in g.get('requiredButtons',[])) and (not g.get('requireLabel') or any(e['tag']=='LABEL' for e in g['elements']))
 return (inventory and bool(g['elements']) and g['bounds']['left']>=-1 and g['bounds']['right']<=g['viewport']+1 and g['scroll']<=g['client']+1 and not g['collisions'] and all(e['visible'] and e['box']['width']>0 and e['box']['height']>0 and e['text'].strip() and e['scroll']<=e['client']+1 and all(t['top']>=clip['top']-1 and t['bottom']<=clip['bottom']+1 for clip in e['clips'] for t in e['textRects']) and e['box']['left']>=g['bounds']['left']-1 and e['box']['right']<=g['bounds']['right']+1 and all(t['left']>=e['box']['left']-1 and t['right']<=e['box']['right']+1  for t in e['textRects']) for e in g['elements']))

with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  browser=getattr(p,engine).launch(headless=True,executable_path=os.environ['WAAPI_'+engine.upper()+'_PATH'])
  for width in [375,390,765]:
   context=browser.new_context(viewport={'width':width,'height':900},has_touch=True);q=context.new_page();q.set_default_timeout(10000)
   r={'engine':engine,'width':width,'version':browser.version,'startedAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(),'checks':[],'geometry':[],'errors':[]};results.append(r);q.on('pageerror',lambda e:r['errors'].append(str(e)))
   try:
    # Actual DOM negative controls use the same geometry and predicate as product checks.
    r['layoutControls']=[]
    for variant,expected in [('baseline',True),('overflow',False),('overlap',False),('hidden-label',False),('remove-button',False),('remove-label',False),('clipped-text',False)]:
     q.set_content('<style>body{margin:0}article{width:300px;padding:8px;box-sizing:border-box}h4,p,label,button{display:block;margin:8px 0;line-height:24px}button{width:120px;height:32px}</style><article><h4>Fixture</h4><p>Explanation</p><label>Required label</label><button>Action</button></article>')
     if variant=='overflow':q.locator('p').evaluate("e=>e.style.width='400px'")
     if variant=='overlap':q.locator('button').evaluate("e=>{e.style.position='absolute';e.style.top=document.querySelector('label').getBoundingClientRect().top+'px'}")
     if variant=='hidden-label':q.locator('label').evaluate("e=>e.style.display='none'")
     if variant=='clipped-text':q.locator('p').evaluate("e=>{e.style.height='1px';e.style.lineHeight='1px';e.style.fontSize='24px';e.style.overflow='hidden'}")
     if variant=='remove-button':q.locator('button').evaluate('e=>e.remove()')
     if variant=='remove-label':q.locator('label').evaluate('e=>e.remove()')
     control=q.locator('article').evaluate(geometry);control.update(requiredButtons=['Action'],requireLabel=True);actual=layout_valid(control);r['layoutControls'].append({'variant':variant,'expected':expected,'actual':actual});assert actual==expected,(variant,control)
    q.goto(os.environ['WAAPI_URL'],wait_until='networkidle');q.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
    def card(name):
     q.get_by_label('検索',exact=True).fill(name);c=q.locator('.waapiSampleCard').filter(has=q.get_by_role('heading',name=name,exact=True));c.scroll_into_view_if_needed();return c
    required={'Menu Selection Cursor':['観察モードを開く','↑ Up','↓ Down','Reset'],'Coin Pickup Arc':['観察モードを開く','Replay','COLLECT','Reset'],'Match-3 Cascade':['SWAP','RESET'],'HP Bar Damage / Heal':['Damage','Heal','Reset'],'Turn Order Reflow':['HASTE','STUN','NORMALIZE','RESET'],'Battle Transition':['ENCOUNTER','RETURN','RESET']}
    for name in names:
     try:
      c=card(name)
      for motion in ['no-preference','reduce']:
       q.emulate_media(reduced_motion=motion)
       for scale in [1,2]:
        c.evaluate('''(n,s)=>{const es=[n,...n.querySelectorAll('*')];for(const e of es)if(!e.dataset.acceptanceFont)e.dataset.acceptanceFont=getComputedStyle(e).fontSize;for(const e of es)e.style.fontSize=parseFloat(e.dataset.acceptanceFont)*s+'px'}''',scale)
        for theme in ['light','dark']:
         c.get_by_role('button',name='Reset' if name in names[:2] or name=='HP Bar Damage / Heal' else 'RESET',exact=True).click()
         q.emulate_media(color_scheme=theme);g=c.evaluate(geometry);g.update(name=name,motion=motion,scale=scale,theme=theme);g['requiredButtons']=required[name];g['schemeReached']=q.evaluate('(t)=>matchMedia(`(prefers-color-scheme: ${t})`).matches',theme);g['motionReached']=q.evaluate('(t)=>matchMedia(`(prefers-reduced-motion: ${t})`).matches',motion);assert g['schemeReached'] and g['motionReached'];r['geometry'].append(g)
         assert g['heading']==name and any(e['tag']=='BUTTON' for e in g['elements']) and any(e['tag']=='P' for e in g['elements']),g
         assert g['descriptionCount']==1 and g['reducedCount']==1,g
         assert layout_valid(g),g
        # Real hit-tested tap and keyboard Enter on Reset; no DOM invocation substitution.
        reset=c.get_by_role('button',name='Reset' if name in names[:2] or name=='HP Bar Damage / Heal' else 'RESET',exact=True)
        reset.tap();reset.focus();assert reset.evaluate('e=>document.activeElement===e');q.keyboard.press('Enter')
      c.evaluate("n=>{for(const e of [n,...n.querySelectorAll('*')])if(e.dataset.acceptanceFont)e.style.fontSize=e.dataset.acceptanceFont}")
      r['checks'].append(name+': normal/reduced x CSS100/200 x light/dark target geometry; real Reset tap/focus/Enter')
     except Exception as e:
      r.setdefault('cardFailures',[]).append({'name':name,'failure':str(e),'traceback':traceback.format_exc()})
      if width==390:
       try:c.screenshot(path=OUT.replace('.json','-'+engine+'-'+name.split()[0]+'-failure.png'))
       except Exception as capture:r['cardFailures'][-1]['screenshotError']=str(capture)
      # Restore font styles before the next independent card; no failed path is reclassified.
      c.evaluate("n=>{for(const e of [n,...n.querySelectorAll('*')])if(e.dataset.acceptanceFont)e.style.fontSize=e.dataset.acceptanceFont}")
    c=card('Turn Order Reflow');r['turn']=[]
    c.evaluate('''n=>{window.acceptTurnAnimations=[];window.acceptTurnAnimate=Element.prototype.animate;Element.prototype.animate=function(...args){const a=window.acceptTurnAnimate.apply(this,args);if(n.contains(this))window.acceptTurnAnimations.push(a);return a}}''')
    for motion in ['no-preference','reduce']:
     q.emulate_media(reduced_motion=motion)
     for action,expected in [('HASTE',['MAGE','KNIGHT','ROGUE']),('STUN',['KNIGHT','ROGUE','MAGE']),('NORMALIZE',['KNIGHT','MAGE','ROGUE'])]:
      q.evaluate('window.acceptTurnAnimations=[]');button=c.get_by_role('button',name=action,exact=True);button.tap();actual=c.locator('[data-unit]').evaluate_all('(es)=>es.map(e=>e.dataset.unit)');assert actual==expected,(actual,expected)
      native=q.evaluate('''async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));await new Promise(resolve=>requestAnimationFrame(resolve));const created=window.acceptTurnAnimations.map(a=>({time:a.currentTime,state:a.playState,pending:a.pending,duration:a.effect.getTiming().duration}));await Promise.all(window.acceptTurnAnimations.map(a=>a.finished));return {created,settled:window.acceptTurnAnimations.map(a=>({time:a.currentTime,state:a.playState,pending:a.pending}))}}''');assert len(native['created'])==3,native
      positions=c.locator('[data-unit]').evaluate_all('(es)=>es.map(e=>({unit:e.dataset.unit,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}))')
      assert all(a['bottom']<=b['top']+1 for a,b in zip(positions,positions[1:])),positions
      r['turn'].append({'motion':motion,'action':action,'order':actual,'positions':positions,'native':native})
     for _ in range(3):c.get_by_role('button',name='HASTE',exact=True).click();c.get_by_role('button',name='RESET',exact=True).click()
     q.wait_for_timeout(500);assert c.locator('[data-unit]').evaluate_all('(es)=>es.map(e=>e.dataset.unit)')==['KNIGHT','MAGE','ROGUE']
     assert c.locator('output').inner_text()=='NORMALIZE · DOM ORDER UPDATED'
     # FLIP duration is 420ms; original 500ms observation remains, then inspect residual native state.
     final=c.locator('.gameTurn ol').evaluate("n=>({animations:n.getAnimations({subtree:true}).map(a=>({state:a.playState,time:a.currentTime,pending:a.pending})),positions:[...n.children].map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,transform:getComputedStyle(e).transform}))})")
     assert not any(a['state']=='running' or a['pending'] for a in final['animations']),final
     assert all(a['bottom']<=b['top']+1 for a,b in zip(final['positions'],final['positions'][1:])),final
     q.evaluate('scrollTo(0,0)');c.scroll_into_view_if_needed();assert c.locator('[data-unit]').evaluate_all('(es)=>es.map(e=>e.dataset.unit)')==['KNIGHT','MAGE','ROGUE']
     r['turn'].append({'motion':motion,'afterRapidResetAndReentry':final})
    q.evaluate('()=>{Element.prototype.animate=window.acceptTurnAnimate;}')
    r['checks'].append('Turn Order real tap FLIP final geometry normal/reduced; rapid HASTE/Reset no delayed reversal')
    assert not r['errors'];r['status']='FAIL' if r.get('cardFailures') else 'PASS'
   except Exception as e:
    r.update(status='FAIL',failure=str(e),traceback=traceback.format_exc())
    if width==390:
     try:q.screenshot(path=OUT.replace('.json','-'+engine+'-failure.png'),full_page=False)
     except Exception as capture:r['screenshotError']=str(capture)
   finally:
    r['finishedAt']=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat();open(OUT,'w').write(json.dumps(results,ensure_ascii=False,indent=2));context.close();print(engine,width,r['status'],flush=True)
  browser.close()
raise SystemExit(0 if all(r['status']=='PASS' for r in results) else 1)
