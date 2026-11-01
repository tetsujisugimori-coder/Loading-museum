"use client";
import {useState} from 'react';
import type {Phase4BId} from '../../data/phase4bExhibits';
import {CommandPalette,FormWizard,ContextMenu} from './Phase4BInteractions';
import {OptimisticAction,UploadQueue,ResizableSplitPane} from './Phase4BAsync';
import './phase4.css';
const demos={'command-palette':CommandPalette,'optimistic-action':OptimisticAction,'upload-queue':UploadQueue,'form-wizard':FormWizard,'resizable-split-pane':ResizableSplitPane,'context-menu':ContextMenu};
export default function Phase4BPlayer({id}:{id:Phase4BId}){
 const [generation,setGeneration]=useState(0),[playing,setPlaying]=useState(true);
 const Demo=demos[id];
 return <div className="phase4BPlayer"><div className="practicalControls"><button onClick={()=>setPlaying(v=>!v)}>{playing?'停止':'再生'}</button><button onClick={()=>{setGeneration(v=>v+1);setPlaying(true)}}>Reset</button></div><Demo key={generation} playing={playing} duration={400}/><p>動き低減では移動・補間を省き、操作と結果を保持。模擬時計は停止・画面外・非表示で休止します。Reset・閉室は古い処理と入力を破棄。外部通信・保存はありません。</p></div>;
}
