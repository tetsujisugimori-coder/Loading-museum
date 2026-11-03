import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {flashExhibits,flashCategories} from '../app/data/flashExhibits';
import {phaseTwoNotes} from '../app/data/thenNowPhaseTwo';
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
it('retains all sixty prior Flash records byte-for-byte in evaluated order',()=>{
  expect(digest(flashExhibits.filter(e=>!(e.id in phaseTwoNotes)))).toBe('6da8142a020d691ee92fa67317cd65aa1b2cfc6383816882aa4ed15557d99d84');
});
it('adds six complete pairs once within the existing eighteen categories',()=>{
  expect(flashExhibits).toHaveLength(66);expect(flashCategories).toHaveLength(18);
  const added=flashExhibits.filter(e=>e.id in phaseTwoNotes);
  expect(added.map(e=>e.id).sort()).toEqual(Object.keys(phaseTwoNotes).sort());
  for(const e of added){expect(e.visualType).toBe('then-now');expect(flashCategories.some(c=>c.id===e.categoryId)).toBe(true);}
  expect(new Set(flashExhibits.map(e=>e.id)).size).toBe(66);
});
