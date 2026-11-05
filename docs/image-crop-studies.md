# 第6期A-2：Image Crop / 構図を切り取る

2026-11-05追記：PR #64 P2-01の表示丸め・境界再適用を別工程で修正。[数値契約の比較・採用](image-crop-precision-design.md)と[自己検証・再レビュー引渡し](image-crop-precision-verification.md)を参照。以下は初回実装の時点記録として保持する。新しい失敗・修正は過去の検証へ混ぜない。

Issue #63。自己検証から独立レビューへの引渡し用。**独立レビュー未実施、マージ推奨NO、Draft維持。** merge / auto-merge / Draft解除 / 手動公開は実施しない。

## 調査・保全・件数

2026-11-05 JST、空のtask-7へ新規clone。最新GitHub mainとlocal HEADは `8f065e0d0392b78b927d148648d0b77205ef979a`、tree `ea82e61f90a18524500bb03f34d870594c352b70`。PR #62は統合済み。元の別checkoutを変更せず、初期clean・未追跡物なし。専用branch `feat/image-crop-phase6a2`。checkout/祖先のAGENTS.mdと`.agents/skills`は存在しない。README/LOG、PR #62本文、open Issue一覧、#29/#44/#54、登録・検索・集計・既存試験・workflowを確認。

`scripts/inventory.mjs`でmainを再集計：264展示、13室、実用UI室25展示。今回は`phase6aExhibits`末尾に`image-crop`を1件追加。IDの既存重複0。追加後265展示、13室、同室26展示。旧展示のID・順番・素材を保持。固定総数を持つ既存検査は総数のみ265/26へ整合し、他の期待値・時間・許容差は変えない。lockfile・依存・新室・外部素材・アップロード・書出し・保存・通信の追加なし。

## 採用方式と固有体験

|方式・既存展示|今回との比較|
|---|---|
|Pan & Zoom|図版全体を変換して固定窓から探索。今回は元絵を固定し、選択矩形と確定構図を編集する。既存展示は変更しない。|
|Mask Theatre|遮蔽や光の演出をThen/Nowで比較。今回は4辺を持つ編集範囲と明示的確定・取消が中心。|
|Canvasへ画像を破壊的切抜き|元絵の保持や高解像度再描画に不要な処理。採用しない。|
|SVG viewBox＋元絵座標モデル|追加依存なし。同じ独自図版を元絵/編集/確定へ描き、各結果の比率をCSS aspect-ratioとpreserveAspectRatio=meetで保持。採用。|

1000×700の架空の庭を独自制作。家・花壇・川・三日月橋・果樹・小亭。図版の起源や実在施設の再現を主張しない。参照は技術・操作の一次資料：[SVG座標とviewBox](https://www.w3.org/TR/SVG2/coords.html)、[Pointer Eventsとtouch-action](https://www.w3.org/TR/pointerevents3/)、[ドラッグ以外の代替操作](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)。コード・図版の転載なし。

## 実装前に決めた規則（Issue本文にも記録）

- 元絵座標でx/y/width/heightを保持。画面pxやResizeObserver値を保存座標にしない。最小幅80、高さ80。移動は大きさを変えずx/yを元絵内へclamp。
- 四隅の伸縮は対角を固定。反対側を越えても最小寸法で停止し反転しない。自由比率は各辺を独立制限。固定比率はpointer距離を幅/高さの比率直線へ直交射影し、両辺80以上・元絵内の最大寸法へ制限。ポインターからずれる場合は範囲・比率を優先。
- 比率切替は現在幅を基準に高さを計算。両辺80以上へ拡大する必要があれば補正し、元絵内へ収まる幅まで等比縮小。元の中心へ配置してから端をclamp。自由へ戻すと形を保持。
- 数値は明示適用するまで枠を変えない。自由は4項目、固定比率では幅主導・高さは連動して読取専用。小数可、空欄/非有限/80未満/元絵外は理由を表示して拒否。数値入力には自動端補正を行わず、明示値の誤解を避ける。
- 初期枠は(100,120,480,360)、比率自由で初期確定済み。確定＝editingをcommittedへ。取消＝committedをeditingへ。Reset＝両方を初期枠/比率へ。差分なし・dragなしでは確定/取消を無効化。
- ドラッグ開始時のeditingを保存、途中表示はprovisional。pointerupのみeditingへ採用し、committedは確定ボタンまで不変。別pointerを拒否、timestampが開始前の古eventを拒否。Escape/cancel/lostcapture/hidden/window blur/focus領域外移動で開始前へrollback。
- ドラッグ中の確定/取消/Reset/比率/数値/方向/keyboard/resizeは、先に仮操作を失効して開始前editingへ戻し、その後に対象操作。releaseより先にdrag参照をnullにしlostcapture再入を無害化。遅いmove/upはactive dragがない限り拒否。非同期描画callback/タイマーは使用しない。
- 寸法0ではdrag停止、座標・比率・確定結果は保持。再表示はそのまま描画。寸法変更中のdragは開始前へ。unmountでobserverとglobal listenersを解放、captureを解放し古い所有権を破棄。

## 操作とアクセシビリティ

枠内drag、四隅44×44 CSS pxの外向きハンドル、数値、10単位の方向ボタン、専用focus領域の矢印、handle上の矢印伸縮。数値欄とページの矢印を奪わない。全て明示labelとfocus outline。statusは操作完了/取消/エラーの節目のみ更新、連続moveでlive regionを更新しない。元絵は枠外を30%の暗幕にして内容も残す。狭幅は編集/結果を縦に配置。図版外・枠外は通常scroll、枠内とhandleのみtouch-action=pinch-zoomで一指編集を所有し、pinch禁止はしない。実際のpinch/支援技術の動作確認とは区別する。reduced motionで同じ到達状態、自動アニメーションなし。

## 検証層と証拠

1. 純粋モデルとjsdom契約：四辺・四隅・全比率・反転阻止・数値拒否・状態遷移・別pointer/古event・各取消と競合・幅0・解放・検索/登録。
2. source故障対照：途中枠を誤確定／固定比率崩壊を実際に注入し、子process終了1とAssertionErrorを要求。元bytesをfinallyで復元。
3. 実ブラウザ：Playwright1.56.1、Chromium/WebKit×375/390/765/1280×通常/reduced。native mouse/keyboard、SVG screen CTMによる枠の位置と大きさ、試験側座標の独立viewBoxで描いたPNGと実PNGの比較。元絵の図柄不変、家と木立の異なる切抜き、確定結果保持、比率/数値/取消/resize/0幅/focus/overflow/pageerror/検索/件数/既存Pan & Zoom。
4. 合成イベント：存在しないpointerのcaptureのみstubし、別pointer/cancel/lostcapture/blur/hidden/操作後の古eventを検査。OSからの実イベントとは呼ばない。
5. Chromium CDPによるtouch模擬：枠内dragと図版外scroll。物理touchやWebKit touchの代用にしない。
6. 描画負対照：誤位置と1:1への誤比率をDOMへ一時注入し、同じPNG oracleが拒否することを確認。修正前の実不具合とは別の検査能力対照。
7. 代表PNGを目視。自己検証と独立レビューは別、独立担当による新規ブラウザ検証は本工程に含めない。

各実行のHEAD/tree/dirty/source canonical SHA256/export hash・PNG hashを保存。dirtyローカル実行は最終clean CIとは呼ばない。固定sleep・無条件retryなし。描画ready/drag終了などの状態を待つ。最終結果と初回失敗は証拠READMEとPRに追記する。

## 自己検証の確定結果（提出前）

WindowsローカルのChromium141.0.7390.37/WebKit26.0、全16条件成功。source故障2件、誤位置/誤比率の描画対照は両engineで拒否。pageerror・横超過0。Chromium CDPの枠内touch dragと図版外scroll成功（模擬）。両engine×375/1280×両motionの代表画像を確認。WebKit1280の2 motion画像はraw bytesが同一で、その同一画像を確認。40枚の最終ローカルPNGをmanifestへ実照合。

目視で見つけたWebKit native selectの低視認性を同条件RED→GREENで修正。CSS色に加えてcolor-scheme:lightを明示した。初回matrixは10/16でWebKit390の未描画ゲート読取りにより停止した履歴を保存。描画完了待ち＋既知座標照合へ直した最終版では、WebKitの即時/描画後の値が異なる6観測をJSONに記録し、開始枠への復帰を確認。内部イベント順序の全容やWindows WebKitの長時間化の原因はUNKNOWN。タイムアウト延長・retryなし。

正式CIは既存7 workflowを維持し、新規Image Cropのみengine×4幅の8独立job（各両motion）。各job15分の制限を維持。最終HEADのCI確定URL/全job結論とartifact照合はDraft PRで追補する。ローカル記録と最終clean CIを混同しない。

## 限界・独立レビュー重点

実機Safari、VoiceOver、物理マウス/OS SendInput、実OS capture喪失/背景化、WebKit native touch、ブラウザpinchはNOT_TESTED。#29/#44/#54と以前のUNKNOWNを今回成功で解消しない。未確定数値入力はドラッグや操作完了で現在枠の表示へ戻る。極小枠の精密な操作は数値入力で代替可能。実ファイル切抜き/書出し/永続化機能ではない。

独立レビューでは、対角固定と比率端補正、数値連動と無効値拒否、途中操作の無効化順序、同pointer再利用時の時刻判定、capture release再入、幅0/閉室後の状態、touch範囲とscroll、実画像の元絵との整合、PNG oracleへの誤描画対照を重点確認してほしい。自己検証PASSを独立受入やマージ承認へ昇格しない。
