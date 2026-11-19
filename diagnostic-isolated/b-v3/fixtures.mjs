import {hash,bytes,clone} from './core.mjs';
export function event(seq,kind,extra={}){return {id:`e${seq}`,seq,slot:'synthetic-1',level:'I0',generation:0,clockDomain:'host',monotonic:seq,kind,phase:kind==='bodyCollected'?'deferred':'primary',operationId:'op1',payload:{},...extra};}
export function seal(x){x.evidenceSha256=hash(bytes({events:x.events,firstLost:x.firstLost,primary:x.primary,bodies:x.bodies}));return x;}
export function base(){return seal({schemaVersion:1,sourceIdentity:{head:'5de4b08a2dc881ad2afcbe805b0776cb944ff882',tree:'89a84488c489161f167e06df34fbc25cca0a4c6e',path:'synthetic',sha256:hash('synthetic')},implementationSha256:hash('fixture-implementation'),policy:{mode:'C',strongImmediate:false,deferredBody:true},identity:{slot:'synthetic-1',level:'I0',generation:0},events:['callback','stateUpdateRequested','reactCommit','dom','primaryFrozen','normalEnd','bodyCollected','evidenceFrozen'].map((k,i)=>event(i+1,k)),firstLost:null,primary:{reached:true,verdict:'PASS',value:false},primarySha256:hash(bytes({reached:true,verdict:'PASS',value:false})),bodies:[{requestId:'q1',responseId:'r1',url:'synthetic://resource',status:200,encoding:'utf8',expectedBuildEntry:'synthetic.txt',body:'body',actualSha256:hash('body')}],evidenceSha256:'',timeDifferences:[],finalization:{exitCode:0,cleanup:'COMPLETE',persistence:'COMPLETE',unexpectedErrors:[]}});}
export function expected(x){return {sourceIdentity:clone(x.sourceIdentity),implementationSha256:x.implementationSha256,primary:clone(x.primary),primarySha256:x.primarySha256,expectedBodyHashes:{r1:hash('body')},expectedFault:null,primaryObservations:x.events.filter(e=>e.phase==='primary'&&['callback','stateUpdateRequested','reactCommit','dom'].includes(e.kind)).map(e=>({id:e.id,sha256:hash(bytes(e))}))};}
const reseq=x=>{x.events=x.events.map((e,i)=>({...e,id:`e${i+1}`,seq:i+1,monotonic:i+1}));return x;};
export function fixtures(){const out=[];
 const normal=(id,fn)=>{const x=base();fn(x);x.primarySha256=hash(bytes(x.primary));seal(x);out.push({id,input:x,expected:expected(x),reason:null});};
 normal('N01-complete',()=>{});normal('N02-primary-fail',x=>x.primary.verdict='FAIL');normal('N03-unreached',x=>{x.primary={reached:false,verdict:'NOT_TESTED',value:null};x.events=[];x.finalization.exitCode=1;x.policy.mode='A';});normal('N04-equal-time',x=>x.events.forEach(e=>e.monotonic=0));normal('N05-cancel',x=>{x.events.unshift(event(0,'cancel'));reseq(x);});normal('N06-inflight-terminal',x=>{x.policy.mode='A';x.events=['operationStart','primaryFrozen','mismatchDetected','stopRequested','operationEnd','stopCompleted','evidenceFrozen'].map((k,i)=>event(i+1,k));});normal('F18-zero-false',x=>x.primary.value={zero:0,flag:false});
 const fault=(id,reason,fn,init=()=>{},reseal=true)=>{const x=base();init(x);x.primarySha256=hash(bytes(x.primary));seal(x);const oracle=expected(x);fn(x);if(reseal)seal(x);out.push({id,input:x,expected:oracle,reason});};
 fault('F01','MISSING_EVENT',x=>{x.events=x.events.filter(e=>e.kind!=='primaryFrozen');reseq(x);});
 fault('F02','ORDER_VIOLATION',x=>x.events[1].monotonic=-1+ x.events[0].monotonic);
 fault('F03','STOP_REQUEST_MISSING',x=>{x.policy.mode='A';x.events=[event(1,'primaryFrozen'),event(2,'mismatchDetected')];});
 fault('F04','STOP_INCOMPLETE',x=>{x.policy.mode='A';x.events=[event(1,'primaryFrozen'),event(2,'stopRequested')];});
 fault('F05','BODY_HASH_MISMATCH',x=>{x.bodies[0].body='other';x.bodies[0].actualSha256=hash('other');});
 fault('F06','BODY_INVALID',x=>x.bodies[0].status='200');
 fault('F07','OVERFLOW',x=>{x.events=Array.from({length:4097},(_,i)=>event(i+1,i===0?'primaryFrozen':'callback'));x.policy.mode='A';x.firstLost=x.events.at(-1);});
 fault('F08','EVIDENCE_HASH_MISMATCH',x=>x.evidenceSha256=hash('wrong'),()=>{},false);
 fault('F09','IMPLEMENTATION_MISMATCH',x=>x.implementationSha256=hash('wrong'));
 fault('F10','PRIMARY_MUTATION',x=>{x.primary.verdict='PASS';x.primarySha256=hash(bytes(x.primary));},x=>x.primary.verdict='FAIL');
 fault('F11','UNREACHED_PRIMARY',x=>{x.primary.verdict='PASS';x.primarySha256=hash(bytes(x.primary));},x=>{x.primary={reached:false,verdict:'NOT_TESTED',value:null};});
 fault('F12','EXIT_CONTRADICTION',x=>x.finalization.unexpectedErrors=['unplanned']);
 fault('F13','POST_STOP_OPERATION',x=>{x.policy.mode='A';x.events=['primaryFrozen','stopRequested','operationStart'].map((k,i)=>event(i+1,k));});
 fault('F14','UNSUPPORTED_DETECTION',x=>{x.policy.mode='A';x.events=[event(1,'primaryFrozen'),event(2,'mismatchDetected',{payload:{basis:'metadata',claim:'bodyMismatch'}}),event(3,'stopRequested'),event(4,'stopCompleted')];});
 fault('F15','INCOMPATIBLE_POLICY',x=>x.policy.strongImmediate=true);
 fault('F16','CLOCK_DOMAIN_MISMATCH',x=>{x.events[0].clockDomain='browser';x.timeDifferences=[['e1','e2']];});
 fault('F17','UNEXPECTED_ERROR',x=>{x.finalization.unexpectedErrors=['cleanup exception'];x.finalization.cleanup='INCOMPLETE';x.bodies[0].body='fault';});out.at(-1).expected.expectedFault='BODY_HASH_MISMATCH';
 return out;
}
