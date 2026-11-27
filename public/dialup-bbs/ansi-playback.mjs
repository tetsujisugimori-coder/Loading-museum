// Frame scheduling only. The caller interprets elapsed time and paints.
export function createPlaybackClock({request,cancel}){
 let id=0,generation=0,running=false,last=null;
 function stop(){
   generation++;if(id)cancel(id);id=0;running=false;last=null;
 }
 function start(tick){
   if(running)return false;
   running=true;last=null;
   const token=++generation;
   function step(now){
     if(token!==generation||!running)return;
     id=0;
     const elapsed=last===null?0:Math.max(0,now-last);last=now;
     tick(elapsed);
     if(token===generation&&running)id=request(step);
   }
   id=request(step);return true;
 }
 return {start,stop,get running(){return running;}};
}
