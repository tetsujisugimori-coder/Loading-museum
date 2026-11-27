// Host adapter. Simulation time advances only when the scheduled event commits.
export function eventClock({schedule=setTimeout,unschedule=clearTimeout}={}) {
  let pending=null,generation=0,running=false;
  function stop(){
    generation++;running=false;
    if(pending!==null) unschedule(pending);
    pending=null;
  }
  function start({nextDelay,onEvent}){
    if(running) return false;
    const token=++generation;
    running=true;
    const next=()=>{
      const wait=nextDelay();
      if(wait===null){stop();return;}
      pending=schedule(()=>{
        if(!running||token!==generation) return;
        pending=null;onEvent();
        if(running&&token===generation) next();
      },wait);
    };
    next();return true;
  }
  return {start,stop};
}
