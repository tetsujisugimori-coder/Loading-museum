"use client";
import { useRef, useState } from 'react';
import { practicalExhibits } from '../data/practicalExhibits';
import PracticalA from './practical/PracticalA';
import PracticalB from './practical/PracticalB';
import './practical/practical.css';
export default function PracticalRoom(){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState('steps');const toggle=useRef<HTMLButtonElement>(null);
 const list=practicalExhibits.filter(e=>`${e.title} ${e.use} ${e.technology.join(' ')} ${e.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 const item=list.find(e=>e.id===selected);
 return <section className="practicalRoom" aria-labelledby="practical-heading"><h2 id="practical-heading">実用UI部品の観察室</h2><p>第3期：状態を伝え、操作を案内する部品。{practicalExhibits.length}種類の独自再構成。</p><button ref={toggle} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="practical-panel">{open?'部品展示室を閉じる':'部品展示室を開く'}</button>{open&&<div id="practical-panel"><label>部品名・用途・技術で検索<input value={query} onChange={e=>setQuery(e.target.value)}/></label><nav aria-label="実用部品を選ぶ" className="practicalList">{list.map(e=><button key={e.id} onClick={()=>setSelected(e.id)} aria-pressed={e.id===selected}>{e.title}</button>)}</nav>{item?<article key={item.id}><h3>{item.title}</h3>{['steps','buffer','refresh','spotlight','magnetic','sort'].includes(item.id)?<PracticalA id={item.id}/>:<PracticalB id={item.id}/>}<dl><dt>原理</dt><dd>{item.principle}</dd><dt>使用例</dt><dd>{item.example}</dd><dt>歴史・位置付け</dt><dd>{item.history}</dd><dt>既存展示との差</dt><dd>{item.replacement}</dd><dt>用途</dt><dd>{item.use}</dd><dt>技術</dt><dd>{item.technology.join(' / ')}</dd><dt>性質</dt><dd>{item.tags.join(' / ')}</dd></dl><p><a href={item.source} target="_blank" rel="noreferrer">技術・アクセシビリティ参考資料</a></p><p>コード・図形は独自制作。参照先のコード・画像を転載していません。製品名・商標の権利は各権利者に帰属し、公式製品の再現を保証しません。</p></article>:<p>一致する部品を選んでください。</p>}<button onClick={()=>{setOpen(false);toggle.current?.focus()}}>閉室して一覧へ戻る</button></div>}</section>
}
