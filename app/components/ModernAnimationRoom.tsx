"use client";

import { useState } from "react";
import { modernExhibits } from "../data/modernExhibits";
import ModernLens from "./ModernLens";
import ModernClipMenu from "./ModernClipMenu";
import PaperExhibit from "./PaperExhibit";
import GlassExhibit from "./GlassExhibit";
import ModernWeave from "./ModernWeave";
import ModernDrift from "./ModernDrift";
import "./modern.css";

type Id = typeof modernExhibits[number]["id"];
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
  const filtered = modernExhibits.filter(item => `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const item = modernExhibits.find(entry => entry.id === selected);
  return <section className="modernRoom" aria-labelledby="modern-title"><h2 id="modern-title">現代アニメーション常設展</h2><p>原典のアイデアを独自の小さな実験として再構成しました。</p><button onClick={() => setRoomOpen(!roomOpen)} aria-expanded={roomOpen}>{roomOpen ? '展示室を閉じる' : '展示室を開く'}</button>
    {roomOpen && <><label className="modernSearch">作品名・タグで探す <input value={query} onChange={e => setQuery(e.target.value)} /></label><div className="modernList">{filtered.map(entry => <button key={entry.id} onClick={() => setSelected(entry.id)} aria-pressed={selected === entry.id}>{entry.title}</button>)}</div>{filtered.length === 0 && <p>該当する作品はありません。</p>}
      {item && filtered.some(entry => entry.id === item.id) && <article className="modernExhibit"><p>OBJECT {item.id} / 2026</p><h3>{item.title}</h3><Player key={item.id} id={item.id}/><p>{item.note}</p><p>タグ：{item.tags.join(' / ')}</p><p>原典：<a href={item.url} target="_blank" rel="noreferrer">{item.author} / Codrops</a></p></article>}</>}
  </section>;
}
