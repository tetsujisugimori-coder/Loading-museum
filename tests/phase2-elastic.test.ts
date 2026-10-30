import {describe,expect,it} from 'vitest';
import {advanceElastic} from '../app/components/Phase2BPlayer';
describe('elastic controls',()=>{
 it('uses greater elasticity for stronger restoring motion',()=>{const start={x:100,y:0,vx:0,vy:0};expect(advanceElastic(start,100,50).x).toBeLessThan(advanceElastic(start,0,50).x)});
 it('uses damping to reduce subsequent velocity',()=>{const start={x:0,y:0,vx:10,vy:0};expect(advanceElastic(start,50,100).vx).toBeLessThan(advanceElastic(start,50,0).vx)});
});
