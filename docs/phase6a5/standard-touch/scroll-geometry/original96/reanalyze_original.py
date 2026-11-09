#!/usr/bin/env python3
"""Read-only audit of the official PR #76 artifact. Does not import or change the repo.

All analysis is reconstructed from bytes inside the original ZIP, never prior summaries.
Absent fields are NOT_RECORDED, JSON null stays null, and numerical zero stays zero.
The eight rect fields are emitted twice: raw (four absent) and explicitly derived.
"""
import argparse
import collections
import csv
import hashlib
import itertools
import json
import re
import struct
import zipfile
import zlib
from pathlib import Path

HEAD = 'cc1a760209e0dba9c94f17f64ad26acf71576bcc'
EXPECTED_ZIP_SHA256 = '33c49490cd6f3e4f7bf33156c8806bc215f41a852d2475a4cd959d5a42ecbfc0'
NR = 'NOT_RECORDED'
RECT_FIELDS = ('x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left')
VIEWPORT_FIELDS = ('width', 'height', 'scale', 'visualWidth', 'visualHeight', 'offsetLeft', 'offsetTop')
TYPES = ('pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','input','change','gotpointercapture','lostpointercapture')
ROW_RE = re.compile(r'standard-touch/(chromium|webkit)-(375|390|765|1280)-(normal|reduce)-(plain|product)-(tap|drag)-(off|minimal|full)\.json')

def sha(b):
    return hashlib.sha256(b).hexdigest()

def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

def raw_fields(value, fields):
    value = value if isinstance(value, dict) else {}
    return {k: value.get(k, NR) for k in fields}

def rect8(rect):
    raw = raw_fields(rect, RECT_FIELDS)
    derived = dict(raw)
    for key, formula in (('left', lambda: raw['x']), ('top', lambda: raw['y']),
                         ('right', lambda: raw['x'] + raw['width']),
                         ('bottom', lambda: raw['y'] + raw['height'])):
        if raw[key] == NR:
            try:
                derived[key] = formula()
            except (TypeError, KeyError):
                derived[key] = NR
    return raw, derived

def geometry(s):
    s = s if isinstance(s, dict) else {}
    raw, derived = rect8(s.get('rect'))
    return {
        'rect8_recorded': raw,
        'rect8_derived_not_directly_measured': derived,
        'viewport': raw_fields(s.get('viewport'), VIEWPORT_FIELDS),
        'window_scroll': raw_fields(s.get('scroll'), ('x', 'y')),
        'documentElement_scrollLeft': s.get('documentElement', {}).get('scrollLeft', NR),
        'documentElement_scrollTop': s.get('documentElement', {}).get('scrollTop', NR),
        'body_scrollLeft': s.get('body', {}).get('scrollLeft', NR),
        'body_scrollTop': s.get('body', {}).get('scrollTop', NR),
        'document_scrollingElement': s.get('scrollingElement', NR),
        'devicePixelRatio': s.get('devicePixelRatio', NR),
        'at': s.get('at', NR),
    }

def png_check(b):
    assert b[:8] == b'\x89PNG\r\n\x1a\n', 'Bad PNG signature'
    pos, chunks, compressed = 8, [], bytearray()
    dimensions = None
    while pos < len(b):
        size = struct.unpack('>I', b[pos:pos+4])[0]
        typ = b[pos+4:pos+8]
        payload = b[pos+8:pos+8+size]
        crc = struct.unpack('>I', b[pos+8+size:pos+12+size])[0]
        assert zlib.crc32(typ + payload) & 0xffffffff == crc, 'PNG CRC mismatch'
        chunks.append(typ.decode('ascii'))
        if typ == b'IHDR':
            dimensions = dict(zip(('width','height','bitDepth','colorType','compression','filter','interlace'), struct.unpack('>IIBBBBB', payload)))
        if typ == b'IDAT':
            compressed.extend(payload)
        pos += 12 + size
        if typ == b'IEND':
            break
    assert pos == len(b) and chunks[-1] == 'IEND'
    pixels = zlib.decompress(compressed)
    return {'signature_crc_idat': 'PASS', **dimensions, 'decompressedBytes': len(pixels)}

def flatten(v, prefix='', out=None):
    out = {} if out is None else out
    if isinstance(v, dict):
        for k, val in v.items():
            flatten(val, f'{prefix}.{k}' if prefix else k, out)
    elif isinstance(v, list):
        out[prefix] = canonical(v)
    else:
        out[prefix] = v
    return out

def write_csv(path, rows):
    rows = [flatten(r) for r in rows]
    rows = [{k: 'null' if v is None else v for k,v in r.items()} for r in rows]
    fields = list(dict.fromkeys(k for r in rows for k in r))
    with path.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

def observed_counts(d):
    mode = d['metadata']['mode']
    recorded = [e for e in d['events'] if e.get('phase') == 'capture']
    omitted = set(TYPES) if mode == 'off' else {'touchmove','gotpointercapture','lostpointercapture'} if mode == 'minimal' else set()
    c = collections.Counter(e['type'] for e in recorded)
    return {t: NR if t in omitted else c[t] for t in TYPES}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip', type=Path, default=Path('/workspace/shared/loading76-independent-calculator/13631601940.zip'))
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    zip_bytes = args.zip.read_bytes()
    assert sha(zip_bytes) == EXPECTED_ZIP_SHA256
    z = zipfile.ZipFile(args.zip)
    assert len(z.namelist()) == len(set(z.namelist())), 'Duplicate ZIP names'
    report_bytes = z.read('standard-touch/report.json')
    report = json.loads(report_bytes)
    report_rows = {r['name']: r for r in report['rows']}
    assert len(report_rows) == 192
    assert report['manifest']['head'] == HEAD
    canonical_names = sorted(n for n in z.namelist() if ROW_RE.fullmatch(n))
    assert len(canonical_names) == 192
    expected_keys = set(itertools.product(('chromium','webkit'), (375,390,765,1280), ('normal','reduce'), ('tap','drag'), ('off','minimal','full')))
    groups, rows, snapshots, event_rows, files = {}, [], [], [], []
    anomalies = []
    for info in z.infolist():
        b = z.read(info)
        files.append({'entry': info.filename, 'bytes': len(b), 'sha256': sha(b), 'zipCrc32': f'{info.CRC:08x}',
                      'analysis_role': 'canonical_original_row' if ROW_RE.fullmatch(info.filename) else 'other_original_entry'})
    raw_dir = args.out / 'original-extracted' / 'standard-touch'
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / 'report.json').write_bytes(report_bytes)
    for name in canonical_names:
        b = z.read(name)
        d = json.loads(b)
        engine, width, motion, surface, method, mode = ROW_RE.fullmatch(name).groups()
        width = int(width)
        basename = Path(name).stem
        rr = report_rows[basename]
        png_name = name[:-5] + '.png'
        pb = z.read(png_name)
        assert d['metadata']['head'] == HEAD
        assert rr['json']['sha256'] == sha(b), basename
        assert rr['png']['sha256'] == sha(pb), basename
        assert rr['engine'] == engine and rr['width'] == width and rr['surface'] == surface
        assert rr['reduced'] == (motion == 'reduce') and rr['method'] == method and rr['mode'] == mode
        assert d['surface'] in (surface, 'plain-html' if surface == 'plain' else surface)
        assert d['metadata']['method'] == method and d['metadata']['mode'] == mode
        assert d['metadata']['sourceHashes'] == report['manifest']['sourceHashes']
        assert d['metadata']['build'] == report['manifest']['build']
        (raw_dir / (basename + '.json')).write_bytes(b)
        (raw_dir / (basename + '.png')).write_bytes(pb)
        key = (engine, width, motion, method, mode)
        row_id = {'id': basename, 'pair_id': '-'.join(map(str,key)), 'engine': engine, 'width': width,
                  'motion': motion, 'surface': surface, 'method': method, 'mode': mode}
        gs = [geometry(d['initial']), geometry(d['final'])] + [geometry(e) for e in d['events']]
        evg = gs[2:]
        row = {**row_id, 'zip_json': name, 'zip_png': png_name, 'json_sha256': sha(b), 'png_sha256': sha(pb),
               'report_json_hash_match': True, 'report_png_hash_match': True, 'png_validation': png_check(pb),
               'head': d['metadata']['head'], 'tree': d['metadata']['tree'], 'sourceHashes': d['metadata']['sourceHashes'],
               'inputPath': rr['inputPath'], 'inputKind': d['metadata']['inputKind'],
               'startedAt': d['startedAt'], 'finishedAt': d['finishedAt'], 'nativeRange': d['nativeRange'],
               'initial': {**gs[0], 'state': {k:d['initial'].get(k,NR) for k in ('value','preview','committed','history','pending')}},
               'final': {**gs[1], 'state': {k:d['final'].get(k,NR) for k in ('value','preview','committed','history','pending')}},
               'recorded_event_samples': len(d['events']), 'event_capture_scope': 'DISABLED' if mode == 'off' else mode.upper(),
               'capture_counts_preserving_unrecorded': observed_counts(d), 'reported_diagnosis_unmodified': d['diagnosis'],
               'raw_missing': d['missing'], 'physicalDeviceResult': d['physicalDeviceResult'], 'causalAttribution': d['causalAttribution'],
               'neutrality': d['neutrality'],
               'event_unique_rect8_recorded': [json.loads(x) for x in sorted(set(canonical(g['rect8_recorded']) for g in evg))] if evg else NR,
               'event_unique_viewports': [json.loads(x) for x in sorted(set(canonical(g['viewport']) for g in evg))] if evg else NR,
               'event_unique_window_scrolls': [json.loads(x) for x in sorted(set(canonical(g['window_scroll']) for g in evg))] if evg else NR,
               'rect_stable_initial_final_and_all_recorded_events': len(set(canonical(g['rect8_recorded']) for g in gs)) == 1,
               'viewport_stable_initial_final_and_all_recorded_events': len(set(canonical(g['viewport']) for g in gs)) == 1,
               'window_scroll_stable_initial_final_and_all_recorded_events': len(set(canonical(g['window_scroll']) for g in gs)) == 1,
               'report_final_vs_sealed_final_difference_keys': [k for k in set(rr['final'])|set(d['final']) if rr['final'].get(k,NR) != d['final'].get(k,NR)]}
        rows.append(row)
        groups.setdefault(key,{})[surface] = row
        for phase, source, g in [('initial', d['initial'],gs[0]), ('final',d['final'],gs[1])] + [('event', e,g) for e,g in zip(d['events'],evg)]:
            snap = {**row_id, 'snapshot_kind': phase, 'event_seq': source.get('seq',NR),
                    'event_type': source.get('type',NR), 'event_phase': source.get('phase',NR), **g}
            snapshots.append(snap)
            if phase == 'event':
                event_rows.append({**snap, 'timeStamp':source.get('timeStamp',NR), 'observedAt':source.get('observedAt',NR),
                    'isTrusted':source.get('isTrusted',NR),'pointerType':source.get('pointerType',NR),
                    'clientX':source.get('clientX',NR),'clientY':source.get('clientY',NR),
                    'mappedValue':source.get('mappedValue',NR),'value':source.get('value',NR),
                    'target':source.get('target',NR),'cancelable':source.get('cancelable',NR),
                    'defaultPrevented':source.get('defaultPrevented',NR)})
    assert set(groups) == expected_keys
    pairs = []
    for key in sorted(groups):
        assert set(groups[key]) == {'plain','product'}
        p,l = groups[key]['product'],groups[key]['plain']
        equal = {}
        for phase in ('initial','final'):
            for field in ('rect8_recorded','rect8_derived_not_directly_measured','viewport','window_scroll','devicePixelRatio'):
                equal[f'{phase}_{field}'] = p[phase][field] == l[phase][field]
        for field in ('event_unique_rect8_recorded','event_unique_viewports','event_unique_window_scrolls'):
            equal[field] = NR if p[field] == NR or l[field] == NR else p[field] == l[field]
        pair = {'pair_id':p['pair_id'],'engine':key[0],'width':key[1],'motion':key[2],'method':key[3],'mode':key[4],
                'product_id':p['id'],'plain_id':l['id'],'product_json_sha256':p['json_sha256'],'plain_json_sha256':l['json_sha256'],
                'product_png_sha256':p['png_sha256'],'plain_png_sha256':l['png_sha256'], 'equal':equal,
                'product_initial_scroll':p['initial']['window_scroll'],'plain_initial_scroll':l['initial']['window_scroll'],
                'product_final_scroll':p['final']['window_scroll'],'plain_final_scroll':l['final']['window_scroll'],
                'document_body_scroll_comparison':NR,'directly_measured_full_rect8_comparison':NR,
                'product_initial_rect8_recorded':p['initial']['rect8_recorded'],'plain_initial_rect8_recorded':l['initial']['rect8_recorded'],
                'product_final_rect8_recorded':p['final']['rect8_recorded'],'plain_final_rect8_recorded':l['final']['rect8_recorded'],
                'product_final_value':p['final']['state']['value'],'plain_final_value':l['final']['state']['value'],
                'product_result':p['reported_diagnosis_unmodified'],'plain_result':l['reported_diagnosis_unmodified'],
                'window_scroll_mismatch':not equal['initial_window_scroll'] or not equal['final_window_scroll'],
                'strict_same_geometry_viewport_and_scroll_condition': 'DIFFERENT_RECORDED_WINDOW_SCROLL',
                'causalAttribution':'UNKNOWN','physicalDeviceResult':'NOT_TESTED'}
        pairs.append(pair)
    scroll_groups = []
    for engine,width in itertools.product(('chromium','webkit'),(375,390,765,1280)):
        select=[p for p in pairs if p['engine']==engine and p['width']==width]
        scroll_groups.append({'engine':engine,'width':width,'pairs':len(select),
            'product_initial_y_values':sorted(set(p['product_initial_scroll']['y'] for p in select)),
            'product_final_y_values':sorted(set(p['product_final_scroll']['y'] for p in select)),
            'plain_initial_y_values':sorted(set(p['plain_initial_scroll']['y'] for p in select)),
            'plain_final_y_values':sorted(set(p['plain_final_scroll']['y'] for p in select))})
    result_groups=[]
    for engine,method,mode in itertools.product(('chromium','webkit'),('drag','tap'),('off','minimal','full')):
        selected=[p for p in pairs if (p['engine'],p['method'],p['mode'])==(engine,method,mode)]
        result_groups.append({'engine':engine,'method':method,'mode':mode,'pairs':len(selected),
          'product_status_counts':dict(collections.Counter(p['product_result']['status'] for p in selected)),
          'plain_status_counts':dict(collections.Counter(p['plain_result']['status'] for p in selected)),
          'product_final_value_counts':dict(collections.Counter(p['product_final_value'] for p in selected)),
          'plain_final_value_counts':dict(collections.Counter(p['plain_final_value'] for p in selected))})
    summary={
        'artifact_id':13631601940,'run_id':42515166947,'head':HEAD,'original_zip':str(args.zip.resolve()),
        'zip_sha256':sha(zip_bytes),'zip_sha256_matches_expected':True,'zip_bytes':len(zip_bytes),'zip_entries':len(z.namelist()),
        'report_sha256':sha(report_bytes),'original_report_status':report['status'],'original_report_errors':report['errors'],
        'rows':len(rows),'pairs':len(pairs),'canonical_json_hash_matches':len(rows),'canonical_png_hash_matches':len(rows),
        'png_signature_chunk_crc_idat_valid':len(rows),'recorded_event_samples':len(event_rows),'total_snapshots':len(snapshots),
        'raw_rect_fields_recorded':['x','y','width','height'],'raw_rect_fields_NOT_RECORDED':['top','right','bottom','left'],
        'document_body_scroller_fields':NR,
        'initial_rect4_equal_pairs':sum(p['equal']['initial_rect8_recorded'] for p in pairs),
        'final_rect4_equal_pairs':sum(p['equal']['final_rect8_recorded'] for p in pairs),
        'initial_viewport_equal_pairs':sum(p['equal']['initial_viewport'] for p in pairs),
        'final_viewport_equal_pairs':sum(p['equal']['final_viewport'] for p in pairs),
        'initial_window_scroll_equal_pairs':sum(p['equal']['initial_window_scroll'] for p in pairs),
        'final_window_scroll_equal_pairs':sum(p['equal']['final_window_scroll'] for p in pairs),
        'event_rect4_equal_pairs':sum(p['equal']['event_unique_rect8_recorded'] is True for p in pairs),
        'event_viewport_equal_pairs':sum(p['equal']['event_unique_viewports'] is True for p in pairs),
        'event_window_scroll_equal_pairs':sum(p['equal']['event_unique_window_scrolls'] is True for p in pairs),
        'event_comparison_NOT_RECORDED_pairs':sum(p['equal']['event_unique_rect8_recorded']==NR for p in pairs),
        'rect_stable_rows':sum(r['rect_stable_initial_final_and_all_recorded_events'] for r in rows),
        'viewport_stable_rows':sum(r['viewport_stable_initial_final_and_all_recorded_events'] for r in rows),
        'window_scroll_stable_rows':sum(r['window_scroll_stable_initial_final_and_all_recorded_events'] for r in rows),
        'scroll_by_engine_width':scroll_groups,'results_by_engine_method_mode':result_groups,
        'unmodified_report_final_vs_sealed_final': dict(collections.Counter(','.join(sorted(r['report_final_vs_sealed_final_difference_keys'])) for r in rows)),
        'policy':'No pair is filtered. Missing is NOT_RECORDED, not zero. Original null and zero are retained. No causal attribution or physical-device acceptance.',
        'anomalies':anomalies,
    }
    write_json(args.out/'summary.json',summary)
    write_json(args.out/'pairs96.json',pairs)
    write_csv(args.out/'pairs96.csv',pairs)
    write_json(args.out/'rows192.json',rows)
    write_csv(args.out/'rows192.csv',rows)
    write_json(args.out/'zip-entry-manifest.json',files)
    write_json(args.out/'original-manifest.json',report['manifest'])
    write_csv(args.out/'snapshots3504.csv',snapshots)
    with (args.out/'events3120.jsonl').open('w') as f:
        for e in event_rows:f.write(json.dumps(e,ensure_ascii=False)+'\n')
    write_csv(args.out/'events3120.csv',event_rows)
    write_json(args.out/'provenance.json',{'zip':str(args.zip.resolve()),'zip_sha256':sha(zip_bytes),'script_sha256':sha(Path(__file__).read_bytes()),'head':HEAD,
        'method':'Direct byte reads from original ZIP. No upstream report statuses are changed. Pairing by engine,width,motion,method,mode. Plain/product remain distinct.',
        'rect8':'top,right,bottom,left raw fields are NOT_RECORDED. Derived fields use left=x,top=y,right=x+width,bottom=y+height and are labeled separately.',
        'source_semantics':'controls.js at HEAD records scroll:{x:scrollX,y:scrollY}; no documentElement/body/scroller fields. report.json final is a pre-seal snapshot; per-row JSON final is sealed snapshot.',
        'event_count_semantics':'Off event counters are NOT_RECORDED in the normalized counts; minimal touchmove/capture lifecycle counters are NOT_RECORDED. Unmodified raw diagnosis is separately retained.',
        'scope':'192 canonical trial JSON and PNG entries. 24 latest-* JSON entries are aliases, not extra original pairs. Image-adjustment entries are a separate artifact section.'})
    print(json.dumps(summary,indent=2))

if __name__ == '__main__':
    main()
