# 実用UI 第5期B — 独立レビューへの引継ぎ

Issue #59。対象は6つのローカル操作展示と全館登録・試験。Draft維持、マージ・auto-merge・公開デプロイは行わない。

## 登録と採用方式

main `bc99d0617f5459e2bbe508b36575c8d8e4489d6e` を専用checkoutへ取得。実測257→263展示、13室を維持。第4・5期実用UI室は18→24作品。既存の展示ID・作品データを保全し、検索と同じ一覧へ6件を追加。既存の単一ページURL `/Loading-museum/` で室を開いて作品を選択する。新規ルートや外部リンクの自動取得は追加しない。第5期AとFlash第2期を変更しない。

[設計・機能差・受入条件](phase5b-plan.md)。状態管理ライブラリは追加せず、確定データのimmutable snapshotを最大50操作までUndo/Redoへ保持。仮操作は確定データへ混ぜない。Resetは履歴を破棄。ID採番はReset後も巻き戻さず、削除・取消・履歴分岐で別項目と衝突させない。

|作品|操作とデータの関係|制限|
|---|---|---|
|Kanban Board|追加・名称編集・列/順序変更・削除。安定ID。挿入位置表示、ドラッグと移動フォーム、編集取消、Undo/Redo/Reset|3列、18カード、名称80文字。列内順序は配列の列別抽出順|
|Node Flow Editor|ノードCRUD（追加・配置・削除）、辺の接続/切断、削除時の辺除去。自己辺・重複・循環・不明IDを拒否。ポインタと矢印/数値入力|8ノード、名称40文字。パン/ズームは採用せず、有限canvasと代替フォームを採用|
|Schedule Grid|予定の追加・移動・開始/終了変更・伸縮・削除。重複は相手IDを明示し許容。時刻フォームとポインタが同じ分データを更新|08:00–20:00、15分刻み、8予定。1予定1レーンの時間軸、必要時は局所横スクロール。日付・DST・保存機能なし|
|Diff Viewer|行単位LCSで共通行を保持。変更区間内の削除/追加を対応表示し、記号と両版の行番号を併記。差分移動は該当行へfocus|各版240行/24,000文字。超過は比較不可。行内diff、意味の一致、移動追跡は推定しない|
|Theme Studio|配色・文字サイズ/書体/太さ・余白をpreviewのCSS変数だけへ反映。本文比率と4.5基準、ボタンは黒/白の高い比率を採用|文字14–24px、余白8–28px。低コントラスト選択は警告付きで観察可能。操作部は固定配色|
|Shortcut Recorder|候補・取得中・確定・競合・取消を分離。操作ごとの登録/変更/削除。重複拒否。専用focus領域だけで実行し、代替select/実行ボタンを提供|Shift+英字のみ。Ctrl/Meta/Alt/予約キーはpreventDefaultしない。OS/支援技術が先に処理する場合あり|

全作品は独自実装、架空データ。保存・実通信・素材転載・新規アプリ依存なし。歴史上の初出/発案者はUNKNOWN。参照リンクは説明用で自動取得しない。

## 発見した不具合とRED→GREEN

### WebKitのドラッグ取消（P2、修正済み）

修正前のclean HEAD `0d78da0c35cad2624ca047a0b7a980ca9473013c` をbuildし、WebKit 26.0 / 375px / 通常motionのNodeで再現。ハンドル押下→配置preview→Escape→古いpointerの移動→解放で、位置が(10,20)から(20,27)付近へ確定し、取消後不変の検査が終了コード1になった。実測値は[RED JSON](phase5b-evidence/webkit-cancel-old-head.json)のerrorを正とする。

原因は、pointerdown中の明示focusが後続の互換mouse既定動作でbodyへ戻り、Escapeが展示のイベント経路へ届かなかったこと。押下直後・Escape後ともbodyへのfocusを記録。確定データとpreviewの分離だけでは取消イベントの到達を保証できなかった。

採用修正はドラッグ専用ハンドルで既定動作を抑止し、明示focusとpointer captureを保つこと。同時にpointer所有権を照合し、Escape/cancel/lostcapture/履歴操作で仮操作を廃棄。周囲の通常スクロールは維持する。グローバルなキー捕捉やページ全体のtouch-action抑止は採用しない。

同じWebKit375pxの操作で取消後に確定データ不変、押下直後・Escape後ともBUTTONへfocus、終了コード0を確認。初回GREENは修正中のdirty実行として保存し、最終clean HEADの全matrixで再検証する。自己検証を独立レビューとは呼ばない。

### Theme Studioの表示と設定の不一致（P2、修正済み）

最初の操作matrixはpreviewのCSS変数とcontainerの計算値だけを検査しており、複数部品の描画を確認しきれていなかった。画像確認でサンプルボタンの配色が設定に追従しないことを発見。部品の計算済みbackground/font/paddingとbadgeを比較する検査を追加したclean HEAD `7eadbf9f02d4a86d6d89bd22c0175287d639794a` のChromium375pxで、accent `#9e5130`に対し実ボタンが`rgb(36,59,81)`のままで終了1となった。[RED](phase5b-evidence/theme-old-head-red.json)。

原因は、展示previewのbuttonルールと館共通buttonルールが同じ詳細度であり、CSSの読込順で館の固定配色・余白が優先されたこと。previewの二重scopeで、色・文字・余白を明示的に設定値へ結び直した。Shadow DOM導入や館全体のbutton変更は不要で、局所の優先関係を固定する方式を採用。追加検査を緩めず両browserの最終matrixに含める。旧matrixの成功だけでこの指摘を閉じない。

### ラベルと試験経路

初期ブラウザ検査では暗黙labelにselectの選択肢も含まれ、正確な操作名で到達できなかった。各selectへ明示ラベルを追加。初期Kanbanドラッグの失敗は、検査が移動先へscrollして移動元を画面外へ追い出した試験側の問題。両座標が画面内であることを明示検査し、同じ移動が成立した。ScheduleのUndo後は仮編集を解除する仕様のため、削除試験では復元した予定を再選択する。

上記と初回lint/type/単体失敗、ブラウザ探索パス/ローカルHTTPの環境失敗は[初期記録](phase5b-evidence/initial-failures.json)と各logへ保持。期待緩和、skip、timeout延長、無条件retryで隠していない。

設定/登録のUndoが無関係なサンプル実行カウンタまで0へ戻す問題も、追加した2つのassertで旧FAILを確認。履歴の対象である確定設定/登録と実行例の状態を分離し、実行例の初期化はResetだけへ限定した（修正中の編集syntaxエラーも保存し、修正後6/6を確認）。Diffの文字数上限はsplitの前に検査し、超過入力から配列を作らない。

## 検証経路

- 基準mainの既存 `npm test` を再現。[baseline log](phase5b-evidence/baseline-tests.log)。新規22試験はモデル・UI・登録/検索/閉室を確認。diffは既知結果に加えて256組の短い入力で両原文の復元・重複/空行/順序を検査。
- 実ソースへ移動no-op、別カードへの取り違え、循環の誤受入、diff逆順を順に導入する[負対照](../scripts/verify-phase5b-controls.mjs)。4改変すべてで試験が失敗し、元bytesを復元。最初の改変検査はCRLFの照合ミスで3件まで完了したため、complete=falseを保持。改変位置を正規化後に4/4を確認。
- [ブラウザ検査](../scripts/verify-phase5b-browser.mjs)はローカル静的exportをserve。両engine×4幅×2motion×6作品=96条件、データ/表示・通常入力・touch tap・mouse drag・keyboard・Escape取消・focus・横超過・pageerror・Reset後を検査。Chromium375px通常でCDP native touchによる列移動・ノード配置/取消・予定移動/伸縮とページscroll不変を追加。
- 実機iPhone Safari、VoiceOver、OSによるcapture喪失/背景化、WebKit native touch dragはNOT_TESTED。ブラウザエミュレーションと実機は別。既存Issue #29/#44/#54の残件も閉鎖しない。
- 初回の全回帰は、変更していないWAAPI galleryの「追加ゲーム14件」試験が5秒timeoutで失敗し、後続groupは未実行。初期結果を保存し、GUIとの同時実行を避けた同条件の全回帰と正式CIで確認する。競合負荷の疑いはあるが原因はUNKNOWN。再実行成功だけで根本解消とはしない。timeout・期待・skipは変更しない。
- 限定CIは固定PR HEAD、Chromium/WebKitの同じ4幅×2motion。既存回帰workflowも維持。総数に依存する既存assertだけ257→263、実用室18→24へ更新し、既存期待の操作内容は保全。

## 独立レビューの範囲

実装・自己再実行の担当は同一で、独立再レビューはNOT_VERIFIED。引継ぎ先は最終HEAD/tree、mainとの差分、RED HEAD、GREEN matrixのmanifest、4負対照、CIを照合し、6作品の操作と画面も確認すること。レビュー完了まではマージ推奨NO、Draft維持。実機未検証は条件付き判断の材料として残す。

最終の実行数・HEAD・CI URLはIssue #59とDraft PRの提出記録を正とし、途中の不完全な実行を成功へ合算しない。

## 提出時のローカル検証

製品・試験・workflowの最終変更HEADは `f3994f6eeeefb7beb875c6ba9f2b74958234ae84`、tree `0e6a1ed4ab98a6e6a815fdfcd124f63d9eecc47d`。以後の提出commitは証拠/説明だけとし、GitHub CIは提出HEAD自体で実行する。

- [終了コード付き全検証](phase5b-evidence/local-final/results.json): lint 0、typecheck 0、npm test 0（build成功、Node49＋Vitest391＝440、失敗/skip 0）。新規22を含む。最初の既存WAAPI timeoutはUNKNOWNとして残す。
- [最終の反例GREEN](phase5b-evidence/final-focused-browser/results.json): Windows、Playwright1.56.1、Chromium141.0.7390.37/WebKit26.0、375px通常、NodeとThemeの4条件成功。source SHA256、export SHA256、実部品の配色/文字/余白、focus、PNGのhashを含む。実装担当による自己検証。
- [最終4負対照](phase5b-evidence/submission-controls/results.json): 全改変を終了1で拒否、元bytes復元。改変で失敗した試験は負対照の期待結果であり、通常試験の失敗へ混ぜない。
- [初期matrix](phase5b-evidence/superseded-matrix-incomplete.json): 旧修正HEAD `9aa83f4` の90/96条件成功後、WebKit1280px reducedの新ページloadで8秒timeout。次ページの作品操作は0件で、current欄は直前完了作品を指す。complete=false、終了1。Themeの実部品検査追加前なので、これを最終96成功とも最終Themeの証拠とも扱わない。timeoutは原因UNKNOWNのまま保持。
- 正式CIで最終HEADに対する2engine×4幅×2motion×6作品の96条件を確認し、結果をIssue/PRへ記録する。初期timeoutや未完了実行は再実行成功で原因解明済みにしない。実機と独立レビューはNOT_VERIFIED/NOT_TESTEDのまま。

残存する確定P1/P2は自己検証で未検出。環境/性能に関する初期timeoutと中断したlintの原因はUNKNOWN。これらと実機未検証を引き渡し、独立レビュー前の限定マージ推奨はNO。

## 2026-11-04 P2-01仕様確定とP3-01局所修正

- Issue #59の当初のAlt+Shift+英字という文言はユーザー決定でShift+英字へ正式変更。Alt+Shiftは取得・実行を拒否し、既定動作は抑止しない。実装済みの範囲限定処理は維持し、コードとIssueを一致させた。Shiftのみの正例／Alt+Shiftの負例（取得中・実行時）を単体／ブラウザ双方の回帰に追加。
- Kanbanで初期3件→c4追加→Plan列3番目（同じ可視位置）への移動を行うと、旧版は列を跨ぐ内部配列の並べ替えだけでUndoが増える。移動対象の元の列内indexと挿入先indexが一致する場合は元配列を返すことにより、意味のない履歴を防止。元のデータ、Undoで追加の取消、Redoで追加の復元まで同条件で検証する。
- この修正自体はブラウザ独立実測の完了を意味しない。最終HEADの正式CIおよび別環境の再レビュー結果で判定する。実機と既存timeout原因の扱いは変更しない。
