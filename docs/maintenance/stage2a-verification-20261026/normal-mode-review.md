# Stage 2A 通常モード復帰・独立ソースレビュー

- 確認日: 2026-10-26 JST
- 対象: `406bdbddada5e0783d6b9ce654ceea9788a19040`
- 比較main: `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`
- 実装に参加していない別担当によるsourceレビュー。製品コード・既存ログは変更していない。
- 読了: READMEのStage1/Stage2A節、`waapi-game-stage2a-20261025.md`、既存独立レビュー、通常/観察コンポーネント、Stage1 Menu/Coin試験、観察試験。Issue #35の本文もGitHub connectorで2026-10-25 23:09 UTCに独立取得した（open、updated_at 2026-10-25T21:46:44Z）。
- この報告のsource判断、WAAPI double試験、統括担当のnativeブラウザ観測を混同しない。実機/実背景化はこの担当では未検証。

## 復帰契約の追跡

`WaapiSampleGallery.tsx` の `observed.current` は初回mode操作でtrueとなり、そのGameSamplePreviewがunmountするまで戻らない（192,238,303行）。`normalActive=active && !observing` は通常プレビューが表示中かを表す（194行）。

| 経路 | 現行sourceの動作 | mainとの差・評価 |
|---|---|---|
| 通常→観察 | 通常Animationをstopし、通常DOMをhiddenにする。本体state/refは保持。独立観察DOMをmount | 新規分離、選択・得点を観察が所有しない |
| 観察→通常 | 観察unmount/cancel、通常state保持、通常自動runを抑止 | 勝手な再生・得点更新を避ける意図と整合 |
| 観察経験後→画面外→復帰 | 退出時stop。復帰時もobserved=trueで自動runしない | Coinはmainの再入場自動デモから変化。明示操作は残る |
| 観察経験後→Replay | Coinのrunを直接呼ぶ。無加点 | 直接操作はobservedに遮断されない |
| 観察経験後→COLLECT | 未獲得なら同期100点＋run。連打はcollected refで拒否 | 得点契約維持 |
| 観察経験後→Menu Up/Down/矢印 | 選択更新。実矩形FLIPはnormalActiveとreducedMotionを参照、observedは参照しない | 通常選択演出は維持。元からMenuにはgeneric runのmotion targetがない |
| Reset | stop、未獲得/0点、CONTINUEへ戻る。observedはtrueのまま | Reset後も自動デモ抑止。COLLECT再実行は可能 |
| 閉室→再開 | 全カードunmount→新規mount。選択/得点/observedとも初期化 | 閉室の従来再初期化を保持。Coin初回自動デモ再開可 |
| 検索により対象除去→再表示 | keyed cardが実際に除去されればunmount→初期化 | 隠しただけのmode往復とは違う |
| タブ非表示→復帰 | 観察はdocument.hiddenでrelease→保持時間paused再作成。通常本体にはvisibility listenerなし | 通常側のvisibility非管理はmainでも同じ。新規退行とはしない。実背景化挙動は未確認 |

source根拠: 通常 `run/collectCoin/reset` 214–234行、自動effect235–245行、Menu274–289行、mode切替/hidden/操作303–328行、galleryの条件付きmount。観察のvisibility/release/recreateは `WaapiGameObservation.tsx` 50–110行。

## N1: 通常Coinの持続的自動デモ抑止 / P3 説明改善候補

[Issue #35](https://github.com/tetsujisugimori-coder/Loading-museum/issues/35) §7は「復帰時に勝手な再生や得点更新を行わないこと」と規定し、観察演出だけに限定していない。§5の得点契約も再入場ごとの自動再生を必須とはしていない。そのため持続抑止は安全側の仕様として許容できる。観察終了時だけでなく、その後の再入場やReset後も通常Coinは自動デモを再開しない。READMEは観察演出の復帰停止を説明するが、通常Coinのmount期間中の抑止までは明記していない。

- 期待: 観察から戻る際の自動再生防止と、以後の通常操作方法を区別して説明する。
- 現在: Replay/COLLECTが残り、選択・得点も保持。source上は通常操作そのものの阻害ではない。
- 判定: 持続抑止自体を直ちに不具合/機能後退とは断定しない。仕様の明文化が必要。nativeで明示操作と再入場を確認する。
- 最小提案: 「観察後の通常Coinは自動デモを再開せず、Replay/COLLECTで再生。閉室再開では初期化」とREADME/設計へ追記。Resetで自動再生を復活させる機能変更は今回は行わない。

## N2: 観察経験後の通常CoinでReduced motion ONが旧Animationを取消さない / P2候補

### 再現条件
1. Coinを通常動作・低減OFFで開く。
2. 観察モードを開き、通常モードへ戻る。
3. ReplayまたはCOLLECTで通常の弧を開始。
4. 弧の実行途中（または診断のためnative Animationをpauseした状態）に低減ON。

### 期待
通常の移動Animationは取消され、必要なら低減表示へ置換される。得点・獲得済み状態は維持。以後の明示操作は低減定義を使う。低減OFFだけで勝手な通常再生はしない。

### sourceで特定した原因
`run` はreducedMotionに依存するためmedia変更でcallback identityが変わる。mainでは自動effectが新runを呼び、その中のstopが旧Animationを取消していた。Stage2Aでは `observed.current` がtrueだとeffect全体をreturnする（238行）。別の取消effectはnormalActive依存でreducedMotionを監視しない（242–245行）。よって観察経験後の通常Coinには低減ON時の取消経路がない。Menuには独立layout effectの `if(reducedMotion) stop()` があり同じ漏れではない。

### 影響・最小提案
観察済みという履歴だけで通常Coinの低減取消契約が変わる。自動再生の抑止と、既存演出の取消責務を分離し、Coinに限定して低減ON時のstopを保証することを提案する。observed guardを単純に削除するとmode復帰時自動再生を再導入するので不適切。得点stateや全アニメーション基盤を変更する必要はない。

### 検証状態
source根拠による回帰候補。独立診断 `normal-mode-contract.test.tsx` は観察前Coin・観察後Menuを対照とし、観察後Coin Replay/COLLECTの取消を同じ期待値で確認する。負荷測定との競合を避け、実行結果は後段追記。nativeブラウザの実測は統括担当が別途実施する。修正は本依頼の範囲外のため行っていない。

## 保証境界・推奨
通常modeのselection/score保持にsource上の破壊はないが、N2が解消するまでは「すべての通常復帰契約が保全」と判定しない。現在の未確認をPASSへ繰り上げず、nativeで旧Animationと得点を同時に観測し、再現時は修正承認後に局所取消を追加して同一試験を再実行する。全197展示や他20ゲームの網羅検査ではない。

## 独立診断実行結果（2026-10-25 23:16:52–23:17:20 UTC）

```sh
VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 \
  ./node_modules/.bin/vitest run docs/maintenance/stage2a-verification-20261026/normal-mode-contract.test.tsx
```

結果: **4件中2成功・2失敗・skip0、exit1**。Vitest v3.2.4が報告する実行時間7.85秒（tests2.99秒）。shell計測の開始から終了までは28秒で、起動待ちを含む別の計測値。ログは `normal-mode-contract.log`。既存の並列負荷計測終了後に単独実行し、nativeブラウザ開始前に終了した。

- 成功: 観察前の通常Coin Replay→低減ONで旧Animation cancel/idle。
- 成功: 観察後の通常Menu選択→低減ONでcancel/idle、COLLECTION保持。
- **失敗**: 観察後の通常Coin Replay→低減ONで旧Animation.cancelが呼ばれない。
- **失敗**: 観察後の通常Coin COLLECT→低減ONで旧Animation.cancelが呼ばれない。
- 失敗2件とも直前の得点期待（Replay0/COLLECT100）は成功しており、失敗箇所は取消期待。5秒timeoutではない。

N2はWAAPI doubleを使った実コンポーネント経路で再現済み。独立probeの期待値を現状へ弱めず、失敗を保存した。native WAAPIでの再現は別証拠を参照する。diagnostic testは未解決問題の証拠としてdocs配下に置き、既存npm testの登録・期待・上限は変更していない。これは本体改修後に同一期待値で再実行すべき試験であり、正常成功した回帰テストと数えない。

## native診断スクリプトの独立静的レビュー

- `verify-native-targeted.py`: 初回案のnegative-control失敗が総合FAILへ反映されない点を指摘し、統括担当の修正を確認。終了後入力を途中停止成功にしない分類、自然runningと診断pauseの分離、mediaイベント時の旧Animation参照採取を提案した。
- `verify-battle-full-sequence-instrumented.py`: 旧診断とのdiffで操作順・待機・assertの維持を確認。追加timerラップはnative timerへ委譲するが観測オーバーヘッドはある。単一診断tryのlocator失敗によるtimer/スクリーンショット欠落リスクを指摘した。未再現は根因解消を意味しない。
- `verify-native-normal-return.py`: 新規作成。Ch/WK390×Menu/Coin、通常state保持、明示操作、実scrollでrootMargin外条件の確認、合成visibility、Reset、閉室再初期化を確認する。py_compile成功のみで、この担当ではnative未実行。閉室再開の有限auto演出はサンプリング前に終了し得るため、遅いsnapshotの不在だけでFAIL/PASSへ分類しない。
- 合成visibilityは実背景化の代替PASSではない。native結果は統括担当の実行ログ/JSONへ委ねる。

## Native証拠の独立読解（2026-10-25 23:24 UTC）

統括検証担当が実行した `native-targeted-matched-driver.json` を、このsource担当が独立に読んだ。これはこの担当自身によるブラウザ実行ではない。Chromium141.0.7390.37 / WebKit26.0、390px、実native WAAPI、ブラウザmedia模擬切替である。実機Safari/実OS設定ではない。

### N2のnative再現

| ブラウザ・操作 | 低減change採取時の旧Animation | 変更後の旧Animation | 得点 |
|---|---|---|---|
| Chromium Replay | 16.716ms / running | 116.712ms / running | 0 |
| Chromium COLLECT | 83.404ms / running | 216.732ms / running | 100 |
| WebKit Replay | 0ms / running / pending | 565ms / running | 0 |
| WebKit COLLECT | 103ms / running | 650ms / finished | 100 |

全てduration650ms。WebKit COLLECTは「runningのまま」ではなく、取消されず自然終端へ到達したと区別する。最終idleではない。正常操作ボタン＋低減切替のみの4経路で取消契約を満たさず、後述の強制pause診断だけの現象ではない。pageerrorは両ブラウザ0。

追加のnative `pause()` を使う診断4経路も、低減ON後に旧Animationがpausedのまま残る。これは通常Coin UIにpauseボタンがあるという意味ではない。通常UIによるrunning残留と、診断用paused残留を別々に報告する。

**独立最終重要度: P2、マージ推奨NO（本対象版）。** 理由は、Stage2Aの観察往復という通常操作履歴により、既存通常Coinの低減取消が両engineで退行するため。Stage1のCombat paused残留(P3)との比較では、今回は診断用pauseなしの通常操作でも再現し、状態履歴に依存する既存契約の後退を確認した点を重視する。ただし、無限演出・得点破壊・保存破壊を観測したわけではない。得点は0/100を保持し、自然演出は有限650msである。この限定を省いて危険性を誇張しない。

第一希望の修正案は自動再生抑止と取消の責務を分け、観察済みCoinでも低減ON時に通常Animationをstopする局所対応。今回の検証依頼では製品修正は行わない。人間が修正範囲を承認し、同じdouble期待値とnative running/paused経路を再検証するまでStage2Bへ進めない。

### Coin途中停止の証拠解釈

同JSONでは各engine9件、計18件の実中間入力がready後・100ms保持後とも同じcurrentTime、pausedとなる。終端入力・pause省略のnegative control計4件は全て拒否。途中停止の保持契約はこの実到達位置に限定してPASS。

WebKitの5%狙い(32.5ms)は実入力254/191/246msであり、開始付近の32.5msで停止できた証拠ではない。中間狙い334/340/337ms、終端付近585/588/599msは各実測値として報告できる。Chromiumの5%狙いは33.334/33.284/49.968ms。狙った位置の到達精度と、実際に途中で押せた際の停止精度は別評価。旧PARTIAL履歴を削除せず、この追加証拠で「実中間停止保持」だけを補足する。

### 通常復帰suiteの暫定読解

`native-normal-return.json` ではChromium Menu15・Coin18、WebKit Coin18の検査がPASS。WebKit Menuは実画面外矩形(top5287,bottom5819、viewport高さ900)を確認したが、固定100ms後にtime0/running/pendingのAnimationが残り、6件目の取消期待が失敗した。source担当からIO通知到達時刻・旧Animation参照・複数時点の追加採取を提案した。これは現時点で製品原因/検証待機条件を切り分けておらず、既存ログを保持して未確定とする。単に待機延長で成功しても旧失敗の原因確定にはしない。統括担当の後続診断を別証拠として扱う。
