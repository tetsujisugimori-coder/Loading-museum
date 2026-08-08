"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  domAnimationExhibits,
  type DomAnimationExhibit,
} from "../data/domAnimationExhibits";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function ExhibitCard({
  exhibit,
  children,
}: {
  exhibit: DomAnimationExhibit;
  children: ReactNode;
}) {
  return (
    <article className="domExhibit" id={exhibit.id} aria-labelledby={`${exhibit.id}-title`}>
      <header className="domExhibitHeader">
        <span>{exhibit.category.toUpperCase()}</span>
        <span>JavaScriptで再現</span>
      </header>
      <h4 id={`${exhibit.id}-title`}>{exhibit.title}</h4>
      <p>{exhibit.description}</p>
      {children}
      <dl className="domApiList">
        <div><dt>使用 API</dt><dd>{exhibit.apiNames.join(" / ")}</dd></div>
      </dl>
      <pre className="domCode"><code>{exhibit.code}</code></pre>
    </article>
  );
}

function Stage({ children }: { children: ReactNode }) {
  return <div className="domStage">{children}</div>;
}

function Controls({ children }: { children: ReactNode }) {
  return <div className="domControls">{children}</div>;
}

function Status({ children }: { children: ReactNode }) {
  return <output className="domStatus" aria-live="polite">{children}</output>;
}

function TransformMove({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("translateX(0px)");
  const setTransform = (next: string) => {
    if (targetRef.current) targetRef.current.style.transform = next;
    setValue(next);
  };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domMoveTarget">MOVE</div></Stage><Controls><button type="button" onClick={() => setTransform("translateX(160px)")}>再生</button><button type="button" onClick={() => setTransform("translateX(-160px)")}>逆方向</button><button type="button" onClick={() => setTransform("translateX(0px)")}>リセット</button></Controls><Status>transform: {value}</Status></ExhibitCard>;
}

function Rotate({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("rotate(0deg)");
  const rotate = (degree: number) => { const next = `rotate(${degree}deg)`; if (targetRef.current) targetRef.current.style.transform = next; setValue(next); };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domShapeTarget">↻</div></Stage><Controls>{[45, 180, 360].map((degree) => <button type="button" key={degree} onClick={() => rotate(degree)}>{degree}度</button>)}<button type="button" onClick={() => rotate(0)}>リセット</button></Controls><Status>transform: {value}</Status></ExhibitCard>;
}

function Scale({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("scale(1)");
  const scale = (amount: number) => { const next = `scale(${amount})`; if (targetRef.current) targetRef.current.style.transform = next; setValue(next); };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domScaleTarget">SCALE</div></Stage><Controls><button type="button" onClick={() => scale(1.5)}>拡大</button><button type="button" onClick={() => scale(0.65)}>縮小</button><button type="button" onClick={() => scale(1)}>リセット</button></Controls><Status>transform: {value}</Status></ExhibitCard>;
}

function OpacityFade({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("1");
  const opacity = (next: string) => { if (targetRef.current) targetRef.current.style.opacity = next; setValue(next); };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domFadeTarget">VISIBLE</div></Stage><Controls><button type="button" onClick={() => opacity("0")}>フェードアウト</button><button type="button" onClick={() => opacity("1")}>フェードイン</button><button type="button" onClick={() => opacity("1")}>リセット</button></Controls><Status>opacity: {value}{value === "0" ? "（対象は透明ですが、状態はここで確認できます）" : ""}</Status></ExhibitCard>;
}

function ClassListToggle({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const update = (mode: "add" | "remove" | "toggle") => {
    const target = targetRef.current;
    if (!target) return;
    const next = mode === "add" ? (target.classList.add("is-active"), true) : mode === "remove" ? (target.classList.remove("is-active"), false) : target.classList.toggle("is-active");
    setActive(next);
  };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domClassTarget"><strong>{active ? "ACTIVE" : "IDLE"}</strong><span>{active ? "class applied" : "class none"}</span></div></Stage><Controls><button type="button" onClick={() => update("add")}>クラス追加</button><button type="button" onClick={() => update("remove")}>クラス削除</button><button type="button" onClick={() => update("toggle")}>トグル</button><button type="button" onClick={() => update("remove")}>リセット</button></Controls><Status>class: {active ? "is-active" : "none"}</Status></ExhibitCard>;
}

function CustomProperty({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("--rotation: 0deg / --scale: 1 / --accent-color: cyan");
  const setProperty = (name: string, value: string, nextStatus: string) => { targetRef.current?.style.setProperty(name, value); setStatus(nextStatus); };
  const reset = () => { const target = targetRef.current; target?.style.setProperty("--rotation", "0deg"); target?.style.setProperty("--scale", "1"); target?.style.setProperty("--accent-color", "#77e6f5"); setStatus("--rotation: 0deg / --scale: 1 / --accent-color: cyan"); };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domVariableTarget">VAR</div></Stage><Controls><button type="button" onClick={() => setProperty("--accent-color", "#f6bf55", "--accent-color: amber")}>色変更</button><button type="button" onClick={() => setProperty("--scale", "1.35", "--scale: 1.35")}>サイズ変更</button><button type="button" onClick={() => setProperty("--rotation", "45deg", "--rotation: 45deg")}>回転量変更</button><button type="button" onClick={reset}>リセット</button></Controls><Status>{status}</Status></ExhibitCard>;
}

function CreateRemove({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const add = () => { const item = document.createElement("div"); item.className = "domCreatedItem"; item.textContent = `NODE ${containerRef.current ? containerRef.current.children.length + 1 : 1}`; containerRef.current?.append(item); setCount(containerRef.current?.children.length ?? 0); };
  const remove = () => { const container = containerRef.current; container?.lastElementChild?.remove(); setCount(container?.children.length ?? 0); };
  const clear = () => { if (containerRef.current) containerRef.current.replaceChildren(); setCount(0); };
  return <ExhibitCard exhibit={exhibit}><Stage><div className="domExternalLabel">React管理外の専用コンテナ</div><div ref={containerRef} className="domExternalContainer" aria-label="DOM APIで追加される要素の領域" /></Stage><Controls><button type="button" onClick={add}>要素追加</button><button type="button" onClick={remove} disabled={count === 0}>最後の要素を削除</button><button type="button" onClick={clear} disabled={count === 0}>全削除</button><button type="button" onClick={clear}>リセット</button></Controls><Status>child count: {count}</Status></ExhibitCard>;
}

type RectState = { x: number; y: number; width: number; height: number; top: number; left: number } | null;
function BoundingRect({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [rect, setRect] = useState<RectState>(null);
  const measure = useCallback(() => { const value = targetRef.current?.getBoundingClientRect(); if (value) setRect({ x: Math.round(value.x), y: Math.round(value.y), width: Math.round(value.width), height: Math.round(value.height), top: Math.round(value.top), left: Math.round(value.left) }); }, []);
  useEffect(() => { measure(); }, [measure]);
  const move = () => { if (targetRef.current) targetRef.current.style.transform = moved ? "translateX(0)" : "translateX(120px)"; setMoved((current) => !current); window.requestAnimationFrame(measure); };
  const reset = () => { if (targetRef.current) targetRef.current.style.transform = "translateX(0)"; setMoved(false); window.requestAnimationFrame(measure); };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domRectTarget">RECT</div></Stage><Controls><button type="button" onClick={move}>要素を移動</button><button type="button" onClick={measure}>位置を再取得</button><button type="button" onClick={reset}>リセット</button></Controls><Status>{rect ? `x: ${rect.x} / y: ${rect.y} / width: ${rect.width} / height: ${rect.height} / top: ${rect.top} / left: ${rect.left}` : "位置を取得できます"}</Status><p className="domFinePrint">値はページ全体ではなく現在のビューポート基準で、スクロールで変化します。x/leftとy/topは多くの環境で近い意味の互換的な別名です。</p></ExhibitCard>;
}

function ManualAnimation({ exhibit, active, reduced }: { exhibit: DomAnimationExhibit; active: boolean; reduced: boolean }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const runningRef = useRef(false);
  const activeRef = useRef(active);
  const [position, setPosition] = useState(0);
  const [running, setRunning] = useState(false);
  const stop = useCallback(() => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current); frameRef.current = null; runningRef.current = false; setRunning(false); }, []);
  const draw = (next: number) => { positionRef.current = next; if (targetRef.current) targetRef.current.style.transform = `translateX(${next}px)`; setPosition(next); };
  const play = () => {
    if (runningRef.current) return;
    if (reduced) { draw(180); return; }
    runningRef.current = true; setRunning(true);
    const tick = () => { if (!activeRef.current) { stop(); return; } const next = Math.min(180, positionRef.current + 3); draw(next); if (next >= 180) { stop(); return; } frameRef.current = window.requestAnimationFrame(tick); };
    frameRef.current = window.requestAnimationFrame(tick);
  };
  const reset = () => { stop(); draw(0); };
  useEffect(() => () => stop(), [stop]);
  useEffect(() => { activeRef.current = active; }, [active]);
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domRunnerTarget">RUN</div></Stage><Controls><button type="button" onClick={play} disabled={running || position >= 180}>{reduced ? "最終位置へ" : "再生"}</button><button type="button" onClick={stop} disabled={!running}>一時停止</button><button type="button" onClick={reset}>リセット</button></Controls><Status>animation: {running ? "playing" : position >= 180 ? "finished" : "paused"} / position: {position}px</Status><p className="domFinePrint">requestAnimationFrameの詳細は、次の専用展示室で扱います。</p></ExhibitCard>;
}

function Demo({ exhibit, active, reduced }: { exhibit: DomAnimationExhibit; active: boolean; reduced: boolean }) {
  switch (exhibit.id) {
    case "dom-transform-move": return <TransformMove exhibit={exhibit} />;
    case "dom-rotate": return <Rotate exhibit={exhibit} />;
    case "dom-scale": return <Scale exhibit={exhibit} />;
    case "dom-opacity": return <OpacityFade exhibit={exhibit} />;
    case "dom-class-list": return <ClassListToggle exhibit={exhibit} />;
    case "dom-custom-property": return <CustomProperty exhibit={exhibit} />;
    case "dom-create-remove": return <CreateRemove exhibit={exhibit} />;
    case "dom-bounding-rect": return <BoundingRect exhibit={exhibit} />;
    default: return <ManualAnimation exhibit={exhibit} active={active} reduced={reduced} />;
  }
}

export default function DomAnimationRoom() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const close = () => { setOpen(false); window.requestAnimationFrame(() => toggleRef.current?.focus()); };

  return <section className="roomCard roomCardDom" aria-labelledby="dom-animation-room-title">
    <button ref={toggleRef} id="dom-animation-room-toggle" type="button" className="roomToggle" aria-expanded={open} aria-controls="dom-animation-room-panel" onClick={() => setOpen((current) => !current)}>
      <span className="roomIndex">ROOM / WEB PLATFORM</span><span className="roomTitle" id="dom-animation-room-title">DOM ANIMATION ROOM</span><span className="roomDescription">DOMアニメーション展示室 / JavaScript + Browser DOM APIs</span><span className="roomMeta"><span>9 EXHIBITS</span><span>INTERACTIVE API STUDIES</span></span><span className="roomArrow" aria-hidden="true">↓</span>
    </button>
    <div id="dom-animation-room-panel" className="roomPanel" data-open={open} role="region" aria-labelledby="dom-animation-room-toggle" aria-hidden={!open} inert={!open}>
      <div className="roomPanelInner"><div className="domRoomBody">
        <header className="domRoomIntro"><p>WEB PLATFORM / DIRECT MANIPULATION</p><h3>JavaScriptが命令し、ブラウザが要素を動かす</h3><p>DOMは、ブラウザがHTML文書をJavaScriptから操作できる形で表現した仕組みです。JavaScriptからDOM APIを呼び出すことで、要素の位置、透明度、形、状態、内容、構造などを変更できます。</p><p>この展示室では、JavaScriptが命令を出し、ブラウザのDOM APIが画面上の要素を操作する関係を、実際の動きで確認します。通常のReactアプリでは表示内容をstateとJSXで管理します。この展示では、直接操作を各展示専用のrefへ限定しています。</p><p className="domRoleNote">JavaScriptが値・状態を変更し、CSSはその変化を見やすく補助します。CSS側の遷移制御は、次の「CSS Transition展示室」の主題です。</p></header>
        <div className="domExhibitGrid">{domAnimationExhibits.map((exhibit) => <Demo key={exhibit.id} exhibit={exhibit} active={open} reduced={reduced} />)}</div>
        <button type="button" className="roomClose domRoomClose" onClick={close}>展示室を閉じる</button>
      </div></div>
    </div>
  </section>;
}
