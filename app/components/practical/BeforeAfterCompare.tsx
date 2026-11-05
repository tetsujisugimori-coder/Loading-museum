"use client";
/* These local SVG studies use native img load/error events; no image optimization service. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { compareTransition, initialCompare, percentAt, valueOf, type CompareAction, type Mode, type Pair } from './compare-model';
import './before-after-compare.css';

export const comparePairs = {
  restoration: {
    name: '港のアトリエ — 修復の図版', before: '修復前', after: '修復後',
    description: '同じ屋根・窓・入口を目印に、屋根の欠け、壁のひび、割れた窓が直り、窓辺に花が増えた様子を探してください。',
    alt: '海辺の三角屋根のアトリエ。中央の入口、左右の窓、左の木と右のベンチが同じ位置にある景観。',
  },
  correction: {
    name: '窓辺の光 — 写真補正の図版', before: '補正前', after: '補正後',
    description: '窓枠・植木鉢・カップの位置は同じ。暗く青みがかった低コントラストの絵から、明るく暖かな色と鮮やかな鉢へ変わります。写真補正を模した図版です。',
    alt: '大きな窓の前のテーブル。左に植木鉢、中央にカップ、右に本。山と太陽が窓越しに見える静物。',
  },
};
const modes: [Mode, string][] = [['split', 'Split / 境界'], ['overlay', 'Overlay / 透明度'], ['side', 'Side-by-Side / 並列']];
const basePath = process.env.NODE_ENV === 'production' ? '/Loading-museum' : '';

export default function BeforeAfterCompare() {
  const [state, setState] = useState(initialCompare), current = useRef(initialCompare());
  const canvas = useRef<HTMLDivElement>(null), root = useRef<HTMLDivElement>(null);
  const capture = useRef<{ element: HTMLDivElement; id: number } | null>(null);
  const anchor = useRef<{ x: number; value: number; width: number } | null>(null);
  const [message, setMessage] = useState('50%から見比べられます。独自制作した架空の図版です。');
  const dispatch = useCallback((action: CompareAction) => {
    const next = compareTransition(current.current, action); current.current = next; setState(next);
    if (!next.drag) anchor.current = null;
    if (!next.drag && capture.current) {
      const c = capture.current; capture.current = null;
      if (c.element.hasPointerCapture?.(c.id)) c.element.releasePointerCapture(c.id);
    }
  }, []);
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    let alive = true, width = -1, height = -1;
    const measure = () => {
      if (!alive) return;
      const box = node.getBoundingClientRect();
      if (box.width !== width || box.height !== height) {
        width = box.width; height = box.height;
        dispatch({ type: 'measure', ready: width > 0 && height > 0 });
      }
    };
    const interrupt = () => {
      if (current.current.drag || current.current.playback === 'playing') {
        dispatch({ type: 'pause' }); setMessage('表示・フォーカスの変化で中断しました。再生位置は保持し、途中のドラッグは取り消しました。');
      }
    };
    const hidden = () => { if (document.hidden) interrupt(); };
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && current.current.drag) { e.preventDefault(); dispatch({ type: 'abort' }); setMessage('ドラッグを取り消し、開始前の比較位置へ戻しました。'); }
    };
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => { dispatch({ type: 'reduced', reduced: media.matches }); setMessage(media.matches ? '動きを減らす設定：自動比較はAfterへ即時切替。手動比較は使えます。' : '手動比較と自動比較を使えます。'); };
    const observer = new ResizeObserver(measure), visibility = new IntersectionObserver(entries => { if (entries.some(e => !e.isIntersecting)) interrupt(); });
    observer.observe(node); if (root.current) visibility.observe(root.current); measure(); motion();
    media.addEventListener('change', motion); window.addEventListener('blur', interrupt);
    document.addEventListener('visibilitychange', hidden); document.addEventListener('keydown', escape);
    return () => {
      alive = false; observer.disconnect(); visibility.disconnect(); media.removeEventListener('change', motion);
      window.removeEventListener('blur', interrupt); document.removeEventListener('visibilitychange', hidden); document.removeEventListener('keydown', escape);
      current.current = compareTransition(current.current, { type: 'abort' });
      const c = capture.current; capture.current = null;
      if (c?.element.hasPointerCapture?.(c.id)) c.element.releasePointerCapture(c.id);
    };
  }, [dispatch]);
  const animationId = state.animation?.id, playing = state.playback === 'playing';
  useEffect(() => {
    if (!playing || animationId === undefined) return;
    let alive = true, frame = 0, previous = performance.now();
    const tick = (now: number) => {
      if (!alive) return;
      dispatch({ type: 'tick', id: animationId, delta: Math.max(0, now - previous) }); previous = now;
      if (current.current.playback === 'playing' && current.current.animation?.id === animationId) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(frame); };
  }, [playing, animationId, dispatch]);

  const command = (action: CompareAction, notice: string) => { dispatch(action); setMessage(notice); };
  const manual = (value: number) => command({ type: 'manual', value }, '手動の比較位置を適用しました。自動比較は停止しています。');
  function key(e: KeyboardEvent<HTMLElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const step = e.shiftKey ? 10 : 1, value = valueOf(current.current);
    const next: Record<string, number> = { ArrowLeft: value - step, ArrowDown: value - step, ArrowRight: value + step, ArrowUp: value + step, Home: 0, End: 100 };
    if (e.key in next) { e.preventDefault(); manual(next[e.key]); }
  }
  function point(e: PointerEvent<HTMLDivElement>) {
    const a = anchor.current;
    if (a && current.current.drag) return percentAt(e.clientX, a.x - a.value * a.width / 100, a.width);
    const box = canvas.current?.getBoundingClientRect(); return box ? percentAt(e.clientX, box.left, box.width) : null;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || current.current.drag || current.current.mode !== 'split') return;
    const handle = (e.target as Element).closest<HTMLElement>('[data-compare-handle]');
    if (e.pointerType !== 'mouse' && !handle) return; // The image remains a normal vertical scroll surface.
    const box = canvas.current?.getBoundingClientRect(); if (!box || box.width <= 0) return;
    const value = handle ? current.current.position : point(e); if (value === null) return;
    dispatch({ type: 'start', id: e.pointerId, time: e.timeStamp, value });
    if (!current.current.drag) return;
    if (handle) anchor.current = { x: e.clientX, value, width: box.width };
    e.preventDefault(); (handle ?? canvas.current?.querySelector<HTMLElement>('[data-compare-handle]'))?.focus({ preventScroll: true });
    try { e.currentTarget.setPointerCapture(e.pointerId); capture.current = { element: e.currentTarget, id: e.pointerId }; }
    catch { command({ type: 'abort' }, 'ドラッグを開始できませんでした。下のスライダーかキーボードを利用できます。'); }
  }
  function pointer(e: PointerEvent<HTMLDivElement>, phase: 'move' | 'up' | 'cancel') {
    const d = current.current.drag; if (!d || d.id !== e.pointerId || e.timeStamp < d.time) return;
    const value = phase === 'cancel' ? 0 : point(e);
    if (value === null) { dispatch({ type: 'abort' }); return; }
    dispatch({ type: 'pointer', id: e.pointerId, time: e.timeStamp, value, phase });
    if (phase !== 'move') setMessage(phase === 'up' ? '比較境界を変更しました。' : 'ドラッグを取り消しました。');
  }
  const pair = comparePairs[state.pair], top = state.reversed ? 'before' : 'after', bottom = state.reversed ? 'after' : 'before';
  const label = (which: 'before' | 'after') => `${which === 'before' ? 'Before' : 'After'} / ${pair[which]}`;
  const usable = state.ready && state.loaded.every(Boolean) && !state.error;
  const value = valueOf(state), rounded = Math.round(value), playback = { idle: '停止中', playing: '再生中', paused: '一時停止', finished: '終端 / After全面' }[state.playback];
  const asset = (which: 'before' | 'after', index: 0 | 1) => <img key={`${state.resource}-${which}`} draggable={false}
    src={`${basePath}/compare/${state.pair}-${which}.svg`} width={1200} height={760} alt={`${label(which)}。${pair.alt} ${pair.description}`}
    // SVG source coordinates are declared by the assets, not by the UA's reported natural size.
    // WebKit reports 300×190 for these valid 1200×760 SVGs. Require successful rendering, not that API's exact size.
    onLoad={e => dispatch({ type: 'asset', resource: state.resource, index, ok: e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalHeight > 0 })}
    onError={() => dispatch({ type: 'asset', resource: state.resource, index, ok: false })} />;
  return <div className="beforeAfterCompare" ref={root} data-testid="before-after-compare" data-mode={state.mode} data-playback={state.playback} data-resource={state.resource} data-reduced={state.reduced}>
    <header><span>COMPARISON STUDY / 06 A-3</span><h4>同じ場所に、変化が見える。</h4><p>重ねて、透かして、並べて。図版を動かさず、2枚の違いを探す比較装置です。</p></header>
    <div className="bcPairRow"><label>比較する図版<select value={state.pair} onChange={e => command({ type: 'pair', pair: e.target.value as Pair }, '図版を切り替えました。比較値は50%、配置は初期状態です。')}>{Object.entries(comparePairs).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label><span>独自制作の架空図版<br />歴史写真・修復資料ではありません</span></div>
    <figure className="bcFigure"><div className="bcCanvas" ref={canvas} data-testid="bc-canvas" data-mode={state.mode} data-ready={usable} data-dragging={!!state.drag} role="group" aria-label={pair.name} aria-describedby="bc-description"
      onPointerDown={down} onPointerMove={e => pointer(e, 'move')} onPointerUp={e => pointer(e, 'up')} onPointerCancel={e => pointer(e, 'cancel')} onLostPointerCapture={e => pointer(e, 'cancel')}
      onBlur={e => { if (current.current.drag && !e.currentTarget.contains(e.relatedTarget as Node | null)) dispatch({ type: 'abort' }); }}>
      <div className="bcLayer bcBase" data-testid="bc-base">{asset(state.mode === 'side' ? (state.reversed ? 'after' : 'before') : bottom, 0)}</div>
      <div className="bcLayer bcTop" data-testid="bc-top" style={{ clipPath: state.mode === 'split' ? `inset(0 ${100 - value}% 0 0)` : 'none', opacity: state.mode === 'overlay' ? value / 100 : 1 }}>{asset(state.mode === 'side' ? (state.reversed ? 'before' : 'after') : top, 1)}</div>
      <div className="bcLabels" aria-hidden="true"><span>{state.mode === 'side' ? label(state.reversed ? 'after' : 'before') : state.mode === 'overlay' ? `上：${label(top)}` : label(top)}</span><span>{state.mode === 'side' ? label(state.reversed ? 'before' : 'after') : state.mode === 'overlay' ? `下：${label(bottom)}` : label(bottom)}</span></div>
      {state.mode === 'split' && <><div className="bcBoundary" data-testid="bc-boundary" style={{ left: `${value}%` }} />
        <div className="bcHandle" data-compare-handle="" role="slider" aria-label="比較境界" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rounded} aria-valuetext={`${label(top)}の面積 ${rounded}%`} aria-orientation="horizontal" aria-disabled={!usable} aria-describedby="bc-help" tabIndex={usable ? 0 : -1} onKeyDown={key} style={{ left: `clamp(24px, ${value}%, calc(100% - 24px))` }}><span aria-hidden="true">↔</span></div></>}
    </div><figcaption id="bc-description">{pair.description}</figcaption></figure>
    {state.error ? <div role="alert">図版を表示できません。比較は停止しています。<button onClick={() => command({ type: 'pair', pair: state.pair }, '図版を再読込しています。')}>図版を再読込</button></div> : !usable && <p role="status">図版の表示と寸法を確認しています。</p>}
    <div className="bcModes" role="group" aria-label="比較モード">{modes.map(([mode, name]) => <button key={mode} aria-pressed={state.mode === mode} onClick={() => command({ type: 'mode', mode }, 'モードを変更しました。各モードの比較値を保持し、自動比較は停止しました。')}>{name}</button>)}</div>
    {state.mode !== 'side' && <label className="bcRange">{state.mode === 'split' ? `${label(top)}の見える面積` : `${label(top)}の重なり（不透明度）`}<output data-testid="bc-value" aria-live="off">{rounded}%</output><input type="range" aria-label={state.mode === 'split' ? '比較位置' : '比較透明度'} min={0} max={100} step={1} value={value} disabled={!usable} onPointerDown={() => dispatch({ type: 'pause' })} onChange={e => manual(Number(e.target.value))} onKeyDown={key} aria-valuetext={`${label(top)} ${rounded}%`} /></label>}
    <div className="bcTransport"><button onClick={() => command({ type: state.playback === 'playing' ? 'pause' : 'play' }, state.playback === 'playing' ? '一時停止しました。比較位置を保持しています。' : state.reduced ? '動きを省略してAfter全面にしました。' : '現在の位置からAfterへ自動比較します。')} disabled={!usable || state.mode === 'side'}>{state.playback === 'playing' ? '一時停止' : state.playback === 'paused' ? '再開' : '自動比較'}</button>
      <button onClick={() => command({ type: 'replay' }, state.reduced ? '動きを省略してAfter全面にしました。' : 'Replay：Before全面からAfterへ比較します。')} disabled={!usable || state.mode === 'side'}>Replay</button>
      <label>再生速度<select value={state.speed} disabled={state.mode === 'side' || state.reduced} onChange={e => command({ type: 'speed', speed: Number(e.target.value) }, '速度を変更して一時停止しました。再開できます。')}><option value={.5}>0.5× / ゆっくり</option><option value={1}>1× / 6秒</option><option value={2}>2× / 速く</option></select></label>
      <button onClick={() => command({ type: 'swap' }, 'BeforeとAfterの配置を交換しました。比較値は変わりません。')}>Before / Afterを反転</button>
      <button onClick={() => command({ type: 'reset' }, 'Reset：比較値50%、初期配置、速度1×へ戻しました。図版とモードは保持します。')}>Reset</button></div>
    <p className="bcState" data-testid="bc-state">{state.mode === 'side' ? '並列表示 / 自動比較は境界・透明度モードで使えます' : `${playback} / ${state.mode === 'split' ? '左の面積' : '上の不透明度'} ${rounded}%`}{state.drag ? ' / ドラッグ途中' : ''}{state.reduced ? ' / 動きを減らす設定' : ''}</p>
    <p role="status" aria-live="polite">{message}</p>
    <p id="bc-help">境界の丸いハンドルを左右へドラッグ。画像の上では縦スクロールできます。スライダーや境界にフォーカスし、矢印で1%、Shift＋矢印で10%、Home / Endで両端へ。Escapeでドラッグ取消。手動操作・表示幅の変化・画面非表示で自動比較は停止します。</p>
    <details><summary>比較装置のしくみ</summary><p>2枚は1200 × 760の同じ座標に固定。Splitは左側のマスク、Overlayは上の図版の不透明度だけを変えます。0%は下の図版、100%は上の図版の全面です。反転しても数値は保持し、自動比較はBeforeからAfterへ進みます。並列は同じ倍率で全体を表示します。</p><p>Pan &amp; Zoomは画像全体の拡大と移動、Image Cropは残す領域の選択と確定、Diff Viewerはテキスト差分。この展示は画像を加工せず2枚の変化を観察します。Resetは両モードの値と配置を初期化。閉室・展示切替は初期状態へ。保存・アップロードはありません。</p></details>
  </div>;
}
