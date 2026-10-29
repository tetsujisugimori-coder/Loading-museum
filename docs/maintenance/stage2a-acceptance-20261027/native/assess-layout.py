"""Independent result-level checks; native suite and this assessor must both pass."""
import copy,datetime,hashlib,json,pathlib,sys
p=pathlib.Path(sys.argv[1]);rows=json.loads(p.read_text())
def turn_valid(sample):
 expected=420 if sample['motion']=='no-preference' else 1
 native=sample['native']
 return len(native['created'])==3 and len(native['settled'])==3 and all(a['duration']==expected for a in native['created']) and all(a['state']=='finished' and not a['pending'] for a in native['settled'])
base={'motion':'no-preference','native':{'created':[{'duration':420}]*3,'settled':[{'state':'finished','pending':False}]*3}}
controls=[]
for label,mutate,expected in [('valid',lambda x:None,True),('wrong duration',lambda x:x['native']['created'].__setitem__(0,{'duration':1}),False),('missing animation',lambda x:x['native']['created'].pop(),False),('still pending',lambda x:x['native']['settled'].__setitem__(0,{'state':'finished','pending':True}),False)]:
 sample=copy.deepcopy(base);mutate(sample);actual=turn_valid(sample);controls.append({'name':label,'expected':expected,'actual':actual});assert actual==expected
conditions=[]
for row in rows:
 actions=[x for x in row.get('turn',[]) if 'native'in x]
 conditions.append({'engine':row['engine'],'width':row['width'],'suiteStatus':row['status'],'geometrySamples':len(row.get('geometry',[])),'namedGroups':len(row.get('checks',[])),'turnActions':len(actions),'turnDurationsValid':len(actions)==6 and all(turn_valid(x) for x in actions),'layoutControlsPassed':len(row.get('layoutControls',[]))==7 and all(x['actual']==x['expected'] for x in row['layoutControls']),'schemeAndMotionReached':len(row.get('geometry',[]))==48 and all(x.get('schemeReached') and x.get('motionReached') for x in row['geometry'])})
passed=len(conditions)==6 and {(r['engine'],r['width'])for r in conditions}=={(e,w)for e in ['chromium','webkit']for w in [375,390,765]} and all(r['suiteStatus']=='PASS' and r['namedGroups']==7 and r['turnDurationsValid'] and r['layoutControlsPassed'] and r['schemeAndMotionReached'] for r in conditions)
out={'checkedAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(),'raw':str(p),'rawSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'controls':controls,'conditions':conditions,'status':'PASS'if passed else 'FAIL'}
pathlib.Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(out['status']);sys.exit(0 if passed else 1)
