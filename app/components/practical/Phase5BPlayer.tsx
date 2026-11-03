"use client";
import {KanbanBoard,NodeFlowEditor,ScheduleGrid} from './Phase5BEditors';
import {DiffViewer,ThemeStudio} from './Phase5BCompare';
import {ShortcutRecorder} from './Phase5BShortcuts';
import './phase5b.css';
const demos:Record<string,React.ComponentType>={'kanban-board':KanbanBoard,'node-flow-editor':NodeFlowEditor,'schedule-grid':ScheduleGrid,'diff-viewer':DiffViewer,'theme-studio':ThemeStudio,'shortcut-recorder':ShortcutRecorder};
export default function Phase5BPlayer({id}:{id:string}){const Demo=demos[id];return <div data-testid="phase5b-stage" data-exhibit={id}>{Demo?<Demo/>:<p role="alert">未登録の展示です。</p>}<p>閉室・展示切替で状態を破棄。Resetで確定データと履歴を初期化します。操作は保存されません。</p></div>}
