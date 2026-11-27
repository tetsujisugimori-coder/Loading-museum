// Offline demonstration. No network, host I/O, modem commands or timers.
// Tailored event plans use the same clock, byte ledger and typed state transitions.
export const RATES = [2400, 9600, 14400, 28800];
export const CONTROLS = Object.freeze({SOH:1,EOT:4,ACK:6,NAK:21,CAN:24});
const enc = new TextEncoder();
const text = (...lines) => lines.join('\r\n')+'\r\n';
const ascii = s => Array.from(enc.encode(s));
const sum = bytes => bytes.reduce((s,b)=>(s+b)&255,0);
const checkByte = value => Number.isInteger(value) && value >= 0 && value <= 255;
export function packet(block, data) {
  if (!checkByte(block) || data.length!==128 || !Array.from(data).every(checkByte)) throw new RangeError('XMODEM frame');
  return [CONTROLS.SOH, block, 255-block, ...data, sum(data)];
}
export function validPacket(frame, block) {
  return frame.length===132 && Array.from(frame).every(checkByte) && frame[0]===CONTROLS.SOH && frame[1]===block && frame[2]===255-block && frame[131]===sum(frame.slice(3,131));
}
const legal = {
  idle:['initializing','waiting','dialing','cancelled'], initializing:['ready','failed','cancelled'],
  ready:['dialing','cancelled'], dialing:['calling','failed','cancelled'], calling:['negotiating','failed','cancelled'],
  negotiating:['online','failed','cancelled'], online:['disconnecting','failed','done','cancelled'],
  disconnecting:['offline','cancelled'], offline:['done','cancelled'],
  waiting:['transfer','failed','cancelled'], transfer:['transfer','done','failed','cancelled'],
  failed:['cancelled'], done:[], cancelled:[],
};
const event = (label,{state,ms=0,tx=[],rx=[],terminal='',effect}={}) => ({label,state,ms,tx,rx,terminal,effect});
const command = (value,response,state,label,ms=0) => event(label,{state,ms,tx:ascii(value+'\r'),rx:response?ascii(text(response)):[],terminal:text('> '+value,...(response?[response]:[]))});
const response = (value,state,label,ms=0) => event(label,{state,ms,rx:ascii(text(value)),terminal:text(value)});
const hands = outcome => {
  const e=[command('AT','OK','initializing','AT：応答を確認',120),command('ATV1X7&D2','OK','ready','ATV1X7&D2：文字応答と回線状態検出',350),command('ATD[展示用の宛先]','','dialing','ダイヤル開始',550)];
  // ATD token is displayed without an actual telephone number.
  e[2].tx=ascii('ATD[DEMO]\r');e[2].terminal=text('> ATD[DEMO]');
  if(outcome==='dialtone') return [...e,response('NO DIAL TONE','failed','発信音が得られない',850)];
  e.push(event('呼出',{state:'calling',ms:800}));
  if(outcome==='busy') return [...e,response('BUSY','failed','回線が話中',1100)];
  e.push(event('応答後、キャリアと通信条件を交渉',{state:'negotiating',ms:1300}));
  if(outcome==='carrier') return [...e,response('NO CARRIER','failed','キャリアを確立できない',1500)];
  if(outcome!=='normal') throw new RangeError('outcome');
  return [...e,response('CONNECT 28800','online','通信条件成立',1500)];
};
const hangup = ()=>[event('DTRを下げて切断（&D2の設定例）',{state:'disconnecting',ms:300}),response('NO CARRIER','offline','キャリア消失・コマンド状態に戻る',400)];
const file=Array.from({length:384},(_,i)=>(i*73+17)&255);
export const fileBytes=()=>file.slice();
function transfer(fault) {
  if(!['none','once','repeat'].includes(fault)) throw new RangeError('fault');
  const result=[event('受信側が NAK を送信：チェックサム方式で開始',{state:'waiting',ms:240,rx:[CONTROLS.NAK]})];
  for(let i=0;i<3;i++){
    const block=i+1, useful=file.slice(i*128,(i+1)*128);
    const data=useful;
    const correct=packet(block,data);
    for(let attempt=1;attempt<=3;attempt++){
      const damaged=block===2&&(fault==='repeat'||(fault==='once'&&attempt===1));
      const frame=correct.slice();if(damaged) frame[21]^=1;
      const ok=validPacket(frame,block);
      result.push(event(`SOH・番号 ${block}・補数・128バイト・検査和（試行 ${attempt}）`,{state:'transfer',tx:frame,ms:350,effect:{type:'attempt',block}}));
      result.push(event(ok?'ACK：検査和一致、ブロックを確定':'NAK：検査和不一致、確定せず再送を要求',{rx:[ok?CONTROLS.ACK:CONTROLS.NAK],ms:180,effect:ok?{type:'confirm',block,data:frame.slice(3,3+useful.length)}:{type:'retry'}}));
      if(ok) break;
      if(attempt===3) return [...result,event('展示用の再試行上限に達したため失敗',{state:'failed',ms:350})];
    }
  }
  return [...result,event('EOT：送信完了通知',{tx:[CONTROLS.EOT],ms:350}),event('ACK：転送完了',{state:'done',rx:[CONTROLS.ACK],ms:150})];
}
export const BOARDS = ['お知らせ','模型工作室','星を見る会'];
const fictionalMessages = ['今夜の開館は20時です。','木の模型を作る会の記録です。','今週は月の観察会です。'];
function patrol({patrolMode,boards,patrolFault},initial) {
  if(!['auto','manual'].includes(patrolMode)||!['none','board'].includes(patrolFault)||!Array.isArray(boards)||!boards.length||new Set(boards).size!==boards.length||!boards.every(i=>Number.isInteger(i)&&i>=0&&i<BOARDS.length)) throw new RangeError('patrol');
  const result=[...hands('normal'),event('架空の利用者でログイン（認証情報なし）',{ms:440,terminal:text('DEMO LOGIN OK')})];
  boards.forEach(i=>{
    if(initial.saved.some(x=>x.id===i)) return;
    result.push(event(`掲示板選択：${BOARDS[i]}`,{ms:450}));
    if(i===1&&patrolFault==='board') result.push(event('ログ取得に失敗：未保存のまま停止して手動再試行',{state:'failed',ms:510}));
    else result.push(event('未読を取得し、端末内の模擬ログへ保存',{ms:850,effect:{type:'save',entry:{id:i,title:BOARDS[i],message:fictionalMessages[i]}}}));
  });
  const failure=result.findIndex(e=>e.state==='failed');
  if(failure>=0) return result.slice(0,failure+1);
  return [...result,...hangup(),event('切断後のオフライン閲覧へ',{state:'done',ms:450})];
}
const initial=()=>({state:'idle',elapsed:0,tx:0,rx:0,sentUseful:0,accepted:[],confirmed:[],retries:0,attempts:0,saved:[],log:[],terminal:'',signal:{tx:false,rx:false},highSpeed:false});
export function ledState(snapshot) {
  const {state,signal}=snapshot;
  return {HS:snapshot.highSpeed,AA:false,CD:['online','disconnecting'].includes(state),RD:signal.rx,SD:signal.tx,TR:!['disconnecting','offline','done','cancelled'].includes(state),MR:true};
}
export function plan(work, options, snapshot=initial()) {
  const {rate,outcome='normal'} = options;
  if(!RATES.includes(rate)) throw new RangeError('rate');
  let events;
  if(work==='09') events=[...hands('normal'),event('パソコンからモデムに送信データ',{ms:430,tx:ascii('DEMO OUT')}),event('モデムからパソコンに受信データ',{ms:520,rx:ascii('DEMO IN')}),...hangup(),event('デモ完了',{state:'done',ms:350})];
  else if(work==='10') events=[...hands(outcome),...(outcome==='normal'?[...hangup(),event('接続記録を確定',{state:'done',ms:450})]:[])];
  else if(work==='11') events=transfer(options.fault);
  else if(work==='12') events=patrol(options,snapshot);
  else throw new RangeError('work');
  let at=0;
  return events.map(e=>{
    at+=e.ms+(e.tx.length+e.rx.length)*10000/rate;
    return {...e,at};
  });
}
export function applyEvent(snapshot,e) {
  if(e.state && !legal[snapshot.state]?.includes(e.state)) throw new Error('Illegal transition: '+snapshot.state+' → '+e.state);
  if(!e.state && !['initializing','ready','dialing','calling','negotiating','online','transfer','disconnecting','offline'].includes(snapshot.state)) throw new Error('Event without active stage');
  const s={...snapshot,state:e.state??snapshot.state,elapsed:e.at,tx:snapshot.tx+e.tx.length,rx:snapshot.rx+e.rx.length,
    log:[...snapshot.log,{label:e.label,at:e.at,tx:e.tx.length,rx:e.rx.length}],terminal:snapshot.terminal+e.terminal,
    highSpeed:snapshot.highSpeed||e.state==='online',signal:{tx:e.tx.length>0,rx:e.rx.length>0}};
  if(e.effect?.type==='attempt'){s.attempts++;s.sentUseful+=Math.min(128,file.length-(e.effect.block-1)*128);}
  if(e.effect?.type==='retry') s.retries++;
  if(e.effect?.type==='confirm' && !s.confirmed.includes(e.effect.block)){
    s.confirmed=[...s.confirmed,e.effect.block];s.accepted=[...s.accepted,...e.effect.data];
  }
  if(e.effect?.type==='save' && !s.saved.some(x=>x.id===e.effect.entry.id)) s.saved=[...s.saved,e.effect.entry];
  return s;
}
export function simulator(work, options) {
  let data=initial(),events=plan(work,options),index=0,playing=false;
  const reset=()=>{data=initial();events=plan(work,options);index=0;playing=false;};
  return {
    snapshot:()=>({...data,playing,index,total:events.length,nextAt:events[index]?.at??null,finished:index===events.length}),
    step(){
      if(index===events.length) return false;
      data=applyEvent(data,events[index++]);
      if(index===events.length) playing=false;
      return true;
    },
    start(){
      if(playing||index===events.length||(work==='12'&&options.patrolMode==='manual')) return false;
      playing=true;return true;
    },
    pause(){playing=false;},
    reset,
    retry(){
      if(data.state!=='failed'&&data.state!=='cancelled'&&!['done','offline'].includes(data.state)) return false;
      if(work==='12' && data.state==='failed'){
        const from=data.elapsed,log=data.log;
        data={...initial(),saved:data.saved,elapsed:from,log:[...log,{label:'再接続：保存済み掲示板は読み直さない',at:from,tx:0,rx:0}],tx:data.tx,rx:data.rx};
        events=plan(work,{...options,patrolFault:'none'},data).map(e=>({...e,at:e.at+from}));index=0;playing=false;
      } else reset();
      return true;
    },
    cancel(){
      if(index===events.length) return false;
      index=events.length;playing=false;
      data=applyEvent(data,{...event('利用者が中止',{state:'cancelled'}),at:data.elapsed});
      return true;
    },
  };
}
