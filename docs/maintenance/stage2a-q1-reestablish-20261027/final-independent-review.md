# Q1再確立・最終独立レビュー

確認: 2026-10-27 09:46 JST（00:46 UTC）。実装・計測担当とは別担当によるコード差分と保存証拠のレビュー。レビュー時HEAD `95555da7190a760a232fd2d31cf10196d0bd7c61` と今回の未commit文書/native資料を対象とする。**本担当は製品テスト/build/実ブラウザを再実行していない。** 以下の独立実行はoffline hash照合とCI recorderの軽量対照のみ。

## 結論

**総合PARTIAL／マージNO／Stage2B HOLDを支持する。** 現環境の反復成功と品質CIの稼働は確認できるが、旧Q1の共通根因はUNKNOWN。観察モードWK765の途中入力未到達はPARTIALのまま。新たな推測製品修正、期待値緩和、旧失敗の削除はない。

基準b2d9211比でapp/tests/package/既存Pages workflowに差分なし。N2取消とobserved autoplay抑止は既存実装を維持し、正式7件・旧診断4件の期待値を変えていない。未提出だった旧8対照は現在の179件へ混入していない。

## 独立に照合した証拠

- baseline/finalのresultsとlogを読み、各5回すべてNode49＋Vitest130＝179成功、失敗/skip0、exit0を確認。別buildもexit0。baseline証拠10件、final証拠12件のbytes/SHA-256を独立再計算して一致。baseline source55件の現ファイルSHAも一致した。
- 限定78件×2とwrapper4対照は診断であり追加正式件数ではない。同期wrapperやawaitを含む区間は重なり得る。query負荷の観測から旧5秒timeout原因を確定していない。計測copyが速いことを改善と主張していない。
- Native artifact-manifestの38件すべてbytes/SHA一致。n2 gzipの圧縮hashと解凍後5,399,918bytes/hashを独立照合。36source hashおよびout内15ファイルを保存されたserved hashとofflineで照合した。HTTP取得自体を本担当が再実施したわけではない。
- N2 rawは6条件各38行動＝228、strict assessorは各Replay/COLLECTの2経路＝12でPASS。IDを保持したcancel/idle観測と入力時非終端を区別。12のpredicate controlsを228行動へ加算していない。paused経路を自然再生途中経路へ混同していない。
- 観察rawは5条件PASS、WK765 Menuは220/220ms終端到達でPARTIAL。補助probeの147/132ms running→paused保持2例は限定成功、220ms finishedの1例はINPUT_MISSED。元全量のPARTIALを置換していない。Stage1は6条件/30群成功だが旧B1/M1根因修復や全館保証ではない。
- 全18PNGのうち6代表を掲載、12は一時領域だけという保存境界が明記されている。今回、本担当の独立画像・アクセシビリティ再操作は行っていない。

## CI差分と実行境界

[CI独立レビュー](ci-independent-review.md)のartifact許可リスト/空staging/明示tree照合を再確認。初回run40426920758はunsupported job.env contextでjobs0のFAIL、静的レビューが見落としたP2として残されている。修正後の先行run40427284755 attempt1は95555daに対するcheck/build成功である。

先行CI ZIPのSHA-256 `41152a3cbeaee8bf6fc1a70923723466d3f413b5ca656f2262ee7b64951503bc` と内部11ファイルmanifestを本担当が再計算して一致。raw check.logの49+130成功、provenanceのhead/treeとlocal git tree `08e59d16b9d327bb92d2cbe4252a78aa2267841e`、前後source不変を確認した。API digestとの一致は取得担当の確認として区別する。event merge SHAは実checkout SHAと異なり、merge統合試験ではない。

**この文書/native資料のcommit後の最終HEAD CIは未確定。** 最終run/attempt/HEAD/tree/成果物をPR/Issueで別途確認する条件であり、95555daの成功を後続HEADに流用してはならない。CI1回の成功も旧Q1根因解明の代替ではない。

## 指摘と残余事項

- P0/P1: 今回の差分で新規阻害指摘なし。製品を変更しないことと、全製品の安全性を網羅証明したことは別。
- P2 Q1: 歴史的timeoutの共通根因UNKNOWNを継続。現行10回成功だけで根治判定しない。
- P2 CI起動阻害: 初回見落としを訂正し、最小修正後の実CI起動/完走を先行HEADで確認。最終HEAD確認は上記の提出後条件。
- P3 計測精度: outer wall値に2秒pollとsnapshotの終了検出遅延が含まれる点を指摘し、README/LOGへ補足済み。子プロセスの厳密終了時刻ではない。数値を改変していない。
- WK765観察入力未到達、B1/M1、旧locator/入力遅延等の原因は未確定。補助probeを正式全量成功に換算しない。
- 実機Safari/iPhone/VoiceOver/実OS背景化・文字拡大、全197展示、全条件の直積は未検証。Playwright1.56と取得失敗した1.62を区別する。

README/LOG/新記録は、現在の成功・既存未解決・未回収152件・実測HEAD差を区別している。今回の新規差分に未対処の追加P0〜P2を発見していないが、既存P2 Q1と未完の観察受入を含むためマージ推奨NOを維持する。最終判断は人間に残す。
