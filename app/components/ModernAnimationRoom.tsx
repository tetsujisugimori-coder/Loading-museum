"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { modernExhibits } from "../data/modernExhibits";
import "./modern.css";

type Id = typeof modernExhibits[number]["id"];

function Player({ id }: { id: Id }) {
  const [amount, setAmount] = useState(35);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(true);
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const [strike, setStrike] = useState(-1);
  const [word, setWord] = useState("DRIFT");
  const [visible, setVisible] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => { void audio.current?.close(); }, []);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (id !== 'lens' && event.buttons === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setX(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)));
    setY(Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)));
    if (id === 'unwoven' || id === 'paper') setAmount(Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))));
  }
  function play(i: number) {
    setStrike(i);
    if (!sound || !audio.current) return;
    const ctx = audio.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 261.63 * Math.pow(2, i / 12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.8);
  }
  async function enableSound() {
    try { const ctx = audio.current ?? new AudioContext(); audio.current = ctx; await ctx.resume(); setSound(ctx.state === 'running'); setSoundError(ctx.state !== 'running'); } catch { setSound(false); setSoundError(true); }
  }
  function reset() { setAmount(35); setX(50); setY(50); setOpen(false); setRunning(true); setStrike(-1); setWord('DRIFT'); }
  return <div className="modernPlayer">
    <div ref={stage} className={`modernStage ${id}`} data-running={running && visible} onPointerMove={move} onPointerDown={e => { if (id === 'lens' || id === 'paper' || id === 'unwoven') { e.currentTarget.setPointerCapture(e.pointerId); move(e); } }}>
      {id === 'unwoven' && <div className="weave">{Array.from({length: 16}, (_, i) => <div key={i} className="thread" style={{ backgroundPosition: `center ${i * 100 / 15}%`, transform: `translateX(${(i % 2 ? 1 : -1) * amount * (0.4 + (i % 5) / 5)}%)` }} />)}</div>}
      {id === 'paper' && <div className="paperShape" style={{ transform: `perspective(500px) rotateX(${amount * .55}deg) rotateY(${(x - 50) * .5}deg) scale(${1 - amount * .004})` }}><span>UNFOLD<br/>AN IDEA</span></div>}
      {id === 'lens' && <><div className="lensArt muted"/><div className="lensArt colored" style={{clipPath: `inset(max(0px, calc(${y}% - ${amount}px)) max(0px, calc(${100-x}% - ${amount}px)) max(0px, calc(${100-y}% - ${amount}px)) max(0px, calc(${x}% - ${amount}px)))`}}/><div className="lensFrame" style={{left:`${x}%`,top:`${y}%`,width:`${amount * 2}px`}} /></>}
      {id === 'drift' && <div className="driftStack">{Array.from({length: 7}, (_, i) => <span key={i} style={{transform:`translate(${i * amount / 12}px, ${i * amount / 18}px) rotate(${i * amount / 80}deg)`, opacity: 1-i*.1}}>{word || ' '}</span>)}</div>}
      {id === 'glass' && <div className="glassKeys">{Array.from({length: 8}, (_, i) => <button key={i} aria-label={`${i+1}番の音`} className={strike === i ? 'struck' : ''} style={{height:`${45+i*5}%`, '--hue': 175+i*19} as React.CSSProperties} onClick={() => play(i)} onAnimationEnd={() => setStrike(-1)} />)}</div>}
      {id === 'clip' && <div className={`clipPanel ${open ? 'isOpen' : ''}`}><span>COLLECTION</span><span>ART</span><span>MOTION</span><span>ABOUT</span></div>}
    </div>
    {soundError && <p role="status">音声を開始できませんでした。端末の音声設定を確認し、もう一度お試しください。</p>}
    <div className="modernControls">
      {(id === 'unwoven' || id === 'paper' || id === 'lens' || id === 'drift') && <label>{id === 'lens' ? 'レンズの大きさ' : id === 'drift' ? '残像の広がり' : '変形量'} <input type="range" min="0" max="100" value={amount} onChange={e => setAmount(Number(e.target.value))}/></label>}
      {id === 'drift' && <label>文字 <input maxLength={12} value={word} onChange={e => setWord(e.target.value)} /></label>}
      {id === 'clip' && <button onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '閉じる' : '開く'}</button>}
      {id === 'glass' && <button onClick={() => { if (sound) { setSound(false); } else void enableSound(); }}>{sound ? '音を無効にする' : '音を有効にする'}</button>}
      <button onClick={() => setRunning(!running)}>{running ? '動きを止める' : '動きを再開'}</button><button onClick={reset}>リセット</button>
    </div>
  </div>;
}

export default function ModernAnimationRoom() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Id | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const filtered = modernExhibits.filter(item => `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const item = modernExhibits.find(entry => entry.id === selected);
  return <section className="modernRoom" aria-labelledby="modern-title"><h2 id="modern-title">現代アニメーション常設展</h2><p>原典のアイデアを独自の小さな実験として再構成しました。</p><button onClick={() => setRoomOpen(!roomOpen)} aria-expanded={roomOpen}>{roomOpen ? '展示室を閉じる' : '展示室を開く'}</button>
    {roomOpen && <><label className="modernSearch">作品名・タグで探す <input value={query} onChange={e => setQuery(e.target.value)} /></label><div className="modernList">{filtered.map(entry => <button key={entry.id} onClick={() => setSelected(entry.id)} aria-pressed={selected === entry.id}>{entry.title}</button>)}</div>{filtered.length === 0 && <p>該当する作品はありません。</p>}
      {item && filtered.some(entry => entry.id === item.id) && <article className="modernExhibit"><p>OBJECT {item.id} / 2026</p><h3>{item.title}</h3><Player key={item.id} id={item.id}/><p>{item.note}</p><p>タグ：{item.tags.join(' / ')}</p><p>原典：<a href={item.url} target="_blank" rel="noreferrer">{item.author} / Codrops</a></p></article>}</>}
  </section>;
}
