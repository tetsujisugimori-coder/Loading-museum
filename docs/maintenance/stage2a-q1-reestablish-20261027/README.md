# Stage 2A-Q1 現コードの品質検証再確立

## Q1-A: 新規baseline（2026-10-27 JST）

対象HEAD `b2d921182de7a92acc9227b0f767f1f555de2a16`、tree `a433cf09a7f27fe47d5fc383e85a2c029422b51e`。開始時clean、GitHub PR36も同HEAD/Draft/open、mainは `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。既存cloneを保全して使用、Windows未操作。

旧153件中1gzip回収・152未回収の境界は変更しない。今回は実際の現行package登録から新しく測定した **Node49＋Vitest130＝179件**。旧187件・未提出8対照・旧query改善を持ち込んでいない。製品/テストを修正する前に以下を逐次実行した。

| 新baseline | 成功/総数 | 失敗/skip | exit | 経過秒 |
|---|---:|---:|---:|---:|
| default-1 | 179/179 | 0/0 | 0 | 30.098 |
| default-2 | 179/179 | 0/0 | 0 | 28.071 |
| default-3 | 179/179 | 0/0 | 0 | 24.065 |
| worker1-1 | 179/179 | 0/0 | 0 | 36.085 |
| worker1-2 | 179/179 | 0/0 | 0 | 38.093 |
| separate build | ― | ― | 0 | 10.023 |

各checkはlint→typecheck→test（build→Node→Vitest）を含む。別buildも実行。全checkの再試行による成功選別ではなく、予定した5回すべての結果。5000ms・assert・既存テスト範囲・worker既定を変更していない。非再現は旧timeoutの根因解決を意味しない。現段階の総合はPARTIAL、マージNO、Stage2B HOLD。

### 条件・測定と再現

- Node24.22.1 / npm11.9.0 / Vitest3.2.4、Linux cloud、availableParallelism/CPU9。利用者実機ではない。
- `npm ci` 初回は既定cache `/home/agent/.npm` の親が存在せず失敗。`npm ci --cache /tmp/loading-npm-cache` は437依存を導入して成功、lock不変。両setupログを保存し製品試験失敗と混同しない。
- repo rootで `python /tmp/loading-q1-new-baseline/measure_checks.py`。実行したscriptを `baseline/measure_checks.py` に保存。再実行時は同scriptのOUTを新規保存先に変え、既存証拠を上書きしない。
- defaultはVITEST_*指定を除いた `npm run check`。worker1は `VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 npm run check`。終了後 `npm run build`。
- 開始/終了UTCとmonotonic実測を記録。約2秒周期のsampleはnamespace内PID/コマンド名/CPU、メモリ、process数であり、ホスト全体の負荷不在を証明しない。メモリ値の適用範囲も完全には保証しない。cgroup/PSI制約ファイル未取得はUNKNOWNで、無制限とはしない。
- チーム内の他build/test/browserを停止して専有。軽い読取/HTTPは並行することがある。`child_cpu_*` は子プロセス集計で、ブラウザ全体CPUではない。
- `baseline/manifest.json` に対象sourceと全証拠SHA-256。`baseline/results.json` と各ログが数値の正本。詳細timer/React順序/rAFはこのbaselineで未計測、後続の限定診断と区別する。

## 次段階

現行5領域の単独対照・最小計測、実native回帰、非公開/非デプロイのPR品質workflow、最終コードで同条件5check/build、独立レビューを順に行う。原因を確認できない場合は推測修正やRED/GREENの捏造を行わずUNKNOWNを保持する。Pages workflowは起動・変更せず、PR36とIssue35を継続する。
