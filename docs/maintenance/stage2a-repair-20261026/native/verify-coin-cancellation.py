"""Native WAAPI repair evidence. Browser-local button clicks are synthetic UI input.
Animation wrappers forward to native methods; no replacement Animation/timing mocks.
Browser media emulation and synthetic visibility are not physical OS/device evidence.
"""
import os, json, time, hashlib, traceback, subprocess, importlib.metadata, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('VERIFY_ROOT','.')).resolve()
OUT=Path(os.environ['VERIFY_OUT']).resolve()
BUILD=Path(os.environ.get('VERIFY_BUILD',str(ROOT/'out'))).resolve()
OUT.parent.mkdir(parents=True,exist_ok=True)
report={'startedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'mode':os.environ.get('VERIFY_PHASE','unspecified'),'source':{},'build':{},'conditions':[]}
report['scriptSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
report['sourceHead']=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip()
report['playwrightVersion']=importlib.metadata.version('playwright')
for file in ['app/components/WaapiSampleGallery.tsx','app/components/WaapiGameObservation.tsx','app/globals.css']:
 report['source'][file]=hashlib.sha256((ROOT/file).read_bytes()).hexdigest()
for file in sorted(BUILD.rglob('*')):
 if file.is_file() and file.suffix in ['.html','.js','.css']:
  report['build'][str(file.relative_to(BUILD))]=hashlib.sha256(file.read_bytes()).hexdigest()
def save(): OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2))
INIT=r'''(()=>{
const records=[],events=[];let next=0;
const snap=a=>({clock:performance.now(),currentTime:a?.currentTime??null,playState:a?.playState??null,pending:a?.pending??null,duration:a?.effect?.getTiming().duration??null});
const normal=()=>records.filter(r=>r.target.matches('[data-motion-target],[data-score]')&&r.target.closest('[data-normal-game] .gameCoinScene'));
const originalAnimate=Element.prototype.animate;
Element.prototype.animate=function(...args){const a=originalAnimate.apply(this,args);records.push({id:++next,a,target:this,created:performance.now(),initial:snap(a)});return a};
const originalCancel=Animation.prototype.cancel;
Animation.prototype.cancel=function(...args){const r=records.find(r=>r.a===this),before=snap(this);const value=originalCancel.apply(this,args);events.push({kind:'cancel',id:r?.id,before,after:snap(this)});return value};
const m=matchMedia('(prefers-reduced-motion: reduce)');m.addEventListener('change',()=>events.push({kind:'media',matches:m.matches,clock:performance.now(),animations:normal().map(r=>({id:r.id,...snap(r.a)}))}));
const IO=window.IntersectionObserver;
window.IntersectionObserver=class extends IO{constructor(cb,opts){super((entries,observer)=>{events.push({kind:'intersection',clock:performance.now(),entries:entries.map(e=>({sampleId:e.target.dataset.sampleId,intersecting:e.isIntersecting}))});cb(entries,observer)},opts)}};
window.__n2={records,events,snap,normal,last:()=>normal().findLast(r=>r.target.matches('[data-motion-target]')),serial:()=>normal().map(r=>({id:r.id,created:r.created,...snap(r.a)})),score:()=>document.querySelector('[data-normal-game] output')?.textContent,collected:()=>[...document.querySelectorAll('[data-normal-game] button')].find(b=>b.textContent==='COLLECT')?.disabled};
})();'''
CLICK=r'''async label=>{const n=document.querySelector('.waapiSampleCard');const b=[...n.querySelectorAll('button')].find(b=>b.textContent===label);if(!b)throw Error('Missing button '+label);const input=performance.now();b.click();await new Promise(r=>requestAnimationFrame(()=>r()));return {label,input,clock:performance.now(),score:__n2.score(),collected:__n2.collected(),last:__n2.last()?{id:__n2.last().id,...__n2.snap(__n2.last().a)}:null,ownedIds:__n2.normal().slice(-2).map(r=>r.id),normalCount:__n2.normal().length}}'''
SNAP=r'''()=>({clock:performance.now(),score:__n2.score(),collected:__n2.collected(),normal:__n2.serial(),events:__n2.events})'''

def cancel_pass(case):
 x=case.get('mediaInput');a=case.get('after',{});cancel=case.get('cancel',[])
 return bool(x and x.get('playState')=='running' and x.get('currentTime') is not None and x['currentTime']<x['duration'] and a.get('playState')=='idle' and a.get('currentTime') is None and cancel and case.get('ownedAfter') and all(z['playState']=='idle' and z['currentTime'] is None and any(c['id']==z['id'] for c in case.get('ownedCancels',[])) for z in case['ownedAfter']))
# Predicate controls are harness checks, not native cancellation successes.
import copy
positive={'mediaInput':{'playState':'running','currentTime':50,'duration':650},'after':{'playState':'idle','currentTime':None},'cancel':[{'id':1}],'ownedAfter':[{'id':1,'playState':'idle','currentTime':None},{'id':2,'playState':'idle','currentTime':None}],'ownedCancels':[{'id':1},{'id':2}]}
report['positiveControl']={'name':'both native references cancelled (predicate fixture)','accepted':cancel_pass(positive)}
report['negativeControls']=[]
for name,patch in [('running without cancel',{'after':{'playState':'running','currentTime':90},'cancel':[]}),('natural finish without cancel',{'after':{'playState':'finished','currentTime':650},'cancel':[]}),('already ended at media input',{'mediaInput':{'playState':'finished','currentTime':650,'duration':650}}),('score pulse not cancelled',{'ownedCancels':[{'id':1}]})]:
 case=copy.deepcopy(positive);case.update(patch);report['negativeControls'].append({'name':name,'rejected':not cancel_pass(case)})
with sync_playwright() as p:
 for engine in os.environ.get('VERIFY_ENGINES','chromium,webkit').split(','):
  browser=getattr(p,engine).launch(headless=True,executable_path=os.environ['WAAPI_'+engine.upper()+'_PATH'])
  for width in map(int,os.environ.get('VERIFY_WIDTHS','375,390,765').split(',')):
   r={'engine':engine,'version':browser.version,'width':width,'checks':[],'cancellation':[],'snapshots':[],'pageerror':[],'status':'RUNNING'};report['conditions'].append(r);save()
   context=browser.new_context(viewport={'width':width,'height':900},has_touch=True,reduced_motion='no-preference');context.add_init_script(INIT);q=context.new_page();q.set_default_timeout(15000);q.on('pageerror',lambda e,r=r:r['pageerror'].append(str(e)))
   def check(name,value,detail=None):r['checks'].append({'name':name,'pass':bool(value),'detail':detail});save()
   def click(label):return q.evaluate(CLICK,label)
   def snap(label):x=q.evaluate(SNAP);x['label']=label;r['snapshots'].append(x);save();return x
   try:
    q.goto(os.environ['WAAPI_URL'])
    check('Q1 initial Fade absent',q.get_by_text('Fade In',exact=True).count()==0);check('Q1 initial WAAPI region absent',q.get_by_role('region',name=re.compile('WAAPI')).count()==0)
    q.get_by_role('button',name='サンプル一覧を見る',exact=False).evaluate('b=>b.click()');q.get_by_text('47 / 47 samples',exact=True).wait_for()
    check('Q1 open all47 articles',q.get_by_role('article').count()>=47 and q.get_by_text('47 / 47 samples',exact=True).count()==1)
    q.get_by_label('検索',exact=True).fill('  FADE IN  ');q.get_by_text('1 / 47 samples',exact=True).wait_for();check('Q1 normalized search Fade',q.get_by_text('Fade In',exact=True).count()==1)
    q.get_by_role('button',name='絞り込みを解除',exact=True).evaluate('b=>b.click()');r['filterLabelTexts']=q.locator('.waapiFilters label').all_text_contents();r['filterOwnLabels']=q.locator('.waapiFilters label').evaluate_all('ns=>ns.map(n=>[...n.childNodes].filter(x=>x.nodeType===Node.TEXT_NODE).map(x=>x.textContent).join("").trim())');check('Q1 category and usage label identity',r['filterOwnLabels'].count('カテゴリ')==1 and r['filterOwnLabels'].count('用途')==1);q.locator('.waapiFilters label').filter(has_text=re.compile('^カテゴリ')).locator('select').select_option('UI Feedback');q.locator('.waapiFilters label').filter(has_text=re.compile('^用途')).locator('select').select_option('Modal');q.get_by_text('1 / 47 samples',exact=True).wait_for();check('Q1 composite Modal filter',q.get_by_text('Modal Open / Close',exact=True).count()==1)
    q.get_by_label('検索',exact=True).fill('一致しない文字列');q.get_by_text(re.compile('条件に一致する標本はありません')).wait_for();check('Q1 no results notice',q.get_by_text(re.compile('条件に一致する標本はありません')).count()==1)
    q.get_by_role('button',name='絞り込みを解除',exact=True).evaluate('b=>b.click()');q.get_by_text('47 / 47 samples',exact=True).wait_for();check('Q1 clear restores all47',q.get_by_role('article').count()>=47)
    q1before=q.evaluate('()=>({clock:performance.now(),cancelCount:__n2.events.filter(e=>e.kind==="cancel").length,live:__n2.records.filter(r=>["running","paused"].includes(r.a.playState)).map(r=>({id:r.id,...__n2.snap(r.a)}))})')
    q.get_by_role('button',name='サンプル一覧を閉じる',exact=False).evaluate('b=>b.click()');q.wait_for_function('()=>!document.querySelector(".waapiSampleCard")')
    q1after=q.evaluate('()=>({clock:performance.now(),cancelCount:__n2.events.filter(e=>e.kind==="cancel").length,records:__n2.records.map(r=>({id:r.id,...__n2.snap(r.a)}))})');r['q1Journey']={'beforeClose':q1before,'afterClose':q1after};check('Q1 close Fade absent and cancel increases',q.get_by_text('Fade In',exact=True).count()==0 and q1after['cancelCount']>q1before['cancelCount']);check('Q1 close cancels previously live refs',bool(q1before['live']) and all(next(a for a in q1after['records'] if a['id']==z['id'])['playState']=='idle' for z in q1before['live']))
    q.get_by_role('button',name='サンプル一覧を見る',exact=False).evaluate('b=>b.click()');q.get_by_label('検索',exact=True).fill('Coin Pickup Arc');c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed();q.wait_for_timeout(50)
    click('観察モードを開く');click('通常モードへ戻る');x=snap('first observation return');check('no autoplay after observation',not any(a['playState']=='running' for a in x['normal']));check('observation initially retains score 0',x['score']=='SCORE 0')
    for action in ['Replay','COLLECT']:
     q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(50);click('Reset')
     before=click(action);old_id=before['last']['id'];event_start=q.evaluate('__n2.events.length');q.emulate_media(reduced_motion='reduce')
     q.wait_for_function('start=>__n2.events.slice(start).some(e=>e.kind==="media"&&e.matches)',arg=event_start,timeout=5000)
     # Deadline watches cancellation, not a fixed delay that assumes React's scheduling.
     try:q.wait_for_function('id=>__n2.normal().find(r=>r.id===id)?.a.playState==="idle"',arg=old_id,timeout=1500)
     except Exception:pass
     data=q.evaluate('''({id,start,ownedIds})=>{const r=__n2.normal().find(r=>r.id===id);const ev=__n2.events.slice(start);return {ownedAfter:__n2.normal().filter(r=>ownedIds.includes(r.id)).map(r=>({id:r.id,...__n2.snap(r.a)})),ownedCancels:ev.filter(e=>e.kind==='cancel'&&ownedIds.includes(e.id)),mediaInput:ev.find(e=>e.kind==='media'&&e.matches)?.animations.find(a=>a.id===id),after:__n2.snap(r.a),cancel:ev.filter(e=>e.kind==='cancel'&&e.id===id),score:__n2.score(),collected:__n2.collected()}}''',{'id':old_id,'start':event_start,'ownedIds':before['ownedIds']})
     data.update(action=action,input=before,animationId=old_id);data['eligible']=bool(data.get('mediaInput') and data['mediaInput']['playState']=='running' and data['mediaInput']['currentTime'] is not None and data['mediaInput']['currentTime']<data['mediaInput']['duration']);data['verdict']='PASS' if cancel_pass(data) else 'FAIL' if data['eligible'] else 'INPUT_MISSED';r['cancellation'].append(data);save()
     check(action+' score retained after reduction',data['score']==('SCORE 100' if action=='COLLECT' else 'SCORE 0'));check(action+' acquisition retained',data['collected']==(action=='COLLECT'))
     count=q.evaluate('__n2.normal().length');q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(100);check('reduction OFF no autoplay '+action,q.evaluate('__n2.normal().length')==count)
    # Native pause is a diagnostic operation, not a normal Coin UI control.
    q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(50);click('Reset');click('Replay')
    paused=q.evaluate('async()=>{const r=__n2.last();r.a.pause();await r.a.ready;return {id:r.id,...__n2.snap(r.a)}}');event_start=q.evaluate('__n2.events.length');q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(300)
    paused_after=q.evaluate('id=>({after:__n2.snap(__n2.normal().find(r=>r.id===id).a),cancel:__n2.events.filter(e=>e.kind==="cancel"&&e.id===id)})',paused['id']);r['pausedDiagnostic']={'before':paused,**paused_after,'pass':paused_after['after']['playState']=='idle' and bool(paused_after['cancel'])};save()
    click('Reset');q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(50);x=click('Replay');timing=q.evaluate('__n2.normal().slice(-2).map(r=>({target:r.target.hasAttribute("data-score")?"score":"coin",duration:r.a.effect.getTiming().duration,delay:r.a.effect.getTiming().delay}))');check('explicit reduced Replay exact coin 1ms score 180ms no delay',timing==[{'target':'coin','duration':1,'delay':0},{'target':'score','duration':180,'delay':0}],timing);check('reduced Replay no award',x['score']=='SCORE 0');click('COLLECT');check('reduced COLLECT awards once',q.evaluate('__n2.score()')=='SCORE 100' and q.evaluate('__n2.collected()'));click('COLLECT');check('repeat COLLECT cannot duplicate score',q.evaluate('__n2.score()')=='SCORE 100')
    for i in range(3):
     q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(30);click('Replay');q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(100)
    
    try:q.wait_for_function('()=>__n2.normal().every(r=>r.a.playState==="idle")',timeout=1500)
    except Exception:pass
    x=snap('repeated media changes');check('repeated ON OFF preserves acquired score',x['score']=='SCORE 100' and x['collected']);check('repeated ON OFF old motion idle',all(a['playState']=='idle' for a in x['normal']))
    q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(30)
    for i in range(3):click('観察モードを開く');click('通常モードへ戻る');click('Replay')
    click('Reset');q.wait_for_timeout(750);x=snap('rapid modes Replay then Reset');check('Reset score and acquired clear',x['score']=='SCORE 0' and not x['collected']);check('Reset old animations idle and no old callbacks',all(a['playState']=='idle' for a in x['normal']))
    click('COLLECT');check('Reset permits new acquisition',q.evaluate('__n2.score()')=='SCORE 100' and q.evaluate('__n2.collected()'))
    # Actual scroll and IO timestamps retained. Natural finishing before IO is not live cancellation proof.
    before=click('Replay');q.evaluate('scrollTo(0,0)');q.wait_for_timeout(1000);outside=c.evaluate('n=>{let r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,outside:r.top>innerHeight+160||r.bottom< -160}}');x=snap('actual offscreen');check('actual root-margin exit reached',outside['outside'],outside);check('offscreen cancels owned animations',all(a['playState']=='idle' for a in x['normal']));c.scroll_into_view_if_needed();q.wait_for_timeout(100);x=snap('actual reentry');check('reentry preserves score no autoplay',x['score']=='SCORE 100' and not any(a['playState']=='running' for a in x['normal']))
    click('観察モードを開く');q.evaluate("[...document.querySelector('.waapiObservation').querySelectorAll('button')].find(b=>b.textContent==='再生 / 再開').click()");q.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");q.wait_for_timeout(100);x=snap('synthetic hidden');check('synthetic hidden cancels observation motion',c.locator('.waapiObservation').evaluate('n=>!n.getAnimations({subtree:true}).some(a=>a.playState===\"running\")'));q.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");q.wait_for_timeout(100);check('synthetic visible observation no autoplay',c.locator('.waapiObservation').evaluate('n=>!n.getAnimations({subtree:true}).some(a=>a.playState===\"running\")'));click('通常モードへ戻る')
    click('Replay');q.get_by_role('button',name='サンプル一覧を閉じる',exact=False).evaluate('b=>b.click()');q.wait_for_timeout(750);x=snap('gallery unmount');check('unmount cancels all owned animations',all(a['playState']=='idle' for a in x['normal']));check('unmount removes card',q.locator('.waapiSampleCard').count()==0)
    q.get_by_role('button',name='サンプル一覧を見る',exact=False).evaluate('b=>b.click()');q.get_by_label('検索',exact=True).fill('Menu Selection Cursor');c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed();click('観察モードを開く');click('通常モードへ戻る');click('↓ Down');check('Menu selection after observation',c.locator('.isSelected').inner_text().endswith('COLLECTION'));menu_before=q.evaluate('()=>{window.__menuOld=__n2.records.filter(r=>r.target.closest(".gameMenu"));return __menuOld.map(r=>({id:r.id,...__n2.snap(r.a)}))}');q.emulate_media(reduced_motion='reduce')
    try:q.wait_for_function('()=>__menuOld.every(r=>r.a.playState==="idle")',timeout=1500)
    except Exception:pass
    menu_after=q.evaluate('()=>({old:__menuOld.map(r=>({id:r.id,...__n2.snap(r.a)})),cancels:__n2.events.filter(e=>e.kind==="cancel"&&__menuOld.some(r=>r.id===e.id))})');r['menuCancellation']={'before':menu_before,**menu_after};check('Menu reduced selection preserved',c.locator('.isSelected').inner_text().endswith('COLLECTION'));check('Menu old animations cancelled after reduction',bool(menu_before) and all(a['playState']=='idle' for a in menu_after['old']) and bool(menu_after['cancels']))
    q.screenshot(path=str(OUT.parent/(OUT.stem+'-'+engine+'-'+str(width)+'.png')),full_page=False)
    check('no pageerror',not r['pageerror']);r['status']='FAIL' if any(not x['pass'] for x in r['checks']) or any(x['verdict']=='FAIL' for x in r['cancellation']) or not r.get('pausedDiagnostic',{}).get('pass',False) else 'PARTIAL' if any(x['verdict']=='INPUT_MISSED' for x in r['cancellation']) else 'PASS'
   except Exception as e:r.update(status='EXCEPTION',error=str(e),traceback=traceback.format_exc())
   finally:save();context.close();print(engine,width,r['status'],flush=True)
  browser.close()
report['finishedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());save()
