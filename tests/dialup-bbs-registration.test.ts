import {describe,it,expect} from 'vitest';
import {museumCatalog,museumRooms,museumTotal,categorySummary} from '../app/data/museumClassification';
import {dialupBbsCollection,dialupBbsExhibits,dialupBbsHref,dialupBbsRoom} from '../app/data/dialupBbsExhibits';
describe('BBS registration',()=>{
 it('preserves ten historical BBS IDs and appends both Wave 4 records in the existing room',()=>{
   expect(museumTotal).toBe(298);expect(museumCatalog).toHaveLength(298);expect(museumRooms).toHaveLength(13);
   expect(categorySummary('historical').objects).toBe(157);expect(categorySummary('modern').objects).toBe(164);
   expect(museumCatalog.filter(x=>x.categories.length===2)).toHaveLength(23);
   expect(dialupBbsExhibits.map(x=>x.id)).toEqual(['bbs-03','bbs-04','bbs-05','bbs-06','bbs-07','bbs-08','bbs-09','bbs-10','bbs-11','bbs-12','bbs-13','bbs-14']);
   const registered=museumCatalog.filter(x=>x.collection===dialupBbsCollection);
   expect(registered).toHaveLength(12);
   for(const work of dialupBbsExhibits){
     const matches=museumCatalog.filter(x=>x.originalId===work.id);
     expect(matches).toHaveLength(1);
     expect(matches[0]).toMatchObject({key:dialupBbsRoom+':'+work.id,room:dialupBbsRoom,title:work.title,categories:['historical'],href:dialupBbsHref(work.id),tags:work.tags});
     expect(dialupBbsHref(work.id)).toBe('./dialup-bbs/'+(Number(work.candidate)<6?'index.html':Number(work.candidate)<9?'ansi.html':Number(work.candidate)<13?'communications.html':work.candidate==='13'?'ripscrip.html':'door-game.html')+'#'+work.id);
     expect(work.provenance).toBe('conceptual-reconstruction');
     expect(work.sourceIds.length).toBeGreaterThan(0);
   }
 });
});
