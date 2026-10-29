"""Verify served HTML/JS/CSS against local build, from server's own execution context."""
import json,urllib.request,hashlib,pathlib,datetime,sys
root=pathlib.Path('out');rows=[]
for f in [root/'index.html',*sorted(root.rglob('*.js')),*sorted(root.rglob('*.css'))]:
 p=f.relative_to(root).as_posix();url='http://127.0.0.1:4217/Loading-museum/'+('' if p=='index.html' else p)
 b=urllib.request.urlopen(url,timeout=10).read();a=hashlib.sha256(f.read_bytes()).hexdigest();z=hashlib.sha256(b).hexdigest();rows.append({'path':p,'localSha256':a,'servedSha256':z,'equal':a==z})
r={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'allEqual':all(x['equal'] for x in rows)}
pathlib.Path(sys.argv[1]).write_text(json.dumps(r,indent=2));assert r['allEqual'];print(len(rows),'served files match')
