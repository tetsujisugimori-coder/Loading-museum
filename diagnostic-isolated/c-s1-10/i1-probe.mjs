import { createHash } from "node:crypto";

export const originalSwipeSourceSha256 = "e4c043719cad39f475c95ceb8089a66664862f1fbddca67128a97e22b1b21a62";

const swipeStart = "export function SwipeDismiss({active,reduced}:Props){";
const change = "const change=(next:string)=>{live.current=next;setState(next);};";
const timer = "later(()=>{if(gen===epoch.current)change(result);},reduced?0:240);";
const probe = `type I1Mark = 'timerRegistered' | 'callbackStarted' | 'updateRequested' | 'reactCommitted';
function recordSwipeI1(kind:I1Mark,generation:number,state:string,activeGeneration=generation){
 if(typeof window==='undefined')return;
 const recorder=(window as Window & {__lm88StageCI1?:{mark:(kind:I1Mark,generation:number,state:string,activeGeneration:number)=>void}}).__lm88StageCI1;
 recorder?.mark(kind,generation,state,activeGeneration);
}
`;

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
 useLayoutEffect(()=>{recordSwipeI1('reactCommitted',epoch.current,state);},[state,epoch]);`);
  swipe = replaceOnce(swipe, timer, `later(()=>{recordSwipeI1('callbackStarted',gen,result,epoch.current);if(gen===epoch.current)change(result);},reduced?0:240);recordSwipeI1('timerRegistered',gen,result);`);
  return prefix + probe + swipe;
}
