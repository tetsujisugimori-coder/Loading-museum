# 第5期A：検証記録（提出前更新中）

2026-11-01 JST。対象と設計は [inventory](phase5a-inventory.md)。現在の総合は **PARTIAL**、独立レビュー未実施、マージ推奨 **NO**（提出後の独立判断待ち）。CIと実ブラウザ結果は確定後に追記する。過去4A/Bの成功を新HEADへ自動継承しない。

## 環境・準備

隔離clone `loading-phase5a`、branch `feat/practical-ui-phase5a`。Node 24.22.1 / npm 11.9.0。既存lockfileでnpm ci。初回default cacheは/home配下の権限問題で失敗、専用/tmp cache指定で成功。依存解決条件を緩和したものではない。履歴のWindows環境とは異なる。

## 今回実施済み自己検証

| 検証 | 結果 | 証拠・範囲 |
|---|---|---|
| inventory基準/作業版 | 239 → 245、13室 | `scripts/inventory.mjs`、`app/page.tsx`室数式 |
| 新規data単体 | 8 PASS / FAIL 0 / SKIP 0 | stable ID編集、sort、複数選択、IME、取消、空欄、AND/OR、無効条件、上限 |
| 新規navigation単体 | 12 PASS / FAIL 0 / SKIP 0 | 日付逆順/無効/keyboard、Tree親閉鎖focus、仮想一覧DOM数/絞込、Chips上限/重複/IME |
| 合計20単体 | exit 0 | [最終ログ](phase5a-evidence/unit-controls-final.log) |
| 担当TSX ESLint | exit 0 | 製品2展示と追加試験ファイル、全館lintとは区別 |
| tsc --noEmit | exit 0 | この時点の作業ツリー。提出HEAD全体再検査は別 |
| 正式全体check/build | 273 PASS、exit0 | check-second.log。最終局所修正後もlint/type/new20/build成功 |
| Chromium/WebKit | 48/48 PASS、exit0 | browser-acceptance/results.json。両ブラウザ×4幅×6展示、狭幅tap・実キー・Reset・低減後再操作・横超過0・pageerror0 |
| GitHub CI / HEAD | PENDING | commit/push後に一致照合 |
| 独立レビュー | NOT_TESTED | 実装者の自己試験を独立結果と呼ばない |

最初のnavigation collect error（製品JSX閉じ括弧不足）と、次の1件のセレクター誤り（aria-hidden装飾をaccessible nameへ誤包含）を[試行記録](phase5a-evidence/unit-controls-attempts.md)に分離。後者は正しいaccessible nameへ訂正し、focus/選択/非表示の期待条件を維持。試験修正を製品RED→GREENと呼ばない。初回原ログ未保存は同記録に明示。

## 独立レビューへ渡す重点

1. sort中の編集が安定IDに残り、取消・再編集・連続sortで別行へ反映されないこと。
2. 日付文字列の比較、無効日の意味、逆順交換と説明の一致。
3. 仮想一覧の実DOM上限、末尾・絞込・Reset後の位置と表示の一致。
4. AND/ORを実評価し、空条件を隠れて真偽へ強制しないこと。
5. Treeの親閉鎖後focus/選択と階層ARIA、Chipsの非破壊上限変更。
6. 320px局所スクロール、文字拡大、reduced motion、閉室cleanup、旧239登録保全。
7. 証拠と最終HEAD・CIの一致。自己検証を独立PASSへ昇格させない。

## 残存・未検証

- Issue #44既存critical3、Windows既存WAAPI timeout UNKNOWNは継続。新規リスクと区別し、安全性全体PASSとはしない。
- 実機Safari/Mac、VoiceOver、OS IME、実機タッチUNVERIFIED。
- 初出・発明者UNKNOWN。完全なARIA/APG・全OS操作の認証ではない。
- 第4期Bの保留中証拠は別工程で保持。今回その転送・再パッケージ化・リンク補完をしない。

## ローカル統合結果（2026-11-01 JST、提出前作業ツリー）
- npm check は既存253＋新規20＝273件成功、lint/typecheck/build成功。Node24.22.1/npm11.9.0。CIはNode22で別検証。
- 新規browser初回: Chromium320 table/date/virtual成功後、Filterのoutput暗黙statusと明示statusの二重取得でharness停止。
- 2回目: 同3展示成功後、selectを含むlabel全文のexact locator不一致で停止。fieldsetの比較selectへ特定し、期待結果は変更なし。
- 3回目: 同5展示成功後、Chipsのaria-disabled候補にPlaywright clickが待機。無効状態をassertし、実Enter入力で追加されないことを検証する方式へ修正。
- 4回目は基本48条件の検証。さらに狭幅tapと動き低減後の再操作を追加して最終再検証する。途中結果を成功数に合算しない。
- 375px PNG目視でカレンダー二桁が折返す表示不良を確認。calendar buttonのpadding/nowrapを局所修正し、最終PNGを目視し二桁の同一行表示を確認。日付値・選択仕様変更なし。

## 最終ローカル受入
- Chromium 141 / WebKit 26、Playwright1.56.1。Linux環境でWebKit公式バイナリ＋隔離依存wrapperを使用（OS実機Safariとは別）。
- 最終48条件と補強前48条件は別試行、合算しない。スクリーンショットは各試行375px各展示のみ12枚、修正前を削除せず計24枚。
- 最終実行開始時HEADは基準でdirty=true。実行中に同一実装を69b0965/a212cafへコミットし、製品・harnessは追加変更なし。提出HEADとの一致はCIのclean checkoutで再確認する。
- 旧559path中548blob不変、変更11pathは統合・台帳/件数期待値・CI・README/LOGのみ。旧app/data全件と過去証拠、lockfile不変。
- 本文/画像目視は自己検証。独立レビューは未実施、Draftで引渡し。
