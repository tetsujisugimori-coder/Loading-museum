"use client";
import { useState } from 'react';
import './modern-menu.css';

export default function ModernClipMenu() {
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [opening, setOpening] = useState('ease-out');
  const [closing, setClosing] = useState('ease-in');
  const [generation, setGeneration] = useState(0);
  return <div className="modernClipExperiment">
    <div className="modernClipStage"><div key={generation} className={`modernClipPanel ${open ? 'open' : ''}`} style={{transitionDuration:`${speed}ms`, transitionTimingFunction:open ? opening : closing}} aria-hidden={!open}><span>COLLECTION</span><span>ART</span><span>MOTION</span><span>ABOUT</span></div></div>
    <p>開閉の途中でも再び押すと、その位置から反対へ動きます。曲線は次の切り替えから適用されます。</p>
    <div className="modernControls"><button onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'閉じる':'開く'}</button>
      <label>時間 {speed}ms <input type="range" min="200" max="2000" step="100" value={speed} onChange={e=>setSpeed(+e.target.value)}/></label>
      <label>開く緩急 <select value={opening} onChange={e=>setOpening(e.target.value)}><option value="ease-out">減速</option><option value="ease-in">加速</option><option value="linear">一定</option><option value="cubic-bezier(.2,1.3,.4,1)">弾む</option></select></label>
      <label>閉じる緩急 <select value={closing} onChange={e=>setClosing(e.target.value)}><option value="ease-in">加速</option><option value="ease-out">減速</option><option value="linear">一定</option><option value="cubic-bezier(.2,1.3,.4,1)">弾む</option></select></label>
      <button onClick={()=>{setOpen(false);setSpeed(800);setOpening('ease-out');setClosing('ease-in');setGeneration(n=>n+1);}}>リセット</button></div>
  </div>;
}
