/** Fixed assignment only. No browser operation or adaptive retry is performed here. */
export const boundaryGroups = Object.freeze(['A', 'B', 'C']);
export const boundaryTargets = Object.freeze({
  swipe: Object.freeze({width: 765, height: 1000, motion: 'no-preference', advance: 500, expected: 'dismissed'}),
  status: Object.freeze({width: 375, height: 1000, motion: 'no-preference', advance: 3000, expected: 'Error'}),
});
// All six permutations: each group occurs twice in each position per six blocks.
const orders = Object.freeze([
  ['A', 'B', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B'],
  ['C', 'B', 'A'], ['B', 'A', 'C'], ['A', 'C', 'B'],
]);

export function boundaryPlan(engines = ['webkit', 'chromium']) {
  if (!engines.length || new Set(engines).size !== engines.length || engines.some(e => !['webkit', 'chromium'].includes(e))) throw Error('invalid engines');
  const trials = [];
  for (const engine of engines) {
    const repeats = engine === 'webkit' ? 12 : 6;
    for (let iteration = 1; iteration <= repeats; iteration++) {
      const cases = iteration % 2 ? ['swipe', 'status'] : ['status', 'swipe'];
      for (const kind of cases) {
        const offset = kind === 'status' ? 3 : 0;
        for (const group of orders[(iteration - 1 + offset) % orders.length]) {
          trials.push({order: trials.length + 1, id: `${engine}-${kind}-${group}-${iteration}`, engine, case: kind, group, iteration});
        }
      }
    }
  }
  return trials;
}
