import {exhibitRooms} from './exhibitRooms';
import {appleEarlyExhibits} from './appleEarlyExhibits';
import {macintoshBirthExhibits} from './macintoshBirthExhibits';
import {cursorExhibits} from './cursorExhibits';
import {flashExhibits} from './flashExhibits';
import {waapiSamples} from './waapiSamples';
import {modernExhibits} from './modernExhibits';
import {smallMotionExhibits} from './smallMotionExhibits';
import {phase2Studies} from './phase2Studies';
import {phase2BStudies} from './phase2BStudies';
import {practicalExhibits} from './practicalExhibits';
import {phase4aExhibits} from './phase4aExhibits';
import {phase4bExhibits} from './phase4bExhibits';
import {phase5aExhibits} from './phase5aExhibits';
import {phase5bExhibits} from './phase5bExhibits';
import {phase6aExhibits} from './phase6aExhibits';
export type MotionCategory='historical'|'modern';
export type CatalogRecord={key:string;originalId:string;title:string;room:string;categories:MotionCategory[];collection:string;tags:readonly string[];href:string};
export const museumRooms=[
  ...exhibitRooms.map(r=>({id:r.roomId,title:r.roomTitle,selector:`#${r.roomId}-toggle`,kind:'room'})),
  {id:'apple',title:'Apple I / Apple II 展示室',selector:'#apple-early-era-room-toggle',kind:'room'},
  {id:'macintosh',title:'Macintosh誕生展示室',selector:'#macintosh-birth-room-toggle',kind:'room'},
  {id:'cursor',title:'カーソル展示室',selector:'#cursor-room-toggle',kind:'room'},
  {id:'flash',title:'Flash特別展示室',selector:'#flash-special-exhibit',kind:'room'},
  {id:'dom',title:'DOM ANIMATION ROOM',selector:'.roomCardDomAnimation',kind:'room'},
  {id:'waapi',title:'WAAPI標本室',selector:'.waapiGallery',kind:'room'},
  {id:'modern-animation',title:'現代アニメーション常設展',selector:'.modernRoom',kind:'room'},
  {id:'experiments',title:'インタラクティブ作品・表現実験',selector:'.studyRoom',kind:'room'},
  {id:'practical',title:'実用UI部品の観察室',selector:'.practicalRoom:not(.phase4Room)',kind:'room'},
  {id:'practical-advanced',title:'第4・5期：実用UI部品の観察室',selector:'.phase4Room',kind:'room'},
];
const record=(room:string,id:string,title:string,categories:MotionCategory[],collection='',tags:readonly string[]=[],href=`#browse-${room}?exhibit=${encodeURIComponent(id)}`):CatalogRecord=>({key:`${room}:${id}`,originalId:id,title,room,categories,collection,tags,href});
const modern=(room:string,items:readonly {id:string;title:string;tags:readonly string[]}[],collection='')=>items.map(x=>record(room,x.id,x.title,['modern'],collection,x.tags));
export const museumCatalog:CatalogRecord[]=[
  ...['CUIの回転文字','点が増える表示','Windows風の砂時計','初期WebのGIF風スピナー','Apple風の点が巡るスピナー','Windows Vista風の青い光','CSSの円弧スピナー','プログレスバー','スケルトンスクリーン'].map((title,i)=>record('loading-gallery',`loading-${i+1}`,title,[i<6?'historical':'modern'],'ローディング常設ギャラリー',[], '#loading-gallery')),
  ...exhibitRooms.flatMap(r=>r.exhibits.flatMap(e=>e.kind==='vanished-os'?e.loadingExhibits.map(x=>record(r.roomId,x.demoId,`${e.title} / ${x.title}`,['historical'])):[record(r.roomId,e.exhibitId,e.title,['historical'])])),
  ...appleEarlyExhibits.map(x=>record('apple',x.id,x.name,['historical'])),
  ...macintoshBirthExhibits.map(x=>record('macintosh',x.id,x.title,['historical'])),
  ...cursorExhibits.map(x=>record('cursor',x.id,x.name,['historical','modern'],'歴史から現在へ続くポインター',x.technologies)),
  ...flashExhibits.map(x=>record('flash',x.id,x.title,x.visualType==='then-now'||x.visualType.startsWith('comparison-')?['historical','modern']:['historical'],x.visualType==='then-now'||x.visualType.startsWith('comparison-')?'Then / Now・技術継承比較':'Flash表現',x.modernTechnique,`#flash-category-${x.categoryId}`)),
  ...[["operation-01-create-append", "1. 要素を作って末尾へ追加"], ["operation-02-prepend", "2. 要素を先頭へ差し込む"], ["operation-03-insert-before", "3. 任意位置へ差し込む"], ["operation-04-set-attribute", "4. 属性を付与して識別"], ["operation-05-remove-attribute", "5. 一時属性を取り除く"], ["operation-06-class-list-add-remove", "6. classList で状態を切り替える"], ["operation-07-class-toggle-loop", "7. classList.toggle のループ"], ["operation-08-style-set-property", "8. style.setProperty で見た目を変更"], ["operation-09-dataset-state", "9. dataset で状態を保持"], ["operation-10-text-content", "10. textContent で表示文字列を更新"], ["operation-11-query-selector-all", "11. querySelectorAll でまとめて操作"], ["operation-12-closest", "12. closest で祖先をたどる"], ["operation-13-contains", "13. contains で包含関係を確認"], ["operation-14-clone-node", "14. cloneNode で複製"], ["operation-15-replace-children", "15. replaceChildren でまとめて入れ替え"], ["operation-16-event-listener", "16. addEventListener / removeEventListener"], ["operation-17-scroll-and-rect", "17. scrollIntoView と座標取得"]].map(([id,title])=>record('dom',id,title,['modern'])),
  ...waapiSamples.map(x=>record('waapi',x.id,x.name,x.category==='OS / Historical'?['historical']:['modern'],x.category,x.tags)),
  ...modernExhibits.map(x=>record('modern-animation',x.id,x.title,['modern'],'原典着想コレクション',x.tags,`#modern-exhibit-${x.id}`)),
  ...smallMotionExhibits.map(x=>record('modern-animation',x.id,x.title,['modern'],'Small Motion Collection',x.tags,`#modern-exhibit-${x.id}`)),
  ...modern('experiments',[...phase2Studies,...phase2BStudies]),
  ...modern('practical',practicalExhibits),
  ...modern('practical-advanced',[...phase4aExhibits,...phase4bExhibits,...phase5aExhibits,...phase5bExhibits,...phase6aExhibits]),
];
export function categorySummary(category:MotionCategory){const records=museumCatalog.filter(x=>x.categories.includes(category));return {objects:records.length,rooms:new Set(records.filter(x=>x.room!=='loading-gallery').map(x=>x.room)).size};}
export const museumTotal=new Set(museumCatalog.map(x=>x.key)).size;
