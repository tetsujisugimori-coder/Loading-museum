# Stage C：既存ビルドと現行runtimeの候補manifest

**判定：NON_EXECUTABLE_HOLD。** 登録10枠0/10、製品108未実施、PR #88 Draft。所有者の別実行承認なし。

- 正本候補：[`runtime-build-bridge.candidate.json`](../../../diagnostic-isolated/c-s1-10/runtime-build-bridge.candidate.json)。固定ビルド原ZIPのサイズ/SHA-256と旧`binding.json` SHA-256、I0/I1/I2各36ファイル・39経路の出力inventory SHA、現行runtimeの基準commit `f19b28b16c355b63412f06e764a40dc617e11bc9`・tree `615115fa28d73f13f69525554d735c220013057c`およびGit blob IDを結合。旧原ZIPは上書きしない。
- 固定ソース`5de4b08a`、元ビルドimplementation`f6ab3898`、現行runtime`f19b28b1`を別々に記載し、同一コミットと偽らない。候補manifest追加コミット自身は実行コードを変えないが、後続HEADへの自動認定ではない。
- [`verify-runtime-build-bridge.py`](../../../diagnostic-isolated/c-s1-10/verify-runtime-build-bridge.py) は読み取り専用。原ZIPのSHA/CRC、原`binding.json`、108実ファイル、117ルート、最新checkoutのGit blob＋全repo実バイトSHA-256を検査。結果は候補manifestにのみ出力し、元ZIP・登録票・実行物を変更しない。

```bash
python3 diagnostic-isolated/c-s1-10/verify-runtime-build-bridge.py \
  --archive /path/to/LM88-Stage-C-Builds-20261120.zip \
  --bridge diagnostic-isolated/c-s1-10/runtime-build-bridge.candidate.json \
  --repo . \
  --candidate-out /approved-project-workdir/binding-candidate.json
```

実行時の候補出力は`runtimeFiles.repo`のSHA-256を構築するが、`runtimeFiles.rootfs`と`runtimeFiles.driver`は空で**意図的に実行不可**。旧ZIPのruntime/environment SHAを最新版と主張しない。ブラウザ実受信27本文の過去照合は別の原票に帰属する。最新製品runnerでの受信とサーバー終了、通信異常30秒、1170/1200秒の実製品停止は未検証で、既存の限定WebKit停止PASSを流用しない。

後工程は、同じ実行境界で実際のrootfs・driverのSHA-256を採取し、製品用の原料source/build/served/received-byte対応と独立検査を行い、**別途所有者が登録10枠の開始を判断**すること。この文書とmanifestは承認でも実行手順の起動許可でもない。

## Stage C登録枠の製品起動契約

製品の入口は `stage_c_outer_observer.py --product`。登録票による既存のHOLDと、所有者が管理するホスト上の承認記録の両方を検証する。承認記録は `/etc/loading-museum/stage-c-approval.json` に置き、ファイルと親ディレクトリをroot所有・group/other書込不可とする。運用の登録票・承認記録・実行用bindingは、登録枠の実行を所有者が明示承認するときに確定する。

承認記録は以下の値を固定する。

- `schemaVersion=1`、`executionAuthorized=true`、専用の非root `launcherUid`、実行ごとに一意の `runId`
- `runtimeHead`、`runtimeTree`、`registrationSha256`、`bindingSha256`、`evidenceContractSha256`
- 読み取り専用でマウントした `repo`、`package`、`driver`、`rootfs` と、ランチャー専用の出力親ディレクトリ `runs`（モード0700）

外側監視者は今回専用の出力ディレクトリを排他的に作り、監督とPID名前空間の監視を確立してからworkerへ開始を通知する。起動通信には継承ソケットを使用する。この保証は承認記録の管理者と指定の専用アカウントを信頼するLinux運用が前提となる。既存の診断・合成入口は個別用途で使う。

1200秒到達時は期限違反を先に記録する。期限後の回収と監査保存には個別の結果を残す。製品入口の終了コード0は、時間内完了、監督の正常終了、68原票の読戻し、監査記録の保存がそろった場合に限る。

`terminal.json` は時間判定と原票の観測結果を記録する。同期と独立読戻しを期限内に終えたとき、製品入口は標準出力のJSONに `auditStorageStatus=PASS` と、保存した本文の `auditFileSha256`・`auditFileBytes` を返す。保存を確認する際は、この応答と `terminal.json` の実バイトを照合する。読戻しの期限超過や不一致時は `INCOMPLETE` と非ゼロ終了を返し、保存完了の応答項目は付与しない。
