import {describe,it,expect} from 'vitest';
import {museumCatalog,museumRooms,museumTotal,categorySummary} from '../app/data/museumClassification';
import {dialupBbsCollection,dialupBbsExhibits,dialupBbsHref,dialupBbsRoom} from '../app/data/dialupBbsExhibits';
describe('BBS registration',()=>{
 it('adds only three historical records in the existing room',()=>{
   expect(museumTotal).toBe(289);expect(museumCatalog).toHaveLength(289);expect(museumRooms).toHaveLength(13);
   expect(categorySummary('historical').objects).toBe(148);expect(categorySummary('modern').objects).toBe(164);
   expect(museumCatalog.filter(x=>x.categories.length===2)).toHaveLength(23);
   expect(dialupBbsExhibits.map(x=>x.id)).toEqual(['bbs-03','bbs-04','bbs-05']);
   const registered=museumCatalog.filter(x=>x.collection===dialupBbsCollection);
   expect(registered).toHaveLength(3);
   for(const work of dialupBbsExhibits){
     const matches=museumCatalog.filter(x=>x.originalId===work.id);
     expect(matches).toHaveLength(1);
     expect(matches[0]).toMatchObject({key:dialupBbsRoom+':'+work.id,room:dialupBbsRoom,title:work.title,categories:['historical'],href:dialupBbsHref(work.id),tags:work.tags});
     expect(work.provenance).toBe('conceptual-reconstruction');
     expect(work.sourceIds.length).toBeGreaterThan(0);
   }
 });
});
