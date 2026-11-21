"""Read-only evidence decoder. Never extracts or rewrites original/nested ZIPs."""
import hashlib,io,json,pathlib,stat,sys,zipfile
def safe(z):
 names=z.namelist()
 if len(names)!=len(set(names)):raise ValueError('duplicate ZIP entry')
 if z.testzip():raise ValueError('ZIP CRC failure')
 for i in z.infolist():
  p=pathlib.PurePosixPath(i.filename)
  if p.is_absolute() or '..' in p.parts or ':' in i.filename or '\\' in i.filename or stat.S_ISLNK(i.external_attr>>16):raise ValueError('unsafe ZIP entry')
def protocol(z):
 safe(z);rows=[]
 for n in z.namelist():
  if n.endswith('.trace'):rows.extend(json.loads(s) for s in z.read(n).decode().splitlines())
 before=[x for x in rows if x.get('type')=='before'];after=[x for x in rows if x.get('type')=='after']
 if len({x['callId'] for x in after})!=len(after):raise ValueError('duplicate trace completion')
 ends={x['callId']:x for x in after}
 return {'calls':[{'before':b,'after':ends.get(b['callId'])} for b in before],'contexts':[x for x in rows if x.get('type')=='context-options'],'events':[x for x in rows if x.get('type')=='event'],'hasAutomaticImages':any(x.get('type')=='screencast-frame' for x in rows) or any(n.endswith('.jpeg') for n in z.namelist()),'hasSnapshots':any(x.get('type')=='frame-snapshot' for x in rows),'resources':[n for n in z.namelist() if n.startswith('resources/')],'entries':z.namelist()}
p=pathlib.Path(sys.argv[1]);body=p.read_bytes();files={};traces={}
with zipfile.ZipFile(io.BytesIO(body)) as z:
 safe(z)
 for i in z.infolist():
  if i.is_dir():continue
  b=z.read(i);item={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
  if i.filename.endswith('.json'):item['json']=json.loads(b)
  if i.filename.endswith('.sha256'):item['text']=b.decode()
  files[i.filename]=item
  if i.filename.endswith('-trace.zip'):
   with zipfile.ZipFile(io.BytesIO(b)) as t:traces[i.filename]=protocol(t)
print(json.dumps({'kind':'READ_ONLY_ORIGINAL_ZIP','zip':{'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'crc':'PASS'},'files':files,'traces':traces}))
