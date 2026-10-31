# 第4期A：独立レビュー・P2修正後の差分再確認依頼

実装・自己検証は八兵衛が実施。本ファイルは独立レビュー結果ではない。独立担当はPR本文に記録した最終HEAD/treeをGitHubから再取得し、今回の変更・試験・保存証拠・最終CIを点検してください。Draft解除、APPROVE、merge、auto-merge、公開は行わず、通常コメントで評価を返す。

初回独立レビューは[通常コメント](https://github.com/tetsujisugimori-coder/Loading-museum/pull/45#issuecomment-6550579686)に保存。返却P2-1を受け新規selectだけcolor-scheme:lightで実描画を修正し、追加の画素/選択/focus GUIを両engine×4幅×2 selectで実行、RED→GREENと原本を保持した。最新HEADの差分と最終CIでP2再確認を依頼する。自己検証16/16から独立閉鎖を自称しない。

## 重点点検

- 227→233の登録実測、13室、既存データ/第1〜3期と第4期B対象外の保持。`inventory-main.json` はgit showによる基準commit実測。
- Toastの独立期限/上限/中間解除/再配置とfocus、Undoの連続削除方針/期限/元位置復元、Reset/非表示/閉室での旧処理失効。
- InlineのIME/Enter/blurとfocus、Searchのactive descendant/候補なし/順序更新/タップ/取消。WebKit RED→GREENはbrowser-full/search-touch-green、未確定のtiming失敗はbrowser-final。ローカルdirty結果を提出HEADの結果と同一扱いしない。
- 異幅Tabsの実測帯、Accordionの現在高さ→目標/反転/単一複数、動き低減途中変更。無変位で不要Animationを作らない。
- 固定click/geometry/PNG/Reset/保存保護条件をCIの実HEAD結果で再確認。容量は停止中に厳密4件、期限・再配置は別の再生中操作。検査を削減していないか。
- test既存147と追加32を両方必須で実行。過去のtimeout1件/3件を隠していないか。main147成功とPR単独20成功から根因確定とは言っていない。既定5000ms/期待値/既存試験ファイルは保持。
- 依存29/critical3は未解決、#44で別管理。静的配信と開発/CIを混同して安全PASSにしない。

## コードの入口

`app/data/phase4aExhibits.ts` → `PracticalRoom phase=4` → `practical/Phase4Player.tsx`、Notices / Inputs / Navigation。
`phase4-runtime.tsx` は観察時計と有限FLIP/ghost、Navigationは現在高さを引継ぐWAAPI、TabsはCSS補間。
状態の確定をAnimation.onfinishへ委ねない。完了callbackは装飾要素に限定、cleanupでvalid=false/cancel、Resetは世代mount。

## 証拠の読み方

自己検証履歴と未検証は `phase4a-studies.md`。最終ローカルは `browser-submission`、最終CIはPR本文・通常コメントから辿る。`browser-final` は途中失敗した旧試行名で、最終HEADの保証ではない。manifestはバイトSHA-256/サイズを記録するが、生成時点前後でsourceが同一と推定する代用にはしない。最終CIのHEAD/treeとcheckoutを別途照合する。

実iPhone Safari・実タッチ・OS IME・VoiceOver・文字拡大・全館全操作はUNVERIFIED。現時点の総合PARTIAL、マージ推奨NO（P2修正後の独立差分レビュー待ち）。本レビュー依頼は正式承認を生成しない。
