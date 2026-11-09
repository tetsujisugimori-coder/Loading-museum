#!/usr/bin/env python3
"""Synthetic trace verifier closure tests. Not actual browser evidence."""
import importlib.util,json,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
generator=load('generator',ROOT/'generate-current-fixture.py')
verifier=load('verifier',ROOT/'frozen-current/scripts/audit-scroll-files.py')
record=json.loads((ROOT/'current-fixture/webkit-1280-reduce-tap-D-r3-plain.json').read_text())
OUT=ROOT/'trace-closure-fixtures';OUT.mkdir(exist_ok=True)
def captured(entries):return next(x for x in entries if x.get('type')=='after' and x.get('callId')=='finish')
def empty_capture(entries):captured(entries)['result']['value']=generator.encoded({})
def missing_final(entries):
 r=copy.deepcopy(record);del r['final'];captured(entries)['result']['value']=generator.encoded(r)
def identity_only(entries):captured(entries)['result']['value']=generator.encoded({'identity':record['identity']})
def duplicate_after(entries):
 entry=next(x for x in entries if x.get('type')=='after' and x.get('callId')=='input-0');bad=copy.deepcopy(entry);bad['error']={'message':'synthetic failure'};entries.insert(entries.index(entry),bad)
def finish_error(entries):captured(entries)['error']={'message':'synthetic capture failure'}
def input_error(entries):next(x for x in entries if x.get('type')=='after' and x.get('callId')=='input-0')['error']={'message':'synthetic input failure'}
def bad_final(entries):
 r=copy.deepcopy(record);r['final']['value']=999;captured(entries)['result']['value']=generator.encoded(r)
tests=[('positive',None,'PASS'),('empty_captured_record',empty_capture,'FAIL'),('missing_captured_final',missing_final,'FAIL'),('captured_identity_only',identity_only,'FAIL'),('duplicate_after_hides_input_failure',duplicate_after,'FAIL'),('capture_error',finish_error,'FAIL'),('input_error',input_error,'FAIL'),('captured_value_mismatch',bad_final,'FAIL')]
results=[]
for name,mutate,expected in tests:
 file=OUT/(name+'.zip');generator.trace_write(file,record,mutate)
 try:detail=verifier.trace(file,record);actual='PASS';error=None
 except Exception as e:actual='FAIL';error=str(e);detail=None
 result={'name':name,'expected':expected,'actual':actual,'satisfied':expected==actual,'error':error,'detail':detail};results.append(result);print(json.dumps(result))
(ROOT/'trace-closure-results.json').write_text(json.dumps({'syntheticOnly':True,'scope':'Direct binary trace verifier calls, not full aggregate.','tests':results},indent=2)+'\n')
