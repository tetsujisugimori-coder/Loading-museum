"use client";
import { useLayoutEffect, useRef, useState } from 'react';
import { useAnimatedRows, usePhase4Runtime } from './phase4-runtime';
export type DemoProps = {playing:boolean;duration:number};
const lifetime = 5000;

export function ToastStack({playing,duration}:DemoProps) {
  const [items,setItems] = useState<{id:number;kind:string;end:number}[]>([]);
  const [kind,setKind] = useState('情報');
  const [notice,setNotice] = useState('通知なし');
  const [focusInList,setFocusInList] = useState(false);
  const serial = useRef(0);
  const {stage,elapsed,active:running,reduced} = usePhase4Runtime(playing,items.length>0);
  const expired = items.filter(item=>item.end<=elapsed);
  if(expired.length) {setItems(items.filter(item=>item.end>elapsed));setNotice(`${expired.length}件が期限終了`);}
  const list = useAnimatedRows(items.map(item=>item.id).join(','),running&&!reduced,duration);
  useLayoutEffect(()=>{if(focusInList&&list.current&&!list.current.contains(document.activeElement))list.current.focus();},[items,focusInList,list]);
  function add() {
    const id=++serial.current;
    setItems(current=>[...current.slice(-3),{id,kind,end:elapsed+lifetime}]);
    setNotice(`${kind}通知 ${id} を追加${items.length>=4?'、最古の通知を上限で解除':''}`);
  }
  return <div ref={stage} className="practicalStage phase4Stage" data-testid="practical-stage" data-active={running} data-reduced={reduced}>
    <div className="practicalControls"><label>通知の種類<select value={kind} onChange={e=>setKind(e.target.value)}>{['情報','成功','注意'].map(value=><option key={value}>{value}</option>)}</select></label><button onClick={add}>通知を追加</button><button onClick={()=>{setItems([]);setNotice('全通知を解除')}} disabled={!items.length}>すべて解除</button></div>
    <p>上限4件 / 現在 <output data-count>{items.length}</output>件。寿命5秒（観察中の有効時間）。</p>
    <div ref={list} className="phase4Rows phase4Toasts" role="region" tabIndex={-1} aria-label="通知スタック" onFocusCapture={()=>setFocusInList(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocusInList(false)}}>{items.map(item=><div data-row={item.id} data-kind={item.kind} key={item.id} className="phase4Toast"><span aria-hidden="true">{item.kind==='成功'?'✓':item.kind==='注意'?'!':'i'}</span><div><strong>{item.kind} #{item.id}</strong><p>模擬通知の内容</p><small>残り {Math.max(0,Math.ceil((item.end-elapsed)/1000))}秒</small><div className="phase4Life" aria-hidden="true"><i style={{width:`${Math.max(0,(item.end-elapsed)/lifetime*100)}%`}}/></div></div><button aria-label={`通知 ${item.id} を解除`} onClick={()=>{setItems(current=>current.filter(x=>x.id!==item.id));setNotice(`通知 ${item.id} を個別解除`)}}>×</button></div>)}</div>
    <p role="status">{notice}</p><p className="phase4Hint">新着は下へ。中間を消すと後続が移動します。種類を変えて連続追加し、位置と残り時間を比べてください。</p>
  </div>;
}

const initialItems = ['図録メモ','展示のしおり','見学の予定'];
export function UndoSnackbar({playing,duration}:DemoProps) {
  const [removed,setRemoved] = useState<number[]>([]);
  const [pending,setPending] = useState<{id:number;end:number}|null>(null);
  const [notice,setNotice] = useState('削除前：3項目');
  const [focusInBar,setFocusInBar] = useState(false);
  const {stage,elapsed,active:running,reduced} = usePhase4Runtime(playing,pending!==null);
  const undo = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<number|null>(null);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  if(pending && pending.end<=elapsed) {setNotice(`${initialItems[pending.id]}：期限切れで確定`);setPending(null);}
  useLayoutEffect(()=>{
    if(pending) undo.current?.focus();
    else if(restoreFocus.current!==null){root.current?.querySelector<HTMLButtonElement>(`[data-delete="${restoreFocus.current}"]`)?.focus();restoreFocus.current=null;}
  },[pending]);
  useLayoutEffect(()=>{if(!pending&&focusInBar&&document.activeElement===document.body)bar.current?.focus();},[pending,focusInBar]);
  const list = useAnimatedRows(initialItems.map((_,i)=>i).filter(i=>!removed.includes(i)).join(','),running&&!reduced,duration);
  function remove(id:number) {
    setRemoved(current=>[...current,id]); setPending({id,end:elapsed+lifetime});
    setNotice(`${pending?`${initialItems[pending.id]}を確定。`:''}${initialItems[id]}を削除保留`);
  }
  function revert() {
    if(!pending || pending.end<=elapsed)return;
    setRemoved(current=>current.filter(id=>id!==pending.id));restoreFocus.current=pending.id;
    setNotice(`${initialItems[pending.id]}を元の位置へ復元`);setPending(null);
  }
  return <div ref={stage} className="practicalStage phase4Stage" data-testid="practical-stage" data-active={running} data-reduced={reduced}><div ref={root}>
    <p>架空リスト / 残り <output data-count>{3-removed.length}</output>項目 / 確定 {removed.length-(pending?1:0)}件</p>
    <div ref={list} className="phase4Rows">{initialItems.map((text,id)=>!removed.includes(id)?<div data-row={id} key={id} className="phase4Item"><span>{text}</span><button data-delete={id} onClick={()=>remove(id)} aria-label={`${text}を模擬削除`}>模擬削除</button></div>:null)}</div>
    {!removed.length?<p>まだ削除していません。</p>:removed.length===3?<p>表示項目なし。Resetで全件を復元できます。</p>:null}
    <div ref={bar} className="phase4Snackbar" tabIndex={-1} role="region" aria-label="操作の取り消し状態" onFocusCapture={()=>setFocusInBar(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocusInBar(false)}} data-pending={pending!==null}>{pending?<><span>{initialItems[pending.id]}を保留 / 残り {Math.max(0,Math.ceil((pending.end-elapsed)/1000))}秒</span><button ref={undo} onClick={revert}>Undo</button><button onClick={()=>{setNotice(`${initialItems[pending.id]}を今すぐ確定`);setPending(null)}}>今すぐ確定</button><div className="phase4Life" aria-hidden="true"><i style={{width:`${Math.max(0,(pending.end-elapsed)/lifetime*100)}%`}}/></div></>:<span>Undoの保留なし</span>}</div>
    <p role="status">{notice}</p><p className="phase4Hint">最後の1操作を5秒保留。次の削除で前の保留は確定します。停止・画面外・非表示中は期限も止まり、動き低減では期限だけ進みます。実データは変更しません。</p>
  </div></div>;
}
