"use client";
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { fit, focusPoint, landmarks, pan, resize, scaleOf, visibleRect, worldAt, zoomAt, type View } from './pan-zoom-model';
import PanZoomWorld from './PanZoomWorld';
import './pan-zoom.css';

type Drag = { id: number; time: number; x: number; y: number; start: View; element: HTMLDivElement };
export default function PanZoom() {
  const surface = useRef<HTMLDivElement>(null), committed = useRef<View | null>(null), drag = useRef<Drag | null>(null);
  const lastMeasured = useRef<View | null>(null);
  const [view, setView] = useState<View | null>(null), [moving, setMoving] = useState(false);
  const [moveMode, setMoveMode] = useState(false), [selected, setSelected] = useState('');
  const [input, setInput] = useState('100'), [message, setMessage] = useState('図版の表示領域を測定しています。');
  function release(d: Drag | null) {
    if (d?.element.hasPointerCapture?.(d.id)) d.element.releasePointerCapture(d.id);
  }
  function cancel() {
    const d = drag.current; drag.current = null;
    release(d); setMoving(false); setView(committed.current);
  }
  function store(next: View | null) {
    if (next) lastMeasured.current = next;
    committed.current = next; setView(next); setInput(next ? (next.zoom * 100).toFixed(0) : '100');
  }
  function change(update: (v: View) => View | null, notice: string) {
    cancel();
    if (committed.current) { store(update(committed.current)); setMessage(notice); }
  }
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const width = element.clientWidth, height = element.clientHeight, current = committed.current;
      if (current?.width === width && current?.height === height) return;
      const old = current ?? lastMeasured.current;
      const d = drag.current; drag.current = null; release(d); setMoving(false);
      const next = old ? resize(old, width, height) : fit(width, height);
      if (next) lastMeasured.current = next;
      committed.current = next; setView(next); setInput(next ? (next.zoom * 100).toFixed(0) : '100');
      setMessage(next ? '表示領域に合わせました。操作できます。' : '表示領域が未取得です。表示後に再測定します。');
    };
    const rollback = () => {
      if (!drag.current) return;
      const d = drag.current; drag.current = null; release(d); setMoving(false); setView(committed.current);
      setMessage('移動を取り消しました。');
    };
    const visibility = () => { if (document.hidden) rollback(); };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener('blur', rollback); document.addEventListener('visibilitychange', visibility);
    return () => {
      alive = false; observer.disconnect(); window.removeEventListener('blur', rollback); document.removeEventListener('visibilitychange', visibility);
      const d = drag.current; drag.current = null; release(d);
    };
  }, []);
  function owner(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    return d && d.id === e.pointerId && e.timeStamp >= d.time ? d : null;
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current || !committed.current || e.button !== 0 || (e.pointerType !== 'mouse' && !moveMode)) return;
    // Prevent compatibility mouse focus changes on WebKit. Touch scrolling is gated by mode.
    e.preventDefault(); e.currentTarget.focus({ preventScroll: true });
    drag.current = { id: e.pointerId, time: e.timeStamp, x: e.clientX, y: e.clientY, start: committed.current, element: e.currentTarget };
    e.currentTarget.setPointerCapture(e.pointerId); setMoving(true);
  }
  const rect = view ? visibleRect(view) : null, center = view ? worldAt(view, { x: view.width / 2, y: view.height / 2 }) : null;
  const zoom = (factor: number) => change(v => zoomAt(v, v.zoom * factor), '中央の注目点を基準に倍率を変更しました。端では位置を補正します。');
  const shift = (dx: number, dy: number) => change(v => pan(v, dx, dy), '図版を移動しました。ミニマップの窓も確認してください。');
  return <div className="panZoom" data-testid="pan-zoom">
    <header><span>FIELD STUDY / 06 A-1</span><h4>小さな世界を、見失わずに。</h4><p>星見の観測所から庭、小川へ。図版を拡大し、目印の細部を探してみよう。実在の場所ではない独自制作の図版です。</p></header>
    <div className="pzTools">
      <button disabled={!view || view.zoom <= 1} onClick={() => zoom(1 / 1.5)} aria-label="縮小">−</button>
      <button disabled={!view || view.zoom >= 8} onClick={() => zoom(1.5)} aria-label="拡大">＋</button>
      <form onSubmit={e => {
        e.preventDefault(); cancel(); const value = input.trim() === '' ? NaN : Number(input);
        if (!Number.isFinite(value)) { setMessage('倍率は100〜800の数値で入力してください。'); setInput(committed.current ? (committed.current.zoom * 100).toFixed(0) : '100'); return; }
        change(v => zoomAt(v, value / 100), '中央を基準に倍率を適用しました。100〜800%の範囲に補正します。');
      }}><label>倍率（%）<input type="text" inputMode="decimal" value={input} onChange={e => setInput(e.target.value)} aria-describedby="pz-limits" /></label><button disabled={!view}>倍率を適用</button></form>
      <button disabled={!view} onClick={() => change(v => fit(v.width, v.height), '全体表示に戻しました。目印の選択と移動モードは保ちます。')}>全体表示</button>
      <button disabled={!view} onClick={() => { change(v => fit(v.width, v.height), 'Reset：全体表示・目印未選択・移動モードOFFに戻しました。'); setSelected(''); setMoveMode(false); }}>Reset</button>
    </div>
    <p id="pz-limits">100%（全体表示）〜800%。図版が窓より小さい方向は中央に置き、大きい方向は図版の端まで移動できます。端の位置補正は注目点の保持に優先します。</p>
    <div className="pzMode"><button aria-pressed={moveMode} onClick={() => { cancel(); setMoveMode(!moveMode); setMessage(moveMode ? '移動モードOFF。図版上でもページを縦スクロールできます。' : '移動モードON。図版内の1本指で移動。もう一度押すと解除します。'); }}>図版を移動：{moveMode ? 'ON' : 'OFF'}</button><p>タッチは初期OFFでページの縦スクロールを優先。ONで図版を1本指移動、同じボタンで解除。ブラウザのピンチ拡大は使えます。</p></div>
    <p id="pz-help">図版の操作領域にフォーカスして矢印キーで図版を移動。マウスはドラッグ、ダブルクリックした点を基準に拡大。Escapeで移動取消。＋／−と倍率入力は窓の中央が基準です。</p>
    <div ref={surface} className="pzViewport" role="group" aria-label="図版の操作領域" aria-describedby="pz-help" tabIndex={0}
      data-ready={!!view} data-dragging={moving} style={{ touchAction: moveMode ? 'pinch-zoom' : 'pan-y pinch-zoom' }}
      onPointerDown={down}
      onPointerMove={e => { const d = owner(e); if (d) setView(pan(d.start, e.clientX - d.x, e.clientY - d.y)); }}
      onPointerUp={e => { const d = owner(e); if (!d) return; drag.current = null; release(d); setMoving(false); store(pan(d.start, e.clientX - d.x, e.clientY - d.y)); setMessage('移動を確定しました。'); }}
      onPointerCancel={e => { if (owner(e)) { cancel(); setMessage('移動を取り消しました。'); } }}
      onLostPointerCapture={e => { if (owner(e)) { cancel(); setMessage('移動を取り消しました。'); } }}
      onDoubleClick={e => { const b = e.currentTarget.getBoundingClientRect(); change(v => zoomAt(v, v.zoom * 1.5, { x: e.clientX - b.left, y: e.clientY - b.top }), '指した点を基準に拡大しました。端では位置を補正します。'); }}
      onKeyDown={e => {
        if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.key === 'Escape') { if (drag.current) { e.preventDefault(); cancel(); setMessage('移動を取り消しました。'); } return; }
        const delta: Record<string, [number, number]> = { ArrowLeft: [-60, 0], ArrowRight: [60, 0], ArrowUp: [0, -60], ArrowDown: [0, 60] };
        if (delta[e.key]) { e.preventDefault(); shift(...delta[e.key]); }
      }}>
      {view ? <svg className="pzScene" width={view.width} height={view.height} aria-hidden="true"><g data-testid="pz-transform" transform={`translate(${view.x} ${view.y}) scale(${scaleOf(view)})`}><PanZoomWorld selected={selected} /></g></svg> : <p>表示領域を測定中です。</p>}
    </div>
    <div className="pzBelow"><div><div className="pzDirections" role="group" aria-label="図版の移動ボタン">{[['← 図版を左', -60, 0], ['↑ 図版を上', 0, -60], ['↓ 図版を下', 0, 60], ['→ 図版を右', 60, 0]].map(([label, dx, dy]) => <button disabled={!view} key={label} onClick={() => shift(Number(dx), Number(dy))}>{label}</button>)}</div>
      <p className="pzReading" data-testid="pz-reading">{view && center && rect ? `現在 ${Math.round(view.zoom * 100)}% / 中央 (${center.x.toFixed(0)}, ${center.y.toFixed(0)}) / 見える範囲 ${rect.width.toFixed(0)} × ${rect.height.toFixed(0)}` : '表示領域：未取得'}</p>
      <p>動かすのは図版です。図版を右へ動かすと、固定された窓は図版の左側を見ることになります。倍率が上がるほど見える範囲は狭くなり、右のミニマップの赤い窓も小さくなります。</p></div>
      <figure className="pzMini"><svg viewBox="0 0 1000 700" role="img" aria-label="全体図と現在の可視範囲"><PanZoomWorld /><rect data-testid="pz-visible" {...rect ?? { x: 0, y: 0, width: 0, height: 0 }} fill="#bd4d3e" fillOpacity=".12" stroke="#9d2920" strokeWidth="12" /></svg><figcaption>赤枠＝現在の窓（図版との交差範囲）</figcaption></figure></div>
    <p role="status" aria-live="polite">{message}</p>
    <h5>目印から探す</h5><ol className="pzLandmarks">{landmarks.map((m, i) => <li key={m.id}><div><strong>{String(i + 1).padStart(2, '0')} {m.name}{selected === m.id ? '（選択中）' : ''}</strong><p>{m.detail}</p></div><button disabled={!view} aria-label={`${m.name}：この場所を見る`} onClick={() => { change(v => focusPoint(v, m), `${m.name}を400%で表示しました。可能な範囲で中央に寄せ、端では補正します。`); setSelected(m.id); }}>この場所を見る</button></li>)}</ol>
    <p>全体表示は倍率・位置だけを戻します。Resetはさらに目印の選択と移動モードを解除。選択なし・モードOFFなら両者の結果は同じです。閉室・展示切替で状態を破棄します。保存・外部通信はありません。</p>
  </div>;
}
