// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {DiffViewer,ThemeStudio} from '../app/components/practical/Phase5BCompare';
import {ShortcutRecorder} from '../app/components/practical/Phase5BShortcuts';
import {diffLines,contrast} from '../app/components/practical/phase5b-model';
afterEach(cleanup);
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
const change=(name:string,value:string)=>fireEvent.change(screen.getByLabelText(name),{target:{value}});
const data=()=>JSON.parse(screen.getByTestId('committed-data').textContent!);
it('diff identifies exact changed/add/remove rows and retains original line numbers',()=>{
 expect(diffLines('A\nB\nC','A\nD\nC\nE')).toEqual([{kind:'same',oldLine:1,newLine:1,oldText:'A',newText:'A'},{kind:'change',oldLine:2,newLine:2,oldText:'B',newText:'D',hunk:1},{kind:'same',oldLine:3,newLine:3,oldText:'C',newText:'C'},{kind:'add',newLine:4,newText:'E',hunk:2,oldLine:undefined,oldText:undefined}]);
 expect(diffLines('A\nB','B')[0]).toMatchObject({kind:'remove',oldLine:1,oldText:'A',hunk:1});expect(diffLines('','')).toEqual([]);expect(diffLines('x\n','x')).toHaveLength(2);
});
it('diff reconstructs both inputs for duplicates, blank lines, swaps and all short binary sequences',()=>{
 const samples=['','\n','a\n','a\na','a\nb\na','b\na\nb','a\n\nb','\n\n'];for(let bits=0;bits<8;bits++)samples.push(Array.from({length:3},(_,i)=>(bits>>i)&1?'a':'b').join('\n'));
 for(const a of samples)for(const b of samples){const rows=diffLines(a,b);expect(rows.filter(r=>r.oldLine!==undefined).map(r=>r.oldText).join('\n')).toBe(a);expect(rows.filter(r=>r.newLine!==undefined).map(r=>r.newText).join('\n')).toBe(b);expect(rows.filter(r=>r.kind==='same').every(r=>r.oldText===r.newText)).toBe(true)}
 expect(diffLines('a\nb','b\na').filter(r=>r.kind==='same')).toHaveLength(1);
});
it('diff enforces resource boundaries explicitly, and navigation focuses actual hunk',()=>{
 expect(()=>diffLines('x'.repeat(24001),'')).toThrow('24,000');expect(()=>diffLines(Array(241).fill('x').join('\n'),'')).toThrow('240行');expect(diffLines(Array(240).fill('x').join('\n'),'')).toHaveLength(240);
 render(<DiffViewer/>);click('次の差分');expect(document.activeElement?.getAttribute('data-hunk')).toBe('2');click('前の差分');expect(document.activeElement?.getAttribute('data-hunk')).toBe('1');change('比較対象','blank');expect(screen.getByRole('status').textContent).toContain('両版とも空');expect((screen.getByRole('button',{name:'次の差分'}) as HTMLButtonElement).disabled).toBe(true);change('比較対象','long');expect(data().filter((r:{kind:string})=>r.kind==='change')).toHaveLength(1);change('旧版','x'.repeat(24001));expect(screen.getByRole('status').textContent).toContain('比較不可');expect(data().error).toBeTruthy();click('Reset');expect(data().filter((r:{hunk?:number})=>r.hunk).length).toBe(3);
});
it('theme uses standard contrast anchors and confines variables to preview, including undo/reset',()=>{
 expect(contrast('#000000','#ffffff')).toBe(21);expect(contrast('#123456','#123456')).toBe(1);
 const outside=document.documentElement.style.cssText;render(<ThemeStudio/>);change('背景色','#000000');change('文字色','#000000');expect(screen.getByRole('status').textContent).toContain('1.00:1');expect(screen.getByRole('status').textContent).toContain('注意');change('文字サイズ','24');change('余白','28');change('書体','monospace');expect(screen.getByTestId('theme-preview').style.getPropertyValue('--studio-size')).toBe('24px');expect(data().space).toBe(28);expect(document.documentElement.style.cssText).toBe(outside);click('Undo');expect(data().font).toBe('sans-serif');click('Redo');expect(data().font).toBe('monospace');click('サンプル操作 0');change('余白','8');click('Undo');expect(screen.getByRole('button',{name:'サンプル操作 1'})).toBeTruthy();click('Reset');expect(data().size).toBe(16);expect(screen.getByRole('button',{name:'サンプル操作 0'})).toBeTruthy();
});
it('shortcut records draft, rejects conflict, cancels change and executes only inside focused zone',()=>{
 render(<ShortcutRecorder/>);const zone=screen.getByRole('region',{name:'ショートカット実行領域'});click('キーを取得');expect(document.activeElement).toBe(zone);fireEvent.keyDown(zone,{key:'L',shiftKey:true});expect(data()).toEqual([{action:'count',key:'Shift+K'}]);click('登録を確定');expect(data()).toEqual([{action:'count',key:'Shift+L'}]);
 change('操作','light');change('キーを選択（入力代替）','Shift+L');expect(screen.getByRole('alert').textContent).toContain('競合');expect((screen.getByRole('button',{name:'登録を確定'}) as HTMLButtonElement).disabled).toBe(true);click('登録取消');expect(data()).toHaveLength(1);
 change('操作','count');click('countの登録を変更');change('キーを選択（入力代替）','Shift+Z');click('登録取消');expect(data()[0].key).toBe('Shift+L');fireEvent.keyDown(document.body,{key:'L',shiftKey:true});expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 0');zone.focus();fireEvent.keyDown(zone,{key:'L',shiftKey:true});expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 1');fireEvent.keyDown(zone,{key:'L',shiftKey:true,repeat:true});expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 1');click('countの登録を削除');expect(document.activeElement?.textContent).toBe('登録内容');expect(data()).toEqual([]);click('Undo');expect(data()[0].key).toBe('Shift+L');expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 1');click('Reset');expect(data()).toEqual([{action:'count',key:'Shift+K'}]);
});
it('shortcut reserves browser/OS combos and blur cancels capture without modifying bindings',()=>{
 render(<ShortcutRecorder/>);const zone=screen.getByRole('region');click('キーを取得');for(const mods of [{ctrlKey:true},{metaKey:true},{altKey:true}]){const event=new KeyboardEvent('keydown',{key:'K',shiftKey:true,...mods,bubbles:true,cancelable:true});fireEvent(zone,event);expect(event.defaultPrevented).toBe(false);expect(data()).toEqual([{action:'count',key:'Shift+K'}])}
 fireEvent.keyDown(zone,{key:'K',shiftKey:true,isComposing:true});expect(screen.getByRole('status').textContent).toContain('キー取得中');fireEvent.blur(zone,{relatedTarget:screen.getByRole('button',{name:'登録取消'})});expect(screen.getByRole('status').textContent).toContain('取得取消');expect((screen.getByRole('button',{name:'登録を確定'}) as HTMLButtonElement).disabled).toBe(true);
});

// PR #60 P2-01: authorized contract is Shift+letter (without Alt), scoped to the execution region.
it('shortcut Shift contract accepts Shift only, rejects Alt+Shift without preventing browser defaults',()=>{
 render(<ShortcutRecorder/>);
 const zone=screen.getByRole('region',{name:'ショートカット実行領域'});
 click('キーを取得');
 const altDuringCapture=new KeyboardEvent('keydown',{key:'L',shiftKey:true,altKey:true,bubbles:true,cancelable:true});
 fireEvent(zone,altDuringCapture);
 expect(altDuringCapture.defaultPrevented).toBe(false);
 expect((screen.getByRole('button',{name:'登録を確定'}) as HTMLButtonElement).disabled).toBe(true);
 expect(data()).toEqual([{action:'count',key:'Shift+K'}]);
 fireEvent.keyDown(zone,{key:'L',shiftKey:true});
 click('登録を確定');expect(data()).toEqual([{action:'count',key:'Shift+L'}]);
 const altExecution=new KeyboardEvent('keydown',{key:'L',shiftKey:true,altKey:true,bubbles:true,cancelable:true});
 fireEvent(zone,altExecution);expect(altExecution.defaultPrevented).toBe(false);
 expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 0');
 fireEvent.keyDown(document.body,{key:'L',shiftKey:true});
 expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 0');
 fireEvent.keyDown(zone,{key:'L',shiftKey:true});
 expect(screen.getByTestId('shortcut-result').textContent).toContain('カウント 1');
});
