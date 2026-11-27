import {simulator, ledState, plan} from './communications.mjs';
import {eventClock} from './communications-clock.mjs';
import {syncPlaybackControls} from './playback-controls.mjs';
import {arrivals, decode, terminal} from './terminal.mjs';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const control={play:$('play'),pause:$('pause'),reset:$('reset')};
const settings=['rate','outcome','fault','patrol-mode','patrol-fault'];
const stages={idle:'待機',initializing:'初期化',ready:'コマンド状態',dialing:'発信',calling:'呼出',negotiating:'ハンドシェイク',online:'接続済み',disconnecting:'切断処理',offline:'オフライン',waiting:'受信開始待ち',transfer:'転送中',failed:'失敗',done:'完了',cancelled:'キャンセル済み'};
const ledLabels={HS:'高速接続後に保持',AA:'自動応答（このデモでは無効）',CD:'相手のキャリア',RD:'モデムから端末へ',SD:'端末からモデムへ',TR:'端末からのDTR',MR:'稼働状態'};
const usr=['US Robotics Courier V.Everything External Modem: Getting Started（1996年、§1–2）','https://support.usr.com/support/2805/2805-files/2805-ig.pdf#page=9'];
const at=['3Com/U.S. Robotics Courier Command Reference（2000年、§5・§8・付録D）','https://support.usr.com/support/s-cour/s-cour-docs/494-01.zip'];
const facts={
 '09':['モデムのランプは何を語るか','通信の段階を進めると、DTR・キャリア・送受信データを示すランプが変わります。','1996年の実機資料による7灯の抜粋です。送受信は該当イベントの状態を次のイベントまで保持し、点灯条件を観察できるようにしました。実機のパルス周期や図表間で不明な灯は再現していません。',[usr]],
 '10':['電話回線の向こうへ','AT応答から回線状態、キャリア交渉、CONNECT、DTRによる切断まで、端末の表示と内部処理を比較します。','ATの結果コードは資料に対応。ATD[DEMO]は架空の宛先を表す画面上の記号です。接続結果の28800は規格にある速度例で、選んだ端末側bpsとは別です。段階の長さと、波形を扱わない交渉表示は現代の展示モデルです。',[at,['ITU-T V.8（1994年9月）','https://www.itu.int/rec/T-REC-V.8-199409-S'],['ITU-T V.34（1994年9月）','https://www.itu.int/ITU-T/recommendations/rec.aspx?rec=2756']]],
 '11':['ファイルが届くまで','同じブロックの再送で回線使用量が増えても、受信確定済みのファイルは二重に増えません。','チェックサム版XMODEMの128バイトブロックをモデル化しました。3回で停止する上限は展示用です。失敗後は最初から再試行し、中断箇所からの永続再開はしません。YMODEM・ZMODEMの機能は実装していません。',[['XMODEM/YMODEM Protocol Reference（1988年6月18日、§7）','https://www.classic-computing.de/hellwie/pdf/XMODEM_YMODEM%20Protocol%20Reference.pdf#page=20'],['RFC 916（1984年、§II.2）','https://www.rfc-editor.org/rfc/rfc916.html#section-2']]],
 '12':['通信を自動で巡回する','架空の掲示板を接続中に巡回し、保存したログは切断後に読めます。自動では操作がまとまり、手動では段階ごとに進めます。','ログ取得・整理を助ける当時の自動巡回を、独自の架空サービスで再構成しました。料金・操作時間・具体的なサービスのコマンドは復元していません。自動巡回はルールに沿う処理であり、AIエージェントではありません。',[['NIFMCR3 3.20 作者の配布説明（1997年）','https://www.vector.co.jp/soft/dos/net/se022371.html'],['オウチャクン29.0 作者の配布説明（1998年）','https://www.vector.co.jp/soft/dos/net/se013063.html'],['窓の杜：AirCraft97（同時代紹介、1997年）','https://forest.watch.impress.co.jp/obsolete/rev/aircraft.html'],['@nifty：NIFTY-Serveの時間制コース資料','https://faq.support.nifty.com/3926']]],
};
let controller, work, compare='';
const clock=eventClock();
const boards=()=>[...$('boards').querySelectorAll('input:checked')].map(x=>Number(x.value));
const options=()=>({rate:Number($('rate').value),outcome:$('outcome').value,fault:$('fault').value,patrolMode:$('patrol-mode').value,patrolFault:$('patrol-fault').value,boards:boards()});
function list(node,entries,make){
  node.replaceChildren(...entries.map(e=>{const li=document.createElement('li');make(li,e);return li;}));
}
function stopClock(){
  clock.stop();
  controller?.pause();
}
function tick(){
  clock.start({nextDelay:()=>{
    const s=controller.snapshot();
    return !s.playing||s.nextAt===null?null:Math.max(0,s.nextAt-s.elapsed);
  },onEvent:()=>{controller.step();advance();}});
}
function draw(){
  const s=controller.snapshot();
  document.body.dataset.work=work;
  document.body.dataset.phase=s.state;
  document.body.dataset.steps=String(s.index);
  document.body.dataset.playing=String(s.playing);
  document.body.dataset.ready='true';
  $('status').textContent = s.state==='failed'?'処理に失敗しました。再試行できます。':s.state==='cancelled'?'キャンセルしました。':s.finished?'完了しました。':s.playing?'再生中': (reduced.matches?'動き軽減：ステップで操作できます。':$('patrol-mode').value==='manual'&&work==='12'?'手動：ステップで操作できます。':'停止中：再生・ステップを選べます。');
  $('phase').textContent=stages[s.state];
  $('count').textContent=s.index+' / '+s.total;
  $('elapsed').textContent=Math.round(s.elapsed)+' ms';
  $('wire').textContent=s.tx+' B / '+s.rx+' B（合計 '+(s.tx+s.rx)+' B）';
  $('transfer-progress').value=s.accepted.length;
  $('transfer').textContent='送信した有効データ '+s.sentUseful+' B（再送含む）／受信確定 '+s.accepted.length+' B／NAKによる再送要求 '+s.retries+' 回';
  $('comparison').textContent=compare;
  $('patrol-progress').textContent=(s.state==='done'?'切断済み・オフラインで閲覧可能。':'接続シミュレーション：保存済みログは切断後に閲覧できます。')+' 保存 '+s.saved.length+' 件 / 選択 '+boards().length+' 件';
  list($('offline-log'),s.state==='done'?s.saved:[],(li,e)=>{li.textContent=e.title+'：'+e.message;});
  if(work==='09'){
    list($('leds'),Object.entries(ledState(s)),(li,[name,on])=>{li.dataset.on=String(on);const dot=document.createElement('span');dot.className='led-dot';dot.setAttribute('aria-hidden','true');const desc=document.createElement('span');desc.className='led-note';desc.textContent=ledLabels[name];li.append(dot,name+' '+(on?'点灯':'消灯'),desc);});
    $('hook').textContent=['dialing','calling','negotiating','online','disconnecting'].includes(s.state)?'回線を捕捉中（オフフック）':'オンフック（回線未捕捉）';
  }
  if(work==='10'||work==='12'){
    const bytes=Array.from(new TextEncoder().encode(s.terminal));
    const out=terminal(decode(arrivals(bytes,{bps:options().rate}),'ascii'),{columns:42,rows:12});
    $('terminal').textContent=out.cells.map(row=>row.join('').trimEnd()).join('\n').trim();
  }
  list($('events'),s.log,(li,e)=>{li.textContent=Math.round(e.at)+' ms ／ '+e.label+(e.tx||e.rx?` (TX ${e.tx} B / RX ${e.rx} B)`:'');});
  const active=document.activeElement, manual=work==='12'&&$('patrol-mode').value==='manual';
  syncPlaybackControls({...control,active,playing:s.playing,reduced:reduced.matches||manual||s.finished});
  const flags={step:s.playing||s.finished,stop:s.finished,retry:!s.finished};
  for(const [id,disabled] of Object.entries(flags)) if(!disabled) $(id).disabled=false;
  for(const [id,disabled] of Object.entries(flags)){
    if(disabled&&active===$(id)) (s.finished&&id!=='retry'?$('retry'):s.playing?control.pause:control.reset).focus({preventScroll:true});
    $(id).disabled=disabled;
  }
}
function advance(){draw();}
function rebuild(){
  stopClock();const opts=options();
  if(opts.boards.length===0&&work==='12'){
    $('status').textContent='巡回先を1件以上選んでください。';
    controller=null;document.body.dataset.ready='false';
    for(const id of ['play','pause','step','stop','retry']) $(id).disabled=true;
    $('events').replaceChildren();$('offline-log').replaceChildren();$('terminal').textContent='';$('phase').textContent='入力待ち';$('count').textContent='0';$('elapsed').textContent='0 ms';$('wire').textContent='0 B';$('patrol-progress').textContent='選択 0 件';
    return;
  }
  controller=simulator(work,opts);
  compare='';
  if(work==='11'){
    const total=fault=>{const e=plan('11',{...opts,fault});return [e.reduce((n,x)=>n+x.tx.length+x.rx.length,0),Math.round(e.at(-1).at)];};
    const [bytes,ms]=total('none'),[retryBytes,retryMs]=total('once');
    compare=`同じ384 Bを確定：正常 ${bytes} B・${ms} ms ／ 1回再送 ${retryBytes} B・${retryMs} ms`;
  }
  draw();
}
function select(){
  work=/^#bbs-(09|10|11|12)$/.exec(location.hash)?.[1]??'09';
  const [title,description,note,sources]=facts[work];
  $('work-title').textContent=work+' '+title;
  $('explanation').textContent=description;$('history').textContent=note;
  list($('sources'),sources,(li,[label,url])=>{const a=document.createElement('a');a.href=url;a.textContent=label;li.append(a);});
  for(const link of document.querySelectorAll('[data-work]')) {
    if(link.dataset.work===work) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  }
  for(const [id,show] of Object.entries({modem:work==='09','terminal-panel':work==='10'||work==='12','outcome-panel':work==='10','fault-panel':work==='11','patrol-mode-panel':work==='12','patrol-fault-panel':work==='12',boards:work==='12','file-panel':work==='11','offline-panel':work==='12'})) $(id).hidden=!show;
  rebuild();
}
for(const id of settings) $(id).addEventListener('change',rebuild);
$('boards').addEventListener('change',rebuild);
control.play.addEventListener('click',()=>{if(!reduced.matches&&controller?.start()){advance();tick();}});
control.pause.addEventListener('click',()=>{stopClock();advance();});
$('step').addEventListener('click',()=>{controller?.step();advance();});
$('stop').addEventListener('click',()=>{stopClock();controller?.cancel();advance();});
$('retry').addEventListener('click',()=>{controller?.retry();advance();});
control.reset.addEventListener('click',()=>{
  $('rate').value='2400';$('outcome').value='normal';$('fault').value='none';$('patrol-mode').value='auto';$('patrol-fault').value='none';
  for(const box of $('boards').querySelectorAll('input')) box.checked=true;
  rebuild();
});
reduced.addEventListener('change',()=>{stopClock();if(controller) advance();});
addEventListener('hashchange',select);
addEventListener('pagehide',stopClock);
addEventListener('pageshow',e=>{if(e.persisted) {stopClock();if(controller) advance();}});
select();
