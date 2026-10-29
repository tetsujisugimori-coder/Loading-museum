"""Native WAAPI repair evidence. Browser-local button clicks are synthetic UI input.
Animation wrappers forward to native methods; no replacement Animation/timing mocks.
Browser media emulation and synthetic visibility are not physical OS/device evidence.
"""
import os, json, time, hashlib, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('VERIFY_ROOT','.')).resolve()
OUT=Path(os.environ['VERIFY_OUT']).resolve()
BUILD=Path(os.environ.get('VERIFY_BUILD',str(ROOT/'out'))).resolve()
OUT.parent.mkdir(parents=True,exist_ok=True)
report={'startedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'mode':os.environ.get('VERIFY_PHASE','unspecified'),'source':{},'build':{},'conditions':[]}
for file in ['app/components/WaapiSampleGallery.tsx','app/components/WaapiGameObservation.tsx','app/globals.css']:
 report['source'][file]=hashlib.sha256((ROOT/file).read_bytes()).hexdigest()
for file in sorted(BUILD.rglob('*')):
 if file.is_file() and file.suffix in ['.html','.js','.css']:
  report['build'][str(file.relative_to(BUILD))]=hashlib.sha256(file.read_bytes()).hexdigest()
def save(): OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2))
INIT=r'''(()=>{
const records=[],events=[];let next=0;
const snap=a=>({clock:performance.now(),currentTime:a?.currentTime??null,playState:a?.playState??null,pending:a?.pending??null,duration:a?.effect?.getTiming().duration??null});
const normal=()=>records.filter(r=>r.target.matches('[data-motion-target]')&&r.target.closest('[data-normal-game] .gameCoinScene'));
const originalAnimate=Element.prototype.animate;
Element.prototype.animate=function(...args){const a=originalAnimate.apply(this,args);records.push({id:++next,a,target:this,created:performance.now(),initial:snap(a)});return a};
const originalCancel=Animation.prototype.cancel;
Animation.prototype.cancel=function(...args){const r=records.find(r=>r.a===this),before=snap(this);const value=originalCancel.apply(this,args);events.push({kind:'cancel',id:r?.id,before,after:snap(this)});return value};
const m=matchMedia('(prefers-reduced-motion: reduce)');m.addEventListener('change',()=>events.push({kind:'media',matches:m.matches,clock:performance.now(),animations:normal().map(r=>({id:r.id,...snap(r.a)}))}));
const IO=window.IntersectionObserver;
window.IntersectionObserver=class extends IO{constructor(cb,opts){super((entries,observer)=>{events.push({kind:'intersection',clock:performance.now(),entries:entries.map(e=>({sampleId:e.target.dataset.sampleId,intersecting:e.isIntersecting}))});cb(entries,observer)},opts)}};
window.__n2={records,events,snap,normal,last:()=>normal().at(-1),serial:()=>normal().map(r=>({id:r.id,created:r.created,...snap(r.a)})),score:()=>document.querySelector('[data-normal-game] output')?.textContent,collected:()=>[...document.querySelectorAll('[data-normal-game] button')].find(b=>b.textContent==='COLLECT')?.disabled};
})();'''
CLICK=r'''async label=>{const n=document.querySelector('.waapiSampleCard');const b=[...n.querySelectorAll('button')].find(b=>b.textContent===label);if(!b)throw Error('Missing button '+label);const input=performance.now();b.click();await new Promise(r=>requestAnimationFrame(()=>r()));return {label,input,clock:performance.now(),score:__n2.score(),collected:__n2.collected(),last:__n2.last()?{id:__n2.last().id,...__n2.snap(__n2.last().a)}:null,normalCount:__n2.normal().length}}'''
SNAP=r'''()=>({clock:performance.now(),score:__n2.score(),collected:__n2.collected(),normal:__n2.serial(),events:__n2.events})'''

def cancel_pass(case):
 x=case.get('mediaInput');a=case.get('after',{});cancel=case.get('cancel',[])
 return bool(x and x.get('playState')=='running' and x.get('currentTime') is not None and x['currentTime']<x['duration'] and a.get('playState')=='idle' and a.get('currentTime') is None and cancel)
# Predicate negative controls: an uncancelled running or naturally finished motion never passes.
report['negativeControls']=[{'name':'running without cancel','rejected':not cancel_pass({'mediaInput':{'playState':'running','currentTime':50,'duration':650},'after':{'playState':'running','currentTime':90},'cancel':[]})},{'name':'natural finish without cancel','rejected':not cancel_pass({'mediaInput':{'playState':'running','currentTime':50,'duration':650},'after':{'playState':'finished','currentTime':650},'cancel':[]})},{'name':'already ended at media input','rejected':not cancel_pass({'mediaInput':{'playState':'finished','currentTime':650,'duration':650},'after':{'playState':'idle','currentTime':None},'cancel':[{}]})}]
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
    q.goto(os.environ['WAAPI_URL']);q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill('Coin Pickup Arc');c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed();q.wait_for_timeout(50)
    click('観察モードを開く');click('通常モードへ戻る');x=snap('first observation return');check('no autoplay after observation',not any(a['playState']=='running' for a in x['normal']));check('observation initially retains score 0',x['score']=='SCORE 0')
    for action in ['Replay','COLLECT']:
     q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(50);click('Reset')
     before=click(action);old_id=before['last']['id'];event_start=q.evaluate('__n2.events.length');q.emulate_media(reduced_motion='reduce')
     q.wait_for_function('start=>__n2.events.slice(start).some(e=>e.kind==="media"&&e.matches)',arg=event_start,timeout=5000)
     # Deadline watches cancellation, not a fixed delay that assumes React's scheduling.
     try:q.wait_for_function('id=>__n2.normal().find(r=>r.id===id)?.a.playState==="idle"',arg=old_id,timeout=1500)
     except Exception:pass
     data=q.evaluate('''({id,start})=>{const r=__n2.normal().find(r=>r.id===id);const ev=__n2.events.slice(start);return {mediaInput:ev.find(e=>e.kind==='media'&&e.matches)?.animations.find(a=>a.id===id),after:__n2.snap(r.a),cancel:ev.filter(e=>e.kind==='cancel'&&e.id===id),score:__n2.score(),collected:__n2.collected()}}''',{'id':old_id,'start':event_start})
     data.update(action=action,input=before,animationId=old_id);data['eligible']=bool(data.get('mediaInput') and data['mediaInput']['playState']=='running' and data['mediaInput']['currentTime'] is not None and data['mediaInput']['currentTime']<data['mediaInput']['duration']);data['verdict']='PASS' if cancel_pass(data) else 'FAIL' if data['eligible'] else 'INPUT_MISSED';r['cancellation'].append(data);save()
     check(action+' score retained after reduction',data['score']==('SCORE 100' if action=='COLLECT' else 'SCORE 0'));check(action+' acquisition retained',data['collected']==(action=='COLLECT'))
     count=q.evaluate('__n2.normal().length');q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(100);check('reduction OFF no autoplay '+action,q.evaluate('__n2.normal().length')==count)
    # Native pause is a diagnostic operation, not a normal Coin UI control.
    q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(50);click('Reset');click('Replay')
    paused=q.evaluate('async()=>{const r=__n2.last();r.a.pause();await r.a.ready;return {id:r.id,...__n2.snap(r.a)}}');event_start=q.evaluate('__n2.events.length');q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(300)
    paused_after=q.evaluate('id=>({after:__n2.snap(__n2.normal().find(r=>r.id===id).a),cancel:__n2.events.filter(e=>e.kind==="cancel"&&e.id===id)})',paused['id']);r['pausedDiagnostic']={'before':paused,**paused_after,'pass':paused_after['after']['playState']=='idle' and bool(paused_after['cancel'])};save()
    click('Reset');q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(50);x=click('Replay');timing=q.evaluate('__n2.last().a.effect.getTiming()');check('explicit reduced Replay uses reduced duration',timing['duration']<=200,timing);check('reduced Replay no award',x['score']=='SCORE 0');click('COLLECT');check('reduced COLLECT awards once',q.evaluate('__n2.score()')=='SCORE 100' and q.evaluate('__n2.collected()'));click('COLLECT');check('repeat COLLECT cannot duplicate score',q.evaluate('__n2.score()')=='SCORE 100')
    for i in range(3):
     q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(30);click('Replay');q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(100)
    x=snap('repeated media changes');check('repeated ON OFF preserves acquired score',x['score']=='SCORE 100' and x['collected']);check('repeated ON OFF old motion idle',all(a['playState']=='idle' for a in x['normal']))
    q.emulate_media(reduced_motion='no-preference');q.wait_for_timeout(30)
    for i in range(3):click('観察モードを開く');click('通常モードへ戻る');click('Replay')
    click('Reset');q.wait_for_timeout(750);x=snap('rapid modes Replay then Reset');check('Reset score and acquired clear',x['score']=='SCORE 0' and not x['collected']);check('Reset old animations idle and no old callbacks',all(a['playState']=='idle' for a in x['normal']))
    click('COLLECT');check('Reset permits new acquisition',q.evaluate('__n2.score()')=='SCORE 100' and q.evaluate('__n2.collected()'))
    # Actual scroll and IO timestamps retained. Natural finishing before IO is not live cancellation proof.
    before=click('Replay');q.evaluate('scrollTo(0,0)');q.wait_for_timeout(1000);outside=c.evaluate('n=>{let r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,outside:r.top>innerHeight+160||r.bottom< -160}}');x=snap('actual offscreen');check('actual root-margin exit reached',outside['outside'],outside);check('offscreen cancels owned animations',all(a['playState']=='idle' for a in x['normal']));c.scroll_into_view_if_needed();q.wait_for_timeout(100);x=snap('actual reentry');check('reentry preserves score no autoplay',x['score']=='SCORE 100' and not any(a['playState']=='running' for a in x['normal']))
    click('観察モードを開く');q.evaluate("[...document.querySelector('.waapiObservation').querySelectorAll('button')].find(b=>b.textContent==='再生 / 再開').click()");q.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");q.wait_for_timeout(100);x=snap('synthetic hidden');check('synthetic hidden cancels observation motion',c.locator('.waapiObservation').evaluate('n=>!n.getAnimations({subtree:true}).some(a=>a.playState===\"running\")'));q.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");q.wait_for_timeout(100);check('synthetic visible observation no autoplay',c.locator('.waapiObservation').evaluate('n=>!n.getAnimations({subtree:true}).some(a=>a.playState===\"running\")'));click('通常モードへ戻る')
    click('Replay');q.get_by_role('button',name='サンプル一覧を閉じる',exact=False).click();q.wait_for_timeout(750);x=snap('gallery unmount');check('unmount cancels all owned animations',all(a['playState']=='idle' for a in x['normal']));check('unmount removes card',q.locator('.waapiSampleCard').count()==0)
    q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill('Menu Selection Cursor');c=q.locator('.waapiSampleCard');c.scroll_into_view_if_needed();click('観察モードを開く');click('通常モードへ戻る');click('↓ Down');check('Menu selection after observation',c.locator('.isSelected').inner_text().endswith('COLLECTION'));q.emulate_media(reduced_motion='reduce');q.wait_for_timeout(100);check('Menu reduced selection preserved',c.locator('.isSelected').inner_text().endswith('COLLECTION'));check('Menu current animations absent after reduction',c.evaluate('n=>n.getAnimations({subtree:true}).length')==0)
    q.screenshot(path=str(OUT.parent/(OUT.stem+'-'+engine+'-'+str(width)+'.png')),full_page=False)
    check('no pageerror',not r['pageerror']);r['status']='FAIL' if any(not x['pass'] for x in r['checks']) or any(x['verdict']=='FAIL' for x in r['cancellation']) or not r.get('pausedDiagnostic',{}).get('pass',False) else 'PARTIAL' if any(x['verdict']=='INPUT_MISSED' for x in r['cancellation']) else 'PASS'
   except Exception as e:r.update(status='EXCEPTION',error=str(e),traceback=traceback.format_exc())
   finally:save();context.close();print(engine,width,r['status'],flush=True)
  browser.close()
report['finishedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());save()
