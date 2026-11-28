import { createAnsiTerminal } from './ansi-terminal.mjs';
import { eventClock } from './communications-clock.mjs';
import { callerScores, clearDoorSave, createDoorSession, readDoorSave, writeDoorSave } from './door-game-model.mjs';

const el = id => document.getElementById(id);
const ui = Object.fromEntries(['enter','next-day','menu','directory','player','register','register-exit','game-controls','command-form','command','submit',
  'explore','fight','rest','buy','use','rank','exit','speed','pause','instant','replay','reset','reset-panel','reset-confirm','reset-cancel','profile','day','turns','hp','gold','xp',
  'supplies','encounter','scores','summary','terminal','storage','request','link','bytes','time','wire','history'].map(id=>[id,el('door-'+id)]));
const root=el('bbs-14');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const clock=eventClock();
const storage={
  getItem:key=>window.localStorage.getItem(key),
  setItem:(key,value)=>window.localStorage.setItem(key,value),
  removeItem:key=>window.localStorage.removeItem(key),
};
let {state,status:storageStatus}=readDoorSave(storage);
const game=createDoorSession(state);
let current=null,last=null,history=[],terminal=newTerminal(),position=0,tx=0,rx=[],elapsed=0;
const storageLabel={
  saved:'この端末の展示専用領域に進行を保存しました。',
  loaded:'この端末の保存を読み込みました。入場すると再開できます。',
  empty:'この展示の保存はありません。',
  invalid:'保存形式が不正なため復元しません。新規登録、または初期化できます。',
  'memory-only':'保存を利用できません。このページ内だけ続けられます。ページを離れると今回の進行は復元できません。',
};
const outcomes={
  'register-menu':'外部ゲームが呼び名を待っています。','register':'探索を始めました。','resume':'前回の状態を再開しました。',
  explore:'フロンティアで相手に遭遇しました。',victory:'戦闘に勝ち、所持金と経験値を獲得しました。',
  retreat:'戦闘から退きました。街で休息できます。',rest:'街で休息しました。',buy:'手当て道具を購入しました。',
  use:'手当て道具を使いました。',rank:'順位表を表示しました。',help:'操作一覧を表示しました。',
  exit:'外部ゲームを終了し、BBSに戻りました。','next-day':'翌日へ進み、他の架空プレイヤーの記録が更新されました。',
  'day-limit':'展示の日数上限に達しました。','turn-limit':'今日の行動回数は終了しました。BBSへ戻って翌日を模擬できます。',
  invalid:'不明なコマンドです。','no-encounter':'先に探索してください。','full-hp':'体力はすでに満タンです。','cannot-buy':'4金または道具欄の空きが必要です。',
  'cannot-use':'手当て道具と失った体力が必要です。','encounter-active':'遭遇の処理を先に行ってください。',exhausted:'体力がありません。休息か手当て道具が必要です。',
};
function newTerminal() {return createAnsiTerminal({columns:34,rows:9});}
function showBoard() {
  terminal=newTerminal();
  terminal.feed(new TextEncoder().encode('\x1b[1;36mNORTH WINDOW BBS\r\n\x1b[1;33m[D] THE LOST FRONTIER\x1b[0m'));
  paintConsole();
}
function paintConsole() {
  const rows=terminal.snapshot().cells.map(row=>{
    let end=row.length;while(end&&row[end-1].char===' ')end--;
    return row.slice(0,end);
  });
  while(rows.length&&!rows.at(-1).length)rows.pop();
  const fragment=document.createDocumentFragment();
  for(const [y,row] of rows.entries()) {
    if(y)fragment.append('\n');
    let run=null,attribute=null;
    for(const {char,attr} of row) {
      if(attr!==attribute){
        run=document.createElement('span');
        run.dataset.color=String(attr&15);
        fragment.append(run);attribute=attr;
      }
      run.textContent+=char;
    }
  }
  ui.terminal.replaceChildren(fragment);
}
function list(node, items) {
  node.replaceChildren(...items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
}
function lock(node,value) {node.setAttribute('aria-disabled',String(value));}
function metrics(link) {
  root.dataset.link=link;
  ui.link.textContent=({waiting:'入力待ち',sending:'送信中',host:'ホスト処理中',receiving:'受信中',paused:'一時停止',completed:'応答完了',exited:'終了・BBSへ復帰',replay:'再生完了'})[link];
  ui.bytes.textContent=`${tx} / ${rx.length} B`;
  ui.time.textContent=`${(elapsed/1000).toFixed(3)} 秒`;
  ui.wire.textContent=rx.map(byte=>byte===27?'\\x1b':byte===13?'\\r':byte===10?'\\n\n':String.fromCharCode(byte)).join('');
}
function historyEntry(text) {
  history=[...history.slice(-23),text];
  list(ui.history,history);
}
function render({focus=false}={}) {
  const before=root.dataset.phase;
  const snap=game.snapshot();
  const active=document.activeElement;
  const previousRegion=({bbs:ui.menu,registration:ui.directory,game:ui['game-controls']})[before];
  const move=focus && before!==snap.phase && previousRegion?.contains(active);
  root.dataset.phase=snap.phase;
  ui.menu.hidden=snap.phase!=='bbs';
  ui.directory.hidden=snap.phase!=='registration';
  ui['game-controls'].hidden=snap.phase!=='game';
  ui['next-day'].hidden=!snap.state;
  if(move) ({bbs:ui.enter,registration:ui.player,game:ui.command})[snap.phase].focus({preventScroll:true});
  for(const id of ['enter','next-day','register','register-exit','submit','explore','fight','rest','buy','use','rank','exit']) lock(ui[id],!!current);
  lock(ui.pause,!current||reduced.matches);
  lock(ui.instant,!current);
  lock(ui.replay,!!current||!last);
  ui.pause.textContent=current?.paused?'再開':'一時停止';
  const s=snap.state;
  ui.profile.textContent=s?s.alias+' / 展示用の呼び名':'未登録';
  for(const field of ['day','turns','hp','gold','xp','supplies']) ui[field].textContent=s?String(s[field]):'—';
  ui.encounter.textContent=s?.encounter == null?'遭遇なし':'遭遇中・Fで戦闘';
  list(ui.scores,s?callerScores(s).map(([name,xp])=>`${name}  ${xp} XP`):[]);
  ui.storage.textContent=storageLabel[storageStatus];
  root.dataset.storage=storageStatus;
}
function begin(exchange,replay=false) {
  if(current) return false;
  current={exchange,replay,paused:false};
  terminal=newTerminal();
  position=tx=elapsed=0;rx=[];
  ui.request.textContent=exchange.request+(replay?'（表示のみ再生）':'');
  ui.summary.textContent=replay?'状態を変更せず、直前の応答を再生します。':'コマンドを受け付けました。応答の最後で進行を確定します。';
  metrics('sending');paintConsole();render();
  if(reduced.matches) instant();
  else run();
  return true;
}
function request(kind,arg) {
  if(current) return false;
  const exchange=game.admit(kind,arg,Number(ui.speed.value));
  return exchange.accepted&&begin(exchange);
}
function finish() {
  if(!current) return;
  clock.stop();
  const {exchange,replay}=current;current=null;
  if(replay) {
    metrics('replay');ui.summary.textContent='直前の応答の再生を完了しました。進行は変わりません。';render();return;
  }
  const completed=game.commit(exchange.id);
  if(!completed.committed) {metrics('waiting');render();return;}
  if(completed.changed) storageStatus=writeDoorSave(storage,completed.state);
  last=exchange;
  metrics(completed.code==='exit'?'exited':'completed');
  historyEntry(`${exchange.request} ⇒ ${completed.code} / ${completed.phase}${completed.state?` / 日 ${completed.state.day}・残 ${completed.state.turns}`:''}`);
  ui.summary.textContent=outcomes[completed.code];
  if(completed.code==='exit') showBoard();
  render({focus:true});
}
function consume(paint=true) {
  if(!current) return;
  const {events}=current.exchange.wire;
  const e=events[position++];
  elapsed=e.atMs;
  if(e.kind==='tx') tx++;
  else if(e.kind==='rx') {rx.push(e.byte);terminal.feed([e.byte]);}
  if(paint) {paintConsole();metrics(e.kind==='tx'?'sending':e.kind==='host'?'host':'receiving');}
  if(position===events.length) {
    if(!paint) paintConsole();
    finish();
  }
}
function run() {
  clock.start({
    nextDelay:()=>current?Math.max(0,current.exchange.wire.events[position].atMs-elapsed):null,
    onEvent:()=>consume(),
  });
}
function instant() {
  if(!current)return;
  clock.stop();
  while(current) consume(false);
}
// A native double-click or a held activation key is one gesture, even
// when reduced motion completes the first response synchronously.
root.addEventListener('click',event=>{
  if(event.detail>1 && event.target instanceof Element && event.target.closest('button')){
    event.preventDefault();event.stopImmediatePropagation();
  }
},true);
root.addEventListener('keydown',event=>{
  if(event.repeat && (event.key==='Enter' || event.key===' '))event.preventDefault();
},true);
ui.enter.addEventListener('click',()=>request('enter'));
ui['next-day'].addEventListener('click',()=>request('day'));
ui.directory.addEventListener('submit',e=>{e.preventDefault();request('register',ui.player.value);});
ui['register-exit'].addEventListener('click',()=>request('exit'));
ui['command-form'].addEventListener('submit',e=>{
  e.preventDefault();if(request('command',ui.command.value)) ui.command.value='';
});
for(const [id,command] of Object.entries({explore:'E',fight:'F',rest:'R',buy:'B',use:'U',rank:'L',exit:'Q'})){
  ui[id].addEventListener('click',()=>request('command',command));
}
ui.pause.addEventListener('click',()=>{
  if(!current||reduced.matches)return;
  current.paused=!current.paused;
  if(current.paused) {clock.stop();metrics('paused');}
  else {metrics(position===0?'sending':rx.length?'receiving':'host');run();}
  render();
});
ui.instant.addEventListener('click',instant);
ui.replay.addEventListener('click',()=>{if(!current&&last)begin(last,true);});
ui.reset.addEventListener('click',()=>{ui['reset-panel'].hidden=false;ui['reset-cancel'].focus({preventScroll:true});});
ui['reset-cancel'].addEventListener('click',()=>{ui['reset-panel'].hidden=true;ui.reset.focus({preventScroll:true});});
ui['reset-confirm'].addEventListener('click',()=>{
  clock.stop();game.reset();current=last=null;tx=elapsed=0;rx=[];history=[];
  ui['reset-panel'].hidden=true;ui.request.textContent='—';
  storageStatus=clearDoorSave(storage);
  ui.summary.textContent=storageStatus==='empty'?'展示を初期化しました。':'表示上の進行を初期化しましたが、保存の消去は確認できませんでした。';
  historyEntry('初期化 ⇒ BBS');showBoard();metrics('waiting');render();ui.enter.focus({preventScroll:true});
});
reduced.addEventListener('change',()=>{if(reduced.matches&&current)instant();render();});
window.addEventListener('pagehide',()=>{
  clock.stop();game.abort();current=null;
});
window.addEventListener('pageshow',event=>{
  if(event.persisted) {
    tx=elapsed=0;rx=[];ui.request.textContent='—';ui.summary.textContent='前の保留処理を破棄しました。';
    showBoard();metrics('waiting');render();
  }
});
showBoard();render();
ui.summary.textContent='北窓BBSのメニューです。ゲームに入場できます。';
root.dataset.ready='true';
