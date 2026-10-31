"use client";
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { usePhase4Runtime } from './phase4-runtime';
import type { DemoProps } from './Phase4Notices';
const tabTitles=['概要','展示と使い方','資料'];
const tabContents=['位置と幅を持つ選択帯。次のタブへ動かしてみてください。','長い見出しでは帯も広がります。左右矢印・Home・Endで選択とフォーカスを同期します。','資料へ切り替わりました。高速に往復しても、内容は最後の選択に一致します。'];
export function SlidingTabs({playing,duration}:DemoProps) {
  const [selected,setSelected]=useState(0);const id=useId();
  const {stage,active:running,reduced}=usePhase4Runtime(playing,false);
  const bar=useRef<HTMLDivElement>(null),indicator=useRef<HTMLSpanElement>(null);
  useLayoutEffect(()=>{
    const root=bar.current,band=indicator.current;if(!root||!band)return;
    const measure=()=>{
      const tab=root.querySelector<HTMLElement>(`[data-tab="${selected}"]`);if(!tab)return;
      const rect=tab.getBoundingClientRect(),base=root.getBoundingClientRect();
      band.style.transform=`translateX(${rect.left-base.left}px)`;band.style.width=`${rect.width}px`;
      band.dataset.left=String(rect.left-base.left);band.dataset.width=String(rect.width);
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(root);
    for(const tab of root.querySelectorAll('[role=tab]'))observer.observe(tab);
    return ()=>observer.disconnect();
  },[selected]);
  function select(index:number){setSelected(index);bar.current?.querySelector<HTMLButtonElement>(`[data-tab="${index}"]`)?.focus();}
  return <div ref={stage} className="practicalStage phase4Stage" data-testid="practical-stage" data-active={running} data-reduced={reduced} style={{'--phase4-duration':`${duration}ms`} as React.CSSProperties}>
    <div ref={bar} className="phase4Tabs" role="tablist" aria-label="資料の表示">{tabTitles.map((title,index)=><button key={title} role="tab" id={`${id}-tab-${index}`} data-tab={index} aria-controls={`${id}-panel-${index}`} aria-selected={selected===index} tabIndex={selected===index?0:-1} onClick={()=>setSelected(index)} onKeyDown={e=>{const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();select(next)}}}>{title}</button>)}<span ref={indicator} className="phase4TabIndicator" aria-hidden="true"/></div>
    {tabContents.map((text,index)=><div key={text} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={selected!==index} className="phase4TabPanel">{text}</div>)}
    <p role="status">選択：{tabTitles[selected]}</p><p className="phase4Hint">選択・内容は即時に確定。帯だけが実測位置と幅へ移動します。速度を落として連続切替・途中反転を比べてください。</p>
  </div>;
}

const sections=[
  {title:'短い説明',lines:['ひとつの段落を持つ短い内容。開いたときの高さを覚えてください。']},
  {title:'操作と観察',lines:['この節は内容が多く、必要な高さが異なります。','途中で見出しを押すと、その瞬間の高さから逆方向へ動きます。','後続の見出しも一緒に移動します。内容の量と動きの距離を比較できます。']},
  {title:'資料と補足',lines:['単一展開では他の節を閉じ、複数展開ではそれぞれを保持します。','Resetは方式・速度・開閉を初期化します。']},
];
function AccordionSection({title,lines,open,toggle,moving,duration,id}:{title:string;lines:string[];open:boolean;toggle:()=>void;moving:boolean;duration:number;id:string}) {
  const panel=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),metric=useRef<HTMLOutputElement>(null);
  useLayoutEffect(()=>{
    const box=panel.current,inner=content.current,out=metric.current;if(!box||!inner||!out)return;
    let animation:Animation|undefined,frame=0,valid=true;
    const measure=()=>{
      const current=box.getBoundingClientRect().height,target=open?inner.getBoundingClientRect().height:0;
      if(animation){animation.onfinish=null;box.style.height=`${current}px`;animation.cancel();}
      cancelAnimationFrame(frame);
      const report=()=>{if(valid)out.value=`現在 ${Math.round(box.getBoundingClientRect().height)}px / 目標 ${Math.round(target)}px`;};
      box.dataset.target=String(Math.round(target));
      const finish=()=>{if(!valid)return;box.style.height=open?'auto':'0px';box.dataset.phase=open?'open':'closed';report();};
      if(!moving||!box.animate||Math.abs(current-target)<1){finish();return;}
      box.dataset.phase=open?'opening':'closing';box.style.height=`${target}px`;
      animation=box.animate([{height:`${current}px`},{height:`${target}px`}],{duration,easing:'ease-in-out'});
      const sample=()=>{report();if(valid&&animation?.playState==='running')frame=requestAnimationFrame(sample);};sample();
      animation.onfinish=finish;
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(inner);
    return ()=>{valid=false;observer.disconnect();cancelAnimationFrame(frame);if(animation){const height=box.getBoundingClientRect().height;box.style.height=`${height}px`;animation.onfinish=null;animation.cancel();}};
  },[open,moving,duration]);
  return <section className="phase4AccordionSection"><h4><button id={`${id}-heading`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={toggle}><span>{title}</span><span aria-hidden="true">{open?'−':'＋'}</span></button></h4><div ref={panel} id={`${id}-panel`} role="region" aria-labelledby={`${id}-heading`} aria-hidden={!open} inert={!open} className="phase4AccordionPanel"><div ref={content} className="phase4AccordionContent">{lines.map(line=><p key={line}>{line}</p>)}</div></div><output ref={metric} className="phase4Metric" aria-label={`${title}の高さ`}/></section>;
}
export function AnimatedAccordion({playing,duration}:DemoProps) {
  const [multiple,setMultiple]=useState(false),[opened,setOpened]=useState<number[]>([]);const id=useId();
  const {stage,active:running,reduced}=usePhase4Runtime(playing,false),root=useRef<HTMLDivElement>(null);
  function toggle(index:number){setOpened(current=>current.includes(index)?current.filter(x=>x!==index):multiple?[...current,index]:[index]);}
  return <div ref={stage} className="practicalStage phase4Stage" data-testid="practical-stage" data-active={running} data-reduced={reduced}>
    <label>展開方式<select value={multiple?'multiple':'single'} onChange={e=>{const value=e.target.value==='multiple';setMultiple(value);if(!value)setOpened(current=>current.slice(-1))}}><option value="single">単一展開</option><option value="multiple">複数展開</option></select></label>
    <div ref={root} onKeyDown={e=>{const buttons=[...root.current!.querySelectorAll<HTMLButtonElement>('h4 button')],index=buttons.indexOf(e.target as HTMLButtonElement);if(index<0)return;const next=e.key==='ArrowDown'?(index+1)%3:e.key==='ArrowUp'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();buttons[next].focus()}}}>{sections.map((section,index)=><AccordionSection key={section.title} {...section} id={`${id}-${index}`} open={opened.includes(index)} toggle={()=>toggle(index)} moving={running&&!reduced} duration={duration}/>)}</div>
    <p role="status">{multiple?'複数':'単一'}展開 / 開いている節 {opened.length}件</p><p className="phase4Hint">ゆっくり表示にして開閉途中でもう一度見出しを押すと反転します。現在/目標pxを比較。矢印/Home/Endで見出し移動、Enter/Spaceで開閉。動き低減・停止時は選択した最終状態をすぐ表示します。</p>
  </div>;
}
