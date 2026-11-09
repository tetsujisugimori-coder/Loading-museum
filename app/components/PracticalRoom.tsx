"use client";
import { useRef, useState } from 'react';
import { practicalExhibits } from '../data/practicalExhibits';
import { phase4aExhibits, type Phase4Id } from '../data/phase4aExhibits';
import { phase4bExhibits, type Phase4BId } from '../data/phase4bExhibits';
import {phase5aExhibits} from '../data/phase5aExhibits';
import {phase5bExhibits} from '../data/phase5bExhibits';
import {phase6aExhibits} from '../data/phase6aExhibits';
import PanZoom from './practical/PanZoom';
import ImageCrop from './practical/ImageCrop';
import BeforeAfterCompare from './practical/BeforeAfterCompare';
import ImageAnnotation from './practical/ImageAnnotation';
import LayerComposer from './practical/LayerComposer';
import Phase5BPlayer from './practical/Phase5BPlayer';
import Phase5Player from './practical/Phase5Player';
import Phase4BPlayer from './practical/Phase4BPlayer';
import PracticalA from './practical/PracticalA';
import PracticalB from './practical/PracticalB';
import Phase4Player from './practical/Phase4Player';
import './practical/practical.css';

export default function PracticalRoom({phase=3}:{phase?:3|4}) {
  const collection=phase===4?[...phase4aExhibits,...phase4bExhibits,...phase5aExhibits,...phase5bExhibits,...phase6aExhibits]:practicalExhibits;
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState<string>(collection[0].id);
  const toggle=useRef<HTMLButtonElement>(null);
  const list=collection.filter(e=>`${e.title} ${e.use} ${e.technology.join(' ')} ${e.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const item=list.find(e=>e.id===selected);
  const suffix=phase===4?'-phase4':'';
  return <section className={`practicalRoom${phase===4?' phase4Room':''}`} aria-labelledby={`practical-heading${suffix}`}>
    <h2 id={`practical-heading${suffix}`}>{phase===4?'第4・5期：実用UI部品の観察室':'実用UI部品の観察室'}</h2>
    <p>{phase===4?'第4期A・B／第5期A・B／第6期A-1・A-2・A-3・A-4・A-6':'第3期'}：状態を伝え、操作を案内する部品。{collection.length}種類の独自再構成。</p>
    <button ref={toggle} onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls={`practical-panel${suffix}`}>{open?'部品展示室を閉じる':'部品展示室を開く'}</button>
    {open&&<div id={`practical-panel${suffix}`}>
      <label>部品名・用途・技術で検索<input value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <p role="status">表示 {list.length} / {collection.length}種類</p>
      <nav aria-label="実用部品を選ぶ" className="practicalList">{list.map(e=><button key={e.id} onClick={()=>setSelected(e.id)} aria-pressed={e.id===selected}>{e.title}</button>)}</nav>
      {item?<article key={item.id}><h3>{item.title}</h3>
        {phase===4?(item.id==='layer-composer'?<LayerComposer/>:item.id==='image-annotation'?<ImageAnnotation/>:item.id==='before-after-compare'?<BeforeAfterCompare/>:item.id==='image-crop'?<ImageCrop/>:item.id==='pan-zoom'?<PanZoom/>:phase5bExhibits.some(e=>e.id===item.id)?<Phase5BPlayer id={item.id}/>:phase5aExhibits.some(e=>e.id===item.id)?<Phase5Player id={item.id}/>:phase4bExhibits.some(e=>e.id===item.id)?<Phase4BPlayer id={item.id as Phase4BId}/>:<Phase4Player id={item.id as Phase4Id}/>):['steps','buffer','refresh','spotlight','magnetic','sort'].includes(item.id)?<PracticalA id={item.id}/>:<PracticalB id={item.id}/>}
        <dl><dt>原理</dt><dd>{item.principle}</dd><dt>使用例</dt><dd>{item.example}</dd><dt>歴史・位置付け</dt><dd>{item.history}</dd><dt>既存展示との差</dt><dd>{item.replacement}</dd><dt>用途</dt><dd>{item.use}</dd><dt>技術</dt><dd>{item.technology.join(' / ')}</dd><dt>性質</dt><dd>{item.tags.join(' / ')}</dd></dl>
        <p><a href={item.source} target="_blank" rel="noreferrer">技術・アクセシビリティ参考資料</a></p><p>コード・図形は独自制作。参照先のコード・画像を転載していません。製品名・商標の権利は各権利者に帰属し、公式製品の再現を保証しません。</p>
      </article>:<p>一致する部品を選んでください。</p>}
      <button onClick={()=>{setOpen(false);toggle.current?.focus()}}>閉室して一覧へ戻る</button>
    </div>}
  </section>;
}
