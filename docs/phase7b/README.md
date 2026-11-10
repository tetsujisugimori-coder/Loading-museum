# 第7期B — Small Motion Collection II

基準 main 8eae48a276baacebfed23f602294f30f32b6a2bd（PR82統合済み）。Issue83。
既存274作品・13室の各IDを保持し、現代アニメーション室に6作品を追加。目標280作品、歴史145／現代158／横断23、13室。登録の自動集計は scripts/audit-phase7a.mjs。

## 作品と観察

- Spring Toggle: モデル解析解の位置・速度・目標。逆転で速度を引き継ぐ。実物測定ではない。
- Success Draw: 教材結果とSVG線進行を区別。線描画の終了は通信成功ではない。
- Sliding Indicator: DOM矩形を計測し、描画用補間位置から再目標化。リサイズ時は選択矩形へ再配置。
- Expanding Card: CSS width/height/transformを同じ補間から描画。FLIPではなくレイアウト変更。矩形は指定値であり実測ではない。
- Drag & Settle: 並び替え管理ではなく退避・収束。pointercancelは確定しない。キーボード/上下ボタンを併設。
- Skeleton Reveal: 実通信なし。65%時点に教材結果、残りにフェード/段階表示。固定枠の実測移動量はNOT_OBSERVED。

類似展示との個別差分は app/data/smallMotionIIExhibits.ts。全作品の解説detailsは初期閉鎖。CSS/SVG/JavaScript、追加依存なし。新規共有巨大エンジンなし。

## 検証と境界

tests/phase7b-first.test.tsx、phase7b-second.test.tsx は固定時間・境界・中断・故障期待値。scripts/verify-phase7b-browser.mjs はChromium/WebKit×4幅×2motion、原PNG/trace/hashを分離保存。既存phase7a試験の件数期待値のみ280/12へ更新し、既存操作assertは維持。

実行結果・独立レビューは追記予定。現時点マージ推奨NO。#44/#54、native WebKit touch、実機Safari/VoiceOver、前期ローカルWebKit timeoutは未解決。合成イベントは物理入力の代替証明ではない。Draft解除・マージ・公開は実施しない。
