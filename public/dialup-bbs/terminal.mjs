// Phase 1 educational prototype. No timers, network, DOM, or historical captures.
export function arrivals(bytes, {bps, dataBits = 8, parity = 'none', stopBits = 1}) {
  if (!(Number.isFinite(bps) && bps > 0) || ![7, 8].includes(dataBits) || !['none', 'even', 'odd'].includes(parity) || ![1, 2].includes(stopBits)) throw new RangeError('transport');
  const bits = 1 + dataBits + (parity === 'none' ? 0 : 1) + stopBits;
  return Array.from(bytes, (byte, i) => {
    if (!Number.isInteger(byte) || byte < 0 || byte >= 2 ** dataBits) throw new RangeError('byte');
    return {byte, atMs: (i + 1) * bits * 1000 / bps};
  });
}

export function decode(events, encoding) {
  if (!['ascii', 'shift_jis', 'iso-2022-jp'].includes(encoding)) throw new RangeError('encoding');
  const decoder = encoding === 'ascii' ? null : new TextDecoder(encoding, {fatal: true});
  const result = [];
  for (const {byte, atMs} of events) {
    if (!decoder && byte > 127) throw new RangeError('ASCII byte');
    const text = decoder ? decoder.decode(Uint8Array.of(byte), {stream: true}) : String.fromCharCode(byte);
    for (const char of text) result.push({char, atMs});
  }
  if (decoder) {
    const tail = decoder.decode();
    for (const char of tail) result.push({char, atMs: events.at(-1)?.atMs ?? 0});
  }
  return result;
}

// Restricted fixture alphabet, not a general Unicode width or VT emulator.
function width(char) {
  if (/^[\x20-\x7e\uff61-\uff9f]$/u.test(char)) return 1;
  if (/^[\u3000-\u30ff\u3400-\u9fff\uff01-\uff60]$/u.test(char)) return 2;
  throw new RangeError('unsupported character');
}

export function terminal(events, {columns = 80, rows = 24} = {}) {
  if (!Number.isInteger(columns) || columns < 2 || columns > 200 || !Number.isInteger(rows) || rows < 1 || rows > 100) throw new RangeError('grid');
  const blank = () => Array(columns).fill(' ');
  const cells = Array.from({length: rows}, blank);
  let x = 0, y = 0;
  const scrolls = [];
  const lineFeed = (atMs) => {
    if (y < rows - 1) { y++; return; }
    const removed = cells.shift(); cells.push(blank());
    scrolls.push({atMs, removed});
  };
  const clear = (i) => {
    if (cells[y][i] === null && i > 0) cells[y][i - 1] = ' ';
    if (i + 1 < columns && cells[y][i + 1] === null) cells[y][i + 1] = ' ';
    cells[y][i] = ' ';
  };
  for (const {char, atMs} of events) {
    if (char === '\r') { x = 0; continue; }
    if (char === '\n') { lineFeed(atMs); continue; }
    if (char === '\b') { x = Math.max(0, x - 1); continue; }
    if (char === '\t') { x = Math.min(columns - 1, (Math.floor(x / 8) + 1) * 8); continue; }
    const w = width(char); // rejects unsupported controls including ESC
    if (x + w > columns) { x = 0; lineFeed(atMs); }
    clear(x); if (w === 2) clear(x + 1);
    cells[y][x] = char;
    if (w === 2) cells[y][x + 1] = null;
    x += w; // x === columns means pending wrap on next printable character
  }
  return {cells, cursor: {x, y}, scrolls};
}

// Presentation timeline only: does not mutate terminal or simulate XON/XOFF.
export function scrollTimeline(scrolls, mode) {
  if (!['jump', 'smooth'].includes(mode)) throw new RangeError('scroll mode');
  let end = 0;
  return scrolls.map(({atMs}) => {
    const startMs = mode === 'jump' ? atMs : Math.max(atMs, end);
    end = startMs + (mode === 'smooth' ? 1000 / 6 : 0);
    return {startMs, endMs: end};
  });
}

export function snapshot(scenario, atMs = Infinity) {
  if (typeof atMs !== 'number' || Number.isNaN(atMs) || atMs < 0) throw new RangeError('time');
  const wire = arrivals(scenario.bytes, scenario.transport);
  const all = decode(wire, scenario.encoding); // preflight validates complete fixture
  const received = wire.filter(e => e.atMs <= atMs);
  const decoded = all.filter(e => e.atMs <= atMs);
  return {received, decoded, ...terminal(decoded, scenario.grid)};
}

// Original fictional fixtures. These are not historical byte captures.
export const scenarios = Object.freeze({
  '03': {bytes: [65, 66, 67], transport: {bps: 300}, encoding: 'ascii', grid: {columns: 8, rows: 2}},
  '04': {bytes: [65, 0x1b, 0x24, 0x42, 0x46, 0x7c, 0x4b, 0x5c, 0x1b, 0x28, 0x42, 66], transport: {bps: 300, dataBits: 7, parity: 'even'}, encoding: 'iso-2022-jp', grid: {columns: 8, rows: 2}},
  '05': {bytes: Array.from('ONE\r\nTWO\r\nTHREE\r\nFOUR', c => c.charCodeAt(0)), transport: {bps: 2400}, encoding: 'ascii', grid: {columns: 8, rows: 2}},
});
