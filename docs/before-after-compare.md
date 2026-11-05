# 第6期A-3：画像の変化を見比べる

Issue #65。base main `05735e83fd23d228d797afb89a150045293d3e58`（PR #64統合）、専用branch `feat/before-after-compare-phase6a3`。独立cloneで開始clean、対象checkoutと親ディレクトリに適用AGENTS.mdや`.agents/skills`なし。PR #60/#62/#64は統合済み、同目的Issue/open PRなしをGitHubで確認した。既存の別repoは変更しない。

## 展示と操作の契約

既存実用UI室へ安定ID `before-after-compare` を1件だけ末尾追加。最新mainは全館265展示・13室、同室26展示。追加後は266展示・13室、同室27展示。既存のID・順序・素材・lockfile・依存は保持。検索用タグ「画像編集・比較」は後続のAnnotation/Rotate/色補正も分類可能。今回は新室や画像加工機能は追加しない。

独自SVGは1200×760。港のアトリエは屋根の欠け・壁のひび・窓の破損が直り、花が増える。窓辺の静物は形状を一切変えず、明度・コントラスト・彩度・色温度の補正を模す。`scripts/generate-compare-art.py` が原本。全4素材はローカル、架空図版と明示し、歴史写真や実修復資料と扱わない。

- Split：下はBefore、上はAfter。上の左側だけをマスクで表示。初期50%、0%は下の全面、100%は上の全面。画像のbox・倍率・座標を動かさない。
- Overlay：下はBefore、上はAfter。同じboxを重ね、上の不透明度を0〜100%。Split位置と不透明度は別状態として保持する。
- 並列：左右を同倍率で表示。小幅でも2枚の画像は横並びとし、ラベルを図版の下へ移す。画像を圧迫しないようモードと再生操作は図版の下。
- 反転：上/下および並列の左右を交換しラベルと素材を一致させる。数値は変えず、再生・仮ドラッグを停止。上がBeforeになるため、自動比較の方向は100→0になる。
- 再生：現在値からAfter全面へ。ReplayはBefore全面からAfter全面へ6秒（0.5×/1×/2×）。pause/resumeは表示位置を保持し、残距離に比例する再生時間。終端から戻るにはReplayを使用する。
- Reset：図版とmodeを保持し、両比較値50%、初期配置、速度1×、再生停止。pair切替はmode/速度を保持し、両値50%・初期配置・読込待ちにする。
- reduced motion：明示した再生/ReplayだけAfter全面へ即時切替。途中の設定変更は位置を保持してpause。手動比較を維持する。展示内のCSS transition/animationも無効。

Pan & Zoomは全画像の拡大移動、Image Cropは残す領域の選択確定、Diff Viewerはテキスト差分。この展示は2枚の画像を同一座標に重ねたまま、表示面積と透明度を変えて観察する。既存3展示のモデルや描画を変更せず、既存Roomの検索/登録/解説枠を利用した。共有clockは今回必要な明示的pauseと時刻無効化の契約が異なるため無理に共通化しない。

## 状態と入力

`compare-model.ts` はpair、mode、position、alpha、reversed、drag、playback、animation、epoch、speed、reduced、ready、asset世代を分離。ドラッグは仮の値だけ更新し、upでcommit。Escape/cancel/lostcapture/blur/hidden/幅変化は開始前の位置へ戻す。別commandは仮値を破棄して適用する。

pointer所有IDと単調timestampで外来・古eventを拒否。animationはrunごとのepochとelapsed/from/to/durationを持ち、tickはepochが一致したplaying状態だけ受理する。Reset、mode/pair/swap、手動入力、resize、非表示、途中reduced変更は旧callbackを失効。rAF cleanupとunmount cleanupで古い処理を止める。画像load/errorもpairごとのresource世代が一致するものだけ受理し、エラー・描画寸法0は操作停止と再読込を表示する。

ハンドルは48px。端では丸を内側へ収め、線自体は0/100%へ到達する。ハンドル開始は現在値とpointer開始座標を保存し差分で動かすので、端の丸を押しただけでは値が跳ばない。mouseは画像内クリック/ドラッグも可能。touch/penはハンドルにだけ所有権を取り、画像面は`pan-y`で縦scrollを維持する。rangeと全button/selectが代替入力となる。Arrowは1%、Shift+Arrowは10%、Home/Endで両端。range/handle以外のキーは奪わない。

スライダーのARIA値・値説明、可視focus、色以外のBefore/After、画像のaltと変化説明、節目のpolite通知を用意した。比較値outputは`aria-live=off`としframeごとの通知を避ける。実機読み上げの成功を主張しない。

## 検証と証拠

- 既存mainで最初に`npm run check`成功（Node49 + Vitest436 = 485件、別枠の精度45群）。標準npm cacheの書込不可による初回`npm ci`失敗は作業用`/tmp/loading-npm-cache`で解消し、lockや依存を変えていない。
- 新規単体/状態/UI 38件。0/50/100、値分離、swap、reset、両方向再生とpause/resume/終端、speed、stale tick、pointer所有/時刻/cancel、pair resource世代、異常値/寸法0、reduced、load error/retry、touchの所有、閉室を検証。既存485件は保持する。
- `scripts/verify-before-after-browser.mjs` はChromium/WebKit ×375/390/765/1280 ×通常/reducedの16条件。固定Playwright1.56.1/PNG7.0.0はアプリ依存の外へ導入。GitHub Actionsで8個の独立job、各jobで両motionを実施する。
- 自己検査は画像boxと比率、線の実画面座標、明示的source URLから作った試験専用overflow描画とのPNGを別々に照合する。全条件・両pairのSplit/Overlay 0/50/100、反転37%を検証。外周1画素とSplitの計算上の境界±1device pixelを除外（端のsubpixel混合を対象外）し、その他はRGB差3超の画素比率0.002未満を固定基準とする。線位置は別途0.02 percentage point以内、画像boxは0.05 CSS px以内。負対照は固定25%maskと固定alpha=.25を注入し、検査が拒否、復旧後に成功することを要求する。
- mouse/keyはPlaywrightのbrowser入力、touchはChromium CDPエミュレーション。cancel/lostcapture/hidden等は合成配送と明記し、物理入力/実OSの出来事と混同しない。幅0と復帰は実CSS/ResizeObserver。再生中mode/pair変更、連続Replay、途中reduced、実request失敗、閉室再表示を確認する。
- 既存の全館契約と既存Pan & Zoom/Image Crop/第5期B等のbrowser workflowを残す。新harness内の旧3展示は選択表示smokeで、実操作回帰は既存試験から区別して記録する。旧総数assertだけを266/27へ更新し、展示固有のfixture内の歴史的数値は変えない。

代表画像、実行JSON、source hashes、HEAD/tree、dirty、ブラウザ版、環境、故障対照を`docs/before-after-evidence/`とCI artifactへ対応付ける。最終HEADの詳細はPRと確定追補を参照。初期dirty実行を最終HEAD clean実行と扱わない。

## 失敗・修正を保持する

1. 独立レビューが375pxで端ハンドルのdownのみで0→8%となるP2を発見。旧製品source/hash/PNGを`independent/endpoint-red/`へ保存。開始pointerとの差分を使うanchor方式へ修正し、単体2件を追加。独立browserの再検証で両端の押下値不変を確認する。
2. 初期自己harnessはフォーカスによるpage scroll後も画面Yが不変と誤って仮定して停止。画像とcanvasの相対整合、固定寸法の検査へ訂正。初期reportと検査sourceを`self/initial-harness/`へ保存。
3. 次のPNG試験はSplit50%の境界画素で停止。301×191画像の差165画素中163が境界x=150に集中、他2画素は図形edge。画像そのものと報告を`self/raster-diagnostic/`へ保存。比較境界のsubpixel列を独立した線座標検査へ分離し、画素比率許容自体を拡大せず継続する。
4. 新規テストのByRoleに存在しない`exact`オプションをtypecheckが検出、オプションを除去。初期失敗logを保持。
5. 独立reduced検査は全館CSSの1ms transitionによりARIA更新とhandle画面位置の間に差を観測。実描画の到達待ちへ修正し、製品側も局所的にtransitionを無効にする。事前の失敗を製品の再発や成功と即断しない。

## 未検証と範囲

物理Safari/iPhone/VoiceOver、物理mouse/key/touch、WebKit native touch drag、実OS background/capture喪失、browser pinchはNOT_TESTED。ローカル固定browser取得は通信policyの403で停止し迂回しない。既設Chromium154とGitHub Actionsの固定Chromium141/WebKit26を別環境として記録する。既存 #29/#44/#54と従来UNKNOWNを保持する。独立レビューは別agentの記録を根拠にし、自己検証で代用しない。Draft解除、merge、auto-merge、公開は行わない。

## 固定候補の検証追補（正式CIの確定前）

製品候補は `0826a5d5f09c03ee8b0d451c20970ad4eba61601` / tree `00f6f5eb82908618a1a3dbca2c9a92e586c4ff5c`。独立レビュー文書は[別担当の評価](before-after-evidence/independent/fixed-head-review.md)。この記録の`work/independent/fixed-head/`は、保存先`docs/before-after-evidence/independent/fixed-head/`へ対応する。独立Chromium8条件、touch、native keyboard補完、関連88unit、独立故障2件、15source照合が成功。物理/独立WebKitは未検証。全館はNode49+Vitest474=523件成功、別枠精度45群成功。

自己の固定候補matrixは6/8条件と負対照12件まで成功した後、1280通常の取消補助検査で停止した。rangeへfocusしたことで大きな画像のhandleが画面外となったのに古いscreen boxへmouseを送った検査前提が原因。不要な合成downを除き、毎gesture前のhandle表示・box再取得・native down後のdragging到達を検査する。製品source差分なし。同じ1280通常は修正後に完了し、負対照2件も検出した。初回reportと検査source、修正後reportを保存し、timeout/retry/toleranceで隠さない。

この追補の後の証拠・検査commitでは製品ファイルは変更しない。正式CIは新HEADで全条件を実施し、そのHEAD/tree、結果、artifactと照合を[Draft PR #66](https://github.com/tetsujisugimori-coder/Loading-museum/pull/66)へ記録する。過去の候補の結果をそのまま最終HEADの実行結果とはしない。

## WebKit準備判定の補修（正式CIのREDから）

候補7174の正式BeforeAfter CIはChromium4幅×両motionの8条件成功、WebKit4幅はすべて初回ready待ちで終了1。独立担当もjobログを確認してマージ推奨をNOへ保留した。資料の署名付きファイル配信先へのproxy CONNECT403により、ZIP実bytes・内部PNG監査はBLOCKED。GitHubの表示digestを実ZIP照合済みとは扱わない。

診断だけを追加したe140884のWebKit375ログで、canvasは301×190.625、両SVGはcomplete=true、natural寸法は300×190、エラー表示あり、pageerrorなしと判明。製品はnatural寸法を原本の1200×760と同一視して正常な描画を拒否していた。UAのSVG自然寸法を源座標の正規データとして使った設計不良であり、単なるtimeoutではない。

観測値300×190の正常受入と、寸法0拒否後のretry復帰を2単体として先に追加し、38成功/2失敗のREDを保存。onLoadは正の描画寸法による成功確認へ変更した。既知の独自SVGの源座標は、4原本のwidth=1200、height=760、viewBox=0 0 1200 760を検査側で直接確認する。実img boxの一致・倍率・境界・独立描画とのPNG照合は引き続き行い、座標やpixelの許容値を拡大しない。天然寸法は実測値として記録し、原本寸法の代用にはしない。

新規40件・全館525件（Node49+Vitest476）、関連90件と精度45群が検証対象。RED/GREEN、診断logは`self/webkit-readiness/`。補修後の正式16条件・独立再レビュー・最終HEAD/CIの確定結果はPR #66へ追補する。未確認をPASSへ変えない。

## 参照描画の契約と独立WebKit診断の追加

4b4790の正式WebKit375ではready=true、alert0へ進み、P2-02の読込誤拒否は改善した。一方、最初のSplit0%のPNG照合で停止した。旧参照rendererは既定のobject-fit:fill、製品は源比率を保持するcontainであり、参照側が仕様と異なっていた。参照側へ試験指定の1200×760属性とcontainを宣言し、inputの値だけでなく表示styleへの到達を待ち、paint機会をrAFで同期する。画素差の許容値・幾何検査・故障対照は変更しない。失敗時はactual/参照のfitとbox、clip/opacity、scroll/DPR、画素差の分布をログへ出す。0.0083px程度の丸め差だけが旧失敗の全原因だったとは断定しない。

別担当が独自に作成した `scripts/verify-before-after-independent.mjs` をWebKit375通常のCIへ追加した。既存の主検査の成否にかかわらず実行し、いずれか失敗ならjob FAILを維持する。これは主検査をskipして成功にするものではない。独立probeはもう一つの参照imgを生成せず、実Before/After全面baselineからSplit37%とOverlay50%を厳密な均色内点で照合する。2pair、native pointer/keyboard、4SVG XML/public-out一致、固定mask/alpha故障4件と復旧、HEAD/tree/clean/source/script/PNG hashを記録し全結果をconsoleにも出す。内部ZIP取得が403で阻止される状態でも、実検査の数値を正規job logから監査できる。

portable原本は子エージェントが作成し、SHA256 `5aefe861ea147e05b28a6a0a665d5467d387d1ff519f528059adba3fce4ad7ce` を変更せず採用。Chromium375の事前校正ではpositive8・故障4拒否・復旧成功。校正中の主harness変更によるdirtyを明示し、正式clean WebKit実行とは区別する。校正の試作でraster用にhandleを隠してからpointer操作して停止した記録も原本を保全した。新しい最終CIと独立評価はPR #66へ記録する。
