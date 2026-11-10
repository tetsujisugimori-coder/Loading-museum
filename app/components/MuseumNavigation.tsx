"use client";
import {useEffect,useState} from 'react';
import {categorySummary,museumCatalog,museumRooms,museumTotal,type MotionCategory} from '../data/museumClassification';
import './museum-navigation.css';

// Opening a room commits asynchronously, and content-visibility may retain a skipped
// descendant's old inherited visibility until it is scrolled into the rendered area.
// Recheck the real focus destination; cancel when a newer navigation or user action wins.
let cancelDestination=()=>{};
function focusDestination(resolve:()=>HTMLElement|null|undefined){
  cancelDestination();
  let frame=0,started:number|undefined,cancelled=false;
  const stop=()=>{cancelled=true;cancelAnimationFrame(frame);};
  cancelDestination=stop;
  const attempt=(now:number)=>{
    if(cancelled)return;
    started??=now;
    const target=resolve();
    if(target?.isConnected&&!target.closest('[inert], [aria-hidden="true"]')){
      target.scrollIntoView({block:'start'});
      if(getComputedStyle(target).visibility==='visible'){
        target.tabIndex=-1;target.focus({preventScroll:true});
        if(document.activeElement===target){stop();return;}
      }
    }
    if(now-started<2000)frame=requestAnimationFrame(attempt);else stop();
  };
  frame=requestAnimationFrame(attempt);
}
// Only opens the existing instance. Classification does not render copies of exhibits.
function followHash(){
  cancelDestination();
  const hash=window.location.hash.slice(1);
  if(hash.startsWith('browse-')){
    const [entrance,params]=hash.split('?');
    const room=museumRooms.find(r=>`browse-${r.id}`===entrance);
    const id=new URLSearchParams(params).get('exhibit');
    if(!room)return;
    const root=document.querySelector<HTMLElement>(room.selector);
    const toggle=root?.matches('button')?root:root?.querySelector<HTMLElement>('button[aria-expanded]');
    if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();
    root?.scrollIntoView({block:'start'});toggle?.focus({preventScroll:true});
    if(id){
      const record=museumCatalog.find(x=>x.room===room.id&&x.originalId===id);
      focusDestination(()=>{
        const scope=root?.matches('button')?root.parentElement:root;
        return scope?.querySelector<HTMLElement>(`[data-museum-id="${CSS.escape(id)}"]`)??[...scope?.querySelectorAll<HTMLElement>('h2,h3,h4')??[]].find(n=>record&&n.textContent?.trim()===record.title);
      });
    }
  }else if(hash.startsWith('flash-category-')){
    const room=document.getElementById('flash-special-exhibit');const button=room?.querySelector<HTMLButtonElement>('button[aria-expanded]');
    if(button?.getAttribute('aria-expanded')==='false')button.click();
    // The Flash component also selects the requested category before focusing it.
    focusDestination(()=>document.getElementById(hash));
  }else {
    const target=document.getElementById(hash);const panel=target?.closest<HTMLElement>('[aria-hidden="true"]');
    if(panel?.id){const toggle=document.querySelector<HTMLButtonElement>(`button[aria-controls="${CSS.escape(panel.id)}"]`);if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();}
    if(target&&panel)focusDestination(()=>target);
  }
}
export default function MuseumNavigation(){
  const [category,setCategory]=useState<MotionCategory|null>(null),[query,setQuery]=useState('');
  useEffect(()=>{
    const stop=()=>cancelDestination();
    followHash();window.addEventListener('hashchange',followHash);
    for(const event of ['pointerdown','keydown','wheel'])window.addEventListener(event,stop,{passive:true});
    return()=>{stop();window.removeEventListener('hashchange',followHash);for(const event of ['pointerdown','keydown','wheel'])window.removeEventListener(event,stop);};
  },[]);
  const records=museumCatalog.filter(x=>(!category||x.categories.includes(category))&&`${x.title} ${x.collection} ${x.tags.join(' ')} ${museumRooms.find(r=>r.id===x.room)?.title??''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const rooms=museumRooms.filter(r=>records.some(x=>x.room===r.id));
  return <nav onClick={e=>{const anchor=(e.target as HTMLElement).closest('a');if(anchor?.hash===location.hash)window.dispatchEvent(new Event('hashchange'));}} className="museumNavigation" aria-label="歴史と現代から展示を探す">
    <p className="navEyebrow">FIND YOUR MOTION</p><h2>時代をたどる。今の動きに触れる。</h2><p>{museumRooms.length}展示室・{museumTotal}展示。主題から選ぶ2つの入口です。</p>
    <div className="motionEntrances">{([['historical','歴史','Historical Motion','コンピューター、OS、Web、Flashの画面表現。'],['modern','現代','Modern Motion','現在のWeb技術で触れる動き、UI、表現実験。']] as const).map(([id,label,en,note])=>{const count=categorySummary(id);return <button key={id} aria-pressed={category===id} aria-controls="motion-directory" onClick={()=>{setCategory(id);setQuery('');}}><span>{en}</span><strong>{label}</strong><span>{note}</span><small>{count.rooms}展示室への参照 / {count.objects}展示</small></button>;})}</div>
    <div className="navTools"><button aria-pressed={category===null} onClick={()=>{setCategory(null);setQuery('');}}>全館を見る</button><label>全館の作品・展示室・タグで検索<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <p className="navNote">歴史と現代を横断する作品は両方の入口に登場します。作品本体と全館件数は重複させません。ローディング常設ギャラリーは展示室13室とは別の入口です。</p>
    <div id="motion-directory"><p role="status">{category==='historical'?'歴史':category==='modern'?'現代':'全館'}：{rooms.length}展示室 / {records.length}展示</p><ul className="roomDirectory">{rooms.map(room=>{const items=records.filter(x=>x.room===room.id);const collections=[...new Set(items.map(x=>x.collection).filter(Boolean))];return <li key={room.id}><span className="directoryKind">展示室</span><a href={`#browse-${room.id}`}>{room.title}</a><span>{items.length} / {museumCatalog.filter(x=>x.room===room.id).length}展示</span>{collections.length>0&&<ul className="collectionDirectory">{collections.map(c=><li key={c}><span>コレクション</span> {c} <small>{items.filter(x=>x.collection===c).length}展示</small>{c==='Motion Composition Studio'&&<a href="#motion-composition-studio">作品を選ぶ</a>}{c==='Small Motion Collection II'&&<a href="#small-motion-collection-ii">作品を選ぶ</a>}{c==='Small Motion Collection'&&<a href="#small-motion-collection">作品を選ぶ</a>}</li>)}</ul>}</li>;})}</ul>
      {records.some(x=>x.room==='loading-gallery')&&<p><a href="#loading-gallery">ローディング常設ギャラリー</a> · {records.filter(x=>x.room==='loading-gallery').length} / 9展示</p>}
      {(query||category)&&<details className="catalogResults" open={Boolean(query)}><summary>作品索引（{records.length}展示）</summary><ul>{records.map(item=><li key={item.key}><a href={item.href}>{item.title}</a><small>{item.categories.length>1?'歴史・現代を横断':item.categories[0]==='historical'?'歴史':'現代'} / {item.collection||museumRooms.find(r=>r.id===item.room)?.title}</small></li>)}</ul></details>}
      {records.length===0&&<p>該当する展示はありません。検索語を短くするか、全館を見るを選んでください。</p>}
    </div>
  </nav>;
}
