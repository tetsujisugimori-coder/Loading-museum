# 第6期A-1：Pan & Zoom / 拡大して探す

Issue #61。総合判定と確定した検査結果は末尾へ追記する。自己検証であり、独立レビュー前のマージ推奨NO。Draft維持。

## 基準・現物の再集計

2026-11-04に新規clone。main `cf3370fa285a14cc6ec7c8330daab854fc7bd3b1`。PR #60はmerged、merge commitも同じ。専用branch `feat/pan-zoom-phase6a1`。既存checkoutの変更を削除・stash・上書きしていない。AGENTS.md/.agents/skillsは存在しない。README/LOG、登録、検索、分類、試験、PR #60の本文、Issue一覧を確認。Pan Zoom重複検索0件。

`scripts/inventory.mjs` をmainと作業treeに対して実行し263→264展示を確認。第4・5期の既存実用UI室24→25作品、13室を維持（静的HTMLの13 ROOMS / 264 OBJECTSでも検証）。既存ID・順序は保ち末尾に1作品を追加。旧263という参考値との差なし。全5目印は1展示の内部要素で、別展示に数えない。

## 既存との差・方式比較

|候補|意味と判断|
|---|---|
|Square Lens|既存Canvasの局所的な屈折・参照位置の効果。図版全体の窓と倍率を学ぶ今回の目的とは異なる。|
|自由ドラッグ|既存の要素位置を変える操作。今回の図版座標は固定で、窓に対する変換だけを変える。|
|Node Flow Editor|ノード・有向辺の配置と接続を編集。今回の目印は追加/編集せず、図版全体を同じ変換で描く。|
|CSS transformだけ|実装は短いが、SVG目印・窓・制約を一貫して説明/検証するため、明示的な座標モデルを採用。|
|外部ライブラリ|今回の有限図版・単pointer・倍率範囲は既存React/TS/SVG/Pointer Eventsで実現可能。依存追加不要。|

独自SVGは1000×700。観測所、時計の庭、橋、小屋、木立と小道/小川を制作。実在施設・地図ではなく、歴史的事実の再現も主張しない。外部画像/タイル/実通信なし。参考は[WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)、[Pointer Events](https://www.w3.org/TR/pointerevents3/)、[SVG座標系](https://www.w3.org/TR/SVG2/coords.html)。これらはAPI/アクセシビリティの一次資料で、図版の素材ではない。

## 座標・制約・操作

`screen = translation + world × scale`。scaleは `min(viewportWidth/1000, viewportHeight/700) × zoom`。zoom=1（100%）は全体表示、上限8（800%）。幅か高さが未取得/0/非有限ならviewはnullで操作不能・未測定表示。小さい軸は中央、大きい軸のtranslationは `[viewport - world×scale, 0]` に制限。常に図版の一部が窓を覆う。

double-clickはpointerのworld座標を保存して倍率変更。＋/−と数値入力は窓の中央のworld座標を基準。上下限と端の位置補正は基準点保持より優先。数値は100〜800へ補正、空/非数値/Infinityを拒否。倍率入力は文字入力として日本語の不正値通知を統一し、inputMode=decimalを指定。方向ボタン/矢印は図版を60 CSS px移動。キーは専用group自身のfocus時だけ、修飾キー/入力欄/ページは対象外。wheelを捕捉しない。

目印は4倍へ移動し、可能なら中央。縦長窓の端近くでは制約補正される。ミニマップは同じSVG構図に `visibleRect` の図版と窓の交差範囲を描く。letterbox部分を図版の可視面積へ数えない。表示文字は補助で、ブラウザではSVG実行列から別計算して照合。

全体表示はzoom/translationのみ初期化し選択と移動modeを保持。Resetは全体表示+選択解除+移動mode OFF。選択なし/OFFなら同じ結果で、その理由も展示内に記載。リサイズは確定viewの中央world点と相対倍率を保持し新寸法で補正。非表示/0へ変わった場合は操作用viewをnullにする一方、lastMeasuredには最後の有効viewを保持。再表示時にその倍率と中央を新寸法へ復元する。初回未測定ならfit。

## 所有権・取消・寿命

確定viewはref、ドラッグ中の表示viewは仮状態。dragはowner pointer ID・開始timestamp・開始view・開始screen座標を保持。moveは仮表示だけ、owner upで開始viewからの差分を確定。別pointerは混入しない。Escape/pointercancel/lostcapture/blur/非表示はrollback。

Reset/fit/zoom/方向/目印/mode/resizeは、先にdrag refをnullにしてcaptureを解放し、確定viewへ戻してから新操作を適用。unmountはlistener/observerを解除しdrag失効。同期の古いlostcaptureや古move/upはowner不在で無効。ResizeObserverもaliveフラグで破棄後callbackを拒否。互換mouse既定動作によるWebKit focus移動を防ぐため、実際にdragを受け付けたpointerdownだけpreventDefaultして専用領域にfocus。

タッチ初期は `pan-y pinch-zoom` でページ縦scroll。移動mode ONだけ一指dragを所有し `pinch-zoom`。範囲は図版内のみ。ボタンで解除。図版外scrollとブラウザpinchは制限しない。自動パン/補間/タイマーはなく通常/reducedで同じ結果。通知は確定/取消/操作の節目だけ。閉室focusは既存PracticalRoom契約。

## 検証の契約と失敗履歴

- モデルの既知座標、上下限、未取得、連続操作、目印、取消/古event/別pointer、resize/Reset/fit/zoom/mode/blur/unmount、検索と閉室focusを単体で検証。
- 初回12試験中4失敗：IEEE浮動小数点を完全一致で比較、ResizeObserver mockをReact act外で呼出、既存roomに必要なmatchMedia mock不足。いずれも試験整備の問題。2回目はmini-map座標の完全一致1件が残り、幾何の比較をworld 1e-7 toleranceへ統一。期待する操作仕様は変更していない。最終12成功。
- 全check初回はTesting LibraryのByRoleOptionsへPlaywrightのexactを指定した型エラーで中止。試験側のexactを削除（文字列nameは元々完全一致）。
- 負対照は実ソースへ「pointer基準を常に中央」「visibleRectを全図固定」を注入し同じ12試験を実行。各1失敗/終了1を確認後、元bytesをfinally復元。初回負対照runnerがAssertionErrorをstdoutだけから探し止まった履歴あり。Vitestのstderrも照合するようrunnerを修正。検出自体は最初から失敗を捉えていた。
- ブラウザprobeは全engine×4幅×2 motion、実mouse drag/doubleclick/keyboard、SVG目印のscreen位置、実可視範囲とmini枠、制約、入力、目印5地点、横超過/pageerror/focusを検証。synthetic pointercancel/別pointer/古eventは合成と明記し、存在しないIDのcaptureだけ一時stub。実mouseはstub外で実行。Chromium CDP touchは模擬であって実機ではない。

## 保全・限界・独立レビュー

#29/#44/#54と旧lint中断、WAAPI timeout、旧WebKit load timeoutの根因UNKNOWNを今回の成功で解消扱いにしない。アプリlockfile不変、依存更新なし。実機Safari/VoiceOver/実OS capture喪失はNOT_TESTED、WebKit native touch dragもNOT_TESTED。合成cancel/lostcaptureはOS capture喪失の実測ではない。自己検証を独立レビューとは呼ばない。

独立担当には、制約が働かない条件のpointer/中央アンカー、縦長窓で制約が働く目印、所有pointerの取消と古event、実描画とmini枠、touch modeと通常scrollの切替、実機支援技術を重点確認してほしい。Draft解除/merge/auto-merge/手動公開は行わない。

## 自己検証で発見した製品不具合：一時的な幅0での倍率喪失

修正前 `PanZoom.tsx` SHA256 `b72902e9cd1f8c0ab3474114d905183bd2257c78842e4f51c83b7bf65b52249c`。Chromium375通常の代表検査で、目印選択後400%だった図版が画像保存前後に100%へ戻り、移動modeでタッチしても制約により移動しない反例を検出。操作直後の状態確認を追加しても再現し、期待緩和やretryで成功扱いにしていない。

ResizeObserverの追加診断は 299×280→300×280→299×280→**0×280**→299×280。幅0直前は400%、次は未取得。最後の有効viewをcommittedだけに持ち、0寸法でnullへ上書きしたため、再表示は初回fitへ進んでいた。幅0通知の発生源がPlaywrightの画像保存内部の一時layoutなのか、それ以外かの詳細はUNKNOWN。ただし「一時的未測定で表示状態を失う」という製品の共通原因は単体でも再現した。

先に13番目の契約試験「400%目印→幅0（図版描画なし/操作disabled）→600幅復帰」を追加。修正前は期待scale 2.285714…に対し実値0.571428…で終了1。lastMeasured refを分離し、有効viewだけ更新、0中は無効のまま、復帰時は前の中央と倍率でresizeする修正を採用。同じ13試験を再実行して13成功/終了0のGREENを確認。drag所有権とモデルの幾何は変更しない。


## 実行・成果物

- `npm run check`：lint→型→build→全Node/Vitest。製品修正前は454件成功。修正後も13番目を含む455件が全成功（Node49＋Vitest406、失敗/skip 0）。
- `node scripts/verify-pan-zoom-controls.mjs`：2ソース故障を各終了1で検出、元bytes復元。
- `PLAYWRIGHT_MODULE=<外部の固定playwright@1.56.1> node scripts/verify-pan-zoom-browser.mjs`：アプリ依存へ追加せず既存方針に従う。productionの `/Loading-museum/` をローカル配信して両engine×4幅×2 motion。REQUIRE_CLEAN=1ならHEAD一致を強制。画像・source hash・HEAD/tree・各条件の誤差・pageerrorをJSON保存。
- CIは既存workflowに加え `.github/workflows/verify-pan-zoom.yml`。PRの正確なhead SHA checkout、Linux両engine、負対照、画像/JSON/logのartifact。実行中・失敗・skipは成功へ合算しない。

実機/支援技術未実施を除く、確定した最終結果とCI URLはPR本文とIssue #61に記録する。


検査手順の追加記録：修正後matrixのChromium375/390両motionは成功したが、765通常で1pxの画面幅変更がclientWidth/clientHeightの整数寸法を変えず、drag失効待ちが30秒timeoutになった。表示領域の寸法変更が起きたとする試験前提が誤り。図版の実heightを40px変更してResizeObserverによる取消を検査する手順へ修正。期待する失効・中央保持・古event拒否やtimeoutは変更していない。失敗JSON/logを保全し、最終全matrixを再実行する。


最終ローカル初回のChromium8条件は成功。WebKit375通常のnative mouse move直後の単発属性読取りで仮表示差分なしとして停止。pointer/capture/hit targetの診断を追加した同条件は成功し、owner down→4 moveと仮位置差分を確認。イベント送信応答とReact描画確定の厳密な内部順序の根因はUNKNOWNとして失敗を保全。固定sleep/retryを使わず、move後に「実transformが開始前と異なる」という同じ契約を8秒以内で待ち受ける明示的描画gateへ修正。double-clickも600%の実表示を待ってから目印位置を測る。入力や期待座標・許容差を緩めていない。


React自己レビュー：`vercel:react-best-practices`を適用。イベント処理に操作を置き、描画用viewと所有権refを分離。listener/ResizeObserverはunmount cleanup、破棄callbackはalive guard。図版は副作用のない別component。ドラッグ代替、専用focus領域、label、節目live通知、touch範囲を確認。既存構成に合わせ通常CSSを局所scopeで追加し、UI library/依存更新は行っていない。


提出準備時点：全館455成功、負対照2検出、Chromium全8＋WebKit375/390/765の6＝14条件成功。WebKit1280の2条件は実行中。これは全16成功の主張ではない。確定した全条件・最終HEADとCIはPR本文/Issue #61で追補する。開発時画像はsource hashで照合し、CIはcleanな最終HEADを実行する。


「右14回」の修正は到達契約を緩めたものではない。表示中SVG行列から残りtranslationを測り、60pxボタン移動で端へ届く必要回数 `ceil(-x/60)+2` を実行して、最終x=0を従来どおり0.01px以内で照合する独立手順へ変更した。初回のx=-298.126…失敗ログを保全。最終manifestはraw source SHAと改行をLFへ正規化したcanonical SHAを併記し、Windows CRLFとGit blob/Linux LFを区別する。rawログはバイト保全のためCRLFも維持し、sourceのdiff whitespaceチェックとは区別する。


## 最終ローカル確定結果（提出前）

**全16条件PASS**：Chromium141.0.7390.37/WebKit26.0 ×375/390/765/1280×通常/reduced。pageerror/横超過0、必要な旧event拒否/幅0復帰/mini実範囲/5目印/keyboard/close focusも検証。pointerアンカー誤差の最大値は約0.500109 CSS px（許容0.75 CSS px以内）。両engine375/1280の通常画像を目視。motion間のPNGは同一ではないため同一画像とは主張せず、reduced側も目視確認。24枚の最終overview/exhibit/detailを保存。Chromium CDPで通常scroll/mode pan/mode中図版外scroll成功（模擬）。

これは開発中の自己実行でありJSONのHEADは当時のmainとdirtyを保持。最終product 7ファイルのraw SHA一致を検査し、canonical SHAも別記録。最終commitのclean CIと独立レビューを区別し、CI URL/結果/HEADはPRとIssueへ確定する。提出準備時点14/16の記載は履歴で、上記が最新結果。


## 初回正式CIの旧件数assert修正

HEAD `29688ec9941919025220775e13435dca4407fd73` の新規Pan & Zoom両job（41802434106）は16/16成功、全館contractsは455成功。既存Stage 2B run41802433784の失敗artifactを実取得し、WebKit全4幅が `verify-waapi-stage2b.py:30` の `13 ROOMS / 263 OBJECTS` 固定期待で止まったことをJSON tracebackで確認。Stage 2Aにも同じ旧263のassertが残っていた。

初回失敗を `first-ci-stage2b-webkit-failure.json` とCI URLに保全し、両Python検査の全館総数だけ264へ更新。WAAPI47、13室、操作/時間/座標/許容差/timeoutは変更しない。登録の現物と静的HTML試験の264へ揃える整備であり、機能契約の緩和ではない。アプリ差分0の追加commitで提出し、最終HEADで全workflowを再実行する。無条件rerunはしない。
