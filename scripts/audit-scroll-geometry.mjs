/** Recompute comparisons from raw bytes, never accept report.status as proof. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {validate,compare} from '../diagnostics/scroll-geometry/contract.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export async function audit(directory,expected){
 const report=JSON.parse(await fs.readFile(path.join(directory,'report.json'))),errors=[],records=new Map(),pairs=[],seen=new Set();
 for(const k of ['head','tree','protocolHash','sourceHash'])if(report.binding[k]!==expected[k])errors.push('RUN_BINDING:'+k);
 if(report.schemaVersion!=='iad-scroll-run-1')errors.push('RUN_SCHEMA');
 if(sha(JSON.stringify(report.sourceHashes))!==expected.sourceHash)errors.push('SOURCE_HASH_MANIFEST');
 if(!Array.isArray(report.errors)||report.errors.length)errors.push('RUN_EXECUTION_ERRORS');
 if(report.fullMatrix!==true||report.expectedRows!==768||report.status!=='TECHNICAL_PASS')errors.push('RUN_NOT_COMPLETE');
 const required=[];for(const engine of ['chromium','webkit'])for(const width of [375,390,765,1280])for(const motion of ['normal','reduce'])for(const method of ['drag','tap'])for(const condition of ['A','B','C','D'])for(let n=1;n<=3;n++)for(const surface of ['product','plain'])required.push(`${engine}-${width}-${motion}-${method}-${condition}-r${n}-${surface}`);
 for(const row of report.rows){
  if(seen.has(row.trialId))errors.push('DUPLICATE_TRIAL:'+row.trialId);seen.add(row.trialId);
  if(!required.includes(row.trialId))errors.push('UNKNOWN_TRIAL:'+row.trialId);
  if(row.error)errors.push('EXECUTION_ERROR:'+row.trialId);
  try{
   for(const f of [row.json,row.trace,...Object.values(row.images??{})]){if(!f||path.basename(f.file)!==f.file)throw Error('UNSAFE_FILE_REFERENCE');const b=await fs.readFile(path.join(directory,f.file));if(sha(b)!==f.sha256||b.length!==f.bytes)throw Error('FILE_HASH_OR_SIZE:'+f.file);}
   if(Object.keys(row.images??{}).sort().join(',')!=='after,before,during')throw Error('MISSING_IMAGE_PHASE');for(const [phase,f]of Object.entries(row.images)){const suffix=phase==='during'&&row.method==='tap'?'tap-return':phase;if(f.file!==row.trialId+'-'+suffix+'.png')throw Error('IMAGE_PHASE_IDENTITY');}if(row.json.file!==row.trialId+'.json'||row.trace.file!==row.trialId+'-trace.zip')throw Error('RAW_FILENAME_IDENTITY');
   const r=JSON.parse(await fs.readFile(path.join(directory,row.json.file)));if(JSON.stringify(r.images)!==JSON.stringify(row.images))throw Error('RECORD_IMAGE_MANIFEST');const i=r.identity,canonical=[i.engine,i.width,i.motion,i.method,i.condition,'r'+i.repetition].join('-');if(i.pairId!==canonical||i.trialId!==canonical+'-'+i.surface||i.trialId!==row.trialId)throw Error('RECORD_TRIAL_ID');for(const k of ['pairId','condition','engine','width','motion','method','repetition','surface'])if(i[k]!==row[k])throw Error('ROW_IDENTITY:'+k);if(r.pageErrors?.length||!Array.isArray(r.pageErrors))throw Error('PAGE_ERRORS_MISSING_OR_PRESENT');
   const v=validate(r,expected);if(!v.valid)throw Error('RECORD_INVALID:'+v.errors.join(','));records.set(row.trialId,r);
  }catch(e){errors.push(row.trialId+':'+String(e));}
 }
 for(const id of required)if(!seen.has(id))errors.push('MISSING_TRIAL:'+id);
 for(const id of required.filter(x=>x.endsWith('-product'))){const a=records.get(id),b=records.get(id.replace(/-product$/,'-plain'));if(!a||!b)continue;const r=compare(a,b,expected);pairs.push({pairId:a.identity.pairId,engine:a.identity.engine,width:a.identity.width,motion:a.identity.motion,method:a.identity.method,condition:a.identity.condition,repetition:a.identity.repetition,result:r});if(!r.valid||r.construction!=='ESTABLISHED')errors.push('PAIR_NOT_ESTABLISHED:'+id);}
 const child=spawnSync(process.env.PYTHON||'python3',[new URL('./audit-scroll-files.py',import.meta.url).pathname,directory],{encoding:'utf8',maxBuffer:32*1024*1024});let binaryVerification;try{binaryVerification=JSON.parse(child.stdout);if(child.status!==0||binaryVerification.status!=='PASS'||binaryVerification.rows!==768||binaryVerification.png!==2304||binaryVerification.traces!==768)errors.push('BINARY_EVIDENCE_FAILED');}catch{errors.push('BINARY_AUDITOR_FAILED:'+String(child.error||child.stderr));}
 const groups={};for(const p of pairs){const key=[p.engine,p.method,p.condition].join('/');const g=groups[key]??={pairs:0,established:0,product:{},plain:{},productValues:{},plainValues:{},pointercancel:{product:0,plain:0},touchcancel:{product:0,plain:0},eventSequenceEqual:0,viewportMatch:0,rectMatch:0,scrollMatch:0,transientChanges:0};g.pairs++;g.established+=p.result.construction==='ESTABLISHED';for(const [side,r]of [['product',p.result.a],['plain',p.result.b]]){g[side][r.outcome]=(g[side][r.outcome]??0)+1;g[side+'Values'][r.finalValue]=(g[side+'Values'][r.finalValue]??0)+1;g.pointercancel[side]+=r.pointercancel;g.touchcancel[side]+=r.touchcancel;}g.eventSequenceEqual+=JSON.stringify(p.result.a.eventOrder)===JSON.stringify(p.result.b.eventOrder);for(const k of ['viewport','rect','scroll'])g[k+'Match']+=p.result.dimensions[k]==='MATCH';g.transientChanges+=[p.result.a,p.result.b].some(x=>Object.values(x.drift).some(y=>y.length));}
 return {schemaVersion:'iad-scroll-audit-1',binaryVerification,expected,reportSha256:sha(await fs.readFile(path.join(directory,'report.json'))),requiredRows:768,rows:report.rows.length,pairs:pairs.length,errors,status:errors.length?'FAIL':'PASS',groups,pairResults:pairs,physicalInput:'NOT_TESTED',cause:'UNKNOWN'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){const directory=process.argv[2]||'work/scroll-geometry',bindingFile=process.argv[3];if(!bindingFile)throw Error('Provide an independently verified binding JSON file, not report self-approval.');const expected=JSON.parse(await fs.readFile(bindingFile));const result=await audit(directory,expected);await fs.writeFile(path.join(directory,'audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,rows:result.rows,pairs:result.pairs,errors:result.errors,groups:result.groups}));if(result.status!=='PASS')process.exitCode=1;}
