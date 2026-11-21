import {createHash} from 'node:crypto';
import {boundaryPlan,boundaryTargets} from './phase7d-boundary-plan.mjs';
import {apiSequence} from './phase7d-api-plan.mjs';
import {traceOperations} from './phase7d-api-trace-spec.mjs';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function boundarySequence(kind,group) {
 const sequence=apiSequence(kind,'N0').filter(n=>n!=='followup.getAttribute');
 if(group!=='A')sequence.splice(sequence.indexOf('page.goto'),0,'boundary.addInitScript');
 if(group!=='A')sequence.splice(sequence.indexOf('context.tracing.stop'),0,'boundary.collect');
 return sequence;
}
export const boundaryContract={
 schemaVersion:1,id:'phase7d-boundary108-preparation-v1',mode:'VALIDATION_ONLY',productionEnabled:false,
 sourceDocuments:['docs/phase7d/boundary-investigation-plan.md','scripts/phase7d-api-plan.mjs','scripts/diagnose-phase7d-api.mjs','scripts/phase7d-api-trace-spec.mjs'],
 allocation:boundaryPlan(),targets:boundaryTargets,
 apiTimeoutMs:9000,hostDeadlineMs:null,hostDeadlineStatus:'NOT_DEFINED_BY_ORIGINAL_CONTRACT',
 deadline:{origin:'target input completion: mouse.up or second Replay click',virtualAdvance:'target.clock.runFor immediately following input; 500ms Swipe / 3000ms Status',observation:'single primary.getAttribute(data-state) immediately after runFor; host persistence precedes all further browser APIs',clocks:'host monotonic, browser virtual and API timeout are separate, no conversion'},
 browser:{freshBrowserAndContext:true,hasTouch:true,headless:true},trace:{screenshots:false,snapshots:false,sources:false},
 selectors:{stage:{swipe:'#modern-exhibit-swipe-dismiss',status:'#modern-exhibit-status-morph'},rootTestId:{swipe:'swipe-to-dismiss',status:'status-morph'},primaryAttribute:'data-state',mechanism:{text:'仕組みを見る',exact:true},card:{role:'button',name:'スワイプするカード'},start:{role:'button',name:'模擬処理を開始',exact:true},cancel:{role:'button',name:'取消',exact:true},result:{label:'模擬結果',exact:true},undo:{role:'button',name:'Undo',exact:true},replay:{role:'button',name:'Replay',exact:true}},
 arguments:{swipe:{prefixKey:'ArrowRight',prefixVirtualMs:500,prefixExpected:'dismissed',undoExpected:'idle',returnVirtualMs:300,dragStart:'boundingBox center',dragDeltaX:130,dragDeltaY:0,steps:8,targetVirtualMs:500},status:{prefixKey:'Enter',prefixExpected:'Loading',cancelVirtualMs:4000,cancelExpected:'Cancelled',successVirtualMs:3000,successExpected:'Success',targetOption:'Error',targetReplayClicks:2,targetVirtualMs:3000},clockOrigin:'Date.now()+1000',detailsBefore:0,detailsAfter:2},
 inputSource:'Exact existing 120 input prefix and selectors; N0 intermediate/followup removed, no added waits',
 operations:Object.fromEntries(['swipe','status'].map(k=>[k,Object.fromEntries(['A','B','C'].map(g=>[g,boundarySequence(k,g)]))])),
 measurement:{A:'no product instrumentation',B:'callback/request/commit/DOM hooks',C:'B plus lifecycle, generation, guard, cancellation',prePrimary:'B/C commit hook reads DOM; sink init precedes navigation. No per-operation evaluate added.',operationId:'whole-trial: internal events not attributed to host API without evidence',neutrality:'UNKNOWN'},
 persistence:{slots:'108 production slots always NOT_EXECUTED in validation',primary:'exclusive synchronous write before collection',attempts:'new directory per attempt, append-only records, no overwrite or replacement',recovery:'missing completion => INTERRUPTED; primary file retained; no automatic retry'},
 outcomes:{primary:['PASS','FAIL','NOT_TESTED'],evidence:['COMPLETE','INCOMPLETE','UNKNOWN'],overflow:'INCOMPLETE, not callback suppression',missing:'INCOMPLETE, never success',abort:'retain all slots and attempts',retry:'explicit new attempt only; previous primary remains authoritative for that attempt'},
 productionReadiness:'BLOCKED pending independent review and full preparation evidence',
};
export function boundaryTraceOperations(t) {
 return traceOperations(t,t.apis.map(a=>a.name).filter(n=>!n.startsWith('boundary.')));
}
export function chooseValidationTrials(ids, group) {
 if(!Array.isArray(ids)||!ids.length||ids.length>12||new Set(ids).size!==ids.length)throw Error('validation IDs must be unique, 1..12');
 return ids.map(id=>{const row=boundaryPlan().find(p=>p.id===id);if(!row||row.group!==group)throw Error('unknown trial or group mismatch: '+id);return row;});
}
