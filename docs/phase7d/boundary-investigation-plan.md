# 第7期D 境界診断の準備記録

状態: **未実施・実行器と監査器の実装待ち**。この文書や割当コードは実験結果ではない。

開始時にPR #88のopen/DraftとHEAD `1c528a2131a0de706d51db56d03aa3c2066da78c`、tree `edacafefe8c327febde45dcba202bc045b07453c` を確認した。Issue #87と既存独立レビュー、既存32 ZIPの再起動後照合記録を確認した。既存32件と新規証拠は別管理とする。

## 試行割当と期待値

`scripts/phase7d-boundary-plan.mjs` はWebKit各作品・各群12、Chromium各作品・各群6、計108を固定する。6順列を各6ブロックで一巡させ、各作品・engine内で群の位置を均衡化する。作品の実行順は交互とする。各試行は新browser/context。中断試行を置換せず、未到達を記録する。前回API比較試験の再実行ではない。

Swipeは765×1000、通常motion、500ms、`dismissed`。Statusは375×1000、通常motion、3000ms、`Error`。入力前段と共通の一次判定DOM取得操作は前回と同じ。ただしB/Cではcommit時の計測DOM読取りが一次判定より先に生じ得るため、全群の最初のDOM読取りが同一とは主張しない。任意wait、barrier、timeout延長、WebKit skip、一次FAIL上書きは行わない。全engineを一つの計画で実行する場合、engine順はWebKit、Chromiumの固定順であり、時刻や環境との交絡が残る。

## 実行前の必須作業

- Aは追加内部計測なし。Bはcallback開始、state update要求、commitとそのDOM状態のみ。Cは加えて配送・登録・generation・guard・取消を収集する。既存の `phase7d-diagnostic-instrument.mjs` はBにhandlerがありcallbackがC限定のため、そのままでは今回のBに使えない。
- `diagnose-phase7d-async.mjs` はB/Cで各stepに追加browser評価を行い、群ごとに独立実行するため、そのままでは共通の一次読取りと均衡順序を満たさない。一次判定後にのみ内部ログを回収し、計測のDOM読取りとhost記録の介入を明示する新しい契約が必要。
- 実行器、buildとrunnerのhash結合、試行毎のtraceと一次判定の不変保存、INCOMPLETE・中断・負対照・trace/JSON照合を実装し、独立レビューを受ける。計測sinkの欠落・overflowは欠測とし、callback不発の証拠としない。
- 診断buildの成果物bytesを含む原artifact、保持期限とSHA-256を保存する。Windows保管先への追加分の読戻し結果を既存32件とは別に記録する。
- 上記と環境・CI容量確認が完了するまでは試行を開始しない。計画後に観測結果を理由として試行数を変更しない。

失敗試行自身の証拠だけでcallback、guard、更新要求、commit、DOMを判定する。成功試行や群間の率だけから別試行の原因や計測の因果作用を確定しない。host monotonicとbrowser仮想時計は独立の時計として記録し、根拠なく変換しない。
