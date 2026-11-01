"use client";
import { useLayoutEffect, useRef, useState } from 'react';
import './phase5-data.css';

type RecordRow = { id: string; name: string; category: string; score: number };
export const phase5Records: RecordRow[] = [
  { id: 'r1', name: '星の地図', category: '図形', score: 72 },
  { id: 'r2', name: '波の記録', category: '動き', score: 40 },
  { id: 'r3', name: '光の標本', category: '図形', score: 95 },
  { id: 'r4', name: '音の手帳', category: '記録', score: 58 },
  { id: 'r5', name: '風の模型', category: '動き', score: 84 },
];

export function EditableDataTable() {
  const [rows, setRows] = useState(() => phase5Records.map(row => ({ ...row })));
  const [sort, setSort] = useState<{ key: 'name' | 'score'; direction: 1 | -1 }>({ key: 'score', direction: 1 });
  const [selected, setSelected] = useState<string[]>([]);
  const [edit, setEdit] = useState<{ id: string; value: string; old: string } | null>(null);
  const [notice, setNotice] = useState('名称セルの編集を選ぶと、Enterで確定・Escapeで取消できます。');
  const body = useRef<HTMLTableSectionElement>(null);
  const positions = useRef(new Map<string, number>());
  const returnFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!edit && returnFocus.current) { body.current?.querySelector<HTMLButtonElement>(`button[data-edit-id="${returnFocus.current}"]`)?.focus(); returnFocus.current = null; }
  }, [edit]);
  const ordered = [...rows].sort((a, b) => (sort.key === 'score' ? a.score - b.score : a.name.localeCompare(b.name, 'ja')) * sort.direction || a.id.localeCompare(b.id));
  const signature = ordered.map(row => row.id).join(',');
  useLayoutEffect(() => {
    const next = new Map<string, number>(), animations: Animation[] = [];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const base = body.current?.getBoundingClientRect().top ?? 0;
    body.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row-id]').forEach(row => {
      const id = row.dataset.rowId!, top = row.getBoundingClientRect().top - base, old = positions.current.get(id);
      next.set(id, top);
      if (!reduced.matches && old !== undefined && old !== top && row.animate) animations.push(row.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' }));
    });
    positions.current = next;
    const cancel = () => animations.forEach(animation => animation.cancel());
    reduced.addEventListener('change', cancel);
    return () => { cancel(); reduced.removeEventListener('change', cancel); };
  }, [signature]);
  function order(key: 'name' | 'score') { setSort(previous => ({ key, direction: previous.key === key ? previous.direction === 1 ? -1 : 1 : 1 })); }
  function finish(commit: boolean) {
    if (!edit) return;
    if (commit && !edit.value.trim()) { setNotice('名称は空欄にできません。入力するか取消してください。'); return; }
    const id = edit.id;
    if (commit) { setRows(previous => previous.map(row => row.id === id ? { ...row, name: edit.value.trim() } : row)); setNotice(`${id}: ${edit.old} → ${edit.value.trim()} に変更`); }
    else setNotice(`${id}: 編集を取消、${edit.old} を保持`);
    returnFocus.current = id;
    setEdit(null);
  }
  return <div className="phase5Data" data-testid="editable-data-table">
    <p>並べ替えても選択・編集対象は行IDで保持します。編集できる列は名称です。複数のチェックで行を選べます。</p>
    <div className="phase5TableScroll" tabIndex={0} aria-label="編集表・狭い画面では横スクロール">
      <table><caption>架空の資料表</caption><thead><tr><th scope="col">選択</th><th scope="col">ID</th><th scope="col" aria-sort={sort.key === 'name' ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => order('name')}>名称で並べ替え</button></th><th scope="col" aria-sort={sort.key === 'score' ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => order('score')}>点数で並べ替え</button></th></tr></thead>
        <tbody ref={body}>{ordered.map(row => <tr key={row.id} data-row-id={row.id} data-selected={selected.includes(row.id)} data-editing={edit?.id === row.id}><td><input type="checkbox" aria-label={`${row.id}を選択`} checked={selected.includes(row.id)} onChange={() => setSelected(previous => previous.includes(row.id) ? previous.filter(id => id !== row.id) : [...previous, row.id])}/></td><th scope="row">{row.id}</th><td>{edit?.id === row.id ? <div className="phase5CellEditor"><label>名称を編集（{row.id}）<input autoFocus maxLength={40} value={edit.value} onChange={event => setEdit({ ...edit, value: event.target.value })} onKeyDown={event => { if (event.nativeEvent.isComposing) return; if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finish(event.key === 'Enter'); } }}/></label><small>変更前: {edit.old}</small><button onClick={() => finish(true)}>確定</button><button onClick={() => finish(false)}>取消</button></div> : <button data-edit-id={row.id} aria-label={`${row.id} ${row.name}を編集`} onClick={() => { setEdit({ id: row.id, value: row.name, old: row.name }); setNotice('編集中に別の編集を開くと、未確定の入力は破棄します。'); }}>{row.name} ✎</button>}</td><td>{row.score}</td></tr>)}</tbody>
      </table>
    </div>
    <p>表示順: <output data-testid="table-order">{signature}</output> ／ 選択ID: <output>{selected.join(', ') || 'なし'}</output></p><p role="status">{notice}</p>
  </div>;
}

type Condition = { id: number; field: 'name' | 'score'; operator: 'contains' | 'gte' | 'lte'; value: string };
function valid(condition: Condition) { return condition.value.trim() !== '' && (condition.field === 'name' || Number.isFinite(Number(condition.value))); }
function matches(row: RecordRow, condition: Condition) { return condition.field === 'name' ? row.name.includes(condition.value.trim()) : condition.operator === 'gte' ? row.score >= Number(condition.value) : row.score <= Number(condition.value); }
export function FilterBuilder() {
  const [conditions, setConditions] = useState<Condition[]>([{ id: 1, field: 'score', operator: 'gte', value: '70' }]);
  const [mode, setMode] = useState<'AND' | 'OR'>('AND');
  const nextId = useRef(2), add = useRef<HTMLButtonElement>(null);
  const returnToAdd = useRef(false);
  useLayoutEffect(() => {
    // At the limit, deleting must enable the button before restoring focus.
    if (returnToAdd.current) { add.current?.focus(); returnToAdd.current = false; }
  }, [conditions]);
  const active = conditions.filter(valid);
  const result = phase5Records.filter(row => active.length === 0 || (mode === 'AND' ? active.every(condition => matches(row, condition)) : active.some(condition => matches(row, condition))));
  function update(id: number, patch: Partial<Condition>) { setConditions(previous => previous.map(condition => condition.id === id ? { ...condition, ...patch } : condition)); }
  return <div className="phase5Data" data-testid="filter-builder"><p>各条件を架空の5件へ即時評価します。空欄・数値でない条件は除外し、有効条件が0件なら全件表示。最大6条件です。</p>
    <label>条件の結合<select value={mode} onChange={event => setMode(event.target.value as 'AND' | 'OR')}><option value="AND">AND：すべて一致</option><option value="OR">OR：どれか一致</option></select></label>
    <div className="phase5Conditions">{conditions.map((condition, index) => <fieldset key={condition.id}><legend>条件 {index + 1}</legend><label>対象<select value={condition.field} onChange={event => { const field = event.target.value as Condition['field']; update(condition.id, { field, operator: field === 'name' ? 'contains' : 'gte', value: '' }); }}><option value="score">点数</option><option value="name">名称</option></select></label><label>比較<select value={condition.operator} onChange={event => update(condition.id, { operator: event.target.value as Condition['operator'] })}>{condition.field === 'name' ? <option value="contains">を含む</option> : <><option value="gte">以上</option><option value="lte">以下</option></>}</select></label><label>条件値<input inputMode={condition.field === 'score' ? 'decimal' : 'text'} value={condition.value} maxLength={40} aria-invalid={!valid(condition)} onChange={event => update(condition.id, { value: event.target.value })}/></label><button onClick={() => { returnToAdd.current = true; setConditions(previous => previous.filter(item => item.id !== condition.id)); }}>条件 {index + 1} を削除</button>{!valid(condition) && <small>未入力または無効：この条件は評価しません。</small>}</fieldset>)}</div>
    <button ref={add} disabled={conditions.length >= 6} onClick={() => { const id = nextId.current++; setConditions(previous => [...previous, { id, field: 'score', operator: 'gte', value: '' }]); }}>条件を追加</button>
    <p role="status">有効条件 {active.length} / {conditions.length} ／ <output key={`${mode}-${result.map(row => row.id).join()}`} className="phase5Count">結果 {result.length} / {phase5Records.length}件</output></p>
    <ul className="phase5Results">{result.map(row => <li key={row.id}>{row.id}：{row.name}（{row.score}点）</li>)}</ul>{result.length === 0 && <p>一致する資料はありません。</p>}
  </div>;
}
