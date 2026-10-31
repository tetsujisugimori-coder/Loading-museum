"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Range, useExhibitClock } from './runtime';
import './practical-a.css';

type Point = { x: number; y: number };
const initialOrder = ['ALPHA', 'BETA', 'GAMMA'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function PracticalA({ id }: { id: string }) {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [step, setStep] = useState(1);
  const [count, setCount] = useState(4);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loaded, setLoaded] = useState(65);
  const [used, setUsed] = useState(25);
  const [point, setPoint] = useState<Point>({ x: 50, y: 50 });
  const [radius, setRadius] = useState(70);
  const [strength, setStrength] = useState(40);
  const [returnSpeed, setReturnSpeed] = useState(45);
  const [pull, setPull] = useState(0);
  const [refresh, setRefresh] = useState<'idle' | 'loading' | 'done'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [order, setOrder] = useState(initialOrder);
  const [drag, setDrag] = useState<number | null>(null);
  const [drop, setDrop] = useState(0);
  const [notice, setNotice] = useState('操作待ち');
  const pullStart = useRef<number | null>(null);
  const pullDistance = useRef(0);
  const { stage, time, reduced, active, motionAllowed } = useExhibitClock(
    playing && ((id === 'steps' && !failed && !finished) || (id === 'refresh' && refresh === 'loading')),
    speed,
    resetKey,
    id === 'refresh' && refresh === 'loading' ? startTime + 1600 : Infinity,
  );
  // Commit completion as a terminal state: changing the OS motion preference
  // afterwards must not revive an already completed synthetic request. This
  // guarded render adjustment settles before React commits the children.
  if (refresh === 'loading' && (reduced || time - startTime >= 1600)) {
    setRefresh('done');
  }
  const refreshDone = refresh === 'done';
  const refreshBusy = refresh === 'loading';

  function reset() {
    setPlaying(true); setSpeed(1); setResetKey(key => key + 1);
    setStep(1); setCount(4); setFailed(false); setFinished(false);
    setLoaded(65); setUsed(25); setPoint({ x: 50, y: 50 });
    setRadius(70); setStrength(40); setReturnSpeed(45);
    setPull(0); setRefresh('idle'); setStartTime(0);
    pullStart.current = null; pullDistance.current = 0;
    setOrder(initialOrder); setDrag(null); setDrop(0); setNotice('初期状態');
  }
  function movePoint(event: PointerEvent<HTMLDivElement>) {
    if (!playing) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({ x: clamp((event.clientX - rect.left) / rect.width * 100, 0, 100), y: clamp((event.clientY - rect.top) / rect.height * 100, 0, 100) });
  }
  function keyPoint(event: KeyboardEvent<HTMLDivElement>) {
    const dx = event.key === 'ArrowRight' ? 5 : event.key === 'ArrowLeft' ? -5 : 0;
    const dy = event.key === 'ArrowDown' ? 5 : event.key === 'ArrowUp' ? -5 : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    if (playing) setPoint(p => ({ x: clamp(p.x + dx, 0, 100), y: clamp(p.y + dy, 0, 100) }));
  }
  function startRefresh() {
    setRefresh(reduced ? 'done' : 'loading'); setStartTime(time); setPull(0);
    pullStart.current = null; pullDistance.current = 0; setNotice('模擬更新を開始');
  }
  function cancelRefresh() {
    setRefresh('idle'); setPull(0); pullStart.current = null; pullDistance.current = 0; setNotice('更新を取消');
  }
  function cancelDrag() { setDrag(null); setNotice('取消・元の順序を保持'); }
  function commitDrop(target = drop) {
    if (drag === null) return;
    const next = [...order];
    const [item] = next.splice(drag, 1);
    next.splice(target, 0, item);
    setOrder(next); setDrag(null); setNotice(`ドロップ確定：${next.join(' → ')}`);
  }
  function dropAt(clientY: number, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return clamp(Math.floor((clientY - rect.top) / (rect.height / 3)), 0, 2);
  }
  function pause() {
    setPlaying(value => !value);
    pullStart.current = null; pullDistance.current = 0; setPull(0);
    if (drag !== null) cancelDrag();
  }
  const dx = (point.x - 50) * 2, dy = (point.y - 50) * 2;
  const near = Math.hypot(dx, dy) <= radius;
  const magneticTransform = `translate(${!reduced && near ? dx * strength / 140 : 0}px, ${!reduced && near ? dy * strength / 140 : 0}px)`;

  return <div className="practicalA">
    <div ref={stage} className="practicalAStage practicalStage" data-active={active} data-playing={playing} data-reduced={reduced} data-testid="practical-stage">
      {id === 'steps' && <svg viewBox="0 0 360 160" role="img" aria-label={`工程 ${step} / ${count}：${finished ? '全工程完了' : failed ? '失敗' : '処理中'}`}>
        <path d="M35 75H325" stroke="#70869e" strokeWidth="4"/>
        {Array.from({ length: count }, (_, index) => {
          const x = 35 + index * 290 / (count - 1);
          const done = finished || index + 1 < step;
          const current = index + 1 === step && !finished;
          return <g key={index}>
            <circle cx={x} cy="75" r={current && !failed && !reduced ? 19 + 3 * Math.sin(time / 220) : 19} fill={done ? '#54d7b2' : current ? failed ? '#ff8d8d' : '#ffd37e' : '#42536a'}/>
            <text x={x} y="81" textAnchor="middle" fill="#081627">{done ? '✓' : index + 1}</text>
            <text x={x} y="122" textAnchor="middle" fill="#fff" fontSize="12">{done ? '完了' : current ? failed ? '失敗' : '実行中' : '待機'}</text>
          </g>;
        })}
      </svg>}
      {id === 'buffer' && <div className="practicalABuffer">
        <p>取得済み {loaded}% / 再生済み {used}%</p>
        <div className="practicalABufferTrack" role="img" aria-label={`取得済み ${loaded}パーセント、再生済み ${used}パーセント`}>
          <span className="practicalABufferLoaded" style={{ width: `${loaded}%` }}/><span className="practicalABufferUsed" style={{ width: `${used}%` }}/>
        </div><p>薄い帯＝先読み、明るい帯＝再生。実際の通信ではない模擬表示です。</p>
      </div>}
      {id === 'refresh' && <div className="practicalAPull" aria-label="下へ引く更新領域"
        onPointerDown={event => {
          if (refreshBusy || !playing) return;
          event.currentTarget.setPointerCapture(event.pointerId); pullStart.current = event.clientY; pullDistance.current = 0; setRefresh('idle');
        }}
        onPointerMove={event => {
          if (pullStart.current === null) return;
          const distance = clamp(event.clientY - pullStart.current, 0, 100); pullDistance.current = distance; setPull(distance);
        }}
        onPointerUp={() => {
          if (pullStart.current === null) return;
          const distance = pullDistance.current; pullStart.current = null; pullDistance.current = 0;
          if (distance >= 60) startRefresh(); else { setPull(0); setNotice('閾値未満・更新せず取消'); }
        }} onPointerCancel={cancelRefresh}>
        <div className="practicalAPullIndicator" style={{ transform: `translateY(${pull * .5}px) rotate(${refreshBusy && !reduced ? time * .2 : pull * 2}deg)` }} aria-hidden="true">↻</div>
        <p role="status">{refreshBusy ? '模擬読込み中' : refreshDone ? '更新完了' : pull >= 60 ? '離して更新' : '下へ60px引く'}</p>
        <div className="practicalAPullCard" style={{ transform: `translateY(${pull * .4}px)` }}>ARCHIVE LIST<br/>{refreshDone ? '新しい表示を受信' : '現在の表示'}</div>
      </div>}
      {(id === 'spotlight' || id === 'magnetic') && <div className="practicalAPointer" tabIndex={0} role="group" aria-label="ポインター操作領域"
        onPointerMove={movePoint} onPointerDown={movePoint} onKeyDown={keyPoint}
        onPointerLeave={() => { if (id === 'magnetic' && playing) setPoint({ x: 50, y: 50 }); }}
        onBlur={() => { if (id === 'magnetic') setPoint({ x: 50, y: 50 }); }}>
        {id === 'spotlight' ? <div className="practicalASpotlight" style={{ background: `radial-gradient(circle ${radius}px at ${point.x}% ${point.y}%, #a6e9ff 0%, #477fa8 35%, #142437 100%)` }}>POINTER<br/>SPOTLIGHT</div>
          : <button className="practicalAMagnetic" style={{ transform: magneticTransform, transition: `transform ${!motionAllowed || !playing ? 0 : (110 - returnSpeed) / 100 / speed}s ease-out` }} onClick={() => setNotice('吸着対象を選択')}>吸着対象</button>}
      </div>}
      {id === 'sort' && <div className="practicalASort" aria-label="並べ替え対象"
        onPointerMove={event => { if (drag !== null && playing) setDrop(dropAt(event.clientY, event.currentTarget)); }}
        onPointerUp={event => { if (playing) commitDrop(dropAt(event.clientY, event.currentTarget)); }} onPointerCancel={cancelDrag}>
        {order.map((label, index) => <button key={label} className="practicalASortRow" data-ghost={drag === index} data-drop={drag !== null && drop === index}
          onPointerDown={event => { if (!playing) return; event.currentTarget.setPointerCapture(event.pointerId); setDrag(index); setDrop(index); setNotice('移動中・順序未確定'); }}
          onKeyDown={event => {
            if (event.key === 'Escape') { cancelDrag(); return; }
            if (!playing) return;
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (drag === null) { setDrag(index); setDrop(index); setNotice('移動中・順序未確定'); } else commitDrop(); }
            if (drag !== null && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) { event.preventDefault(); setDrop(d => clamp(d + (event.key === 'ArrowDown' ? 1 : -1), 0, 2)); }
          }}>{label}<small>{drag === index ? '持ち上げ中' : ''}{drag !== null && drop === index ? ' ← 挿入先' : ''}</small></button>)}
      </div>}
    </div>
    <div className="practicalAControls">
      {id === 'steps' && <><Range name="工程数" min={2} max={6} value={count} set={value => { setCount(value); setStep(1); setFailed(false); setFinished(false); }}/>
        <button disabled={failed || finished} onClick={() => { if (step === count) setFinished(true); else setStep(n => n + 1); }}>{step === count ? '全工程を完了' : '次の工程'}</button>
        <button disabled={finished} onClick={() => setFailed(true)}>失敗を模擬</button><button disabled={!failed} onClick={() => setFailed(false)}>同じ工程を再開</button></>}
      {id === 'buffer' && <><Range name="取得済み" value={loaded} set={value => { setLoaded(value); setUsed(u => Math.min(u, value)); }}/><Range name="再生済み" max={loaded} value={used} set={setUsed}/></>}
      {id === 'refresh' && <><button disabled={refreshBusy} onClick={startRefresh}>ボタンで更新</button><button onClick={cancelRefresh}>更新を取消</button></>}
      {(id === 'spotlight' || id === 'magnetic') && <Range name={id === 'spotlight' ? '光の半径' : '吸着距離'} min={20} max={100} value={radius} set={setRadius}/>}
      {id === 'magnetic' && <><Range name="吸着の強さ" value={strength} set={setStrength}/><Range name="復元速度" min={10} max={100} value={returnSpeed} set={setReturnSpeed}/></>}
      {id === 'sort' && <><button disabled={!playing} onClick={() => { setDrag(0); setDrop(0); setNotice('移動中・順序未確定'); }}>先頭を選択</button><button disabled={drag === null} onClick={() => setDrop(d => Math.max(0, d - 1))}>挿入先を上へ</button><button disabled={drag === null} onClick={() => setDrop(d => Math.min(2, d + 1))}>挿入先を下へ</button><button disabled={drag === null} onClick={() => commitDrop()}>ドロップ</button><button disabled={drag === null} onClick={cancelDrag}>ドラッグ取消</button></>}
      {(id === 'steps' || id === 'refresh' || id === 'magnetic') && <Range name="速度" min={25} max={200} value={Math.round(speed * 100)} set={value => setSpeed(value / 100)}/>}
      {id !== 'buffer' && <button onClick={pause}>{playing ? '停止' : '再生'}</button>}<button onClick={reset}>Reset</button>
    </div>
    <p className="practicalANotice" role="status">{notice}</p>
    {(id === 'spotlight' || id === 'magnetic') && <p>領域を選び矢印キーでも移動。タッチは指の位置を指定します。OSのカーソルは変更しません。</p>}
    {id === 'sort' && <p>Space/Enterで選択・確定、上下キーで挿入先、Escapeで取消。下のボタンでも同じ操作ができます。</p>}
    {id === 'refresh' && <p>この領域内だけ縦スクロールを捕捉します。外側でページをスクロールできます。実際の保存・通信処理はありません。</p>}
    {reduced && <p>動き低減：脈動・回転・吸着移動を停止。模擬読込みは即時に完了します。</p>}
  </div>;
}
