# Physics Playground P2-A/P2-B — 自己検証と独立再レビュー引継ぎ

総合 **PARTIAL、マージ推奨NO**。実装担当の自己検証であり、独立再レビューPASSではない。Draft・未マージ・未公開を維持する。

## 版と提出範囲

旧HEAD `7ccb51f158a564327a5b900b5210cd6cd57d81bf` / tree `48497434a97f6b535e63802e4cb9ab3aa1da0942`を隔離cloneし、PR51と一致確認。今回の最終HEAD/tree・CI終端はPR本文/通常コメント/Issue50に記録する。製品SHA256は `c699bea0690fc43f4e502f86a2a4543e398e0d994e2ffd795c4211309577da30`。最終Git blobとローカルbrowser結果を照合した。

ローカル検証用2commit `8fbb15a07d598a727feb7138cb43d6e5892a1ba9` / `4dc404ce554194f8637bdc7eb6cc8fc8c4d7f67b` はそのままpushしない。最終ローカルtree `cc58f6a8f26454db8dfde329b9c467f3da5e8524`から製品/試験/検証器をbyte一致で移し、旧提出HEADを直接parentとする最小提出treeを別の隔離checkoutで作る。不要npm長ログ・途中ソースcopy・中間run重複・他5作品PNGは提出履歴へ混入させない。元資料/失敗はローカルに全保全する。

## 原因と修正

P2-Aは旧releaseの全球mapが取消時に球2まで速度0にするもの。P2-Bは停止時にdrag参照だけを消し、heldが残るもの。dragのindex/pointerId/targetを一緒に保持し、releaseを対象球へ限定。通常upは投擲速度を維持、cancel/blur/停止/unmountは対象の速度0/held解除。参照を先に無効化して正確なcaptureを解放する。layout cleanupで再開frame前に同期し、別球/別pointer/遅いlostcaptureを保護。local Reset/打上げ/keyboardも所有権を終了する。

製品差分はSecondStudies.tsx内のPhysics状態管理のみ。積分・重力・摩擦・反射・衝突計算と初期値は不変。Intro/Soundを含む他5作品、旧54registry、18カテゴリ、他室/WAAPI、lockfile、元の両workflow、既存証拠はblob不変。旧940パス中937不変、変更旧3パスはPhysics・関連単体・LOG。新規依存なし。4B保留原本/ZIPの読取・転送なし。

## RED→GREENと証拠種別

`red-v2-browser/results.json` と `final-lifecycle/results.json` は同一probe hash `eb36c73a54c4f903b95396a7929c2c7433863779aa8e6f3ad18628835f63707f`、入力、期待、8000ms上限。Chromium×375/390/1280でcancel-independent/stop-held/offscreen-held/stale-eventsの12 RED→12 GREEN。normal-release/close-resetの6条件は旧時点から成功する対照。最終18成功。比較器は旧HEAD/tree、全条件数、各失敗理由、同一probeを照合する。

**取消独立性の直接証拠はcancel-independentと対応単体試験。** 球2へSpaceでvy=-250を与え、球1を離れた(60,60)へdrag。低減でRAF停止、重力/摩擦0。取消直前直後で球2のx/y/vx/vy/heldが完全一致し、次1/30秒でy=100−250/30、vy=-250。衝突/壁反射を除外した配置で、取消処理の副作用を分離する。

mouse drag/up/keyboardは信頼されたPlaywright入力。PointerCancel・別/古いpointer注入・blurを避けた停止clickは人工イベント。画面外停止は実browser scroll。物理OSタッチや実機Safariの操作確認ではない。停止直後のheld/capture、再開/再drag/Reset、capture喪失/blur/unmount/単体モードも単体で検査した。

旧単体は17中4失敗/13成功→新17成功。`red-final-unit.log`と`committed-package-check.log`参照。全checkはlint/types/静的build/**309成功、失敗0/skip0**（原281+前回22+今回6）。既定並列・原期待/期限を維持。browserはlifecycle18、壁/床反射・二体衝突3、原6作品×3幅18、旧Flash6操作成功。実AudioContextの正常系、pageerror/横超過/閉室RAF残留/新作保存差分0は原6作品probeで確認。全館全操作成功とは呼ばない。

ローカルbrowser JSONのHEAD/tree欄は当時未commitの親版を示す。dirty source SHA256で区別し、上記最終製品Git blobと一致確認。新しいclean HEADの検証はCIを別証拠とする。`local-preservation-before-authorization.json` は再承認前の記録であり、そこにあるDENIED/NOT_STARTEDは当時の状態。

## 画像/ログ点検と保全

今回65PNGを14 contact sheets/81tilesで全数目視し、合成Museum図形/UI/説明/一覧だけで、個人データ・認証・他アプリは観察されなかった。PNG付加metadata全数空。原byte/SHA256を保持。代表8枚のみ提出し、結果JSON中の他の画像名はローカル保全物である。26logも今回の合成fixture/ローカルtool実行由来として点検し、秘密key/token/認証代入/メール/IPの代表パターン該当0。網羅的な秘密不存在保証ではない。全数hash/点検範囲と非提出原資料はaudit-summary.jsonへ記録。

初期v1はSVG速度復元の浮動小数誤差でResetを誤検出。速度小数9桁への正規化後、製品修正前にREDを取り直した。最初の追加単体は既定重力240を見落とした期待値があり、重力/摩擦0へ合わせて旧新双方を再実行した。これらの原失敗/ソース/画像はローカル保全し、製品不具合の再現数へ加算しない。

初回npmはcache ENOENT、専用cacheで成功。Playwright installはChromium導入段階で403 Domain forbidden。**1コマンド内部の標準自動fallback5試行**があり、手動再試行/別host指定/ポリシー回避はない。WebKit取得・起動は未到達。localはDebian13.6/Linux6.18.57、Node24.19.0、Playwright1.56.1/system Chromium154.0.8037.57。GitHubの固定Ch/WK結果はローカル未実施と区別する。

GitHubのPNG/create_treeは最初auto-review拒否で未実行となり停止。本人が2026-11-02 10:45:47Zに当該repo/branchへの修正コード・合成検証log/画像共有、PR51更新・CI実行を明示再承認したため最小提出を再開。以前の拒否を成功へ読み替えず、再拒否ならその操作を停止する。

残件は独立再レビュー、実機Safari/VoiceOver/物理touch/実OS低減切替/実スピーカー/全館全操作のNOT_TESTED。Issue44既存依存警告、旧Windows WAAPI5000ms timeout根因UNKNOWNを維持する。Ready/正式APPROVE/merge/auto-merge/公開は実行しない。

## 今回初回CIの失敗保全

最小提出0d88e822 / tree977d67dcのPhysics CI41432253225はCh成功、WKでcancel-independentが3幅失敗・他15条件成功。後続の力学/旧版REDは先行失敗で未実施。製品/入力/期待/8秒を変えず、失敗の数値とassertionをログへ出す診断だけを追加する。原因は現時点UNKNOWN。既存全館CI41432253049の進行と別集計する。原artifact/ログはGitHubとローカルに保持し、旧失敗を新成功へ上書きしない。
