"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  flashCategories,
  flashExhibitCount,
  flashExhibits,
  type FlashExhibit,
} from "../data/flashExhibits";
import { FlashVisual } from "./FlashVisuals";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const EXHIBIT_COUNTS = new Map(
  flashCategories.map((category) => [
    category.id,
    flashExhibits.filter((exhibit) => exhibit.categoryId === category.id).length,
  ]),
);
const CONTINUOUS_INTERACTIVE_VISUALS = new Set(["spring", "weather", "follow", "fps", "intro"]);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px 0px", threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function FlashExhibitCard({
  exhibit,
  categoryActive,
  globalPlaying,
  reduced,
}: {
  exhibit: FlashExhibit;
  categoryActive: boolean;
  globalPlaying: boolean;
  reduced: boolean;
}) {
  const { ref, visible } = useInView<HTMLElement>();
  const [localPlaying, setLocalPlaying] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const hasAutomaticMotion = exhibit.interactionType === "automatic"
    || exhibit.interactionType === "audio"
    || CONTINUOUS_INTERACTIVE_VISUALS.has(exhibit.visualType);
  const active = categoryActive && visible && globalPlaying && localPlaying && !reduced;
  return (
    <article ref={ref} className="flashExhibitCard" data-visible={visible} data-active={active}>
      <div className="flashCardTopline">
        <span>{exhibit.flashTechnique}</span>
        <span>{exhibit.interactionType.toUpperCase()}</span>
      </div>
      <h4>{exhibit.title}</h4>
      <p>{exhibit.description}</p>
      <FlashVisual key={resetKey} exhibit={exhibit} active={active} reduced={reduced} />
      <p className="flashInstruction"><strong>操作</strong> {exhibit.instruction}</p>
      <div className="flashTechTags" aria-label="使用技術">
        {exhibit.modernTechnique.map((technology) => <span key={technology}>{technology}</span>)}
      </div>
      <dl className="flashFacts">
        <div><dt>Flash</dt><dd>{exhibit.flashTechnique}</dd></div>
        <div><dt>現代</dt><dd>{exhibit.modernTechnique.join(" / ")}</dd></div>
      </dl>
      <p className="flashRecreationNote">SWFを使わず、JavaScript・CSS・SVG・Canvasなど現代のWeb技術で再現しています。</p>
      <details className="flashAccessibility">
        <summary>再現上の違い・アクセシビリティ</summary>
        <p>Flash Player内のタイムラインではなく、ブラウザ標準の描画と入力イベントを使います。{exhibit.accessibilityNote} {exhibit.reducedMotionFallback}</p>
      </details>
      <div className="flashCardControls">
        {hasAutomaticMotion ? <button type="button" onClick={() => setLocalPlaying((value) => !value)} aria-pressed={!localPlaying}>{localPlaying ? "一時停止" : "再生"}</button> : null}
        <button type="button" onClick={() => setResetKey((value) => value + 1)}>リセット</button>
      </div>
    </article>
  );
}

export function FlashSpecialExhibitRoom() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(flashCategories[0].id);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState("normal");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const categoryExhibits = useMemo(
    () => flashExhibits.filter((exhibit) => exhibit.categoryId === activeCategory),
    [activeCategory],
  );
  const category = flashCategories.find((item) => item.id === activeCategory) ?? flashCategories[0];
  const runtimeActive = open && pageVisible && playing && !reduced;

  return (
    <article id="flash-special-exhibit" className="flashRoom" data-open={open} data-playing={runtimeActive} data-speed={speed}>
      <button
        ref={toggleRef}
        className="flashRoomEntrance"
        type="button"
        aria-expanded={open}
        aria-controls="flash-special-exhibit-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flashEntranceBadge">SPECIAL EXHIBITION / FLASH</span>
        <span className="flashEntranceTitle">Flash特別展示室</span>
        <span className="flashEntrancePurpose">Flashは何を、どのように動かしたのか。</span>
        <span className="flashEntranceMeta">18 CATEGORIES / {flashExhibitCount} EXHIBITS <b>{open ? "CLOSE −" : "ENTER +"}</b></span>
      </button>
      <div id="flash-special-exhibit-panel" className="flashRoomPanel" role="region" aria-label="Flash特別展示室" aria-hidden={!open} inert={!open}>
        <div className="flashRoomIntro">
          <div>
            <p className="eyebrow">Motion archive / interactive stage</p>
            <h3>触れて比較する、Flash表現の標本室。</h3>
            <p>常設展が「Flashとは何だったのか」を扱うのに対し、この特別展示室はアニメーション、インタラクション、画面演出そのものに集中します。実在作品を複製せず、技法を現代Webで抽象化しています。</p>
          </div>
          <div className="flashMasterControls" aria-label="展示室全体の再生設定">
            <button type="button" onClick={() => setPlaying((value) => !value)} aria-pressed={!playing}>{playing ? "すべて一時停止" : "すべて再生"}</button>
            <label>速度
              <select value={speed} onChange={(event) => setSpeed(event.target.value)} aria-label="アニメーション速度">
                <option value="slow">0.6×</option><option value="normal">1×</option><option value="fast">1.6×</option>
              </select>
            </label>
            <span>{reduced ? "動きを減らす設定：自動再生停止" : pageVisible ? "画面内の展示だけ再生" : "タブ非表示：一時停止"}</span>
          </div>
        </div>

        <nav className="flashCategoryNav" aria-label="Flash展示カテゴリ">
          {flashCategories.map((item) => (
            <button key={item.id} type="button" aria-pressed={item.id === activeCategory} onClick={() => setActiveCategory(item.id)}>
              <span>{item.number}</span>{item.title}<small>{EXHIBIT_COUNTS.get(item.id)}</small>
            </button>
          ))}
        </nav>

        <section className="flashCategorySection" aria-labelledby={`flash-category-${category.id}`}>
          <header>
            <span>CATEGORY {category.number}</span>
            <h3 id={`flash-category-${category.id}`}>{category.title}</h3>
            <p>{category.summary}</p>
          </header>
          <div className="flashExhibitGrid">
            {categoryExhibits.map((exhibit) => (
              <FlashExhibitCard key={exhibit.id} exhibit={exhibit} categoryActive={open && pageVisible} globalPlaying={playing} reduced={reduced} />
            ))}
          </div>
        </section>

        <div className="flashRoomCloseRow">
          <button type="button" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>Flash特別展示室を閉じる</button>
        </div>
      </div>
    </article>
  );
}
