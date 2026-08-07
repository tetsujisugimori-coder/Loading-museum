"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { macintoshBirthExhibits, type MacintoshDemoType } from "../data/macintoshBirthExhibits";

type BootState = "off" | "diagnostic" | "happy" | "need-disk" | "loading" | "finder" | "sad";
type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };

const bootCopy: Record<BootState, { label: string; note: string }> = {
  off: { label: "電源オフ", note: "最初のMacintoshは電源投入後、ROMの起動処理から始まります。" },
  diagnostic: { label: "起動診断", note: "短い初期化を通過できるかを確認する、展示用に抽象化した段階です。" },
  happy: { label: "Happy Mac", note: "低レベルの起動を通過し、システムソフトを探せる状態です。" },
  "need-disk": { label: "起動ディスク待ち", note: "故障ではありません。起動可能なシステムディスクを待つ状態です。" },
  loading: { label: "システム読込", note: "挿入された起動ディスクからFinderを読み込む展示上の表現です。" },
  finder: { label: "Finder", note: "System 1 / Finder 1.xを参考にした、白黒デスクトップの到達点です。" },
  sad: { label: "Sad Mac", note: "低レベルの起動異常を表す停止状態です。ディスク待ちとは別の状態です。" },
};

const exhibitContext: Partial<Record<MacintoshDemoType, string>> = {
  boot: "1984 / System 1の起動経路", status: "1984 / ROM起動時の状態表示", disk: "1984 / 起動ディスク待ち", desktop: "1984 / System 1・Finder 1.x", window: "1984 / Finderウィンドウ部品", menu: "1984 / 常駐メニューバー", pointer: "1984 / 単一ボタンマウス", icons: "1984 / デスクトップメタファー", trash: "1984 / ゴミ箱メタファー", scroll: "1984 / Finderのスクロール操作", accessories: "1984 / Desk Accessory", paint: "1984 / MacPaintの直接描画", write: "1984 / MacWriteとWYSIWYG", fonts: "1984 / 初期Macintoshの英字書体", "pixel-icons": "1983–1984 / ピクセルアイコン設計", systems: "1984–1988 / System 1–6", multifinder: "1987 / MultiFinder", "system-seven": "1991 / System 7", balloon: "1991 / Balloon Help", machines: "1984–1990 / Macintosh機種", color: "1987 / Macintosh IIのカラー環境", sound: "1984– / UIフィードバック", transition: "1977–1991 / Apple IIからMacintoshへ",
};

function PixelFace({ state }: { state: "happy" | "sad" }) {
  return <span className="macPixelFace" data-state={state} aria-label={state === "happy" ? "Happy Mac風の正常起動記号" : "Sad Mac風の起動異常記号"}><i /><i /><b /></span>;
}

function QuestionDisk() { return <span className="macQuestionDisk" aria-label="起動可能なシステムディスクを待つ、はてな付きフロッピーディスク"><b>?</b><i /></span>; }

function Icon({ kind, label }: { kind: "disk" | "folder" | "file" | "trash"; label: string }) { return <span className={`macIcon macIcon-${kind}`} aria-hidden="true"><i /><b>{label}</b></span>; }

function BootDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [state, setState] = useState<BootState>("off");
  useEffect(() => {
    if (!active || reduced || !["diagnostic", "happy", "loading"].includes(state)) return;
    const next: Record<string, BootState> = { diagnostic: "happy", happy: "need-disk", loading: "finder" };
    const timer = window.setTimeout(() => setState(next[state]), state === "loading" ? 1100 : 650);
    return () => window.clearTimeout(timer);
  }, [active, reduced, state]);
  const power = () => setState(reduced ? "need-disk" : "diagnostic");
  return <div className="macDemo macAuthenticBoot" data-state={state}>
    <div className="macClassicScreen" role="img" aria-label={bootCopy[state].label}>
      {state === "off" && <span className="macScreenOff" />}
      {state === "diagnostic" && <span className="macDiagnostic">●<br />INITIALIZING MEMORY</span>}
      {state === "happy" && <PixelFace state="happy" />}
      {state === "need-disk" && <QuestionDisk />}
      {state === "loading" && <><PixelFace state="happy" /><span className="macLoadLines">SYSTEM<br />FINDER</span></>}
      {state === "finder" && <FinderSurface compact />}
      {state === "sad" && <><PixelFace state="sad" /><code>0000 00F0</code></>}
    </div>
    <p className="macStateMeaning"><strong>{bootCopy[state].label}</strong>{bootCopy[state].note}</p>
    <div className="macControlRow">
      {state === "off" ? <button type="button" onClick={power}>電源を入れる</button> : <button type="button" onClick={() => setState("off")}>起動をリセット</button>}
      {state === "need-disk" && <button type="button" onClick={() => setState(reduced ? "finder" : "loading")}>システムディスクを挿入</button>}
      {state !== "sad" && state !== "finder" && <button type="button" onClick={() => setState("sad")}>起動異常を見る</button>}
    </div>
    <output aria-live="polite">{bootCopy[state].label}</output>
  </div>;
}

function StatusDemo() {
  const [state, setState] = useState<"happy" | "sad" | "need-disk">("happy");
  const meaning = state === "happy" ? "診断を通過し、OSの読込へ進める" : state === "sad" ? "低レベルの異常で起動が停止する" : "起動可能なシステムディスクを待っている";
  return <div className="macDemo macStatusComparison"><div className="macClassicScreen">{state === "need-disk" ? <QuestionDisk /> : <PixelFace state={state} />}{state === "sad" && <code>0000 00F0</code>}</div><p><strong>{state === "happy" ? "Happy Mac" : state === "sad" ? "Sad Mac" : "?付きフロッピー"}</strong>{meaning}</p><div className="macControlRow">{(["happy", "sad", "need-disk"] as const).map((item) => <button key={item} type="button" aria-pressed={state === item} onClick={() => setState(item)}>{item === "happy" ? "Happy Mac" : item === "sad" ? "Sad Mac" : "?付きフロッピー"}</button>)}</div></div>;
}

function DiskDemo({ reduced }: { reduced: boolean }) {
  const [state, setState] = useState<"waiting" | "reading" | "ready">("waiting");
  useEffect(() => { if (state !== "reading" || reduced) return; const timer = window.setTimeout(() => setState("ready"), 1000); return () => window.clearTimeout(timer); }, [reduced, state]);
  return <div className="macDemo macDiskWait"><div className="macClassicScreen">{state === "waiting" ? <QuestionDisk /> : state === "reading" ? <span className="macDiskReading"><PixelFace state="happy" />READING</span> : <FinderSurface compact />}</div><p>{state === "waiting" ? "画面中央の?付きフロッピーは、起動ディスク待ちを表します。" : state === "reading" ? "展示用の読込表現を経由しています。" : "Finderへ到達しました。"}</p><div className="macControlRow"><button type="button" onClick={() => setState(reduced ? "ready" : "reading")}>システムディスクを挿入</button><button type="button" onClick={() => setState("waiting")}>ディスクを取り出す</button></div></div>;
}

function useWindowDrag(initial: Rect, bounds: { width: number; height: number }) {
  const [rect, setRect] = useState(initial); const drag = useRef<{ pointerX: number; pointerY: number; rect: Rect; mode: "move" | "grow" } | null>(null);
  const clamp = (next: Rect) => ({ ...next, x: Math.max(0, Math.min(bounds.width - next.width, next.x)), y: Math.max(18, Math.min(bounds.height - next.height, next.y)), width: Math.max(130, Math.min(bounds.width - next.x, next.width)), height: Math.max(82, Math.min(bounds.height - next.y, next.height)) });
  const start = (event: ReactPointerEvent<HTMLElement>, mode: "move" | "grow") => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointerX: event.clientX, pointerY: event.clientY, rect, mode }; };
  const move = (event: ReactPointerEvent<HTMLElement>) => { const session = drag.current; if (!session) return; const dx = event.clientX - session.pointerX; const dy = event.clientY - session.pointerY; setRect(clamp(session.mode === "move" ? { ...session.rect, x: session.rect.x + dx, y: session.rect.y + dy } : { ...session.rect, width: session.rect.width + dx, height: session.rect.height + dy })); };
  const end = () => { drag.current = null; };
  return { rect, start, move, end };
}

function FinderWindow({ title, front, onFront, onClose, rect, controls, children }: { title: string; front: boolean; onFront: () => void; onClose?: () => void; rect: Rect; controls?: ReturnType<typeof useWindowDrag>; children: React.ReactNode }) {
  return <section className="macFinderWindow" data-front={front} style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px`, zIndex: front ? 3 : 1 }} onPointerDown={onFront}>
    <header className="macFinderTitle" onPointerDown={(event) => controls?.start(event, "move")} onPointerMove={controls?.move} onPointerUp={controls?.end}><button type="button" aria-label={`${title}を閉じる`} className="macCloseBox" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>×</button><b>{title}</b></header>
    <div className="macFinderContents">{children}</div><div className="macScrollRail" aria-hidden="true"><i /></div>{controls && <button type="button" className="macGrowBox" aria-label={`${title}のサイズを変更`} onPointerDown={(event) => controls.start(event, "grow")} onPointerMove={controls.move} onPointerUp={controls.end}>◢</button>}
  </section>;
}

function FinderSurface({ compact = false, color = false }: { compact?: boolean; color?: boolean }) {
  const [selected, setSelected] = useState("Macintosh HD"); const [open, setOpen] = useState<"folder" | "file" | null>(null); const [menu, setMenu] = useState(false); const controls = useWindowDrag({ x: compact ? 10 : 34, y: compact ? 28 : 46, width: compact ? 132 : 230, height: compact ? 82 : 142 }, { width: compact ? 154 : 330, height: compact ? 105 : 220 });
  const icons = [{ id: "Macintosh HD", kind: "disk" as const, label: "Macintosh HD" }, { id: "System Folder", kind: "folder" as const, label: "System Folder" }, { id: "Read Me", kind: "file" as const, label: "Read Me" }, { id: "Trash", kind: "trash" as const, label: "Trash" }];
  const activate = (id: string) => { setSelected(id); if (id === "System Folder") setOpen("folder"); if (id === "Read Me") setOpen("file"); };
  return <div className="macFinderSurface" data-compact={compact} data-color={color}>
    <div className="macFinderMenuBar"><button type="button" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>◆</button><b>Finder</b><span>File</span><span>Edit</span><span>View</span><span>Special</span>{menu && <div className="macAppleMenu"><button type="button">About This Finder</button><button type="button">Calculator</button></div>}</div>
    <div className="macDesktopField">{icons.map((icon) => <button key={icon.id} type="button" className="macDesktopItem" aria-pressed={selected === icon.id} onClick={() => setSelected(icon.id)} onDoubleClick={() => activate(icon.id)}><Icon kind={icon.kind} label={icon.label} /></button>)}
      {open && <FinderWindow title={open === "folder" ? "System Folder" : "Read Me"} front onFront={() => undefined} onClose={() => setOpen(null)} rect={controls.rect} controls={controls}><p>{open === "folder" ? "System · Finder · Fonts" : "Welcome to Macintosh"}</p></FinderWindow>}
    </div><output className="macFinderStatus">{selected} {open ? "OPEN" : "SELECTED"}</output>
  </div>;
}

function FinderDemo() { return <div className="macDemo macFinderExhibit"><FinderSurface /><p>System 1 / Finder 1.xを参考に、メニューバー、白黒デスクトップ、アイコン選択、ダブルクリック、Finder風ウィンドウを独自に再構成しています。</p></div>; }

function WindowDemo() {
  const [front, setFront] = useState<1 | 2>(1); const [open, setOpen] = useState(true); const first = useWindowDrag({ x: 20, y: 42, width: 215, height: 132 }, { width: 332, height: 215 }); const second = useWindowDrag({ x: 86, y: 72, width: 190, height: 108 }, { width: 332, height: 215 });
  return <div className="macDemo macWindowExhibit">{open && <FinderWindow title="Read Me" front={front === 1} onFront={() => setFront(1)} onClose={() => setOpen(false)} rect={first.rect} controls={first}><p>タイトルバーだけを掴んで移動します。</p></FinderWindow>}<FinderWindow title="Calculator" front={front === 2} onFront={() => setFront(2)} rect={second.rect} controls={second}><p>前面化、右側スクロール、右下Grow box。</p></FinderWindow><div className="macControlRow"><button type="button" onClick={() => setOpen(true)}>閉じたRead Meを開く</button></div><output>前面: {front === 1 ? "Read Me" : "Calculator"}</output></div>;
}

function PointerDemo() {
  const [position, setPosition] = useState<Point>({ x: 118, y: 62 }); const [log, setLog] = useState("矢印で対象を押し、縦横へドラッグできます。"); const drag = useRef<{ x: number; y: number; start: Point } | null>(null);
  const down = (event: ReactPointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, start: position }; setLog("単一ボタンを押下中"); };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => { const current = drag.current; if (!current) return; setPosition({ x: Math.max(10, Math.min(250, current.start.x + event.clientX - current.x)), y: Math.max(10, Math.min(140, current.start.y + event.clientY - current.y)) }); };
  return <div className="macDemo macPointerExhibit"><span className="macMouseSketch" aria-hidden="true">●</span><button type="button" className="macPointerTarget" style={{ left: `${position.x}px`, top: `${position.y}px` }} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; setLog(`移動: X ${position.x}px / Y ${position.y}px`); }}><span>↖</span> DRAG</button><p>1984年のMacintoshは、矢印ポインタと単一ボタンマウスで対象を直接扱う入口をつくりました。</p><output aria-live="polite">{log}</output></div>;
}

function ScrollDemo() { const [value, setValue] = useState(0); return <div className="macDemo macScrollExhibit"><div className="macTextViewport">{Array.from({ length: 11 }, (_, i) => <p key={i} style={{ transform: `translateY(-${value}px)` }}>LINE {String(i + 1).padStart(2, "0")} / A DOCUMENT EXTENDS BEYOND THE WINDOW</p>)}</div><div className="macClassicScrollbar"><button type="button" onClick={() => setValue(Math.max(0, value - 20))}>▲</button><input type="range" aria-label="スクロール位置" min="0" max="100" value={value} onChange={(event) => setValue(Number(event.target.value))} /><button type="button" onClick={() => setValue(Math.min(100, value + 20))}>▼</button></div></div>; }

function AccessoriesDemo() { const [tool, setTool] = useState("Calculator"); return <div className="macDemo macAccessoryExhibit"><div className="macClassicMenu"><button type="button" onClick={() => setTool("Calculator")}>Calculator</button><button type="button" onClick={() => setTool("Clock")}>Clock</button><button type="button" onClick={() => setTool("Scrapbook")}>Scrapbook</button></div><section><b>{tool}</b><p>{tool === "Calculator" ? "12 + 7 = 19" : tool === "Clock" ? "10:35" : "A clipped note"}</p></section></div>; }

function PaintDemo() { const canvas = useRef<HTMLCanvasElement>(null); const [erase, setErase] = useState(false); const history = useRef<ImageData[]>([]); const drawing = useRef(false); const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => { const surface = canvas.current; const context = surface?.getContext("2d"); if (!surface || !context) return; const rect = surface.getBoundingClientRect(); const x = (event.clientX - rect.left) * surface.width / rect.width; const y = (event.clientY - rect.top) * surface.height / rect.height; context.fillStyle = erase ? "#fff" : "#000"; context.fillRect(x - 2, y - 2, 4, 4); }; const snapshot = () => { const surface = canvas.current; const context = surface?.getContext("2d"); if (surface && context) history.current.push(context.getImageData(0, 0, surface.width, surface.height)); };
  return <div className="macDemo macPaintExhibit"><div className="macControlRow"><button type="button" aria-pressed={!erase} onClick={() => setErase(false)}>ペン</button><button type="button" aria-pressed={erase} onClick={() => setErase(true)}>消しゴム</button><button type="button" onClick={() => { snapshot(); const ctx = canvas.current?.getContext("2d"); const surface = canvas.current; if (ctx && surface) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, surface.width, surface.height); } }}>塗りつぶし</button><button type="button" onClick={() => { const image = history.current.pop(); const ctx = canvas.current?.getContext("2d"); if (ctx && image) ctx.putImageData(image, 0, 0); }}>Undo</button></div><canvas ref={canvas} width="480" height="188" aria-label="MacPaintを参考にした白黒描画面" onPointerDown={(event) => { snapshot(); drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); draw(event); }} onPointerMove={(event) => { if (drawing.current) draw(event); }} onPointerUp={() => { drawing.current = false; }} /></div>; }

const fontFamilies: Record<string, string> = { Chicago: "Arial Black, Arial, sans-serif", Geneva: "Arial, sans-serif", Monaco: "ui-monospace, monospace", "New York": "Georgia, serif" };
function FontDemo() { const [font, setFont] = useState("Chicago"); const sample = "Welcome to Macintosh\nThe quick brown fox jumps over the lazy dog."; return <div className="macDemo macFontExhibit"><div className="macControlRow">{Object.keys(fontFamilies).map((name) => <button type="button" key={name} aria-pressed={font === name} onClick={() => setFont(name)}>{name}</button>)}</div><pre style={{ fontFamily: fontFamilies[font] }}>{sample}</pre><small>英字の字幅と画面上の表情を比べる展示です。日本語は当時の標準英字フォントとは別の代替表示です。</small></div>; }

function MacWriteDemo() { const [size, setSize] = useState(12); const [bold, setBold] = useState(false); const [printed, setPrinted] = useState(false); return <div className="macDemo macWriteExhibit"><div className="macWriteRuler">0　　　　1　　　　2　　　　3</div><div className="macControlRow"><button type="button" aria-pressed={bold} onClick={() => setBold((value) => !value)}>B</button><button type="button" onClick={() => setSize((value) => Math.min(18, value + 1))}>大きく</button><button type="button" onClick={() => setSize((value) => Math.max(9, value - 1))}>小さく</button><button type="button" onClick={() => setPrinted(true)}>Print…</button></div><p contentEditable suppressContentEditableWarning style={{ fontSize: `${size}px`, fontWeight: bold ? 700 : 400 }}>MacWrite is a WYSIWYG word processor. Select, arrange, and print the document as you see it.</p><output>{printed ? "PRINTING — 表示した組版を印刷へ渡す考え方" : "MacWrite (1984): 画面上の文書を印刷結果へ近づける"}</output></div>; }

function PixelIconsDemo() { const [pixels, setPixels] = useState(() => new Set([18, 21, 37, 42, 50, 53, 68, 69, 70, 71, 84, 87, 101, 102])); return <div className="macDemo macPixelDemo"><div>{Array.from({ length: 256 }, (_, index) => <button type="button" key={index} aria-label={`ピクセル ${index + 1}`} aria-pressed={pixels.has(index)} onClick={() => setPixels((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} />)}</div><p>16 × 16 / 独自図案。実在アイコンの複製ではありません。</p></div>; }

function ChoiceDemo({ labels, note }: { labels: readonly string[]; note: readonly string[] }) { const [selected, setSelected] = useState(0); return <div className="macDemo macChoiceDemo"><div>{labels.map((label, index) => <button key={label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{label}</button>)}</div><output aria-live="polite"><strong>{labels[selected]}</strong>{note[selected]}</output></div>; }

function MultiFinderDemo() { const [front, setFront] = useState<"MacWrite" | "Clock">("MacWrite"); const [tick, setTick] = useState(0); useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), front === "Clock" ? 700 : 2400); return () => window.clearInterval(timer); }, [front]); return <div className="macDemo macMultiFinderExhibit"><div className="macFinderMenuBar"><b>{front}</b><span>{front === "MacWrite" ? "File Edit Font Style" : "File Edit View"}</span></div><FinderWindow title="MacWrite" front={front === "MacWrite"} onFront={() => setFront("MacWrite")} rect={{ x: 16, y: 38, width: 195, height: 118 }}><p>Document editing</p></FinderWindow><FinderWindow title="Clock" front={front === "Clock"} onFront={() => setFront("Clock")} rect={{ x: 136, y: 76, width: 124, height: 76 }}><p>10:{String(35 + tick).padStart(2, "0")}</p></FinderWindow><output>MultiFinder (1987): 協調的マルチタスクの簡略展示。MacWriteが前面の間、背景時計は更新を遅くしています。</output></div>; }

function BalloonDemo() { const [tip, setTip] = useState("要素を選ぶと説明が出ます。"); const parts = [["□", "閉じるボックス"], ["▤", "タイトルバー"], ["◢", "Grow box"]]; return <div className="macDemo macBalloonDemo"><div>{parts.map(([label, text]) => <button type="button" key={label} onFocus={() => setTip(text)} onPointerEnter={() => setTip(text)} onClick={() => setTip(text)}>{label}</button>)}</div><output role="status">{tip}: 操作部品をその場で説明するSystem 7のBalloon Helpを参考にしています。</output></div>; }

function ColorDemo() { const [color, setColor] = useState(false); return <div className="macDemo macColorComparison"><FinderSurface color={color} /><p><strong>{color ? "初期カラーMac環境" : "1-bit白黒"}</strong>{color ? "Macintosh II（1987）以降のカラー表示を、アイコン・警告・選択の識別用途として独自に比較しています。" : "初代Macintoshの白黒表示を参考にしています。"}</p><button type="button" aria-pressed={color} onClick={() => setColor((value) => !value)}>{color ? "1-bit白黒へ" : "Macintosh IIカラーへ"}</button></div>; }

function SoundDemo() { const play = (frequency: number) => { const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext; const context = new Ctor(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.05, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .21); oscillator.addEventListener("ended", () => void context.close()); }; return <div className="macDemo macSoundDemo"><p>実機音源は使わず、操作時だけ独自合成音を再生します。</p><button type="button" onClick={() => play(320)}>起動の合図</button><button type="button" onClick={() => play(150)}>警告</button></div>; }

function TransitionDemo() { const [gui, setGui] = useState(50); return <div className="macDemo macTransitionDemo"><div><section style={{ opacity: (100 - gui) / 100 + .25 }}><strong>APPLE II</strong><code>&gt; LIST<br />10 PRINT &quot;HELLO&quot;<br />&gt; RUN</code></section><span>→</span><section style={{ opacity: gui / 100 + .25 }}><strong>MACINTOSH</strong><FinderSurface compact /></section></div><input type="range" min="0" max="100" value={gui} onChange={(event) => setGui(Number(event.target.value))} aria-label="文字操作からGUI操作への変化" /><a href="#apple-early-room-title">Apple II展示室へ戻る</a></div>; }

function ExhibitDemo({ type, active, reduced }: { type: MacintoshDemoType; active: boolean; reduced: boolean }) { switch (type) { case "boot": return <BootDemo active={active} reduced={reduced} />; case "status": return <StatusDemo />; case "disk": return <DiskDemo reduced={reduced} />; case "desktop": case "icons": case "trash": return <FinderDemo />; case "window": return <WindowDemo />; case "menu": return <FinderDemo />; case "pointer": return <PointerDemo />; case "scroll": return <ScrollDemo />; case "accessories": return <AccessoriesDemo />; case "paint": return <PaintDemo />; case "write": return <MacWriteDemo />; case "fonts": return <FontDemo />; case "pixel-icons": return <PixelIconsDemo />; case "systems": return <ChoiceDemo labels={["System 1", "System 2", "System 3", "System 4", "System 5", "System 6"]} note={["Finderと単一アプリの直接操作", "Finder操作の整備", "階層ファイルの改善", "大きな記憶装置への対応", "MultiFinderを導入", "安定した日常環境"]} />; case "multifinder": return <MultiFinderDemo />; case "system-seven": return <ChoiceDemo labels={["Color UI", "Alias", "Balloon Help", "MultiFinder"]} note={["System 7のカラーUI。Macintosh IIのカラー化とは年代を分けて扱います。", "別の場所の項目への参照", "画面上で操作を説明", "協調的マルチタスクを扱いやすくした環境"]} />; case "balloon": return <BalloonDemo />; case "machines": return <ChoiceDemo labels={["Macintosh 128K", "Macintosh 512K", "Macintosh Plus", "Macintosh SE", "Macintosh II", "Macintosh Classic"]} note={["GUIの入口", "メモリの余裕", "SCSIと拡張性", "内蔵ストレージ", "1987年のカラーMac", "一体型Macの再普及"]} />; case "color": return <ColorDemo />; case "sound": return <SoundDemo />; case "transition": return <TransitionDemo />; } }

export default function MacintoshBirthExhibitRoom() { const [open, setOpen] = useState(false); const [visible, setVisible] = useState(true); const [reduced, setReduced] = useState(false); const toggleRef = useRef<HTMLButtonElement>(null); useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(media.matches); const visibility = () => setVisible(document.visibilityState === "visible"); update(); visibility(); media.addEventListener("change", update); document.addEventListener("visibilitychange", visibility); return () => { media.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); }; }, []); const close = () => { setOpen(false); requestAnimationFrame(() => toggleRef.current?.focus()); };
  return <section className="roomCard roomCardMacintosh" aria-labelledby="macintosh-birth-room-title"><button ref={toggleRef} id="macintosh-birth-room-toggle" type="button" className="roomToggle" aria-expanded={open} aria-controls="macintosh-birth-room-panel" onClick={() => setOpen((value) => !value)}><span className="roomIndex">ROOM / 1984–1991</span><span className="roomTitle" id="macintosh-birth-room-title">Macintosh誕生展示室</span><span className="roomDescription">文字の世界から、直接操作するGUIへ</span><span className="roomMeta"><span>24 EXHIBITS</span><span>HISTORICAL UI RECONSTRUCTION</span></span><span className="roomArrow" aria-hidden="true">↓</span></button><div id="macintosh-birth-room-panel" className="roomPanel" data-open={open} role="region" aria-labelledby="macintosh-birth-room-toggle" aria-hidden={!open} inert={!open}><div className="roomPanelInner"><div className="macRoomBody"><header className="macRoomIntro"><p>PERIOD ROOM / 1984–1991</p><h3>小さな白黒画面で、直接操作を学ぶ</h3><p>初代MacintoshのSystem 1 / Finder 1.xを起点に、起動、ディスク待ち、Finder、ウィンドウ、MacPaintを順に体験します。実機の画像・ROM・システムファイル・音源は使わない、史実ベースの独自再構成です。</p><ol><li>POWER</li><li>HAPPY MAC</li><li>? DISK</li><li>FINDER</li><li>MACPAINT</li></ol></header><div className="macExhibitGrid">{macintoshBirthExhibits.map((exhibit, index) => <article className="macExhibit" key={exhibit.id} id={exhibit.id} aria-labelledby={`${exhibit.id}-title`}><header><span>{String(index + 1).padStart(2, "0")}</span><div><p>{exhibitContext[exhibit.demo] ?? exhibit.period} / 史実ベースの再構成</p><h4 id={`${exhibit.id}-title`}>{exhibit.title}</h4></div></header><p>{exhibit.summary}</p><ExhibitDemo type={exhibit.demo} active={open && visible} reduced={reduced} /><p className="macInteraction"><strong>キーボード／タッチ操作</strong>{exhibit.interaction}</p></article>)}</div><button type="button" className="roomClose macRoomClose" onClick={close}>展示室を閉じる</button></div></div></div></section>; }
