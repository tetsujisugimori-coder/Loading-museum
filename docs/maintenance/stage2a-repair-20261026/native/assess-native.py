"""Independent strict assessment of recorded native evidence, without replay or mutation.
Fixtures test the assessment predicate only, not browser/product behavior.
"""
import copy,gzip,json,sys
from pathlib import Path

def classify(c):
 ids=c.get('input',{}).get('ownedIds',[])
 after=c.get('ownedAfter',[])
 observed=[x.get('id') for x in after]
 input=c.get('mediaInput') or {}
 eligible=input.get('playState')=='running' and isinstance(input.get('currentTime'),(int,float)) and isinstance(input.get('duration'),(int,float)) and 0<=input['currentTime']<input['duration']
 if not eligible:return 'INPUT_MISSED'
 if len(ids)!=2 or len(set(ids))!=2 or c.get('animationId') not in ids:return 'FAIL_IDENTITY'
 if len(after)!=2 or len(set(observed))!=2 or set(observed)!=set(ids):return 'FAIL_MISSING_OR_WRONG_REFERENCE'
 calls=set()
 late=False
 for x in c.get('ownedCancels',[]):
  before=x.get('before',{});after_cancel=x.get('after',{})
  t=before.get('currentTime');duration=before.get('duration')
  # Native duration + source-defined delay; native endTime was not captured.
  delay=0 if x.get('id')==c.get('animationId') else 620
  expected_duration=650 if delay==0 else 240
  live=before.get('playState') in ['running','paused'] and isinstance(t,(int,float)) and duration==expected_duration and 0<=t<duration+delay
  idle=after_cancel.get('playState')=='idle' and after_cancel.get('currentTime') is None
  if x.get('id') in ids and idle and (before.get('playState')=='finished' or isinstance(t,(int,float)) and isinstance(duration,(int,float)) and t>=duration+delay):late=True
  if live and idle:calls.add(x.get('id'))
 if not set(ids)<=calls and late:return 'CANCELLED_AFTER_NATURAL_FINISH'
 if not set(ids)<=calls:return 'FAIL_CANCEL_EVIDENCE'
 if any(x.get('playState')!='idle' or x.get('currentTime') is not None for x in after):return 'FAIL_NOT_IDLE'
 if c.get('after',{}).get('playState')!='idle' or c.get('after',{}).get('currentTime') is not None:return 'FAIL_COIN_REFERENCE'
 return 'PASS'

positive={'input':{'ownedIds':[1,2]},'animationId':1,'mediaInput':{'playState':'running','currentTime':12,'duration':650},'after':{'playState':'idle','currentTime':None},'ownedAfter':[{'id':1,'playState':'idle','currentTime':None},{'id':2,'playState':'idle','currentTime':None}],'ownedCancels':[{'id':i,'before':{'playState':'running','currentTime':12,'duration':650 if i==1 else 240},'after':{'playState':'idle','currentTime':None}} for i in [1,2]]}
controls=[{'name':'complete pair accepted','pass':classify(positive)=='PASS'}]
patches=[('missing score ref',{'ownedAfter':[positive['ownedAfter'][0]]}),('duplicate ref',{'ownedAfter':[positive['ownedAfter'][0],positive['ownedAfter'][0]]}),('different ref',{'ownedAfter':[positive['ownedAfter'][0],{'id':3,'playState':'idle','currentTime':None}]}),('missing score cancellation',{'ownedCancels':[positive['ownedCancels'][0]]}),('no cancellation',{'ownedCancels':[]}),('input already finished',{'mediaInput':{'playState':'finished','currentTime':650,'duration':650}}),('missing captured IDs',{'input':{}}),('duplicate captured IDs',{'input':{'ownedIds':[1,1]}}),('score remains running',{'ownedAfter':[positive['ownedAfter'][0],{'id':2,'playState':'running','currentTime':80}]})]
late=copy.deepcopy(positive['ownedCancels']);late[0]['before']={'playState':'finished','currentTime':650,'duration':650}
patches.append(('natural finish before cancel',{'ownedCancels':late}))
ended=copy.deepcopy(positive['ownedCancels']);ended[1]['before']={'playState':'running','currentTime':860,'duration':240}
patches.append(('score reached source-defined end before cancel',{'ownedCancels':ended}))
for name,patch in patches:
 c=copy.deepcopy(positive);c.update(patch);controls.append({'name':name,'pass':classify(c)!='PASS','classification':classify(c)})
path=Path(sys.argv[1]);d=json.loads(gzip.decompress(path.read_bytes()).decode() if path.suffix=='.gz' else path.read_text());result={'input':path.name,'scriptSha256':d.get('scriptSha256'),'timingContract':{'coinDuration':650,'scoreNativeDuration':240,'scoreSourceDelay':620,'scoreArithmeticEnd':860,'source':'app/data/waapiSamples.ts','nativeEndTimeCaptured':False},'strictControls':controls,'conditions':[]}
controls_pass=all(x['pass'] for x in controls) and d.get('positiveControl',{}).get('accepted') is True and all(x.get('rejected') is True for x in d.get('negativeControls',[])) and len(d.get('negativeControls',[]))==4
for r in d['conditions']:
 cases=[{'action':c['action'],'classification':classify(c),'animationId':c.get('animationId'),'ownedIds':c.get('input',{}).get('ownedIds'),'mediaInput':c.get('mediaInput'),'ownedAfter':c.get('ownedAfter'),'ownedCancelCount':len(c.get('ownedCancels',[]))} for c in r['cancellation']]
 complete=r['status'] not in ['EXCEPTION','RUNNING'] and len(r['checks'])==38 and len(cases)==2 and {c['action'] for c in cases}=={'Replay','COLLECT'}
 verdict='PASS' if controls_pass and complete and all(c['classification']=='PASS' for c in cases) and all(x['pass'] for x in r['checks']) and r.get('pausedDiagnostic',{}).get('pass') and not r['pageerror'] else 'PARTIAL' if not complete or any(c['classification']=='INPUT_MISSED' for c in cases) else 'FAIL'
 result['conditions'].append({'engine':r['engine'],'width':r['width'],'status':verdict,'complete':complete,'cases':cases,'checks':len(r['checks']),'failedChecks':[x['name'] for x in r['checks'] if not x['pass']],'pausedDiagnostic':r.get('pausedDiagnostic',{}).get('pass'),'pageerror':r['pageerror']})
result['status']='PASS' if controls_pass and len(result['conditions'])==6 and {(x['engine'],x['width']) for x in result['conditions']}=={(e,w) for e in ['chromium','webkit'] for w in [375,390,765]} and all(x['status']=='PASS' for x in result['conditions']) else 'NOT_PASS'
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result['status'],[(x['engine'],x['width'],x['status']) for x in result['conditions']])
