/** Predeclared, six-permutation crossover order. No adaptive stopping. */
export const groups = ['A1', 'A2', 'A3'];
export const targets = { swipe: { width: 765, expected: 'dismissed', advance: 500 }, status: { width: 375, expected: 'Error', advance: 3000 } };
export const observationPolicy = {
  primary: 'locator.getAttribute(data-state), once, immediately after unchanged target clock.runFor',
  A1: { secondaryDomReads: 0, screenshots: 0 },
  A2: { secondaryDomReads: 4, screenshots: 0 },
  A3: { secondaryDomReads: 2, screenshots: 1, order: ['before-image', 'screenshot', 'after-image'] },
  trace: { screenshots: false, snapshots: false, sources: false },
  internalInstrumentation: false, additionalWaits: false, freshBrowserAndContext: true,
  clock: 'Separate host monotonic timestamps and commanded virtual-date ledger. The pause origin is read from the browser before the existing pauseAt. No added browser-clock read before/after primary; final virtual times are commanded, not independent measurements.',
};
const permutations = [['A1','A2','A3'],['A2','A3','A1'],['A3','A1','A2'],['A3','A2','A1'],['A1','A3','A2'],['A2','A1','A3']];
export function observationPlan(engines = ['webkit', 'chromium']) {
  if (!engines.length || new Set(engines).size !== engines.length || engines.some(e => !['webkit','chromium'].includes(e))) throw Error('Invalid engines');
  const rows=[];
  for (const engine of engines) for (let iteration=1; iteration <= (engine==='webkit'?12:6); iteration++) {
    const cases = iteration<=6 ? (iteration%2 ? ['swipe','status'] : ['status','swipe']) : ['swipe'];
    for (const kind of cases) for (const group of permutations[(iteration-1 + (kind==='status'?3:0))%6]) {
      rows.push({order:rows.length+1,id:`${engine}-${kind}-${group}-${iteration}`,engine,case:kind,group,iteration});
    }
  }
  return rows;
}
export function apiSequence(kind,group) {
  const common=['browser.launch','browser.newContext','context.tracing.start','context.newPage','page.addInitScript','page.goto','root.waitFor','root.scrollIntoViewIfNeeded','details.closed.count','summary.click','mechanism.click','details.open.count','clock.install','clock.origin.evaluate','clock.pauseAt'];
  const input=kind==='swipe'?['prefix.card.focus','prefix.keyboard.ArrowRight','keyboard-prefix.clock.runFor','keyboard-prefix.getAttribute','prefix.Undo.click','undo-prefix.getAttribute','css-return-prefix.clock.runFor','prefix.card.scrollIntoViewIfNeeded','target.card.boundingBox','target.mouse.move.start','target.mouse.down','target.mouse.move.drag','target.mouse.up']:['prefix.start.focus','prefix.keyboard.Enter','prefix-start.getAttribute','prefix.cancel.click','cancel-prefix.clock.runFor','cancel-prefix.getAttribute','prefix.Replay.click','success-prefix.clock.runFor','success-prefix.getAttribute','target.result.selectOption','target.Replay.first.click','target.Replay.second.click'];
  return [...common,...input,'target.clock.runFor','primary.getAttribute',...(group==='A1'?[]:group==='A2'?Array(4).fill('secondary.getAttribute'):['before-image.getAttribute','page.screenshot','after-image.getAttribute']),'context.tracing.stop','context.close','browser.close'];
}
