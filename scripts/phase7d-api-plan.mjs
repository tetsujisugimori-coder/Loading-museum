/** Predeclared, four-group Williams crossover order. No adaptive stopping. */
export const groups = ['N0', 'N1', 'D1', 'S1'];
export const targets = { swipe: { width: 765, expected: 'dismissed', advance: 500 }, status: { width: 375, expected: 'Error', advance: 3000 } };
export const observationPolicy = {
  primary: 'locator.getAttribute(data-state), once, immediately after unchanged target clock.runFor',
  N0: { intermediate: 'none', additionalDomReads: 0, screenshots: 0 },
  N1: { intermediate: 'page.evaluate(()=>null)', additionalDomReads: 0, screenshots: 0 },
  D1: { intermediate: 'locator.getAttribute(data-state)', additionalDomReads: 1, screenshots: 0 },
  S1: { intermediate: 'page.screenshot()', additionalDomReads: 0, screenshots: 1 },
  followup: 'locator.getAttribute(data-state), once, identical root/selector/API in all groups',
  primaryPersistence: 'Synchronous exclusive host-file write after primary, common to all groups; no browser API or wait. This common bookkeeping also takes real time.',
  trace: { screenshots: false, snapshots: false, sources: false },
  internalInstrumentation: false, additionalWaits: false, freshBrowserAndContext: true,
  clock: 'Separate host monotonic timestamps and commanded virtual-date ledger. Only original pause-origin browser clock read. No additional virtual advance.',
  order: 'Four-row Williams crossover; 12 blocks exactly position-balanced, 6 blocks minimally imbalanced (1 or 2 per position). Case order alternates. No adaptive retries.',
};
const permutations = [['N0','N1','S1','D1'],['N1','D1','N0','S1'],['D1','S1','N1','N0'],['S1','N0','D1','N1']];
export const intermediateNames = group => ({N0:[],N1:['intermediate.noop.evaluate'],D1:['intermediate.getAttribute'],S1:['page.screenshot']})[group];
export function observationPlan(engines = ['webkit', 'chromium']) {
  if (!engines.length || new Set(engines).size !== engines.length || engines.some(e => !['webkit','chromium'].includes(e))) throw Error('Invalid engines');
  const rows=[];
  for (const engine of engines) for (let iteration=1; iteration <= (engine==='webkit'?12:6); iteration++) {
    const cases = iteration<=6 ? (iteration%2 ? ['swipe','status'] : ['status','swipe']) : ['swipe'];
    for (const kind of cases) for (const group of permutations[(iteration-1 + (kind==='status'?2:0))%4]) {
      rows.push({order:rows.length+1,id:`${engine}-${kind}-${group}-${iteration}`,engine,case:kind,group,iteration});
    }
  }
  return rows;
}
export function apiSequence(kind,group) {
  const common=['browser.launch','browser.newContext','context.tracing.start','context.newPage','page.addInitScript','page.goto','root.waitFor','root.scrollIntoViewIfNeeded','details.closed.count','summary.click','mechanism.click','details.open.count','clock.install','clock.origin.evaluate','clock.pauseAt'];
  const input=kind==='swipe'?['prefix.card.focus','prefix.keyboard.ArrowRight','keyboard-prefix.clock.runFor','keyboard-prefix.getAttribute','prefix.Undo.click','undo-prefix.getAttribute','css-return-prefix.clock.runFor','prefix.card.scrollIntoViewIfNeeded','target.card.boundingBox','target.mouse.move.start','target.mouse.down','target.mouse.move.drag','target.mouse.up']:['prefix.start.focus','prefix.keyboard.Enter','prefix-start.getAttribute','prefix.cancel.click','cancel-prefix.clock.runFor','cancel-prefix.getAttribute','prefix.Replay.click','success-prefix.clock.runFor','success-prefix.getAttribute','target.result.selectOption','target.Replay.first.click','target.Replay.second.click'];
  return [...common,...input,'target.clock.runFor','primary.getAttribute',...intermediateNames(group),'followup.getAttribute','context.tracing.stop','context.close','browser.close'];
}
