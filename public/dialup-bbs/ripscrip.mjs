// Bounded teaching subset of TeleGrafix RIPscrip 1.54 (1993-07-19).
export const RIP_WIDTH = 640;
export const RIP_HEIGHT = 350;
export const RIP_RATES = Object.freeze([300, 1200, 2400, 9600]);
export const RIP_LIMITS = Object.freeze({ bytes: 16384, token: 512, commands: 512, points: 32, regions: 24, text: 100 });
export const RIP_PALETTE = Object.freeze(['#000000','#0000aa','#00aa00','#00aaaa','#aa0000','#aa00aa','#aa5500','#aaaaaa','#555555','#5555ff','#55ff55','#55ffff','#ff5555','#ff55ff','#ffff55','#ffffff']);
export const modelMilliseconds = (bytes, rate) => {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || !RIP_RATES.includes(rate)) throw new RangeError('Invalid wire model input');
  return bytes * 10000 / rate;
};

const isMega = (value, width) => value.length === width && /^[0-9A-Z]+$/.test(value);
const parts = (value, count) => isMega(value, count * 2)
  ? Array.from({ length: count }, (_, idx) => Number.parseInt(value.slice(2 * idx, 2 * idx + 2), 36)) : null;
const point = ([x,y]) => x < RIP_WIDTH && y < RIP_HEIGHT;
const paired = (numbers) => numbers.every((_, i) => i % 2 || point(numbers.slice(i, i + 2)));
const error = (reason) => ({ error: reason });

export function parseRipCommand(token) {
  if (typeof token !== 'string' || !token.length || token.length > RIP_LIMITS.token || !/^[ -~]+$/.test(token)) return error('invalid-command');
  const op = token.startsWith('1M') ? '1M' : token[0];
  const body = token.slice(op.length);
  if (op === '*') return body === '' ? { op } : error('invalid-length');
  if (op === 'c' || op === 'S') {
    const values = parts(body, op === 'c' ? 1 : 2);
    if (!values) return error('invalid-color');
    if (values.at(-1) > 15) return error('invalid-color');
    if (op === 'S' && values[0] > 1) return error('unsupported-pattern');
    return { op, color: op === 'S' && values[0] === 0 ? 0 : values.at(-1) };
  }
  if (['L','R','B','C','X'].includes(op)) {
    const values = parts(body, op === 'C' ? 3 : op === 'X' ? 2 : 4);
    if (!values) return error('invalid-geometry');
    if (op === 'C') {
      if (!point(values) || values[2] < 1 || values[2] > RIP_HEIGHT) return error('out-of-range');
    } else if (!paired(values)) return error('out-of-range');
    return { op, values };
  }
  if (op === 'P' || op === 'p') {
    const n = parts(body.slice(0,2),1)?.[0];
    if (!n || n < 2 || n > RIP_LIMITS.points) return error('polygon-limit');
    const values = parts(body.slice(2),n * 2);
    if (!values || !paired(values)) return error('invalid-polygon');
    return { op, values };
  }
  if (op === '@') {
    const values = parts(body.slice(0,4),2);
    const text = body.slice(4);
    if (!values || !point(values) || !text || text.length > RIP_LIMITS.text) return error('invalid-text');
    return { op, values, text };
  }
  if (op === '1M') {
    const fields = parts(body.slice(0,10),5);
    const text = body.slice(17);
    if (!fields || fields[0] !== 0 || body.slice(10,17) !== '0000000') return error('unsupported-region-flags');
    const values = fields.slice(1);
    if (!paired(values) || values[0] >= values[2] || values[1] >= values[3]) return error('invalid-region');
    if (!/^[A-Za-z0-9 _-]{1,32}(?:\^M)?$/.test(text)) return error('invalid-region-response');
    return { op, values, response: text.endsWith('^M') ? text.slice(0,-2) + '\r' : text };
  }
  return error('unsupported-command');
}

export function createRipStream() {
  let mode = 'start', buffer = '', escape = false, cr = false, halted = false, closed = false, bytes = 0;
  let drawColor = 15, fillColor = 15, accepted = 0;
  const draws = [], regions = [], recent = [];
  const status = (kind, data) => {
    recent.push({ offset: bytes, kind, ...data });
    if (recent.length > 18) recent.shift();
  };
  function apply() {
    const raw = buffer;
    buffer = '';
    const command = parseRipCommand(raw);
    if (command.error) { status('rejected', { reason: command.error, raw }); return; }
    if (accepted >= RIP_LIMITS.commands) { halted = true; status('rejected',{ reason:'command-limit' }); return; }
    if (command.op === '1M' && regions.length >= RIP_LIMITS.regions) { status('rejected',{reason:'region-limit'}); return; }
    accepted++;
    status('accepted', { op: command.op, raw });
    if (command.op === '*') { draws.length = 0; regions.length = 0; drawColor = 15; fillColor = 15; }
    else if (command.op === 'c') drawColor = command.color;
    else if (command.op === 'S') fillColor = command.color;
    else if (command.op === '1M') regions.push(command);
    else draws.push({ ...command, color: command.op === 'B' ? fillColor : drawColor, ...(command.op === 'p' ? {fill:fillColor} : {}) });
  }
  function feed(chunk) {
    if (!(chunk instanceof Uint8Array)) throw new TypeError('Expect wire bytes');
    if (closed) return;
    for (const byte of chunk) {
      if (halted) break;
      if (bytes === RIP_LIMITS.bytes) { halted = true; status('rejected',{ reason:'wire-limit' }); break; }
      bytes++;
      if (cr && byte === 10) { cr = false; continue; }
      cr = byte === 13;
      if (byte === 13 || byte === 10) {
        if (mode === 'rip') {
          if (escape) status('rejected',{ reason:'unsupported-continuation' });
          else if (buffer) apply();
        }
        buffer = ''; escape = false; mode = 'start'; continue;
      }
      const ch = String.fromCharCode(byte);
      if (mode === 'start') { mode = ch === '!' ? 'bang' : 'ignore'; continue; }
      if (mode === 'bang') { mode = ch === '|' ? 'rip' : 'ignore'; continue; }
      if (mode !== 'rip') continue;
      if (byte < 32 || byte > 126) { status('rejected',{ reason:'non-ascii' }); buffer = ''; escape = false; mode = 'discard'; continue; }
      if (escape) {
        escape = false;
        if (!['|','!','\\'].includes(ch)) { status('rejected',{ reason:'invalid-escape' }); buffer = ''; mode = 'discard'; continue; }
        buffer += ch;
      } else if (ch === '\\') { escape = true; continue; }
      else if (ch === '|') { if (buffer) apply(); continue; }
      else buffer += ch;
      if (buffer.length > RIP_LIMITS.token) { status('rejected',{ reason:'token-limit' }); buffer = ''; mode = 'discard'; }
    }
  }
  function finish() {
    if (closed) return;
    if ((mode === 'rip' && (buffer || escape)) || mode === 'bang') status('rejected',{ reason:'unterminated-line' });
    closed = true; buffer = ''; escape = false;
  }
  function snapshot() {
    return structuredClone({ bytes, accepted, draws, regions, recent, halted, closed });
  }
  return { feed, finish, snapshot };
}

export function hitRipRegion(regions,x,y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x >= RIP_WIDTH || y < 0 || y >= RIP_HEIGHT) return null;
  return regions.findLast(({ values:[x0,y0,x1,y1] }) => x >= x0 && x <= x1 && y >= y0 && y <= y1) ?? null;
}

const mega = (n) => n.toString(36).toUpperCase().padStart(2,'0');
const geometry = (op,...values) => op + values.map(mega).join('');
const wire = (...tokens) => '!|' + tokens.join('|') + '\r\n';
const fill = (color,x0,y0,x1,y1) => ['S01' + mega(color),geometry('B',x0,y0,x1,y1)];
const textAt = (x,y,word) => geometry('@',x,y) + word;

export const MENU_CHOICES = Object.freeze([
  { label:'掲示板', display:'BULLETINS', response:'B\r', message:'掲示板：星空ネットからのお知らせ（架空）' },
  { label:'ファイル一覧', display:'FILES', response:'F\r', message:'ファイル：架空の案内 STARLOG.TXT' },
  { label:'BBSゲーム', display:'DOOR GAME', response:'G\r', message:'ゲームメニュー：別展示「BBSゲーム」で遊べます。' },
  { label:'接続終了', display:'LOG OFF', response:'Q\r', message:'模擬ホストから切断しました。' }
].map(Object.freeze));

const ripFixture = wire('*', ...fill(1,9,9,630,339),'c0B',geometry('R',16,16,623,332),
  ...fill(0,27,28,612,137),geometry('R',27,28,612,137)) +
  wire('c03',geometry('L',47,109,601,109),geometry('L',50,115,585,115),geometry('L',63,121,575,121),
    'c0E',geometry('C',102,73,24),geometry('C',102,73,15),
    'c0B','S0109',geometry('p',3,115,63,180,73,115,82),geometry('P',4,107,54,188,73,107,92,132,73),
    'c0F',textAt(235,54,'STARLINE BBS'),textAt(235,75,'REMOTE IMAGING TERMINAL'),
    'c07',textAt(235,95,'FICTIONAL SYSTEM / MENU 01')) +
  wire('c09',geometry('L',32,145,607,145),...Array.from({length:36},(_,i)=>geometry('X',36+(i*73)%562,31+(i*53)%98))) +
  MENU_CHOICES.map((choice,index)=>{
    const x=40+(index%2)*292,y=163+Math.floor(index/2)*75;
    return wire(...fill(0,x+5,y+5,x+270,y+58),...fill(3,x,y,x+265,y+53),
      'c0B',geometry('R',x,y,x+265,y+53),'c0F',textAt(x+14,y+22,`[${choice.response[0]}]  ${choice.display}`),
      '1M00'+geometry('',x,y,x+265,y+53)+'0000000'+choice.response[0]+'^M');
  }).join('') + wire('c0E',textAt(40,307,'SELECT A FIELD  /  B F G Q'), 'c0B',geometry('L',40,322,599,322));

const esc = '\u001b[';
const ansiFixture = esc+'2J'+esc+'1;1H'+esc+'1;36m'+'+------------------------------------------+\r\n'+
  '| STARLINE BBS         /         MENU 01 |\r\n'+
  '+------------------------------------------+\r\n\r\n'+esc+'1;37m'+
  MENU_CHOICES.map(choice=>`  [${choice.response[0]}]  ${choice.display}\r\n`).join('') +
  '\r\n'+esc+'1;33m'+'  PRESS B, F, G OR Q'+esc+'0m';
const encoder = new TextEncoder();
export const ripDemoBytes = () => encoder.encode(ripFixture);
export const ansiComparisonBytes = () => encoder.encode(ansiFixture);
