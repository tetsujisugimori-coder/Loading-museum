# WAAPI Stage 2B: 判定時間と演出時間

Issue: [#55](https://github.com/tetsujisugimori-coder/Loading-museum/issues/55)

## 基準と範囲

2026-11-03、最新 `origin/main` = `26dae458be5df77bfc4f78f350996f3d375045ed`（PR #52統合）から開始。開始時作業ツリーはclean。PR #34/#52/#36、Issue #54/#44、現行実装と試験を確認。新規展示追加ではなく Perfect Parry / Dodge Afterimage の教材拡張だけを行う。

`INVENTORY_REF=origin/main node scripts/inventory.mjs` と変更後 `node scripts/inventory.mjs` はともに251展示。WAAPI47件、Flash60件を保持。13室はrendered-html試験と実ブラウザの実DOMでも照合する。検索、分類、登録ID、Stage 2A Menu/Coin、他のGame UI、Flash、実用・歴史展示のソースは変更しない。

## 選択した設計

比較した案：

1. Stage 2A観察コンポーネントへ全作品の分岐を増やす。操作共通化は可能だが、単一native Animationの時刻を中心とする既存教材へ、入力前の時間・判定結果という別概念を混ぜる。
2. 実ゲームの時計を停止／巻き戻す。通常ゲームの入力契約と確定結果を変える危険があり不採用。
3. 小さな共有判定／演出モデルと、独立した観察コンポーネント。**採用**。Stage 2Aと同じ操作名称、ステップ幅、clamp関数を利用し、通常ゲームを変更するcallbackは一切渡さない。

`waapi-timing-model.ts`は既存judgeTimingを再利用し、420/680msの包含境界と420ms演出、成功・失敗のレシピを提供。実ゲームも同じレシピを使用する。教材データのレシピはpure dataを維持し、単体試験でモデルとの一致を検査する。大規模な共通化はしない。

## 四つの時間・状態

- 実ゲーム：performance.nowによる攻撃開始からの経過。入力時に結果が確定。420msと680msを含み成功、419msはEARLY、681msはLATE。
- 判定時間窓：攻撃開始基準420〜680ms。タイムラインの緑の帯。
- 観察試行：候補を編集してから明示確定する。既定550ms、入力範囲0〜1000ms。通常ゲームに入力を送らない。seekで確定入力・判定を変更しない。
- 演出：入力後420ms。観察時計は0〜1420ms、native Animationはpauseした状態で局所currentTimeを設定する。観察controllerのrunningとnative pausedは別欄で正直に表示。入力前のnative0は準備位置であり入力発生ではない。

Parry成功は1→1.22→1倍、失敗は1→.86→1倍。Dodge成功は0→±66→±58px（中央opacity.55）、失敗は同じ縮小。fill:noneのため420ms終了位置で基底へ復帰する。この末尾挙動を都合よくfill:bothへ変えていない。

Dodgeの「残像」は本体に常設された3枚の輪郭。個別の発生・消滅タイマーはなく、成功していない時や演出終了後にも存在する。本体とともに移動する実仕様を明示し、架空の残像発生器を教材へ持ち込まない。

## 操作・ライフサイクル

再生／一時停止／停止位置から再開／先頭／前後1000/60msステップ／任意seek／観察Reset。候補時刻、現在位置での入力確定、Dodge方向で比較する。先頭・seekは記録保持、Resetのみ550msの初期例へ戻す。通常モードの確定結果・実入力時刻は保持。進行中攻撃のモード切替は`INTERRUPTED · RETRY`で明示中断する。

RAF tokenとresource cleanupにより旧frame／ready callbackが新試行へ書き込まない。観察側の非表示・画面外・mode終了・unmountでは停止／解放し、自動再開しない。通常ゲームのタブ非表示中も攻撃時計が経過する既存契約は維持し、復帰後の入力は実経過時刻で判定する（タブ非表示だけを画面外交差判定と混同しない）。reduced motionは途中変更でも連続再生停止、静止seek・stepを残す。実ゲームの判定時間は変えない。native WAAPIが利用できない場合は未取得を表示し、native検証済みと偽らない。

## 自己検証と証拠

実行結果と最終HEADはこのディレクトリの検証記録およびDraft PRへ記録する。自動試験は自己検証であり、独立レビューの承認ではない。

- 既存通常ゲーム試験を維持し、新規Stage 2B試験を追加。制御WAAPIダブルをnativeブラウザ検証と区別。
- Chromium/WebKit、375/390/765/1280pxの実ブラウザ検査を専用スクリプトとCIへ追加。synthetic visibilitychangeは実OS背景化や実機試験ではない。
- 既存正式CIを残し、Stage 2B CIはPR head SHAを明示checkout。マージ用仮想HEADと混同しない。
- 既存Issue #54のWK765、Q1/B1/M1のUNKNOWN、実機未検証はStage 2B成功を理由に閉じない。
- Issue #44の依存セキュリティ問題は未解決。localhostの静的exportだけを使用し、dev serverの公開・デプロイはしない。

### 環境準備での失敗履歴

初回npm ciは既定cache領域に起因するENOENT/tarエラー。公式依存を変更せず`--cache /tmp/loading-stage2b-npm-cache`で成功。初期の既設Playwright driverによるブラウザ取得は空zipで失敗。正式CIと同じPlaywright1.56.0を独立venvへ導入して取得。WebKit依存のinstall-depsはroot不可で停止したため、実行可否は別途検証し記録する。試験をskip／期待値緩和／retry増加で通したものではない。

## 独立レビューへの問いと未解決事項

共有レシピの移動量とfill:none終端、inclusive境界、通常ゲーム記録の保持、確定入力と表示seekの分離、旧callbackの遮断を重点確認してほしい。実機iOS/Safari・VoiceOver・OS背景化は自動化結果から保証しない。旧Issue #54および依存Issue #44を別途追跡する。マージ、auto-merge、Draft解除、公開は実施しない。
