import {hash,bytes,clone,freeze,exact,insist} from './core.mjs';
import {recorder,delta} from './recorder.mjs';
export function audit(input, expected){
 const x=clone(input), reasons=[];const add=r=>{if(!reasons.includes(r))reasons.push(r);};
 exact(x,['schemaVersion','sourceIdentity','implementationSha256','policy','identity','events','firstLost','primary','primarySha256','bodies','evidenceSha256','timeDifferences','finalization']);
 exact(expected,['sourceIdentity','implementationSha256','primary','primarySha256','expectedBodyHashes','expectedFault']);
 insist(x.schemaVersion===1,'UNKNOWN_SCHEMA');
 exact(x.policy,['mode','strongImmediate','deferredBody']);
 insist(['A','C'].includes(x.policy.mode)&&typeof x.policy.strongImmediate==='boolean'&&typeof x.policy.deferredBody==='boolean','POLICY_INVALID');
 if(x.policy.strongImmediate&&x.policy.deferredBody)add('INCOMPATIBLE_POLICY');
 if(JSON.stringify(x.sourceIdentity)!==JSON.stringify(expected.sourceIdentity))add('SOURCE_IDENTITY_MISMATCH');
 if(x.implementationSha256!==expected.implementationSha256)add('IMPLEMENTATION_MISMATCH');
 if(hash(bytes(x.primary))!==x.primarySha256||x.primarySha256!==expected.primarySha256||JSON.stringify(x.primary)!==JSON.stringify(expected.primary))add('PRIMARY_MUTATION');
 exact(x.primary,['reached','verdict','value']);
 insist(typeof x.primary.reached==='boolean'&&['PASS','FAIL','NOT_TESTED'].includes(x.primary.verdict),'PRIMARY_INVALID');
 if(!x.primary.reached&&(x.primary.verdict!=='NOT_TESTED'||x.primary.value!==null))add('UNREACHED_PRIMARY');
 const rec=recorder(x.identity);
 try {for(const e of x.events)rec.accept(e);}catch(e){add(e.message);}
 if(x.firstLost!==null||!rec.snapshot().complete)add('OVERFLOW');
 const ev=x.events;const of=k=>ev.filter(e=>e.kind===k);const one=k=>of(k).length===1?of(k)[0]:null;
 if(x.primary.reached&&!one('primaryFrozen'))add('MISSING_EVENT');
 for(const k of ['primaryFrozen','normalEnd','evidenceFrozen','stopRequested','stopCompleted','mismatchDetected','bodyCollected'])if(of(k).length>1)add('DUPLICATE_EVENT');
 if(x.policy.mode==='C'&&x.primary.reached){const order=['primaryFrozen','normalEnd','bodyCollected','evidenceFrozen'].map(one);
 if(order.some(e=>!e))add('MISSING_EVENT');else if(order.some(e=>e.clockDomain!=='host')||order.some((e,i)=>i&&e.seq<=order[i-1].seq))add('ORDER_VIOLATION');}
 for(const e of ev){if(e.kind==='bodyCollected'&&e.phase!=='deferred')add('STREAM_VIOLATION');if(e.kind==='primaryFrozen'&&e.phase!=='primary')add('STREAM_VIOLATION');}
 const mismatch=one('mismatchDetected'),request=one('stopRequested'),complete=one('stopCompleted');
 if(mismatch&&!request)add('STOP_REQUEST_MISSING');
 if(request&&!complete)add('STOP_INCOMPLETE');
 if(complete&&!request)add('STOP_REQUEST_MISSING');
 if(mismatch&&request&&mismatch.seq>request.seq)add('ORDER_VIOLATION');
 if(request&&complete&&request.seq>=complete.seq)add('ORDER_VIOLATION');
 const active=new Set();for(const e of ev){if(e.kind==='operationStart'){if(request&&e.seq>request.seq)add('POST_STOP_OPERATION');if(active.has(e.operationId))add('OPERATION_DUPLICATE');active.add(e.operationId);}if(e.kind==='operationEnd'){if(!active.has(e.operationId))add('OPERATION_UNKNOWN');active.delete(e.operationId);}if(e.kind==='stopCompleted'&&active.size)add('STOP_INCOMPLETE');}
 if(complete&&active.size)add('STOP_INCOMPLETE');
 let bodyProven=true;const bodyIds=new Set();
 for(const b of x.bodies){try{exact(b,['requestId','responseId','url','status','encoding','expectedBuildEntry','body','actualSha256']);
 insist(typeof b.requestId==='string'&&typeof b.responseId==='string'&&typeof b.url==='string'&&Number.isInteger(b.status)&&b.encoding==='utf8'&&typeof b.expectedBuildEntry==='string'&&(typeof b.body==='string'||b.body===null),'BODY_INVALID');
 if(bodyIds.has(b.responseId))add('BODY_INVALID');bodyIds.add(b.responseId);
 if(b.body===null){bodyProven=false;add('BODY_NOT_PROVEN');}else if(hash(b.body)!==b.actualSha256||expected.expectedBodyHashes[b.responseId]!==hash(b.body))add('BODY_HASH_MISMATCH');
 }catch{add('BODY_INVALID');}}
 if(Object.keys(expected.expectedBodyHashes).some(k=>!bodyIds.has(k))){bodyProven=false;add('BODY_NOT_PROVEN');}
 for(const e of of('mismatchDetected'))if(e.payload?.basis==='metadata'&&e.payload?.claim==='bodyMismatch')add('UNSUPPORTED_DETECTION');
 for(const pair of x.timeDifferences){try{insist(pair.length===2,'TIME_INVALID');const a=ev.find(e=>e.id===pair[0]),b=ev.find(e=>e.id===pair[1]);insist(a&&b,'TIME_INVALID');delta(a,b);}catch(e){add(e.message);}}
 if(hash(bytes({events:x.events,firstLost:x.firstLost,primary:x.primary,bodies:x.bodies}))!==x.evidenceSha256)add('EVIDENCE_HASH_MISMATCH');
 exact(x.finalization,['exitCode','cleanup','persistence','unexpectedErrors']);
 insist(Number.isInteger(x.finalization.exitCode)&&['COMPLETE','INCOMPLETE','NOT_TESTED'].includes(x.finalization.cleanup)&&['COMPLETE','INCOMPLETE','NOT_TESTED'].includes(x.finalization.persistence)&&Array.isArray(x.finalization.unexpectedErrors),'FINALIZATION_INVALID');
 if(x.finalization.unexpectedErrors.length||x.finalization.cleanup!=='COMPLETE')add('UNEXPECTED_ERROR');
 if(x.finalization.persistence!=='COMPLETE')add('PERSISTENCE_INCOMPLETE');
 const expectedDetected=expected.expectedFault!==null&&reasons.includes(expected.expectedFault);
 const integrity=reasons.length===0&&x.primary.reached?'COMPLETE':'INCOMPLETE';
 const onlyExpected=expectedDetected&&reasons.every(r=>r===expected.expectedFault)&&x.finalization.cleanup==='COMPLETE'&&x.finalization.persistence==='COMPLETE';
 if(x.finalization.exitCode===0&&((reasons.length&&!onlyExpected)||(!x.primary.reached&&!onlyExpected)))add('EXIT_CONTRADICTION');
 return freeze({productResult:expected.primary.verdict,primary:clone(expected.primary),primarySha256:expected.primarySha256,auditResult:reasons.length?'FAIL':'PASS',reasons,expectedFaultDetected:expectedDetected,technicalControl:onlyExpected?'PASS':reasons.length?'FAIL':'NOT_APPLICABLE',unexpectedErrors:clone(x.finalization.unexpectedErrors),processExit:x.finalization.exitCode,cleanup:x.finalization.cleanup,persistence:x.finalization.persistence,evidence:integrity,bodyBinding:bodyProven&&!reasons.includes('BODY_HASH_MISMATCH')&&!reasons.includes('BODY_INVALID')?'PROVEN':'NOT_PROVEN',stopRequested:!!request,stopCompleted:!!complete&&!!request&&request.seq<complete.seq&&(!mismatch||mismatch.seq<=request.seq)&&!reasons.some(r=>['STOP_INCOMPLETE','DUPLICATE_EVENT','ORDER_VIOLATION','POST_STOP_OPERATION'].includes(r))});
}
