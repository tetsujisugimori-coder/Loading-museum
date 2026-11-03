"use client";
import React,{useRef,useState} from 'react';
import {useHistory} from './phase5b-history';
import {DataView,HistoryBar,Intro} from './Phase5BShared';
type Binding={action:string;key:string};
const actions=[{id:'count',label:'カウントを増やす'},{id:'light',label:'ランプを切り替え'},{id:'note',label:'メモを表示'}];
const initial:Binding[]=[{action:'count',key:'Shift+K'}];
export function ShortcutRecorder(){
 const history=useHistory(initial),bindings=history.value,[action,setAction]=useState('count'),[candidate,setCandidate]=useState(''),[recording,setRecording]=useState(false),[status,setStatus]=useState('待機中'),[count,setCount]=useState(0),[light,setLight]=useState(false),[note,setNote]=useState(false),zone=useRef<HTMLDivElement>(null),anchor=useRef<HTMLHeadingElement>(null);
 const conflict=bindings.find(b=>b.key===candidate&&b.action!==action);
 const clear=()=>{setRecording(false);setCandidate('')};
 const execute=(id:string)=>{if(id==='count')setCount(v=>v+1);if(id==='light')setLight(v=>!v);if(id==='note')setNote(v=>!v);setStatus(`実行: ${actions.find(a=>a.id===id)!.label}`)};
 return <div className="p5b" data-demo="shortcuts"><Intro number="06" title="Shortcut Recorder">登録・競合・実行を見渡す小さな実験室。Shift＋英字だけを、専用実行領域にフォーカスがある間に扱います。Ctrl・Meta・Alt・ブラウザ予約キーの既定動作は抑止しません。</Intro>
 <HistoryBar history={history} clear={action=>{clear();if(action==='reset'){setCount(0);setLight(false);setNote(false)}setStatus(`${action}: 登録データを更新`)}}/>
 <fieldset><legend>ショートカットを登録・変更</legend><label>操作<select aria-label="操作" value={action} onChange={e=>{setAction(e.target.value);clear();setStatus('操作を選択')}}>{actions.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label><button onClick={()=>{setCandidate('');setRecording(true);setStatus('キー取得中: 実行領域でShift＋英字');zone.current?.focus()}}>キーを取得</button><label>キーを選択（入力代替）<select aria-label="キーを選択（入力代替）" value={candidate} onChange={e=>{setRecording(false);setCandidate(e.target.value);setStatus('候補を選択。登録で確定')}}><option value="">未選択</option>{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c=><option key={c} value={`Shift+${c}`}>Shift+{c}</option>)}</select></label><button disabled={!candidate||!!conflict} onClick={()=>{history.commit([...bindings.filter(b=>b.action!==action),{action,key:candidate}]);clear();setStatus('登録済み')}}>登録を確定</button><button onClick={()=>{clear();setStatus('登録取消。既存の登録を維持')}}>登録取消</button></fieldset>
 {conflict&&<p className="p5bWarning" role="alert">競合: {candidate}は「{actions.find(a=>a.id===conflict.action)!.label}」に登録済み。</p>}
 <h5 ref={anchor} tabIndex={-1}>登録内容</h5><ul className="p5bShortcutList">{bindings.map(b=><li key={b.action}><kbd>{b.key}</kbd><span>{actions.find(a=>a.id===b.action)!.label}</span><button aria-label={`${b.action}の登録を変更`} onClick={()=>{setAction(b.action);setCandidate(b.key);setRecording(false);setStatus('変更中。確定までは元の登録を維持')}}>変更</button><button aria-label={`${b.action}の登録を削除`} onClick={()=>{history.commit(bindings.filter(x=>x.action!==b.action));clear();anchor.current?.focus();setStatus('登録を削除')}}>削除</button></li>)}</ul>{!bindings.length&&<p>登録はありません。</p>}
 <div ref={zone} tabIndex={0} role="region" aria-label="ショートカット実行領域" className="p5bExecution" data-capturing={recording} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null)&&recording){setRecording(false);setCandidate('');setStatus('取得取消: 実行領域から移動')}}} onKeyDown={e=>{
  if(e.nativeEvent.isComposing||e.repeat)return;
  if(e.key==='Escape'){clear();setStatus('登録取消。既存の登録を維持');return}
  if(e.key==='Shift'||e.key==='Control'||e.key==='Alt'||e.key==='Meta')return;
  if(!e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||!/^[a-z]$/i.test(e.key)){if(recording)setStatus('利用不可: Shift＋英字のみ。予約キーの既定動作を維持');return}
  const key=`Shift+${e.key.toUpperCase()}`;
  if(recording){e.preventDefault();setCandidate(key);setRecording(false);setStatus(`取得済み: ${key}。登録で確定`);return}
  const binding=bindings.find(b=>b.key===key);if(binding){e.preventDefault();execute(binding.action)}
 }}><strong>{recording?'● キー取得中':'◎ 実行領域'}</strong><p>ここを選択して登録済みキーを押す。入力欄や他展示では動作しません。</p><p data-testid="shortcut-result">カウント {count} / ランプ {light?'ON':'OFF'} / メモ {note?'表示':'非表示'}</p></div>
 <div className="p5bToolbar">{actions.map(a=><button key={a.id} onClick={()=>execute(a.id)}>{a.label}</button>)}</div><p role="status">{conflict?'競合':recording?'キー取得中':candidate?'未登録の候補':'状態'} / {status}{candidate?` / ${candidate}`:''}</p><DataView value={bindings}/></div>
}
