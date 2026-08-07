"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { macintoshBirthExhibits, type MacintoshDemoType } from "../data/macintoshBirthExhibits";

const systemChanges = [
  "System 1 — デスクトップと単一アプリの直接操作",
  "System 2 — Finder操作と周辺機器対応の整備",
  "System 3 — 階層ファイルと操作の改善",
  "System 4 — より大きな記憶装置とFinderの更新",
  "System 5 — MultiFinderで複数アプリを行き来",
  "System 6 — 安定した日常環境と表現の洗練",
];

const machineChanges = [
  ["Macintosh 128K", "GUIを一体型の身近な道具として提示"],
  ["Macintosh 512K", "メモリの余裕で扱える仕事を拡大"],
  ["Macintosh Plus", "SCSIと拡張性で長く使える基盤へ"],
  ["Macintosh SE", "内蔵ストレージと拡張スロットを強化"],
  ["Macintosh II", "カラーとモジュール構成で専門作業へ"],
  ["Macintosh Classic", "一体型Macを再び手頃な入口へ"],
] as const;

function Face({ sad = false }: { sad?: boolean }) {
  return <span className="macFace" data-sad={sad} aria-hidden="true"><i /><b>{sad ? "⌢" : "⌣"}</b></span>;
}

function BootDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [step, setStep] = useState(0);
  const labels = ["POWER OFF", "SELF CHECK", "DISK READING", "FINDER READY"];
  useEffect(() => {
    if (!active || step === 0 || step === 3 || reduced) return;
    const timer = window.setTimeout(() => setStep((value) => Math.min(value + 1, 3)), 900);
    return () => window.clearTimeout(timer);
  }, [active, reduced, step]);
  return <div className="macDemo macBootDemo" data-step={step}>
    <div className="macCompact"><div className="macScreen">{step === 0 ? <span /> : step === 1 ? <Face /> : step === 2 ? <><Face /><em>DISK···</em></> : <MiniDesktop />}</div></div>
    <ol className="macBootSteps">{labels.map((label, index) => <li key={label} data-current={index === step}>{label}</li>)}</ol>
    <button type="button" onClick={() => setStep(reduced ? 3 : 1)}>{step ? "もう一度起動" : "電源を入れる"}</button>
    <output aria-live="polite">{labels[step]}</output>
  </div>;
}

function MiniDesktop({ color = false }: { color?: boolean }) {
  return <span className="macMiniDesktop" data-color={color}><i>File</i><i>Folder</i><i>Disk</i><b>Trash</b></span>;
}

function StatusDemo() {
  const [sad, setSad] = useState(false);
  return <div className="macDemo macStatusDemo"><Face sad={sad} /><strong>{sad ? "STARTUP FAILED / CODE 000F" : "STARTUP OK"}</strong><button type="button" aria-pressed={sad} onClick={() => setSad((value) => !value)}>成功／失敗を切替</button></div>;
}

function DiskDemo() {
  const [inserted, setInserted] = useState(false);
  return <div className="macDemo macDiskDemo" onDragOver={(event) => event.preventDefault()} onDrop={() => setInserted(true)}>
    <button type="button" className="macDisk" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", "system-disk")} onClick={() => setInserted(true)} data-inserted={inserted}>SYSTEM<br />DISK</button>
    <div className="macDiskSlot" data-inserted={inserted}>▰</div><output aria-live="polite">{inserted ? "READING → DESKTOP READY" : "INSERT A SYSTEM DISK"}</output>
    <button type="button" onClick={() => setInserted(false)}>取り出す</button>
  </div>;
}

function DesktopDemo({ icons = false, trash = false }: { icons?: boolean; trash?: boolean }) {
  const [selected, setSelected] = useState("Folder");
  const [deleted, setDeleted] = useState(false);
  const [moved, setMoved] = useState(false);
  const choose = (name: string) => { setSelected(name); if (name === "Trash" && trash) setDeleted(true); };
  return <div className="macDemo macDesktopDemo">
    <div className="macMenuStrip">⌘ FILE EDIT VIEW</div>
    <div className="macDesktopIcons" data-moved={moved}>{["Disk", "Folder", deleted ? "" : "File", "Trash"].map((name) => name ? <button key={name} draggable={name === "File"} onDragStart={(e) => e.dataTransfer.setData("text/plain", name)} onDrop={(e) => { e.preventDefault(); choose(name); }} onDragOver={(e) => e.preventDefault()} aria-pressed={selected === name} onClick={() => choose(name)} onDoubleClick={() => setSelected(`${name} OPEN`)}>{name === "Trash" ? "▱" : "▣"}<span>{name}</span></button> : null)}</div>
    <output aria-live="polite">{deleted ? "FILE MOVED TO TRASH" : selected}</output>
    {icons ? <button type="button" onClick={() => setMoved((v) => !v)}>配置を変更</button> : <button type="button" onClick={() => setSelected(`${selected.replace(" OPEN", "")} OPEN`)}>開く</button>}
  </div>;
}

function WindowDemo({ multi = false }: { multi?: boolean }) {
  const [front, setFront] = useState(1);
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState({ x: 14, y: 36 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPosition({ x: Math.max(2, Math.min(46, event.clientX - drag.current.x)), y: Math.max(25, Math.min(76, event.clientY - drag.current.y)) });
  };
  const pane = (id: number, title: string) => <div className="macWindow" data-front={front === id} style={id === 1 ? { left: `${position.x}%`, top: `${position.y}px` } : undefined} onPointerDown={() => setFront(id)}>
    <div className="macWindowTitle" onPointerDown={(event) => { if (id !== 1) return; drag.current = { x: event.clientX - position.x, y: event.clientY - position.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={() => { drag.current = null; }}>{title}</div>
    <p>{id === 1 ? "A directly manipulated document." : "A background desk accessory."}</p><span className="macResizeHandle" />
  </div>;
  return <div className="macDemo macWindowDemo">{open && pane(1, multi ? "MacWrite" : "Documents")}{multi && pane(2, "Calculator")}<button type="button" onClick={() => setOpen((v) => !v)}>{open ? "閉じる" : "開く"}</button><output>FRONT: {front === 1 ? (multi ? "MacWrite" : "Documents") : "Calculator"}</output></div>;
}

function MenuDemo() {
  const [open, setOpen] = useState(false); const [choice, setChoice] = useState("NONE");
  return <div className="macDemo macMenuDemo" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}><button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>File</button>{open && <div className="macPullDown">{["New", "Open…", "Close", "Print…"].map((item) => <button type="button" key={item} onClick={() => { setChoice(item); setOpen(false); }}>{item}</button>)}</div>}<output>COMMAND: {choice}</output></div>;
}

function PointerDemo() {
  const [log, setLog] = useState("POINT"); const count = useRef(0); const [pos, setPos] = useState(50);
  return <div className="macDemo macPointerDemo" onPointerMove={(e) => { if (e.buttons) setPos(Math.max(8, Math.min(90, e.nativeEvent.offsetX / e.currentTarget.clientWidth * 100))); }}><button type="button" style={{ left: `${pos}%` }} onClick={() => { count.current += 1; setLog(count.current % 2 ? "CLICK" : "DOUBLE CLICK"); }}>DRAG ME</button><p>Select this text with an I-beam cursor.</p><output>{log} / X {Math.round(pos)}%</output></div>;
}

function ScrollDemo() {
  const [value, setValue] = useState(0);
  return <div className="macDemo macScrollDemo"><div className="macScrollViewport"><div style={{ transform: `translateY(-${value}px)` }}>{Array.from({ length: 12 }, (_, i) => <p key={i}>PAGE LINE {String(i + 1).padStart(2, "0")} — INFORMATION CONTINUES</p>)}</div></div><div className="macScrollControls"><button type="button" onClick={() => setValue(Math.max(0, value - 24))}>▲</button><input aria-label="文書のスクロール位置" type="range" min="0" max="180" value={value} onChange={(e) => setValue(Number(e.target.value))} /><button type="button" onClick={() => setValue(Math.min(180, value + 24))}>▼</button></div></div>;
}

function AccessoriesDemo() {
  const [tool, setTool] = useState("Calculator"); const [number, setNumber] = useState(0);
  return <div className="macDemo macAccessoriesDemo"><div>{["Calculator", "Clock", "Scrapbook", "Puzzle"].map((name) => <button type="button" aria-pressed={tool === name} key={name} onClick={() => setTool(name)}>{name}</button>)}</div><section><strong>{tool}</strong>{tool === "Calculator" ? <button type="button" onClick={() => setNumber((n) => (n + 7) % 100)}>+ 7</button> : tool === "Clock" ? <time>10:35</time> : tool === "Puzzle" ? <button type="button" onClick={() => setNumber((n) => n + 1)}>□ ■ □</button> : <p>CLIPPED TEXT</p>}<output>{number}</output></section></div>;
}

function PaintDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null); const history = useRef<ImageData[]>([]); const [tool, setTool] = useState<"pen" | "erase">("pen"); const drawing = useRef(false);
  const point = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const ctx = canvas.getContext("2d"); if (!ctx) return;
    const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height; ctx.fillStyle = tool === "erase" ? "#fff" : "#111"; ctx.fillRect(x - 3, y - 3, 6, 6);
  }, [tool]);
  const snapshot = () => { const c = canvasRef.current; const x = c?.getContext("2d"); if (c && x) history.current.push(x.getImageData(0, 0, c.width, c.height)); };
  return <div className="macDemo macPaintDemo"><div>{["pen", "erase"].map((name) => <button type="button" key={name} aria-pressed={tool === name} onClick={() => setTool(name as "pen" | "erase")}>{name === "pen" ? "ペン" : "消しゴム"}</button>)}<button type="button" onClick={() => { snapshot(); const c = canvasRef.current; const x = c?.getContext("2d"); if (c && x) { x.fillStyle = "#111"; x.fillRect(0, 0, c.width, c.height); } }}>塗りつぶし</button><button type="button" onClick={() => { const c = canvasRef.current; const x = c?.getContext("2d"); const last = history.current.pop(); if (x && last) x.putImageData(last, 0, 0); }}>Undo</button></div><canvas ref={canvasRef} width="520" height="220" aria-label="オリジナルの白黒ペイントキャンバス" onPointerDown={(e) => { snapshot(); drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); point(e); }} onPointerMove={(e) => { if (drawing.current) point(e); }} onPointerUp={() => { drawing.current = false; }} /></div>;
}

function TextDemo({ fontsOnly = false }: { fontsOnly?: boolean }) {
  const [font, setFont] = useState("Chicago"); const [size, setSize] = useState(16); const family: Record<string, string> = { Chicago: "Arial Black", Geneva: "Arial", Monaco: "monospace", "New York": "Georgia" };
  return <div className="macDemo macTextDemo"><div>{["Chicago", "Geneva", "Monaco", "New York"].map((name) => <button type="button" key={name} aria-pressed={font === name} onClick={() => setFont(name)}>{name}</button>)}</div>{!fontsOnly && <input aria-label="文字サイズ" type="range" min="12" max="28" value={size} onChange={(e) => setSize(Number(e.target.value))} />}<p contentEditable suppressContentEditableWarning style={{ fontFamily: family[font], fontSize: size }}>画面で見た文字を、そのまま紙へ。</p><small>歴史的名称を解説に使用。書体ファイルは複製せず代替CSS書体で表現。</small></div>;
}

function PixelIconsDemo() {
  const [pixels, setPixels] = useState(() => new Set([18, 21, 37, 42, 50, 53, 68, 69, 70, 71, 84, 87, 101, 102]));
  return <div className="macDemo macPixelDemo"><div>{Array.from({ length: 256 }, (_, index) => <button type="button" key={index} aria-label={`ピクセル ${index + 1}`} aria-pressed={pixels.has(index)} onClick={() => setPixels((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} />)}</div><p>16 × 16 / ORIGINAL PIXEL GLYPH</p></div>;
}

function ChoiceDemo({ kind }: { kind: "systems" | "machines" | "system-seven" }) {
  const choices = kind === "systems" ? systemChanges.map((text, i) => [`System ${i + 1}`, text] as const) : kind === "machines" ? machineChanges : [["Color UI", "色を装飾だけでなく状態の区別へ"], ["Alias", "別の場所にある項目への参照"], ["Balloon Help", "その場で操作を説明"], ["MultiFinder", "複数アプリを行き来"]] as const;
  const [selected, setSelected] = useState(0);
  return <div className="macDemo macChoiceDemo"><div>{choices.map(([name], index) => <button type="button" key={name} aria-pressed={selected === index} onClick={() => setSelected(index)}>{name}</button>)}</div><output aria-live="polite"><strong>{choices[selected][0]}</strong>{choices[selected][1]}</output></div>;
}

function BalloonDemo() {
  const [tip, setTip] = useState("部品を選ぶと、ここに説明が出ます。"); const items = [["□", "閉じるボックス：ウィンドウを閉じます。"], ["▤", "タイトルバー：ドラッグして窓を動かします。"], ["▽", "スクロール：隠れた情報へ移動します。"]];
  return <div className="macDemo macBalloonDemo"><div>{items.map(([label, text]) => <button type="button" key={label} onFocus={() => setTip(text)} onPointerEnter={() => setTip(text)} onClick={() => setTip(text)} aria-describedby="mac-balloon-output">{label}</button>)}</div><output id="mac-balloon-output" role="status">{tip}</output></div>;
}

function ColorDemo() { const [color, setColor] = useState(false); return <div className="macDemo macColorDemo" data-color={color}><MiniDesktop color={color} /><button type="button" aria-pressed={color} onClick={() => setColor((v) => !v)}>{color ? "モノクロへ" : "カラーへ"}</button></div>; }

function SoundDemo() {
  const play = (kind: number) => { const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext; const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = kind === 1 ? "square" : "sine"; oscillator.frequency.value = kind === 0 ? 330 : kind === 1 ? 150 : 520; gain.gain.setValueAtTime(.06, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .35); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .36); oscillator.addEventListener("ended", () => void context.close()); };
  return <div className="macDemo macSoundDemo"><p>音は自動再生されません。</p>{["起動", "警告", "操作完了"].map((label, i) => <button type="button" key={label} onClick={() => play(i)}>{label}音を再生</button>)}</div>;
}

function TransitionDemo() { const [gui, setGui] = useState(50); return <div className="macDemo macTransitionDemo"><div><section style={{ opacity: (100 - gui) / 100 + .2 }}><strong>APPLE II</strong><code>&gt; LIST<br />10 PRINT &quot;HELLO&quot;<br />&gt; RUN</code></section><span>→</span><section style={{ opacity: gui / 100 + .2 }}><strong>MACINTOSH</strong><MiniDesktop /></section></div><input type="range" min="0" max="100" value={gui} onChange={(e) => setGui(Number(e.target.value))} aria-label="文字操作からGUI操作への変化" /><a href="#apple-early-room-title">Apple II展示室へ戻る</a></div>; }

function ExhibitDemo({ type, active, reduced }: { type: MacintoshDemoType; active: boolean; reduced: boolean }) {
  switch (type) {
    case "boot": return <BootDemo active={active} reduced={reduced} />;
    case "status": return <StatusDemo />;
    case "disk": return <DiskDemo />;
    case "desktop": return <DesktopDemo />;
    case "window": return <WindowDemo />;
    case "menu": return <MenuDemo />;
    case "pointer": return <PointerDemo />;
    case "icons": return <DesktopDemo icons />;
    case "trash": return <DesktopDemo trash />;
    case "scroll": return <ScrollDemo />;
    case "accessories": return <AccessoriesDemo />;
    case "paint": return <PaintDemo />;
    case "write": return <TextDemo />;
    case "fonts": return <TextDemo fontsOnly />;
    case "pixel-icons": return <PixelIconsDemo />;
    case "systems": return <ChoiceDemo kind="systems" />;
    case "multifinder": return <WindowDemo multi />;
    case "system-seven": return <ChoiceDemo kind="system-seven" />;
    case "balloon": return <BalloonDemo />;
    case "machines": return <ChoiceDemo kind="machines" />;
    case "color": return <ColorDemo />;
    case "sound": return <SoundDemo />;
    case "transition": return <TransitionDemo />;
  }
}

export default function MacintoshBirthExhibitRoom() {
  const [open, setOpen] = useState(false); const [visible, setVisible] = useState(true); const [reduced, setReduced] = useState(false); const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const motion = () => setReduced(media.matches); const visibility = () => setVisible(document.visibilityState === "visible"); motion(); visibility(); media.addEventListener("change", motion); document.addEventListener("visibilitychange", visibility); return () => { media.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); }; }, []);
  const close = () => { setOpen(false); requestAnimationFrame(() => toggleRef.current?.focus()); };
  return <section className="roomCard roomCardMacintosh" aria-labelledby="macintosh-birth-room-title">
    <button ref={toggleRef} id="macintosh-birth-room-toggle" type="button" className="roomToggle" aria-expanded={open} aria-controls="macintosh-birth-room-panel" onClick={() => setOpen((v) => !v)}><span className="roomIndex">ROOM / 1984–1991</span><span className="roomTitle" id="macintosh-birth-room-title">Macintosh誕生展示室</span><span className="roomDescription">文字の世界からGUIの世界へ</span><span className="roomMeta"><span>24 EXHIBITS</span><span>HANDS-ON GUI ARCHIVE</span></span><span className="roomArrow" aria-hidden="true">↓</span></button>
    <div id="macintosh-birth-room-panel" className="roomPanel" data-open={open} role="region" aria-labelledby="macintosh-birth-room-toggle" aria-hidden={!open} inert={!open}><div className="roomPanelInner"><div className="macRoomBody">
      <header className="macRoomIntro"><p>PERIOD ROOM / 1984–1991</p><h3>初めてGUIへ触れる日</h3><p>電源を入れ、ディスクを読み、Finderでアイコンとウィンドウを直接動かす。初代MacintoshからSystem 7までの変化を、24のオリジナルWeb再構成で体験します。</p><ol><li>POWER ON</li><li>DISK</li><li>FINDER</li><li>WINDOW</li><li>MACPAINT</li></ol><small>Historical interface recreation / Appleの実機UI、ROM、アイコン、音源、画像を複製しない教育目的の非公式展示です。</small></header>
      <div className="macExhibitGrid">{macintoshBirthExhibits.map((exhibit, index) => <article className="macExhibit" key={exhibit.id} id={exhibit.id} aria-labelledby={`${exhibit.id}-title`}><header><span>{String(index + 1).padStart(2, "0")}</span><div><p>{exhibit.period} / ORIGINAL WEB RECREATION</p><h4 id={`${exhibit.id}-title`}>{exhibit.title}</h4></div></header><p>{exhibit.summary}</p><ExhibitDemo type={exhibit.demo} active={open && visible} reduced={reduced} /><p className="macInteraction"><strong>操作</strong>{exhibit.interaction}</p></article>)}</div>
      <button type="button" className="roomClose macRoomClose" onClick={close}>展示室を閉じる</button>
    </div></div></div>
  </section>;
}
