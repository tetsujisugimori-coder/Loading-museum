/** Small, finite teaching boards. Empty cells are not refilled; Reset starts a new trial. */
export type Gem = '◆' | '●' | '■' | null;
export const initialGems: Gem[] = ['◆', '◆', '●', '◆', '◆', '●', '●', '●', '◆', '◆', '●', '●'];
export function areAdjacent(a: number, b: number, columns: number) {
  return Math.abs(Math.floor(a / columns) - Math.floor(b / columns)) + Math.abs(a % columns - b % columns) === 1;
}
export function findMatches(board: Gem[], columns = 3): number[] {
  const found = new Set<number>();
  for (let start = 0; start < board.length; start++) {
    for (const step of [1, columns]) {
      const run: number[] = [];
      for (let i = start; i < board.length && board[start] !== null && board[i] === board[start]; i += step) {
        if (step === 1 && Math.floor(i / columns) !== Math.floor(start / columns)) break;
        run.push(i);
      }
      if (run.length >= 3) run.forEach(i => found.add(i));
    }
  }
  return [...found];
}
export function collapseGems(board: Gem[], columns = 3): Gem[] {
  const result: Gem[] = Array(board.length).fill(null);
  for (let col = 0; col < columns; col++) {
    const cells = board.filter((gem, i) => i % columns === col && gem !== null);
    cells.forEach((gem, i) => { result[(board.length / columns - cells.length + i) * columns + col] = gem; });
  }
  return result;
}
export type GemToken = { id: number; gem: Exclude<Gem, null> };
export type CascadeStep = { before: Gem[]; matched: number[]; cleared: Gem[]; after: Gem[] };
export type GemExchange = { board: Gem[]; removed: number; chains: number; status: string; steps: CascadeStep[]; frames: Array<Array<GemToken | null>> };
export function exchangeGems(board: Gem[], a: number, b: number): GemExchange {
  const rejected = (status: string): GemExchange => ({ board, removed: 0, chains: 0, status, steps: [], frames: [] });
  if (!Number.isInteger(a) || !Number.isInteger(b) || !board[a] || !board[b] || !areAdjacent(a, b, 3)) return rejected('NOT ADJACENT · RETURN');
  let next = [...board]; [next[a], next[b]] = [next[b], next[a]];
  if (findMatches(next).length === 0) return rejected('NO MATCH · RETURN');
  let tokens: Array<GemToken | null> = board.map((gem, id) => gem ? { id, gem } : null);
  const frames = [[...tokens]];
  [tokens[a], tokens[b]] = [tokens[b], tokens[a]];
  frames.push([...tokens]);
  const steps: CascadeStep[] = [];
  let removed = 0;
  // Each pass removes >= 3 cells, so this finite board always terminates.
  for (let matches = findMatches(next); matches.length; matches = findMatches(next)) {
    const before = [...next];
    removed += matches.length;
    matches.forEach(i => { next[i] = null; tokens[i] = null; });
    const cleared = [...next]; frames.push([...tokens]);
    next = collapseGems(next);
    const fallen: Array<GemToken | null> = Array(tokens.length).fill(null);
    for (let col = 0; col < 3; col++) {
      const survivors = tokens.filter((token, i) => i % 3 === col && token !== null);
      survivors.forEach((token, i) => { fallen[(tokens.length / 3 - survivors.length + i) * 3 + col] = token; });
    }
    tokens = fallen; frames.push([...tokens]);
    steps.push({ before, matched: matches, cleared, after: [...next] });
  }
  return { board: next, removed, chains: steps.length, steps, frames, status: `MATCH ${removed} · CASCADE ×${steps.length} · +${removed * 100}` };
}
export type Block = string | null;
export const initialBlocks: Block[] = [null, 'a', null, null, null, 'b', null, null, null, 'c', null, 'd', null, null, 'e', 'f', 'g', 'h', null, 'i'];
export function dropAndCompact(board: Block[]) {
  const columns = 5; const col = 3; const next = [...board];
  let row = 0;
  while (row + 2 < board.length / columns && !next[(row + 2) * columns + col]) row++;
  if (next[row * columns + col] || next[(row + 1) * columns + col]) return { board, cleared: 0, dropped: false };
  next[row * columns + col] = 'piece-top'; next[(row + 1) * columns + col] = 'piece-bottom';
  const rows = Array.from({ length: 4 }, (_, i) => next.slice(i * columns, (i + 1) * columns));
  const kept = rows.filter(cells => cells.some(cell => cell === null));
  const cleared = rows.length - kept.length;
  return { board: [...Array<Block>(cleared * columns).fill(null), ...kept.flat()], cleared, dropped: true };
}
