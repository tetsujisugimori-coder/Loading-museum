"""One supplementary native probe; original partial trial remains unchanged.
No animation mocks, time assignment, altered duration, or product state injection.
"""
import datetime,hashlib,json,os,pathlib,socket,subprocess,sys,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path.cwd();OUT=ROOT/'docs/maintenance/stage2a-q1-reestablish-20261027/native';report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'engine':'webkit','width':765,'samples':[],'pageerror':[],'scope':'supplemental browser-local button inputs, not replacement of original observation partial'}
def classify_pause(sample):
 before,settled,held=sample['beforePause'],sample['settled'],sample['held'];eligible=before['playState']=='running' and isinstance(before['currentTime'],(int,float)) and 0<before['currentTime']<sample['duration']
 passed=eligible and settled['playState']=='paused' and held['playState']=='paused' and abs(settled['currentTime']-before['currentTime'])<.1 and abs(held['currentTime']-settled['currentTime'])<.1 and held['transform']==settled['transform']
 return eligible,'PASS' if passed else 'INPUT_MISSED' if not eligible else 'FAIL'
report['predicateControls']=[]
for name,beforeTime,beforeState,settledTime,expected in [('natural endpoint is not live pause',220,'finished',220,'INPUT_MISSED'),('drift rejected',50,'running',60,'FAIL'),('held live pause accepted',50,'running',50,'PASS')]:
 fixture={'duration':220,'beforePause':{'currentTime':beforeTime,'playState':beforeState},'settled':{'currentTime':settledTime,'playState':'paused','transform':'matrix'},'held':{'currentTime':settledTime,'playState':'paused','transform':'matrix'}}
 actual=classify_pause(fixture)[1];report['predicateControls'].append({'name':name,'expected':expected,'actual':actual,'pass':expected==actual})
assert all(c['pass'] for c in report['predicateControls'])
serve=pathlib.Path(tempfile.mkdtemp(prefix='loading-menu-probe-'));(serve/'Loading-museum').symlink_to(ROOT/'out',target_is_directory=True)
with (OUT/'menu765-server.log').open('w') as serverLog:
 server=subprocess.Popen([sys.executable,'-m','http.server','4217','--bind','127.0.0.1','--directory',str(serve)],stdout=serverLog,stderr=subprocess.STDOUT)
 try:
  for _ in range(100):
   if server.poll() is not None:raise RuntimeError('Own server exited')
   try:
    with socket.create_connection(('127.0.0.1',4217),timeout=.1):break
   except OSError:time.sleep(.1)
  data=urllib.request.urlopen('http://127.0.0.1:4217/Loading-museum/',timeout=10).read();report['indexLocalSha256']=hashlib.sha256((ROOT/'out/index.html').read_bytes()).hexdigest();report['indexServedSha256']=hashlib.sha256(data).hexdigest();assert report['indexLocalSha256']==report['indexServedSha256']
  with sync_playwright() as p:
   b=p.webkit.launch(headless=True,executable_path='/tmp/loading-q1-20261027-browsers156/webkit-2215/pw_run.sh',timeout=10000);report['version']=b.version
   context=b.new_context(viewport={'width':765,'height':900},has_touch=True,reduced_motion='no-preference');q=context.new_page();q.set_default_timeout(10000);q.on('pageerror',lambda e:report['pageerror'].append(str(e)))
   try:
    q.goto('http://127.0.0.1:4217/Loading-museum/',wait_until='networkidle');q.get_by_role('button',name='サンプル一覧を見る',exact=False).click();q.get_by_label('検索',exact=True).fill('Menu Selection Cursor')
    card=q.locator('.waapiSampleCard');card.scroll_into_view_if_needed();card.get_by_role('button',name='↓ Down',exact=True).click();q.wait_for_timeout(260);card.get_by_role('button',name='観察モードを開く',exact=True).click();obs=card.locator('.waapiObservation');obs.scroll_into_view_if_needed()
    q.wait_for_function('n=>n.dataset.controller!=="inactive" && n.querySelector("[data-observation-target]").getAnimations().length>0',arg=obs.element_handle(),timeout=1000)
    for requested in [20,110,190]:
     sample=obs.evaluate('''async(n,requested)=>{const button=s=>[...n.querySelectorAll('button')].find(b=>b.textContent===s);const animation=()=>n.querySelector('[data-observation-target]').getAnimations()[0];const read=a=>({clock:performance.now(),currentTime:a.currentTime,playState:a.playState,pending:a.pending,controller:n.dataset.controller,reading:n.querySelector('[data-observation-reading]').textContent,transform:getComputedStyle(n.querySelector('[data-observation-target]')).transform});button('観察位置を先頭へ').click();let a=animation();await a.ready;const reset=read(a);const beforePlay=performance.now();button('再生 / 再開').click();const playReturned=performance.now();a=animation();await a.ready;const ready=read(a);const frames=[];while(a.currentTime<requested&&performance.now()-beforePlay<1000){await new Promise(requestAnimationFrame);frames.push(read(a));}const beforePause=read(a);button('一時停止').click();const pauseReturned=performance.now();await a.ready;const settled=read(a);await new Promise(r=>setTimeout(r,100));return {requested,duration:a.effect.getTiming().duration,reset,beforePlay,playReturned,ready,frames,beforePause,pauseReturned,settled,held:read(a)}}''',requested)
     sample['eligibleRunningInput'],sample['verdict']=classify_pause(sample);report['samples'].append(sample)
    report['status']='PASS' if len(report['samples'])==3 and all(x['verdict']=='PASS' for x in report['samples']) and not report['pageerror'] else 'PARTIAL'
   finally:context.close();b.close()
 except Exception as e:report.update(status='FAILED',error=str(e))
 finally:
  server.terminate();server.wait(timeout=10);report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'menu765-probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(report['status'],flush=True)
