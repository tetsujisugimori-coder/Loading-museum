"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import type { FlashExhibit } from "../../data/flashExhibits";
import { thenNowNotes, type ThenNowId } from "../../data/thenNowStudies";
import { VectorMorph, CursorCreature, KineticTypography } from "./FirstStudies";
import { PhysicsPlayground, InteractiveIntro, SoundReactor } from "./SecondStudies";
import type { StudyProps } from "./runtime";
import "./then-now.css";

const studies: Partial<Record<ThenNowId, ComponentType<StudyProps>>> = {
  "tn-vector-morph": VectorMorph, "tn-cursor-creature": CursorCreature, "tn-kinetic-type": KineticTypography,
  "tn-physics": PhysicsPlayground, "tn-intro": InteractiveIntro, "tn-sound": SoundReactor,
};
// A mounted comparison can change height on Reset/reopen. Observer entries can
// describe the earlier layout; re-read current geometry at each notification/input.
// Keep this owner separate from the unchanged legacy Flash runtime.
export function ThenNowMount({ exhibit, categoryActive, globalPlaying, reduced, speed }: { exhibit: FlashExhibit; categoryActive: boolean; globalPlaying: boolean; reduced: boolean; speed: number }) {
  const ref = useRef<HTMLElement>(null), [visible, setVisible] = useState(false);
  const refresh = useCallback(() => {
    const box = ref.current?.getBoundingClientRect();
    setVisible(Boolean(box && box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth));
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!categoryActive || !node) return;
    const observer = new IntersectionObserver(refresh);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refresh);
    observer.observe(node); resize?.observe(node);
    window.addEventListener("scroll", refresh, { passive: true, capture: true });
    window.addEventListener("resize", refresh);
    return () => { observer.disconnect(); resize?.disconnect(); window.removeEventListener("scroll", refresh, true); window.removeEventListener("resize", refresh); };
  }, [categoryActive, refresh]);
  return <article ref={ref} className="tnMount" data-visible={visible} onPointerDownCapture={refresh} onFocusCapture={refresh}>{categoryActive && <ThenNowCard exhibit={exhibit} active={visible && globalPlaying} reduced={reduced} speed={speed} />}</article>;
}
export function ThenNowCard({ exhibit, active, reduced, speed }: { exhibit: FlashExhibit; active: boolean; reduced: boolean; speed: number }) {
  const [playing, setPlaying] = useState(false), [generation, setGeneration] = useState(0);
  const id = exhibit.id as ThenNowId, note = thenNowNotes[id], Study = studies[id];
  const controlNote = id === "tn-sound"
    ? reduced ? "動き低減：音は各面で明示開始。移動・点滅なしで計測図を更新。" : "共通開始後、音は各面で明示開始。共通停止は音も解放。音高・音量は個別操作。"
    : reduced ? "動き低減：自動進行なし・スライダー/手動操作で観察" : id === "tn-intro" ? "定時進行の速度は展示室の共通設定。Nowは入力を待ちます。" : "速度は展示室の共通設定。停止して中間状態を観察できます。";
  if (!Study) return null;
  return <article className="tnCard" data-study={id} data-playing={active && playing} data-reduced={reduced}>
    <header><span className="tnKicker">FLASH THEN & NOW / PHASE 01</span><h4>{exhibit.title}</h4><p>{exhibit.description}</p></header>
    <div className="tnControls tnCommon" aria-label={`${exhibit.title} 共通操作`}><button aria-pressed={playing} onClick={() => setPlaying(v => !v)}>{playing ? "両方を停止" : "両方を開始"}</button><button onClick={() => { setPlaying(false); setGeneration(v => v + 1); }}>Reset</button><span>{controlNote}</span></div>
    <div className="tnPair" key={generation}>{[false, true].map(now => <section key={String(now)} className="tnPanel" data-era={now ? "now" : "then"} aria-label={now ? "Now" : "Then"}>
      <h5><b>{now ? "NOW" : "THEN"}</b><span>{now ? note.now : note.then}</span></h5>
      <Study now={now} active={active && playing} reduced={reduced} speed={speed} />
    </section>)}</div>
    <div className="tnNotes"><p><strong>制作意図・既存作品との違い</strong> {note.difference}</p><p>過去と現在を優劣で比べる作品ではありません。両方とも現代ブラウザによる独自制作で、Flash Player / SWFは使いません。</p><details><summary>技術・参考資料・再構成の限界</summary><p>{exhibit.modernTechnique.join(" / ")}</p><p><a href={note.url} target="_blank" rel="noreferrer">{note.source}</a>。歴史的な初出・発明者・特定原作品はUNKNOWN。一般的な技法から着想し、実在作品の素材は使用していません。</p><p>{note.limit}</p></details></div>
  </article>;
}
