// Original offline teaching model: no DOM, browser time, real callers, or I/O.
import { arrivals, decode } from './terminal.mjs';

export const DOOR_STORAGE_KEY = 'loading-museum:bbs-14:lost-frontier:v1';
export const DOOR_RATES = Object.freeze([300, 1200, 2400, 9600]);
export const CALLSIGNS = Object.freeze(['SABLE', 'MICA', 'FERN']);
export const TURN_LIMIT = 6;
export const MAX_DAY = 99;
export const DOOR_COMMANDS = Object.freeze({E:'EXPLORE', F:'FIGHT', R:'REST', B:'BUY', U:'USE', L:'RANK', H:'HELP', Q:'QUIT'});
const MAX_HP = 18;
const CALLER_BASE = [['WREN',18],['LARCH',11],['TARN',7]];
const ENEMIES = ['DUST MOTH','SILT CRAB','GLASS BEETLE'];

export function makeAdventurer(alias) {
  if (!CALLSIGNS.includes(alias)) throw new RangeError('unknown teaching callsign');
  return {version:1,alias,day:1,turns:TURN_LIMIT,hp:MAX_HP,gold:12,xp:0,supplies:0,encounter:null,roll:0};
}

const expectedKeys = Object.keys(makeAdventurer(CALLSIGNS[0])).sort().join(',');
const integerIn = (x,a,b) => Number.isInteger(x) && x >= a && x <= b;

export function validateAdventurer(s) {
  return !!s && Object.getPrototypeOf(s) === Object.prototype &&
    Object.keys(s).sort().join(',') === expectedKeys && s.version === 1 && CALLSIGNS.includes(s.alias) &&
    integerIn(s.day,1,MAX_DAY) && integerIn(s.turns,0,TURN_LIMIT) && integerIn(s.hp,0,MAX_HP) &&
    integerIn(s.gold,0,999) && integerIn(s.xp,0,999) && integerIn(s.supplies,0,9) &&
    (s.encounter === null || integerIn(s.encounter,0,ENEMIES.length-1)) && integerIn(s.roll,0,(s.day-1)*TURN_LIMIT+(TURN_LIMIT-s.turns));
}

export function readDoorSave(storage) {
  try {
    const raw = storage.getItem(DOOR_STORAGE_KEY);
    if (raw === null) return {status:'empty', state:null};
    if (typeof raw !== 'string' || raw.length > 512) return {status:'invalid',state:null};
    let state;
    try { state = JSON.parse(raw); } catch { return {status:'invalid',state:null}; }
    return validateAdventurer(state) ? {status:'loaded',state} : {status:'invalid',state:null};
  } catch { return {status:'memory-only',state:null}; }
}

export function writeDoorSave(storage, state) {
  if (!validateAdventurer(state)) throw new TypeError('invalid game state');
  try { storage.setItem(DOOR_STORAGE_KEY,JSON.stringify(state));return 'saved'; }
  catch { return 'memory-only'; }
}

export function clearDoorSave(storage) {
  try { storage.removeItem(DOOR_STORAGE_KEY);return 'empty'; }
  catch { return 'memory-only'; }
}

export function commandLetter(input) {
  return typeof input === 'string' && /^[A-Za-z]$/.test(input.trim())
    ? input.trim().toUpperCase() : '?';
}

export function callerScores(s) {
  if (!validateAdventurer(s)) throw new TypeError('invalid game state');
  return [[s.alias,s.xp],...CALLER_BASE.map(([name,base],i)=>[name,base+((s.day-1)*(i+2))])]
    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'en'));
}

const result = (code,state,lines,exit=false)=>({code,state,lines,exit});
const action = (s, changes)=>({...s,...changes,turns:s.turns-1});

export function playDoorCommand(s, raw) {
  if (!validateAdventurer(s)) throw new TypeError('invalid game state');
  const c = commandLetter(raw);
  if (c === 'Q') return result('exit',s,['RETURN TO BBS.'],true);
  if (c === 'H') return result('help',s,['E EXPLORE  F FIGHT  R REST','B BUY  U USE  L RANK  Q QUIT']);
  if (c === 'L') return result('rank',s,['LOCAL SCOREBOARD',...callerScores(s).map(([name,score],i)=>`${i+1}. ${name}  ${score} XP`)]);
  if (!Object.hasOwn(DOOR_COMMANDS,c)) return result('invalid',s,['UNKNOWN COMMAND. TRY H.']);
  if (s.turns === 0) return result('turn-limit',s,['NO ACTIONS LEFT. Q THEN TRY NEXT DAY.']);
  if (s.hp === 0 && c !== 'R' && c !== 'U') return result('exhausted',s,['NO HP. REST OR USE A KIT.']);
  if (c === 'E') {
    if (s.encounter !== null) return result('encounter-active',s,['FINISH THE PRESENT ENCOUNTER FIRST.']);
    const encounter=(s.day+s.roll*2)%ENEMIES.length;
    return result('explore',action(s,{encounter,roll:s.roll+1}),[`FRONTIER SIGNAL: ${ENEMIES[encounter]}.`,'F TO ENGAGE.']);
  }
  if (c === 'F') {
    if (s.encounter === null) return result('no-encounter',s,['EXPLORE BEFORE FIGHTING.']);
    const damage=3+s.encounter+((s.day+s.roll)%3);
    if (s.hp <= damage) return result('retreat',action(s,{hp:0,encounter:null}),['YOU RETREAT WITHOUT LOOT. REST IN TOWN.']);
    const reward=4+s.encounter*2,xp=5+s.encounter*3;
    return result('victory',action(s,{hp:s.hp-damage,gold:Math.min(999,s.gold+reward),xp:Math.min(999,s.xp+xp),encounter:null}),
      [`VICTORY. HP -${damage} / GOLD +${Math.min(reward,999-s.gold)} / XP +${Math.min(xp,999-s.xp)}.`]);
  }
  if (s.encounter !== null && (c==='B'||c==='R')) return result('encounter-active',s,['TOWN ACTION UNAVAILABLE DURING ENCOUNTER.']);
  if (c === 'R') {
    if (s.hp===MAX_HP) return result('full-hp',s,['HP ALREADY FULL.']);
    return result('rest',action(s,{hp:Math.min(MAX_HP,s.hp+7)}),['RESTED IN TOWN.']);
  }
  if (c === 'B') {
    if (s.gold<4 || s.supplies===9) return result('cannot-buy',s,['NEED 4 GOLD AND SPACE FOR ONE KIT.']);
    return result('buy',action(s,{gold:s.gold-4,supplies:s.supplies+1}),['BOUGHT A FIELD KIT FOR 4 GOLD.']);
  }
  if (s.supplies===0 || s.hp===MAX_HP) return result('cannot-use',s,['NEED A KIT AND MISSING HP.']);
  return result('use',action(s,{hp:Math.min(MAX_HP,s.hp+6),supplies:s.supplies-1}),['USED A FIELD KIT.']);
}

export function advanceDoorDay(s) {
  if (!validateAdventurer(s)) throw new TypeError('invalid game state');
  if (s.day===MAX_DAY) return result('day-limit',s,['DEMONSTRATION DAY LIMIT.']);
  const state={...s,day:s.day+1,turns:TURN_LIMIT,hp:MAX_HP,encounter:null};
  const [caller] = CALLER_BASE[(state.day-2)%CALLER_BASE.length];
  return result('next-day',state,[`DAY ${state.day}: ${caller} REPORTED A NEW EXPEDITION.`,'SIMULATED OFFLINE EVENT. ACTIONS REFILLED.']);
}

// Actual fixture bytes travel through the earlier exhibit's 8N1 model. The
// 120 ms is a labelled demo host wait, not a historical server benchmark.
export function doorWire(request, lines, bps) {
  if (!DOOR_RATES.includes(bps)) throw new RangeError('door speed');
  const ascii = s=>Array.from(s,c=>c.charCodeAt(0));
  const tx=ascii(request+'\r');
  const rx=ascii('\x1b[1;36m'+lines.join('\r\n')+'\x1b[0m\r\n');
  const encode=(bytes)=>arrivals(bytes,{bps});
  const sent=encode(tx);
  const received=encode(rx);
  decode(sent,'ascii');decode(received,'ascii'); // no hidden Unicode/control translations
  const sentMs=sent.at(-1)?.atMs ?? 0;
  const waitMs=120;
  return {tx,rx,events:[
    ...sent.map(x=>({...x,kind:'tx'})),
    {kind:'host',atMs:sentMs+waitMs},
    ...received.map(x=>({...x,atMs:x.atMs+sentMs+waitMs,kind:'rx'})),
  ],totalMs:sentMs+waitMs+(received.at(-1)?.atMs??0)};
}

// Admit one proposal at a time, commit the game state once after delivery.
// Abort/navigation never commits a pending proposal or changes the save.
export function createDoorSession(initial=null) {
  if (initial!==null && !validateAdventurer(initial)) throw new TypeError('invalid initial game state');
  let s=initial ? {...initial} : null;
  let phase='bbs', pending=null, serial=0;
  const snapshot=()=>({phase, state:s ? {...s} : null, pending:pending?.id??null});
  function admit(kind, arg, speed) {
    if (pending) return {accepted:false,code:'busy'};
    let proposal, request, next=phase;
    if (kind==='enter' && phase==='bbs') {
      request='DOOR'; next=s?'game':'registration';
      proposal=result(s?'resume':'register-menu',s,s?[`WELCOME BACK, ${s.alias}.`]:['CHOOSE A DEMO CALLSIGN.']);
    } else if (kind==='register' && phase==='registration' && !s && CALLSIGNS.includes(arg)) {
      request='REGISTER '+arg; next='game'; proposal=result('register',makeAdventurer(arg),[`WELCOME, ${arg}.`,'TYPE H FOR HELP.']);
    } else if (kind==='command' && phase==='game' && s) {
      const c=commandLetter(arg);
      request=Object.hasOwn(DOOR_COMMANDS,c)?c:'?';
      proposal=playDoorCommand(s,c); next=proposal.exit?'bbs':'game';
    } else if (kind==='exit' && phase==='registration') {
      request='Q'; next='bbs';proposal=result('exit',s,['RETURN TO BBS.'],true);
    } else if (kind==='day' && phase==='bbs' && s) {
      request='NEXT DAY';proposal=advanceDoorDay(s);
    } else return {accepted:false,code:'wrong-phase'};
    const wire=doorWire(request,proposal.lines,speed);
    const id=++serial;
    pending={id,next,proposal};
    return {accepted:true,id,request,wire};
  }
  function commit(id) {
    if (!pending || pending.id!==id) return {committed:false,code:'stale'};
    const {proposal,next}=pending;
    const changed=proposal.state!==s;
    s=proposal.state;phase=next;pending=null;
    return {committed:true,changed,code:proposal.code,...snapshot()};
  }
  function abort() { pending=null; ++serial; }
  function reset() { abort();s=null;phase='bbs'; }
  return {snapshot,admit,commit,abort,reset};
}
