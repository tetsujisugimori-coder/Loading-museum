import {describe,it,expect} from 'vitest';
import {museumCatalog,museumRooms,museumTotal,categorySummary} from '../app/data/museumClassification';
import {interactiveMotionExhibits} from '../app/data/interactiveMotionExhibits';
describe('Interactive Motion registration',()=>{
 it('adds six unique entries without a room',()=>{expect(museumTotal).toBe(292);expect(museumRooms).toHaveLength(13);expect(interactiveMotionExhibits).toHaveLength(6);expect(new Set(museumCatalog.map(e=>e.key)).size).toBe(292);for(const x of interactiveMotionExhibits){const records=museumCatalog.filter(e=>e.originalId===x.id);expect(records).toHaveLength(1);expect(records[0].href).toBe(`#modern-exhibit-${x.id}`);expect(records[0].categories).toEqual(['modern']);expect(x.difference.length).toBeGreaterThan(20);}});
 it('keeps historical references and previous collections',()=>{expect(categorySummary('historical').objects).toBe(145);expect(categorySummary('modern').objects).toBe(170);expect(museumCatalog.filter(e=>e.categories.length===2)).toHaveLength(23);for(const c of ['Small Motion Collection','Small Motion Collection II','Motion Composition Studio','Interactive Motion Lab'])expect(museumCatalog.filter(e=>e.collection===c)).toHaveLength(6);});
});
