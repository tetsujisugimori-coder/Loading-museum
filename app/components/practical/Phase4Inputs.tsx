"use client";
import { useId, useRef, useState } from 'react';
import { useAnimatedRows, usePhase4Runtime } from './phase4-runtime';
import type { DemoProps } from './Phase4Notices';

export function InlineValidation({playing}:DemoProps) {
  const [value,setValue]=useState(''),[confirmed,setConfirmed]=useState(false),[editing,setEditing]=useState(false),[composing,setComposing]=useState(false),[lastMessage,setLastMessage]=useState('');
  const composition=useRef(false),input=useRef<HTMLInputElement>(null);
  const id=useId(); const {stage,active:running,reduced}=usePhase4Runtime(playing,false);
  const length=Array.from(value.trim()).length;
  const state=composing?'composing':editing?'editing':!confirmed?'empty':length>=2&&length<=12?'valid':'invalid';
  const message=state==='invalid'?(length===0?'表示名を入力してください。':'2〜12文字で入力してください。'):state==='valid'?'この表示名を使用できます。':'';
  if(message&&lastMessage!==message)setLastMessage(message);
  function confirm(){if(composition.current)return;setConfirmed(true);setEditing(false);}
  return <div ref={stage} className="practicalStage phase4Stage" data-testid="practical-stage" data-state={state} data-active={running} data-reduced={reduced}>
    <label htmlFor={`${id}-name`}>表示名（2〜12文字）</label><div className="phase4InputLine"><input ref={input} id={`${id}-name`} value={value} aria-invalid={state==='invalid'} aria-describedby={`${id}-help${message?` ${id}-message`:""}`} onChange={e=>{setValue(e.target.value);setEditing(true)}} onBlur={confirm} onCompositionStart={()=>{composition.current=true;setComposing(true)}} onCompositionEnd={e=>{composition.current=false;setComposing(false);setValue(e.currentTarget.value);if(document.activeElement!==e.currentTarget)confirm()}} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();confirm()}}}/><span aria-hidden="true">{state==='valid'?'✓':state==='invalid'?'!':'…'}</span></div>
    <p id={`${id}-help`}>日本語も使用可。入力中・IME変換中は警告を出さず、Enter・確認・フォーカス移動で確定します。</p>
    <div className="phase4Message" data-open={!!message} aria-hidden={!message}><div><p id={`${id}-message`} role="status">{message||lastMessage}</p></div></div>
    <p data-validation-state>状態：{({empty:'未入力',editing:'入力中',composing:'IME変換中',valid:'正常',invalid:'不正'})[state]}</p>
    <button onMouseDown={e=>e.preventDefault()} onClick={()=>{confirm();input.current?.focus()}}>入力を確認</button>
    <p className="phase4Hint">短い文字を確定→編集→正しい文字を確定し、下の行が移動する様子とフォーカスを観察します。</p>
  </div>;
}

export const suggestionData = ['Motion Atlas','Toast Guide','Search Atlas','Tabs Guide','Accordion Notes','Input Guide','Animation Basics','日本語の資料'];
export function suggestions(query:string){const q=query.trim().toLocaleLowerCase();return suggestionData.filter(text=>text.toLocaleLowerCase().includes(q)).sort((a,b)=>Number(b.toLocaleLowerCase().startsWith(q))-Number(a.toLocaleLowerCase().startsWith(q))||suggestionData.indexOf(a)-suggestionData.indexOf(b));}
export function SearchSuggestions({playing,duration}:DemoProps) {
  const [value,setValue]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(-1),[chosen,setChosen]=useState('未選択'),[composing,setComposing]=useState(false);
  const input=useRef<HTMLInputElement>(null),composition=useRef(false),pressed=useRef<{text:string;pointerId:number}|null>(null);const id=useId();
  const {stage,active:running,reduced}=usePhase4Runtime(playing,false);
  const results=suggestions(value),shown=open&&!composing;
  const list=useAnimatedRows(shown?results.join('|'):'closed',running&&!reduced,duration);
  function choose(text:string){input.current?.focus();setValue(text);setChosen(text);setOpen(false);setActive(-1);}
  return <div ref={stage} className="practicalStage phase4Stage" data-testid="practical-stage" data-active={running} data-reduced={reduced}>
    <label htmlFor={`${id}-search`}>資料を検索</label><input ref={input} id={`${id}-search`} role="combobox" aria-autocomplete="list" aria-expanded={shown} aria-controls={`${id}-options`} aria-activedescendant={shown&&active>=0&&active<results.length?`${id}-option-${suggestionData.indexOf(results[active])}`:undefined} autoComplete="off" value={value} onFocus={()=>setOpen(true)} onBlur={()=>{setOpen(false);setActive(-1)}} onChange={e=>{setValue(e.target.value);setOpen(true);setActive(-1)}} onCompositionStart={()=>{composition.current=true;setComposing(true);setActive(-1)}} onCompositionEnd={()=>{composition.current=false;setComposing(false)}} onKeyDown={e=>{
      if(composition.current||e.nativeEvent.isComposing||e.keyCode===229)return;
      if(e.key==='Escape'){e.preventDefault();setOpen(false);setActive(-1)}
      else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(current=>results.length?(e.key==='ArrowDown'?(current+1)%results.length:(current<=0?results.length-1:current-1)):-1)}
      else if(e.key==='Enter'&&shown&&active>=0&&results[active]){e.preventDefault();choose(results[active])}
    }}/>
    <div id={`${id}-options`} role="listbox" aria-label="検索候補" hidden={!shown}><div ref={list} role="presentation" className="phase4Rows phase4Suggestions">{shown&&results.map((text,index)=><div data-row={text} id={`${id}-option-${suggestionData.indexOf(text)}`} key={text} role="option" aria-selected={index===active} onPointerDown={e=>{e.preventDefault();pressed.current={text,pointerId:e.pointerId}}} onPointerCancel={()=>{pressed.current=null}} onPointerUp={e=>{e.preventDefault();const armed=pressed.current;pressed.current=null;const rect=e.currentTarget.getBoundingClientRect();if(armed?.text===text&&armed.pointerId===e.pointerId&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)choose(text)}} onClick={()=>choose(text)}>{text}</div>)}</div></div>
    {shown&&!results.length?<p role="status">候補なし</p>:null}
    <p role="status">決定：{chosen}</p><p className="phase4Hint">例：a → at → ta と連続入力すると、候補が入れ替わり先頭一致が上へ移動。上下矢印で選びEnter、Escapeで閉じます。候補のタップでも決定できます。同期検索なので古い応答は復活しません。</p>
  </div>;
}
