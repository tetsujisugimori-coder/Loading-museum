/** Independent dimensions, not a relaxation of standard-touch v1/v2. */
export const RECT=['x','y','width','height','top','right','bottom','left'];
export const VIEW=['innerWidth','innerHeight','width','height','offsetLeft','offsetTop','scale','devicePixelRatio'];
export const SCROLL=['x','y','scrollingElement.left','scrollingElement.top','documentElement.left','documentElement.top','body.left','body.top'];
export const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const list=v=>Array.isArray(v)?v:[];
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const eventTypes=new Set(['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','input','change','gotpointercapture','lostpointercapture','focus','blur']);
export function targets(id){return {x:24,y:id?.surface==='product'&&['C','D'].includes(id?.condition)?410:310,width:id?.width-48,height:44,scrollY:id?.surface==='product'&&['B','D'].includes(id?.condition)?1000:0};}
export function constructionTargets(r){const want=targets(r?.identity),errors=[];for(const [label,p]of [['initial',r?.initial],['final',r?.final]]){for(const k of ['x','y','width','height'])if(!finite(p?.rect?.[k])||Math.abs(p.rect[k]-want[k])>.5)errors.push(label+':rect.'+k);for(const [k,v]of Object.entries({innerWidth:r?.identity?.width,innerHeight:900,width:r?.identity?.width,height:900,offsetLeft:0,offsetTop:0,scale:1,devicePixelRatio:1}))if(!finite(p?.viewport?.[k])||Math.abs(p.viewport[k]-v)>(['scale','devicePixelRatio'].includes(k)?0:.5))errors.push(label+':viewport.'+k);for(const k of SCROLL){const v=['y','scrollingElement.top','documentElement.top'].includes(k)?want.scrollY:0;if(!finite(get(p?.scroll,k))||Math.abs(get(p.scroll,k)-v)>.5)errors.push(label+':scroll.'+k);}}return {expected:want,established:errors.length===0,errors};}
export function differences(a,b,fields,tolerance,prefix){return fields.flatMap(k=>{const x=get(a,k),y=get(b,k);return !finite(x)||!finite(y)?[{field:prefix+k,status:'NOT_RECORDED',a:x??null,b:y??null}]:Math.abs(x-y)>tolerance(k)?[{field:prefix+k,status:'DIFFER',a:x,b:y,delta:y-x}]:[];});}
export function comparePoint(a,b,tolerance=.5){return {
 rect:differences(a?.rect,b?.rect,RECT,()=>tolerance,'rect.'),
 viewport:differences(a?.viewport,b?.viewport,VIEW,k=>['scale','devicePixelRatio'].includes(k)?0:tolerance,'viewport.'),
 scroll:differences(a?.scroll,b?.scroll,SCROLL,()=>tolerance,'scroll.')};}
function pointErrors(p,id){const e=[];if(p?.trialId!==id)e.push('POINT_TRIAL_MISMATCH');if(!finite(p?.t)||p.t<0)e.push('POINT_TIME');
 for(const [key,fields]of [['rect',RECT],['viewport',VIEW],['scroll',SCROLL]])for(const f of fields)if(!finite(get(p?.[key],f)))e.push('MISSING_OR_INVALID:'+key+'.'+f);
 if(p?.rect?.width<=0||p?.rect?.height<=0)e.push('RECT_NONPOSITIVE');
 for(const k of ['innerWidth','innerHeight','width','height','scale','devicePixelRatio'])if(p?.viewport?.[k]<=0)e.push('VIEWPORT_NONPOSITIVE:'+k);
 if(p?.rect&&[p.rect.x-p.rect.left,p.rect.y-p.rect.top,p.rect.right-p.rect.left-p.rect.width,p.rect.bottom-p.rect.top-p.rect.height].some(x=>!finite(x)||Math.abs(x)>.01))e.push('RECT_INCONSISTENT');
 if(!finite(p?.value))e.push('DOM_VALUE_INVALID');return e;}
export function validate(r,expected){const e=[];const id=r?.identity;
 if(r?.schemaVersion!=='iad-scroll-geometry-1')e.push('SCHEMA');
 if(!nonempty(r?.startedAt)||!nonempty(r?.finishedAt)||!Number.isFinite(Date.parse(r.startedAt))||!Number.isFinite(Date.parse(r.finishedAt))||Date.parse(r.finishedAt)<Date.parse(r.startedAt)||r?.observer!=='passive capture + requestAnimationFrame')e.push('CAPTURE_METADATA');
 if(!expected?.head||!expected?.protocolHash||!expected?.sourceHash||!expected?.tree)e.push('EXPECTED_BINDING_REQUIRED');
 for(const k of ['head','tree','protocolHash','sourceHash'])if(!id?.[k]||id[k]!==expected?.[k])e.push('BINDING:'+k);
 if(!nonempty(id?.browserVersion)||id?.inputPath!==(id?.method==='drag'?'Playwright mouse drag':'Playwright touchscreen tap'))e.push('INPUT_ENVIRONMENT');
 if(!id?.trialId||!id?.pairId||!['A','B','C','D'].includes(id?.condition)||!['product','plain'].includes(id?.surface)||!['tap','drag'].includes(id?.method))e.push('IDENTITY');
 if(![1,2,3].includes(id?.repetition))e.push('REPETITION');
 if(!['chromium','webkit'].includes(id?.engine)||![375,390,765,1280].includes(id?.width)||!['normal','reduce'].includes(id?.motion))e.push('MATRIX_IDENTITY');
 if(!Array.isArray(r?.points)||r.points.length<3)e.push('POINTS_INCOMPLETE');
 for(const p of [r?.initial,...(Array.isArray(r?.points)?r.points:[]),r?.final])e.push(...pointErrors(p,id?.trialId));
 if(JSON.stringify(r?.initial)!==JSON.stringify(r?.points?.[0])||JSON.stringify(r?.final)!==JSON.stringify(r?.points?.at(-1)))e.push('BOUNDARY_NOT_IN_POINTS');
 for(let i=0;i<(r?.points?.length??0);i++){const p=r.points[i];if(p.seq!==i||i&&p.t<r.points[i-1].t)e.push('POINT_ORDER');}
 if(!Array.isArray(r?.events))e.push('EVENTS_MISSING');
 const activePointers=new Set(),activeTouches=new Set(),pointerTypes=new Map();let completed=false;
 for(const [i,v]of list(r?.events).entries()){if(v.trialId!==id?.trialId||v.index!==i)e.push('EVENT_IDENTITY');if(!finite(v.t)||v.t<0||i&&v.t<r.events[i-1].t)e.push('EVENT_ORDER');if(!['range','tracked-pointer'].includes(v.target))e.push('EVENT_TARGET');if(!list(r?.points).some(p=>JSON.stringify(p)===JSON.stringify(v.snapshot)))e.push('EVENT_SNAPSHOT_NOT_IN_TIMELINE');
 if(i&&v.snapshot?.seq<=r.events[i-1].snapshot?.seq)e.push('EVENT_SNAPSHOT_ORDER');
 if(!eventTypes.has(v.type))e.push('UNKNOWN_EVENT');if(v.isTrusted!==true||!finite(v.timeStamp)||typeof v.cancelable!=='boolean'||typeof v.defaultPrevented!=='boolean')e.push('EVENT_METADATA');
 if(v.t>r?.final?.t||v.snapshot?.t<v.t||v.snapshot?.t>v.t+50)e.push('EVENT_TIMELINE');
 if(v.type?.startsWith('pointer')){if(!Number.isInteger(v.pointerId)||!['mouse','touch','pen'].includes(v.pointerType)||!finite(v.clientX)||!finite(v.clientY)||!finite(v.pageX)||!finite(v.pageY))e.push('POINTER_METADATA');
 if(v.type==='pointerdown'){if(activePointers.has(v.pointerId))e.push('DUPLICATE_POINTER_START');activePointers.add(v.pointerId);pointerTypes.set(v.pointerId,v.pointerType);}if(activePointers.has(v.pointerId)&&pointerTypes.get(v.pointerId)!==v.pointerType)e.push('POINTER_TYPE_CHANGED');if(['pointerup','pointercancel'].includes(v.type)){if(!activePointers.has(v.pointerId))e.push('UNPAIRED_POINTER_END');else if(v.type==='pointerup')completed=true;activePointers.delete(v.pointerId);}}
 if(v.type?.startsWith('touch')){if(!Number.isInteger(v.touchId)||!finite(v.clientX)||!finite(v.clientY)||!finite(v.pageX)||!finite(v.pageY))e.push('TOUCH_METADATA');if(v.type==='touchstart'){if(activeTouches.has(v.touchId))e.push('DUPLICATE_TOUCH_START');activeTouches.add(v.touchId);}if(['touchend','touchcancel'].includes(v.type)){if(!activeTouches.has(v.touchId))e.push('UNPAIRED_TOUCH_END');else if(v.type==='touchend')completed=true;activeTouches.delete(v.touchId);}}}
 if(!Array.isArray(r?.inputs)||r.inputs.length<1)e.push('INPUTS_MISSING');for(const [i,v]of list(r?.inputs).entries()){if(v.trialId!==id?.trialId||v.index!==i||!finite(v.t)||v.t<0||v.t>r?.final?.t||i&&v.t<r.inputs[i-1].t)e.push('INPUT_IDENTITY');if(!finite(v.x)||!finite(v.y))e.push('INPUT_COORDINATES');}
 const startCommand=list(r?.inputs).find(v=>v.kind===(id?.method==='drag'?'mouse.down':'touchscreen.tap'));if(list(r?.events).some(v=>['pointerdown','touchstart'].includes(v.type)&&(!startCommand||v.t<startCommand.t)))e.push('RESPONSE_PRECEDES_INPUT');
 const kinds=list(r?.inputs).map(v=>v.kind),requiredKinds=id?.method==='tap'?['touchscreen.tap']:['mouse.move','mouse.down',...Array(10).fill('mouse.move'),'mouse.up'];if(JSON.stringify(kinds)!==JSON.stringify(requiredKinds))e.push('INPUT_SEQUENCE');
 const x0=r?.initial?.rect?.x+10+(r?.initial?.rect?.width-20)*.5,x1=r?.initial?.rect?.x+10+(r?.initial?.rect?.width-20)*.75,y=r?.initial?.rect?.y+22;for(const [i,v]of list(r?.inputs).entries()){const x=id?.method==='tap'?x1:i<2?x0:i===12?x1:x0+(x1-x0)*(i-1)/10;if(Math.abs(v.x-x)>.5||Math.abs(v.y-y)>.5)e.push('INPUT_PATH_MISMATCH');}
 if(completed&&(activePointers.size||activeTouches.size))e.push('UNFINISHED_LIFECYCLE');
 if(r?.initial?.value!==0)e.push('INITIAL_VALUE');if(r?.physicalInput!=='NOT_TESTED')e.push('PHYSICAL_CLAIM');
 const drift={rect:[],viewport:[],scroll:[]};for(const p of list(r?.points)){const d=comparePoint(r.initial,p);for(const k of Object.keys(drift))for(const x of d[k])if(!drift[k].some(v=>v.field===x.field))drift[k].push({...x,firstObservedAt:p.t});}
 const types=list(r?.events).map(v=>v.type),cancel=types.includes('pointercancel')||types.includes('touchcancel');
 const began=types.includes('pointerdown')||types.includes('touchstart');
 const outcome=cancel?'CANCELLED':completed?'COMPLETED':began?'INCOMPLETE':'NOT_DELIVERED';
 return {protocolTargets:constructionTargets(r),valid:e.length===0,errors:[...new Set(e)],drift,outcome,eventOrder:types,pointercancel:types.filter(x=>x==='pointercancel').length,touchcancel:types.filter(x=>x==='touchcancel').length,finalValue:r?.final?.value??null,targetDelta:finite(r?.final?.value)?r.final.value-50:null,react:r?.final?.react??null,physicalInput:'NOT_TESTED',cause:'UNKNOWN'};}
export function compare(a,b,expected){const av=validate(a,expected),bv=validate(b,expected),errors=[];
 for(const k of ['pairId','condition','engine','width','motion','method','repetition','head','tree','protocolHash','sourceHash','browserVersion','inputPath'])if(a?.identity?.[k]!==b?.identity?.[k])errors.push('PAIR_IDENTITY:'+k);
 if(a?.identity?.surface===b?.identity?.surface||a?.identity?.trialId===b?.identity?.trialId)errors.push('PAIR_SURFACE_OR_TRIAL');
 const initial=comparePoint(a?.initial,b?.initial),final=comparePoint(a?.final,b?.final);
 const dimensions={};for(const k of ['rect','viewport','scroll']){const all=[...initial[k],...final[k]];dimensions[k]=all.some(x=>x.status==='NOT_RECORDED')?'NOT_RECORDED':all.length?'DIFFER':'MATCH';}
 const group=dimensions.rect==='MATCH'?(dimensions.scroll==='MATCH'?'A':dimensions.scroll==='DIFFER'?'B':'UNKNOWN'):dimensions.rect==='DIFFER'?(dimensions.scroll==='MATCH'?'C':dimensions.scroll==='DIFFER'?'D':'UNKNOWN'):'UNKNOWN';
 const hasDrift=[av,bv].some(v=>Object.values(v.drift).some(x=>x.length));
 const valid=av.valid&&bv.valid&&!errors.length;
 return {valid,errors,dimensions,group,initial,final,withinTrialDrift:{a:av.drift,b:bv.drift},construction:valid&&group===a?.identity?.condition&&dimensions.viewport==='MATCH'&&!hasDrift&&av.protocolTargets.established&&bv.protocolTargets.established?'ESTABLISHED':'NOT_EXECUTABLE',comparison:!valid?'INVALID_EVIDENCE':hasDrift?'WITHIN_TRIAL_CHANGED':dimensions.viewport!=='MATCH'?'VIEWPORT_CONFOUNDED':group==='A'?'RECORDED_CONDITIONS_MATCH':'RECORDED_CONDITIONS_DIFFER',a:av,b:bv};}
