#!/usr/bin/env python3
"""Verify PNG pixels and actual Playwright trace records against each captured trial."""
import sys,json,struct,zlib,zipfile,hashlib
from pathlib import Path

def png(data,width,height):
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('PNG_SIGNATURE')
    pos=8;compressed=b'';ended=False;ihdr=None
    while pos<len(data):
        n=struct.unpack('>I',data[pos:pos+4])[0];kind=data[pos+4:pos+8];body=data[pos+8:pos+8+n];crc=data[pos+8+n:pos+12+n]
        if len(crc)!=4 or zlib.crc32(kind+body)&0xffffffff!=struct.unpack('>I',crc)[0]:raise ValueError('PNG_CRC')
        if kind==b'IHDR':ihdr=struct.unpack('>IIBBBBB',body)
        if kind==b'IDAT':compressed+=body
        pos+=n+12
        if kind==b'IEND':ended=True;break
    if not ended or pos!=len(data) or not ihdr:raise ValueError('PNG_STRUCTURE')
    w,h,depth,color,compression,filtering,interlace=ihdr
    if (w,h)!=(width,height):raise ValueError('PNG_VIEWPORT_DIMENSIONS')
    if depth!=8 or color not in (2,6) or compression or filtering or interlace:raise ValueError('PNG_UNSUPPORTED_LAYOUT')
    raw=zlib.decompress(compressed);stride=1+w*(3 if color==2 else 4)
    if len(raw)!=stride*h or any(raw[i*stride]>4 for i in range(h)):raise ValueError('PNG_RASTER')
    return {'width':w,'height':h,'decodedBytes':len(raw)}

def decode(v,refs=None):
    refs={} if refs is None else refs
    if not isinstance(v,dict):raise ValueError('TRACE_SERIALIZATION')
    if 'ref' in v:return refs[v['ref']]
    for k in ['s','n','b']:
        if k in v:return v[k]
    if 'v' in v:
        if v['v'] in ['null','undefined']:return None
        raise ValueError('TRACE_NONFINITE')
    if 'o' in v:
        out={};refs[v.get('id')]=out
        for p in v['o']:out[p['k']]=decode(p['v'],refs)
        return out
    if 'a' in v:
        out=[];refs[v.get('id')]=out
        out.extend(decode(x,refs) for x in v['a']);return out
    raise ValueError('TRACE_UNSUPPORTED_SERIALIZATION')

def trace(file,record):
    with zipfile.ZipFile(file) as z:
        names=z.namelist()
        if len(names)!=len(set(names)) or any(n.startswith('/') or '..' in Path(n).parts for n in names):raise ValueError('TRACE_UNSAFE_NAMES')
        if z.testzip() is not None:raise ValueError('TRACE_CRC')
        entries=[json.loads(line) for line in z.read('trace.trace').decode().splitlines()]
    identity=record['identity'];contexts=[x for x in entries if x.get('type')=='context-options']
    if len(contexts)!=1:raise ValueError('TRACE_CONTEXT')
    c=contexts[0];o=c['options']
    if c['browserName']!=identity['engine'] or o['viewport']!={'width':identity['width'],'height':900} or o['hasTouch'] is not True or o['reducedMotion']!=('reduce' if identity['motion']=='reduce' else 'no-preference'):raise ValueError('TRACE_ENVIRONMENT')
    begin=[];end=[]
    for n,x in enumerate(entries):
        if x.get('type')!='before':continue
        p=x.get('params',{})
        try:arg=decode(p['arg']['value'])
        except (KeyError,ValueError,TypeError):arg=None
        if isinstance(arg,dict) and arg.get('trialId')==identity['trialId'] and 'head' in arg:begin.append((n,x,arg))
        if p.get('expression')=='()=>window.__scrollGeometry.finish()':end.append((n,x))
    if len(begin)!=1 or len(end)!=1 or begin[0][0]>=end[0][0] or begin[0][2]!=identity:raise ValueError('TRACE_TRIAL_BINDING')
    after={x['callId']:x for x in entries if x.get('type')=='after'}
    finish=after[end[0][1]['callId']]
    if finish.get('error'):raise ValueError('TRACE_CAPTURE_ERROR')
    captured=decode(finish['result']['value'])
    for k,v in captured.items():
        if record.get(k)!=v:raise ValueError('TRACE_RAW_RECORD_DIFFER:'+k)
    methods={'mouse.move':'mouseMove','mouse.down':'mouseDown','mouse.up':'mouseUp','touchscreen.tap':'touchscreenTap'}
    actions=[x for x in entries[begin[0][0]:end[0][0]] if x.get('type')=='before' and x.get('method') in methods.values()]
    if len(actions)!=len(record['inputs']):raise ValueError('TRACE_INPUT_COUNT')
    for action,command in zip(actions,record['inputs']):
        if action['method']!=methods[command['kind']]:raise ValueError('TRACE_INPUT_ORDER')
        if action['method'] in ['mouseMove','touchscreenTap'] and any(abs(action['params'][k]-command[k])>.001 for k in ['x','y']):raise ValueError('TRACE_INPUT_COORDINATES')
        if action['callId'] not in after or after[action['callId']].get('error'):raise ValueError('TRACE_INPUT_FAILURE')
    return {'entries':len(names),'events':len(entries),'inputActions':len(actions),'recordMatched':True}

def audit(root):
    report=json.loads((root/'report.json').read_text());errors=[];rows=[]
    for row in report['rows']:
        try:
            for item in [row['json'],row['trace'],*row['images'].values()]:
                if Path(item['file']).name!=item['file']:raise ValueError('UNSAFE_FILE_REFERENCE')
            record=json.loads((root/row['json']['file']).read_text())
            images={phase:png((root/ref['file']).read_bytes(),row['width'],900) for phase,ref in row['images'].items()}
            proof=trace(root/row['trace']['file'],record);rows.append({'trialId':row['trialId'],'images':images,'trace':proof})
        except Exception as e:errors.append({'trialId':row.get('trialId'),'error':str(e)})
    return {'schemaVersion':'iad-scroll-binary-audit-1','status':'FAIL' if errors else 'PASS','rows':len(rows),'png':sum(len(r['images']) for r in rows),'traces':len(rows),'errors':errors,'details':rows,'scope':'Byte validation and matching recorded Playwright output; not physical-device or observer-neutrality proof.'}
if __name__=='__main__':
    result=audit(Path(sys.argv[1]));print(json.dumps(result));sys.exit(1 if result['errors'] else 0)
