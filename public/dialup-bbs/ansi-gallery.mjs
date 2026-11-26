import {describeAttribute} from './ansi-terminal.mjs';
import {artBytes,frameBytes,attributeSample,compileTimeline,timelineAt,dwellMs,grid} from './ansi-scenarios.mjs';
import {createPlaybackClock} from './ansi-playback.mjs';
import {syncPlaybackControls} from './playback-controls.mjs';
const $=id=>document.getElementById(id);
const media=matchMedia('(prefers-reduced-motion: reduce)');
const palette=['#101316','#253b73','#376344','#387776','#834040','#7a487e','#917348','#c7d0cf','#6e7980','#5e78b4','#78ab85','#75bdba','#c77c78','#bc87bb','#e2bf7b','#edf0e9'];
const names={
 '06':['ANSIアートが届くまで','同じ絵でも受信速度により届く時間が違います。色・カーソルの制御バイトにも時間がかかり、命令は最後のバイトが届いてから反映されます。'],
 '07':['文字端末の中で動く絵','固定画面で宇宙船が移動します。全面／差分は同じ目標画面を作ります。フレーム間の420 msは展示用の待ちで、通信時間には含めません。'],
 '08':['同じ1ビット、異なる表現','0x9Fのビット7を、点滅指定または背景色の高輝度として解釈します。ANSI制御、画面メモリ、ハードウェア設定、SAUCEの意味は別です。']
};
const hashWork=()=>/^#bbs-(06|07|08)$/.exec(location.hash)?.[1]??'06';
const canvas=Array.from({length:grid.columns*grid.rows},()=>document.createElement('span'));
$('screen').append(...canvas);
const clock=createPlaybackClock({request:f=>requestAnimationFrame(f),cancel:id=>cancelAnimationFrame(id)});
let work=hashWork(),timeline,time=0,activeMode='blink',lastByte=null,phase=null,renderCount=0;
function controls(){syncPlaybackControls({play:$('play'),pause:$('pause'),reset:$('reset'),active:document.activeElement,playing:clock.running,reduced:media.matches});}
function stop(status){
  clock.stop();
  $('status').textContent=status;controls();
}
const defaultStatus=()=>media.matches?'動き軽減：手動・静止観察':'待機';
const paint=(span,style,hidden=false)=>{
  span.style.backgroundColor=palette[style.background];
  span.style.color=hidden?'#7485a0':palette[style.foreground];
};
const ms=n=>n.toFixed(1)+' ms';
function paintWire(){
  const checkpoint=timelineAt(timeline,time),state=checkpoint.state;
  if(lastByte!==state.bytes){
    lastByte=state.bytes;
    for(const [index,c] of state.cells.flat().entries()){
      const node=canvas[index];node.textContent=c.char;paint(node,describeAttribute(c.attr));
    }
    $('logical').textContent=state.cells.map(r=>r.map(c=>c.char).join('')).join('\n');
    $('commands').textContent=state.commands.map(c=>c.offset+': '+c.sequence+(c.supported?'':'（未対応）')).join('\n');
    $('received').textContent=state.bytes+' / '+timeline.total;
    $('writes').textContent=String(state.writes);
    $('frame-number').textContent=checkpoint.frame+' / '+timeline.ends.length;
    renderCount++;
  }
  $('time').textContent=ms(time)+' / '+ms(timeline.duration);
  const complete=time>=timeline.duration;
  const focused=document.activeElement;
  if(complete&&(focused===$('step')||focused===$('instant')))$('reset').focus({preventScroll:true});
  $('step').disabled=complete;
  $('instant').disabled=complete;
  return state;
}
function paintAttr(){
  const dim=clock.running&&!media.matches&&time%1600>=1200;
  if(phase!==dim){
    phase=dim;
    for(const mode of ['blink','bright']){
      const rows=attributeSample.map(row=>{
        const el=document.createElement('div'),style=describeAttribute(row.attr,mode);
        el.textContent=row.text;el.dataset.attribute=row.attr.toString(16);el.dataset.background=String(style.background);
        paint(el,style,style.blink&&dim);return el;
      });
      $(mode+'-screen').replaceChildren(...rows);
    }
    renderCount++;
  }
  for(const mode of ['blink','bright']){
    $(mode+'-mode').setAttribute('aria-pressed',String(activeMode===mode));
    $(mode+'-card').dataset.selected=String(activeMode===mode);
  }
  const sample=describeAttribute(0x9f,activeMode);
  $('bit-meaning').textContent='属性 0x9F：前景 '+sample.foreground+'（ビット0–3、明るさを含む）、背景 '+sample.background+'（ビット4–6'+(activeMode==='bright'?'＋7':'')+'）。ビット7は'+(sample.blink?'この文字を点滅させます。':'背景の高輝度です。');
  return {dim};
}
function render(){
  const state=work==='08'?paintAttr():paintWire();
  // Contract for browser verification; does not drive paint or controls.
  $('work-title').dataset.observation=JSON.stringify({work,state,renderCount,playing:clock.running,time,selectedMode:activeMode});
}
function prepare(){
  stop(defaultStatus());time=0;lastByte=null;phase=null;renderCount=0;
  const atr=work==='08';
  $('wire-panel').hidden=atr;$('attr-panel').hidden=!atr;
  $('frame-mode-label').hidden=work!=='07';$('frame-metric').hidden=work!=='07';
  $('step').hidden=atr;$('instant').hidden=false;$('instant').disabled=false;
  $('step').textContent=work==='07'?'次のコマへ':'1バイト進む';
  $('work-title').textContent=work+' '+names[work][0];$('explanation').textContent=names[work][1];
  for(const b of $('ansi-works').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.work===work));
  if(!atr){
    const bps=Number($('bps').value);
    const waves=work==='06'?[artBytes()]:frameBytes($('frame-mode').value);
    timeline=compileTimeline(waves,bps,{hold:work==='07'?dwellMs:0});
    $('mode').textContent='8N1 / '+bps+' bps';
    $('traffic').textContent='制御を含む回線上のバイト：'+timeline.total+' B（通信 '+ms(timeline.wireMs)+'）';
    if(work==='07'){
      const other=$('frame-mode').value==='full'?'diff':'full';
      const alternate=compileTimeline(frameBytes(other),bps,{hold:dwellMs});
      $('traffic').textContent+=' ／ '+(other==='full'?'全面':'差分')+'なら '+alternate.total+' B（通信 '+ms(alternate.wireMs)+'）。';
    }
  }
  render();
}
function play(){
  if(clock.running||media.matches||document.hidden)return;
  if(work!=='08'&&time>=timeline.duration)time=0;
  clock.start(elapsed=>{
    if(document.hidden||media.matches){stop('停止');render();return;}
    time+=elapsed;
    if(work!=='08'&&time>=timeline.duration){
      time=timeline.duration;stop('完了');render();return;
    }
    render();
  });
  $('status').textContent='再生中';controls();render();
}
function go(value,status){stop(status);time=value;render();}
function select(id){
  if(!Object.hasOwn(names,id)||id===work)return;
  work=id;prepare();
}
$('ansi-works').addEventListener('click',e=>{
  const b=e.target.closest('button[data-work]');if(!b)return;
  const id=b.dataset.work;
  if(location.hash!=='#bbs-'+id)history.pushState(null,'','#bbs-'+id);
  select(id);
});
window.addEventListener('hashchange',()=>select(hashWork()));
window.addEventListener('pagehide',()=>{stop('停止');render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop('停止（画面非表示）');render();}});
media.addEventListener('change',()=>{stop(media.matches?defaultStatus():'停止');render();});
for(const id of ['bps','frame-mode'])$(id).addEventListener('change',prepare);
$('attr-modes').addEventListener('click',e=>{
  const b=e.target.closest('button[data-mode]');if(!b)return;
  activeMode=b.dataset.mode;render();
});
$('play').onclick=play;
$('pause').onclick=()=>{stop('停止');render();};
$('reset').onclick=()=>{if(work==='08')activeMode='blink';go(0,defaultStatus());};
$('instant').onclick=()=>go(work==='08'?0:timeline.duration,work==='08'?'静止比較':'完了（即時表示）');
$('step').onclick=()=>{
  const events=work==='07'?timeline.ends:timeline.events;
  go(events.find(e=>e.atMs>time)?.atMs??timeline.duration,'手動観察');
};
for(const [i,value] of [...'10011111'].entries()){
 const item=document.createElement('span');item.textContent=(7-i)+':'+value;$('bits').append(item);
}
prepare();
