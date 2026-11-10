export const smallMotionIIExhibits=[
{id:'spring-toggle',title:'Spring Toggle / 弾む切替',tags:['Small Motion II','バネ','状態','観察'],note:'ON/OFFの目標と、追いつく位置を分けて観察。',difference:'既存Switchは操作部品、本作はバネ定数と途中反転の運動計算が主題。'},
{id:'success-draw',title:'Success Draw / 結果を描く',tags:['Small Motion II','線画','取消','状態'],note:'模擬結果と線の描画進行を別に観察。',difference:'Send Flightの変形・飛行に対し、結果状態とSVGの線描画の関係を扱う。'},
{id:'sliding-indicator',title:'Sliding Indicator / 選択をつなぐ',tags:['Small Motion II','タブ','補間','位置'],note:'移動途中の位置から次の目標へ。',difference:'既存タブUIの内容切替より、実矩形と連続入力時の補間に焦点を当てる。'},
{id:'expanding-card',title:'Expanding Card / ひらく情報',tags:['Small Motion II','矩形','レイアウト','逆転'],note:'カードの幅・高さ・位置の指定値を観察。',difference:'既存開閉UIとは異なり、実レイアウト変化と指定矩形の時間変化を説明。'},
{id:'drag-settle',title:'Drag & Settle / 並びの余韻',tags:['Small Motion II','ドラッグ','収束','取消'],note:'移動先を空け、離して収束。取消では順序を保全。',difference:'KanbanやSortableの管理機能でなく、周辺要素の退避と収束の計算を主題とする。'},
{id:'skeleton-reveal',title:'Skeleton Reveal / 待機から内容へ',tags:['Small Motion II','スケルトン','疑似読込','状態'],note:'模擬読込の結果と表示演出を分ける。',difference:'既存待機標本ではなく、完了後の表示への移行と古い結果の取消を観察。'},
] as const;
export type SmallMotionIIId=typeof smallMotionIIExhibits[number]['id'];
