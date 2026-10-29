# WAAPI Stage 2A: Menu / Coin 観察モード

## 着手・実装前の設計判断（2026-10-26 JST）
main `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。GitHubで #28/#32/#34 merged を再確認。同目的の Issue #35 を再利用し、依頼本文を変更しない。open PRなし。既存作業を削除・stashせず独立clean cloneを使用。AGENTS.mdはリポジトリ内にない。README、LOG、Stage1設計/独立レビュー/実測記録、package・workflowを参照。Pages workflowは公開用で起動しない。

第一希望を採用: ゲーム本体をマウントしたまま隠し、別DOMの観察専用プレビューだけをWAAPIで制御する。本体の選択・得点・獲得refは不変。観察コンポーネントはゲームの状態更新関数を受け取らない。2展示限定の共通controllerを使用し、他20ゲームの基盤を変更しない。

次善策の本体Animation共有は、CoinのfillとMenuの対象行所属、inactive取消・通常操作の所有権が混ざるため不採用。DOMを少し重複させる妥協で、状態と演出の境界を明確にする。

観察時間の正本はnative Animation.currentTime。pause/seekはそのAnimationを操作し、RAFは表示を読むだけ。1000/60msは仮想刻みで実際の表示Hzではない。観察だけfill:bothで両端を保持し、通常Menuのfill:none契約を変えない。終了後もseek可能。native未対応は操作不能を明記し、模擬成功を表示しない。

Menuは独立CONTINUE→SETTINGSシナリオ。SETTINGSの子に照準を置き実矩形差FLIP、linearとease-outを比較する。Coinは既存キーフレームを再利用し独立のゴール矩形から移動距離を算出、得点APIを持たない。resize/文字寸法変更は同じ時間位置で再作成し停止、勝手に再開しない。

ownerは観察コンポーネント。unmount/非表示/画面外/モード切替でcancel・RAF停止。画面外・タブ非表示から戻ると保持時間のpaused previewのみ再作成。モードを閉じる・閉室・検索で除去する場合は観察を破棄し、次に開く観察は0msで停止する（本体はモード往復では保持、閉室unmountは従来の再初期化）。Reduced motionでは連続playを許さず手動seek/stepで学習。再作成・停止は世代guardで旧RAFの更新を拒否。完了Promiseはゲームにもcontrollerにも状態更新を行わない。

## 検証予定と保証境界
既存check/build baselineと同一回帰、観察新規試験、Chromium/WebKit×375/390/765、CSS200%、media軽減、独立レビューを実施して追記する。全197展示全操作・実機Safari・VoiceOver・実OS設定の保証には拡張しない。既存全館タイトル200%横超過/typewriter ID重複は別負債。Stage2B/HP比較、展示追加、公開は範囲外。

## 実装中の独立検証・訂正
- 非同期pause確定後の `ready` 再読取を世代＋Animation identityで保護。呼出しだけを省いた局所変異で同一試験1件失敗→現行成功。これは新機能のnegative controlで、旧mainの不具合を後付け再現した意味ではない。
- RAF表示値からstepすると入力時点の実時刻からずれるため、stepボタンはnative currentTimeをその場で読み±1000/60msを適用。独立担当が旧方式を隔離コピーで復元し進む/戻る2失敗（9ms差）→現行同一3試験成功を確認。
- 文書の保持範囲を訂正: offscreen/visibilityは保持時間、モード終了/閉室/検索除去は観察破棄、次の観察は0ms。ゲーム本体のmode往復の保持とは別。
- Chromium390でrangeのUA marginにより観察section310pxに対しscrollWidth312pxを実測。観察input/selectにmargin:0とborder-boxを限定適用。許容値を緩めず再検証する。

## baseline履歴
既存mainのcheckはlint/type/build/Node49成功、Vitest81成功4timeout。失敗は既存galleryの5秒上限（並行buildがあったが因果は未確定）。同じ未変更gallery11件を上限変更せず再実行し11成功。初回ログを保存し、成功で失敗履歴を置換しない。初期npm ciは標準cacheパスENOENT、/tmp cache指定で依存lockを変更せず成功。

## 最終検証中の観測履歴
- 最初の統合check: lint/type/build/Node49成功、Vitest117成功・既存galleryの1件が5秒timeout。初回はブラウザ検証も進行していたが、負荷だけが原因と断定しない。条件・上限・対象を変更せず再実行する。初回ログ `waapi-stage2a-check-first.log` を保持。
- WebKit390 CSS文字200%ではnative selectの選択肢内の長い説明により、label/sectionのscrollWidth359px・clientWidth310pxを観測（外接矩形自体は欄内）。選択肢をease-out/linearの短名にし、意味は折り返せる後続説明へ移動。overflow隠しや許容値緩和ではなく情報配置の修正として再検証する。

## 変更・回帰範囲
本体差分は `GameSamplePreview` のMenu/Coin専用切替・既存state保持と独立preview、局所CSS、テスト登録。`WaapiExpandedPreviews.tsx` と `waapiSamples.ts` は基準mainと同一で、他20ゲームやデータ定義を編集していない。197/47/22の定義・ID/名称/順序は変更しない。追加wrapperは通常時display:contentsで既存カード配置を維持する。これは全197展示の全操作を網羅したという意味ではない。

公開版は本変更を含まない。検証はローカルstatic exportを使用し、公開先操作PASSとは呼ばない。リポジトリの唯一のActionsはmain push/手動公開用Pagesで、PR検証workflowは存在しない。最終HEADへのrun/check有無を確認するが、公開workflowを検証のために起動しない。
- ブラウザ停止後の既定並列check再実行もVitest113成功・5件timeout（既存3/追加2）。全て5000ms上限でassertion内容の相違ではないが、環境負荷だけが原因とは断定しない。`waapi-stage2a-check-second.log` を保存。テスト本体・上限・登録数は変更せず、Vitestが提供する `VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1` を実行環境に指定して全checkを逐次再検証する。既定並列成功と取り違えない。

## native実値表示追補前の全件成功（2026-10-26 05:27 JST）
上記worker数1の環境指定で `npm run check` 成功。lint・型検査・build、Node49件、Vitest118件（12ファイル）の計167成功、失敗0・skip0。既存134件＋観察30件＋独立3件を全て登録・実行。続けて独立した `npm run build` も成功。worker数の限定は同時実行資源だけで、テストの削除/skip/上限延長/期待値変更はない。既定並列の2失敗runと逐次成功を別記する。この時点の実行ログ: `waapi-stage2a-check-serial.log`、`waapi-stage2a-build-before-native-label.log`。この版のhashは `waapi-stage2a-build-manifest-before-native-label.json`。

## 判定方針
総合は **PARTIAL** とする。観察の最終6条件が成功しても、その経路限定のPASSと総合を分ける。既定並列checkのtimeout、既存全館タイトルCSS200横超過、下記不再現の旧Battle試験失敗、未実機・未支援技術・PR CI不存在を消さない。

旧Stage1は最終的に全6条件で各5群の成功を得た。ただしWebKit765の一試行でBattle群に空AssertionErrorがあり、offscreen FIELD/INTERRUPTEDの記録後に失敗。traceback/各段実値を追加した同じassertion・待機時間の再試行は成功し、失敗箇所と根因は未特定。単なる環境制約と断定しない。再発時は保存した診断版で状態/表示/時刻を採取する。旧主要5展示は6条件×9群に機能失敗なし・pageerror0で、モバイルの全館title横超過だけ既存PARTIAL。

## native時刻・一時停止の追加修正
WebKitではduration220msに対しnative currentTime224msを観測。観察位置は安全に0〜durationへ制限する一方、native実値を同じ値だと誤認させないため、結果欄を「観察位置」と「native currentTime（小数2桁）」へ分離した。未解決/nullは未取得と表示する。独立2件で変更前の実値/未取得表示不足を失敗確認。

さらにWebKit390の単独probeでpause入力直前19/135/165ms→呼出し直後同値pending true→ready後174/158/207msを観測。入力時にすでに220msだった試行とは区別する。native pause標準動作自体の不具合とは断定せず、観察仕様として入力時native時刻をcaptureし、pause直後に同じcurrentTimeを設定して保持する。nullには推測値を代入しない。独立の遅延doubleで旧73→120のずれを再現し、修正後73保持を検証。これはnative probeとは別の契約試験。

追加後のfocused36件は独立6件成功、既存観察30件中29成功・media経路1件が5秒timeout（内容のassertion差異ではない）。この失敗も保存し、最終全checkをworker1・同じ上限で再実行する。

## step境界正規化前の全件成功（2026-10-26 05:38 JST）
raw実値表示と入力時pause固定を含む版で、worker数1の同じ環境指定による `npm run check` と独立 `npm run build` が成功。Node49＋Vitest121＝**170成功・0失敗・0skip**。既存134＋新規36（観察30＋独立6）。lint・型検査も成功。この版のログは `waapi-stage2a-check-before-step-boundary.log` / `waapi-stage2a-build-before-step-boundary.log`、SHA-256は `waapi-stage2a-build-manifest-before-step-boundary.json`。過去の並列/部分失敗は別ログで保持する。

## 境界正規化版の全件検証（2026-10-26 05:54 JST、toggle style追補前）
native実値224msに対し観察終端220msのケースでは、backstepは観察位置220を基準に203.333msへ戻す必要がある。入力時nativeを取得する契約は維持し、その値を0〜durationへ正規化してからdeltaを加える。変更直前sourceの隔離コピーに同一7件を適用し、旧6成功1失敗（207.333ms、4ms差）→現7成功を確認。初回隔離ハーネスのdataファイル不足は補完後再試行し、製品失敗へ数えない。

この修正・コード要点のpause例を含む最終版で、worker数1の `npm run check`（lint/型/build/全単体）と独立 `npm run build` が成功。**Node49＋Vitest122＝171成功・失敗0・skip0、既存134＋新規37（観察30＋独立7）**。この版のログは `waapi-stage2a-check-before-toggle-style.log` / `waapi-stage2a-build-before-toggle-style.log`、SHA-256は `waapi-stage2a-build-manifest-before-toggle-style.json`。旧版167/170件のログ/hashは別名で残し対象版を混同しない。

## 最終UI整合と確認版（2026-10-26 06:03 JST）
mode切替buttonが共通button selector外だったため、WebKit390で高さ33px・UA灰色背景を実測。既存のbutton/hover/focus selectorへ `.waapiObservationToggle` を追加する3行だけで、既存40px最小高・配色へ揃えた。別classのwidth/marginは流用せず、ゲーム/観察ロジックを変更しない。

最終style版でworker1の全checkと独立buildを再実行し、**171成功・0失敗・0skip**。最終ログとhashは `waapi-stage2a-check-final.log`、`waapi-stage2a-build-final.log`、`waapi-stage2a-build-manifest.json`。直前の全native6条件はtoggle style追加前であることを明示し、同一のcomponentロジックhashと、最終CSS版のfocused6条件（高さ・フォーカス・mode切替・step・通常状態保持・文字200%）を分けて照合する。最終CSS版で全native時間経路を再実行したとは表現しない。

## ブラウザ最終結果と保証範囲
- ロジック版の [全native6条件](waapi-stage2a-browser-evidence/final-six.json): Chromium141.0.7390.37 / WebKit26.0 × 375/390/765、48群到達・pageerror0。5条件PASS、WK390のCoin自然再生は入力が650ms終端後だった1経路だけPARTIAL。この試行は消さず、[別の補足probe](waapi-stage2a-browser-evidence/loading-webkit-coin-pause-final.json)で107→107、121→121、105→105msの自然中間pause保持を観測（別1回は終端入力）。明示seek325→play→pauseも別経路で成功。
- 最終CSS版の [focused6条件](waapi-stage2a-browser-evidence/final-style-six.json): 全6条件PASS・pageerror0。両対象toggle高さ40px以上、実Tabフォーカス、Space切替、Enterstep、touch切替、通常状態保持、両color media/CSS文字200%の対象横超過なし。初回programmatic focus＋Shiftだけの試験はWebKitのkeyboard modalityを確立できず、実Shift+Tab→Tabへ訂正し再検証（期待outlineは変更しない）。
- [旧主要6条件](waapi-stage2a-browser-evidence/major-regression-six.json)は各9群に機能失敗なし。Match-3連鎖/ドラッグ/Reset、Falling Block落下、HP遅延保護、Inventory、Lock-on、途中media切替を含む。Stage1各5群の成功と、不再現Battle失敗は同フォルダーへ保存。
- [代表Chromium375 Coin](waapi-stage2a-browser-evidence/chromium-375-Coin-text200.png) / [WebKit390 Menu](waapi-stage2a-browser-evidence/webkit-390-Menu-text200.png)は最終CSS200%画面を目視確認。全館タイトルの既存横超過を対象カードの成功へ混ぜない。
- CSS文字倍化・viewport・color/reduced-motion mediaの模擬、実native Animation、Playwrightタッチ入力を確認した。実OS文字拡大/動き低減設定、実機iPhone Safari、VoiceOver、実タブ背景化は未検証。visibilitychangeは合成である。公開版の実操作検証/更新はしていない。

## 提出と次段階
総合PARTIAL、確認した観察経路には限定PASS。既定並列timeoutと旧Battle一度の根因未特定失敗を開示し、Draftで人間の判断を待つ。独立レビューは [専用記録](waapi-stage2a-independent-review.md) を参照。第2B/HP比較は未実装・未着手。この独立DOM/時間制御を次段階へ使う場合も、別途設計・承認と未安定な検査条件の再確認を前提とする。最終commit/tree/実CI有無はPR本文と提出報告へ完全SHAで記録し、自己参照SHAを本文へ捏造しない。

証跡logはコマンド出力を保存し、Vitestのソース行抜粋末尾空白/末尾空行も保持している。そのためlog込みの `git diff --check` は空白警告を出す。logを除く実装・試験・文書差分のcheckは成功し、検査を通すために実行結果の行を削除していない。
