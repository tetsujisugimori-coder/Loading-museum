/** Small, finite teaching boards. Empty cells are not refilled; Reset starts a new trial. */
export type Gem = '◆' | '●' | '■' | null;
export const initialGems: Gem[] = ['◆', '◆', '●', '●', '◆', '◆', '◆', '●', '◆'];
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
export function exchangeGems(board: Gem[], a: number, b: number) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || !board[a] || !board[b] || !areAdjacent(a, b, 3)) return { board, removed: 0, chains: 0, status: 'NOT ADJACENT · RETURN' };
  let next = [...board]; [next[a], next[b]] = [next[b], next[a]];
  if (findMatches(next).length === 0) return { board, removed: 0, chains: 0, status: 'NO MATCH · RETURN' };
  let removed = 0; let chains = 0;
  // Each pass removes >= 3 cells, so this finite board always terminates.
  for (let matches = findMatches(next); matches.length; matches = findMatches(next)) {
    removed += matches.length; chains++;
    matches.forEach(i => { next[i] = null; }); next = collapseGems(next);
  }
  return { board: next, removed, chains, status: `MATCH ${removed} · CASCADE ×${chains} · +${removed * 100}` };
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
