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
- 開始/終了UTCとmonotonic実測を記録。表の経過秒は終了検出までのouter wall timeで、最大約2秒のpoll待機＋snapshot処理分の終了検出遅延を含む（子コマンドの厳密な終了時刻ではない）。約2秒周期のsampleはnamespace内PID/コマンド名/CPU、メモリ、process数であり、ホスト全体の負荷不在を証明しない。メモリ値の適用範囲も完全には保証しない。cgroup/PSI制約ファイル未取得はUNKNOWNで、無制限とはしない。
- チーム内の他build/test/browserを停止して専有。軽い読取/HTTPは並行することがある。`child_cpu_*` は子プロセス集計で、ブラウザ全体CPUではない。
- `baseline/manifest.json` に対象sourceと全証拠SHA-256。`baseline/results.json` と各ログが数値の正本。詳細timer/React順序/rAFはこのbaselineで未計測、後続の限定診断と区別する。

## baseline保全時の次段階計画（実績は後続節）

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

## PR専用品質CI（公開workflowとは独立）

`.github/workflows/pr-quality.yml` を追加。pull_request/workflow_dispatch、contents:read、PR headそのもののcheckout、Node24.22.1/npm11.9.0固定、npm ci、check、独立build、失敗exit伝搬、30分job上限、固定12pathのみの成果物保存。Pages workflowは無変更・未実行。check自体が含むbuildと別buildを意図的に区別する。CI1回はローカル5反復の代替ではない。

初回 `40426920758` attempt1 / HEAD `e258b7b...` はjobs0のworkflow validation FAIL。job.envでrunner.tempを参照できないという確認済み原因に対し、first stepの `$RUNNER_TEMP` と `$GITHUB_ENV` へ移す最小修正を行った。ローカルYAML/Python構文成功ではGitHub expression context検証を代替できなかった。失敗記録はci/initial-validation-failure.jsonに保持する。

修正後 `40427284755` attempt1 / HEAD `95555da...` は実pull_request SUCCESS。179/179、check38.020秒、build10.003秒。artifact ZIP SHA-256は `41152a3cbeaee8bf6fc1a70923723466d3f413b5ca656f2262ee7b64951503bc`、API digestと一致。内部11ファイルhash、head/tree、実行前後source不変を検証。runnerはubuntu24/4並列CPU、local9との差とCI=trueをprovenanceに記録。PR merge event SHAと実checkout headを区別した。これは先行HEADの結果であり、最終提出HEADの実CIは提出後にPR/Issueで別途照合する。

独立CIレビューのP2（artifact範囲/残存staging・unsupported context）とP3（tree照合明示）は修正・対照確認済み。[CI設計](ci-design.md)と[独立CIレビュー](ci-independent-review.md)を参照。今回のworkflow修復RED/GREENを旧製品Q1根因の修復と混同しない。

## Native実測の判定境界

今回の新build・現sourceに対するnative N2はCh/WK×375/390/765の全6条件、228行動検査・live取消12/12・paused6/6成功。Stage1の旧期待値を維持した主要ゲーム検査も6/6、30グループ成功。served HTML/JS/CSS15ファイルはoutと一致した。

観察モード全量は48グループを実施し5条件PASS、WK765はMenuの途中pause入力時にnativeが220/220ms finishedだったためPARTIAL。終端到達を途中停止成功にしない。別のWK765限定probeは147msと132msでrunning→paused位置保持を確認したが、190ms狙いでは220ms終端に達してINPUT_MISSED。probeもPARTIAL、元全量を成功へ書換えない。早期/終端付近への入力到達や遅延根因は未確定。

実測browserは取得できたPlaywright1.56のCh141/WK26。1.62のmatching取得はHTMLエラー、escalated起動はsandboxのread-onlyエラーで未実行、1.56を/tmp専用へ取得した。WKの不足libは公式Debian packageを/tmpだけへ展開して補完し、global OSは変更しなかった。起動失敗・中断・補完経過と実versionはnative資料に残す。新成功を旧失敗の根治や実機Safari/VoiceOver/実OS背景化/文字拡大の保証へ拡張しない。

文字200%・theme・motionは既存シナリオ内の範囲であり、全条件の直積や全197展示の網羅PASSではない。B1/M1と既存全館表示問題は今回解消したと扱わない。今回の製品修正根拠は得られず、現環境の全check成功・N2限定成功・CI整備と、旧Q1根因UNKNOWN/観察未到達を区別して **総合PARTIAL／マージNO／Stage2B HOLD** を維持する。

## 最終独立レビューと提出照合

[最終独立レビュー](final-independent-review.md)でbaseline/final証拠hash、55 source、native38成果物/gzip、served15、先行CI ZIPを別担当が照合した。製品テスト・実ブラウザの独立再操作とは区別する。新規未対処P0〜P2は発見されなかったが、既存Q1原因UNKNOWNと観察未完を残す。最終commit後の実CI、API digest、remote HEAD/tree、Draft/open状態はPR36/Issue35の提出結果へ記録し、この文書の先行HEAD成功で代替しない。
