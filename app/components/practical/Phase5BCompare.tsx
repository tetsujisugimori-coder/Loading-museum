"use client";
import React,{useMemo,useRef,useState,type CSSProperties} from 'react';
import {diffLines,contrast} from './phase5b-model';
import {useHistory} from './phase5b-history';
import {DataView,HistoryBar,Intro} from './Phase5BShared';
const pairs={
 release:{title:'展示ノート',old:'Loading Museum\n展示: 257\n記録を比較\n状態: 設計中\n公開前に確認する',next:'Loading Museum\n展示: 263\n記録を比較\n状態: レビュー待ち\n操作とデータを照合する\n公開前に確認する'},
 same:{title:'差分なし',old:'同じ版\n変更なし',next:'同じ版\n変更なし'},
 empty:{title:'空の旧版',old:'',next:'最初の記録\n次の一歩'},
 blank:{title:'両方空',old:'',next:''},
 long:{title:'長い記録',old:Array.from({length:120},(_,i)=>`${i+1} / 展示記録 ${'観察 '.repeat(6)}`).join('\n'),next:Array.from({length:120},(_,i)=>`${i+1} / ${i===60?'新しい比較':'展示記録'} ${'観察 '.repeat(6)}`).join('\n')}
};
export function DiffViewer(){
 const [pair,setPair]=useState<keyof typeof pairs>('release'),[old,setOld]=useState(pairs.release.old),[next,setNext]=useState(pairs.release.next),[current,setCurrent]=useState(0),root=useRef<HTMLDivElement>(null);
 const result=useMemo(()=>{try{return {rows:diffLines(old,next),error:''}}catch(e){return {rows:[],error:(e as Error).message}}},[old,next]);
 const hunks=[...new Set(result.rows.flatMap(r=>r.hunk?[r.hunk]:[]))],active=hunks[Math.min(current,Math.max(0,hunks.length-1))];
 const choose=(id:keyof typeof pairs)=>{setPair(id);setOld(pairs[id].old);setNext(pairs[id].next);setCurrent(0)};
 const jump=(delta:number)=>{if(!hunks.length)return;const i=(hunks.indexOf(active)+delta+hunks.length)%hunks.length;setCurrent(i);root.current?.querySelector<HTMLElement>(`[data-hunk="${hunks[i]}"]`)?.focus()};
 return <div className="p5b" data-demo="diff" ref={root}><Intro number="04" title="Diff Viewer">行の前後関係を保って2版を比較。行単位のLCSで共通行を求め、その間の削除・追加を同じ変更区間にまとめます。文字内の一致や意味の同一性は推定しません。</Intro>
 <div className="p5bToolbar"><label>比較対象<select aria-label="比較対象" value={pair} onChange={e=>choose(e.target.value as keyof typeof pairs)}>{Object.entries(pairs).map(([id,p])=><option key={id} value={id}>{p.title}</option>)}</select></label><button onClick={()=>choose('release')}>Reset</button><button disabled={!hunks.length} onClick={()=>jump(-1)}>前の差分</button><button disabled={!hunks.length} onClick={()=>jump(1)}>次の差分</button></div>
 <div className="p5bDiffEditors"><label>旧版<textarea aria-label="旧版" value={old} onChange={e=>{setOld(e.target.value);setCurrent(0)}}/></label><label>新版<textarea aria-label="新版" value={next} onChange={e=>{setNext(e.target.value);setCurrent(0)}}/></label></div>
 <p role="status">{result.error?`比較不可: ${result.error}`:hunks.length?`${hunks.length}区間 / 差分 ${hunks.indexOf(active)+1}`:'差分なし'}{!result.error&&!old&&!next?' / 両版とも空':''}</p><p>＝ 共通　＋ 追加　− 削除　↔ 変更（同一区間の行の対応。移動の追跡ではありません）</p>
 <table className="p5bDiffTable"><caption>旧行 → 新行 / 各版240行・24,000文字まで</caption><thead><tr><th>種類</th><th>旧版</th><th>新版</th></tr></thead><tbody>{result.rows.map((r,i)=><tr key={i} data-kind={r.kind} data-hunk={r.hunk} data-current={r.hunk===active&&!!active} tabIndex={r.hunk?-1:undefined}><th scope="row">{{same:'＝ 共通',add:'＋ 追加',remove:'− 削除',change:'↔ 変更'}[r.kind]}</th><td><small>{r.oldLine===undefined?'—':`旧 ${r.oldLine}`}</small><br/>{r.oldText??'—'}</td><td><small>{r.newLine===undefined?'—':`新 ${r.newLine}`}</small><br/>{r.newText??'—'}</td></tr>)}</tbody></table>
 <DataView value={result.error?{error:result.error}:result.rows}/></div>
}
const initialTheme={background:'#f3f4ee',foreground:'#183c39',accent:'#1e6554',size:16,space:16,font:'sans-serif',weight:400};
export function ThemeStudio(){
 const history=useHistory(initialTheme),theme=history.value,[count,setCount]=useState(0);
 const ratio=contrast(theme.background,theme.foreground),onAccent=contrast(theme.accent,'#ffffff')>=contrast(theme.accent,'#000000')?'#ffffff':'#000000';
 const style={'--studio-bg':theme.background,'--studio-fg':theme.foreground,'--studio-accent':theme.accent,'--studio-on-accent':onAccent,'--studio-size':`${theme.size}px`,'--studio-space':`${theme.space}px`,'--studio-font':theme.font,fontWeight:theme.weight} as CSSProperties;
 return <div className="p5b" data-demo="theme"><Intro number="05" title="Theme Studio">同じデータに、違う読み心地。配色・文字・密度をカード、ボタン、ラベルへ同時に反映します。設定はこのプレビューの中だけに作用します。</Intro><HistoryBar history={history} clear={action=>{if(action==='reset')setCount(0)}}/>
 <fieldset><legend>デザイン設定</legend>{(['background','foreground','accent'] as const).map((key,i)=><label key={key}>{['背景色','文字色','アクセント色'][i]} <span aria-hidden="true">{theme[key]}</span><input aria-label={['背景色','文字色','アクセント色'][i]} type="color" value={theme[key]} onChange={e=>history.commit({...theme,[key]:e.target.value})}/></label>)}{(['size','space'] as const).map((key,i)=><label key={key}>{i?'余白':'文字サイズ'} <span aria-hidden="true">{theme[key]}px</span><input aria-label={i?'余白':'文字サイズ'} type="range" min={i?8:14} max={i?28:24} value={theme[key]} onChange={e=>history.commit({...theme,[key]:Number(e.target.value)})}/></label>)}<label>書体<select aria-label="書体" value={theme.font} onChange={e=>history.commit({...theme,font:e.target.value})}><option value="sans-serif">Sans serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option></select></label><label>太さ<select aria-label="太さ" value={theme.weight} onChange={e=>history.commit({...theme,weight:Number(e.target.value)})}><option value={400}>標準 400</option><option value={700}>太字 700</option></select></label></fieldset>
 <p role="status">本文のコントラスト比 {ratio.toFixed(2)}:1 / {ratio>=4.5?'通常文字の目安4.5以上':'注意: 通常文字の目安4.5未満'}</p><p>比率は選択した背景・文字色の計算値です。すべての利用環境での読みやすさを保証するものではありません。ボタン文字は黒/白のうち高い比率を自動採用します。</p>
 <section className="p5bThemePreview" style={style} aria-label="テーマプレビュー" data-testid="theme-preview"><span className="studioBadge">LIVE PREVIEW</span><h5>観察のための小さな道具箱</h5><p>余白は情報の呼吸。文字は視線の道筋。設定値と、いまの見た目を比べてください。</p><div className="studioCard"><strong>展示カード / 06</strong><p>操作の結果がデータに残るUI。</p><div className="studioField">表示フィールド: レビュー待ち</div></div><button onClick={()=>setCount(c=>c+1)}>サンプル操作 {count}</button></section><DataView value={theme}/></div>
}
