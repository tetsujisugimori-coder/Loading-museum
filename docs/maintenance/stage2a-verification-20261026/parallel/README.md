# Stage 2A 追加検証：既定並列 check と worker 1

検証対象: `406bdbddada5e0783d6b9ce654ceea9788a19040`。2026-10-26 JST（実測 UTC は JSON）。製品・既存テスト・期待値・5000 ms 上限・package/lock は無変更。

## 結論

**既定 check の不安定性は再現。原因は未特定。** 既定並列 3 回中 2 回が同一テストの 5000 ms timeout、1 回成功。worker 1 の同検査も 1 回 timeout。「逐次なら必ず成功」「並列だけが原因」とは言えない。これらは DOM 試験のタイムアウトであり、実ブラウザ操作の不具合を確定する証拠ではない。旧失敗履歴は変更していない。

| 実行 | Node | Vitest | 全 check 秒 | Vitest 秒 | 対象テスト ms | 1分load範囲 |
|---|---|---|---:|---:|---:|---|
| default-1 | 49 成功 | 121 成功 / 1 失敗 | 116.617 | 27.21 | 9274 | 0.58–4.07 |
| default-2 | 49 成功 | 121 成功 / 1 失敗 | 103.068 | 25.21 | 7922 | 2.49–3.58 |
| default-3 | 49 成功 | 122 成功 / 0 失敗 | 84.166 | 18.61 | 4148 | 2.26–3.13 |
| worker1-1 | 49 成功 | 121 成功 / 1 失敗 | 156.946 | 76.96 | 5381 | 1.55–2.92 |

各回 171 件 = Node 49 + Vitest 122。skip/cancel/todo は 0。各回 lint、TypeScript、build、Node は成功、失敗位置は `tests/waapi-gallery.test.tsx:64` の「初期DOMを遅延し、開閉・検索・複合フィルター・0件・解除を扱う」。同じ既存期待値を使った。timeout 文は各失敗ログに要約・詳細の 2 回現れるが、失敗試験数は各 1 件。

## コマンドと環境

```
python docs/maintenance/stage2a-verification-20261026/parallel/measure_checks.py
# 3 回: VITEST_* の既存環境overrideなしで npm run check
# 1 回: 以下だけ追加し同じ npm run check
VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 npm run check
```

Node v24.22.1、npm 11.9.0、Vitest 3.2.4、Linux x64、Intel Xeon Platinum 8573C。利用可能 CPU 9。既定 worker 上限 8 は Vitest の `createForksPool` 内 `max(availableParallelism()-1,1)` と override 不在による推定。サンプル中の node 名 process 最大数は既定 9、worker1 2（親を含むため worker 実数と同一視しない）。cgroup quota は取得不能。

2秒ごとの `/proc/loadavg`、CPU counter、namespace-visible PID/PPID/CPU%/process名、子プロセスCPU時間を `results.json` に保存。コマンド引数・秘密環境変数は収集しない。子CPU集計は測定用 ps の微小コストも含む。チームはこの4実行中、別build/browserを意図して開始していない。ただし host 全体の独占利用は保証できず、load と失敗の因果関係は確定できない。各 npm check 内のbuildは順序どおり完了後に試験が始まる。

## setup 失敗との分離

親が検証worktreeに新規作成した `node_modules` symlink は worktree 外を指したため、最初の build が Turbopack に拒否された。製品試験に到達していない。続く試行は lint 中に中断した。この2件は `setup-attempt/` に保存し、上表の4回へ算入していない。親の許可後、この新規symlinkだけを unlink して既存依存ディレクトリを `cp -a`、外部取得・lock変更なしで上表を実行した。元依存ディレクトリと利用者の既存作業には手を加えていない。

## ハーネス確認と限界

成功・timeout失敗の合成ログで parser の negative control を実施（製品試験には計上しない）。Node v24 が TAP `#` ではなく `ℹ` 形式で summary を出したため、最初のJSONのNode欄は未抽出だった。raw logは不変のままparserを修正し、49成功/0失敗等を再抽出した。失敗を成功へ変更したものではない。

検査前後の package、lock、WaapiSampleGallery、WaapiGameObservation の SHA-256 一致を JSON に記録。旧 first/second log は Vitest 118 件の時点、今回122件とは同一版でない。旧 final log の逐次成功だけを今回の成功証拠に転用しない。

P2 候補: 既定の品質ゲートが再現性を欠く（製品の機能不良とは未確定）。次は当該長い同期DOM試験の処理区間別計測、同一環境の負荷と繰返しを別途調査。上限延長・skip・期待値緩和は対処として採用していない。今回の反復数で発生率や根本原因は確定できず、実CIでの再現も未検証。worker1失敗を環境だけのせいとして除外しない。
