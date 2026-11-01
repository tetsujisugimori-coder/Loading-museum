"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useAnimatedRows, usePhase4Runtime } from './phase4-runtime';
import './phase4b-async.css';
type Props={playing:boolean;duration:number};
type Request={id:number;value:number;due:number;fail:boolean};
export type OptimisticState={value:number;confirmed:number;latest:number;pending:Request[];message:string};
export function settleRequests(state:OptimisticState,now:number):OptimisticState {
  const ready=state.pending.filter(r=>r.due<=now);
  if(!ready.length)return state;
  const latest=ready.find(r=>r.id===state.latest);
  return {...state,pending:state.pending.filter(r=>r.due>now),...(latest?{value:latest.fail?state.confirmed:latest.value,confirmed:latest.fail?state.confirmed:latest.value,message:latest.fail?`操作 ${latest.id} は失敗。確定値へ巻き戻し`:`操作 ${latest.id} の値を確定`}:{message:`古い応答 ${ready.map(r=>r.id).join(', ')} を失効。最新操作 ${state.latest} を保持`})};
}
export function OptimisticAction({playing,duration}:Props){
  const [state,setState]=useState<OptimisticState>({value:0,confirmed:0,latest:0,pending:[],message:'未操作'});
  const [outcome,setOutcome]=useState('success'),[delay,setDelay]=useState(1800);
  const {stage,elapsed,active,reduced}=usePhase4Runtime(playing,state.pending.length>0);
  const next=settleRequests(state,elapsed);if(next!==state)setState(next);
  function act(){setState(s=>{if(s.pending.length>=8)return s;const id=s.latest+1,value=s.value+1;return {...s,value,latest:id,pending:[...s.pending,{id,value,due:elapsed+delay,fail:outcome==='failure'}],message:`操作 ${id}：画面だけ先行更新。応答待ち`}})}
  return <div ref={stage} className="practicalStage phase4Stage phase4bAsync" data-testid="practical-stage" data-active={active} data-reduced={reduced} style={{'--b-duration':`${duration}ms`} as CSSProperties}>
    <div className="practicalControls"><label>模擬応答<select value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="success">成功</option><option value="failure">失敗</option></select></label><label>応答までの時間<select value={delay} onChange={e=>setDelay(Number(e.target.value))}><option value={400}>短い / 400ms</option><option value={1800}>標準 / 1800ms</option><option value={5000}>遅い / 5000ms</option></select></label><button onClick={act} disabled={state.pending.length>=8}>模擬いいね +1</button></div>
    <div className="optimisticValues" data-pending={state.pending.some(r=>r.id===state.latest)} data-rollback={state.message.includes('巻き戻し')}><div>画面の値 <output key={state.latest} data-display>{state.value}</output></div><div>確定値 <output data-confirmed>{state.confirmed}</output></div></div>
    <p>処理中 {state.pending.length} / 上限8件。最新操作ID {state.latest}</p><ul aria-label="応答待ち">{state.pending.map(r=><li key={r.id}>操作 {r.id} / {r.fail?'失敗':'成功'}応答 / 残り {Math.max(0,Math.ceil((r.due-elapsed)/100)/10)}秒</li>)}</ul>
    <p role="status">{state.message}</p><p>遅い操作Aの後、短い操作Bを追加して順序を逆転できます。最新操作だけが確定・巻き戻しの権限を持ちます。古い応答は表示値を変えません。実通信なし。</p>
  </div>;
}
export type QueueStatus='waiting'|'running'|'paused'|'complete'|'failed'|'cancelled';
export type QueueItem={id:number;name:string;status:QueueStatus;progress:number;fail:boolean;attempt:number};
export function advanceQueue(items:QueueItem[],delta:number,limit:number):QueueItem[]{
  let next=items.map(item=>{if(item.status!=='running')return item;const progress=Math.min(100,item.progress+delta/40);return {...item,progress,status:(progress>=100?(item.fail?'failed':'complete'):'running') as QueueStatus}});
  let free=Math.max(0,limit-next.filter(i=>i.status==='running').length);
  next=next.map(item=>item.status==='waiting'&&free-->0?{...item,status:'running'}:item);
  return next;
}
const labels:Record<QueueStatus,string>={waiting:'待機',running:'実行中',paused:'一時停止',complete:'完了',failed:'失敗',cancelled:'取消'};
export function UploadQueue({playing,duration}:Props){
  const [items,setItems]=useState<QueueItem[]>([]),[limit,setLimit]=useState(2),[fail,setFail]=useState(false),[notice,setNotice]=useState('待ち行列は空です');
  const serial=useRef(0),listFocus=useRef(false);
  const [last,setLast]=useState(0);
  const {stage,elapsed,active,reduced}=usePhase4Runtime(playing,items.some(i=>i.status==='running'||i.status==='waiting'));
  if(elapsed!==last){const delta=elapsed-last;setLast(elapsed);setItems(current=>advanceQueue(current,delta,limit));}
  const rows=useAnimatedRows(items.map(i=>i.id).join(','),active&&!reduced,duration);
  useEffect(()=>{if(listFocus.current&&rows.current&&!rows.current.contains(document.activeElement)){rows.current.focus();}},[items,rows]);
  function add(){const added=Array.from({length:Math.min(3,8-items.length)},()=>{const id=++serial.current;return {id,name:`模擬ファイル ${id}.png`,status:'waiting' as const,progress:0,fail,attempt:1}});setItems(current=>advanceQueue([...current,...added],0,limit));setNotice(`${added.length}件を登録。実アップロードはしません`)}
  function change(id:number,action:'pause'|'resume'|'cancel'|'retry'|'up'){
    setItems(current=>{let next=current.map(i=>{if(i.id!==id)return i;if(action==='pause'&&(i.status==='running'||i.status==='waiting'))return {...i,status:'paused' as const};if(action==='resume'&&i.status==='paused')return {...i,status:'waiting' as const};if(action==='cancel'&&!['complete','cancelled'].includes(i.status))return {...i,status:'cancelled' as const,attempt:i.attempt+1};if(action==='retry'&&i.status==='failed')return {...i,status:'waiting' as const,progress:0,fail,attempt:i.attempt+1};return i});if(action==='up'){const at=next.findIndex(i=>i.id===id);if(at>0&&next[at].status==='waiting'){next=[...next];[next[at-1],next[at]]=[next[at],next[at-1]];}}return advanceQueue(next,0,limit)});setNotice(`項目 ${id}：${{pause:'一時停止',resume:'再開',cancel:'取消',retry:'再試行',up:'順番を上へ'}[action]}`)
  }
  const relevant=items.filter(i=>i.status!=='cancelled'),progress=relevant.length?Math.round(relevant.reduce((a,i)=>a+i.progress,0)/relevant.length):0;
  return <div ref={stage} className="practicalStage phase4Stage phase4bAsync" data-testid="practical-stage" data-active={active} data-reduced={reduced}>
    <div className="practicalControls"><button onClick={add} disabled={items.length>=8}>模擬ファイルを3件追加</button><label>同時実行数<select value={limit} onChange={e=>{const n=Number(e.target.value);setLimit(n);setItems(current=>{let used=0;return advanceQueue(current.map(i=>i.status==='running'&&++used>n?{...i,status:'waiting'}:i),0,n)})}}><option value={1}>1件</option><option value={2}>2件</option><option value={3}>3件</option></select></label><label>登録・再試行の応答<select value={fail?'failure':'success'} onChange={e=>setFail(e.target.value==='failure')}><option value="success">成功</option><option value="failure">失敗</option></select></label><button disabled={!items.some(i=>['complete','cancelled'].includes(i.status))} onClick={()=>{setItems(current=>current.filter(i=>!['complete','cancelled'].includes(i.status)));setNotice('完了・取消項目を整理')}}>完了・取消を整理</button></div>
    <p>実行中 <output data-running>{items.filter(i=>i.status==='running').length}</output> / {limit}件、登録 {items.length} / 上限8件</p><label>全体進捗（取消を除く） <output>{progress}%</output><progress max={100} value={progress}/></label>
    <div ref={rows} className="phase4Rows uploadRows" role="region" tabIndex={-1} aria-label="模擬アップロード一覧" onFocusCapture={()=>{listFocus.current=true}} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))listFocus.current=false}}>{items.map((i,index)=><div key={i.id} data-row={i.id} data-status={i.status} className="uploadRow"><strong>{i.name}</strong><span>{labels[i.status]} / 試行 {i.attempt}</span><label>{i.name} の進捗 <progress max={100} value={i.progress}/><output>{Math.floor(i.progress)}%</output></label><div className="practicalControls">
      {['waiting','running'].includes(i.status)&&<button onClick={()=>change(i.id,'pause')} aria-label={`項目 ${i.id} を一時停止`}>一時停止</button>}{i.status==='paused'&&<button onClick={()=>change(i.id,'resume')} aria-label={`項目 ${i.id} を再開`}>再開</button>}{i.status==='failed'&&<button onClick={()=>change(i.id,'retry')} aria-label={`項目 ${i.id} を再試行`}>再試行</button>}{!['complete','cancelled'].includes(i.status)&&<button onClick={()=>change(i.id,'cancel')} aria-label={`項目 ${i.id} を取消`}>取消</button>}{i.status==='waiting'&&<button disabled={index===0} onClick={()=>change(i.id,'up')} aria-label={`項目 ${i.id} を上へ`}>順番を上へ</button>}</div></div>)}</div>
    <p role="status">{notice}</p><p>各項目は約4秒の有効時間で完了します。停止・画面外・非表示中は進捗も停止。取消済み項目には時計から書き戻しません。再試行は試行番号を更新し、上の応答設定を使用します。実ファイル・ネットワークは使用しません。</p>
  </div>;
}
export function ResizableSplitPane({playing,duration}:Props){
  const panelId=useId();
  const [ratio,setRatio]=useState(50),[vertical,setVertical]=useState(false),[dragging,setDragging]=useState(false);
  const {stage,active,reduced}=usePhase4Runtime(playing,false);const pane=useRef<HTMLDivElement>(null),handle=useRef<HTMLDivElement>(null),pointer=useRef<number|null>(null);
  function end(){const id=pointer.current;pointer.current=null;if(id!==null&&handle.current?.hasPointerCapture?.(id))handle.current.releasePointerCapture(id);setDragging(false)}
  useEffect(()=>{const node=pane.current,capture=handle.current;if(!node)return;const measure=()=>{setVertical(node.getBoundingClientRect().width<540);const id=pointer.current;pointer.current=null;if(id!==null&&capture?.hasPointerCapture?.(id))capture.releasePointerCapture(id);setDragging(false)};const ro=new ResizeObserver(measure);ro.observe(node);measure();return()=>{ro.disconnect();const id=pointer.current;if(id!==null&&capture?.hasPointerCapture?.(id))capture.releasePointerCapture(id);pointer.current=null}},[]);
  useEffect(()=>{if(!active){const id=pointer.current;pointer.current=null;if(id!==null&&handle.current?.hasPointerCapture?.(id))handle.current.releasePointerCapture(id)}},[active]);
  if(!active&&dragging)setDragging(false);
  function move(x:number,y:number){const box=pane.current?.getBoundingClientRect();if(!box)return;const size=vertical?box.height:box.width;if(size>0)setRatio(Math.min(80,Math.max(20,((vertical?y-box.top:x-box.left)/size)*100)))}
  return <div ref={stage} className="practicalStage phase4Stage phase4bAsync" data-testid="practical-stage" data-active={active} data-reduced={reduced}>
    <p>分割比率 <output data-ratio>{Math.round(ratio)}%</output> : {Math.round(100-ratio)}% / {vertical?'上下配置':'左右配置'} / {dragging?'ドラッグ中':'待機'}</p>
    <div ref={pane} className="splitPane" data-vertical={vertical} data-dragging={dragging} style={{'--split':`${ratio}%`,'--b-duration':`${duration}ms`} as CSSProperties}><section id={panelId}><h4>資料</h4><p>領域の幅・高さが変わります。長い文章は折り返します。</p></section><div ref={handle} className="splitHandle" role="separator" tabIndex={0} aria-label="分割位置" aria-controls={panelId} aria-orientation={vertical?'horizontal':'vertical'} aria-valuemin={20} aria-valuemax={80} aria-valuenow={Math.round(ratio)} onDoubleClick={()=>{end();setRatio(50)}} onPointerDown={e=>{if(e.button!==0)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture?.(e.pointerId);e.currentTarget.focus();setDragging(true)}} onPointerMove={e=>{if(pointer.current===e.pointerId)move(e.clientX,e.clientY)}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{pointer.current=null;setDragging(false)}} onKeyDown={e=>{if(['ArrowLeft','ArrowDown','ArrowUp','ArrowRight','Home','End','Escape'].includes(e.key)){e.preventDefault();end();if(e.key==='Home')setRatio(20);else if(e.key==='End')setRatio(80);else if(e.key!=='Escape')setRatio(r=>Math.min(80,Math.max(20,r+(['ArrowRight','ArrowDown'].includes(e.key)?5:-5))))}}}><span aria-hidden="true">⋮</span></div><section><h4>プレビュー</h4><p>隣の領域と合計100%。内容は不変です。</p></section></div>
    <button onClick={()=>{end();setRatio(50)}}>分割を50%へ戻す</button><p>境界をドラッグ、矢印キーは5%、Home/Endは20/80%。ダブルクリックで初期化。狭い領域は上下に切り替わります。Escape・ポインタ取消で中断し、現在比率を保持します。</p>
  </div>;
}
