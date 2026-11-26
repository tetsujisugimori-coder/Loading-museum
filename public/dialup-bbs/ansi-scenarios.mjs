import {arrivals} from './terminal.mjs';
import {createAnsiTerminal,sameCell,defaultAttribute} from './ansi-terminal.mjs';

export const grid=Object.freeze({columns:24,rows:8});
export const speeds=Object.freeze([2400,9600,14400,28800]);
const encode=text=>new TextEncoder().encode(text); // only original ASCII glyphs + control bytes
const csi=s=>'\x1b['+s;
const pos=(row,col)=>csi((row+1)+';'+(col+1)+'H');
const paint=(row,col,text,sgr=0)=>pos(row,col)+csi('0;'+sgr+'m')+text;
const nightLines=[
  [0,4,'ARCHIVE / 1994','1;36'],
  [2,2,'*','1;37'],[2,10,'+','1;33'],[2,20,'*','1;37'],
  [3,3,'   _/\\_       .','1;35'],
  [4,3,'--<____>--','1;37;44'],
  [5,5,'/  \\     :','1;36'],
  [6,0,'--- NIGHT SIGNAL ----','34;46'],
  [7,3,'LINE READY / 01','1;32'],
];
export const artBytes=()=>encode(csi('2J')+nightLines.map(([r,c,t,s])=>paint(r,c,t,s)).join(''));
export const targetFrames=()=>Array.from({length:6},(_,n)=>{
  const cells=Array.from({length:grid.rows},()=>Array.from({length:grid.columns},()=>({char:' ',attr:defaultAttribute,sgr:0})));
  const draw=(row,col,s,sgr,attr)=>Array.from(s).forEach((char,i)=>{cells[row][col+i]={char,attr,sgr};});
  draw(0,2,'ORBITAL POST / 06','1;36',11);
  draw(2,2,'*',37,7);draw(2,21,'+',33,6);draw(4,14,'.',35,5);
  draw(7,0,'========================','34;46',0x31);
  draw(3,1+n*3,'<==>','1;37;44',0x1f);
  return cells;
});
export function frameBytes(mode='diff'){
  if(!['full','diff'].includes(mode))throw new RangeError('frame mode');
  let previous;
  return targetFrames().map(cells=>{
    const full=mode==='full'||!previous;
    let stream=full?csi('2J'):'';
    for(const [y,row] of cells.entries()){
      for(let x=0;x<row.length;){
        if(!full&&sameCell(row[x],previous[y][x])){x++;continue;}
        const start=x,style=row[x].sgr;let chunk='';
        while(x<row.length&&row[x].sgr===style&&(full||!sameCell(row[x],previous[y][x])))chunk+=row[x++].char;
        stream+=paint(y,start,chunk,style);
      }
    }
    previous=cells;return encode(stream);
  });
}
// Fixed sample of IBM-compatible screen memory attributes, not two pictures
// or ANSI source bytes. This is intentionally low contrast when blinking.
export const attributeSample=Object.freeze([
  Object.freeze({text:'ARCHIVE / COLOR',attr:0x1f}),
  Object.freeze({text:'BIT 7 IS SET',attr:0x9f}),
  Object.freeze({text:'BIT 7 IS CLEAR',attr:0x1f}),
]);
export const dwellMs=420; // exhibit pause between completed frames, not wire time
export const wireTime=(count,bps)=>count*10000/bps; // 8N1: 10 modeled line bits
export function compileTimeline(waves,bps,{hold=0}={}){
  if(!speeds.includes(bps))throw new RangeError('display speed');
  const terminal=createAnsiTerminal(grid),events=[],ends=[];
  let start=0,cumulative=0;
  for(const [i,bytes] of waves.entries()){
    for(const event of arrivals(bytes,{bps,dataBits:8,parity:'none',stopBits:1})){
      terminal.feed([event.byte]);events.push({atMs:start+event.atMs,frame:i+1,state:terminal.snapshot()});
    }
    cumulative+=bytes.length;
    const end=start+wireTime(bytes.length,bps);
    ends.push({atMs:end,bytes:cumulative});
    start=end+hold;
  }
  return {initial: createAnsiTerminal(grid).snapshot(),events,ends,duration:ends.at(-1)?.atMs??0,total:cumulative,wireMs:wireTime(cumulative,bps)};
}
// Binary search of immutable timeline boundaries; zero/speed-independent logical state.
export function timelineAt(timeline,atMs){
  let lo=0,hi=timeline.events.length;
  while(lo<hi){
    const m=(lo+hi)>>1;
    if(timeline.events[m].atMs<=atMs)lo=m+1;else hi=m;
  }
  return lo?timeline.events[lo-1]:{atMs:0,frame:0,state:timeline.initial};
}
