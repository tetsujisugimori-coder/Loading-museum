/**
 * Phase 5A's contract is coherent committed DOM while scrolling, followed by
 * a settled model/viewport before the next independent gesture. Separate
 * locator awaits cannot represent one snapshot. Never retry an inconsistent
 * snapshot: fail immediately, including while waiting for convergence.
 */
export async function observeVirtualList(stage, {minimumTop = 0, timeout = 8000} = {}) {
  return stage.evaluate((root, {minimumTop, timeout}) => new Promise((resolve, reject) => {
    const viewport = root.querySelector('.phase5Viewport');
    const started = performance.now();
    const samples = [];
    let previous = '', stableSince = started, stableFrames = 0, frame;
    const finish = (error, result) => {
      clearTimeout(timer); cancelAnimationFrame(frame);
      if (error) reject(new Error(`${error}; samples=${JSON.stringify(samples)}`));
      else resolve({snapshot: result, samples, elapsed: performance.now() - started});
    };
    const timer = setTimeout(() => finish('Virtualized List did not converge'), timeout);
    const sample = () => {
      const rows = [...root.querySelectorAll('[data-virtual-row]')];
      const state = {
        top: viewport.scrollTop,
        modelTop: Number(root.querySelector('[data-scroll-top]').textContent),
        displayed: Number(root.querySelector('[data-dom-count]').textContent),
        count: rows.length,
        ids: rows.map(row => row.dataset.id),
      };
      samples.push({at: performance.now(), ...state});
      if (state.displayed !== state.count) return finish('Inconsistent count in one DOM snapshot');
      if (state.count > 13) return finish('Virtualized List exceeded its 13-row bound');
      const signature = JSON.stringify(state);
      if (signature !== previous) { stableSince = performance.now(); stableFrames = 0; previous = signature; }
      else stableFrames++;
      // A single scrollend can precede remaining PageDown motion when a direct
      // scroll interrupts it. Require measured multi-frame convergence too.
      if (state.top >= minimumTop && state.modelTop === Math.round(state.top)
          && stableFrames >= 6 && performance.now() - stableSince >= 100) {
        const start = Math.max(0, Math.floor(state.top / 36) - 3);
        const end = Math.min(10000, Math.ceil((state.top + 216) / 36) + 3);
        const expected = Array.from({length: end - start}, (_, i) => `record-${start + i + 1}`);
        if (JSON.stringify(state.ids) !== JSON.stringify(expected)) return finish('Settled row range disagrees with viewport');
        return finish(null, state);
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
  }), {minimumTop, timeout});
}
