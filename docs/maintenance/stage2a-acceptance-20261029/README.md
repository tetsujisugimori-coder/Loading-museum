# Stage 2A 現行品質ゲート再確認（2026-10-29 JST）

**総合 HOLD / マージ推奨 NO / Stage 2B 着手 HOLD。** 判定基準は A 現行表示・操作、B 検証基盤、C 歴史原因を分離する。A/B が必要条件を満たせば C の原因 UNKNOWN 単独では阻害しない。現行不具合の再現は A/B の不合格とする。過去の判定・失敗を消さない。本記録は現行必要経路へ到達できなかったため、A/B の受入証拠が不足している。

## 対象と既存作業

開始 PR HEAD `a3ef1af5bcf7beeea19b2f10bb43cceddbf285d7`、tree `68772cd5c91a0324ffc8bec3406bc50d19d84e79`、base main `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。提示版 `dac711a` より2 commit先行している。先行変更はA/B/C分離、187/179照合、検証器および拡大文字ラベルの局所CSS修正を含む。今回の担当は製品・テスト・assertion・5000msを変更していない。独立cloneの開始時作業ツリーはclean。

旧187の差8は回収記録に未commit query-boundary controls追加と記載がある。`50fbcd9..dac711a` の tests/app/package.json は不変。8件全文と未commit内の移動・改名はUNKNOWNで復元済みではない。必須範囲の現行評価は別途必要。詳細は [test-scope-audit](../stage2a-acceptance-20261027/test-scope-audit.md)。

## 今回のチェック（Windows、Node 24.20.0、npm 11.17.0）

現HEADの `npm run check` を既定3回、VITEST_MAX_FORKS/MIN_FORKS/MAX_THREADS/MIN_THREADS=1 で2回行い、各回 Node 49/49、Vitest 130/130、fail 0、skip 0、終了0。独立 `npm run build` も終了0。日時はJST。後続4回の開始・終了・終了コードとbuild終了は check-results.txt.gz に保存。最初の成功回の正確な開始・終了時刻、独立buildの開始時刻は未記録。最初の終了0は実行時のコマンド結果で確認し、ログには件数を保存。manifest.json は各保存ファイルのhashとサイズを記載。最初のsandboxチェックは依存用一時ディレクトリが作業ツリー内にある状態のlintで中断、その後別ディレクトリに移し実行。次のsandboxチェックもlint進行中に中断し、プロセス実行権限で5回を完了した。中断を成功回に含めない。

PR専用GitHub Actions [40449484561 attempt 1](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/40449484561) は `a3ef1af` の pull_request run、quality成功。job 122008587314 のcheckout・check・独立build・artifact各step成功をAPIで確認。artifact 12709314454 のAPI digest `cce8ec81175c17f9a3f4fffb7bdd2b16b3b0585d2b3bc53970c37896ab26d6ce`、9400 bytes。ZIP自体の再取得・内部hash照合は未実施。以降の文書commitに対するCIは別途確認する。

## ブラウザ実行と阻害

Playwright 1.56.0、Windows既存Chromium 1194/WebKit 2215の実行を準備。前者はChromium実行可能ファイルのrevisionで、ブラウザバージョンの実測値ではない。初回の静的HTTPで Chromium 375/390 は `goto` 10秒timeout、検査経路未到達。HTTP診断で293553 bytes中261120 bytesまで転送後停止。gzip配信に変更しHTML復号後SHA-256 `ccc4c867cdad65479460704147b5f6b3b56cd369780f690960f3e6b489f9a5e6` がbuildと一致したが、Chromium 375 のページ読込みは再びtimeout。初期条件の途中で停止し、残条件はNOT_RUN。保存JSONの文字コードはWindows既定cp932。原因は環境の転送・ページ読込みの失敗として観測した範囲のみ、製品やブラウザの根因はUNKNOWN。圧縮版全JS/CSSの配信後照合は行っていない。

WK765 Menu、N2、Stage1、Match-3/HP/Turn等の今回native全条件は未到達。旧報告のWK765 Menuの入力時終端PARTIALと追加probeを残し、成功へ置換しない。a3ef先行記録の表示6条件・288組合せ成功の主張は当時の記録であり、今回のnative再実行や実機検証ではない。本環境では現行表示・操作のPASSを宣言しない。

## 独立レビューと判断

別担当が `a3ef1af` を静的レビューし、P2: Menu途中pauseのページ内clickは実入力hit-testを証明しない、P2: 最終受入証拠不足を指摘。独立再レビューは保存17ファイルのgzip・展開後hashとサイズ、5ログの件数、a3efのCI成功を照合し一致。日時記述不足のP3は上記に訂正した。今回の5反復と既存CIの確認は後者の一部を補うが、実ブラウザ経路未到達と最終文書版CI・独立再確認は残る。Q1は今回の受入判断に必要な証拠不足のため **INSUFFICIENT EVIDENCE**、根本原因UNKNOWN。B1/M1も今回の再検証に不足がありINSUFFICIENT EVIDENCE。旧失敗は歴史的証拠として保存する。

次の1作業: 同一ソースを正しく配信できる環境で、固定されたChromium/WebKit全必須経路とWK765 Menuの実入力途中停止を実行し、失敗と証拠を保存する。全197展示、実機Safari、VoiceOver、実OS文字拡大・背景化は未検証。Draft/open/未マージを維持し、Stage 2B実装・自動マージ・Pages公開は行わない。
