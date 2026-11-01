"use client";
import {useState} from 'react';
import {EditableDataTable,FilterBuilder} from './Phase5Data';
import {DateRangePicker,TreeView} from './Phase5DateTree';
import {VirtualizedList,MultiSelectChips} from './Phase5Lists';
const demos:Record<string,React.ComponentType>={'editable-data-table':EditableDataTable,'date-range-picker':DateRangePicker,'virtualized-list':VirtualizedList,'filter-builder':FilterBuilder,'tree-view':TreeView,'multi-select-chips':MultiSelectChips};
export default function Phase5Player({id}:{id:string}){const [generation,setGeneration]=useState(0);const Demo=demos[id];return <div className="phase5Player"><div className="practicalControls"><button onClick={()=>setGeneration(v=>v+1)}>Reset</button></div><div key={generation} data-testid="phase5-stage" data-exhibit={id}><Demo/></div><p>Reset・閉室で状態と有限アニメーションを破棄。動き低減時も操作結果を維持します。保存・通信・バックグラウンドの継続時計はありません。</p></div>}
