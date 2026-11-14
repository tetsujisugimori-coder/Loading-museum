"use client";

import { useEffect, useState } from "react";
import { modernExhibits } from "../data/modernExhibits";
import ModernLens from "./ModernLens";
import ModernClipMenu from "./ModernClipMenu";
import PaperExhibit from "./PaperExhibit";
import GlassExhibit from "./GlassExhibit";
import ModernWeave from "./ModernWeave";
import ModernDrift from "./ModernDrift";
import "./modern.css";
import {smallMotionExhibits, type SmallMotionId} from "../data/smallMotionExhibits";
import SmallMotionPlayer from "./small-motion/SmallMotionPlayer";

import {smallMotionIIExhibits, type SmallMotionIIId} from '../data/smallMotionIIExhibits';
import FirstWorks from './small-motion-ii/FirstWorks';
import SecondWorks from './small-motion-ii/SecondWorks';

import {motionCompositionExhibits, type MotionCompositionId} from '../data/motionCompositionExhibits';
import TimedWorks from './motion-composition/TimedWorks';
import SpatialWorks from './motion-composition/SpatialWorks';

import {interactiveMotionExhibits,type InteractiveMotionId} from '../data/interactiveMotionExhibits';
import InteractivePlayer from './interactive-motion/InteractivePlayer';

type Id = typeof modernExhibits[number]["id"] | SmallMotionId | SmallMotionIIId | MotionCompositionId | InteractiveMotionId;
function Player({ id }: { id: Id }) {
  switch (id) {
    case 'unwoven': return <ModernWeave />;
    case 'paper': return <PaperExhibit />;
    case 'lens': return <ModernLens />;
    case 'drift': return <ModernDrift />;
    case 'glass': return <GlassExhibit />;
    case 'clip': return <ModernClipMenu />;
  }
}
export default function ModernAnimationRoom() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Id | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  useEffect(()=>{
    const openHash=()=>{const hash=window.location.hash.slice(1);const found=[...modernExhibits,...smallMotionExhibits,...smallMotionIIExhibits,...motionCompositionExhibits,...interactiveMotionExhibits].find(e=>hash===`modern-exhibit-${e.id}`);if(found){setRoomOpen(true);setQuery('');setSelected(found.id);}else if((hash==='small-motion-collection'||hash==='small-motion-collection-ii'||hash==='motion-composition-studio'||hash==='interactive-motion-lab')){setRoomOpen(true);setQuery('');setSelected(null);}};
    openHash();window.addEventListener('hashchange',openHash);return()=>window.removeEventListener('hashchange',openHash);
  },[]);
  useEffect(()=>{if(!roomOpen)return;const hash=window.location.hash.slice(1);if(!hash.startsWith('modern-exhibit-')&&hash!=='small-motion-collection'&&hash!=='small-motion-collection-ii'&&hash!=='motion-composition-studio'&&hash!=='interactive-motion-lab')return;const frame=requestAnimationFrame(()=>{const target=document.getElementById(hash);if(target){target.tabIndex=-1;target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}});return()=>cancelAnimationFrame(frame);},[roomOpen,selected]);
  const filtered = modernExhibits.filter(item => `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const smallFiltered=smallMotionExhibits.filter(item=>`${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const secondFiltered=smallMotionIIExhibits.filter(item=>`${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const compositionFiltered=motionCompositionExhibits.filter(e=>`${e.title} ${e.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const interactiveFiltered=interactiveMotionExhibits.filter(e=>`${e.title} ${e.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const interactiveItem=interactiveFiltered.find(e=>e.id===selected);
  const compositionItem=compositionFiltered.find(e=>e.id===selected);
  const secondItem=secondFiltered.find(e=>e.id===selected);
  const smallItem=smallFiltered.find(e=>e.id===selected);
  const item = modernExhibits.find(entry => entry.id === selected);
  return <section id="modern-room" className="modernRoom" aria-labelledby="modern-title"><h2 id="modern-title">現代アニメーション常設展</h2><p>原典着想6作品とSmall Motion各6作品。Interactive Motion Labまでの全30展示を5つのコレクションで探せます。</p><button onClick={() => setRoomOpen(!roomOpen)} aria-expanded={roomOpen} aria-controls="modern-room-panel">{roomOpen ? '展示室を閉じる' : '展示室を開く'}</button>
    {roomOpen && <div id="modern-room-panel"><label className="modernSearch">作品名・タグで探す <input value={query} onChange={e => setQuery(e.target.value)} /></label><h3>原典着想コレクション · 6作品</h3><div className="modernList">{filtered.map(entry => <button key={entry.id} onClick={() => setSelected(entry.id)} aria-pressed={selected === entry.id}>{entry.title}</button>)}</div>{filtered.length === 0 && smallFiltered.length===0 && secondFiltered.length===0 && compositionFiltered.length===0 && interactiveFiltered.length===0 && <p>該当する作品はありません。</p>}
      {item && filtered.some(entry => entry.id === item.id) && <article id={`modern-exhibit-${item.id}`} className="modernExhibit"><p>OBJECT {item.id} / 2026</p><h3>{item.title}</h3><Player key={item.id} id={item.id}/><p>{item.note}</p><p>タグ：{item.tags.join(' / ')}</p><p>原典：<a href={item.url} target="_blank" rel="noreferrer">{item.author} / Codrops</a></p></article>}
      <section id="small-motion-collection" className="smCollection" aria-labelledby="small-motion-title"><p className="smCollectionMeta">COLLECTION / 現代アニメーション常設展の中の6作品</p><h3 id="small-motion-title" className="smCollectionTitle">Small Motion Collection</h3><p>小さな動きを、触って、止めて、見比べる。図形とコードは独自制作です。</p><div className="modernList">{smallFiltered.map(entry=><button key={entry.id} onClick={()=>setSelected(entry.id)} aria-pressed={selected===entry.id}>{entry.title}</button>)}</div>
      {smallItem&&<article id={`modern-exhibit-${smallItem.id}`} className="modernExhibit"><p>OBJECT {smallItem.id} / 2026</p><h4>{smallItem.title}</h4><SmallMotionPlayer key={smallItem.id} id={smallItem.id}/><p>{smallItem.note}</p><p>既存展示との差：{smallItem.difference}</p><p>タグ：{smallItem.tags.join(' / ')}</p></article>}</section>
      <section id="small-motion-collection-ii" className="smCollection"><h3>Small Motion Collection II</h3><p>見ると面白い。触ると変わる。仕組みを見ると理解できる。</p><div className="modernList">{secondFiltered.map(e=><button key={e.id} onClick={()=>setSelected(e.id)} aria-pressed={selected===e.id}>{e.title}</button>)}</div>{secondItem&&<article id={`modern-exhibit-${secondItem.id}`} className="modernExhibit"><h4>{secondItem.title}</h4>{secondItem.id==='spring-toggle'||secondItem.id==='success-draw'||secondItem.id==='sliding-indicator'?<FirstWorks key={secondItem.id} id={secondItem.id}/>:<SecondWorks key={secondItem.id} id={secondItem.id}/>}<p>{secondItem.note}</p><p>既存展示との差：{secondItem.difference}</p></article>}</section>
      <section id="motion-composition-studio" className="smCollection"><h3>Motion Composition Studio</h3><p>時間・順序・位置・状態で、動きを組み立てる6作品。</p><div className="modernList">{compositionFiltered.map(e=><button key={e.id} onClick={()=>setSelected(e.id)} aria-pressed={selected===e.id}>{e.title}</button>)}</div>{compositionItem&&<article id={`modern-exhibit-${compositionItem.id}`} className="modernExhibit"><h4>{compositionItem.title}</h4>{compositionItem.id==='stagger-motion'||compositionItem.id==='sequence-builder'||compositionItem.id==='parallel-choreography'?<TimedWorks key={compositionItem.id} id={compositionItem.id}/>:<SpatialWorks key={compositionItem.id} id={compositionItem.id}/>}<p>{compositionItem.note}</p><p>既存展示との差：{compositionItem.difference}</p><p>タグ：{compositionItem.tags.join(' / ')}</p></article>}</section>
      <section id="interactive-motion-lab" className="smCollection"><h3>Interactive Motion Lab</h3><p>操作 → 状態 → 描画 → 完了または取消。入力に反応する6作品。</p><div className="modernList">{interactiveFiltered.map(e=><button key={e.id} onClick={()=>setSelected(e.id)} aria-pressed={selected===e.id}>{e.title}</button>)}</div>{interactiveItem&&<article id={`modern-exhibit-${interactiveItem.id}`} className="modernExhibit"><h4>{interactiveItem.title}</h4><InteractivePlayer key={interactiveItem.id} id={interactiveItem.id}/><p>{interactiveItem.note}</p><p>既存展示との差：{interactiveItem.difference}</p><p>タグ：{interactiveItem.tags.join(' / ')}</p></article>}</section>
    </div>}
  </section>;
}
