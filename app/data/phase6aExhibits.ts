export const phase6aExhibits = [{
  id: 'pan-zoom', title: 'Pan & Zoom / 拡大して探す',
  use: '探索 図版 拡大 移動 可視範囲 ミニマップ',
  tags: ['探索', '座標変換', '取消可能', '第6期A-1'], technology: ['React', 'TypeScript', 'SVG', 'Pointer Events'],
  principle: '同じ図版座標から倍率・注目位置・可視範囲を計算。拡大の基準とミニマップの窓を操作して比べます。',
  replacement: 'レンズの局所効果や自由ドラッグ・Node Flowの要素配置に対し、図版全体の座標変換と可視範囲を管理します。',
  example: '観測所・庭・小道の独自SVG。架空の小世界を拡大して細部を探すローカル教材。',
  history: '発祥・初出年 UNKNOWN。一般的な探索UIを独自に再構成した教材で、実在施設の再現ではありません。',
  source: 'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html',
}];
