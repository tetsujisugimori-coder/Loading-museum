#!/usr/bin/env python3
"""Generate SYNTHETIC full768 validator fixtures, never browser evidence."""
import hashlib,itertools,json,struct,zlib,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'current-fixture';OUT.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
compact=lambda v:json.dumps(v,separators=(',',':'),ensure_ascii=False)
sources={'SYNTHETIC_FIXTURE_ONLY':'not-browser-evidence'}
binding={'head':'synthetic-current-head','tree':'synthetic-current-tree','protocolHash':'synthetic-current-protocol','sourceHash':sha(compact(sources).encode())}
def encoded(v):
 if v is None:return {'v':'null'}
 if isinstance(v,bool):return {'b':v}
 if isinstance(v,(int,float)):return {'n':v}
 if isinstance(v,str):return {'s':v}
 if isinstance(v,list):return {'a':[encoded(x) for x in v]}
 return {'o':[{'k':k,'v':encoded(x)} for k,x in v.items()]}
def trace_entries(r):
 i=r['identity'];entries=[{'type':'context-options','browserName':i['engine'],'options':{'viewport':{'width':i['width'],'height':900},'hasTouch':True,'reducedMotion':'reduce' if i['motion']=='reduce' else 'no-preference'}},{'type':'before','callId':'install','method':'evaluateExpression','params':{'expression':'SYNTHETIC_INSTALL_RECORDER','arg':{'value':encoded(i)}}},{'type':'after','callId':'install'}]
 methods={'mouse.move':'mouseMove','mouse.down':'mouseDown','mouse.up':'mouseUp','touchscreen.tap':'touchscreenTap'}
 for n,v in enumerate(r['inputs']):entries.extend([{'type':'before','callId':f'input-{n}','method':methods[v['kind']],'params':{'x':v['x'],'y':v['y']}},{'type':'after','callId':f'input-{n}'}])
 entries.extend([{'type':'before','callId':'finish','method':'evaluateExpression','params':{'expression':'()=>window.__scrollGeometry.finish()'}},{'type':'after','callId':'finish','result':{'value':encoded(r)}}]);return entries
def trace_write(file,r,mutate=None):
 entries=trace_entries(r)
 if mutate:mutate(entries)
 with zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED) as z:z.writestr('trace.trace','\n'.join(compact(x) for x in entries)+'\n')
def png(width,height):
 def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
 raw=(b'\x00'+b'\xee\xee\xee'*width)*height
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
def save(file,b):
 (OUT/file).write_bytes(b);return {'file':file,'sha256':sha(b),'bytes':len(b)}
def record(i):
 y=410 if i['surface']=='product' and i['condition'] in 'CD' else 310;sy=1000 if i['surface']=='product' and i['condition'] in 'BD' else 0;w=i['width']-48
 points=[{'trialId':i['trialId'],'seq':n,'t':n*10,'rect':{'x':24,'y':y,'width':w,'height':44,'left':24,'top':y,'right':24+w,'bottom':y+44},'viewport':{'innerWidth':i['width'],'innerHeight':900,'width':i['width'],'height':900,'offsetLeft':0,'offsetTop':0,'scale':1,'devicePixelRatio':1},'scroll':{'x':0,'y':sy,'scrollingElement':{'tag':'HTML','left':0,'top':sy},'documentElement':{'left':0,'top':sy},'body':{'left':0,'top':0}},'value':0 if n==0 else 50} for n in range(6)]
 x0=34+(w-20)*.5;x1=34+(w-20)*.75;cy=y+22;drag=i['method']=='drag'
 types=['pointerdown','input','change','pointerup'] if drag else ['pointerdown','touchstart','pointerup','touchend']
 events=[{'trialId':i['trialId'],'index':n,'t':(n+1)*10,'type':t,'target':'range','pointerId':1,'pointerType':'mouse' if drag else 'touch','touchId':1,'clientX':x1,'clientY':cy,'pageX':x1,'pageY':cy+sy,'isTrusted':True,'timeStamp':(n+1)*10,'cancelable':True,'defaultPrevented':False,'snapshot':points[n+1]} for n,t in enumerate(types)]
 kinds=['mouse.move','mouse.down']+['mouse.move']*10+['mouse.up'] if drag else ['touchscreen.tap']
 inputs=[{'trialId':i['trialId'],'index':n,'t':n*.5,'kind':k,'x':x1 if not drag or n==12 else x0 if n<2 else x0+(x1-x0)*(n-1)/10,'y':cy} for n,k in enumerate(kinds)]
 return {'schemaVersion':'iad-scroll-geometry-1','identity':i,'initial':points[0],'final':points[-1],'points':points,'events':events,'inputs':inputs,'physicalInput':'NOT_TESTED','startedAt':'2026-11-09T00:00:00Z','finishedAt':'2026-11-09T00:00:01Z','observer':'passive capture + requestAnimationFrame','pageErrors':[],'syntheticOnly':True}
def main():
 report={'schemaVersion':'iad-scroll-run-1','binding':binding,'sourceHashes':sources,'rows':[],'errors':[],'status':'TECHNICAL_PASS','fullMatrix':True,'expectedRows':768,'syntheticOnly':True}
 images={w:png(w,900) for w in [375,390,765,1280]}
 for engine,width,motion,method,condition,repetition,surface in itertools.product(['chromium','webkit'],[375,390,765,1280],['normal','reduce'],['drag','tap'],['A','B','C','D'],[1,2,3],['product','plain']):
  pair=f'{engine}-{width}-{motion}-{method}-{condition}-r{repetition}';trial=pair+'-'+surface
  i={**binding,'trialId':trial,'pairId':pair,'engine':engine,'width':width,'motion':motion,'method':method,'condition':condition,'repetition':repetition,'surface':surface,'browserVersion':'SYNTHETIC-1','inputPath':'Playwright mouse drag' if method=='drag' else 'Playwright touchscreen tap'}
  r=record(i);r['images']={phase:save(trial+'-'+('tap-return' if phase=='during' and method=='tap' else phase)+'.png',images[width]) for phase in ['before','during','after']}
  trace_write(OUT/(trial+'-trace.zip'),r);trace=(OUT/(trial+'-trace.zip')).read_bytes()
  report['rows'].append({k:i[k] for k in ['trialId','pairId','engine','width','motion','method','condition','repetition','surface']}|{'json':save(trial+'.json',compact(r).encode()),'images':r['images'],'trace':{'file':trial+'-trace.zip','sha256':sha(trace),'bytes':len(trace)},'error':None,'result':{'valid':True,'outcome':'COMPLETED'}})
 (OUT/'report.json').write_text(compact(report));(ROOT/'current-binding.json').write_text(compact(binding));(OUT/'SYNTHETIC_ONLY.txt').write_text('Generated validator fixtures only. No browser ran. PNGs are solid placeholders; traces are generated JSON.\n');print('Generated 768 synthetic records and 384 pairs. NOT browser evidence.')
if __name__=='__main__':main()
