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

## Q1-B/C: 限定原因対照・修正判断

[limited/README.md](limited/README.md)に78件の未変更限定実行/同期待値の計測コピー各1回を保存。78/78×2成功、最大個別879.804/868.187ms。全量worker1との比較とquery/render/input/cleanup区間を採ったがtimeout未再現。別の計測wrapper4対照は4/4成功、正式製品件数へ加算しない。

分類A（製品の状態競合）、B（query/待機/cleanup）、C（資源/スケジューリング）、D（混在）はいずれも旧失敗の共通根因として確定できない。Bのquery負荷は観測できたが上限超過原因と証明できず、計測コピーの方が速いことも修正効果ではない。小DOM/Macintosh・Dodge等も成功した。単独と全量の差だけで環境原因と決めない。未計測のGC/Reactcommit全順序/全残留callbackはUNKNOWN。

**製品・正式テストは変更しない。確認原因が無いためRED/GREEN比較は成立せず、作り上げない。** 今回実装するのは欠けていたPR品質CIのみ。その失敗伝搬・成果物範囲は独立対照で検証するが、旧Q1の修正RED/GREENと混同しない。

## Q1-D: 最終製品コードでの再確認

計測HEAD `90f266b6538cffbdc101a5d5fde7ec95f80cad7f` はbaseline証拠だけの追加commit。app/tests/package等のbaseline SHA-256全件が不変。開始時に新CI/docs/native準備が未追跡だったことはfinal/results.jsonに記録した。計測中の変更はCI/記録のみで、製品/正式テストを変更していない。

| 最終再確認 | 成功/総数 | 失敗/skip | exit | 秒 |
|---|---:|---:|---:|---:|
| default-1 | 179/179 | 0/0 | 0 | 26.102 |
| default-2 | 179/179 | 0/0 | 0 | 24.069 |
| default-3 | 179/179 | 0/0 | 0 | 26.066 |
| worker1-1 | 179/179 | 0/0 | 0 | 38.097 |
| worker1-2 | 179/179 | 0/0 | 0 | 40.100 |
| separate build | ― | ― | 0 | 10.022 |

各全量runはN2正式7件、Menu/Coin観察、Stage1主要ゲーム、HP、Macintoshを含む。旧N2診断は元ファイル・同期待値・worker1で4/4成功（2.922秒）。その初回起動は `/usr/bin/time` 不存在でexit127、テスト自体は未実行。Python monotonic runnerで実行し、そのsetup失敗もfinal/old-diagnosticに残す。

現環境の5回安定性条件は成立したが、旧Q1根因は未特定。nativeと実CIは別途記録し、先行HEADの結果を最終HEADの実CIとして流用しない。
