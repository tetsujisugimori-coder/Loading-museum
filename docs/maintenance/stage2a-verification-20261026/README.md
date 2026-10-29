# Stage 2A 追加独立検証（2026-10-26 JST）

## 対象と制約
Issue #35 / Draft PR #36、検証基準 `406bdbddada5e0783d6b9ce654ceea9788a19040`。最新main `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。開始時GitHubでPRはopen/Draft/未マージ、並行open PRはこのPRだけと確認。原作業ツリーはclean、detached独立worktreeで検証。製品コード、既存期待値、5000ms上限、lockfile、既存証拠は変更しない。新規資料/診断試験だけを追加する。

既存Stage2A設計、独立レビュー、browser evidence README、旧WK765空Assertion失敗JSONと後続診断、旧WK390終端到達PARTIAL、最終CSSfocused/full時間試験の対象hash差を読み、本資料とは分離する。旧失敗はそのまま保存し、今回成功しても根因解消を推測しない。

## 環境と測定法
Cloud Linuxローカル静的export。native Chromium 141 / WebKit 26、Python Playwright。実Safari/VoiceOver/実OS背景化/OS文字拡大ではない。viewport 375/390/765 CSS px、CSS font-size 200%、mediaエミュレーション、タッチ入力を区別する。公開版は操作しない。Pages workflowは起動しない。

`preflight.json`に開始HEAD/tree/製品SHA-256を保持。`parallel/`はdefault3回とworker1同検査の各コマンド・負荷・時間・結果。worktree外node_modules symlinkをTurbopackが拒否したsetup試行は別保存し、同じ依存の実directoryコピー後に本計測を行う。依存の外部取得/バージョン変更なし。

`verify-native-targeted.py`はnative Coin自然再生の5%/50%/90%位置各3回、入力直前/直後/ready後/100ms保持をブラウザ内部で計時する。入力が終端ならINPUT_MISSEDで途中pause成功に数えない。pause省略と終端入力のnegative controlは必ず判定器が拒否する。通常CoinのReduced motion切替はrunningと意図的native pauseを分け、media change時点ですでに終端なら取消検証PASS/製品FAILに数えない。

`verify-battle-full-sequence-instrumented.py`は旧診断scriptの全操作・assert・待機時間を維持し、timer/click記録と失敗時DOM/native Animation/rect/スクリーンショットだけ追加。タイマーwrapperは診断instrumentationであり、本体修正・Animationモックではない。観測負荷の可能性はあるため非再現から根因を断定しない。

`run-native.sh`はローカルserverとbrowserを同一実行環境で起動する再現コマンド。全時間suiteは既存 `scripts/verify-waapi-observation.py` を変更せず最終CSS/componentに対して再実行する。全197展示の網羅試験ではない。

## 結果
測定終了後に追記する。途中のこの資料は合格証拠ではない。

## 検証環境の初期化不整合（製品不具合とは別）
最初のnative runnerは既定Python Playwright 1.62.0で既存1.56対応ブラウザを操作した。Chromium測定はJSONへ保存されたがWebKitはlaunch後のpage初期化で進まなかった。停止ログを `webkit-driver-mismatch.log` に保持。既存 `/tmp/loading-pw156` をPYTHONPATHに指定し、Playwright1.56.0とbrowser buildを一致させて全測定を再実行した。新しいインストールや製品依存変更はしていない。最初のChromium結果は参考履歴、判定正本は `native-targeted-matched-driver.json` とする。

## 現在までの独立結果（製品未修正）

### N2 / P2: 観察後の通常Coinの動き低減取消漏れ（再現・原因特定）
観察を開く→通常へ戻る→ReplayまたはCOLLECT→実行途中にprefers-reduced-motionをON。期待は旧Animation取消（idle）と得点維持。対応driverのnative Chromium390はReplay16.716→116.712ms、COLLECT83.404→216.732msでrunning継続。WebKit390はReplay0ms/pending→565ms running、COLLECT103ms running→650ms finished（自然終了であり取消ではない）。得点0/100は維持。診断でnative pauseした別4経路もpaused残留だが、これは通常UI操作とは区別する。

原因は `observed.current` により自動run effect全体を抑止し、reducedMotion変更時にrun内部stopへ入る旧取消経路も失うこと。別stop effectはnormalActiveだけに依存。最小案は自動再生抑止を維持し、通常Coinの低減ON時取消責務だけを局所的に分離する。observed guard削除は復帰時の自動再生を再導入するので不採用案。製品改修は今回の許可範囲外で実施していない。

独立診断4件は対照2成功・回帰2失敗、skip0・timeoutなし。native両engineでも通常操作により再現するため、旧Combatの開発者によるpaused残留P3だけより強い新規退行根拠としてP2。有限650ms演出・得点不変という限定は保持する。確認済みP2を残してマージ推奨YESにはしない。

### N1 / P3: 通常自動デモの復帰契約
Issue35の「復帰時に勝手な再生や得点更新を行わない」と整合し、観察後mount期間中の自動デモ抑止自体は許容。明示Replay/COLLECTやMenu選択は残る。利用者説明として「観察後はReplay/COLLECTで再生、Resetでも抑止維持、閉室再開は初期化」を追記する。これは実装の仕様変更ではない。

### Q1 / P2品質ゲート: 5000ms timeoutの不安定性（再現・根因未特定）
既定check3回は170成功1失敗、170成功1失敗、171成功。worker1同検査は170成功1失敗。すべてskip0、失敗は `waapi-gallery.test.tsx:64` 初期DOM/検索/複合フィルター。全check116.617/103.068/84.166/156.946秒、対象試験9274/7922/4148/5381ms。単なる並列固有とは言えず、worker1なら常に成功という仮説は反証された。CPU/load/process計測はnamespace内の観測でホスト他負荷不存在の証明ではない。期待値・件数・5000ms上限を変えず、製品由来と断定もしない。

### B1 / P3検査の固定時刻依存: WebKit765 Battle
旧scriptの同一操作/待機/assertを保った3反復は、(1)開室クリックのPlaywright10秒timeoutでBattle未到達、(2)動き低減切替後の1100ms固定待ちassert失敗、(3)全5群PASS。全試行pageerror0。

(2)条件判定時はENCOUNTERを含んだが、assertメッセージの再読ではREADY。timer133/134は37890msに440/930ms指定で登録され、39030/39031ms（1140/1141ms後）に発火。失敗後DOMはsceneBATTLE/READY、Animationなし。今回の失敗は固定1100msの検査読取とtimer配信の競合に整合する証拠があり、永久ENCOUNTER残留ではない。ただしassert条件の読取performance時刻自体は未記録であり、競合の根因を完全に特定したとはしない。タイマー遅延そのものの原因は未確定で、単なる環境のせいとは断定しない。旧空Assertionが同一原因だったという証拠はないため、その根因未特定も維持する。最小検査改善案は実状態到達を期限内に待ち、期限超過時にtimer/状態を一度にsnapshotすること。元失敗の上書きや無条件timeout延長で解消扱いしない。

Battle本体 `WaapiExpandedPreviews.tsx` はmainから無変更。Stage2AによるBattle機能退行を示す証拠は得ていないが、同一runtimeでmainをビルドした直接比較ではないため非退行の全面証明とはしない。

## 最終native操作結果

| 対象 | 結果 | 範囲・留保 |
|---|---|---|
| Coin WK390 自然pause | 実中間9/9保持 | 5%狙い実入力191/254/246ms、50%狙い334/340/337ms、90%狙い585/588/599ms。入力・ready後・100ms後が一致。最初の3回を開始直後成功とは呼ばない |
| Coin WK390 開始付近補足 | 4/6早期到達・保持 | native ready/rAF経路、60/70/89/96ms。466/490msは早期入力未到達であり、停止位置保持自体は成功 |
| Coin Chromium390 | 実中間9/9保持 | 約33–50/333/600msの各3回。両engineのpause省略/終端入力negative control計4件は判定器が拒否 |
| 全時間suite Ch375/390/765 | 各8群PASS | 同一最終component/CSS/新規build |
| 全時間suite WK765 | 8群PASS | 同一最終component/CSS/新規build |
| 全時間suite WK390 | 初回PARTIAL→同一期待値再実行8群PASS | 初回Menu自然pauseは220ms終端入力。元PARTIALを保持 |
| 全時間suite WK375 | 開室操作timeout→再実行8群PARTIAL | Menu自然pauseは220ms終端入力。下記別probeで実途中を補完。元失敗を削除しない |
| Menu WK375早期補足 | 2/6早期到達・保持 | 11/14ms、20%以内を早期と定義。220ms終端2件は途中成功に数えず、92/76msは中間停止の保持だが早期到達ではない |
| 通常復帰 ChMenu/ChCoin/WKCoin390 | 15/18/18検査PASS | mode状態保持、offscreen、合成visibility、Replay/キーボード、Reset、閉室再開。閉室後の有限自動デモは遅延により見逃し得るため成功必須判定なし |
| 通常復帰 WKMenu390 | 初回100ms固定待ちFAIL、追加診断あり | 選択保持/keyboard等は通過。初回失敗時IO到達時刻がなく根因未確定 |

WKMenu追加診断：同じ250ms待ちの3反復はスクロール前からAnimationなしで、取消機能の証明に数えない。0ms待ち別3反復はすべて旧Animationを捕捉。2回は100ms後idle。3回目は15334msにscroll、15442msではrunning/pendingのままかつIO false未配信、15630msにIO false、15674msで自然finished、16342msでidle。100ms残留と非同期IO配信の遅れを同時観測したが、原失敗と同根因の断定はしない。3回とも1000ms観測までにidle、永久残留の証拠なし。最小検査改善はIO到達と取消を別々に時刻記録すること。

全時間suiteの8群は、Menu/Coin各4群（native時間/easingまたは弧/lifecycle、通常状態とReset、light/dark color-scheme media指定/CSS200を含む）であり単体テスト件数ではない。seek/再開/巻戻し/終端境界、native reading、touch/keyboard、低減ON/OFF/途中切替、synthetic visibility、画面外復帰、Menu寸法/font追従を確認。最終CSSでも全6条件の対象経路を実行したが、raw全6条件一括PASSという結果ではない。新規N2はこの既存suiteの対象外経路で、追加診断により発見した。

## 独立レビュー・判定
実装担当とは別の統括検証担当と、さらに別担当のsource/診断試験/証拠レビューを実施。[normal-mode-review.md](normal-mode-review.md)と[final-independent-review.md](final-independent-review.md)。統括はnativeを実行、独立source担当は代用品4件を実行しnative JSONを読解。後者がnativeを自ら実行したとは記載しない。

**総合：FAILED（現対象版のマージ準備判定）、マージ推奨NO。** 追加検証の遂行と不具合の修復は別であり、新規P2 N2が未修正、品質ゲートQ1も不安定。P0/P1は今回範囲で確認していない。N1説明はREADMEに補足済み。B1/WKMenu初回失敗は不再現/非同期配信に整合する追加証拠を伴うが根因完全確定ではない。第2BはN2を承認された別改修で解消し、同じ期待値のnative/単体再検証、Q1の原因切分けと人間の判断後に進む。今回勝手にStage2B/HP比較を実装しない。

### 未検証・既存負債
実機Safari、VoiceOver、実OS文字拡大、実背景化、公開先操作は未検証。viewport/CSS200/media/synthetic visibilityで代替PASSにしない。既存title文字200%横超過/typewriter ID重複は別負債。製品ソース不変は確認するが、全197展示を操作したとはしない。旧主要ゲーム全体の新規網羅実行やmainの直接native比較も本資料では主張しない。

実CIは提出後の最終HEADで別確認し、PR/Issue追記に結果を記録する。PR向け検査workflowがなくPages公開workflowしかない場合は起動せず、「CI未実行」と報告する。

### 再実行コマンド
- `python docs/maintenance/stage2a-verification-20261026/parallel/measure_checks.py`（内部のdefault3＋worker1同check、既定の5000ms不変）
- `bash docs/maintenance/stage2a-verification-20261026/run-native.sh`
- `bash docs/maintenance/stage2a-verification-20261026/run-supplements.sh`
- 同じserver/envで `IO_DELAY_MS=0 IO_OUT=.../menu-offscreen-immediate-probe.json python .../probe-webkit-menu-offscreen.py`
- 同じserver/envで `EARLY_TARGET='Menu Selection Cursor' EARLY_WIDTH=375 EARLY_OUT=.../menu375-early-supplement.json python .../probe-webkit-coin-early.py`

PNGはnative screenshot。代表のChromium375 Coin / WebKit765 Menu CSS200を目視確認し、状態文字/操作/折返しを確認した。画像だけで操作PASSにはしない。Battleの大きいfull-page PNGは失敗後の画面であり、assert条件を読んだ瞬間のスクリーンショットではない。

色設定の保証境界：light/darkはブラウザmedia指定での操作・geometry確認であり、アプリ固有のテーマ切替や配色変化を確認したという意味ではない。
