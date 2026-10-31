# 第4期A：実装・検証記録

2026-11-01 JST / Issue #43 / branch `feat/practical-ui-phase4a`。
基準main `2de159a9a7534c8af32c8ebcda6c247947b9057c`、PR #42 mergedをGitHub APIで確認。専用cloneに既存未commit変更なし。Calculator Memoは使用せず。通常sandbox gitのDNS失敗後、承認された通常git cloneにて取得。npm初回は証明書鎖で失敗、OS証明書ストアを有効にしてTLS検証を維持した再取得が成功。依存版・lockfile変更なし。Node24.20.0 / Windows、CIはNode22 / Ubuntu。

## 登録と重複

`inventory-main.json` は基準commitをgit showで読み出した実測227、`inventory.json` は今回233。内訳：トップ9、DOS8、Linux5、消えたOS18、Apple13、Mac18、Cursor8、Flash54、DOM17、WAAPI47、第1期6、第2期12、第3期12、第4期A6。OS/カテゴリ見出しは重複加算なし。13室。既存のplayer/登録データは保持。PracticalRoomの共通検索・説明・開閉をphase別に再利用し、選択中の1部品だけmountする。既存ブラウザharnessはphase3室へlocatorを限定しただけで、12展示の期待値・操作・3幅を維持。館内件数の既存テストは実登録に合わせ12/227→13/233へ更新。

比較の正本は [phase4a-inventory.md](phase4a-inventory.md)。6部品とも既存効果と原理の一部は共通だが、新しい状態管理・操作契約を持つ。歴史的初出/発明者はUNKNOWN、独自制作、外部素材/ソース転載なし。

## 実装方式と完成状態

| 部品 | 操作・主要状態 | 動き・取消・Reset |
|---|---|---|
| Toast Stack | 情報/成功/注意、追加、最大4、個別/全解除、独立5秒期限 | 新着/退出とFLIP再配置。有限Animation、終了後ghost除去。Resetはserial/通知/時計を破棄 |
| Undo Snackbar | 架空3項目、削除保留、元位置Undo、5秒確定、即確定 | 次削除は前を確定し最後だけUndo。復元入場/隣接再配置、Undoへfocus・復元元へfocus返却 |
| Inline Validation | 未入力/編集中/変換中/正常/不正、Enter/blur/確認 | 2〜12 Unicode code points、空白不可。IME中は確定抑制、メッセージgrid高さ補間。入力nodeを維持 |
| Search Suggestions | ローカル8候補、先頭一致優先、なし、上下/Enter/Escape/click/tap | 候補FLIP入替。入力focusとactive descendant、同期計算のため古い応答なし |
| Sliding Tabs | 異幅3タブ、矢印/Home/End、roving tabindex、1 panel | ResizeObserverで位置/幅測定、単一帯のCSS補間。内容は即確定しcallbackで変更しない |
| Animated Accordion | 異なる内容量3節、単一/複数、途中反転、見出し移動 | 現在の実描画高さから実内容高さへWAAPI。現在/目標pxを有限RAFで表示。反転/低減/破棄は旧callbackを失効 |

期限は観察中の有効時間。手動停止/画面外/非表示でtimer解除、復帰で非表示時間を加算しない。動き低減は移動だけ抑え機能期限を維持。低減切替と閉室ではアニメーションをcancel、ghost/RAF/Observer/intervalをcleanup。Resetは世代keyでplayerを新規mountし、旧完了処理の書戻し経路をなくす。テキスト/選択/ARIAはReactの確定状態から描画し、装飾の完了callbackで操作結果を確定しない。

## 自己検証（独立レビューとは別）

最初のunit28件は21成功/7失敗。3件は非WAAPI環境で退出ghostが残った実装不備、1件は曖昧なstatus locator、3件は曖昧なcombobox locator。fallback ghostを作らず即時削除、locatorは意味を持つ対象へ限定。次26/28では、input focus復帰が候補を再展開する境界と、selectのoptionも数える試験の曖昧性を検出。focus→閉じるの順へ修正、listbox内optionを指定。最終新規unit28/28、skip0。raw JSONはevidence内に保持。初期lintはhookの返却objectにrefを含むことによるrefs検出、返値を分解してrender中のref参照を避ける既存方式へ修正。検査無効化なし。

初回実Chromium390は3/6成功後に検索候補期待の漏れで停止。`at`はMotion Atlas/Search AtlasだけでなくAnimation Basicsにも一致する。模擬データとフィルター意味を変えず、試験期待を完全な3件へ是正。再実行6/6成功、実DOM/PNG差/タブ中間位置/Accordion中間高さ・反転を確認。偶然の成功を選別せず全実行JSON・失敗PNGを保持。

その後、実WebKit375でタップした検索候補が決定されず、入力がGuideのままになるP2を検出（`browser-full`：Chromium24＋WebKit3＝27/48成功後に停止）。最小条件はWebKitのtouch context、Guideを入力、Toast Guideをtap。期待は入力Toast Guide/候補close、実測はGuide/未決定。preventDefaultしたpointerdown後の互換click生成に依存していた操作経路を修正：押下対象/idを保持し、同一候補内のpointerupで決定。pointercancel/領域外は取消、click/keyboard経路も保持。`search-touch-green` は同じharness期待でWebKit/Chromium×375/390の4/4成功。負対照用の局所revert patchも保存（再実行済みとは称さない）。

focusが別のcontrolにある状態で入力確認し、入力へ戻すと再び編集中になる境界も是正。focusだけでは編集中にせず、実入力の変更で編集へ遷移。閉じたmessageをaria-describedbyから外す。通知の個別解除/期限、Undo期限でfocus対象が消える際は、元の領域内にfocusがあった場合だけ永続領域へ退避。外のcontrolからfocusを奪わない。追加4件を含むunit32/32成功。無変位FLIPは起動せず、余分な有限Animationを省略。

全館checkの初回はNode49成功、Vitest174/175成功・既存gallery1件timeout。次回はNode49成功、Vitest174/177成功・既存gallery/HP/Menuの3件5000ms timeout。両方の失敗原本を保持。別worktree mainでは全147成功、PRで同じgallery単独11/11、HP/Menu単独9/9成功。WAAPIの製品/試験コードは変更しておらず、実ブラウザとの同時実行で資源競合が疑われるが、mainで同じ失敗は再現せず根因UNKNOWN。今回回帰でも既存flakyでもあると断定しない。timeout拡大/skip/期待緩和なし。追加suiteは基準mainの既存25ファイル147件の同じコマンドの後に別vitest invocationとして実行し、既存群・追加群の成績を区別する。これだけで原因解決したとは称さない。

mainの既定check全体はnode_modules junctionがTurbopackのfilesystem root境界により拒否され、buildでBLOCKED。これはmainの製品失敗ではない。mainのVitest全147件は同じNode/依存版/既定timeoutで別途実行できた。Windows初回ログの一部はnative出力の文字コード解釈で日本語が崩れているため、後続ではUTF-8を明示。原本を都合よく書換えず保持する。

`browser-final` というローカルの旧試行名は提出HEADの意味ではない。同試行は30/48成功後、WebKit390の容量検査で3≠4となり停止。保存画面に「1件が期限終了」、各残秒1/2/4とあり、5回の操作中に既存通知の5秒期限が実際に切れていた。製品の上限違反ではない。容量/種類/個別解除は展示の停止機能で時計を固定して厳密4件を検査し、再生後の再配置は実座標のold/mid/newで別に検査、期限は別の新規通知で5秒のまま検査する。上限期待を3へ下げる・寿命延長・条件削減はしていない。

07:57 JST、最新ソースの `check-submission.log`：lint/type/build/Node49、既存Vitest147、新規32の全228件成功、failure0/skip0/exit0。ブラウザを同時実行せず、新規suiteは既存群の後に実行した。前の失敗を上書きせず保持し、資源競合仮説を根因確定や既存全timeout解決の主張へ昇格しない。

`browser-submission` は最新製品でChromium24/24成功後、WebKit375の再配置120ms一点観測で停止（全体24/48）。中間値そのものはこの旧試行では保存不足なのでUNKNOWN。診断では外部IPCの一点待機をブラウザ内RAFの連続計測へ置換し、教材の既存「ゆっくり1600ms」を選んで同じ中間位置条件を検査。`toast-frame-diagnostic` のWebKit375/390は2/2成功。各234px→117pxの間に12フレームの実中間座標を取得し、先頭描画時刻は105〜108ms、次は225〜228msだった。120ms一点で初期位置を読む危険は実測から支持されるが、OSスケジューラの根因まで特定していない。中間位置条件は削除せず、全frameの時刻/座標を結果JSONへ保存する。最終CIはこの連続計測を全条件に適用する。

ローカルは全48成功を宣言しない。最終HEAD CIの全48と旧72条件（両engine各36）の結果をPR本文・通常コメントへ追記する。未完了をPASSとしない。ソースがdirtyなローカル実行は結果JSONのdirty=trueに明示し、最終CIの固定HEAD実行と混同しない。`browser-final`/`browser-submission`等はローカルの試行名で、最終提出HEADを表すものではない。ハーネス/証拠生成scriptの追加lintは成功。

## 依存警告：未解決

2026-11-01 JSTのnpm auditは29件（critical3/high8/moderate17/low1）、exit1。原本 `phase4a-evidence/audit.json`。Next16.2.6/Vitest3.2.4/Tinypool1.1.1が影響範囲。Windows Next server RCEは16.3.3、AVIF16.3.3、next/og16.3.6、SVG Image/use cache16.4.1、Vitest UI3.2.6（4系4.1.0）、Tinypool worker2.1.1/run2.1.2に修正。npm auditのNext集約候補は16.4.3。他のmoderate/highも原本へ保存し、これらの版だけで全件解消を断定しない。

公式本文確認先（2026-11-01 JST）：
- https://github.com/advisories/GHSA-p293-qw3h-jr36
- https://github.com/advisories/GHSA-2xp9-vwfh-vxw4
- https://github.com/advisories/GHSA-vcvr-r3jv-pc5j
- https://github.com/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/advisories/GHSA-673q-mjm6-r5xr
- https://github.com/advisories/GHSA-5xrq-8626-4rwp
- https://github.com/advisories/GHSA-5gmw-xhrv-c9v3
- https://github.com/advisories/GHSA-85c8-ppgw-ccpr

repoはstatic export + Pages out配信。今回Next server/dev、Vitest UI/APIは起動せず、127.0.0.1の静的配信だけを使用。appにnext/og/ImageResponse/next/image/use cacheの利用なし。Nextの該当server APIをPagesで公開しない。Vitest runはTinypoolを使用するがUI/Browser Modeなし。先行prototype pollution到達、他の開発serverの外部公開はUNKNOWN。実悪用再現NOT_TESTED。静的配信だから依存全体無害と判定せず、[別Issue #44](https://github.com/tetsujisugimori-coder/Loading-museum/issues/44)で優先更新・互換性検証を行う。

## 制限と引継ぎ

独立レビュー未実施、実iPhone Safari/実Touch/OS日本語IME/VoiceOver/文字拡大はUNVERIFIED。Playwrightのtapと合成compositionイベントは実機検証の代用ではない。全館227展示の全操作・全パラメータは今回対象外。Undoは架空データの最後1操作だけで永続履歴ではない。期限時のfocus退避はunitで確認したが実支援技術評価は残る。保存データ・ネットワーク・承認を扱う実用本番部品として無条件の安全性保証をしない。

第4期Bは別6展示の採用・重複調査から開始。今回の分類・期限/取消境界・finite Animation cleanup・全幅ブラウザharnessを再利用できる。新規6展示や空枠は追加しない。main/公開workflowは変更せず、Draftを維持して人間の判断へ返す。
