export type Phase2BId='tunnel'|'raster'|'elastic'|'kaleidoscope'|'ink'|'glitch';
export const phase2BStudies: {id:Phase2BId;title:string;category:string;tags:string[];description:string;instruction:string;origin:string}[]=[
{id:'tunnel',title:'Infinite Tunnel',category:'インタラクティブ作品',tags:['アート','現代','遠近','Canvas','自動再生','概念再構成'],description:'奥行きで縮小する輪郭を繰り返し、移動と回転でトンネルに見せます。',instruction:'速度・回転・奥行きを調整。',origin:'デモシーンのワイヤーフレーム表現から着想。独自計算。'},
{id:'raster',title:'Raster Bars',category:'画面演出',tags:['アート','現代','波','Canvas','自動再生','概念再構成'],description:'水平帯の位置と色を波で変化させます。実機の走査線割り込みではなくCanvasによる再構成です。',instruction:'色・振幅・速度・帯数を調整。',origin:'レトロコンピューターのラスターバー表現に着想。'},
{id:'elastic',title:'Elastic Space',category:'インタラクティブ作品',tags:['アート','現代','弾性','Canvas','ドラッグ','概念再構成'],description:'ポインター周辺の格子を変位させ、ばねと減衰の近似で戻します。',instruction:'格子をドラッグして離す。弾力・減衰・密度を調整。',origin:'ばねの復元力を用いた独自の格子実験。'},
{id:'kaleidoscope',title:'Kaleidoscope',category:'インタラクティブ作品',tags:['アート','現代','対称','Canvas','ドラッグ','原典着想独自作品'],description:'入力した軌跡を角度ごとに回転し、交互に反射します。',instruction:'画面に描画。鏡面数・色・回転を調整、消去できます。',origin:'万華鏡の反射原理を再構成した独自作品。'},
{id:'ink',title:'Ink Bloom',category:'インタラクティブ作品',tags:['アート','現代','粒子','Canvas','ドラッグ','概念再構成'],description:'色の粒子を広げ半透明に重ね、水中インクの広がりを近似します。流体シミュレーションではありません。',instruction:'クリック・ドラッグで色を追加。拡散・流れ・重ねの濃さを調整。',origin:'インク拡散に着想した独自の粒子近似。'},
{id:'glitch',title:'Glitch Laboratory',category:'画面演出',tags:['画面遷移','現代','ノイズ','Canvas','クリック','概念再構成'],description:'元画像に色ずれ、走査線、矩形ノイズを重ねます。点滅を控えた静的実験です。',instruction:'各効果と強度を変更。復元ボタンで元画像に戻す。',origin:'一般的な映像ノイズ表現に着想した独自画像処理。'},
];
