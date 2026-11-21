# 第7期D Interactive Motion Lab

Issue #87。基準main 416a04aad057eeee41157b86383ccdf22ec91d0f、PR #86統合済み。286展示・13室（歴史145、現代164、横断23）から6作品追加し292展示・13室（歴史145、現代170、横断23）へ。AGENTS.mdと追加repo skillは不存在。未マージ画像研究PRへ依存しない。

## 設計

鑑賞→実操作→仕組み観察。観察は初期閉鎖。Press & Releaseは保持時間、Hold to Confirmは継続入力が確定条件、Magnetic Attractionは距離/変位、Swipe to Dismissはジェスチャーの確定とUndo、Focus Haloは実focusと装飾の分離、Status Morphは模擬非同期処理の取消を主題とする。既存Drag & Settleの着地位置、Sliding Indicatorの選択表示、Success Drawの単独完了表現、Motion Compositionの時間配列を複製しない。

実測はDOM矩形・入力event時間など実際に取得した値に限定。モデル値と画面画素の物理表示を区別する。非表示・画面外・閉室で処理を失効させ、復帰だけでは旧処理を復活させない。reduced motionでは装飾を抑制し、長押し閾値や模擬処理の意味を省略しない。新runtime依存・画像・外部通信なし。

各部品固有の処理を独立実装し、親はviewport/visibility/reducedだけを提供する。取消世代とイベント所有者を用い、旧timer/RAFや多重入力からの書戻しを拒否。旧ID、URL、登録順序、元286件を監査する。総数assertのみ292へ更新し、旧作品の操作期待値を緩和しない。

## 検証計画

単体/境界/取消/遅延callback反例。Chromium/WebKit×375/390/765/1280×normal/reduced=16条件。入力・状態・resize・画面外・キーボード・touch代替・200%文字を確認。A/B/C、WAAPI/Flash/検索/URLを回帰。HEAD/tree、build/source digest、JSON/PNG/traceを対応づける。最終CIと独立レビューで判定する。

実機iPhone Safari、VoiceOver、物理タッチ/keyboardはNOT_TESTED。Playwright WebKitはSafari実機ではない。OS背景ライフサイクルは合成visibilityと区別する。#44/#54、Image Adjustment native WebKit touchと従来timeoutは残件を維持。Draft解除/マージ/本番公開なし。
