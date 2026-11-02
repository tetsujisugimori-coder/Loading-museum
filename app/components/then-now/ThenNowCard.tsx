"use client";

import { useState, type ComponentType } from "react";
import type { FlashExhibit } from "../../data/flashExhibits";
import { thenNowNotes, type ThenNowId } from "../../data/thenNowStudies";
import { VectorMorph, CursorCreature, KineticTypography } from "./FirstStudies";
import type { StudyProps } from "./runtime";
import "./then-now.css";

const studies: Partial<Record<ThenNowId, ComponentType<StudyProps>>> = {
  "tn-vector-morph": VectorMorph, "tn-cursor-creature": CursorCreature, "tn-kinetic-type": KineticTypography,
};
export function ThenNowCard({ exhibit, active, reduced, speed }: { exhibit: FlashExhibit; active: boolean; reduced: boolean; speed: number }) {
  const [playing, setPlaying] = useState(false), [generation, setGeneration] = useState(0);
  const id = exhibit.id as ThenNowId, note = thenNowNotes[id], Study = studies[id];
  if (!Study) return null;
  return <article className="tnCard" data-study={id} data-playing={active && playing} data-reduced={reduced}>
    <header><span className="tnKicker">FLASH THEN & NOW / PHASE 01</span><h4>{exhibit.title}</h4><p>{exhibit.description}</p></header>
    <div className="tnControls tnCommon" aria-label={`${exhibit.title} 共通操作`}><button aria-pressed={playing} onClick={() => setPlaying(v => !v)}>{playing ? "両方を停止" : "両方を開始"}</button><button onClick={() => { setPlaying(false); setGeneration(v => v + 1); }}>Reset</button><span>{reduced ? "動き低減：自動進行なし・スライダー/手動操作で観察" : "速度は展示室の共通設定。停止して中間状態を観察できます。"}</span></div>
    <div className="tnPair" key={generation}>{[false, true].map(now => <section key={String(now)} className="tnPanel" data-era={now ? "now" : "then"} aria-label={now ? "Now" : "Then"}>
      <h5><b>{now ? "NOW" : "THEN"}</b><span>{now ? note.now : note.then}</span></h5>
      <Study now={now} active={active && playing} reduced={reduced} speed={speed} />
    </section>)}</div>
    <div className="tnNotes"><p><strong>制作意図・既存作品との違い</strong> {note.difference}</p><p>過去と現在を優劣で比べる作品ではありません。両方とも現代ブラウザによる独自制作で、Flash Player / SWFは使いません。</p><details><summary>技術・参考資料・再構成の限界</summary><p>{exhibit.modernTechnique.join(" / ")}</p><p><a href={note.url} target="_blank" rel="noreferrer">{note.source}</a>。歴史的な初出・発明者・特定原作品はUNKNOWN。一般的な技法から着想し、実在作品の素材は使用していません。</p><p>{note.limit}</p></details></div>
  </article>;
}
