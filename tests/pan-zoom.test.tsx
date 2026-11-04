// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import PanZoom from '../app/components/practical/PanZoom';
import PracticalRoom from '../app/components/PracticalRoom';
import {fit,focusPoint,landmarks,pan,resize,scaleOf,visibleRect,worldAt,zoomAt} from '../app/components/practical/pan-zoom-model';
import {phase6aExhibits} from '../app/data/phase6aExhibits';
let measure:()=>void, width=600,height=400;
beforeEach(()=>{
 width=600;height=400;
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 vi.stubGlobal('ResizeObserver',class{constructor(cb:()=>void){measure=cb}observe(){}disconnect(){}});
 vi.stubGlobal('PointerEvent',class extends MouseEvent{pointerId:number;pointerType:string;constructor(type:string,options:PointerEventInit={}){super(type,options);this.pointerId=options.pointerId??1;this.pointerType=options.pointerType??'mouse'}});
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>width);vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockImplementation(()=>height);
 HTMLElement.prototype.setPointerCapture=()=>{};HTMLElement.prototype.releasePointerCapture=()=>{};HTMLElement.prototype.hasPointerCapture=()=>false;
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
it('keeps the pointed world feature at its screen position; center controls use the center',()=>{
 const v=focusPoint(fit(600,400)!,{x:500,y:350}),anchor={x:220,y:170};
 expect(worldAt(zoomAt(v,6,anchor),anchor)).toEqual(worldAt(v,anchor));
 const center={x:300,y:200};expect(worldAt(zoomAt(v,5),center).x).toBeCloseTo(worldAt(v,center).x,7);expect(worldAt(zoomAt(v,5),center).y).toBeCloseTo(worldAt(v,center).y,7);
});
it('fits only measured viewports, clamps limits and never loses the entire world',()=>{
 expect(fit(0,400)).toBeNull();expect(fit(NaN,400)).toBeNull();let v=fit(300,400)!;
 for(let i=0;i<100;i++){v=pan(zoomAt(v,i%2?1e20:-4),i%2?1e6:-1e6,i%2?-1e6:1e6);const r=visibleRect(v);expect(r.width).toBeGreaterThan(0);expect(r.height).toBeGreaterThan(0);expect(v.zoom).toBeGreaterThanOrEqual(1);expect(v.zoom).toBeLessThanOrEqual(8)}
 expect(zoomAt(v,NaN)).toBe(v);expect(zoomAt(v,Infinity)).toBe(v);
});
it('resize retains the center when not clamped, landmarks and minimap match independent geometric expectations',()=>{
 const v=focusPoint(fit(600,400)!,{x:500,y:350}),next=resize(v,400,500)!;
 expect(worldAt(next,{x:200,y:250}).x).toBeCloseTo(500,7);expect(worldAt(next,{x:200,y:250}).y).toBeCloseTo(350,7);
 for(const [key,value] of Object.entries({x:368.75,y:262.5,width:262.5,height:175}))expect(visibleRect(v)[key as keyof ReturnType<typeof visibleRect>]).toBeCloseTo(value,7);
 for(const m of landmarks){const target=focusPoint(fit(600,400)!,m),s=scaleOf(target);expect(target.x+m.x*s).toBeCloseTo(300);expect(target.y+m.y*s).toBeCloseTo(200)}
});
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
const transform=()=>screen.getByTestId('pz-transform').getAttribute('transform');
function start(){const zone=screen.getByRole('group',{name:'図版の操作領域'});fireEvent.pointerDown(zone,{pointerId:1,button:0,clientX:200,clientY:180});fireEvent.pointerMove(zone,{pointerId:1,clientX:235,clientY:200});return zone}
function stale(zone:HTMLElement){fireEvent.pointerMove(zone,{pointerId:1,clientX:280,clientY:230});fireEvent.pointerUp(zone,{pointerId:1,clientX:280,clientY:230})}
it('owner pointer alone can commit; cancel rolls back and stale events cannot commit',()=>{
 render(<PanZoom/>);click('三日月橋：この場所を見る');const before=transform(),zone=start();expect(transform()).not.toBe(before);
 fireEvent.pointerCancel(zone,{pointerId:2});fireEvent.pointerUp(zone,{pointerId:2,clientX:500,clientY:500});expect(zone.dataset.dragging).toBe('true');
 fireEvent.pointerCancel(zone,{pointerId:1});expect(transform()).toBe(before);stale(zone);expect(transform()).toBe(before);
 start();fireEvent.keyDown(zone,{key:'Escape'});stale(zone);expect(transform()).toBe(before);
});
for(const action of ['Reset','全体表示','拡大','resize','mode','blur'])it(`invalidates pending drag on ${action}`,()=>{
 render(<PanZoom/>);click('三日月橋：この場所を見る');const zone=start();
 if(action==='resize'){width=480;fireEvent(window,new Event('resize'));fireEvent.click(document.body);act(()=>measure())}
 else if(action==='mode')click('図版を移動：OFF');else if(action==='blur')fireEvent(window,new Event('blur'));else click(action);
 const result=transform();stale(zone);expect(transform()).toBe(result);expect(zone.dataset.dragging).toBe('false');
});
it('buttons, numeric validation, keyboard scope, touch modes and Reset/fit selection contracts',()=>{
 render(<PanZoom/>);click('時計の庭：この場所を見る');expect(screen.getByText(/時計の庭（選択中）/)).toBeTruthy();
 const zone=screen.getByRole('group',{name:'図版の操作領域'}),input=screen.getByLabelText('倍率（%）'),before=transform();
 fireEvent.keyDown(input,{key:'ArrowLeft'});expect(transform()).toBe(before);fireEvent.keyDown(zone,{key:'ArrowLeft'});expect(transform()).not.toBe(before);
 for(const invalid of ['','bad','Infinity']){fireEvent.change(input,{target:{value:invalid}});click('倍率を適用');expect(screen.getByRole('status').textContent).toContain('数値');expect(transform()).not.toContain('NaN')}
 fireEvent.change(input,{target:{value:'99999'}});click('倍率を適用');expect((input as HTMLInputElement).value).toBe('800');
 expect(zone.style.touchAction).toBe('pan-y pinch-zoom');click('図版を移動：OFF');expect(zone.style.touchAction).toBe('pinch-zoom');
 click('全体表示');expect(screen.getByText(/時計の庭（選択中）/)).toBeTruthy();expect(screen.getByRole('button',{name:'図版を移動：ON'}).getAttribute('aria-pressed')).toBe('true');
 click('Reset');expect(screen.queryByText(/（選択中）/)).toBeNull();expect(screen.getByRole('button',{name:'図版を移動：OFF'})).toBeTruthy();expect((input as HTMLInputElement).value).toBe('100');
});
it('searches one new exhibit, discards drag on switching and returns focus on close',()=>{
 render(<PracticalRoom phase={4}/>);click('部品展示室を開く');click(phase6aExhibits[0].title);click('三日月橋：この場所を見る');const zone=start();
 click('Kanban Board / 仕事を配置する');stale(zone);click(phase6aExhibits[0].title);expect(screen.getByTestId('pz-reading').textContent).toContain('100%');
 fireEvent.change(screen.getByLabelText('部品名・用途・技術で検索'),{target:{value:'座標変換'}});expect(screen.getByRole('navigation').querySelectorAll('button')).toHaveLength(1);
 click('閉室して一覧へ戻る');expect(screen.queryByTestId('pan-zoom')).toBeNull();expect(document.activeElement?.textContent).toBe('部品展示室を開く');
});

it('suspends a zero-width viewport without losing the last measured zoom and center',()=>{
 render(<PanZoom/>);click('三日月橋：この場所を見る');const before=transform();
 width=0;act(()=>measure());expect(screen.queryByTestId('pz-transform')).toBeNull();expect(screen.getByRole('button',{name:'全体表示'}).hasAttribute('disabled')).toBe(true);
 width=600;act(()=>measure());expect(transform()).toBe(before);expect(screen.getByTestId('pz-reading').textContent).toContain('400%');
});
