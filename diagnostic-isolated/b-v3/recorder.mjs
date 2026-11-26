import {clone,freeze,exact,insist,text,integer} from './core.mjs';
export const kinds=['callback','stateUpdateRequested','reactCommit','dom','guard','cancel','primaryFrozen','normalEnd','bodyCollected','evidenceFrozen','mismatchDetected','stopRequested','stopCompleted','operationStart','operationEnd'];
export function validateEvent(e){
 exact(e,['id','seq','slot','level','generation','clockDomain','monotonic','kind','phase','operationId','payload']);
 insist(text(e.id)&&integer(e.seq)&&text(e.slot)&&text(e.level)&&integer(e.generation)&&text(e.clockDomain)&&Number.isFinite(e.monotonic)&&e.monotonic>=0&&kinds.includes(e.kind)&&['primary','deferred'].includes(e.phase)&&text(e.operationId),'EVENT_INVALID');
 insist(e.payload!==undefined,'EVENT_INVALID');
}
export function recorder(identity){
 exact(identity,['slot','level','generation']);const rows=[],ids=new Set(),clock=new Map();let lost=null;
 return {accept(event){validateEvent(event);const e=clone(event);
 for(const k of Object.keys(identity))insist(e[k]===identity[k],'EVENT_IDENTITY_MISMATCH');
 insist(!ids.has(e.id),'DUPLICATE_EVENT');insist(e.seq===rows.length+1,'ORDER_VIOLATION');
 insist(!clock.has(e.clockDomain)||e.monotonic>=clock.get(e.clockDomain),'ORDER_VIOLATION');
 if(rows.length>=4096){if(!lost)lost=freeze(e);return false;}
 ids.add(e.id);clock.set(e.clockDomain,e.monotonic);rows.push(freeze(e));return true;},
 snapshot(){return freeze({events:clone(rows),primary:clone(rows.filter(e=>e.phase==='primary')),deferred:clone(rows.filter(e=>e.phase==='deferred')),firstLost:clone(lost),complete:lost===null});}};
}
export function delta(a,b){insist(a.clockDomain===b.clockDomain,'CLOCK_DOMAIN_MISMATCH');insist(b.monotonic>=a.monotonic,'ORDER_VIOLATION');return b.monotonic-a.monotonic;}
