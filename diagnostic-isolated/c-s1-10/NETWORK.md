# Stage C 通信条件と停止原票

基準はローカル `f6ab3898597b468b3f47efca7459ba80c37041a3`、tree
`9f07c51f62e520d8aa87e8dab9300b9386fa581e`。固定ビルドの I0/I1/I2 は各36ファイル・39配信経路。
この実装は登録票の HOLD を維持する。

| 対象枠 | 通信件数の候補 | 条件 |
| --- | --- | --- |
| AP-CAL-01〜04 | 0件 | about:blank にDOMを組み立てる校正fixture。HTTP規則は空。 |
| AP-01-I0 / I1 / I2、AP-02-I1 / I2 / I0 | 各1〜39件 | `GET /Loading-museum/` は1件固定。他の38経路は各0〜1件。HTTP 200、クエリなし。 |

製品枠の実測件数、キャッシュやプリフェッチの挙動、リソース型は実WebKitでの確認待ち。
固定ビルドの旧 `binding.json` は `requests: null` のため起動条件を満たさない。
実行に用いるmanifestには `requests`（製品6枠の配信監査用の厳密な回数）と
`networkRules`（10枠の枠ID別規則。製品枠は配信経路ごとにmethod、pathname、queryKeys、
queryValues、resourceTypes、allowedStatuses、min、max）を事前固定する。
既存の配信監査が厳密な回数とバイト列を検証するため、通信規則が許容する経路でも
旧来の厳密な配信計画が許容しない通信は停止対象になる。統合後の `runtimeFiles.repo` と
manifestのSHA-256も再固定し、実行前に独立審査と所有者承認を受ける。

runnerはローカルの配信ポートを確定し、`*.network-policy.json` を排他的に保存・再読取してから
ブラウザを起動する。BrowserContextに観測器を一度登録してからページを開く。
通信異常では新規ブラウザ操作と後続枠を止め、独立監督への `network-stop.notice.json` を原子的に公開する。
監督は停止要求と、PID名前空間の終了を個別に記録する。通信異常時の猶予は検知から最大30秒、
全体の上限は開始から1200秒。既存の1170秒の新規操作停止期限も適用する。

`*.network.json` はコンテキスト終了処理後に保存・再読取する。
中断中に回収した原票には `captureInterrupted` を記録し、一次判定と通信判定を別々に保持する。
校正04で意図したマーク容量超過の続行条件は従来どおり、4枠の独立読戻しと片付けの完了を必要とする。
