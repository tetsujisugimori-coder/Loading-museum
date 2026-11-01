"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { usePhase4Runtime } from './phase4-runtime';
import './phase4b-interactions.css';
type Props = {playing:boolean;duration:number};
const commands = ['背景色を切り替える','星を追加する','星をすべて戻す'];
export function CommandPalette({playing,duration}:Props) {
  const {stage,active,reduced}=usePhase4Runtime(playing,false), uid=useId();
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[cursor,setCursor]=useState(0),[stars,setStars]=useState(0),[color,setColor]=useState(false),[message,setMessage]=useState('未実行');
  const input=useRef<HTMLInputElement>(null), opener=useRef<HTMLElement|null>(null), launch=useRef<HTMLButtonElement>(null), palette=useRef<HTMLDivElement>(null);
  const list=commands.filter(c=>c.includes(query));
  function close(){setOpen(false);(opener.current?.isConnected?opener.current:launch.current)?.focus()}
  function start(){opener.current=document.activeElement as HTMLElement;setQuery('');setCursor(0);setOpen(true)}
  function execute(command:string){if(command===commands[0])setColor(v=>!v);else if(command===commands[1])setStars(v=>Math.min(5,v+1));else setStars(0);setMessage(command+'：実行済み');close()}
  useEffect(()=>{if(open)input.current?.focus()},[open]);
  function keyboard(e:KeyboardEvent<HTMLDivElement>){
    if(e.nativeEvent.isComposing)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!e.altKey){e.preventDefault();if(open)close();else start();return}
    if(!open)return;
    if(e.key==='Escape'){e.preventDefault();close()}
    if(e.key==='Tab') {const nodes=palette.current?.querySelectorAll<HTMLElement>('input,button');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  }
  return <div ref={stage} className="practicalStage phase4Stage phase4BInteractive" data-testid="practical-stage" data-demo="command-palette" data-active={active} data-reduced={reduced} style={{'--phase4b-duration':`${duration}ms`} as CSSProperties} onKeyDown={keyboard}>
    <button ref={launch} onClick={()=>open?close():start()} aria-expanded={open} aria-controls={uid}>コマンドを開く</button>
    <p>この展示内にフォーカスがある間だけ Ctrl+K / ⌘+K。ブラウザに届かない環境ではボタンを使います。</p>
    <div className="phase4BCommandCanvas" data-color={color}>模擬キャンバス <span aria-label={`星 ${stars}個`}>{'★'.repeat(stars)||'星なし'}</span></div>
    <p role="status">{message}</p>
    {open&&<div ref={palette} id={uid} role="dialog" aria-label="コマンドパレット" className="phase4BPalette">
      <label>コマンドを検索<input ref={input} role="combobox" aria-controls={`${uid}-results`} aria-expanded="true" aria-autocomplete="list" aria-activedescendant={list.length?`${uid}-command-${cursor}`:undefined} value={query} onChange={e=>{setQuery(e.target.value);setCursor(0)}} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.length)setCursor(v=>(v+(e.key==='ArrowDown'?1:list.length-1))%list.length)}else if(e.key==='Enter'&&list[cursor]){e.preventDefault();execute(list[cursor])}}}/></label>
      <div role="listbox" id={`${uid}-results`} aria-label="模擬コマンド">{list.map((c,i)=><button type="button" role="option" aria-selected={i===cursor} id={`${uid}-command-${i}`} key={c} tabIndex={-1} onPointerDown={e=>e.preventDefault()} onClick={()=>execute(c)}>{c}</button>)}</div>
      {!list.length&&<p role="status">一致するコマンドなし</p>}<button onClick={close}>パレットを閉じる</button>
    </div>}
    <p className="phase4Hint">選択するとキャンバスを変更します。通信・保存なし。星は最大5個。検索候補展示との違いは「操作を実行する」こと。</p>
  </div>;
}

export function FormWizard({playing,duration}:Props){
  const {stage,active,reduced}=usePhase4Runtime(playing,false),id=useId();
  const [step,setStep]=useState(0),[name,setName]=useState(''),[theme,setTheme]=useState(''),[error,setError]=useState(''),[sent,setSent]=useState(false);
  const nameRef=useRef<HTMLInputElement>(null),themeRef=useRef<HTMLSelectElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const labels=['展示名','見学テーマ','最終確認'];
  function next(){if(step===0&&(!name.trim()||Array.from(name.trim()).length>20)){setError('展示名は1〜20文字で入力してください。');nameRef.current?.focus();return}if(step===1&&!theme){setError('見学テーマを選んでください。');themeRef.current?.focus();return}setError('');setStep(v=>v+1)}
  const previousStep=useRef(step);
  useLayoutEffect(()=>{if(previousStep.current!==step)heading.current?.focus();previousStep.current=step},[step]);
  return <div ref={stage} className="practicalStage phase4Stage phase4BInteractive" data-testid="practical-stage" data-demo="form-wizard" data-step={step+1} data-active={active} data-reduced={reduced} style={{'--phase4b-duration':`${duration}ms`} as CSSProperties}>
    <ol className="phase4BSteps" aria-label="入力の段階">{labels.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}>{i+1}. {label}</li>)}</ol>
    <h4 ref={heading} tabIndex={-1}>ステップ {step+1}：{labels[step]}</h4>
    <form onSubmit={e=>{e.preventDefault();if(step<2)next();else {setSent(true);setError('')}}}>
      <div className="phase4BWizardPage" key={step}>
      {step===0&&<label>展示名（架空の名前）<input ref={nameRef} value={name} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={e=>{setName(e.target.value);setError('')}} onKeyDown={e=>{if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault()}}/></label>}
      {step===1&&<label>見学テーマ<select ref={themeRef} value={theme} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={e=>{setTheme(e.target.value);setError('')}}><option value="">選択してください</option><option>入力</option><option>通知</option><option>ナビゲーション</option></select></label>}
      {step===2&&<dl><dt>展示名</dt><dd>{name.trim()}</dd><dt>見学テーマ</dt><dd>{theme}</dd></dl>}
      </div>
      {error&&<p id={`${id}-error`} role="alert">{error}</p>}
      <div className="practicalControls">{step>0&&<button type="button" onClick={()=>{setStep(v=>v-1);setError('');setSent(false)}}>前へ</button>}{step<2?<button type="submit">次へ</button>:<button type="submit" disabled={sent}>模擬送信</button>}</div>
    </form>
    <p role="status">{sent?'模擬送信が完了しました。外部には送信していません。':'この展示内だけで入力を保持します。'}</p>
    <p className="phase4Hint">入力→テーマ→確認の3段階。前後移動では値を保持、Reset・閉室では消去。個人情報は入力せず、架空の名前を使ってください。</p>
  </div>;
}

export function ContextMenu({playing,duration}:Props){
  const {stage,active,reduced}=usePhase4Runtime(playing,false),id=useId();
  const [point,setPoint]=useState<{x:number;y:number}|null>(null),[sub,setSub]=useState(false),[result,setResult]=useState('未操作'),[accent,setAccent]=useState('青');
  const target=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),returnTo=useRef<HTMLElement|null>(null),subTrigger=useRef<HTMLButtonElement>(null),returnToSubTrigger=useRef(false);
  function close(restore=true){setPoint(null);setSub(false);if(restore)(returnTo.current?.isConnected?returnTo.current:target.current)?.focus()}
  function open(x:number,y:number){returnTo.current=document.activeElement instanceof HTMLElement?document.activeElement:target.current;setSub(false);setPoint({x,y})}
  function buttonOpen(){const box=target.current?.getBoundingClientRect();if(box)open(box.left,box.bottom)}
  useLayoutEffect(()=>{if(!point||!menu.current)return;const node=menu.current,box=node.getBoundingClientRect();node.style.left=`${Math.max(8,Math.min(point.x,window.innerWidth-box.width-8))}px`;node.style.top=`${Math.max(8,Math.min(point.y,window.innerHeight-box.height-8))}px`;if(returnToSubTrigger.current&&!sub){subTrigger.current?.focus({preventScroll:true});returnToSubTrigger.current=false}else node.querySelector<HTMLElement>(sub?'[data-submenu] button':'[role=menuitem]')?.focus({preventScroll:true})},[point,sub]);
  useEffect(()=>{if(!point)return;const outside=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node)&&!target.current?.contains(e.target as Node)){setPoint(null);setSub(false)}};const viewport=()=>{setPoint(null);setSub(false);target.current?.focus()};document.addEventListener('pointerdown',outside);window.addEventListener('resize',viewport);window.addEventListener('scroll',viewport,true);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',viewport);window.removeEventListener('scroll',viewport,true)}},[point]);
  function keys(e:KeyboardEvent<HTMLDivElement>){const withinSub=(e.target as HTMLElement).closest('[data-submenu]');const scope=withinSub||menu.current;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(sub){returnToSubTrigger.current=true;setSub(false)}else close();return}if(e.key==='Tab'){close();return}if(e.key==='ArrowLeft'&&sub){e.preventDefault();returnToSubTrigger.current=true;setSub(false);return}if(e.key==='ArrowRight'&&e.target===subTrigger.current){e.preventDefault();setSub(true);return}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...(scope?.querySelectorAll<HTMLButtonElement>(':scope > button[role=menuitem]')||[])];const current=buttons.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length;buttons[next]?.focus()}}
  return <div ref={stage} className="practicalStage phase4Stage phase4BInteractive" data-testid="practical-stage" data-demo="context-menu" data-active={active} data-reduced={reduced} style={{'--phase4b-duration':`${duration}ms`} as CSSProperties}>
    <button ref={target} className="phase4BContextTarget" aria-haspopup="menu" aria-expanded={!!point} aria-controls={point?id:undefined} onContextMenu={e=>{e.preventDefault();target.current?.focus();open(e.clientX,e.clientY)}} onClick={buttonOpen} onKeyDown={e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();buttonOpen()}}}>模擬カードのメニューを開く</button>
    <p>右クリック／タップ／Enter／Shift+F10。色：<strong>{accent}</strong></p><p role="status">{result}</p>
    {point&&<div ref={menu} id={id} role="menu" aria-label="カード操作" className="phase4BContextMenu" style={{left:point.x,top:point.y}} onKeyDown={keys}>
      <button role="menuitem" onClick={()=>{setResult('模擬カードを複製しました。');close()}}>模擬複製</button>
      <button role="menuitem" ref={subTrigger} aria-haspopup="menu" aria-expanded={sub} onClick={()=>setSub(v=>!v)}>色を変更 ▸</button>
      {sub&&<div role="menu" aria-label="カードの色" data-submenu="true">{['青','緑','紫'].map(c=><button role="menuitem" key={c} onClick={()=>{setAccent(c);setResult(`カードの色を${c}に変更しました。`);close()}}>{c}</button>)}</div>}
      <button role="menuitem" onClick={(()=>close())}>閉じる</button>
    </div>}
    <p className="phase4Hint">メニューは画面の端から8px内側へ補正。サブメニューは同じ枠内に展開します。外側操作で閉じ、選択・Escapeでは起動元へ戻ります。実ファイル操作なし。</p>
  </div>;
}
