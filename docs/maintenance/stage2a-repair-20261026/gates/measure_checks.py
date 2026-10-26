#!/usr/bin/env python3
"""Read-only product verification: same npm run check, worker configuration only."""
import datetime, hashlib, json, os, pathlib, re, resource, subprocess, time
ROOT=pathlib.Path.cwd(); OUT=ROOT/'docs/maintenance/stage2a-repair-20261026/gates'
def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def text(path):
 try:return pathlib.Path(path).read_text()
 except OSError:return None
def snapshot():
 # Avoid environment secrets and command arguments. Namespace-visible process metrics only.
 return {'at':utc(),'loadavg':text('/proc/loadavg'),'cpu_stat':(text('/proc/stat') or '').splitlines()[:1], 'processes':subprocess.run(['ps','-eo','pid,ppid,pcpu,comm'],capture_output=True,text=True).stdout}
def parse(log):
 clean=re.sub(r'\x1b\[[0-9;]*m','',log)
 result={'node':{},'vitest_summary':None,'failure_locations':[], 'timeout_mentions':clean.count('Test timed out in 5000ms')}
 for k in ['tests','pass','fail','cancelled','skipped','todo']:
  m=re.search(r'^(?:#|ℹ) '+k+r' (\d+)$',clean,re.M)
  if m:result['node'][k]=int(m.group(1))
 m=re.search(r'^\s*Tests\s+(.+)$',clean,re.M)
 if m:result['vitest_summary']=m.group(1)
 result['failure_locations']=re.findall(r'^\s*FAIL\s+(.+)$',clean,re.M)
 result['vitest_duration']=re.findall(r'^\s*Duration\s+(.+)$',clean,re.M)
 return result
# Parser negative controls are deliberately separate from product results.
assert parse('# tests 49\n# pass 49\n# fail 0\n Tests 2 failed | 120 passed (122)\n FAIL tests/example.ts > sentinel\nError: Test timed out in 5000ms.')['failure_locations']==['tests/example.ts > sentinel']
assert parse('# tests 49\n# pass 49\n# fail 0\n Tests 122 passed (122)')['vitest_summary']=='122 passed (122)'
meta={'schema_version':1,'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'cpu_count':os.cpu_count(),'affinity_count':len(os.sched_getaffinity(0)),'cgroup_cpu_max':text('/sys/fs/cgroup/cpu.max'),'product_hashes':{},'measurement_notes':['Process list and CPU counters are namespace-visible, not proof that the host had no other workloads.','No concurrent browser/build was intentionally started by this verification team.','Each npm run check includes lint, typecheck, build, Node and Vitest.','Existing assertions and package registration are retained; added N2 cases and Q1 responsibility split are documented. The 5000ms limit is unchanged.','Synthetic parser negative controls passed; they are not product tests.'],'runs':[]}
for path in ['package.json','package-lock.json','app/components/WaapiSampleGallery.tsx','app/components/WaapiGameObservation.tsx','tests/waapi-gallery.test.tsx','tests/waapi-observation.test.tsx']:
 meta['product_hashes'][path]=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
for mode in ['default-1','default-2','default-3','worker1-1','worker1-2']:
 env=os.environ.copy()
 for key in list(env):
  if key.startswith('VITEST_'):env.pop(key)
 overrides={}
 if mode.startswith('worker1'):
  overrides={k:'1' for k in ['VITEST_MAX_FORKS','VITEST_MIN_FORKS','VITEST_MAX_THREADS','VITEST_MIN_THREADS']};env.update(overrides)
 start=time.monotonic(); before=resource.getrusage(resource.RUSAGE_CHILDREN)
 row={'name':mode,'command':['npm','run','check'],'environment_overrides':overrides,'started_at':utc(),'samples':[]}
 logfile=OUT/(mode+'.log')
 with logfile.open('w') as f:
  p=subprocess.Popen(['npm','run','check'],stdout=f,stderr=subprocess.STDOUT,env=env)
  while p.poll() is None:
   row['samples'].append(snapshot());time.sleep(2)
  row['exit_code']=p.returncode
 after=resource.getrusage(resource.RUSAGE_CHILDREN)
 row.update({'finished_at':utc(),'elapsed_seconds':round(time.monotonic()-start,3),'child_cpu_user_seconds':round(after.ru_utime-before.ru_utime,3),'child_cpu_system_seconds':round(after.ru_stime-before.ru_stime,3),'log':logfile.name,'result':parse(logfile.read_text())})
 meta['runs'].append(row);(OUT/'results.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in row.items() if k!='samples'},ensure_ascii=False),flush=True)
print('ALL FIVE CHECK RUNS COMPLETE',flush=True)
