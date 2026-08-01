"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  flashCategories,
  flashExhibitCount,
  flashExhibits,
  type FlashExhibit,
} from "../data/flashExhibits";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const EXHIBIT_COUNTS = new Map(
  flashCategories.map((category) => [
    category.id,
    flashExhibits.filter((exhibit) => exhibit.categoryId === category.id).length,
  ]),
);

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

function Visual({
  exhibit,
  active,
  reduced,
  audioActive,
  onAudioToggle,
}: {
  exhibit: FlashExhibit;
  active: boolean;
  reduced: boolean;
  audioActive: boolean;
  onAudioToggle: () => void;
}) {
  const [variation, setVariation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerStyle = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
    event.currentTarget.style.setProperty("--rx", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -28}deg`);
    event.currentTarget.style.setProperty("--ry", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 38}deg`);
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = `hsl(${(event.clientX + event.clientY) % 360} 90% 65%)`;
    context.beginPath();
    context.arc((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height), 8, 0, Math.PI * 2);
    context.fill();
  };
  const resetCanvas = () => canvasRef.current?.getContext("2d")?.clearRect(0, 0, 520, 260);
  const isAudio = exhibit.interactionType === "audio";
  const isComparison = exhibit.visualType === "comparison";
  const labels = exhibit.modernTechnique.slice(0, 3);
  const className = `flashVisual flashVisual-${exhibit.visualType}`;
  const click = () => setVariation((value) => value + 1);
  const style = { "--variant": variation } as CSSProperties;

  return (
    <div
      ref={stageRef}
      className={className}
      data-running={active && !reduced}
      data-variant={variation % 4}
      data-dragging={dragging}
      style={style}
      onPointerMove={pointerStyle}
      onClick={exhibit.interactionType === "click" ? click : undefined}
      role="img"
      aria-label={`${exhibit.title}の現代Web技術による再現。${exhibit.instruction}`}
    >
      {exhibit.visualType === "paint" ? (
        <canvas
          ref={canvasRef}
          width="520"
          height="260"
          onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={draw}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          aria-label="ドラッグで描ける抽象画キャンバス"
        />
      ) : isComparison ? (
        <div className="flashComparisonVisual">
          <span>FLASH</span><b>→</b><strong>{labels[variation % labels.length]}</strong>
          <small>{variation % 2 ? "標準API・DOMと連携" : "プラグイン不要・端末を横断"}</small>
        </div>
      ) : exhibit.visualType === "timeline" || exhibit.visualType === "fps" ? (
        <div className="flashTimelineVisual">
          <span className="flashPlayhead" />
          {[0, 1, 2].map((row) => <i key={row}>{Array.from({ length: 12 }, (_, frame) => <b key={frame} data-key={frame % (4 - row) === 0} />)}</i>)}
          <em>{exhibit.visualType === "fps" ? ["12 FPS", "24 FPS", "30 FPS", "60 FPS"][variation % 4] : `FRAME ${String((variation % 12) + 1).padStart(2, "0")}`}</em>
        </div>
      ) : (
        <div className="flashScene" aria-hidden="true">
          {Array.from({ length: exhibit.visualType === "particles" || exhibit.visualType === "starfield" ? 18 : 9 }, (_, index) => <i key={index} style={{ "--i": index } as CSSProperties} />)}
          <b>FLASH</b><strong>PLAY</strong><em>{exhibit.title}</em>
        </div>
      )}

      {isAudio ? (
        <button className="flashStageAction" type="button" onClick={(event) => { event.stopPropagation(); onAudioToggle(); }} aria-pressed={audioActive}>
          {audioActive ? "音を停止" : "音を開始"}
        </button>
      ) : null}
      {exhibit.visualType === "paint" ? <button className="flashStageAction" type="button" onClick={resetCanvas}>描画をリセット</button> : null}
      {exhibit.visualType === "carousel" ? (
        <div className="flashStageControls">
          <button type="button" onClick={(event) => { event.stopPropagation(); setVariation((v) => v - 1); }} aria-label="前のカード">←</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setVariation((v) => v + 1); }} aria-label="次のカード">→</button>
        </div>
      ) : null}
      {exhibit.visualType === "safe-close" ? <button className="flashSafeExit" type="button" onClick={() => setVariation(3)}>即時終了</button> : null}
      {exhibit.visualType === "cube" || exhibit.visualType === "spring" ? (
        <button
          className="flashDragHandle"
          type="button"
          onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => { if (dragging) pointerStyle(event); }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          aria-label={`${exhibit.title}をドラッグ`}
        />
      ) : null}
    </div>
  );
}

function FlashExhibitCard({
  exhibit,
  categoryActive,
  globalPlaying,
  reduced,
  audioActive,
  onAudioToggle,
}: {
  exhibit: FlashExhibit;
  categoryActive: boolean;
  globalPlaying: boolean;
  reduced: boolean;
  audioActive: boolean;
  onAudioToggle: () => void;
}) {
  const { ref, visible } = useInView<HTMLElement>();
  const [localPlaying, setLocalPlaying] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const automatic = exhibit.interactionType === "automatic";
  const active = categoryActive && visible && globalPlaying && localPlaying;
  return (
    <article ref={ref} className="flashExhibitCard" data-visible={visible}>
      <div className="flashCardTopline">
        <span>{exhibit.flashTechnique}</span>
        <span>{exhibit.interactionType.toUpperCase()}</span>
      </div>
      <h4>{exhibit.title}</h4>
      <p>{exhibit.description}</p>
      <Visual key={resetKey} exhibit={exhibit} active={active} reduced={reduced} audioActive={audioActive} onAudioToggle={onAudioToggle} />
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
        {automatic ? <button type="button" onClick={() => setLocalPlaying((value) => !value)} aria-pressed={!localPlaying}>{localPlaying ? "一時停止" : "再生"}</button> : null}
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
  const [audioActive, setAudioActive] = useState(false);
  const audioRef = useRef<{ context: AudioContext; oscillator: OscillatorNode; gain: GainNode } | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const categoryExhibits = useMemo(
    () => flashExhibits.filter((exhibit) => exhibit.categoryId === activeCategory),
    [activeCategory],
  );
  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.02);
    audio.oscillator.stop(audio.context.currentTime + 0.08);
    void audio.context.close();
    audioRef.current = null;
    setAudioActive(false);
  };
  const toggleAudio = () => {
    if (audioRef.current) { stopAudio(); return; }
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 164.81;
    gain.gain.value = 0.035;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    audioRef.current = { context, oscillator, gain };
    setAudioActive(true);
  };
  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) { audio.oscillator.stop(); void audio.context.close(); }
  }, []);
  const category = flashCategories.find((item) => item.id === activeCategory) ?? flashCategories[0];
  return (
    <article id="flash-special-exhibit" className="flashRoom" data-open={open} data-playing={playing && !reduced} data-speed={speed}>
      <button
        ref={toggleRef}
        className="flashRoomEntrance"
        type="button"
        aria-expanded={open}
        aria-controls="flash-special-exhibit-panel"
        onClick={() => {
          if (open) stopAudio();
          setOpen((value) => !value);
        }}
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
            <span>{reduced ? "動きを減らす設定：自動再生停止" : "画面内の展示だけ再生"}</span>
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
              <FlashExhibitCard key={exhibit.id} exhibit={exhibit} categoryActive={open} globalPlaying={playing} reduced={reduced} audioActive={audioActive} onAudioToggle={toggleAudio} />
            ))}
          </div>
        </section>

        <div className="flashRoomCloseRow">
          <button type="button" onClick={() => { stopAudio(); setOpen(false); toggleRef.current?.focus(); }}>Flash特別展示室を閉じる</button>
        </div>
      </div>
    </article>
  );
}
