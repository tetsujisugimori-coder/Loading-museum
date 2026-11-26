// Bounded ECMA-48 teaching subset; printable bytes are intentionally ASCII.
// This module owns the logical grid, never presentation timing or the DOM.
export const defaultAttribute=0x07;
export const sameCell=(a,b)=>a.char===b.char&&a.attr===b.attr;
const vga=[0,4,2,6,1,5,3,7]; // SGR colour order to RGBI attribute indices
export function describeAttribute(attr,mode='blink'){
  if(!Number.isInteger(attr)||attr<0||attr>255||!['blink','bright'].includes(mode))throw new RangeError('attribute mode');
  return {foreground:attr&15,background:(attr>>4)&(mode==='bright'?15:7),blink:mode==='blink'&&Boolean(attr&128)};
}

export function createAnsiTerminal({columns=24,rows=8}={}){
  if(!Number.isInteger(columns)||columns<2||columns>80||!Number.isInteger(rows)||rows<1||rows>25)throw new RangeError('grid');
  const blank=()=>({char:' ',attr:defaultAttribute});
  let cells=Array.from({length:rows},()=>Array.from({length:columns},blank));
  let x=0,y=0,attr=defaultAttribute,mode='text',parameters='',count=0,writes=0,erasures=0;
  const commands=[],diagnostics=[];
  const note=(list,value)=>{if(list.length===32)list.shift();list.push(value);};
  const fault=reason=>note(diagnostics,{offset:count,reason});
  const down=()=>{if(y<rows-1)y++;else{cells.shift();cells.push(Array.from({length:columns},blank));}};
  function sgr(values){
    let next=attr;
    for(const v of values){
      if(v===0)next=defaultAttribute;
      else if(v===1)next|=8;
      else if(v===22)next&=~8;
      else if(v===5)next|=128;
      else if(v===25)next&=127;
      else if(v===39)next=(next&0xf0)|7;
      else if(v===49)next&=0x8f;
      else if(v>=30&&v<=37)next=(next&0xf8)|vga[v-30];
      else if(v>=40&&v<=47)next=(next&0x8f)|(vga[v-40]<<4);
      else return false; // unsupported SGR has no partial side effects
    }
    attr=next;return true;
  }
  function dispatch(final){
    const values=parameters.split(';').map(v=>v===''?0:Number(v));
    let supported=true;
    if(final==='m')supported=sgr(values);
    else if((final==='H'||final==='f')&&values.length<=2){
      y=Math.min(rows-1,(values[0]||1)-1);x=Math.min(columns-1,(values[1]||1)-1);
    }else if(final==='J'&&values.length===1&&values[0]===2){
      cells=cells.map(r=>r.map(blank));erasures+=columns*rows; // ECMA ED does not home the cursor
    }else if('ABCD'.includes(final)&&values.length===1){
      const n=values[0]||1;
      y=Math.min(rows-1,Math.max(0,y+(final==='B'?n:final==='A'?-n:0)));
      x=Math.min(columns-1,Math.max(0,x+(final==='C'?n:final==='D'?-n:0)));
    }else supported=false;
    note(commands,{offset:count,sequence:'CSI '+parameters+final,supported});
    if(!supported)fault('未対応のCSI命令');
  }
  function feed(bytes){
    for(const byte of bytes){
      if(!Number.isInteger(byte)||byte<0||byte>255)throw new RangeError('byte');
      count++;
      if(byte===27){if(mode==='csi')fault('CSIの途中にESC');mode='escape';parameters='';continue;}
      if(mode==='escape'){
        if(byte===91)mode='csi';
        else{fault('未対応のESC命令');mode='text';}
        continue;
      }
      if(mode==='discard'){if(byte>=0x40&&byte<=0x7e)mode='text';continue;}
      if(mode==='csi'){
        if(byte>=0x40&&byte<=0x7e){dispatch(String.fromCharCode(byte));mode='text';continue;}
        if((byte>=48&&byte<=57||byte===59)&&parameters.length<32)parameters+=String.fromCharCode(byte);
        else{fault('CSIの構文または長さが対象外');mode='discard';}
        continue;
      }
      if(byte===13){x=0;continue;} if(byte===10){down();continue;}
      if(byte===8){x=Math.max(0,x-1);continue;}
      if(byte<32||byte>126){fault('未対応の文字バイト');continue;}
      if(x===columns){x=0;down();}
      cells[y][x]={char:String.fromCharCode(byte),attr};x++;writes++;
    }
  }
  const snapshot=()=>({cells:cells.map(r=>r.map(c=>({...c}))),cursor:{x,y},attr,bytes:count,writes,erasures,pending:mode!=='text',commands:[...commands],diagnostics:[...diagnostics]});
  return {feed,snapshot};
}
