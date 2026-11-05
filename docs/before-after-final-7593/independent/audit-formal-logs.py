from pathlib import Path
import json,hashlib,subprocess,urllib.parse,re
root=Path('work/independent/final-7593');HEAD='7593e5136efc90c6bccf63fa2fc3e429b51a128d';TREE='d453f5aab866cd5194b831080571208ef3463a56';sha=lambda b:hashlib.sha256(b).hexdigest()
all_records=[];audits=[]
for job in [127469469128,127469469197,127469469350,127469469289]:
 text=(root/f'job-{job}.log').read_text();records=[]
 for line in text.splitlines():
  i=line.find('{')
  if i>=0:
   try:records.append(json.loads(line[i:]))
   except json.JSONDecodeError:pass
 assert 'HEAD is now at 7593e51' in text and '##[error]'not in text
 main=next(r for r in records if r.get('expected')==2);assert main['head']==HEAD and main['pass']and main['cases']==2 and main['controls']==10 and main['errors']==[]
 cases=[r for r in records if 'caseComplete'in r];assert len(cases)==2 and {r['caseComplete']['motion']for r in cases}=={'no-preference','reduce'}
 audited_cases=[]
 for c in cases:
  assert c['head']==HEAD and c['caseComplete']['engine']=='webkit'and c['checks']>0
  width=c['raster'][0]['frame']['cssWidth'];sequence=-1;pointer_examples=[]
  for n in c['nativePointer']:
   d=n['nativePointer'];assert d['start']['trusted']and d['end']['trusted']and d['start']['id']==d['end']['id']and d['start']['pointerType']==d['end']['pointerType'];assert d['end']['type']in ('pointermove','pointerup')and not d['moveAfterUp']and any(m['x']!=d['start']['x']for m in d['moves']);assert d['end']['sequence']>sequence;sequence=d['end']['sequence']
   expected=max(0,min(100,n['startValue']+(d['end']['x']-d['start']['x'])/n['width']*100));assert n['startValue']==50 and abs(expected-n['expected'])<1e-12
   pointer_examples.append({'startX':d['start']['x'],'endX':d['end']['x'],'width':n['width'],'startValue':50,'independentExpected':expected,'recordedExpected':n['expected'],'rangeRoundedExpected':int(expected+.5)})
  for m in c['masks']:
   expected=[0,width*(100-m['maskExpected'])/100,0,0];assert all(abs(a-b)<=.05 for a,b in zip(m['edgesCSS'],expected))
  cold=c['coldRequestFailure'];assert len(cold)==1;cold=cold[0]['coldRequestFailure'];assert cold['abortedRequests']>=1 and cold['alertObserved']and cold['playbackDisabled']and cold['explicitRetryReady']and cold['resetValue']==50 and cold['errors']==[];assert all(urllib.parse.urlsplit(u).path=='/Loading-museum/compare/restoration-after.svg'for u in cold['abortedURLs'])
  controls=c['controls'];assert len(controls)==5 and all(not x['result']['pass']for x in controls)
  assert {x['fault']for x in controls}=={'mask-edge-0-one-pixel','mask-edge-100-one-pixel','image-shift-one-pixel','mask-fixed','alpha-fixed'}
  for ctrl in controls:
   if ctrl.get('kind')=='geometry':assert re.search(r'!=.*±',ctrl['result']['reason'])
   else:assert ctrl['result']['fraction']>=.002
  assert all(r['frame']['marginX']==r['frame']['marginY']==1 for r in c['raster'])
  assert sum(not r['pass']for r in c['raster'])==2
  audited_cases.append({'condition':c['caseComplete'],'checks':c['checks'],'rawPointerAssertions':len(pointer_examples),'pointerExamples':pointer_examples[:2],'masks':len(c['masks']),'coldRequest':cold,'geometryControls':[x for x in controls if x.get('kind')=='geometry'],'pixelControls':[{'fault':x['fault'],'fraction':x['result']['fraction']}for x in controls if x.get('kind')!='geometry'],'rasterMeasurements':len(c['raster']),'roiMargin':1})
 probe=next((r for r in records if r.get('engine')=='webkit'),None)
 if job==127469469128:
  assert probe and probe['head']==HEAD and probe['tree']==TREE and probe['dirty']==''and probe['pass']and probe['width']==375 and probe['motion']=='no-preference'
  assert sha(subprocess.check_output(['git','show',HEAD+':scripts/verify-before-after-independent.mjs']))==probe['scriptSHA256']
  for f,h in probe['sourceSHA256'].items():assert sha(subprocess.check_output(['git','show',HEAD+':'+f]))==h
  assert sum(x.get('negativeControl',False)and not x['pass']for x in probe['pixelResults'])==4
  assert all(x['pass']and x['wrong']==0 for x in probe['pixelResults']if not x.get('negativeControl'))
  (root/'formal-webkit-probe-report.json').write_text(json.dumps(probe,indent=2))
 audits.append({'job':job,'summary':main,'cases':audited_cases,'independentProbePass':probe['pass']if probe else None,'recordedUploadDigest':re.findall(r'SHA256 digest of uploaded artifact zip is ([0-9a-f]{64})',text),'zipBytesVerified':False})
result={'head':HEAD,'tree':TREE,'directGithubLogsAudited':True,'jobs':audits,'eightPrimaryWebKitConditionsPass':True,'independentWebKit375NormalProbePass':True,'allPrimaryRoiMarginsOnePixel':True,'trustedPointerExpectationsRecomputedFromInputs':True,'coldRequestFailureActuallyInjected':True,'pngHashesInLogsOnlyNotBytes':True,'zipBytesAudit':'BLOCKED by proxy transfer-host CONNECT403; no retry','allNineWorkflowConclusion':'pending parent confirmation'}
(root/'formal-webkit-log-audit.json').write_text(json.dumps(result,indent=2));print(json.dumps({'head':HEAD,'jobs':len(audits),'primaryConditions':sum(len(x['cases'])for x in audits),'controlRejections':40,'independentProbePass':True,'allRoiOnePixel':True,'zipBytesVerified':False}))
