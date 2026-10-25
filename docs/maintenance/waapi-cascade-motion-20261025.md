# PR #32 追加修正: 実連鎖と途中の動き軽減

基準: `63ed9cd55a5f48e602f7a8d16b1056eb7b7c0a0f`。2026-10-25 15:35 JST に remote HEAD と clean checkout を照合。既存 Draft #32 のみ更新し #31、main、Pages 設定に触れない。

## 実装前の原因と設計判断

- P2: 初期9セルの全組合せを一般判定に通しても2段連鎖がない。提示された3×4候補は初期一致なし、8/11交換で実際に8石・2段になることを既存純関数で確認。
- P3演出: 全ボタン一律の上方向移動は個々の交換・消去・落下に無関係。
- P3軽減: 既存matchMedia購読は設定変更をpropsへ渡すが、対象4ゲームのruntimeはactiveしか監視せず、実行中Animationを取消しない。

第一希望を採用する: 一般的な交換・集合一致判定・列落下の各段階を履歴として返す。同じ履歴から石の識別子ごとの交換位置・消去対象・落下先を得てWAAPIの視覚再生を作る。論理盤面と得点は同期確定し、別のaria-hiddenな演出レイヤーだけが段階再生する。結果は「確定結果」、演出はその計算過程と明記する。終了callback・遅延した状態更新・fillによる状態保持は使わない。取消時は確定した実盤面が即座に見える。

次善策は最終配置の差分だけを補間する簡略演出だが、今回は各石のtraceから段階再生できるため採用しない。3列4行が2段連鎖の説明に十分な最小限の拡張として採用。補充なし有限盤面を維持。正解座標は教材の操作例だけで、判定には使わない。

対象4ゲームに限ってruntimeの動き軽減取消を有効化する。HPは従来の世代guardとCSS media queryを維持。他展示のtimer進行は変更しない。軽減OFFで過去演出は再生せず、次操作から通常演出になる。

## 保証範囲と保全

197展示のID・名称・順序、検索・分類・動的集計、HP/装備/照準の論理状態、Pages設定は保全対象。既存88件は維持し、初期盤面変更に必要な操作座標だけ実際の有効交換へ更新する。全館タイトル200%横超過とtypewriter ID重複は対象外。将来 #31 を統合する場合は LOG / package.json の両方の追記を保持する。

参照: repository内AGENTS.md/.agents/skillsは存在しなかった。ローカル江戸弁実践方針・辞典を参照。最新Space憲法の本文は未取得で、確認済みとはしない。

以下に実測と独立レビューを記録する。

## 修正前後と実測

修正前の再現4件は4失敗（初期盤面に2段連鎖なし、Line/Lock/Equipの実行中軽減切替でcancelなし）。修正後は同じ4件成功。追加テストは14件。旧88件は削除・skipせず、初期盤面に依存する成功例の座標を新盤面の実交換へ更新した。Node49＋Vitest53＝102件、失敗0・skip0。npm run checkと独立npm run buildは最終製品内容で再確認済み。

純関数の例8/11: 初期一致0、最初の消去5、列落下、再一致3、残り4石、800点。steps内の消去集合で交点の石を二重計上せず、framesのtoken IDも同じ消去・列落下に従う。無効・空セル・不成立は0点で元盤面。連鎖数はsteps.lengthから導出する。

独立レビューではP3を2件追加発見した。
1. 演出中に再操作すると見えている旧石と確定後セルが異なる。pointerdown・focus・drag開始時に演出を全取消し、確定盤面を見せてから新操作に入るよう修正。3経路の回帰を追加。
2. 教材詳細のduration/easing/fillが旧固定値だった。Matchだけ動的duration（320＋段数×580ms）、linear、fillなし、軽減時Animationなしを表示。コード例もtrace駆動へ変更。

第一希望の段階演出は装飾レイヤーで実装。盤面・得点は先に確定しており、視覚再生の途中数値とは区別する。同期確定を優先する設計上の取捨であり、WAAPI完了で結果を確定する設計は採用しない。再操作・軽減ON・画面外・unmount・ResetはAnimation取消のみで論理結果を書き換えない。軽減OFFでは過去の演出を再起動せず、次操作から通常演出を開始する。HPは従来世代guardを維持。

## 実行環境の制約と復旧

Node24.22.1、npm11.9.0。初回npm ciは既定HOMEのcache不存在で失敗し、/tmp専用cacheを指定して公式lock依存を取得。依存・lock変更なし。
通常Chromium実行はprocess singleton socketのOS実行制約で起動失敗。escalated execもbwrap設定エラーで起動前失敗。制限パスの読取やセキュリティ設定変更はしていない。CUAのlocalhostは別network namespaceで接続不能、file URLは許可protocol外のため停止した。
WebKit公式配布と公式Debian不足ライブラリを一時領域に置き、既存sandbox内で実行。serverとbrowserを同じexec内で起動し、localhost分離を解消。システムパッケージや公開設定は変更なし。既定最新版Chromium配布のZIP取得は壊れた応答で失敗し、既知の公式Playwright1.56/Chromium141 headless shellを一時領域で検証する。

最終ブラウザ6条件・独立再レビューは以下の追補参照。最終commit/remote同一性はPR更新欄に記録する（記録に自分自身のSHAを埋め込む循環を避ける）。

## 最終検証追補

- `npm run check`（lint・型・静的build・Node49＋Vitest53）102成功、失敗0、skip0。独立した `npm run build` も成功。既存88＋新規14。
- 独立担当は関連31件を再実行、一般盤面315成功交換を別oracleで照合し、消去集合・得点・落下・token履歴一致を確認。追加P3 2件（再操作と演出の不一致、教材metadata旧値）は修正後再レビュー済み。フォント一致修正も読取済み。独立担当のブラウザ実行は環境制約で行えておらず、実ブラウザは実装担当、独立検証はsource/jsdom/純関数と区別する。
- 実ブラウザはChromium141.0.7390.37 / WebKit26.5。375/390/765px、各高さ757px。OS色/Reduced motionはPlaywrightエミュレーション、実機Safariではない。
- 初回の並列ブラウザ再検査ではWebKitの固定850ms後HP描画、短い320ms演出の検出、80ms後media反映が時間依存で失敗した。失敗を成功に数えず、HPは既存期限経過の850ms後に同じ実幅誤差1%未満の収束条件を最大3秒待つよう改善。実行中切替の対象3展示は、試験用Element.animateラッパーで生成直後の実AnimationをpauseしてからONへ切替し、実cancelを待つ。自然終了をcancel成功と取り違えない。製品duration・世代管理・期待値を緩和していない。通常のクリック・drag・段階位置・Resetは別の非pause経路でも検査する。
- 実機iPhone Safari、VoiceOver、ソフトキーボード、OSそのものの設定パネル、非表示タブは未検証。全197展示の全操作検証ではない。
- 上記media取消検査の追加診断で、getAnimations(subtree)に残ったのはゲーム演出ではなくボタンhoverのCSSTransition（色・枠・影）だった。最終ハーネスはElement.animateが返した対象演出の参照を直接保持し、中間時刻(duration/2)でpauseしてから全参照のplayStateがidleになることを要求する。OFF後の新規演出とResetによる取消も同じ参照で検証する。Matchも900msの連鎖途中で保持して切替する。通常再生と「途中時刻で停止保持した実Animation」の取消を区別し、HPの850ms以内完了を保証したとはしない。
- 最終ハーネスも独立再レビューしP0〜P3の新規残件なし。HPは期限後の状態一致、native WAAPIは中間時刻保持から取消を検証するという保証範囲を確認した。
- WebKit26.5: 765px PASS、375/390pxは対象9検査群成功・pageerror0、全館タイトル文字200%の既存横超過598/621pxだけPARTIAL。カード自体の文字200%横超過なし。
- Chromium141: 765px PASS、375/390pxは対象9検査群成功・pageerror0、既存全館タイトル横超過608/632pxだけPARTIAL。最終6条件は2PASS・4PARTIAL、FAIL0。全体はPARTIAL、対象3修正は実測で成立。詳細は[最終6条件JSON](waapi-cascade-browser-results-20261025.json)。
- 最終実CIはPRで該当SHAを確認する。現行workflowはmain push/manualのPages公開のみ。検証目的では起動せず、ローカル成功を実CI成功と呼ばない。
