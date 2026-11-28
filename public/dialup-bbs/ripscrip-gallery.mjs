import { createAnsiTerminal, describeAttribute } from './ansi-terminal.mjs';
import {
  ansiComparisonBytes, createRipStream, hitRipRegion, MENU_CHOICES, modelMilliseconds,
  ripDemoBytes, RIP_HEIGHT, RIP_PALETTE, RIP_WIDTH,
} from './ripscrip.mjs';

const byId = id => document.getElementById('rip-' + id);
const canvas = byId('canvas');
const ctx = canvas.getContext('2d');
const ripBytes = ripDemoBytes();
const ansiBytes = ansiComparisonBytes();
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const rateControl = byId('rate');
const progress = byId('progress');
const ansiProgress = byId('ansi-progress');
progress.max = ripBytes.length; ansiProgress.max = ansiBytes.length;
byId('motion').checked = motion.matches;
const initial = { kind: '再生を待っています。', response: '模擬ホストへの送信なし。' };
const controls = { start:byId('start'), pause:byId('pause'), step:byId('step'), instant:byId('instant') };
const regionButtons = [];
const keyButtons = [];
let rip, ansi, ripAt, ansiAt, ripModel, ansiModel, measured, ripMeasured, ansiMeasured, running, ticket, last, credit, state, lastResponse, instantDisplay, ended;

for (const [i, choice] of MENU_CHOICES.entries()) {
  for (const [kind, group, list] of [['RIP','regions',regionButtons], ['ANSI','keys',keyButtons]]) {
    const button = document.createElement('button');
    button.type = 'button';
    if (kind === 'RIP') button.dataset.ripRegion = String(i);
    else button.dataset.ansiKey = choice.response[0];
    button.textContent = choice.response[0] + '：' + choice.label;
    button.addEventListener('click', () => {
      if (kind === 'RIP' && !rip.snapshot().regions.some(({response}) => response === choice.response)) return;
      reply(choice.response,kind);
    });
    byId(group).append(button); list.push(button);
  }
}
function reply(response, kind) {
  const choice = MENU_CHOICES.find(v => v.response === response);
  if (!choice || ended) return;
  lastResponse = `${kind} → ${response.replace('\r',' <CR>')}：${choice.message}`;
  if (response === 'Q\r') {
    ended = true;
    stop();
    state = '模擬接続を終了しました。最初から再開できます。';
  }
  draw();
  if (ended) byId('reset').focus();
}
function paintRip(draws) {
  ctx.fillStyle = RIP_PALETTE[0]; ctx.fillRect(0,0,RIP_WIDTH,RIP_HEIGHT);
  ctx.lineWidth = 1;
  for (const { op, values, color, text, fill } of draws) {
    const [x,y,a,b] = values;
    ctx.fillStyle = RIP_PALETTE[color]; ctx.strokeStyle = RIP_PALETTE[color];
    if (op === 'L') { ctx.beginPath(); ctx.moveTo(x+.5,y+.5); ctx.lineTo(a+.5,b+.5); ctx.stroke(); }
    if (op === 'R') ctx.strokeRect(Math.min(x,a)+.5,Math.min(y,b)+.5,Math.abs(a-x),Math.abs(b-y));
    if (op === 'B') ctx.fillRect(Math.min(x,a),Math.min(y,b),Math.abs(a-x)+1,Math.abs(b-y)+1);
    if (op === 'C') { ctx.beginPath(); ctx.arc(x,y,a,0,2*Math.PI); ctx.stroke(); }
    if (op === 'X') ctx.fillRect(x,y,1,1);
    if (op === '@') {
      ctx.font = 'bold 15px monospace'; ctx.textBaseline = 'top'; ctx.fillText(text,x,y);
    }
    if (op === 'P' || op === 'p') {
      ctx.beginPath(); ctx.moveTo(x,y);
      for (let i=2;i<values.length;i+=2) ctx.lineTo(values[i],values[i+1]);
      ctx.closePath();
      if (op === 'p') { ctx.fillStyle = RIP_PALETTE[fill]; ctx.fill('evenodd'); }
      ctx.stroke();
    }
  }
}
function paintAnsi(cells) {
  const frag = document.createDocumentFragment();
  cells.forEach((row,i)=>{
    let span = null, attr = null;
    for (const cell of row) {
      if (cell.attr !== attr) {
        span = document.createElement('span');
        const colors = describeAttribute(cell.attr);
        span.style.color = RIP_PALETTE[colors.foreground];
        span.style.backgroundColor = RIP_PALETTE[colors.background];
        frag.append(span); attr = cell.attr;
      }
      span.textContent += cell.char;
    }
    if (i+1<cells.length) frag.append('\n');
  });
  byId('ansi-screen').replaceChildren(frag);
}
function receive(count, rate) {
  const end = Math.min(ripAt+count,ripBytes.length);
  if (end > ripAt) {
    rip.feed(ripBytes.subarray(ripAt,end)); ripModel += modelMilliseconds(end-ripAt,rate); ripAt = end;
    if (ripAt === ripBytes.length) { rip.finish(); ripMeasured = measured; }
  }
  const ansiEnd = Math.min(ansiAt+count,ansiBytes.length);
  if (ansiEnd > ansiAt) {
    ansi.feed(ansiBytes.subarray(ansiAt,ansiEnd)); ansiModel += modelMilliseconds(ansiEnd-ansiAt,rate); ansiAt = ansiEnd;
    if (ansiAt === ansiBytes.length) ansiMeasured = measured;
  }
}
const fmt = value => (value / 1000).toFixed(3) + ' 秒';
const rate = () => Number(rateControl.value);
function draw() {
  const snapshot = rip.snapshot();
  const showRip = !byId('motion').checked || ripAt === ripBytes.length;
  const showAnsi = !byId('motion').checked || ansiAt === ansiBytes.length;
  paintRip(showRip ? snapshot.draws : []);
  paintAnsi(showAnsi ? ansi.snapshot().cells : []);
  canvas.dataset.draws = String(snapshot.draws.length);
  canvas.dataset.displayed = String(showRip ? snapshot.draws.length : 0);
  progress.value = ripAt; ansiProgress.value = ansiAt;
  byId('count').textContent = `${ripAt} / ${ripBytes.length} B ・モデル経過 ${fmt(ripModel)}`;
  byId('ansi-count').textContent = `${ansiAt} / ${ansiBytes.length} B ・モデル経過 ${fmt(ansiModel)}`;
  byId('command-count').textContent = `受理命令 ${snapshot.accepted}、描画命令 ${snapshot.draws.length}`;
  byId('comparison').textContent =
    `現在の速度を固定した場合：RIP ${ripBytes.length} B・${fmt(modelMilliseconds(ripBytes.length,rate()))} ／ ANSI ${ansiBytes.length} B・${fmt(modelMilliseconds(ansiBytes.length,rate()))}`;
  const finishTime = (offset,total,time) => offset!==total ? '受信中' : instantDisplay ? '即時表示（比較外）' : fmt(time);
  byId('measured').textContent = `実測（受信再生時間のみ、待機・手送り除外）：${fmt(measured)} ／ 完了時 RIP ${finishTime(ripAt,ripBytes.length,ripMeasured)}、ANSI ${finishTime(ansiAt,ansiBytes.length,ansiMeasured)}`;
  const tail = ripBytes.subarray(Math.max(0,ripAt-60),ripAt);
  byId('wire').textContent = Array.from(tail,b=>b.toString(16).toUpperCase().padStart(2,'0')).join(' ')+'\n'+Array.from(tail,b=>b>=32 && b<=126 ? String.fromCharCode(b) : '·').join('');
  byId('events').replaceChildren(...snapshot.recent.map(event => {
    const li=document.createElement('li');
    li.textContent = `${event.offset} B: ${event.kind === 'accepted' ? `受理 ${event.raw}` : `拒否 ${event.reason}`}`;
    return li;
  }));
  byId('region-report').textContent = snapshot.regions.map(({ values, response }) =>
    `${response.replace('\r',' <CR>')} [${values.join(', ')}]`).join(' ・ ') || '受信した操作領域はまだありません。';
  byId('status').textContent = state;
  byId('response').textContent = lastResponse;
  regionButtons.forEach((button,i) => {button.disabled = ended || !showRip || !snapshot.regions.some(r=>r.response===MENU_CHOICES[i].response);});
  keyButtons.forEach(button => {button.disabled = ended || ansiAt!==ansiBytes.length;});
  canvas.style.cursor = !ended && showRip && snapshot.regions.length ? 'pointer' : 'default';
  const allDone = ripAt===ripBytes.length && ansiAt===ansiBytes.length;
  controls.start.disabled = ended || allDone || running;
  controls.pause.disabled = !running;
  controls.step.disabled = ended || allDone || running;
  controls.instant.disabled = ended || allDone;
}
function stop() {
  running = false;
  if (ticket !== null) cancelAnimationFrame(ticket);
  ticket = null; last = null;
}
function tick(now) {
  if (!running) return;
  if (last !== null) {
    const delta = Math.max(0,now-last);
    measured += delta;
    credit += delta*rate()/10000;
    const n = Math.floor(credit);
    if(n) {credit-=n; receive(n,rate());}
  }
  last = now;
  if (ripAt===ripBytes.length && ansiAt===ansiBytes.length) {
    const focus = document.activeElement === controls.pause;
    stop(); state = '両方の受信が完了しました。'; draw();
    if (focus) regionButtons[0].focus();
    return;
  }
  draw(); ticket=requestAnimationFrame(tick);
}
function reset() {
  stop();
  rip = createRipStream(); ansi = createAnsiTerminal({columns:44,rows:11});
  ripAt=ansiAt=ripModel=ansiModel=measured=ripMeasured=ansiMeasured=credit=0;
  state=initial.kind; lastResponse=initial.response; instantDisplay=false; ended=false;
  draw();
}
controls.start.addEventListener('click', () => {
  if(running || ended) return;
  running=true; state='受信中'; draw(); controls.pause.focus(); ticket=requestAnimationFrame(tick);
});
controls.pause.addEventListener('click', () => {stop(); state='一時停止中'; draw(); controls.start.focus();});
controls.step.addEventListener('click', () => {
  if (running || ended) return;
  receive(1,rate());
  state=ripAt===ripBytes.length && ansiAt===ansiBytes.length ? '手送りで受信が完了しました。' : '手送り：各端末に最大1バイト進みました。';
  draw();
});
controls.instant.addEventListener('click', () => {
  if (ended) return;
  stop(); instantDisplay=true; receive(Math.max(ripBytes.length,ansiBytes.length),rate());
  state='即時表示しました。実測通信時間ではありません。'; draw(); byId('reset').focus();
});
byId('reset').addEventListener('click',reset);
rateControl.addEventListener('change',()=>{credit=0;last=null;draw();});
byId('motion').addEventListener('change',draw);
motion.addEventListener('change', e => {byId('motion').checked=e.matches;draw();});
canvas.addEventListener('click', event => {
  if (ended || (byId('motion').checked && ripAt!==ripBytes.length)) return;
  const rect=canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const field=hitRipRegion(rip.snapshot().regions,(event.clientX-rect.x)*RIP_WIDTH/rect.width,(event.clientY-rect.y)*RIP_HEIGHT/rect.height);
  if (field) reply(field.response,'RIP');
});
window.addEventListener('pagehide',stop);
window.addEventListener('pageshow',e=>{ if(e.persisted) reset(); });
document.addEventListener('visibilitychange',()=>{
  if (document.hidden && running) {stop();state='画面を離れたため一時停止しました。';draw();}
});
reset();
document.documentElement.dataset.ripscripReady = 'true';
