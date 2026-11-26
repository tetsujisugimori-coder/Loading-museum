export const interactiveMotionExhibits = [
{id:'press-release',title:'Press & Release / 押す・保持・離す',tags:['Interactive Motion','押下','取消'],note:'押した時間と復元の関係を確かめる。',difference:'既存のバウンド再生とは異なり、実入力の保持時間・領域外取消を状態として扱う。'},
{id:'hold-confirm',title:'Hold to Confirm / 長押しで確定',tags:['Interactive Motion','長押し','時間'],note:'閾値まで保持したときだけ確定する。',difference:'既存のプログレス表示とは異なり、入力継続が確定条件で、離すと取消になる。'},
{id:'magnetic-attraction',title:'Magnetic Attraction / 距離で引き寄せる',tags:['Interactive Motion','距離','ポインター'],note:'入力位置と変位の関係を変えてみる。',difference:'既存のカーソル装飾と異なり、作用半径・強さ・モデル距離と実測変位を比較する。'},
{id:'swipe-dismiss',title:'Swipe to Dismiss / 払う・取消・Undo',tags:['Interactive Motion','スワイプ','Undo'],note:'距離と速度で操作の確定を決める。',difference:'Drag & Settleの着地位置ではなく、方向と閾値による確定・取消・復帰を主題にする。'},
{id:'focus-halo',title:'Focus Halo / フォーカスを追う輪',tags:['Interactive Motion','focus','キーボード'],note:'実際のフォーカスを保ったまま装飾を追従させる。',difference:'Sliding Indicatorの選択状態とは異なり、ブラウザのactiveElementと装飾の位置を別々に観察する。'},
{id:'status-morph',title:'Status Morph / 状態を形にする',tags:['Interactive Motion','状態遷移','非同期'],note:'模擬処理の成功・失敗・取消を比較する。',difference:'Success Drawの完了表現だけでなく、取消後の遅延応答を破棄する非同期状態遷移を体験する。'},
] as const;
export type InteractiveMotionId=typeof interactiveMotionExhibits[number]['id'];
