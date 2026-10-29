# PR品質CIの独立レビュー

確認: 2026-10-27 09:25 JST / 00:25 UTC。workflow設計担当とは別担当が `.github/workflows/pr-quality.yml` と `ci-design.md` をレビューした。対象workflow SHA-256は `711a2628ba0fe45a0bfee24e4dd78145a0ad2599eefa1a1c1f16abb344fd8704`。

## 結論と範囲

**新workflow差分に未解消のP0〜P2阻害指摘なし。実CIの成功判定ではない。** Q1の歴史的原因が判明・修復したという判断でもない。既存Pages workflowに差分はなく、公開・デプロイ・main push・PR自動変更を追加していない。製品/test/既存5000msを変更するworkflowではない。

- `pull_request` / 明示manualのみ。`pull_request_target`を使わず、`contents: read`、checkout資格情報保持なし。PR headをcheckoutし、eventのmerge SHAを別フィールドで保持。merge統合を試験したとは称さない。
- Node/npm固定、lockfileからの `npm ci`、既存 `npm run check`、別stepのbuild。check失敗後のbuildは観測継続であり、checkの非0やjob失敗を消さない。retry/continue-on-error/テストskip/timeout変更なし。
- recorderは非0を伝搬し、signalはraw負値とshell終了値を区別。開始終了UTCと単調経過時計、結合stdout/stderrを保存する。
- setup/identity失敗では後続コマンドが未実行になり得る。outcomesのskippedやsource_unchanged=nullを成功と読まない。identity前後のHEAD/tree/追跡済み変更を検査する。
- artifactは固定名のみ、シンボリックリンクを除外して空の専用stagingにコピー。manifest作成完了時のみupload_readyを出す。未完成の残存stagingを送らず、source不一致はready後に非0として診断を残す。
- job30分中断・runner消失等ではartifact未回収もあり得る。artifact保存成功だけをcheck成功としない。実run/attempt/head/tree、終了状態、ZIP/API digestと内部hashの照合は後続作業。

## 指摘と修正確認

1. **P2 成果物範囲:** 当初はevidence directory全体をupload/manifest列挙しており、未想定ファイルも含み得た。固定11ファイル＋manifestの12pathに制限し、regular-fileのみ別stagingへ移す修正を確認。
2. **P2 同保証の残存経路:** stagingの既存ファイル/symlinkが残る経路を指摘。空staging再作成とupload_ready条件を追加。未想定ファイル、source側symlink、staging側残存file/symlinkを含む対照で確認。
3. **P3 identity説明:** 最終treeを記録するだけだったため、初回provenance.checked_treeとの明示比較とsource_unchangedの記録を追加。正常tree/不一致treeを別対照で確認。

全て本レビュー時点で対処済み。安全境界を完全な敵対的PRコード隔離保証へ拡張しない。実行するリポジトリの依存・script自体の動作は、通常のPR runner権限内で別途レビューされる対象である。

## 本担当が実行した軽量対照

製品npm/test/build/browserは実行していない。workflowから抽出した同じPython recorder/finalizerだけを一時fixtureで検証した。

- Python heredoc3本の構文確認。
- recorder: exit0→0、exit7→7、存在しないcommand→1。
- SIGTERM: recorder JSONに-15、外部終了143。
- stdout/stderr双方がlogに残る。
- ci-design掲載の2つの再現scriptを最終workflowに対して独立実行し、両script exit0。
- 固定allowlist外ファイル・symlink除外、未取得identityのnull、staging残存除去、正常tree exit0／異なるtree exit1、manifest保持の対照成功。

上記はハーネスの負例・証拠保護の検査であり、GitHub Actions上の実行や製品179件の成功ではない。action pinの当日公式ref確認は設計担当の記録を参照し、本担当が別途remote refsを再取得したとは主張しない。

この静的・軽量レビュー版は凍結。最終CIおよび最終HEADの全差分・native証拠は別の追補レビューで確認する。

## 実CI validation失敗に伴う訂正・再レビュー（2026-10-27 09:33 JST）

上記「未解消P0〜P2なし」は静的レビューで発見できた範囲の判断だった。実CI run `40426920758` attempt `1`（対象HEAD `e258b7b`）はjob起動前のworkflow validationで失敗し、製品check/buildは未実行である。保存されたGitHub annotation HTMLを本担当も読み、job.env内の2箇所で `Unrecognized named-value: 'runner'`（Line18/19、runner.temp）を確認した。**P2 CI起動阻害を初回レビューで見落としていた**。YAML/Python構文や軽量対照の成功はGitHub expressionの配置制約検証ではない。旧結論を実CIが実行可能という保証に用いない。

最小修正を再読解した。job.envのQUALITY_EVIDENCE/QUALITY_UPLOADだけを削除し、先頭run stepで `$RUNNER_TEMP` から両パスをexport、同じ値を `$GITHUB_ENV` へ出力する。先頭step自身と後続stepへ適切に分けて値を渡し、既存の固定allowlist・空staging・upload_ready・失敗伝搬を変更していない。修正後workflow SHA-256は `abceff5c565052cb04bc50ddb2c66a316dcba14f18adb3c6a6357b1aea5a4c9a`。

当該unsupported context経路の除去を静的確認した段階であり、修正後のGitHub validation・job開始・完走は次の実run待ち。これらを確認するまでCI復旧PASSとはしない。製品/test/5000ms条件やPages workflowへの変更はない。
