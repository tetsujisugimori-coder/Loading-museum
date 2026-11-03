"use client";
import React from 'react';
export function HistoryBar({history,clear}:{history:{canUndo:boolean;canRedo:boolean;undo:()=>void;redo:()=>void;reset:()=>void};clear:()=>void}){return <div className="p5bToolbar"><button disabled={!history.canUndo} onClick={()=>{clear();history.undo()}}>Undo</button><button disabled={!history.canRedo} onClick={()=>{clear();history.redo()}}>Redo</button><button onClick={()=>{clear();history.reset()}}>Reset</button><small>履歴は直近50操作。保存・通信なし。</small></div>}
export function DataView({value}:{value:unknown}){return <details className="p5bData"><summary>確定データを見る</summary><pre data-testid="committed-data">{JSON.stringify(value,null,2)}</pre></details>}
export function Intro({number,title,children}:{number:string;title:string;children:React.ReactNode}){return <header className="p5bIntro"><span>{number} / INTERACTION WORKSHOP</span><h4>{title}</h4><p>{children}</p></header>}
