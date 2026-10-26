# Stage 2A N2 / Q1 修復・品質ゲート検証

**総合PARTIAL / マージ推奨NO。Q1はP2残存。** N2は局所修正・同一期待値の単体回帰・native 6条件で限定解消を確認。成功した経路と、品質ゲート未成立を分けて読むこと。

## 着手時の版・保全（2026-10-26）
- 基準 / GitHub PR36 HEAD: `5bb0d052d4a6aea74c97794f5596eef900ad015f`。GitHubでDraft/open/未マージを確認。並行open PRは36のみ。
- fetchしたorigin/main: `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。基準から進行なし。
- 原worktree `loading-observation` は406bdbd・対象branch・clean、追加検証worktreeは5bb0d05 detached・clean。削除/上書き/stashせず、新規detached修復worktreeで既存PR branchへ反映する。
- package、README、LOG、Issue35、指定された追加検証5資料、既存設計と試験構造を確認。repositoryにAGENTS.md/.agents固有skillは存在しない。
- 旧FAILED/PARTIAL/timeout/native診断は不変で保持。本資料はその修正後追補。

## N2 設計比較（実装前）
第一希望はCoinの低減ON取消を自動再生許可から独立させる局所effect。既存stopを利用し、score/collectedには触れない。observed.currentは保持し、観察後の通常復帰・低減OFFだけでは自動演出を再開しない。
次善策はauto effectをstopとrunの二責務へ整理し直す方式。全ゲームのauto経路へ影響する範囲が増すため今回は不採用。第一希望はCoinだけの数行で原因に対応し、MenuのFLIPやHP、他ゲームのcancel契約を変更しない。
正常Coin runはAnimation.finishedから得点を更新せず、COLLECT時に同期確定する。旧通常Animationの終了は論理状態を変更しない。観察側は既存generation/Animation同一性保護を維持する。

## 対象・非対象
N2局所修正、Q1原因区間計測と既存期待値を維持する最小テスト修正、正式回帰とnative検査。5000ms上限、依存/lock、定義197/47/22、公開workflowは維持。Stage2B・HP比較・他20ゲーム観察・マージ・公開は実施しない。

修正前HEADは上記基準、修正後の製品SHA-256と不変範囲はscope-integrity.json、最終提出HEAD/treeはPR36・Issue35の提出コメントで照合する。本資料の全館PASSを主張しない。

## 修正前後の同一期待値

`unit/original-diagnostic-red.log`: 指定旧診断は2成功2失敗（取消期待）、`unit/formal-red.log`: 新正式7件は2成功5失敗（取消期待）。後者の`-t`限定実行では既存30件は未選択となるが、正式gateからskipした意味ではない。
`unit/green.log`: 修正後は旧診断4＋観察既存30＋新正式7＝41成功、失敗/skip 0。新正式回帰はrunning/paused両状態でCoinとscore pulseのcancel/idle、得点/獲得済み保持、低減OFF非自動再生、明示低減定義、連続切替、Reset再獲得、画面外・復帰・unmountを確認する。WAAPI doubleでありnative描画成功とは別。

## Q1 採用した次善策と境界

第一希望のquery scope適正化だけでは単独反復でもtimeoutが残ったため、独立した正規化検索と複合filter責務に分割する次善策を併用。全元assertを対応表へ保存し、閉鎖取消は両方で確認。正式gallery 11→12、N2正式7件追加のため全体は179件予定（Node49＋Vitest130）。同じmountで元の長い連続順序を5秒以内で終了できる保証は変更しており、これを性能改善や根本原因完全解決とは表現しない。元の操作履歴交互作用はnativeで同じ順序を別検証する。

Q1原試験単独は1成功2timeout、区間計測3回はすべてtimeout、queryのみ改善候補も各3回中1timeout。最終2責務単独は各3回計6成功（1012〜2779ms）、同区間計測6成功（936〜2501ms）、query負対照7成功。個々の実行環境速度変動の原因はUNKNOWN。全check反復とnative補完が揃うまで受入成立とはしない。

## 既存の残余事項

B1の固定待機とtimer/state読取の競合疑い、M1のIO通知とeffect取消反映遅延は、過去試行の根因不明を維持する。単なる非再現を修正済みにしない。title文字200%全館横超過とtypewriter ID重複は別負債。本修正は全197展示を操作網羅した保証ではない。

## 全check反復：Q1受入不成立

5000ms・package登録・worker既定を変えず、既定3回は177/179（113.068秒）、175/179（142.777秒）、178/179（197.090秒）で全てtimeout失敗。復帰後worker1は179/179（156.076秒）と175/179（229.486秒）。全5回skip 0、新N2正式7件は各回成功。ただし既存gallery/HP/観察統合のwall timeoutを成功から除外してはならない。独立担当の53件再実行も52成功1timeout（Q1初期DOM経路）。**Q1は未解決P2、総合PARTIAL・マージ推奨NO。**

query単独改善、責務分割、worker1のどれだけでも品質ゲートは成立しなかった。元の画面意味assertとtimeout上限は維持し、原因未確定のまま広い製品変更やテスト削減へ進まない。実測query負荷と、残る実行環境/処理時間変動UNKNOWNを区別する。並列だけが原因とは断定しない。

03:35 UTC頃にexec-server切断が発生し、最初のworker1はNode49成功/Vitest開始の後に結果不明となった。旧ログを保存し、session再接続がUnknown process idとなった後、別ログでworker1を2回実施した。旧process終了自体を新PID namespaceから証明できないためCPU排他未保証。この不確定試行を5回完了に含めない。初回diagnostic型注釈エラーによるtypecheck停止も別保存。詳細は[gates/README.md](gates/README.md)。

最終明示 `npm run build` は2026-10-26 03:46:52〜03:49:54 UTC、181.692秒、exit0（final-build.json/log）。これはローカルbuildであり実CIの成功ではない。

## N2 native 同一期待値比較

Chromium / WebKit ×375・390・765pxの全6条件。v3 script SHA-256 `bca60def0a00aa8f9975db5e20f9abd8ea29610848eec39a281426aa4547ee52` は修正前後同一。Replay/COLLECT 12経路すべてで旧Coin＋scoreの2本をID照合し、修正前は取消なしで12失敗、修正後は**入力時も取消直前もrunning、自然終了前にcancel→idle/currentTime nullで12成功**。修正後の入力currentTimeはChromium 0〜33.410ms、WebKit 0〜350ms。得点はReplay 0 / COLLECT 100を保持。

38行動assert×6＝228成功、native paused診断6成功、pageerror 0。観察往復・低減解除だけで再生しないこと、明示低減の正確なduration、Reset後の再取得、連続切替、画面外・閉室・unmount、Menuを確認。厳密判定器の12対照はnative操作件数と別集計。scoreの終端はnative durationとsource delayの算術値でありnative endTime取得とは称さない。

独立担当がraw JSON、全source/build SHAを再計算し一致を確認した。本人による実機操作ではなく、実装担当と別のnative実行担当がcloud Chromium/WebKitで実行し、独立review担当は証拠読解と別のWAAPI double実行を行った。合成UI入力/低減media/visibilityを実OS操作と混同しない。

## 最終版の重点回帰と残余事項

|検査|結果|保証境界|
|---|---|---|
|Stage2A全時間操作|Ch/WK×3幅、6条件・48検査群PASS|pause/resume/seek/step/終端巻戻し/easing/keyboard/rapid/offscreen/合成visibility/media、両color media・CSS文字200%。実OS操作ではない|
|Stage1原試験|4条件PASS、Ch765/WK390 FAIL|Menu全位置/200%矩形は全6成立。Ch765はParry locator 10秒timeout後未検証。WK390はDodge予定500ms→実測1083ms、直前ACTIVE WINDOW・入力LATE HIT。初回この2条件はBattle未到達|
|限定再試行（各1回）|Ch765 PASS、WK390 FAIL|Ch765再成功は元timeoutの根治証明ではない。WK390はParry/Dodge全12時刻判定成立後、Battle offscreen復帰成立、後半Reset反復/RM区間の裸assert失敗。厳密な失敗位置・原因は未特定|
|Dodge別probe|WK390の3観測505/502/503msで成功|1083ms遅延の原因を特定した意味ではない。表示と判定の旧不一致観測を消さない|
|Match-3/Falling Block/HP/Inventory/Lock-on等|6条件・54検査群成功|375/390px両engineは既存全page文字200%横超過で全体PARTIAL。765px両engine PASS。category全数のゼロ件ループを防ぐ検証側修正と負対照を追加|
|配信成果物|HTTPのHTML/JS/CSS全12ファイルがfinal outとSHA一致|公開先ではなく隔離localhost。別execからlocalhost取得不能だった経緯も記録し、同一runner内で照合|

独立レビューは[確定記録](independent-review.md)を参照。P0/P1の新規指摘は今回範囲でなし。N2は限定解消、Q1はP2残存。B1/M1、今回Stage1のlocator/入力遅延/Battle後半assert、既存文字200%横超過・typewriter ID重複はP3残余として切り分ける。新しい観測をN2由来や同一根因と断定しない。

nativeのraw4件は可逆gzipで保存し、`native/compressed-evidence-manifest.json` に元byte数・SHAと圧縮SHAを記録。独立担当も解凍同一を再確認。29枚のPNGはそのまま保存。旧 `stage2a-verification-20261026` の失敗/診断は無変更。

## マージ/次段階の受入条件

現時点は **PARTIAL / マージNO / Stage2B移行不可**。Q1の5000ms反復品質ゲートを、期待値削減やretryで隠さず再現性ある形で成立させる必要がある。今回のquery改善と責務分割だけでは未達。Stage1追加失敗の発生位置を計測し、入力時刻・描画更新・判定の関係を切り分けることも推奨する。B1/M1や既存表示負債については未保証範囲を人間が明示的に判断する。

非公開・非デプロイのPR検証CIは次の提案に留める。現在のworkflowはmain push/manualのPages公開のみで、今回変更/起動しない。実CI、実機Safari、VoiceOver、実OS背景化/文字拡大、公開版操作、全197展示の操作網羅は未検証。ローカルtest/buildやcloud WebKitをこれらのPASSとしない。

提出先は既存 [Issue35](https://github.com/tetsujisugimori-coder/Loading-museum/issues/35) / [Draft PR36](https://github.com/tetsujisugimori-coder/Loading-museum/pull/36)、branch `feat/waapi-game-observation-stage2a`。最終commitとtreeは提出コメントで記録し、同じsource/build SHAと結びつける。元worktreeを保全したため検証worktreeはdetached HEADを使用する。mainへの直接push、新PR、auto-merge、マージ、公開は行わない。
