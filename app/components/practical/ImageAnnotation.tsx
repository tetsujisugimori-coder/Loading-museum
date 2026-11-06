"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react';
import { SCENES, initialState, transition, visibleAnnotations, containedRect, clientToImage, canEdit, formatAnnotation, numericAnnotation, validateAnnotation, moveAnnotation, guideAnnotations, type Gesture, type Annotation, type SceneId } from './annotation-model';
import './image-annotation.css';

type Tool = 'select' | Annotation['kind'];
type Action = Parameters<typeof transition>[1];
const kinds: [Tool, string, string][] = [['select', '↖︎', '移動'], ['pin', '●', 'ピン'], ['arrow', '↗︎', '矢印'], ['rect', '□', '範囲'], ['text', 'T', '説明文']];
const basePath = process.env.NODE_ENV === 'production' ? '/Loading-museum' : '';
const colors = ['#b95a3d', '#286e68', '#8256a1', '#986b16'];
const typeNames = { pin: 'ピン', arrow: '矢印', rect: '範囲', text: '説明文' };

function Editor({ annotation, annotations, apply }: { annotation: Annotation; annotations: Annotation[]; apply: (patch: Partial<Annotation>) => void }) {
  const [fields, setFields] = useState(() => ({ ...formatAnnotation(annotation), title: annotation.title, description: annotation.description, number: String(annotation.number), color: annotation.color, stroke: String(annotation.stroke), targetId: annotation.targetId ?? '' }));
  const [error, setError] = useState('');
  const change = (key: keyof typeof fields, value: string) => { setFields(f => ({ ...f, [key]: value })); setError(''); };
  function submit(e: FormEvent) {
    e.preventDefault(); const parsed = numericAnnotation(annotation, fields);
    if (!parsed.annotation) { setError(parsed.error ?? '数値を確認してください。'); return; }
    const next = { ...parsed.annotation, title: fields.title, description: fields.description, number: fields.number.trim() ? Number(fields.number) : NaN, color: fields.color, stroke: fields.stroke.trim() ? Number(fields.stroke) : NaN, targetId: fields.targetId || undefined };
    const invalid = validateAnnotation(next, annotations); if (invalid) { setError(invalid); return; }
    apply(next); setError('');
  }
  return <form className="iaEditor" onSubmit={submit} noValidate data-testid="ia-editor">
    <label>番号<input aria-label="注釈番号" inputMode="numeric" value={fields.number} onChange={e => change('number', e.target.value)} /></label>
    <label>タイトル<input aria-label="注釈タイトル" maxLength={100} value={fields.title} onChange={e => change('title', e.target.value)} /></label>
    <label className="iaFull">説明<textarea aria-label="注釈説明" maxLength={1500} rows={3} value={fields.description} onChange={e => change('description', e.target.value)} /></label>
    <label>色<select value={fields.color} onChange={e => change('color', e.target.value)} aria-label="注釈の色">{colors.map((c, i) => <option key={c} value={c}>{['朱色', '青緑', '紫', '黄土'][i]}</option>)}</select></label>
    <label>線の太さ<input aria-label="線の太さ" inputMode="decimal" value={fields.stroke} onChange={e => change('stroke', e.target.value)} /></label>
    {(['x', 'y', ...(annotation.kind === 'arrow' || annotation.kind === 'rect' ? ['x2', 'y2'] : [])] as ('x'|'y'|'x2'|'y2')[]).map(key => <label key={key}>{key.toUpperCase()} / 0–1<input aria-label={`座標 ${key}`} inputMode="decimal" value={fields[key]} onChange={e => change(key, e.target.value)} /></label>)}
    {annotation.kind === 'text' && <label className="iaFull">関連する地点・範囲<select aria-label="説明文の関連先" value={fields.targetId} onChange={e => change('targetId', e.target.value)}><option value="">関連なし</option>{annotations.filter(a => a.id !== annotation.id && ['pin', 'rect'].includes(a.kind)).map(a => <option key={a.id} value={a.id}>{a.number}. {a.title}</option>)}</select></label>}
    <p className="iaFull iaHelp">座標は画像の左上0、右下1。矩形はX/Yが左上、X2/Y2が右下、矢印は始点と終点です。入力は「変更を適用」で1回の履歴になります。</p>
    {error && <p role="alert" className="iaFull iaError">{error}</p>}
    <button className="iaFull iaPrimary" type="submit">変更を適用</button>
  </form>;
}

export default function ImageAnnotation() {
  const [state, setState] = useState(initialState), current = useRef(initialState());
  const [tool, setTool] = useState<Tool>('select'), [message, setMessage] = useState('完成済みの注釈から始めましょう。画像と注釈はこの画面だけで編集します。');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const root = useRef<HTMLDivElement>(null), canvas = useRef<SVGSVGElement>(null), alive = useRef(true);
  const capture = useRef<{ id: number; generation: number; node: SVGSVGElement } | null>(null);
  const returnToApply = useRef(false);
  const nextId = useRef(1), markerId = useId().replaceAll(':', ''), helpId = useId();
  const release = useCallback(() => { const c = capture.current; capture.current = null; if (c?.node.hasPointerCapture?.(c.id)) c.node.releasePointerCapture(c.id); }, []);
  const dispatch = useCallback((action: Action, notice?: string) => {
    if (!alive.current) return; const next = transition(current.current, action); current.current = next; setState(next);
    if (!next.gesture) release(); if (notice) setMessage(notice);
  }, [release]);
  const interrupt = useCallback(() => {
    const wasPlaying = current.current.guide.status === 'playing';
    if (current.current.gesture) dispatch({ type: 'abort' });
    if (wasPlaying) dispatch({ type: 'guide', command: 'pause' }, '表示が中断されたため、ガイドを一時停止しました。');
  }, [dispatch]);
  useEffect(() => {
    alive.current = true; const node = canvas.current; if (!node) return;
    let width = -1, height = -1;
    const measure = () => { if (!alive.current) return; const b = node.getBoundingClientRect(); if (b.width !== width || b.height !== height) { width = b.width; height = b.height; if (current.current.gesture) dispatch({ type: 'abort' }); if (width <= 0 || height <= 0) interrupt(); setSize({ width, height }); } };
    const observer = new ResizeObserver(measure); observer.observe(node); measure();
    const visibility = new IntersectionObserver(entries => { if (entries.some(e => !e.isIntersecting)) interrupt(); }); if (root.current) visibility.observe(root.current);
    const hidden = () => { if (document.hidden) interrupt(); };
    const escape = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape' && current.current.gesture) { e.preventDefault(); dispatch({ type: 'abort' }, '編集中のドラッグを取り消しました。確定済みの注釈は変わりません。'); canvas.current?.focus({ preventScroll: true }); } };
    const media = matchMedia('(prefers-reduced-motion: reduce)'); const sync = () => dispatch({ type: 'reduced', reduced: media.matches }); sync();
    media.addEventListener('change', sync); document.addEventListener('keydown', escape); document.addEventListener('visibilitychange', hidden); window.addEventListener('blur', interrupt);
    return () => { alive.current = false; release(); observer.disconnect(); visibility.disconnect(); media.removeEventListener('change', sync); document.removeEventListener('keydown', escape); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('blur', interrupt); };
  }, [dispatch, interrupt, release]);
  useEffect(() => {
    if (state.guide.status !== 'playing') return;
    const generation = state.guide.generation; const timer = window.setTimeout(() => dispatch({ type: 'tick', generation }), 3500);
    return () => clearTimeout(timer);
  }, [state.guide.status, state.guide.generation, dispatch]);

  useEffect(() => { if (returnToApply.current) { returnToApply.current = false; root.current?.querySelector<HTMLButtonElement>('.iaEditor button[type=submit]')?.focus({ preventScroll: true }); } }, [state.annotations]);

  const scene = SCENES[state.scene], editable = canEdit(state), ready = size.width > 0 && size.height > 0;
  const bounds = containedRect({ x: 0, y: 0, ...size }, scene), scale = bounds ? bounds.width / scene.width : 1;
  const annotations = visibleAnnotations(state), selected = state.annotations.find(a => a.id === state.selectedId);
  const ordered = guideAnnotations(state);
  const guiding = state.mode === 'view' && state.guide.status !== 'idle', guided = guiding ? ordered[state.guide.index] : undefined;
  const activeId = guided?.id ?? state.gesture?.original.id ?? state.selectedId;
  const renderAnnotations = [...annotations.filter(a => a.id !== activeId), ...annotations.filter(a => a.id === activeId)];
  const focusCanvas = () => canvas.current?.focus({ preventScroll: true });
  function point(e: PointerEvent<SVGSVGElement>, clamp = false) {
    const b = e.currentTarget.getBoundingClientRect(), region = containedRect({ x: b.x, y: b.y, width: b.width, height: b.height }, scene);
    return region ? clientToImage({ x: e.clientX, y: e.clientY }, region, clamp) : null;
  }
  function make(kind: Annotation['kind'], x = .5, y = .5): Annotation {
    return { id: `added-${nextId.current++}`, kind, number: Math.max(0, ...current.current.annotations.map(a => a.number)) + 1, title: `新しい${typeNames[kind]}`, description: 'ここで見つけたことを書いてください。', color: colors[0], stroke: 3, x, y, x2: Math.min(1, x + .16), y2: Math.min(1, y + .12), ...(kind === 'text' && selected && ['pin', 'rect'].includes(selected.kind) ? { targetId: selected.id } : {}) };
  }
  function down(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || !editable || !ready || current.current.gesture) return;
    const p = point(e); if (!p) { setMessage('画像の余白には注釈を置けません。'); return; }
    const target = (e.target as Element).closest<SVGElement>('[data-annotation-id]');
    if (target) {
      const id = target.dataset.annotationId!;
      dispatch({ type: 'select', id });
      dispatch({ type: 'start', annotationId: id, pointerId: e.pointerId, time: e.timeStamp, point: p, handle: (target.dataset.handle || 'move') as 'move' });
    } else if (tool === 'pin' || tool === 'text') { dispatch({ type: 'add', annotation: make(tool, p.x, p.y) }, `${typeNames[tool]}を追加しました。`); setTool('select'); focusCanvas(); return; }
    else if (tool === 'rect' || tool === 'arrow') { dispatch({ type: 'start-create', annotation: make(tool, p.x, p.y), pointerId: e.pointerId, time: e.timeStamp, point: p }); }
    else { dispatch({ type: 'select', id: null }); return; }
    const gesture = current.current.gesture as Gesture | null; if (!gesture) return;
    e.preventDefault(); e.currentTarget.focus({ preventScroll: true });
    try { e.currentTarget.setPointerCapture(e.pointerId); capture.current = { id: e.pointerId, generation: gesture.generation, node: e.currentTarget }; } catch { dispatch({ type: 'abort' }, 'ドラッグを開始できません。下の一覧と数値フォームを使えます。'); }
  }
  function pointer(e: PointerEvent<SVGSVGElement>, phase: 'move'|'up'|'cancel') {
    const c = capture.current; if (!c || c.id !== e.pointerId) return;
    const p = point(e, true); if (!p && phase !== 'cancel') { dispatch({ type: 'abort' }); return; }
    dispatch({ type: 'pointer', phase, pointerId: e.pointerId, time: e.timeStamp, generation: c.generation, point: p ?? { x: 0, y: 0 } }, phase === 'up' ? '操作を確定しました。小さすぎる範囲・矢印は追加されません。' : phase === 'cancel' ? 'ドラッグを取り消しました。' : undefined);
    if (phase === 'up') setTool('select');
  }
  function key(e: KeyboardEvent<SVGSVGElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (guiding && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); dispatch({ type: 'guide', command: e.key === 'ArrowLeft' ? 'prev' : 'next' }); return; }
    if (!editable) return; const a = current.current.annotations.find(a => a.id === current.current.selectedId); if (!a) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); dispatch({ type: 'delete', id: a.id }, '注釈を削除しました。Undoで戻せます。'); focusCanvas(); return; }
    const d = e.shiftKey ? .05 : .01, vectors: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
    if (e.key in vectors) { e.preventDefault(); const [x, y] = vectors[e.key]; dispatch({ type: 'update', id: a.id, patch: moveAnnotation(a, x, y) }, '注釈を移動しました。'); }
  }
  const guideCommand = (command: 'play'|'pause'|'resume'|'restart'|'end'|'next'|'prev'|'jump', index?: number) => { dispatch({ type: 'guide', command, ...(index === undefined ? {} : { index }) }, command === 'end' ? 'ガイドを終了しました。編集へ切り替えると続けられます。' : 'ガイドの注目位置と説明を更新しました。'); if (command === 'end') focusCanvas(); };
  return <div ref={root} className="imageAnnotation" data-testid="image-annotation" data-scene={state.scene} data-mode={state.mode} data-guide={state.guide.status} data-reduced={state.reduced} data-history={state.past.length} data-committed={JSON.stringify(state.annotations)}>
    <header className="iaHeader"><span>FIELD NOTES / 06 A-4</span><h4>見つけたことを、地図に残す。</h4><p>地点を選び、線で結び、ひと言を添える。あなただけの観察図をつくる小さな注釈工房。</p></header>
    <div className="iaTop"><label>観察する図版<select aria-label="注釈の図版" value={state.scene} onChange={e => { dispatch({ type: 'scene', scene: e.target.value as SceneId }, '図版を切り替え、注釈と履歴をサンプルへ戻しました。'); setTool('select'); }}><option value="map">アスター島の観察図 / 横長</option><option value="machine">天候観測機の構造図 / 縦長</option></select></label><div role="group" aria-label="注釈モード"><button aria-pressed={state.mode === 'edit'} onClick={() => dispatch({ type: 'mode', mode: 'edit' }, '編集モード。ガイドを止めて注釈を変更できます。')}>編集</button><button aria-pressed={state.mode === 'view'} onClick={() => dispatch({ type: 'mode', mode: 'view' }, '閲覧モード。注釈を選んで解説を読めます。')}>閲覧</button></div></div>
    <div className="iaPalette" role="group" aria-label="注釈ツール">{kinds.map(([id, icon, label]) => <button key={id} disabled={!editable} aria-pressed={tool === id} onClick={() => { dispatch({ type: 'abort' }); setTool(id); }}><b aria-hidden="true">{icon}</b>{label}</button>)}</div>
    <p className="iaHelp">{editable ? tool === 'select' ? '注釈をドラッグで移動。選択中の四隅・両端で形を調整できます。' : `${typeNames[tool]}：画像上で${['arrow', 'rect'].includes(tool) ? 'ドラッグ' : 'クリック'}して追加。` : '一覧から注釈を選ぶと、説明と注目位置が揃います。'}</p>
    <div className="iaWorkspace">
      <div className="iaObservation">
        <svg ref={canvas} className="iaCanvas" viewBox={`0 0 ${scene.width} ${scene.height}`} preserveAspectRatio="xMidYMid meet" tabIndex={0} role="group" aria-label="画像上の注釈操作領域" aria-describedby={helpId} data-testid="ia-canvas" data-ready={ready} data-dragging={!!state.gesture}
          onPointerDown={down} onPointerMove={e => pointer(e, 'move')} onPointerUp={e => pointer(e, 'up')} onPointerCancel={e => pointer(e, 'cancel')} onLostPointerCapture={e => pointer(e, 'cancel')} onKeyDown={key} onBlur={e => { if (current.current.gesture && !e.currentTarget.contains(e.relatedTarget as Node | null)) dispatch({ type: 'abort' }); }}>
          <title>{state.scene === 'map' ? '架空のアスター島。資料館、温室、灯台と海辺の道。' : '架空の天候観測機。吸気口、圧力計、管路、信号表示。'}</title>
          <defs>{annotations.filter(a => a.kind === 'arrow').map(a => <marker key={a.id} id={`${markerId}-${a.id}`} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 12 6 0 12z" fill={a.color} /></marker>)}</defs>
          <image href={`${basePath}/annotation/${state.scene}.svg`} width={scene.width} height={scene.height} />
          {renderAnnotations.map(a => { const x = a.x * scene.width, y = a.y * scene.height, x2 = a.x2 * scene.width, y2 = a.y2 * scene.height, active = a.id === activeId, r = 18 / Math.max(scale, .01), hit = 23 / Math.max(scale, .01); const target = annotations.find(t => t.id === a.targetId);
            return <g key={a.id} data-annotation-id={a.id} data-kind={a.kind} data-active={active} data-x={a.x} data-y={a.y} data-x2={a.x2} data-y2={a.y2} data-testid={`ia-mark-${a.id}`} role="button" tabIndex={0} aria-label={`${a.number}. ${a.title} / ${typeNames[a.kind]}`} aria-pressed={active} onClick={() => { if (!current.current.gesture && !editable) { if (guiding) guideCommand('jump', ordered.findIndex(n => n.id === a.id)); else dispatch({ type: 'select', id: a.id }); } }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (guiding) guideCommand('jump', ordered.findIndex(n => n.id === a.id)); else dispatch({ type: 'select', id: a.id }); } }}>
              {target && <path d={`M${x} ${y}L${target.x * scene.width} ${target.y * scene.height}`} stroke={a.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="4 4" fill="none" pointerEvents="none" />}
              {a.kind === 'rect' ? <><rect x={x} y={y} width={x2 - x} height={y2 - y} fill={a.color} fillOpacity={active ? .26 : .14} stroke={a.color} strokeWidth={a.stroke + (active ? 2 : 0)} vectorEffect="non-scaling-stroke" /><text x={x + 8 / scale} y={y + 18 / scale} fontSize={12 / scale} fill={a.color} fontWeight="700">{a.number}</text></> : a.kind === 'arrow' ? <><path d={`M${x} ${y}L${x2} ${y2}`} stroke="transparent" strokeWidth={44} vectorEffect="non-scaling-stroke" fill="none" /><path d={`M${x} ${y}L${x2} ${y2}`} stroke={a.color} strokeWidth={a.stroke + (active ? 1 : 0)} vectorEffect="non-scaling-stroke" markerEnd={`url(#${markerId}-${a.id})`} fill="none" pointerEvents="none" /></> : <><circle cx={x} cy={y} r={hit} fill="transparent" /><circle cx={x} cy={y} r={r} fill={a.color} stroke={active ? '#fffaf0' : '#f2ead8'} strokeWidth={active ? 5 : 2} vectorEffect="non-scaling-stroke" /><text x={x} y={y} dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize={12 / scale} fontWeight="700" pointerEvents="none">{a.kind === 'text' ? 'T' : a.number}</text></>}
              {active && <circle cx={x} cy={y} r={hit + 4 / scale} fill="none" stroke="#233d36" strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
              {active && editable && (a.kind === 'rect' ? [['nw', x, y], ['ne', x2, y], ['sw', x, y2], ['se', x2, y2]] : a.kind === 'arrow' ? [['arrow-start', x, y], ['arrow-end', x2, y2]] : []).map(([handle, hx, hy]) => <g key={handle} data-annotation-id={a.id} data-handle={handle} aria-hidden="true"><circle cx={hx} cy={hy} r={hit} fill="transparent" /><circle cx={hx} cy={hy} r={7 / scale} fill="#fffaf0" stroke={a.color} strokeWidth={2} vectorEffect="non-scaling-stroke" /></g>)}
            </g>;
          })}
        </svg>
        <div className="iaCanvasFoot"><span>{state.gesture ? '編集中 / 未確定' : '確定済み'} · {annotations.length} annotations</span><span>ORIGINAL STUDY · {scene.width} × {scene.height}</span></div>
        <div className="iaHistory"><button disabled={!editable || !state.past.length} onClick={() => dispatch({ type: 'undo' }, 'Undo：直前の確定操作を戻しました。')}>Undo</button><button disabled={!editable || !state.future.length} onClick={() => dispatch({ type: 'redo' }, 'Redo：取り消した操作を戻しました。')}>Redo</button><button onClick={() => { dispatch({ type: 'reset' }, 'Reset：この図版の完成サンプルへ戻し、履歴とガイドを初期化しました。'); setTool('select'); }}>Reset</button><button disabled={!editable} onClick={() => { dispatch({ type: 'add', annotation: make(tool === 'select' ? 'pin' : tool) }, '中央に追加しました。数値フォームで位置を変更できます。'); setTool('select'); }}>中央に追加</button><button disabled={!editable || !selected} onClick={() => { if (selected) dispatch({ type: 'delete', id: selected.id }, '削除しました。Undoで関連付けも復元できます。'); focusCanvas(); }}>選択を削除</button></div>
        <section className="iaGuide" aria-label="注釈ガイド" data-testid="ia-guide"><div className="iaGuideTitle"><span>GUIDED LOOK</span><b>{guiding ? `${state.guide.index + 1} / ${state.annotations.length}` : `${state.annotations.length} 件の注釈`}</b><span>{({ idle: '停止中', playing: '再生中', paused: '一時停止', finished: '最後まで案内しました' })[state.guide.status]}</span></div><div className="iaGuideControls"><button disabled={!state.annotations.length} onClick={() => guideCommand(state.guide.status === 'playing' ? 'pause' : state.guide.status === 'paused' ? 'resume' : 'play')}>{state.guide.status === 'playing' ? '一時停止' : state.guide.status === 'paused' ? '再開' : 'ガイド再生'}</button><button disabled={!state.annotations.length} onClick={() => guideCommand('restart')}>最初から再生</button><button disabled={!state.annotations.length || guiding && state.guide.index <= 0} onClick={() => guideCommand('prev')}>前へ</button><button disabled={!state.annotations.length || guiding && state.guide.index >= state.annotations.length - 1} onClick={() => guideCommand('next')}>次へ</button><button disabled={!guiding} onClick={() => guideCommand('end')}>ガイド終了</button></div><p>1件ずつ3.5秒で案内。再生中は編集せず、動きを減らす設定でもすべての説明を順に読めます。</p></section>
        <section className="iaDescription" aria-label="選択注釈の説明" data-testid="ia-description" aria-live="polite"><span>{(guided ?? selected)?.number ?? '—'} / FIELD NOTE</span><h5>{(guided ?? selected)?.title ?? '注釈を選んでください'}</h5><p>{(guided ?? selected)?.description ?? '画像上の注釈か右の一覧から、気になる場所を選びます。'}</p>{(guided ?? selected)?.targetId && <small>関連先：{state.annotations.find(a => a.id === (guided ?? selected)?.targetId)?.title}</small>}</section>
      </div>
      <aside className="iaSidebar"><section aria-label="注釈一覧"><h5>観察ノート <span>{state.annotations.length}</span></h5><ol className="iaList">{ordered.map((a, index) => <li key={a.id}><button aria-pressed={a.id === (guided?.id ?? state.selectedId)} onClick={() => { if (guiding) guideCommand('jump', index); else dispatch({ type: 'select', id: a.id }, '注釈を選びました。'); }}><span className="iaNumber" style={{ borderColor: a.color }}>{a.number}</span><span><b>{a.title}</b><small>{typeNames[a.kind]}</small></span><span aria-hidden="true">{a.id === (guided?.id ?? state.selectedId) ? '✓' : '→'}</span></button></li>)}</ol>{!state.annotations.length && <p>まだ注釈がありません。編集に切り替えて追加できます。</p>}</section><section aria-label="選択注釈を編集"><h5>{selected ? `${typeNames[selected.kind]}を編集` : '注釈の編集'}</h5>{selected && editable ? <Editor key={JSON.stringify(selected)} annotation={selected} annotations={state.annotations} apply={patch => { returnToApply.current = true; dispatch({ type: 'update', id: selected.id, patch }, '変更を確定しました。Undoで編集前へ戻せます。'); }} /> : <p>{editable ? '注釈を選ぶと位置や説明を編集できます。' : '閲覧中です。「編集」でガイドを止め、注釈を変更できます。'}</p>}</section></aside>
    </div>
    <p role="status" className="iaStatus">{message}</p><p id={helpId} className="iaHelp">Tabでツール・注釈・一覧へ。Enter / Spaceで選択。画像にフォーカスすると方向キーで1%、Shift付きで5%移動、Deleteで削除、Escapeでドラッグ取消。ガイド中は左右キーで前後へ。画像上はタッチ編集、ページのスクロールは画像の外側で操作できます。</p>
    <details><summary>座標と履歴のしくみ / 使い方</summary><p>画像の左上を(0,0)、右下を(1,1)として位置を保存します。画像は比率を保って表示し、周囲の余白への追加は拒否。画面幅やスクロールが変わっても同じ対象を指します。ドラッグ中は仮の表示、離すと1操作として確定、取消は履歴へ追加しません。確定履歴は直近50操作です。</p><p>図版の切替・Reset・閉室で編集は失われ、完成サンプルへ戻ります。保存・アップロード・外部通信はありません。地図も装置もこの展示用の独自制作で、実在の歴史資料・装置ではありません。</p></details>
  </div>;
}
