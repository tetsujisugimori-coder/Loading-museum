export type Card = {id:string; title:string; column:number};
export const initialCards:Card[]=[{id:'c1',title:'展示を調べる',column:0},{id:'c2',title:'設計を描く',column:0},{id:'c3',title:'操作を試す',column:1}];
// Index is in the destination column AFTER removing the moving card.
export function moveCard(cards:Card[],id:string,column:number,index:number):Card[]{
 const card=cards.find(c=>c.id===id);if(!card||!Number.isInteger(column)||column<0||column>2||!Number.isInteger(index))return cards;
 const rest=cards.filter(c=>c.id!==id),target=rest.filter(c=>c.column===column);
 if(index<0||index>target.length)return cards;
 target.splice(index,0,{...card,column});
 const result=[0,1,2].flatMap(col=>col===column?target:rest.filter(c=>c.column===col));
 return JSON.stringify(result)===JSON.stringify(cards)?cards:result;
}
export type FlowNode={id:string;title:string;x:number;y:number};
export type Edge={from:string;to:string};
export type Flow={nodes:FlowNode[];edges:Edge[]};
export const initialFlow:Flow={nodes:[{id:'n1',title:'入力',x:10,y:20},{id:'n2',title:'変換',x:55,y:55}],edges:[{from:'n1',to:'n2'}]};
export function connectionError(flow:Flow,from:string,to:string):string{
 if(!flow.nodes.some(n=>n.id===from)||!flow.nodes.some(n=>n.id===to))return '存在するノードを選んでください';
 if(from===to)return '自己接続はできません';
 if(flow.edges.some(e=>e.from===from&&e.to===to))return '同じ接続が既にあります';
 const visited=new Set<string>();const reaches=(id:string):boolean=>{if(id===from)return true;if(visited.has(id))return false;visited.add(id);return flow.edges.filter(e=>e.from===id).some(e=>reaches(e.to))};
 return reaches(to)?'循環する接続はできません':'';
}
export function deleteNode(flow:Flow,id:string):Flow{return {nodes:flow.nodes.filter(n=>n.id!==id),edges:flow.edges.filter(e=>e.from!==id&&e.to!==id)}};
export type Appointment={id:string;title:string;start:number;end:number};
export const initialSchedule:Appointment[]=[{id:'s1',title:'調査',start:540,end:600},{id:'s2',title:'制作',start:630,end:720}];
export function validTime(start:number,end:number){return Number.isInteger(start)&&Number.isInteger(end)&&start>=480&&end<=1200&&end>start&&start%15===0&&end%15===0}
export function overlaps(items:Appointment[],item:Appointment){return items.filter(x=>x.id!==item.id&&x.start<item.end&&item.start<x.end).map(x=>x.id)}
export function formatTime(value:number){return `${Math.floor(value/60).toString().padStart(2,'0')}:${(value%60).toString().padStart(2,'0')}`}
export function parseTime(value:string){if(!/^\d{2}:\d{2}$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h<=23&&m<=59?h*60+m:NaN}
export type DiffRow={kind:'same'|'add'|'remove'|'change';oldLine?:number;newLine?:number;oldText?:string;newText?:string;hunk?:number};
// Empty input has zero lines; a trailing newline has an empty final line.
export function diffLines(oldText:string,newText:string):DiffRow[]{
 const a=oldText===''?[]:oldText.split('\n'),b=newText===''?[]:newText.split('\n');
 if(a.length>240||b.length>240||oldText.length>24000||newText.length>24000)throw Error('各版240行・24,000文字まで比較できます');
 const lcs=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)lcs[i][j]=a[i]===b[j]?lcs[i+1][j+1]+1:Math.max(lcs[i+1][j],lcs[i][j+1]);
 const result:DiffRow[]=[];let i=0,j=0,hunk=0;
 while(i<a.length||j<b.length){
  if(i<a.length&&j<b.length&&a[i]===b[j]){result.push({kind:'same',oldLine:i+1,newLine:j+1,oldText:a[i++],newText:b[j++]});continue}
  hunk++;const removed:{text:string;line:number}[]=[],added:{text:string;line:number}[]=[];
  while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j])break;
   if(i<a.length&&(j===b.length||lcs[i+1][j]>=lcs[i][j+1]))removed.push({text:a[i],line:++i});else added.push({text:b[j],line:++j});
  }
  for(let k=0;k<Math.max(removed.length,added.length);k++)result.push({kind:removed[k]&&added[k]?'change':removed[k]?'remove':'add',oldLine:removed[k]?.line,newLine:added[k]?.line,oldText:removed[k]?.text,newText:added[k]?.text,hunk});
 }
 return result;
}
export function contrast(a:string,b:string){const lum=(hex:string)=>{const c=hex.match(/[a-f\d]{2}/gi)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
