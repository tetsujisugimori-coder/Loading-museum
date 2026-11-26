# 第7期D 108試行の準備状況

2026-11-12 JST。Issue #87、Draft PR #88。判定 **PARTIAL**。本実験は未開始、開始可否 NO、マージ推奨 NO。SwipeとStatusの根本原因はそれぞれ UNKNOWN。

基準 HEAD `1c528a2131a0de706d51db56d03aa3c2066da78c`、tree `edacafefe8c327febde45dcba202bc045b07453c`。作業前から未追跡だった `boundary-investigation-plan.md` と割当スクリプト・テストを保存する。これらは準備案であり実験実行の承認や完成した実験契約ではない。

割当案は WebKit 72、Chromium 36、計108件。両作品・A/B/Cそれぞれ WebKit 12、Chromium 6。Swipe 765×1000・500ms・dismissed、Status 375×1000・3000ms・Error。仮想時計の進行量であり、実時間の期限ではない。元120試行の操作列は `phase7d-api-plan.mjs` にある。前段の状態確認や時計初期化を含め、108専用の厳密な全操作列・証拠回収・中断再試行契約は未固定。

追加した `phase7d-boundary-instrument.mjs` は旧変換器を呼び出し、Bのtimer callback開始を状態更新要求やcommitとは別に記録する。A/Cと旧120試行の変換は変更しない。静的変換と構文の検査のみであり、実ブラウザ実行、実操作IDの紐付け、欠測・overflow・計測器エラーの扱い、Cの取消要求／処理の分離は未検証。commit hookのDOM読取りは一次判定前にも介入し得る。ログが順序に与える影響は UNKNOWN。

2026-11-12 ローカルで `node --test tests/phase7d-boundary-plan.test.mjs tests/phase7d-boundary-instrument.test.mjs tests/phase7d-diagnostic-instrument.test.mjs tests/phase7d-api-contract.test.mjs` を実行し73/73 PASS。旧120契約の合成trace・改変拒否テストを含むが、旧120実ブラウザ再実行や原証拠全件の今回の再照合ではない。新しい108用監査器の負対照でも実動作の故障注入でもない。

旧120の既存報告は109一次PASS、5一次FAIL、6前段INCOMPLETE。後続の成功による上書きはしない。既存HEADの17 workflowsは15 SUCCESS、API診断完全性とWAAPI2Aの2 FAILURE。今回変更後のCIは未実行。既存32原ZIPの保全・再起動後再照合は Issue #87 の既存記録を参照し、今回再照合したとは主張しない。今回の新規ブラウザ証拠はない。

残件: 機械可読の完全な契約、108枠を中断後も保持する実行器、一次結果と証拠有効性の独立保存、ブラウザ操作前後の原traceとbuild実体を照合する独立監査器、故障注入、負対照、旧実験の回帰、誤起動防止付きworkflow、独立レビュー、承認済み保管庫への新証拠保存と読戻し。これらを完了し、同じ反例で検証するまでは本実験を開始しない。
