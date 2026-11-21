import {describe,it,expect} from 'vitest';
import {museumCatalog,museumRooms,museumTotal,categorySummary} from '../app/data/museumClassification';
import {motionCompositionExhibits} from '../app/data/motionCompositionExhibits';
describe('phase7c registry contracts',()=>{
 it('adds six distinct stable entries inside the existing modern room',()=>{expect(museumTotal).toBe(292);expect(museumRooms).toHaveLength(13);expect(motionCompositionExhibits).toHaveLength(6);expect(new Set(museumCatalog.map(e=>e.key)).size).toBe(292);for(const e of motionCompositionExhibits){const records=museumCatalog.filter(r=>r.originalId===e.id);expect(records).toHaveLength(1);expect(records[0].room).toBe('modern-animation');expect(records[0].href).toBe(`#modern-exhibit-${e.id}`);expect(records[0].categories).toEqual(['modern']);expect(e.difference.length).toBeGreaterThan(20);}});
 it('preserves prior collections, historical scope and shared references',()=>{expect(categorySummary('historical').objects).toBe(145);expect(categorySummary('modern').objects).toBe(170);expect(museumCatalog.filter(r=>r.categories.length===2)).toHaveLength(23);for(const c of ['Small Motion Collection','Small Motion Collection II','Motion Composition Studio'])expect(museumCatalog.filter(e=>e.collection===c)).toHaveLength(6);expect(museumCatalog.filter(e=>e.room==='modern-animation')).toHaveLength(30);});
});
