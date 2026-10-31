"use client";
import { useState } from 'react';
import type { Phase4Id } from '../../data/phase4aExhibits';
import { ToastStack, UndoSnackbar } from './Phase4Notices';
import { InlineValidation, SearchSuggestions } from './Phase4Inputs';
import { SlidingTabs, AnimatedAccordion } from './Phase4Navigation';
import './phase4.css';
const demos={ 'toast-stack':ToastStack,'undo-snackbar':UndoSnackbar,'inline-validation':InlineValidation,'search-suggestions':SearchSuggestions,'sliding-tabs':SlidingTabs,'animated-accordion':AnimatedAccordion };
export default function Phase4Player({id}:{id:Phase4Id}) {
  const [generation,setGeneration]=useState(0),[playing,setPlaying]=useState(true),[duration,setDuration]=useState(600);
  const Demo=demos[id];
  return <div className="phase4Player"><div className="practicalControls phase4Transport"><button onClick={()=>setPlaying(value=>!value)}>{playing?'停止':'再生'}</button><button onClick={()=>{setGeneration(value=>value+1);setPlaying(true);setDuration(600)}}>Reset</button><label>動きの速さ<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={250}>速い / 250ms</option><option value={600}>標準 / 600ms</option><option value={1600}>ゆっくり / 1600ms</option></select></label></div><Demo key={generation} playing={playing} duration={duration}/><p>動き低減：大きな移動を省略し、入力・選択・取消と結果は保持します。停止時にも直接操作できます。Resetは保留・選択・古い処理を破棄し初期状態へ戻します。</p></div>;
}
