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

## 独立反例による修正

後半3作品では動的reduced-motion、収束中のkeyboard/pointer再操作、取消後resume、pointercancel、予期しないcapture喪失、正常capture解放を独立検証し修正。先行3作品も別担当が取消復活とreduce往復巻戻りを検出し、同一入力で修正を確認。WebKit実入力で判明した連続pointermove/upの古いReact状態参照は同期セッションで解消し、旧実装RED／新実装GREENの同一反例を追加。

全npm suiteの先行実行は747件成功、追加独立試験を含む最新専用群は最終CIで再実行する。全館監査scripts/audit-phase7b.mjsは基準274件の全レコード完全一致と新6件を確認。独立レビューは実装分担者による未担当後半レビューと、別担当の先行/全体レビューを区別。

ローカル失敗原記録を保持：依存symlinkによるTurbopack失敗、process SIGKILL、旧build件数不一致、旧Flash横断リンクtimeout、defaultWebKitの共有library不足。WPE wrapperによるLinuxWebKit追加検証とCI標準WebKitは別環境。最終CI・最終matrix・独立原票照合が完了するまでマージ推奨NO。全研究・物理入力を合格とはしない。
