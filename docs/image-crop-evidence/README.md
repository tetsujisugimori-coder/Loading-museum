# Image Crop 自己検証台帳

Issue #63 / branch `feat/image-crop-phase6a2`。基準main `8f065e0d0392b78b927d148648d0b77205ef979a`。最終HEAD/treeとCIの確定URLはDraft PRに記録する。開発中のローカルJSONには基準HEADとdirty差分が入る。**自己検証であり、独立レビュー未実施。マージ推奨NO。**

## 原本と区別

|記録|意味|
|---|---|
|inventory-main.json / inventory-final.json|既存main264→提出tree265展示。13室維持、実用25→26。|
|unit-first.log / unit-final.log / unit-post-review.log|新規26契約。後続は同pointer再利用・入力未適用の負検査を補強した再実行。|
|check-first.log|lint後、試験のByRoleOptionsに存在しないexactで型検査停止。製品失敗として数えない。|
|type-second.log / lint-final.log / type-final.log|上記修正後の型とlint。|
|test-first.log|build＋Node49＋Vitest432＝481試験成功、skip0。既存455を維持。|
|source-controls/|実際のmodelソースへ2故障を注入、各終了1・AssertionErrorを確認、元bytes復元。|
|browser-first/|sandboxがユーザーのブラウザキャッシュと異なる場所を参照して起動不能。NOT_TESTED。|
|browser-attempt2/|キャッシュ指定後もsandboxの127.0.0.1接続が拒否。操作到達前、NOT_TESTED。|
|browser-native-first/|権限を切り替えた静的localhost実行。Chromium375通常1条件。描画oracleとtouch模擬の初回成功。|
|browser-matrix/|palette修正前、予定16中10条件成功。WebKit390通常の合成取消直後の単発読取りで停止。全16成功とは数えず、selectの視認性PASSにも使わない。|
|select-red/|WebKit375通常、目視で発見したnative selectの暗色描画。色指定不足を検査へ追加し同条件でREDを記録。|
|final-chromium/ / final-webkit/|palette修正後。四隅の最小/全辺到達と取消の描画ゲートを補強した最終16条件。完了値はresults.jsonと下の追補を参照。|

初回lintの`react-hooks/refs`違反はツール出力で検出（useState初期化関数からrefを読む実装）。`strings(INITIAL)`へ修正。最初のlint出力はファイル収録していない。型失敗とブラウザ失敗の実ログ/JSON/PNGは保持している。後続成功で過去失敗を上書きしない。

WebKit390の旧検査は取消後のDOM更新を待たず、その時の単発viewBoxを『安定状態』として採用していた。次の古event検査時には初期枠へ戻り、旧基準の仮枠と不一致になった。最終検査は`data-dragging=false`を待ち、試験側で既知の初期枠（比率切替だけ別の既知枠）を照合してから古eventを送る。各即時値と描画後の値はrenderTransitionsへ記録する。イベント内部の詳細順序まで根因確定とせず、製品側の取消コードは変更していない。固定sleep・retry・期待値緩和ではない。

native selectの修正は`.imageCrop select{color-scheme:light}`のみ。修正前のcomputed schemeはnormalで、WebKitの実PNGでは濃色背景に暗い文字だった。CSS色だけでnative描画まで保証しないことを、同条件の画像目視とpalette指定検査で区別する。popup・実機Safari・全OS配色を検証済みへ広げない。

描画負対照の識別名`stretched-ratio`は、結果SVGのCSS比率を誤って1:1にする対照。`preserveAspectRatio=meet`は保たれるため、実際には余白を伴う誤比率であり、図柄自体を強制変形する試験ではない。PNG oracleはその誤った結果枠を拒否する。

最終ローカルmatrixの撮影用build後に、狭幅にも合うよう完了通知の「右の結果」を「確定結果」に修正し、CI用harnessへ負対照PNGの保存を追加した。操作ロジックは不変だが、ローカルJSONを最終HEAD clean実行とは呼ばない。最終HEADの正式CIはこの差も含めて再build・検査する。

その後、固定比率の幅Infinityで、連動する読取専用高さの空欄を先に検査し「空欄」と誤案内する小さな問題を修正。`numeric-reason-red.log`で25成功/1失敗（期待は有限、実際は空欄）、編集可能項目を先に検査してから高さを導出する方式で同じ26試験をGREENへ。枠は修正前も保持されており、データ破壊の修正とは呼ばない。`numeric-model-before.ts.txt`に修正前sourceを保持。最終CIの16条件にも固定比率幅Infinityの実フォーム拒否を追加。最終ローカルmatrixはこの最後のエラー案内修正前のbuildである。

`reconstructed-run-sources.json`は実行後、明記した2差分とpalette差分から再構成し、各実行manifestのcanonical SHA256と厳密一致を確認したソース。実行前に取得したバックアップと偽らない。

## ローカルの確定値

- `npm run check`（check-final.log）：lint/type/build、Node49＋Vitest432＝481成功、失敗/skip0。上記の最後の入力案内修正前。
- 最終入力案内修正は関連26試験・source故障2件・型・buildを再検証し、全館と全16条件は最終HEADのCIで確認する。
- Chromium141.0.7390.37/WebKit26.0×4幅×両motion＝16/16。各engineの正常PNG20枚をsha256照合、計40枚。誤位置/誤比率は各engine2件拒否。
- WebKit即時/描画後の読取り差6件をbrowser-summary.jsonに記録。全件で描画終了後の既知枠を受理、古eventによる上書きを拒否。Windows WebKit1280通常は長時間を要したがretry/timeout延長なしで終了。遅延の内部原因UNKNOWN。
- 代表8画像の自己目視はvisual-review.json。実機・独立レビューとは区別。

## 検査の内容

`scripts/verify-image-crop-browser.mjs`は静的buildだけを127.0.0.1で配信する。製品の外部通信機能ではない。Playwright1.56.1をアプリ外の既存tempから使用。WindowsローカルNode24.20.0、CIはUbuntu24.04/Node22。版とsource/export hash・PNG hashは各results.json。

実入力はPlaywright mouse/keyboard、pointerの所有・cancel等は明記した合成イベント、touchはChromium CDP模擬。実機・OS SendInputとは区別。PNG oracleは元絵と同じ図柄を試験側指定viewBox/ratioで描いた画像と比較する。誤位置/誤比率を一時注入した2描画負対照をengine別に拒否。raw PNGを保持し、数値成功だけで描画をPASSにしない。四隅の最小停止・四辺到達は合成pointerでも検査し、純粋モデル側の全比率反復検査と区別する。

## 初回提出HEAD ff052ca のCI修正

初回Image Crop CI 41942823951は7/8 job成功、Chromium390/reducedの別pointer検査だけ失敗。初回の合成moveの描画前に初期枠を仮枠の基準として読んでいた。取得ZIPはGitHub digestと一致、HEAD/tree/cleanを確認し`ci-ff052ca/`へJSON/log/失敗PNGを保存。描画比較失敗→runner非zero→CI failureの伝播も実際に確認した。

修正はharness側だけ。geometry()は既知の期待座標が元絵の枠とプレビューの双方へ反映されるまで待ち、同じ0.01座標許容差で実screen CTMを照合する。合成moveは20/scale・10/scaleの既知の移動を要求してから仮枠を基準にする。別pointerのdownも編集可能な枠へ送る。待ちの時間制限を延長せず、移動が出なければ失敗する。誤位置/誤比率のPNG対照は維持。

また既存第4期A／第5期Bの各両engineが、総数26に対し旧25件assertで操作前に停止。最初の件数検索で2箇所を見落としたため、残る期待件数だけ26へ整合した。素材・製品・時間・座標許容差・既存操作契約は変更していない。両engineのJSON/log/失敗PNGとZIP digestを同じ履歴フォルダーに保全。初回全館contractsは最終製品ソースに対し481成功で、取得ログを保存した。

ローカルChromium390/reducedで描画ゲート後の同条件を成功確認（WindowsのためLinux CIのRED→GREENの代用とは呼ばない）。追加commitの最終HEADで正式CIを再実行し、結果をPR/Issueへ追補する。

## 再実行コマンド

```sh
npm ci
npm run check
CONTROL_DIR=work/image-crop-controls node scripts/verify-image-crop-controls.mjs
# Playwright 1.56.1 + corresponding browsers are installed outside application dependencies.
PLAYWRIGHT_MODULE=/path/to/playwright EVIDENCE_DIR=work/image-crop-browser node scripts/verify-image-crop-browser.mjs
```

WindowsはPowerShellの`$env:`で同じ変数を指定。既存キャッシュ利用時は`PLAYWRIGHT_BROWSERS_PATH`も指定。最終CIでは`REQUIRE_CLEAN=1`でcheckoutの同一性を要求。CIの失敗は非zeroとしてworkflowへ伝わり、artifactは`if: always()`で保存する。公開workflowは起動しない。

## 引渡し

独立担当には元絵と実描画の対応、固定比率/対角/端補正、確定と取消、古event/再入、0幅、touchとscroll、selectの実描画、故障対照の実効性を確認してほしい。本工程では独立レビューを開始しない。

実機Safari・VoiceOver・物理入力・実OS capture喪失/背景化・WebKit native touch・ブラウザpinchはNOT_TESTED。#29/#44/#54と既存UNKNOWNは継続。Draft解除、merge、auto-merge、手動公開なし。
