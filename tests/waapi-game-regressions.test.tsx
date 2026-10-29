// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ExpandedGamePreview } from '../app/components/WaapiExpandedPreviews';
import { waapiSamples } from '../app/data/waapiSamples';
const setup = (kind: string) => render(<ExpandedGamePreview sample={waapiSamples.find(s => s.render === kind)!} active reducedMotion />);
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(HTMLElement.prototype, 'animate', { configurable:true, value:vi.fn(() => ({cancel:vi.fn()})) }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('rejects wrapped nonadjacent cells rather than granting points', () => { const r=setup('match3'); const cells=r.container.querySelectorAll('.matchBoard button'); fireEvent.click(cells[2]); fireEvent.click(cells[3]); fireEvent.click(r.getByText('SWAP')); expect(r.container.querySelector('output')!.textContent).toContain('NOT ADJACENT'); });
it('accepts vertical adjacency, then judges actual contents', () => { const r=setup('match3'); const cells=r.container.querySelectorAll('.matchBoard button'); fireEvent.click(cells[0]); fireEvent.click(cells[3]); fireEvent.click(r.getByText('SWAP')); expect(r.container.querySelector('output')!.textContent).not.toContain('NOT ADJACENT'); });
it('initial and reset reticle belongs to selected target', () => { const r=setup('lockon'); expect(r.container.querySelector('.isLocked .lockReticle')).not.toBeNull(); });
it('equipment is represented by DOM state, not only a filled animation', () => { const r=setup('equip'); fireEvent.click(r.getByText('EQUIP')); expect(r.container.querySelector('.gameEquip > button')).toBeNull(); });
it('falling block stores occupied cells rather than a fixed solid rectangle', () => { const r=setup('line-clear'); expect(r.container.querySelectorAll('[data-block-id]').length).toBeGreaterThan(0); expect(r.container.querySelectorAll('[data-block-id]').length).toBeLessThan(20); });
it.each([[5,8],[4,5]])('actually matches adjacent %i/%i, scores removed cells and restores on reset', (a,b) => {
 const r=setup('match3'); const cells=()=>Array.from(r.container.querySelectorAll<HTMLButtonElement>('.matchBoard button')); const original=cells().map(c=>c.textContent);
 fireEvent.click(cells()[a]); fireEvent.click(cells()[b]); fireEvent.click(r.getByText('SWAP'));
 const empty=cells().filter(c=>c.disabled).length; expect(empty).toBeGreaterThanOrEqual(3); expect(r.container.querySelector('output')!.textContent).toContain(`SCORE ${empty*100}`); expect(cells().map(c=>c.textContent)).not.toEqual(original);
 fireEvent.click(r.getByText('RESET')); expect(cells().map(c=>c.textContent)).toEqual(original); expect(r.container.querySelector('output')!.textContent).toContain('SCORE 0');
});
it('rejects diagonal and returns a legal no-match exchange without score', () => {
 const r=setup('match3'); const cells=r.container.querySelectorAll('.matchBoard button'); const original=Array.from(cells,c=>c.textContent);
 for (const pair of [[0,4],[0,1]]) { fireEvent.click(cells[pair[0]]); fireEvent.click(cells[pair[1]]); fireEvent.click(r.getByText('SWAP')); expect(Array.from(cells,c=>c.textContent)).toEqual(original); expect(r.container.querySelector('output')!.textContent).toContain('SCORE 0'); }
 expect(r.container.querySelector('output')!.textContent).toContain('NO MATCH');
});
it('drag uses the dropped pair, not stale selection', () => { const r=setup('match3'); const cells=r.container.querySelectorAll('.matchBoard button'); fireEvent.dragStart(cells[8]); fireEvent.drop(cells[11]); expect(r.container.querySelector('output')!.textContent).toContain('MATCH'); expect(r.container.querySelectorAll('.matchBoard button:disabled').length).toBeGreaterThanOrEqual(3); });
it('clears the completed row and moves actual block identities down, reset and repeat', () => {
 const r=setup('line-clear'); const state=()=>Array.from(r.container.querySelectorAll('[data-cell]'),c=>c.getAttribute('data-block-id')); const initial=state();
 for(let trial=0;trial<2;trial++) { fireEvent.click(r.getByText('DROP')); const next=state(); expect(next).not.toEqual(initial); expect(next[16]).toBe('d'); expect(next[19]).toBe('e'); expect(next).not.toContain('f'); expect(r.container.querySelector('output')!.textContent).toContain('COMPACT'); fireEvent.click(r.getByText('RESET')); expect(state()).toEqual(initial); }
});
it('equipment remains consistent when inactive and reactivated, repeated equip and unequip', () => {
 const sample=waapiSamples.find(s=>s.render==='equip')!; const r=setup('equip');
 for(let cycle=0;cycle<3;cycle++) { fireEvent.click(r.getByText('EQUIP')); r.rerender(<ExpandedGamePreview sample={sample} active={false} reducedMotion />); r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion />); expect(r.container.querySelector('.gameEquip > button')).toBeNull(); expect(r.container.querySelector('.equipSlot')!.textContent).toContain('IRON BLADE'); expect(r.container.querySelector('output')!.textContent).toContain('24'); fireEvent.click(r.getByText('UNEQUIP')); expect(r.container.querySelector('.gameEquip > button')).not.toBeNull(); expect(r.container.querySelector('output')!.textContent).toContain('12 (+0)'); }
});
it('lock target, ring, name and keyboard/reset share selection', () => { const r=setup('lockon'); for(const name of ['WARDEN','DRONE','SCOUT']) { fireEvent.click(r.getByText('NEXT TARGET')); expect(r.container.querySelector('.isLocked')!.getAttribute('aria-label')).toBe(name); expect(r.container.querySelector('.isLocked .lockReticle')).not.toBeNull(); expect(r.container.querySelector('output')!.textContent).toContain(name); } fireEvent.keyDown(r.container.querySelector('[data-scene="lockon"]')!,{key:'ArrowLeft'}); expect(r.container.querySelector('output')!.textContent).toContain('DRONE'); fireEvent.click(r.getByText('RESET')); expect(r.container.querySelector('.isLocked')!.getAttribute('aria-label')).toBe('SCOUT'); });
it('Reset during finite movement cancels old animations without delayed board resurrection', () => {
 const sample=waapiSamples.find(s=>s.render==='line-clear')!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false} />);
 const state=()=>Array.from(r.container.querySelectorAll('[data-cell]'),c=>c.getAttribute('data-block-id')); const initial=state();
 fireEvent.click(r.getByText('DROP'));
 const animations=vi.mocked(HTMLElement.prototype.animate).mock.results.map(result=>result.value);
 expect(animations.length).toBeGreaterThan(0);
 fireEvent.click(r.getByText('RESET')); fireEvent.click(r.getByText('RESET'));
 expect(animations.every(animation=>animation.cancel.mock.calls.length>0)).toBe(true);
 expect(state()).toEqual(initial); expect(vi.getTimerCount()).toBe(0);
});


it('Turn RESET restores DOM immediately and invalidates queued FLIP callbacks', () => {
 const sample=waapiSamples.find(s=>s.render==='turn-order')!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false} />);
 const order=()=>Array.from(r.container.querySelectorAll('[data-unit]'),e=>e.getAttribute('data-unit'));
 fireEvent.click(r.getByText('HASTE'));
 expect(order()).toEqual(['MAGE','KNIGHT','ROGUE']);
 fireEvent.click(r.getByText('RESET'));
 expect(order()).toEqual(['KNIGHT','MAGE','ROGUE']);
 expect(r.container.querySelector('output')!.textContent).toContain('NORMALIZE');
 act(()=>vi.runAllTimers());
 expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
 fireEvent.click(r.getByText('HASTE'));
 act(()=>vi.runAllTimers());
 expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(3);
 const running=vi.mocked(HTMLElement.prototype.animate).mock.results.map(result=>result.value);
 fireEvent.click(r.getByText('RESET'));
 expect(order()).toEqual(['KNIGHT','MAGE','ROGUE']);
 expect(running.every(animation=>vi.mocked(animation.cancel).mock.calls.length===1)).toBe(true);
 fireEvent.click(r.getByText('HASTE'));
 r.rerender(<ExpandedGamePreview sample={sample} active={false} reducedMotion={false} />);
 act(()=>vi.runAllTimers());
 expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(3);
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion={false} />);
 fireEvent.click(r.getByText('STUN'));
 r.unmount();
 act(()=>vi.runAllTimers());
 expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(3);
});


it('Turn motion reduction cancels running FLIP animations', () => {
 const sample=waapiSamples.find(s=>s.render==='turn-order')!;
 const r=render(<ExpandedGamePreview sample={sample} active reducedMotion={false} />);
 fireEvent.click(r.getByText('HASTE'));
 act(()=>vi.runAllTimers());
 const running=vi.mocked(HTMLElement.prototype.animate).mock.results.map(result=>result.value);
 expect(running).toHaveLength(3);
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion />);
 expect(running.every(animation=>vi.mocked(animation.cancel).mock.calls.length===1)).toBe(true);
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion={false} />);
 fireEvent.click(r.getByText('STUN'));
 r.rerender(<ExpandedGamePreview sample={sample} active reducedMotion />);
 act(()=>vi.runAllTimers());
 expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(3);
});
