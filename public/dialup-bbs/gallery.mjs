import {arrivals,snapshot,scrollTimeline} from './terminal.mjs';
const $=id=>document.getElementById(id);
const ascii=s=>Array.from(s,c=>c.charCodeAt(0));
const fixtures={
 '03':{title:'03 低速文字表示',note:'同じ文章でも通信速度が違うと現れる間隔が変わります。7E1/8N1の伝送ビット数を区別したモデルです。',bytes:ascii('WELCOME TO ARCHIVE BBS\r\nMESSAGE BOARD\r\n01 HELLO THERE\r\n02 HAVE A NICE DAY\r\nEND OF MESSAGE'),encoding:'ascii',grid:{columns:24,rows:5}},
 '04':{title:'04 日本語パソコン通信',note:'日本語は複数バイトが揃ってから表示されます。ISO-2022-JPの文字集合切替とShift_JISの分割受信を比較します。実在BBSの符号化を確定した展示ではありません。',grid:{columns:24,rows:5}},
 '05':{title:'05 掲示板連続スクロール',note:'論理行の更新と画面上の移動を比較します。Smoothは1行約166.7msの教材モデルで、通信を止める実機のフロー制御は再現しません。',bytes:ascii('BOARD / LOG\r\n01 HELLO\r\n02 GOOD MORNING\r\n03 NEW MESSAGE\r\n04 SEE YOU\r\n05 END'),encoding:'ascii',grid:{columns:24,rows:3}},
};
const jp={
 'iso-2022-jp':[...ascii('BBS> '),27,36,66,70,124,75,92,27,40,66,...ascii('\r\n'),27,36,66,70,124,75,92,27,40,66,...ascii(' / END')],
 shift_jis:[...ascii('BBS> '),0x93,0xfa,0x96,0x7b,...ascii('\r\n'),0x93,0xfa,0x96,0x7b,...ascii(' / END')],
};
const media=matchMedia('(prefers-reduced-motion: reduce)');
let work='03', scenario, wire, end, scrolls, timeline, duration=0, time=0, frame=0, generation=0, running=false, last=null;
function stop(status){
 generation++;cancelAnimationFrame(frame);frame=0;running=false;last=null;
 $('status').textContent=status;$('pause').disabled=true;$('play').disabled=media.matches;
}
function prepare(){
 stop('待機');const f=fixtures[work];const encoding=work==='04'?$('encoding').value:f.encoding;
 scenario={bytes:work==='04'?jp[encoding]:f.bytes,encoding,transport:{bps:Number($('bps').value),dataBits:encoding==='iso-2022-jp'?7:8,parity:encoding==='iso-2022-jp'?'even':'none'},grid:f.grid};
 wire=arrivals(scenario.bytes,scenario.transport);end=snapshot(scenario);scrolls=end.scrolls;
 timeline=scrollTimeline(scrolls,work==='05'&&$('scroll').value==='smooth'?'smooth':'jump');
 duration=Math.max(wire.at(-1)?.atMs??0,timeline.at(-1)?.endMs??0);
 time=0;$('seek').max=String(duration);$('work-title').textContent=f.title;$('explanation').textContent=f.note;
 $('encoding-control').hidden=work!=='04';$('scroll-control').hidden=work!=='05';
 for(const b of $('works').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.work===work));
 $('screen').style.setProperty('--rows',String(f.grid.rows));$('screen').style.setProperty('--columns',String(f.grid.columns));
 if(media.matches)stop('動き軽減：手動操作できます');render();
}
function row(cells){
 const r=document.createElement('div');r.className='row';
 for(let i=0;i<cells.length;i++){const c=cells[i];if(c===null)continue;const s=document.createElement('span');s.textContent=c;if(cells[i+1]===null)s.className='wide';r.append(s);}
 return r;
}
function render(){
 const state=snapshot(scenario,time);
 // The display queue is independent of the logical terminal. Freeze incoming text
 // during a visual row transition, then catch up at the next presentation boundary.
 let rows=state.cells, fraction=0;
 if(work==='05'&&$('scroll').value==='smooth'&&!media.matches){
   const i=timeline.findIndex(e=>e.endMs>time&&scrolls[timeline.indexOf(e)].atMs<=time);
   if(i!==-1){
     const e=timeline[i],at=scrolls[i].atMs;
     const before=snapshot(scenario,Math.max(0,at-1e-7)).cells;
     const after=snapshot(scenario,at).cells;
     if(time<e.startMs){rows=before;}
     else{rows=[...before,after.at(-1)];fraction=(time-e.startMs)/(e.endMs-e.startMs);}
   }
 }
 const strip=document.createElement('div');strip.style.transform='translateY('+(-fraction*1.5)+'em)';
 strip.append(...rows.map(row));$('screen').replaceChildren(strip);
 $('received').textContent=state.received.length+' / '+wire.length;
 $('time').textContent=Math.round(time)+' / '+Math.round(duration)+' ms';
 $('lines').textContent=String(state.scrolls.length);
 $('mode').textContent=scenario.encoding+' / '+scenario.transport.bps+' bps';
 $('hex').textContent=state.received.map(e=>e.byte.toString(16).padStart(2,'0').toUpperCase()).join(' ');
 $('decoded').textContent=state.decoded.map(e=>e.char).join('');
 $('logical').textContent=state.cells.map(r=>r.map(c=>c??'').join('')).join('\n');
 $('seek').value=String(time);
 $('step').disabled=time>=duration;
 $('instant').disabled=time>=duration;
}
function go(value,status){stop(status);time=Math.max(0,Math.min(duration,value));render();}
function play(){
 if(media.matches||document.hidden||running)return;
 if(time>=duration)time=0;
 running=true;last=null;$('status').textContent='再生中';$('play').disabled=true;$('pause').disabled=false;
 const token=++generation;
 function tick(now){
   if(token!==generation||!running)return;
   if(document.hidden||media.matches){stop('停止');return;}
   if(last!==null)time=Math.min(duration,time+(now-last)*Number($('rate').value));
   last=now;render();
   if(time>=duration){stop('完了');return;}frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);
}
$('works').addEventListener('click',e=>{const button=e.target.closest('button[data-work]');if(!button||button.dataset.work===work)return;work=button.dataset.work;prepare();});
for(const id of ['bps','encoding','scroll'])$(id).addEventListener('change',prepare);
$('rate').addEventListener('change',()=>{if(running)last=null;});
$('play').addEventListener('click',play);$('pause').addEventListener('click',()=>stop('停止'));
$('reset').addEventListener('click',()=>go(0,'待機'));
$('instant').addEventListener('click',()=>go(duration,'完了（即時表示）'));
$('seek').addEventListener('input',e=>go(Number(e.target.value),'手動観察'));
$('step').addEventListener('click',()=>go(wire.find(e=>e.atMs>time)?.atMs??duration,'手動観察'));
media.addEventListener('change',()=>{stop(media.matches?'動き軽減：手動操作できます':'停止');render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('停止（画面非表示）');});
window.addEventListener('pagehide',()=>stop('停止'));
try{prepare();}catch(error){stop('この環境では教材の復号に失敗しました');for(const b of document.querySelectorAll('button,select,input'))b.disabled=true;console.error(error);}
