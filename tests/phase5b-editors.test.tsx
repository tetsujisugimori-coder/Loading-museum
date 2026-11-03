// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {KanbanBoard,NodeFlowEditor,ScheduleGrid} from '../app/components/practical/Phase5BEditors';
import {moveCard,initialCards,connectionError,initialFlow,deleteNode,validTime,overlaps,parseTime} from '../app/components/practical/phase5b-model';
import {historyReducer} from '../app/components/practical/phase5b-history';
afterEach(cleanup);
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
const change=(name:string,value:string)=>fireEvent.change(screen.getByLabelText(name),{target:{value}});
const data=()=>JSON.parse(screen.getByTestId('committed-data').textContent!);
it('moves stable IDs across columns and within destination; invalid moves preserve data',()=>{
 const moved=moveCard(initialCards,'c1',1,1);expect(moved.filter(c=>c.column===1).map(c=>c.id)).toEqual(['c3','c1']);expect(moved.find(c=>c.id==='c1')!.title).toBe(initialCards[0].title);
 expect(moveCard(moved,'c1',1,0).filter(c=>c.column===1).map(c=>c.id)).toEqual(['c1','c3']);expect(moveCard(moved,'missing',2,0)).toBe(moved);expect(moveCard(moved,'c1',3,0)).toBe(moved);expect(moveCard(moved,'c1',0,99)).toBe(moved);
});
it('history forks after undo, ignores no-op, and reset discards future',()=>{
 const initial=[1],s={past:[] as number[][],present:initial,future:[] as number[][]};let h=historyReducer(s,{type:'commit',value:[2]},initial);h=historyReducer(h,{type:'undo'},initial);expect(h.present).toEqual([1]);h=historyReducer(h,{type:'redo'},initial);expect(h.present).toEqual([2]);h=historyReducer(h,{type:'undo'},initial);h=historyReducer(h,{type:'commit',value:[3]},initial);expect(h.future).toEqual([]);expect(historyReducer(h,{type:'commit',value:[3]},initial)).toBe(h);expect(historyReducer(h,{type:'reset'},initial)).toEqual(s);
});
it('kanban CRUD, reorder then edit, draft cancellation and undo preserve identities',()=>{
 render(<KanbanBoard/>);change('移動先','1');change('挿入位置','1');click('移動を確定');click('選択カードを編集');change('カード名','修正版');click('編集を保存');expect(data().find((c:{id:string})=>c.id==='c1')).toEqual({id:'c1',title:'修正版',column:1});
 click('選択カードを編集');change('カード名','破棄');fireEvent.keyDown(screen.getByLabelText('カード名'),{key:'Escape'});expect(data().find((c:{id:string})=>c.id==='c1').title).toBe('修正版');click('選択カードを削除');expect(document.activeElement?.textContent).toBe('カードの配置');expect(data().some((c:{id:string})=>c.id==='c1')).toBe(false);click('Undo');expect(data().find((c:{id:string})=>c.id==='c1').title).toBe('修正版');click('Reset');expect(data()).toEqual(initialCards);change('カード名','新規');click('カード追加');expect(data()).toHaveLength(4);
});
it('flow rejects self, duplicate, cycle and dangling relations; deletion cascades',()=>{
 expect(connectionError(initialFlow,'n1','n1')).toContain('自己');expect(connectionError(initialFlow,'n1','n2')).toContain('既に');expect(connectionError(initialFlow,'n2','n1')).toContain('循環');expect(connectionError(initialFlow,'gone','n2')).toContain('存在');expect(deleteNode(initialFlow,'n1')).toEqual({nodes:[initialFlow.nodes[1]],edges:[]});
});
it('flow UI keeps graph and layout in history, deletes focused target, supports empty/reset',()=>{
 render(<NodeFlowEditor/>);click('接続を追加');expect(screen.getByRole('status').textContent).toContain('既に');change('接続元','n2');change('接続先','n1');click('接続を追加');expect(data().edges).toHaveLength(1);expect(screen.getByRole('status').textContent).toContain('循環');
 fireEvent.keyDown(screen.getByRole('button',{name:'n1 入力'}),{key:'ArrowRight'});expect(data().nodes[0].x).toBe(15);click('ノード削除');expect(data().edges).toEqual([]);expect(document.activeElement?.textContent).toBe('処理の流れ');click('Undo');expect(data().edges).toHaveLength(1);click('Reset');expect(data()).toEqual(initialFlow);
 click('n1 入力');click('ノード削除');click('n2 変換');click('ノード削除');expect(data()).toEqual({nodes:[],edges:[]});change('ノード名','再開');click('ノード追加');expect(data().nodes).toHaveLength(1);
});
it('time model rejects malformed, off-grid, reverse and boundary violations; touching is not overlap',()=>{
 expect(validTime(480,495)).toBe(true);expect(validTime(1185,1200)).toBe(true);for(const pair of [[480,480],[600,540],[479,600],[480,1201],[481,600],[NaN,600]])expect(validTime(...pair as [number,number])).toBe(false);
 expect(parseTime('09:99')).toBeNaN();expect(parseTime('x')).toBeNaN();expect(overlaps([{id:'a',title:'a',start:480,end:540}],{id:'b',title:'b',start:540,end:600})).toEqual([]);
});
it('schedule saves real times, overlap IDs, cancels draft and restores deletion/reset',()=>{
 render(<ScheduleGrid/>);change('終了時刻','11:00');click('予定を保存');expect(data()[0].end).toBe(660);expect(screen.getByText(/s1 調査:.*120分/).textContent).toContain('重複: s2');change('終了時刻','08:00');expect((screen.getByRole('button',{name:'予定を保存'}) as HTMLButtonElement).disabled).toBe(true);click('編集取消');expect((screen.getByLabelText('終了時刻') as HTMLInputElement).value).toBe('11:00');click('予定削除');expect(data()).toHaveLength(1);expect(document.activeElement?.textContent).toBe('1日の予定');click('Undo');expect(data()[0].end).toBe(660);click('Reset');click('新規予定');change('予定名','境界');change('開始時刻','19:45');change('終了時刻','20:00');click('予定を保存');expect(data().at(-1)).toMatchObject({title:'境界',start:1185,end:1200});
});
it('kanban handles empty data and new stable IDs after reset without resurrecting deleted drafts',()=>{
 render(<KanbanBoard/>);for(const title of ['展示を調べる','設計を描く','操作を試す']){click(title);click('選択カードを削除')}expect(data()).toEqual([]);expect((screen.getByRole('button',{name:'移動を確定'}) as HTMLButtonElement).disabled).toBe(true);change('カード名','再開');click('カード追加');expect(data()[0]).toEqual({id:'c4',title:'再開',column:0});click('Undo');expect(data()).toEqual([]);click('Redo');expect(data()[0].id).toBe('c4');click('Reset');expect(data()).toEqual(initialCards);
});
it('schedule handles all deletions, invalid off-grid edits, empty cancellation and fresh creation',()=>{
 render(<ScheduleGrid/>);click('予定削除');click('s2 制作 10:30–12:00');click('予定削除');expect(data()).toEqual([]);change('予定名','新規');change('開始時刻','08:01');expect((screen.getByRole('button',{name:'予定を保存'}) as HTMLButtonElement).disabled).toBe(true);click('編集取消');expect(data()).toEqual([]);change('予定名','再開');change('開始時刻','08:00');change('終了時刻','08:15');click('予定を保存');expect(data()).toEqual([{id:'s3',title:'再開',start:480,end:495}]);click('Reset');expect(data()).toHaveLength(2);
});
