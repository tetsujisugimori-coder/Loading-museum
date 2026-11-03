"use client";
import { useState, type ComponentType } from 'react';
import type { FlashExhibit } from '../../data/flashExhibits';
import { phaseTwoNotes, type PhaseTwoId } from '../../data/thenNowPhaseTwo';
import { MaskTheatre, ElasticNavigation, ParallaxStage } from './PhaseTwoFirst';
import { FrameByFrameLab, IsometricExplorer, PreloaderTheatre } from './PhaseTwoSecond';
import type { StudyProps } from './runtime';
const studies: Record<PhaseTwoId, ComponentType<StudyProps>> = {
  'tn-mask-theatre': MaskTheatre, 'tn-elastic-navigation': ElasticNavigation, 'tn-parallax-stage': ParallaxStage,
  'tn-frame-lab': FrameByFrameLab, 'tn-isometric-explorer': IsometricExplorer, 'tn-preloader-theatre': PreloaderTheatre,
};
export function PhaseTwoCard({ exhibit, active, reduced, speed }: { exhibit: FlashExhibit; active: boolean; reduced: boolean; speed: number }) {
  const [playing, setPlaying] = useState(false), [generation, setGeneration] = useState(0), [view, setView] = useState('compare');
  const id = exhibit.id as PhaseTwoId, note = phaseTwoNotes[id], Study = studies[id];
  return <article className="tnCard tnPhaseTwo" data-study={id} data-playing={active && playing && !reduced} data-reduced={reduced}>
    <header><span className="tnKicker">FLASH THEN & NOW / PHASE 02</span><h4>{exhibit.title}</h4><p>{exhibit.description}</p></header>
    <div className="tnControls tnCommon" aria-label={`${exhibit.title} 共通操作`}>
      <button aria-pressed={playing} onClick={() => setPlaying(v => !v)}>{playing ? '両方を停止' : '両方を開始'}</button>
      <button onClick={() => { setPlaying(false); setGeneration(v => v + 1); }}>Reset</button>
      <span>{reduced ? '動き低減：自動進行を止め、明示操作で観察します。' : '共通開始・停止と各作品の操作を組み合わせます。非表示の面は進行しません。'}</span>
    </div>
    <div className="tnControls" aria-label="鑑賞する面">{[['compare','比較'],['then','Thenだけ'],['now','Nowだけ']].map(([value,label]) => <button key={value} aria-pressed={view===value} onClick={() => setView(value)}>{label}</button>)}</div>
    <div className="tnPair" data-view={view} key={generation}>{[false,true].map(now => <section key={String(now)} hidden={view !== 'compare' && view !== (now ? 'now' : 'then')} className="tnPanel" data-era={now?'now':'then'} aria-label={now?'Now':'Then'}>
      <h5><b>{now?'NOW':'THEN'}</b><span>{now?note.now:note.then}</span></h5>
      <Study now={now} active={active && playing && (view==='compare'||view===(now?'now':'then'))} reduced={reduced} speed={speed} />
    </section>)}</div>
    <div className="tnNotes"><p><strong>制作意図・既存作品との違い</strong>{note.difference}</p><p>Then / Nowは優劣ではなく、異なる表現上の選択。どちらも現代ブラウザによる独自制作です。入力は各面で独立しているため、同じ数値・操作順序をそろえて比較できます。</p><details><summary>技術・参考資料・再構成の限界</summary><p>{exhibit.modernTechnique.join(' / ')}</p><p><a href={note.url} target="_blank" rel="noreferrer">MDN：再構成に使った標準技術</a>。Flash時代の一般的な表現に着想。特定原作品・初出の史料検証は行っておらず、素材やSWFを転載していません。</p><p>{note.limit}</p></details></div>
  </article>;
}
