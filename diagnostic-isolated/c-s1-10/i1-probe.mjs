import { createHash } from "node:crypto";

export const originalSwipeSourceSha256 = "e4c043719cad39f475c95ceb8089a66664862f1fbddca67128a97e22b1b21a62";

const swipeStart = "export function SwipeDismiss({active,reduced}:Props){";
const change = "const change=(next:string)=>{live.current=next;setState(next);};";
const timer = "later(()=>{if(gen===epoch.current)change(result);},reduced?0:240);";
const probe = `type TimingMark = 'timerRegistered' | 'callbackStarted' | 'updateRequested' | 'reactCommitted' |
 'driverTargetMarked' | 'domStateAtCommit' | 'domMutationDelivered' | 'transitionDelivered' | 'observerUnavailable';
type TimingDetail = string | readonly [string,string,number] | null;
function recordSwipeI1(kind:TimingMark,generation:number,state:string|null,activeGeneration=generation,detail:TimingDetail=null){
 if(typeof window==='undefined')return;
 const recorder=(window as Window & {__lm88StageCI1?:{mark:(kind:TimingMark,generation:number,state:string|null,activeGeneration:number,detail:TimingDetail)=>void}}).__lm88StageCI1;
 recorder?.mark(kind,generation,state,activeGeneration,detail);
}
`;

const driverMarkEffect = `useLayoutEffect(()=>{
  const target=root.current;
  if(!target)return;
  const onTargetMark=(event:Event)=>{
   if(event.target!==target)return;
   let callId:unknown;
   try{callId=(event as CustomEvent).detail;}catch{return;}
   if(typeof callId!=='string'||!callId)return;
   const generation=epoch.current;
   recordSwipeI1('driverTargetMarked',generation,null,generation,callId);
  };
  target.addEventListener('__playwright_mark_target__',onTargetMark);
  return()=>target.removeEventListener('__playwright_mark_target__',onTargetMark);
 },[root,epoch]);`;

const reactCommit = "recordSwipeI1('reactCommitted',epoch.current,state);";
const i2Effect = `useLayoutEffect(()=>{
  const target=root.current,card=cardRef.current;
  if(!target||!card||typeof MutationObserver==='undefined'){
   recordSwipeI1('observerUnavailable',epoch.current,null,epoch.current,!target||!card?'target':'MutationObserver');
   return;
  }
  const observer=new MutationObserver(records=>{
   const stateAtDelivery=target.getAttribute('data-state'),generation=epoch.current;
   for(const record of records){
    if(record.target===target&&record.attributeName==='data-state')
     recordSwipeI1('domMutationDelivered',generation,stateAtDelivery,generation,record.oldValue);
   }
  });
  observer.observe(target,{attributes:true,attributeFilter:['data-state'],attributeOldValue:true});
  const events=['transitionrun','transitionstart','transitionend','transitioncancel'] as const;
  const onTransition=(event:TransitionEvent)=>{
   if(event.target!==card||(event.propertyName!=='transform'&&event.propertyName!=='opacity'))return;
   const generation=epoch.current;
   recordSwipeI1('transitionDelivered',generation,null,generation,[event.type,event.propertyName,event.elapsedTime]);
  };
  for(const type of events)card.addEventListener(type,onTransition);
  return()=>{observer.disconnect();for(const type of events)card.removeEventListener(type,onTransition);};
 },[root,epoch,cardRef]);`;

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error("I1 source anchor did not match exactly once");
  return source.replace(before, after);
}

/** Returns an isolated I1 source copy from the fixed experiment input (5de4b08). */
export function instrumentSwipeI1(source) {
  const digest = createHash("sha256").update(source).digest("hex");
  if (digest !== originalSwipeSourceSha256) throw new Error("I1 source hash mismatch");
  const split = source.indexOf(swipeStart);
  if (split < 0) throw new Error("I1 Swipe function is missing");
  const prefix = replaceOnce(source.slice(0, split), "useCallback,useEffect,useRef", "useCallback,useEffect,useLayoutEffect,useRef");
  let swipe = replaceOnce(source.slice(split), change, `const change=(next:string)=>{live.current=next;recordSwipeI1('updateRequested',epoch.current,next);setState(next);};
 useLayoutEffect(()=>{${reactCommit}},[state,epoch]);
 ${driverMarkEffect}`);
  swipe = replaceOnce(swipe, timer, `later(()=>{recordSwipeI1('callbackStarted',gen,result,epoch.current);if(gen===epoch.current)change(result);},reduced?0:240);recordSwipeI1('timerRegistered',gen,result);`);
  return prefix + probe + swipe;
}

/** Adds the registered I2 observations only to the isolated Swipe copy. */
export function instrumentSwipeI2(source) {
  const i1 = instrumentSwipeI1(source);
  const split = i1.indexOf(swipeStart) + swipeStart.length;
  let swipe = i1.slice(split);
  swipe = "\n const cardRef=useRef<HTMLButtonElement>(null);" + swipe;
  swipe = replaceOnce(swipe, '<button className={s.card} aria-label="スワイプするカード"', '<button ref={cardRef} className={s.card} aria-label="スワイプするカード"');
  swipe = replaceOnce(swipe, `useLayoutEffect(()=>{${reactCommit}},[state,epoch]);`,
    `useLayoutEffect(()=>{${reactCommit}recordSwipeI1('domStateAtCommit',epoch.current,root.current?.getAttribute('data-state')??null);},[state,epoch,root]);
 ${i2Effect}`);
  return i1.slice(0, split) + swipe;
}
