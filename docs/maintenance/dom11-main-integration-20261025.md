# PR #31 / PR #32 main 統合記録（2026-10-25）

## 対象と保全

- 対象: 既存 Draft PR #31 / `fix/dom11-even-selection`。
- 統合前 PR #31: `4852ae62b33a5cb6ae9b4a049ec74fcfd7cd77d2`。
- fetch 後 main: `1e7d7de0bdf28efb785155a66027fad8d202e329`（tree `34d7efedf7dc0f15b8cd3a57844e2a3375c398b8`）。
- #32 は 2026-10-25 17:38:36 JST に merge 済み。実装後の独立レビュー追記 `c9f18479660cd86c331a32e05fbd538579641dfe` も含む。
- 元 checkout は clean、未追跡なし。別 worktree を作り元ブランチと作業ツリーを保全した。main・PR #32・公開設定へ変更しない。

## 第一希望・次善策・競合解消

第一希望の `git merge --no-commit --no-ff origin/main` を採用した。PR #31 と main の二親履歴を保持し、rebase / force push はしない。次善策は競合を解消できない場合の統合保留と個別設計確認。今回は不要で、実装上の妥協はない。

競合は2ファイルだけ。

- `package.json`: 両PRが `test` を拡張したため。mainのNode3ファイル・Vitest7ファイルをそのまま保持し、`tests/dom11-selection.test.tsx` を追加。依存関係・lockfile は変更しない。
- `LOG.md`: 両PRの追記位置が競合。DOM11記録を既存日付順へ挿入し、#32の作業・独立レビュー記録を一字も削除しない。今回の統合記録は末尾へ追記。

一括 ours/theirs は使用していない。main に対する製品コード差分は DOM11 ブロックだけ。WAAPI実装・main既存テスト・データ・CSS・README・Pages workflow・#32設計/検証/独立レビュー記録は main と同一。

## DOM11 と WAAPI の保持

DOM11 は P1〜P6、`index + 1` の表示番号による偶数判定で P2/P4/P6 を選択する。説明・コード例・実装が同じ条件を使い、Reset は選択を解除する。DOM11以外のコード、DOM17を含む17展示のID/名称/順序は変更しない。

#32の3×4 Match-3、一般行列判定、5→3石・2段・800点、石ごとの演出、有限盤面、Reset世代保護、Falling Block、HP、Inventory、Lock-on、途中Reduced motion切替をそのまま保持。既存150＋WAAPI47＝197展示の定義と検索/集計も変更しない。

## ローカル検証

環境: Linux / Node v24.22.1 / npm 11.9.0。依存バージョン変更なし。

- `npm run check`: lint / 型検査 / build / 全テスト成功。
- `npm run build`: 独立実行成功。
- Node: 49成功、0失敗、0skip。Vitest: 8ファイル57成功、0失敗、0skip。合計106成功。
- DOM11の既存4件を含み、#32の102件を削除・無効化せず保持。
- `git diff --check`: 成功。
- 独立レビュー担当が Vitest 57件を別実行し成功。これはブラウザ検証とは別。

## ブラウザ・独立レビュー

Chromium 141.0.7390.37 / WebKit 26.0（Playwright、実DOM・native WAAPI）各765/375/390pxを実行。jsdomとは別の静的build実測。

- DOM11: 6条件すべてPASS。初回/連続/Reset/Enter/Space、computed背景色による偶数強調・奇数非強調、表示コード例の実DOM適用、17展示ID/名称/順序、light/dark、対象カードCSS文字200%を確認。pageerror 0。
- mainの既存 `scripts/verify-waapi-browser.py` は変更せず全6条件×9検査群を再実行。Match-3の実交換・5石消去・落下・3石消去・800点・Reset割込・ドラッグ・キーボード、HP Damage直後Reset、Falling/Inventory/Lock-on、途中motion ON取消とOFF後再開、197集計/検索を確認。
- WAAPI対象機能にFAILなし。765pxは両エンジンPASS、375/390pxは既知の全館タイトル文字200%横超過だけPARTIAL。新規回帰と扱わない。全条件pageerror 0。
- [今回のブラウザ証跡](dom11-integration-browser-results-20261025.json)。文字200%はCSSサイズ倍増で、ブラウザズーム・OS文字拡大・実機検証ではない。

独立した別担当によるソース/差分/登録テスト/保全/記録レビューを実施。P0/P1/P2なし。文書P3 1件（存在しないdata-numberへの言及）は `index + 1` へ訂正。独立担当が再確認済み、P0〜P3残件なし。自己レビューと区別し、実機レビューと称さない。

最終HEADはこの記録を含むmerge commitとしてPR #31更新本文に完全SHAを記録する（自身のSHAを同じcommit内へ埋める循環は作らない）。

## 残存負債と検証限界

既存の typewriter ID 重複と全館タイトルの文字200%横超過は対象外。DOM17等の既存保守課題も拡大修正しない。実機iPhone Safari / VoiceOver / OS文字拡大は未検証。CSS文字サイズ2倍と実機文字拡大を混同しない。全197展示の全操作保証ではない。

PR用GitHub Actions workflowはなく、Pages公開workflowは検証目的で起動しない。ローカル成功を実CI成功と呼ばない。Draftを保持し、人間のマージ判断に委ねる。

最終再実行: `npm run check` と `npm run build` がともに終了コード0。106件成功を維持。GitHub CLIは未認証のため、認可済みGitHub connectorで同じ検証済みtreeの二親merge commit作成とnon-force ref更新を行う。更新直前に元HEADを照合し、更新後にローカル/remote HEADとtreeを照合する。
