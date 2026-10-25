# WAAPI Game UI 第1段階: 状態整合

## 基準と保護
2026-10-25 21:10 JST に fetch。main `a40f2a0a8b837c47d5eda94661f278ecf9547300` は指定基準と同一。#28/#31/#32 merged をGitHub APIで確認。旧DOM11 worktreeはclean、独立worktree・`fix/waapi-game-state-stage1`、Issue #33。AGENTS.md/.agents内規則はこのリポジトリに存在しない。README、LOG、既存WAAPI設計/回帰記録、package/Pages workflowを参照。

## 実装前の第一希望・次善策・保証範囲
- Menu: 第一希望は選択行の子へ照準を置き、DOM所属を正本とする。実測座標を別stateへ保存する次善策はresize/fontの再測定漏れを増やすため避ける。補間する場合も最終位置はDOMに従う。
- Parry/Dodge: 開始時刻と420–680msの成功窓を単一の判定根拠にし、軽減でも論理時間を変更しない。表示を軽減専用の別時間で進める案は採用しない。境界・入力・終了を同じ規則で検査する。
- Battle: 第一希望の画面外中断→FIELD＋中断表示を採用予定。完了へ確定する次善策より、見ていない間の戦闘移行を避けて再試行を明確にできる。Reset/軽減切替の取消と論理状態を分離する。
- Combat: 既存useRuntimeの軽減取消引数を対象に適用。独自Animation管理の追加/全展示一括変更は不要。
- Coin: 自動デモとReplayは無加点、明示COLLECTで1コイン100点を同期確定、次回獲得はReset。Animation完了を得点根拠にする次善策は取消/古い完了の競合を増やすため不採用。

今回の保証は上記5指摘群と実行した回帰経路に限定。197展示全操作の保証ではない。既存Match-3/Falling/HP/Inventory/Lock-on、22ゲームへの共有処理依存範囲を確認。第2段階コマ送り/第3段階HP比較、新展示、公開は行わない。既存タイトル文字200%横超過/typewriter ID重複は別負債。

## 検証（追記予定）
修正前の新規再現試験、修正後同一試験、check/build、native Chromium/WebKit、独立レビューを区別して追記する。未実行を成功としない。

## 原因・修正後の契約
1. Menu: 34px固定移動と21〜22pxの実行間隔が不一致。照準を選択行の子へ置き、移動時だけ前後矩形差を補間。fillなし、最終位置はCSS所属に従う。
2. Parry/Dodge: 軽減時だけ表示timerを0msに縮め、入力窓420〜680msを変えなかった。開始時刻（nullで未開始を区別）と既存judgeTimingから表示/判定を導出。420/680ms両端を含む。軽減途中変更は装飾だけ取消、判定時間は継続。画面外は中断して開始から再試行。
3. Battle: 画面外の共通stopがtimerを取消す一方、ENCOUNTER/中間sceneを保持。pendingと世代を持ち、画面外の未完了遷移はFIELDへ戻してINTERRUPTEDと表示。軽減途中変更は画面外と区別し装飾だけ停止、930msの論理完了は維持。軽減中の新規開始は即時確定。Resetは世代更新して旧処理を拒否。
4. Combat: useRuntimeへ軽減引数を渡していなかった。PR #32の既存取消契約を適用しrunning/pausedどちらもcancel。論理結果は保持、ResetのみREADY。Animation完了による状態変更なし。
5. Coin: 自動入場/Replayのfinishedで得点を加えたため再入場が獲得になった。COLLECT/コインの明示操作だけ100点を同期確定、refガードとdisabledで1回。Resetで次の1コイン。自動/Replayは視覚のみ。古いfinished加点自体を廃止。

### 共有影響
GameSamplePreview 8ゲームのうちMenu/Coinを変更。inactive取消追加はhp/coin/menuだけ（HP既存契約）。他6ゲームの得点/状態経路は不変。Expanded14ゲームでstopAnimationsをstopから分離したが既存stopは従来どおりAnimationとtimer両方取消。部分停止を使うのはTiming2/Battle、Combatのみ既存軽減引数を追加。他10Expandedの契約は変更しない。既存22ゲーム全操作を網羅保証する意味ではない。

## 修正前の独立再現
最新mainのstatic exportに対して390px実ブラウザで再現。Chromium141.0.7390.37: Menu13/26px、WebKit26.0:12/24px。両方で軽減30ms ACTIVE WINDOW→EARLY HIT、Coin Reset0→再入場100、Combat paused3本が軽減ON後もpaused。Battleは今回両方ENCOUNTER/sceneFIELDが残留（以前のWebKit sceneBATTLEの差は取消時刻依存と考えられる（推定）、今回の実測に置換せず別記）。
新規コンポーネント再現はExpanded6失敗＋MenuCoin4失敗→同一10件成功。後続追加込み新規27件。

## 独立レビューと追加修正
実装非担当の独立レビューは新27＋既存31＝58件を再実行して成功。P3-R1（詳細duration/fillと実装不一致）、R2（Battle RETURNコード例がREADY固定）を報告。対象4展示の詳細を実時間/noneへ変更し、RETURN例/軽減説明をFIELDと整合。メタ回帰1件追加、独立再実行は新28件成功。詳細は独立記録を参照。初回58と再実行28は重複し、合算して別試験数にしない。

新規GUI試験でChromiumの文字200%時に照準と選択行の上端は一致するがglyph line-boxの高さが2px異なり中心差1pxを観測。許容値は緩めず、照準の箱を選択行高さ100%に揃えて中央配置する最小CSS補正を追加した。

## テスト集計とブラウザ範囲
最終ローカルcheck: Node49＋Vitest85＝134成功、失敗0、skip0（既存106＋新28）。ESLint/TypeScript/静的build成功、独立buildも成功。実Actionsとは別。workflowはmain push/manualのPages公開専用、検証目的で起動しない。

旧主要回帰はChromium141.0.7390.37/WebKit26.0×765/375/390pxの6条件・各9群で機能失敗なし。Match-3実軌道/5→3石/800点/ドラッグ/Reset/軽減途中、Falling占有とcompaction、HP遅延Reset、Inventory、Lock-on、検索分類197/47、両color-scheme、対象CSS文字200%を含む。モバイル4条件の全館タイトル横超過だけ既存PARTIAL。実機ズーム/OS文字設定ではなくcomputed CSS font-size2倍、Playwright media emulationを使う。

新対象の最初の6条件では5条件成功、WebKit375のCombatで軽減設定変更80ms待ち後paused3本を観測した。この1回のイベント配送履歴を取っていないため原因は断定しない。media変更後の取消条件を待つ検査へ変更し、イベント時刻も採取して再検証。固定80ms経過をOS通知完了と同一視しない。別のWebKit375制御試験5回は、通知操作後最初の観測（204〜335ms）ですべてidle、以後もidle。自然終了ではなくpausedのcancelを観測。最初の失敗記録も保持する。

Dodge通常表示の検査で先行テストの軽減設定が残るハーネス不備を発見。各展示開始前に指定設定を明示し、通常Dodge early/success/lateを両engine全3幅で別途確認。過去結果を通常モード成功として流用しない。初回長時間待ちは検査内RAF待ち/暗黙context破棄箇所を切り分けて改善し、実操作結果とは分離。

375px Menu/Battleの両engine画像を目視、カード内文字/操作の折返し、FIELD配置を確認。Menu同一ページ375→390とserif変更後、照準/選択行の上下矩形差0を確認。実機iPhone Safari、VoiceOver、実OS設定、実ブラウザズーム、全197操作は未検証。

## 最終対象GUI結果
[最終6条件JSON](waapi-stage1-native-final.json): Chromium141.0.7390.37 / WebKit26.0、375/390/765 CSS px、6/6 PASS、JavaScript pageerror0。Menu3位置×通常/文字200%の36測定で中心差0px。Timingは両種・両motion・early/success/late、Battle完了/画面外中断/Reset反復/軽減途中、Combat native paused3本の取消と結果保持、Coin自動/再入場/Replay無加点・明示1回・Resetを確認。
Combatのmedia change実観測はChromium67〜93ms、WebKit174〜200ms、取消確認は95〜217ms。これは今回の実行環境の観測値であり即時性の全環境保証ではない。初回80ms失敗の原因を遡って確定したとはしない。

### 判定
今回の5指摘群は上記実測・単体経路の範囲でPASS。全館タイトル200%の既存PARTIAL、実機/支援技術未検証、公開版別状態は残る。第2段階への移行条件（再現する未修正P2なし、P3対応説明可能、重大な新規回帰なし）はこの範囲で満たす。第2段階の実装権限を本PRから自動的に拡張しない。
最終commit SHAは自己参照を避け、Issue/PR本文にGitHub上の最終HEADを記録する。

## 公開版（更新なし）
21:30 JST前後のreadonly観測: ChromiumはERR_EMPTY_RESPONSE。WebKitは公開URLを開いてWAAPI47を表示し、Menu Down→COLLECTIONで照準上端差12pxを実測。公開mainに今回の未マージbranch修正が入ったとは扱わない。公開版の当該問題は残っており、本PRをmerge/公開していないため想定どおり。HTTP200やバイト比較を公開操作PASSに置換していない。公開先の全操作/ソース対応は今回新たに網羅照合しない。
