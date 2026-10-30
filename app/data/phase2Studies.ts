export type StudyId = 'starfield' | 'plasma' | 'metaballs' | 'flock' | 'dissolve' | 'tile';
export const phase2Studies: {id: StudyId; title: string; category: string; tags: string[]; description: string; instruction: string; origin: string}[] = [
 {id:'starfield',title:'Starfield Warp',category:'インタラクティブ作品',tags:['アート','現代','粒子','Canvas','タッチ','概念再構成'],description:'奥の星は遅く、近くの星は速く広がります。透視投影で座標を奥行きで割ると速度差が生まれます。',instruction:'画面をドラッグして視点を移動。星数・速度・方向を調整。',origin:'デモシーンの星空表現から着想した独自作品。特定作品の素材やコードは使用しません。'},
 {id:'plasma',title:'Plasma Dream',category:'画面演出',tags:['アート','現代','波','Canvas','自動再生','概念再構成'],description:'複数の正弦波を足し、結果を色相へ写像します。波の数が干渉模様を変えます。',instruction:'色相・速度・波数を調整。',origin:'レトロCGのプラズマ表現に着想した独自計算。'},
 {id:'metaballs',title:'Liquid Metaballs',category:'インタラクティブ作品',tags:['アート','現代','融合','Canvas','ドラッグ','概念再構成'],description:'球ごとの距離に応じた場を足し合わせ、閾値で輪郭を作ります。実際の流体計算ではありません。',instruction:'画面をドラッグして最も近い球を動かし、球数・融合範囲・粘りを別々に調整。',origin:'メタボールの陰関数に着想した独自計算。'},
 {id:'flock',title:'Flocking Life',category:'インタラクティブ作品',tags:['アート','現代','群れ','Canvas','タッチ','概念再構成'],description:'近傍の中心への追従、接近時の回避、進行方向の整列を組み合わせて群れを作ります。',instruction:'画面をドラッグして群れを誘導。追従・回避・整列を個別に切替。',origin:'Boidsの群行動の概念を参考にした独自実装。'},
 {id:'dissolve',title:'Pixel Dissolve',category:'画面演出',tags:['画面遷移','現代','粒子','Canvas','クリック','原典着想独自作品'],description:'独自の2枚の図柄を画素に分け、分解と再集合を補間します。画面切替の演出に応用できます。',instruction:'切替ボタンで遷移。方向・速度・粒度を変更。',origin:'ピクセル遷移の一般的な表現から着想。図柄はコードで独自生成。'},
 {id:'tile',title:'Tile Flip',category:'画面演出',tags:['画面遷移','現代','回転','Canvas','クリック','原典着想独自作品'],description:'画像をタイルに切り、時間差をつけて横幅または縦幅を縮め反対面へ切り替えます。',instruction:'切替ボタンで途中反転。順序・速度・回転軸・回転方向を調整。',origin:'タイル遷移の一般的な表現から着想。図柄はコードで独自生成。'},
];
