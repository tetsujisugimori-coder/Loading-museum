"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { waapiSampleCount, waapiSamples, type WaapiSample } from "../data/waapiSamples";

const filterKeys = ["category", "usage", "technology", "sourceType", "era", "intensity", "difficulty"] as const;
type FilterKey = (typeof filterKeys)[number];
type Filters = Record<FilterKey, string>;
const blankFilters: Filters = { category: "", usage: "", technology: "", sourceType: "", era: "", intensity: "", difficulty: "" };
const labels: Record<FilterKey, string> = { category: "カテゴリ", usage: "用途", technology: "技術", sourceType: "元ネタ種別", era: "年代", intensity: "動きの強さ", difficulty: "難易度" };

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => { const query = matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  return reduced;
}

function Preview({ sample, active }: { sample: WaapiSample; active: boolean }) {
  const target = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const reduced = useReducedMotion();
  const play = useCallback(() => {
    const node = target.current; if (!node) return;
    animation.current?.cancel();
    const keyframes: Keyframe[] = sample.preview === "progress" ? [{ transform: "scaleX(.08)", opacity: .55 }, { transform: "scaleX(1)", opacity: 1 }]
      : sample.preview === "spin" ? [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }]
      : sample.preview === "text" ? [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }]
      : sample.preview === "game" ? [{ transform: "scale(.55) rotate(-5deg)", opacity: .2 }, { transform: "scale(1.08) rotate(2deg)", opacity: 1 }, { transform: "scale(1) rotate(0deg)" }]
      : sample.preview === "pulse" ? [{ transform: "scale(.72)", opacity: .45 }, { transform: "scale(1.1)", opacity: 1 }, { transform: "scale(1)", opacity: .8 }]
      : sample.preview === "scale" ? [{ transform: "scale(.62)", opacity: .2 }, { transform: "scale(1)", opacity: 1 }]
      : sample.preview === "fade" ? [{ opacity: .1, transform: "translateX(10px)" }, { opacity: 1, transform: "translateX(0)" }]
      : sample.preview === "system" ? [{ transform: "translateX(-25%)", opacity: .25 }, { transform: "translateX(25%)", opacity: 1 }, { transform: "translateX(0)", opacity: .8 }]
      : [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }];
    animation.current = node.animate(keyframes, { duration: reduced ? 1 : sample.duration, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both", iterations: sample.loop && active && !reduced ? Infinity : 1, direction: sample.loop ? "alternate" : "normal" });
  }, [active, reduced, sample]);
  useEffect(() => { if (active) play(); return () => animation.current?.cancel(); }, [active, play]);
  return <div className={`waapiPreview waapiPreview--${sample.preview}`}><div ref={target} className="waapiPreviewObject" aria-hidden="true"><span>{sample.preview === "text" ? "MOTION" : sample.preview === "game" ? "+100" : ""}</span></div><button type="button" onClick={play} aria-label={`${sample.name}を再生`}>Replay</button></div>;
}

function SampleCard({ sample, active }: { sample: WaapiSample; active: boolean }) {
  return <article className="waapiSampleCard"><div className="waapiCardHeading"><p>{sample.category} / {sample.era}</p><h4>{sample.name}</h4></div><Preview sample={sample} active={active} /><p className="waapiDescription">{sample.inspiredBy ? `Inspired by: ${sample.inspiredBy}` : `${sample.usage.join(" / ")}で使える${sample.category}の動き。`}</p><dl className="waapiMeta"><div><dt>用途</dt><dd>{sample.usage.join(", ")}</dd></div><div><dt>技術</dt><dd>{sample.technology.join(", ")}</dd></div><div><dt>CSS</dt><dd>{sample.properties.join(", ")}</dd></div><div><dt>強さ / 難易度</dt><dd>{sample.intensity} / {sample.difficulty}</dd></div></dl><p className="waapiReduced">Reduced motion: {sample.reducedMotion ? "対応" : "未対応"}</p></article>;
}

function ControlConsole() {
  const target = useRef<HTMLDivElement>(null); const animation = useRef<Animation | null>(null); const [status, setStatus] = useState("ready");
  const make = () => { const el = target.current; if (!el) return; animation.current?.cancel(); animation.current = el.animate([{ transform: "translateX(-105%)" }, { transform: "translateX(105%)" }], { duration: 1300, easing: "ease-in-out", iterations: Infinity, direction: "alternate" }); setStatus("playing"); };
  useEffect(() => { make(); return () => animation.current?.cancel(); }, []);
  const action = (kind: string) => { if (!animation.current) make(); const a = animation.current!; if (kind === "Play") a.play(); if (kind === "Pause") a.pause(); if (kind === "Reverse") a.reverse(); if (kind === "Cancel") a.cancel(); if (kind === "Finish") a.finish(); if (kind === "Seek") a.currentTime = 650; if (["0.5x", "1x", "2x"].includes(kind)) a.playbackRate = Number(kind.replace("x", "")); setStatus(kind.toLowerCase()); };
  return <section className="waapiConsole" aria-label="Animation Control Console"><div><p>ADVANCED / WAAPI CONTROL</p><h3>Animation Control Console</h3><p>1つのWeb Animations APIインスタンスを直接操作します。</p></div><div className="waapiConsoleStage"><div ref={target} /></div><p className="waapiConsoleStatus" aria-live="polite">state: {status}</p><div className="waapiConsoleButtons">{["Play", "Pause", "Reverse", "Cancel", "Finish", "0.5x", "1x", "2x", "Seek"].map((label) => <button key={label} type="button" onClick={() => action(label)}>{label}</button>)}</div></section>;
}

export function WaapiSampleGallery() {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [filters, setFilters] = useState<Filters>(blankFilters); const [visible, setVisible] = useState<Set<string>>(new Set()); const grid = useRef<HTMLDivElement>(null);
  const options = useMemo(() => Object.fromEntries(filterKeys.map((key) => [key, Array.from(new Set(waapiSamples.flatMap((sample) => Array.isArray(sample[key]) ? sample[key] : [sample[key]]))).sort()])), []);
  const samples = useMemo(() => waapiSamples.filter((sample) => { const haystack = [sample.name, sample.category, sample.usage.join(" "), sample.technology.join(" "), sample.era, sample.sourceType, sample.inspiredBy, sample.intensity, sample.difficulty, sample.tags.join(" ")].filter(Boolean).join(" ").toLowerCase(); return (!query || haystack.includes(query.toLowerCase())) && filterKeys.every((key) => !filters[key] || (Array.isArray(sample[key]) ? sample[key].includes(filters[key]) : sample[key] === filters[key])); }), [query, filters]);
  useEffect(() => { if (!open || !grid.current) return; const observer = new IntersectionObserver((entries) => setVisible((current) => { const next = new Set(current); entries.forEach((entry) => entry.isIntersecting ? next.add((entry.target as HTMLElement).dataset.sampleId!) : next.delete((entry.target as HTMLElement).dataset.sampleId!)); return next; }), { rootMargin: "160px" }); grid.current.querySelectorAll<HTMLElement>("[data-sample-id]").forEach((card) => observer.observe(card)); return () => observer.disconnect(); }, [open, samples]);
  return <section className="waapiGallery" aria-labelledby="waapi-gallery-title"><div className="waapiGalleryDivider" /><button type="button" className="waapiGalleryToggle" aria-expanded={open} aria-controls="waapi-gallery-panel" onClick={() => setOpen((value) => !value)}><span>SPECIMEN CABINET / WAAPI</span><strong id="waapi-gallery-title">{open ? "サンプル一覧を閉じる" : "サンプル一覧を見る"}（{waapiSampleCount}）</strong><span aria-hidden="true">{open ? "↑" : "↓"}</span></button>{open && <div id="waapi-gallery-panel" className="waapiGalleryPanel"><div className="waapiGalleryIntro"><p>試作展示を広く並べ、見て・触って・比較する標本庫です。OS・ゲーム・Web文化はロゴや固有画面を複製せず、動きの特徴だけを再構成しています。</p></div><div className="waapiFilters"><label className="waapiSearch">検索<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前・用途・技術・年代を検索" /></label>{filterKeys.map((key) => <label key={key}>{labels[key]}<select value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}><option value="">すべて</option>{(options[key] as string[]).map((option) => <option key={option}>{option}</option>)}</select></label>)}<button type="button" onClick={() => { setQuery(""); setFilters(blankFilters); }}>絞り込みを解除</button></div><p className="waapiResults" aria-live="polite">{samples.length} / {waapiSampleCount} samples</p><ControlConsole /><section className="waapiComparison" aria-label="動きの強さ比較"><h3>控えめ / 標準 / 派手の比較</h3>{["Modal", "Toast", "Card", "Loading", "Entrance"].map((usage, index) => <div key={usage}><span>{usage}</span><i data-level="Subtle" style={{ animationDelay: `${index * 60}ms` }} /><i data-level="Standard" /><i data-level="Strong" /></div>)}</section><div ref={grid} className="waapiSampleGrid">{samples.map((sample) => <div key={sample.id} data-sample-id={sample.id}><SampleCard sample={sample} active={visible.has(sample.id)} /></div>)}</div></div>}</section>;
}
