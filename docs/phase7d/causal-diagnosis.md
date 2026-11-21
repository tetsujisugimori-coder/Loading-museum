# 第7期D 非同期因果診断

## 固定開始点と保全

開始HEAD `181dd9710fbb04e49081bb64761b533e061cc28c`、tree `99ecde9fecba20e0d5b4b38d78422b69698be1ac`。Issue #87 / Draft PR #88を継続する。
旧正式run42894048407のSwipe765通常とStatus375通常の失敗を別々に扱う。
旧WebKit ZIP SHA-256: `f04669d0764283537ec2696d2c434e464f8767e4b93965ed2ab9a82c78946971` / `bffe7b13965630704aa4808abe66b7f3edf0dbf0ba05e79271e4d827691f60aa`。原証拠を置換しない。

## 実験計画

- A: 追加in-page計測なし。共通Playwright trace・スクリーンショット・元の状態取得は残るため完全無観測ではない。
- B: handler / 状態更新要求 / React commitと時計境界の最小計測。
- C: Bにイベント配送・世代・timer登録/発火・guard判定を追加。
- Chromium/WebKit、Swipe765通常とStatus375通常、各群3試行、計36試行を事前固定。fresh browser/contextを各試行に使用。正式runnerの作品内前段操作を保持。
- 機構の設定時間、runFor500/3000、期待dismissed/Errorは変更しない。barrierや待機延長を採用しない。
- 製品appは変更せず、厳密anchor検査付き変換を隔離コピーに適用する。各コピーのbefore/after source hashと生成out全file hashを保存する。
- 実測callbackと計算期限を区別する。timer登録記録はsetTimeout直後であり、記録時刻+delayは内部deadline実測ではない。host monotonicとbrowser時計は同期済みと仮定しない。
- React更新要求とuseLayoutEffect commitを分離する。commitは等状態再renderも対象。DOMはcommit時と最終取得を別に保存する。

## 判定

診断COMPLETEは対象操作と原証拠が取得できた意味であり、製品PASSや原因確定ではない。製品の期待状態不一致はFAILのまま保存する。途中停止はINCOMPLETE/NOT_TESTED。Aで不可視の内部時点はUNKNOWN。
H1配送、H2登録、H3発火、H4棄却、H5commit、H6DOM、H7仮想時計環境、H8計測影響、H9pointercapture取消、H10Replay世代を独立に評価する。非再現のみで旧失敗仮説をREJECTEDにしない。

## 実行

`DIAGNOSTIC_GROUP=C DIAGNOSTIC_COPY_DIR=work/isolated-C node scripts/prepare-phase7d-diagnostic.mjs`

`DIAGNOSTIC_GROUP=C DIAGNOSTIC_BUILD_DIR=work/isolated-C/out DIAGNOSTIC_BUILD_MANIFEST=work/isolated-C/diagnostic-build.json BROWSERS=chromium,webkit DIAGNOSTIC_REPEATS=3 node scripts/diagnose-phase7d-async.mjs`

Playwright1.56.1を使用。CIはengine×groupの6job、artifact保持30日。現行正式16条件workflowとは別であり、その失敗を診断成功で上書きしない。
ローカルはworkspace専用TMPDIRを使用する。既存/tmp容量不足と独自WPEランチャーの差を明示する。

## 保留

原因が確定しない限り製品修正を行わない。main/Draft解除/公開は禁止。実機Safari・VoiceOver・物理入力はNOT_TESTED。既存#44/#54等を解決済みと扱わない。
