#!/usr/bin/env python3
"""Positive real bytes; copied-trace negative mutations. Never modifies real evidence."""
import importlib.util,json,copy,zipfile,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/workspace/scratch/e622c1e9421e/loading-scroll-geometry/work/scroll-66f99c0')
spec=importlib.util.spec_from_file_location('verifier',ROOT/'frozen-final/scripts/audit-scroll-files.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
OUT=ROOT/'final-binary-negative-fixtures';OUT.mkdir(exist_ok=True)
def encoded(x):
 if x is None:return {'v':'null'}
 if isinstance(x,bool):return {'b':x}
 if isinstance(x,(int,float)):return {'n':x}
 if isinstance(x,str):return {'s':x}
 if isinstance(x,list):return {'a':[encoded(y) for y in x]}
 return {'o':[{'k':k,'v':encoded(y)} for k,y in x.items()]}
positive=[];cases=[]
for method in ['drag','tap']:
 for condition in 'ABCD':
  for surface in ['product','plain']:
   name=f'chromium-375-normal-{method}-{condition}-r1-{surface}'
   r=json.loads((SOURCE/(name+'.json')).read_text());checks=[]
   for phase,ref in r['images'].items():checks.append(v.png((SOURCE/ref['file']).read_bytes(),375,900))
   proof=v.trace(SOURCE/(name+'-trace.zip'),r)
   positive.append({'trialId':name,'png':len(checks),'trace':proof,'sourceJsonSha256':hashlib.sha256((SOURCE/(name+'.json')).read_bytes()).hexdigest(),'sourceTraceSha256':hashlib.sha256((SOURCE/(name+'-trace.zip')).read_bytes()).hexdigest()})
name='chromium-375-normal-tap-A-r1-product';record=json.loads((SOURCE/(name+'.json')).read_text())
with zipfile.ZipFile(SOURCE/(name+'-trace.zip')) as z:original={n:z.read(n) for n in z.namelist()}
original_entries=[json.loads(x) for x in original['trace.trace'].decode().splitlines()]
finish_id=next(x['callId'] for x in original_entries if x.get('type')=='before' and x.get('params',{}).get('expression')=='()=>window.__scrollGeometry.finish()')
def finish(e):return next(x for x in e if x.get('type')=='after' and x.get('callId')==finish_id)
def empty(e):finish(e)['result']['value']=encoded({})
def missing_final(e):
 r=v.decode(finish(e)['result']['value']);del r['final'];finish(e)['result']['value']=encoded(r)
def only_id(e):finish(e)['result']['value']=encoded({'identity':record['identity']})
def input_after(e):
 call=next(x['callId'] for x in e if x.get('type')=='before' and x.get('method')=='touchscreenTap');return next(x for x in e if x.get('type')=='after' and x.get('callId')==call)
def duplicate_after(e):
 target=input_after(e);bad=copy.deepcopy(target);bad['error']={'message':'Injected synthetic error'};e.insert(e.index(target),bad)
def duplicate_before(e):
 target=next(x for x in e if x.get('type')=='before' and x.get('method')=='touchscreenTap');e.insert(e.index(target),copy.deepcopy(target))
def capture_error(e):finish(e)['error']={'message':'Injected synthetic capture error'}
def input_error(e):input_after(e)['error']={'message':'Injected synthetic input error'}
def mismatch(e):
 r=v.decode(finish(e)['result']['value']);r['final']['value']=999;finish(e)['result']['value']=encoded(r)
def no_shots(e):e[:]=[x for x in e if not(x.get('type')=='before' and x.get('method')=='screenshot')]
for name,mutate in [('empty_capture',empty),('missing_final',missing_final),('identity_only',only_id),('duplicate_after_hides_error',duplicate_after),('duplicate_before',duplicate_before),('capture_error',capture_error),('input_error',input_error),('final_value_mismatch',mismatch),('missing_screenshot_phases',no_shots)]:
 entries=copy.deepcopy(original_entries);mutate(entries);file=OUT/(name+'.zip')
 with zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED) as z:
  for n,b in original.items():z.writestr(n,('\n'.join(json.dumps(x) for x in entries)+'\n').encode() if n=='trace.trace' else b)
 try:detail=v.trace(file,record);actual='PASS';error=None
 except Exception as e:actual='FAIL';error=str(e)
 cases.append({'name':name,'expected':'FAIL','actual':actual,'satisfied':actual=='FAIL','error':error})
result={'scope':'16 real Chromium positive row byte checks plus copied-trace synthetic negatives; no full-matrix or physical-device claim.','source':str(SOURCE),'positiveRealRows':len(positive),'positiveRealPng':sum(x['png'] for x in positive),'positiveRealTrace':len(positive),'positive':positive,'negative':cases,'binaryVerifierSha256':hashlib.sha256((ROOT/'frozen-final/scripts/audit-scroll-files.py').read_bytes()).hexdigest()}
(ROOT/'final-binary-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:val for k,val in result.items() if k!='positive'},indent=2));assert all(x['satisfied'] for x in cases)
