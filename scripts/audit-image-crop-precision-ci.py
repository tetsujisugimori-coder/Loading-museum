import hashlib, json, pathlib, subprocess, urllib.request, zipfile, sys
cfg=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
dest=pathlib.Path(cfg['dest']).resolve(); dest.mkdir(parents=True,exist_ok=True)
head,tree=cfg['head'],cfg['tree']; summary={'head':head,'tree':tree,'artifacts':[],'conditions':[],'pngs':0,'sourceChecks':0,'pngFaults':[]}
def sha(data): return hashlib.sha256(data).hexdigest()
def canonical(name):
    return subprocess.check_output(['git','show',head+':'+name]).decode('utf-8').replace('\r\n','\n').encode()
for a in cfg['artifacts']:
    assert a['workflow_run']['head_sha']==head
    target=dest/(str(a['id'])+'.zip')
    if not target.exists(): target.write_bytes(urllib.request.urlopen(a['download_url'],timeout=60).read())
    assert 'sha256:'+sha(target.read_bytes())==a['digest']
    with zipfile.ZipFile(target) as z:
        def read(p): return json.loads(z.read(p))
        def provenance(r):
            assert r['head']==head and r['tree']==tree and r['dirty']==''
            for name,digest in r.get('sourceCanonicalSHA256',r.get('sourceSHA256',{})).items():
                assert sha(canonical(name))==digest,(name,digest)
                summary['sourceChecks']+=1
        core=read('image-crop-browser/results.json'); precise=read('image-crop-precision-browser/results.json'); model=read('image-crop-precision-model/results.json'); controls=read('image-crop-controls/results.json')
        for r in [core,precise,model]: provenance(r); assert r['complete'] and not r['errors']
        assert len(model['checks'])==45 and all(c['status']=='PASS' for c in model['checks'])
        assert len({c['label']for c in model['checks']})==45
        assert len(core['cases'])==len(precise['cases'])==2
        assert all(c['status']=='PASS' and not c['pageerrors'] for c in core['cases'])
        assert all(c['result']=='REJECTED' for c in core['controls'])
        summary['pngFaults'].extend(core['controls'])
        for c in precise['cases']:
            assert c['status']=='PASS' and len(c['checks'])==26 and all(t['status']=='PASS' for t in c['checks'])
            assert not c['pageerrors'] and c['overflow']['scroll']<=c['overflow']['viewport']
            assert c['submits'] and all(s['trusted'] for s in c['submits'])
            for t in c['checks']:
                if t['label'].startswith('minimum/'):
                    assert t['cycles']==12 and len(t['sequence'])==12
                    assert t['before']['rect']==t['after']['rect'] and t['before']['fields']==t['after']['fields']
                    assert t['before']['confirmed']==t['after']['confirmed']
                    assert all(s['rect']==t['before']['rect'] and '数値を適用しました' in s['notice'] for s in t['sequence'])
            summary['conditions'].append({k:c[k]for k in ['engine','width','motion','version','status']})
        assert controls['originalBytesRestored'] and len(controls['results'])==5
        assert len({c['name']for c in controls['results']})==5
        assert all(c['result']=='REJECTED' and c['exit']==1 for c in controls['results'])
        pngnames=set()
        for folder,r in [('image-crop-browser',core),('image-crop-precision-browser',precise)]:
            for im in r['images']:
                member=folder+'/'+im['name']; assert sha(z.read(member))==im['sha256']; pngnames.add(member)
        assert pngnames=={n for n in z.namelist()if n.endswith('.png')}
        summary['pngs']+=len(pngnames)
        summary['artifacts'].append({k:a[k]for k in ['id','name','digest','size_in_bytes']})
        # Extract only the validated artifact files, within this audit directory.
        extract=dest/str(a['id']); extract.mkdir(exist_ok=True)
        for n in z.namelist():
            p=(extract/n).resolve(); assert p.is_relative_to(extract.resolve())
            if not n.endswith('/'): p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(z.read(n))
assert len(summary['artifacts'])==8 and len(summary['conditions'])==16
assert len({(c['engine'],c['width'],c['motion'])for c in summary['conditions']})==16
assert len(summary['pngFaults'])==4
summary['complete']=True; (dest/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items()if k not in ['conditions','artifacts']}))
