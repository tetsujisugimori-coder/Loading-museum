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
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domFadeTarget">DOM CARD<br /><small>透明度: {Number(value) * 100}%</small></div></Stage><p className="domFinePrint">opacityは透明度です。1は完全に見え、0は完全に透明です。透明でも場所は残り、display: noneのようにレイアウトから外す方法とは異なります。</p><Controls><button type="button" onClick={() => opacity("1")}>ゆっくり表示する</button><button type="button" onClick={() => opacity("0")}>ゆっくり透明にする</button><button type="button" onClick={() => opacity("1")}>リセット</button></Controls><Status>opacity: {value} / 透明度: {Number(value) * 100}%</Status></ExhibitCard>;
}

function ClassListToggle({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [classValue, setClassValue] = useState("domTarget domClassTarget");
  const update = (mode: "add" | "remove" | "toggle") => {
    const target = targetRef.current;
    if (!target) return;
    const next = mode === "add" ? (target.classList.add("is-active"), true) : mode === "remove" ? (target.classList.remove("is-active"), false) : target.classList.toggle("is-active");
    setActive(next);
    setClassValue(target.className);
  };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className="domTarget domClassTarget"><strong>{active ? "点灯中" : "消灯中"}</strong><span>展示室の照明</span></div></Stage><p className="domFinePrint">クラスは、見た目のルールをひとまとめにした名前札です。is-activeが付くと照明のCSSルールがまとまって働きます。</p><Controls><button type="button" onClick={() => update("add")}>点灯する（add）</button><button type="button" onClick={() => update("remove")}>消灯する（remove）</button><button type="button" onClick={() => update("toggle")}>点灯／消灯を切り替える（toggle）</button><button type="button" onClick={() => update("remove")}>リセット</button></Controls><Status>class=&quot;{classValue}&quot;</Status></ExhibitCard>;
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
  const add = () => { const item = document.createElement("div"); item.className = "domCreatedItem"; item.textContent = ["✦", "●", "✧", "◆"][containerRef.current ? containerRef.current.children.length % 4 : 0]; containerRef.current?.append(item); setCount(containerRef.current?.children.length ?? 0); };
  const remove = () => { const container = containerRef.current; container?.lastElementChild?.remove(); setCount(container?.children.length ?? 0); };
  const clear = () => { if (containerRef.current) containerRef.current.replaceChildren(); setCount(0); };
  return <ExhibitCard exhibit={exhibit}><p className="domFinePrint">ボタンを押すたび、JavaScriptが新しいHTML要素を1個作り、展示ケースの中へ追加します。作る → 画面に追加する → DOMから取り除く、の順を観察できます。</p><Stage><div className="domExternalLabel">補足: React管理外の専用コンテナ</div><div ref={containerRef} className="domExternalContainer" aria-label="DOM APIで追加される要素の領域" /></Stage><Controls><button type="button" onClick={add}>星を作って追加する</button><button type="button" onClick={remove} disabled={count === 0}>最後の星を取り除く</button><button type="button" onClick={clear} disabled={count === 0}>全削除</button><button type="button" onClick={clear}>リセット</button></Controls><Status>child count: {count} / 実行API: document.createElement → append / remove</Status></ExhibitCard>;
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

function EventsDemo({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const clickRef = useRef<HTMLButtonElement>(null); const hoverRef = useRef<HTMLDivElement>(null); const enterRef = useRef<HTMLDivElement>(null); const [counts, setCounts] = useState({ click: 0, hover: 0, enter: 0 }); const [last, setLast] = useState("まだ反応していません");
  useEffect(() => { const pulse = (target: HTMLElement, type: "click" | "hover" | "enter", label: string) => { target.classList.remove("domEventPulse"); void target.offsetWidth; target.classList.add("domEventPulse"); setCounts((value) => ({ ...value, [type]: value[type] + 1 })); setLast(label); }; const click = () => clickRef.current && pulse(clickRef.current, "click", "click（スタンプが跳ねた）"); const hover = () => hoverRef.current && pulse(hoverRef.current, "hover", "pointerenter（光が反応）"); const keydown = (event: KeyboardEvent) => { if (event.key === "Enter" && enterRef.current) { event.preventDefault(); pulse(enterRef.current, "enter", "keydown (Enter)"); } }; const c = clickRef.current, h = hoverRef.current, e = enterRef.current; c?.addEventListener("click", click); h?.addEventListener("pointerenter", hover); e?.addEventListener("keydown", keydown); return () => { c?.removeEventListener("click", click); h?.removeEventListener("pointerenter", hover); e?.removeEventListener("keydown", keydown); }; }, []);
  const reset = () => { [clickRef.current, hoverRef.current, enterRef.current].forEach((target) => { if (target) { target.classList.remove("domEventPulse"); delete target.dataset.event; } }); setCounts({ click: 0, hover: 0, enter: 0 }); setLast("まだ反応していません"); };
  return <ExhibitCard exhibit={exhibit}><p className="domFinePrint"><strong>やってみる:</strong> スタンプをクリック、光へカーソルを重ねる、Enter専用パネルをTabで選んでEnterを押します。タッチではスタンプを押して反応を確認できます。</p><Stage><button ref={clickRef} type="button" className="domEventStamp">✦<span>CLICK</span></button><div ref={hoverRef} className="domEventStamp" aria-label="ホバー用の光">●<span>HOVER</span></div><div ref={enterRef} tabIndex={0} role="button" className="domEventStamp" aria-label="Enterキー専用パネル">↵<span>ENTER</span></div></Stage><Controls><button type="button" onClick={reset}>反応をリセット</button></Controls><Status>何が変わった？ click: {counts.click} / pointerenter: {counts.hover} / keydown: {counts.enter} / 最後: {last}</Status><p className="domFinePrint">3つの学習用専用要素へaddEventListenerで登録し、アンマウント時にremoveEventListenerで解除します。Enter専用パネルは標準buttonのclickと重複しません。</p></ExhibitCard>;
}

function ScrollIntoViewDemo({ exhibit, reduced }: { exhibit: DomAnimationExhibit; reduced: boolean }) {
  const gateRef = useRef<HTMLDivElement>(null); const [status, setStatus] = useState("移動先: #arrival-gate（未案内）");
  const guide = () => { gateRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); gateRef.current?.classList.add("domGateLit"); window.setTimeout(() => gateRef.current?.classList.remove("domGateLit"), reduced ? 0 : 1300); setStatus("移動先: #arrival-gate / 到着ゲートを指定しました"); };
  return <ExhibitCard exhibit={exhibit}><p className="domFinePrint">画面外にある要素を見える位置まで移動するDOM APIです。ボタン自身ではなく、見せたい別のHTML要素「到着ゲート」を指定します。</p><Stage><button type="button" onClick={guide}>到着ゲートまで案内する</button><div className="domScrollSpacer">↓ 目的地はカードの下方にあります ↓</div><div className="domScrollSpacer">↓ 到着ゲートへ ↓</div><div ref={gateRef} id="arrival-gate" className="domArrivalGate">ARRIVAL GATE<br /><small>目的地のHTML要素</small></div></Stage><Status>{status}</Status></ExhibitCard>;
}

function LearningDemo({ exhibit }: { exhibit: DomAnimationExhibit }) {
  const targetRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null); const [state, setState] = useState("待機中"); const [disabled, setDisabled] = useState(false); const [copies, setCopies] = useState(0);
  useEffect(() => { const target = targetRef.current; if (!target) return; if (exhibit.id === "dom-text-content") target.textContent = "WELCOME"; if (exhibit.id === "dom-dataset") target.dataset.state = "通常"; if (exhibit.id === "dom-attributes") { target.setAttribute("aria-expanded", "true"); target.setAttribute("data-open", "true"); target.querySelector("button")?.removeAttribute("disabled"); } }, [exhibit.id]);
  const action = (name: string) => {
    const target = targetRef.current; if (!target) return;
    if (exhibit.id === "dom-text-content") { target.textContent = name; target.classList.add("domTextChanged"); setState(`textContent: ${target.textContent}`); }
    if (exhibit.id === "dom-attributes") { const next = !disabled; const panel = target.querySelector("button"); if (next) panel?.setAttribute("disabled", ""); else panel?.removeAttribute("disabled"); target.setAttribute("aria-expanded", String(!next)); target.setAttribute("data-open", String(!next)); setDisabled(next); setState(`disabled=${next} / aria-expanded=${target.getAttribute("aria-expanded")} / data-open=${target.getAttribute("data-open")}`); }
    if (exhibit.id === "dom-events") { target.dataset.event = name; setState(`イベント: ${name}`); }
    if (exhibit.id === "dom-query-selector") { const found = target.querySelector("[data-piece='moon']") as HTMLElement | null; found?.classList.add("domFound"); setState(`querySelector("[data-piece='moon']") → moon を発見`); }
    if (exhibit.id === "dom-dataset") { target.dataset.state = name; setState(`data-state="${target.dataset.state}"`); }
    if (exhibit.id === "dom-focus") { inputRef.current?.focus(); setState("focus(): 検索欄へフォーカスしました"); }
    if (exhibit.id === "dom-scroll-into-view") { target.scrollIntoView({ behavior: "smooth", block: "center" }); setState("scrollIntoView(): この展示を画面内へ案内しました"); }
    if (exhibit.id === "dom-clone-node") { const original = target.querySelector("#dom-ticket") as HTMLElement | null; if (original) { const copy = original.cloneNode(true) as HTMLElement; copy.removeAttribute("id"); copy.classList.add("domTicketCopy"); target.append(copy); setCopies((n) => n + 1); setState(`cloneNode(true): 子要素を含む複製 ${copies + 1} 枚`); } }
  };
  const controls: Record<string, readonly string[]> = { "dom-text-content":["NEXT EXHIBIT","休憩室はこちら","WELCOME"], "dom-attributes":[disabled ? "操作を有効にする" : "操作を無効にする"], "dom-events":["クリック", "ホバー", "Enter"], "dom-query-selector":["moonを探して照らす"], "dom-dataset":["通常", "注目", "完了"], "dom-focus":["検索欄へ移動"], "dom-scroll-into-view":["この展示へ案内する"], "dom-clone-node":["切符を複製する"] };
  return <ExhibitCard exhibit={exhibit}><Stage><div ref={targetRef} className={`domLearningTarget ${exhibit.id}`}>{exhibit.id === "dom-attributes" && <><button type="button">展示ケースを開く</button><span>属性はHTML要素が持つ追加情報や設定値です</span></>}{exhibit.id === "dom-query-selector" && <div className="domPieces"><i data-piece="sun">●</i><i data-piece="moon">☾</i><i data-piece="star">✦</i></div>}{exhibit.id === "dom-focus" && <input ref={inputRef} aria-label="展示を検索" placeholder="展示を検索" />}{exhibit.id === "dom-clone-node" && <div id="dom-ticket" className="domTicket"><b>ADMIT ONE</b><span>DOM MUSEUM</span></div>}{!["dom-attributes","dom-query-selector","dom-focus","dom-clone-node","dom-text-content","dom-dataset"].includes(exhibit.id) && "操作結果がここに現れます"}</div></Stage><Controls>{controls[exhibit.id].map((label) => <button key={label} type="button" onClick={() => action(label)}>{label}</button>)}<button type="button" onClick={() => { const target = targetRef.current; if (target) { target.removeAttribute("data-state"); target.querySelectorAll(".domFound,.domTicketCopy").forEach((node) => node.remove()); if (exhibit.id === "dom-text-content") target.textContent = "WELCOME"; if (exhibit.id === "dom-dataset") target.dataset.state = "通常"; if (exhibit.id === "dom-attributes") { target.setAttribute("aria-expanded", "true"); target.setAttribute("data-open", "true"); target.querySelector("button")?.removeAttribute("disabled"); setDisabled(false); } } setCopies(0); setState(exhibit.id === "dom-attributes" ? "disabled=false / aria-expanded=true / data-open=true" : "リセットしました"); }}>リセット</button></Controls><Status>{state}</Status></ExhibitCard>;
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
    case "dom-manual-animation": return <ManualAnimation exhibit={exhibit} active={active} reduced={reduced} />;
    case "dom-events": return <EventsDemo exhibit={exhibit} />;
    case "dom-scroll-into-view": return <ScrollIntoViewDemo exhibit={exhibit} reduced={reduced} />;
    default: return <LearningDemo exhibit={exhibit} />;
  }
}

export default function DomAnimationRoom() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const close = () => { setOpen(false); window.requestAnimationFrame(() => toggleRef.current?.focus()); };

  return <section className="roomCard roomCardDom" aria-labelledby="dom-animation-room-title">
    <button ref={toggleRef} id="dom-animation-room-toggle" type="button" className="roomToggle" aria-expanded={open} aria-controls="dom-animation-room-panel" onClick={() => setOpen((current) => !current)}>
      <span className="roomIndex">ROOM / WEB PLATFORM</span><span className="roomTitle" id="dom-animation-room-title">DOM ANIMATION ROOM</span><span className="roomDescription">DOMアニメーション展示室 / JavaScript + Browser DOM APIs</span><span className="roomMeta"><span>17 EXHIBITS</span><span>INTERACTIVE API STUDIES</span></span><span className="roomArrow" aria-hidden="true">↓</span>
    </button>
    <div id="dom-animation-room-panel" className="roomPanel" data-open={open} role="region" aria-labelledby="dom-animation-room-toggle" aria-hidden={!open} inert={!open}>
      <div className="roomPanelInner"><div className="domRoomBody">
        <header className="domRoomIntro"><p>WEB PLATFORM / DIRECT MANIPULATION</p><h3>ボタン操作が、HTMLの部品を変える</h3><p>DOMとは、ブラウザがHTMLを「操作できる部品の集まり」として扱う仕組みです。JavaScriptそのものの機能ではなく、ブラウザがHTML要素を操作するために提供しているAPIです。</p><p>JavaScriptはDOM APIを通じて、文字・色・大きさ・クラス（見た目のルール名）・属性（要素の追加情報）・要素の追加削除などを変えられます。この展示室では、ボタン操作による見た目の変化と、実際に呼ばれたDOM APIを対応させて学べます。</p><p>通常のReactアプリでは表示内容をstateとJSXで管理します。この展示では直接操作を各展示専用のrefへ限定し、ReactのDOMと混ぜません。</p><p className="domRoleNote">DOM APIは「どの状態にするか」「どの要素を変えるか」を切り替える役目です。CSSアニメーションそのものとは別で、CSSは値の変化を見やすく補助します。</p></header>
        <div className="domExhibitGrid">{domAnimationExhibits.map((exhibit) => <Demo key={exhibit.id} exhibit={exhibit} active={open} reduced={reduced} />)}</div>
        <button type="button" className="roomClose domRoomClose" onClick={close}>展示室を閉じる</button>
      </div></div>
    </div>
  </section>;
}
