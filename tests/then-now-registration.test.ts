import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {flashExhibits,flashCategories,flashExhibitCount} from '../app/data/flashExhibits';
import {thenNowNotes} from '../app/data/thenNowStudies';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
it('preserves every field of the original 54 exhibits and all 18 category definitions',()=>{
  // Digests independently derived from e75e74be main's evaluated pure data.
  expect(digest(flashExhibits.filter(e=>!e.id.startsWith('tn-')))).toBe('79937099bb71d7631029211365c11e704830bca01423b0cd8958691353d12831');
  expect(digest(flashCategories)).toBe('3fb7ebcebe39ddc9af1f7f371361267af37e30d7de6179cbb8ca338381d88488');
});
it('preserves phase-one six pairs while extending the same room without duplicate IDs',()=>{
  expect(flashExhibitCount).toBe(66);expect(flashCategories).toHaveLength(18);expect(new Set(flashExhibits.map(e=>e.id)).size).toBe(66);
  const added=flashExhibits.filter(e=>e.id in thenNowNotes);expect(added.map(e=>e.id).sort()).toEqual(Object.keys(thenNowNotes).sort());expect(added).toHaveLength(6);
  for(const e of added)expect(flashCategories.some(c=>c.id===e.categoryId)).toBe(true);
});
it('each new pair supplies explicit differentiation, sources and reconstruction limits',()=>{
  for(const note of Object.values(thenNowNotes)){expect(note.difference.length).toBeGreaterThan(35);expect(note.limit.length).toBeGreaterThan(20);expect(note.url).toMatch(/^https:\/\/(helpx.adobe.com|www.adobe.com|developer.mozilla.org)\//);}
});
