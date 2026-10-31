"use client";
import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { Range, useExhibitClock } from './runtime';
import './practical-b.css';

type Animation = { start: number; duration: number; from: number; to: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export default function PracticalB({ id }: { id: string }) {
  const [playing, setPlaying] = useState(true), [speed, setSpeed] = useState(1), [resetKey, setResetKey] = useState(0);
  const [animation, setAnimation] = useState<Animation | null>(null), [value, setValue] = useState(0);
  const [held, setHeld] = useState(false), [holdStart, setHoldStart] = useState(0);
  const [duration, setDuration] = useState(1200), [elasticity, setElasticity] = useState(55), [damping, setDamping] = useState(55), [depth, setDepth] = useState(18);
  const [result, setResult] = useState('success'), [state, setState] = useState('idle');
  const [interval, setInterval] = useState(180), [reverse, setReverse] = useState(false), [direction, setDirection] = useState('下'), [simultaneous, setSimultaneous] = useState(false);
  const [mode, setMode] = useState('crossfade'), [curve, setCurve] = useState('smooth'), [notice, setNotice] = useState('操作待ち');
  const input = useRef<{ pointer: number | null; wall: number } | null>(null);
  const { stage, time, reduced, active } = useExhibitClock(playing && (animation !== null || held), speed, resetKey, animation ? animation.start + animation.duration : held ? holdStart + duration : Infinity);
  const fraction = animation ? clamp((time - animation.start) / animation.duration) : 1;
  const eased = curve === 'linear' ? fraction : fraction * fraction * (3 - 2 * fraction);
  const current = animation ? animation.from + (animation.to - animation.from) * eased : value;
  // Terminal transitions cannot be revived by changing reduced motion afterwards.
  if (animation && (reduced || fraction >= 1)) {
    setValue(animation.to); setAnimation(null);
    if (id === 'state-button') { setState(result); setNotice(result === 'success' ? '模擬処理：成功' : '模擬処理：失敗'); }
  }
  function animate(to: number, ms = duration, from = current) {
    if (reduced) { setValue(to); setAnimation(null); }
    else setAnimation({ start: time, duration: ms, from, to });
  }
  function reset() {
    setAnimation(null); setValue(0); setHeld(false); input.current = null; setPlaying(true); setSpeed(1); setResetKey(n => n + 1);
    setDuration(1200); setElasticity(55); setDamping(55); setDepth(18); setState('idle'); setResult('success');
    setInterval(180); setReverse(false); setDirection('下'); setSimultaneous(false); setMode('crossfade'); setCurve('smooth'); setNotice('初期状態');
  }
  function press(pointer: number | null) {
    if (!playing || input.current) return;
    input.current = { pointer, wall: performance.now() }; setHeld(true); setHoldStart(time);
    if (id === 'elastic-button') { setAnimation(null); setValue(1); }
    setNotice('押下中');
  }
  function release(cancel = false) {
    if (!input.current) return;
    const elapsed = reduced ? performance.now() - input.current.wall : time - holdStart;
    input.current = null; setHeld(false);
    if (id === 'hold') { setNotice(!cancel && elapsed >= duration ? '確定を模擬（実処理なし）' : '早離し・取消：未確定'); }
    else { animate(0, 1400, 1); setNotice(cancel ? '押下を取消・復元' : '解放・復元'); }
  }
  function pointerDown(e: PointerEvent<HTMLButtonElement>) { if (!e.isPrimary || e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); press(e.pointerId); }
  function pointerUp(e: PointerEvent<HTMLButtonElement>, cancel = false) { if (input.current?.pointer === e.pointerId) release(cancel); }
  function keyDown(e: KeyboardEvent<HTMLButtonElement>) { if (e.key === 'Escape') { release(true); return; } if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(null); } }
  function keyUp(e: KeyboardEvent<HTMLButtonElement>) { if ((e.key === ' ' || e.key === 'Enter') && input.current?.pointer === null) { e.preventDefault(); release(); } }
  function pause() { if (held) release(true); setPlaying(v => !v); }
  function startState() { if (state === 'processing') return; setState(reduced ? result : 'processing'); setValue(0); animate(1, duration, 0); setNotice(reduced ? '動き低減：模擬結果を即時表示' : '模擬処理中'); }
  const bounce = animation && id === 'elastic-button' ? Math.exp(-fraction * (3 + damping / 12)) * Math.cos(fraction * (8 + elasticity / 4)) : current;
  const holdProgress = held ? clamp((time - holdStart) / duration) : 0;
  return <div className="practicalB">
    <div ref={stage} className="practicalStage practicalBStage" data-testid="practical-stage" data-active={active} data-reduced={reduced}>
      {(id === 'hold' || id === 'elastic-button') && <button className="practicalBPress" onPointerDown={pointerDown} onPointerUp={e => pointerUp(e)} onPointerCancel={e => pointerUp(e, true)} onLostPointerCapture={e => pointerUp(e, true)} onKeyDown={keyDown} onKeyUp={keyUp} onBlur={() => release(true)} style={id === 'elastic-button' ? { transform: `translateY(${bounce * depth}px) scale(${1 - bounce * depth / 160})` } : undefined}>
        {id === 'hold' ? <><span className="practicalBHoldFill" style={{ width: `${holdProgress * 100}%` }}/><span>{held ? '押し続けてから離す' : '長押しで確定を模擬'}</span></> : '押す・離す'}
      </button>}
      {id === 'state-button' && <button className="practicalBState" data-state={state} disabled={state === 'processing'} onClick={startState}><span>{state === 'idle' ? '模擬処理を開始' : state === 'processing' ? '処理中…' : state === 'success' ? '✓ 成功・再実行' : '× 失敗・再試行'}</span><span className="practicalBStateFill" style={{ width: `${current * 100}%` }}/></button>}
      {id === 'stagger' && <div className="practicalBList">{['受信箱', '保存した項目', '設定', 'ヘルプ'].map((name, i) => {
        const rank = reverse ? 3 - i : i, total = 500 + (simultaneous ? 0 : interval * 3);
        const p = clamp((current * total - (simultaneous ? 0 : rank * interval)) / 500);
        return <div key={name} style={{ opacity: p, transform: `translate(${direction === '横' ? (1 - p) * 55 : 0}px, ${direction === '下' ? (1 - p) * 28 : 0}px)` }}>{name}<small>UI ITEM 0{i + 1}</small></div>;
      })}</div>}
      {id === 'shared' && <div className="practicalBShared"><div className="practicalBSharedHints">一覧 → 同じカードの詳細</div><div className="practicalBSharedCard" style={{ left: `${5 + current * 5}%`, top: `${25 - current * 12}%`, width: `${38 + current * 42}%`, height: `${85 + current * 100}px`, borderRadius: `${18 - current * 8}px` }}><span>ARCHIVE 01</span><strong>動く部品</strong><p aria-hidden={current < .5} style={{ opacity: current }}>選択した項目の詳細情報</p></div><div className="practicalBSharedOther" aria-hidden={current >= .5} style={{ opacity: 1 - current }}>ARCHIVE 02</div></div>}
      {id === 'crossfade' && <div className="practicalBCross"><div className="practicalBCrossA" aria-hidden={current >= .5} style={{ opacity: 1 - current }}>☀<strong>昼の表示</strong><small>明るいダッシュボード</small></div><div className="practicalBCrossB" aria-hidden={current < .5} style={{ opacity: current }}>☾<strong>夜の表示</strong><small>落ち着いたダッシュボード</small></div>{mode === 'morph' && <div className="practicalBMorph" style={{ width: `${50 + current * 90}px`, height: `${50 + current * 15}px`, borderRadius: `${50 - current * 40}%`, transform: `rotate(${current * 180}deg)` }}/>}</div>}
    </div>
    <div className="practicalBControls">
      {id === 'hold' && <Range name="長押し時間 ms" min={400} max={2400} value={duration} set={v => { release(true); setDuration(v); }}/ >}
      {id === 'elastic-button' && <><Range name="弾力" value={elasticity} set={setElasticity}/><Range name="減衰" value={damping} set={setDamping}/><Range name="移動量" min={4} max={30} value={depth} set={setDepth}/></>}
      {id === 'state-button' && <><label>模擬結果<select aria-label="模擬結果" value={result} disabled={state === 'processing'} onChange={e => setResult(e.target.value)}><option value="success">成功</option><option value="failure">失敗</option></select></label><button onClick={() => { setAnimation(null); setState('idle'); setValue(0); setNotice('取消・旧処理は終了'); }}>処理を取消</button></>}
      {id === 'stagger' && <><Range name="表示間隔 ms" min={0} max={400} value={interval} set={setInterval}/><label><input type="checkbox" checked={reverse} onChange={e => setReverse(e.target.checked)}/>逆順</label><label><input type="checkbox" checked={simultaneous} onChange={e => setSimultaneous(e.target.checked)}/>同時表示</label><label>入場方向<select aria-label="入場方向" value={direction} onChange={e => setDirection(e.target.value)}><option>下</option><option>横</option></select></label><button onClick={() => { setValue(0); animate(1, 500 + (simultaneous ? 0 : interval * 3), 0); }}>一覧を再表示</button></>}
      {id === 'shared' && <><button onClick={() => animate(1)}>詳細へ</button><button onClick={() => animate(0)}>一覧へ戻る</button><button onClick={() => { setAnimation(null); setValue(0); setNotice('途中取消・一覧へ復元'); }}>遷移を取消</button></>}
      {id === 'crossfade' && <><label>比較方式<select aria-label="比較方式" value={mode} onChange={e => setMode(e.target.value)}><option value="crossfade">Crossfade</option><option value="morph">Crossfade + 境界形状補間</option></select></label><label>補間曲線<select aria-label="補間曲線" value={curve} onChange={e => setCurve(e.target.value)}><option value="smooth">なめらか</option><option value="linear">一定速度</option></select></label><button onClick={() => animate(animation?.to === 1 || (!animation && value === 1) ? 0 : 1)}>表示を切替</button></>}
      {id !== 'hold' && <Range name="速度" min={25} max={200} value={Math.round(speed * 100)} set={v => setSpeed(v / 100)}/>}
      <button onClick={pause}>{playing ? '停止' : '再生'}</button><button onClick={reset}>Reset</button>
    </div>
    <p role="status">{notice}</p>
    {id === 'hold' && <p>Space/Enterでも長押しできます。時間到達後に離すと模擬確定、早離し・Escape・フォーカス移動は取消。実際の削除・送信は行いません。動き低減時は進捗を動かさず実経過時間を離した時に確認します。</p>}
    {id === 'elastic-button' && <p>Space/Enterで押下・解放。指数減衰と余弦による弾性の近似で、物理計算ではありません。</p>}
    {id === 'shared' && <p>同じDOMカードの位置・幅・高さを補間する独自再構成。ネイティブView Transition APIや別ページ間の移動ではありません。</p>}
    {id === 'crossfade' && <p>2つのUIの不透明度を相互補間。形状比較は角丸・幅・高さの補間で、任意SVGパスのモーフィングではありません。</p>}
    {reduced && <p>動き低減：表示遷移と復元は即時。長押しの時間条件は維持します。</p>}
  </div>;
}
