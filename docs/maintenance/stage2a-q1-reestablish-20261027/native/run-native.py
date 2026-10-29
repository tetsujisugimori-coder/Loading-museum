"""Run unchanged native verifiers against this worktree's fresh static build.
No test predicates, waits, product code or saved old evidence are modified.
"""
import datetime,hashlib,json,os,pathlib,signal,socket,subprocess,sys,tempfile,time,urllib.request
ROOT=pathlib.Path.cwd();OUT=ROOT/'docs/maintenance/stage2a-q1-reestablish-20261027/native';PY=sys.executable
stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
tracked=subprocess.check_output(['git','ls-files','app'],text=True).splitlines()
source={p:sha(ROOT/p) for p in tracked if (ROOT/p).is_file()}
report={'startedAt':stamp(),'headAtStart':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source':source,'scripts':{},'runs':[],'scope':'native installed Chromium/WebKit, no physical device assurance'}
for p in ['scripts/verify-waapi-observation.py','scripts/verify-waapi-stage1.py','docs/maintenance/stage2a-repair-20261026/native/verify-coin-cancellation.py','docs/maintenance/stage2a-repair-20261026/native/assess-native.py']:report['scripts'][p]=sha(ROOT/p)
def save(): (OUT/'execution.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
pathlib.Path('/tmp/loading-q1-20261027-home').mkdir(exist_ok=True);pathlib.Path('/tmp/loading-q1-20261027-cache').mkdir(exist_ok=True)
env=dict(os.environ,HOME='/tmp/loading-q1-20261027-home',XDG_CACHE_HOME='/tmp/loading-q1-20261027-cache',WAAPI_URL='http://127.0.0.1:4217/Loading-museum/',WAAPI_CHROMIUM_PATH='/tmp/loading-q1-20261027-browsers156/chromium_headless_shell-1194/chrome-linux/headless_shell',WAAPI_WEBKIT_PATH='/tmp/loading-q1-20261027-browsers156/webkit-2215/pw_run.sh',WAAPI_BROWSERS='chromium,webkit',WAAPI_WIDTHS='375,390,765',VERIFY_ENGINES='chromium,webkit',VERIFY_WIDTHS='375,390,765')
def run(name,args,extra=None):
 row={'name':name,'startedAt':stamp(),'monotonicStart':time.perf_counter(),'command':args};report['runs'].append(row);save()
 with (OUT/(name+'.log')).open('w') as log:
  process=subprocess.Popen(args,env={**env,**(extra or {})},stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  try: code=process.wait(timeout=300)
  except subprocess.TimeoutExpired:
   row['outerDiagnosticTimeoutSeconds']=300;os.killpg(process.pid,signal.SIGTERM)
   try: process.wait(timeout=3)
   except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL);process.wait()
   code=124
 row.update(exitCode=code,finishedAt=stamp(),elapsedSeconds=time.perf_counter()-row['monotonicStart']);save();print(name,code,round(row['elapsedSeconds'],3),flush=True)
serve=pathlib.Path(tempfile.mkdtemp(prefix='loading-q1-native-'));(serve/'Loading-museum').symlink_to(ROOT/'out',target_is_directory=True)
with (OUT/'server.log').open('w') as log:
 server=subprocess.Popen([PY,'-m','http.server','4217','--bind','127.0.0.1','--directory',str(serve)],stdout=log,stderr=subprocess.STDOUT)
 try:
  ready=False
  for _ in range(100):
   if server.poll() is not None:raise RuntimeError('Own static server exited; not connecting to another server')
   try:
    with socket.create_connection(('127.0.0.1',4217),timeout=.1):ready=True;break
   except OSError:time.sleep(.1)
  if not ready:raise RuntimeError('Own static server not ready')
  identity=[]
  for p in sorted((ROOT/'out').rglob('*')):
   if p.is_file() and p.suffix in ['.html','.js','.css']:
    rel=p.relative_to(ROOT/'out').as_posix();url=env['WAAPI_URL']+('' if rel=='index.html' else rel);data=urllib.request.urlopen(url,timeout=10).read();remote=hashlib.sha256(data).hexdigest();identity.append({'path':rel,'local':sha(p),'served':remote,'equal':sha(p)==remote})
  report['servedIdentity']=identity;save();assert all(r['equal'] for r in identity)
  run('n2',[PY,'docs/maintenance/stage2a-repair-20261026/native/verify-coin-cancellation.py'],{'VERIFY_ROOT':str(ROOT),'VERIFY_BUILD':str(ROOT/'out'),'VERIFY_PHASE':'new-head-20261027','VERIFY_OUT':str(OUT/'n2.json')})
  run('n2-strict',[PY,'docs/maintenance/stage2a-repair-20261026/native/assess-native.py',str(OUT/'n2.json'),str(OUT/'n2-strict.json')])
  run('observation',[PY,'scripts/verify-waapi-observation.py'],{'WAAPI_RESULT':str(OUT/'observation.json'),'WAAPI_SCREENSHOTS':str(OUT/'screenshots')})
  run('stage1',[PY,'scripts/verify-waapi-stage1.py'],{'WAAPI_PARTIAL':str(OUT/'stage1.json')})
 finally:
  server.terminate();server.wait(timeout=10);report['serverStoppedAt']=stamp();report['headAtEnd']=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();report['sourceUnchangedDuringRun']=all(sha(ROOT/p)==h for p,h in source.items());report['finishedAt']=stamp();save()
