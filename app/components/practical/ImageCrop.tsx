"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import CropGarden from './CropGarden';
import { equal, INITIAL, initialState, numeric, RATIOS, resize, transition, type Action, type Corner, type Ratio, type Rect, type Selection } from './image-crop-model';
import './image-crop.css';

const ratioLabels: Record<Ratio, string> = { free: '自由', square: '1:1', wide: '16:9', photo: '4:3' };
const corners: [Corner, string][] = [['nw', '左上'], ['ne', '右上'], ['sw', '左下'], ['se', '右下']];
const fields: [keyof Rect, string][] = [['x', 'X'], ['y', 'Y'], ['width', '幅'], ['height', '高さ']];
const strings = (s: Selection) => Object.fromEntries(fields.map(([k]) => [k, String(Number(s.rect[k].toFixed(6)))])) as Record<keyof Rect, string>;
const viewBox = (s: Selection) => `${s.rect.x} ${s.rect.y} ${s.rect.width} ${s.rect.height}`;
function CropResult({ selection, label, testId }: { selection: Selection; label: string; testId: string }) {
  return <figure className="icResult"><figcaption>{label} <span>{ratioLabels[selection.ratio]}</span></figcaption>
    <svg data-testid={testId} viewBox={viewBox(selection)} style={{ aspectRatio: `${selection.rect.width} / ${selection.rect.height}` }} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet"><CropGarden /></svg>
    <p>X {selection.rect.x.toFixed(1)} / Y {selection.rect.y.toFixed(1)} / {selection.rect.width.toFixed(1)} × {selection.rect.height.toFixed(1)}</p>
  </figure>;
}
export default function ImageCrop() {
  const [state, setState] = useState(initialState), current = useRef(initialState());
  const [inputs, setInputs] = useState(() => strings(INITIAL));
  const [ready, setReady] = useState(false), [message, setMessage] = useState('家と庭の構図が確定済みです。枠を動かして別の構図を探せます。');
  const surface = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), captured = useRef<{ element: HTMLDivElement; id: number } | null>(null);
  const dispatch = useCallback((action: Action) => {
    const next = transition(current.current, action); current.current = next; setState(next);
    if (action.type !== 'start' && !(action.type === 'pointer' && action.phase === 'move')) setInputs(strings(next.editing));
    if (!next.drag && captured.current) {
      const c = captured.current; captured.current = null;
      if (c.element.hasPointerCapture?.(c.id)) c.element.releasePointerCapture(c.id);
    }
  }, []);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    let alive = true, lastWidth = 0, lastHeight = 0;
    const measure = () => {
      if (!alive) return;
      const b = svg.current?.getBoundingClientRect(), width = b?.width ?? 0, height = b?.height ?? 0;
      if (width !== lastWidth || height !== lastHeight) { dispatch({ type: 'abort' }); lastWidth = width; lastHeight = height; }
      setReady(width > 0 && height > 0);
    };
    const abort = () => { if (current.current.drag) { dispatch({ type: 'abort' }); setMessage('ドラッグを取り消し、開始前の編集状態に戻しました。'); } };
    const hidden = () => { if (document.hidden) abort(); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && current.current.drag) { e.preventDefault(); abort(); } };
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    window.addEventListener('blur', abort); document.addEventListener('visibilitychange', hidden); document.addEventListener('keydown', escape);
    return () => {
      alive = false; observer.disconnect(); window.removeEventListener('blur', abort); document.removeEventListener('visibilitychange', hidden); document.removeEventListener('keydown', escape);
      current.current = { ...current.current, drag: null };
      const c = captured.current; captured.current = null;
      if (c?.element.hasPointerCapture?.(c.id)) c.element.releasePointerCapture(c.id);
    };
  }, [dispatch]);
  function point(e: ReactPointerEvent<HTMLDivElement>) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix || !Number.isFinite(matrix.a) || matrix.a <= 0) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    const target = e.target as Element, handle = target.closest<HTMLButtonElement>('[data-crop-handle]');
    if (!ready || current.current.drag || e.button !== 0 || (!handle && !target.hasAttribute('data-crop-drag'))) return;
    const p = point(e); if (!p) return;
    e.preventDefault(); (handle ?? e.currentTarget).focus({ preventScroll: true });
    dispatch({ type: 'start', id: e.pointerId, time: e.timeStamp, x: p.x, y: p.y, corner: handle?.dataset.cropHandle as Corner | undefined });
    try { e.currentTarget.setPointerCapture(e.pointerId); captured.current = { element: e.currentTarget, id: e.pointerId }; }
    catch { dispatch({ type: 'abort' }); setMessage('この入力のドラッグを開始できません。数値・方向ボタンを利用してください。'); }
  }
  function pointer(e: ReactPointerEvent<HTMLDivElement>, phase: 'move' | 'up' | 'cancel') {
    const d = current.current.drag;
    if (!d || d.id !== e.pointerId || e.timeStamp < d.time) return;
    const p = phase === 'cancel' ? { x: 0, y: 0 } : point(e);
    if (!p) { dispatch({ type: 'abort' }); return; }
    dispatch({ type: 'pointer', phase, id: e.pointerId, time: e.timeStamp, x: p.x, y: p.y });
    if (phase !== 'move') setMessage(phase === 'up' ? '枠を編集しました。確定すると確定結果に反映します。' : 'ドラッグを取り消し、開始前の編集状態に戻しました。');
  }
  const r = state.editing.rect, dirty = !equal(state.editing, state.committed), active = dirty || !!state.drag;
  const command = (action: Action, notice: string) => { dispatch(action); setMessage(notice); };
  const shift = (dx: number, dy: number) => command({ type: 'move', dx, dy }, '枠を元絵座標で10移動しました。端では止まります。');
  return <div className="imageCrop" data-testid="image-crop">
    <header><span>COMPOSITION STUDY / 06 A-2</span><h4>同じ庭から、別の物語。</h4><p>家、花壇、三日月橋、木立。何を残すかで絵の印象が変わります。元絵を削らず、枠だけを編集する独自図版の教材です。</p></header>
    <div className="icToolbar"><label>切抜き比率<select value={state.editing.ratio} onChange={e => command({ type: 'ratio', ratio: e.target.value as Ratio }, '中心をできるだけ保って比率を変更しました。元絵の端では補正します。')}>{Object.keys(RATIOS).map(k => <option key={k} value={k}>{ratioLabels[k as Ratio]}</option>)}</select></label>
      <button onClick={() => command({ type: 'confirm' }, '現在の枠と比率を確定しました。')} disabled={!active}>切抜きを確定</button>
      <button onClick={() => command({ type: 'cancel' }, '最後に確定した枠と比率へ戻しました。')} disabled={!active}>編集を取消</button>
      <button onClick={() => command({ type: 'reset' }, 'Reset：編集中・確定済みの両方を初期の家と庭へ戻しました。')}>Reset</button>
    </div>
    <p className="icState">{state.drag ? 'ドラッグ途中（仮の枠）' : dirty ? '未確定の編集があります' : '確定結果と同じ枠です'}。確定まで、確定結果は変わりません。</p>
    <div className="icWorkspace"><section><h5>01 元絵と切抜き枠</h5>
      <p id="ic-help">枠内をドラッグして移動。四隅で伸縮。枠の操作領域にフォーカスして矢印で10移動、ハンドル上の矢印で10伸縮。Escapeでドラッグ取消。</p>
      <div className="icMat"><div className="icCanvas" ref={surface} role="group" aria-label="切抜き枠の操作領域" aria-describedby="ic-help" tabIndex={0} data-ready={ready} data-dragging={!!state.drag}
        onPointerDown={down} onPointerMove={e => pointer(e, 'move')} onPointerUp={e => pointer(e, 'up')} onPointerCancel={e => pointer(e, 'cancel')} onLostPointerCapture={e => pointer(e, 'cancel')}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && current.current.drag) command({ type: 'abort' }, 'フォーカス移動によりドラッグを取り消しました。'); }}
        onKeyDown={e => {
          if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !ready) return;
          const delta: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
          if (!delta[e.key]) return;
          const handle = (e.target as HTMLElement).dataset.cropHandle as Corner | undefined;
          if (e.target !== e.currentTarget && !handle) return;
          e.preventDefault();
          if (handle) {
            const base = current.current.drag?.start ?? current.current.editing;
            // Use the same geometry as pointer resize, then discard any provisional gesture.
            command({ type: 'numeric', selection: resize(base, handle, ...delta[e.key]) }, 'ハンドルの位置を編集しました。');
          } else shift(...delta[e.key]);
        }}>
        <svg ref={svg} className="icSource" viewBox="0 0 1000 700" role="img" aria-label="家・花壇・橋・木立の元絵と編集中の枠">
          <CropGarden /><path data-testid="ic-shade" d={`M0 0H1000V700H0Z M${r.x} ${r.y}h${r.width}v${r.height}h-${r.width}Z`} fill="#142c30" fillOpacity=".30" fillRule="evenodd" pointerEvents="none" />
          <rect data-testid="ic-frame" data-crop-drag="" {...r} fill="transparent" stroke="#fff7cf" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          <rect {...r} fill="none" stroke="#305c60" strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        </svg>
        {corners.map(([corner, label]) => <button key={corner} type="button" className={`icHandle ${corner}`} data-crop-handle={corner} aria-label={`${label}の角を伸縮`} disabled={!ready} style={{ left: `${(r.x + (corner.endsWith('e') ? r.width : 0)) / 10}%`, top: `${(r.y + (corner.startsWith('s') ? r.height : 0)) / 7}%` }}><span aria-hidden="true">{corner === 'nw' || corner === 'se' ? '⤡' : '⤢'}</span></button>)}
      </div></div>
      {!ready && <p>表示領域が未取得です。図版が表示されるまでドラッグを停止しています。枠と確定結果は保持します。</p>}
      <div className="icDirections" role="group" aria-label="枠の移動ボタン">{[['← 左', -10, 0], ['↑ 上', 0, -10], ['↓ 下', 0, 10], ['→ 右', 10, 0]].map(([label, dx, dy]) => <button key={label} onClick={() => shift(Number(dx), Number(dy))}>{label}</button>)}</div>
    </section><section className="icResults"><h5>02 枠の中に残る構図</h5><CropResult selection={state.editing} label="編集中のプレビュー" testId="ic-preview" /><CropResult selection={state.committed} label="確定した結果" testId="ic-confirmed" /></section></div>
    <form className="icNumbers" onSubmit={e => {
      e.preventDefault(); const base = current.current.drag?.start ?? current.current.editing;
      const result = numeric(inputs, base.ratio); dispatch({ type: 'abort' });
      if (result.selection) command({ type: 'numeric', selection: result.selection }, '数値を適用しました。確定結果はまだ変わりません。');
      else setMessage(result.error!);
    }}><fieldset><legend>元絵の座標で編集（1000 × 700）</legend><p id="ic-number-help">幅・高さは80以上。自由比率は4項目を編集、固定比率は幅から高さが連動します。枠全体が元絵の内側に収まる値で「数値を適用」。入力中は枠を動かしません。</p>
      <div>{fields.map(([key, label]) => <label key={key}>{label}<input type="text" inputMode="decimal" value={inputs[key]} readOnly={key === 'height' && state.editing.ratio !== 'free'} aria-describedby="ic-number-help" onChange={e => setInputs(old => {
        const next = { ...old, [key]: e.target.value }, ratio = RATIOS[state.editing.ratio];
        if (key === 'width' && ratio) next.height = e.target.value.trim() && Number.isFinite(Number(e.target.value)) ? String(Number((Number(e.target.value) / ratio).toFixed(6))) : '';
        return next;
      })} /></label>)}<button>数値を適用</button></div>
    </fieldset></form>
    <p role="status" aria-live="polite">{message}</p>
    <p>確定＝今の枠と比率を結果に反映。取消＝最後の確定へ。Reset＝両方を初期値へ。別の操作中は途中のドラッグを取り消してから実行します。元絵は変わりません。閉室・展示切替で初期化。保存・書出し・通信はありません。</p>
  </div>;
}
