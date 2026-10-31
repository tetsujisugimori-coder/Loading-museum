# 第3期 実用UI部品

Issue #41。開始main 3895d6afd900a2e9458c1f04a431963944cea8d8。
2026-10-31 JST。Windows中断後、既存Issueを再利用し独立クラウドcloneで継続。先行6件を保存してから後半6件へ進む。PR #36の差分は取り込まない。

## 受入範囲

- 独立した12用途・状態遷移。旧215展示のファイル・ID・登録を保持。
- 主要入力で描画が変化する。数値ラベルだけの変化は描画PASSにしない。
- 停止/再開/Reset、取消/連打、閉室・切替・画面外・非表示・動き低減の有限処理。
- Chromium 375/390pxと代表desktop、対応可能ならWebKit。実機iPhone/VoiceOver/OS文字拡大は利用不能なら未検証。
- 既存checkを弱めない。WAAPI timeout再発は過去記録と分離、有限切り分け。
- 原典コード・画像・企業アイコンはコピーせず独自HTML/CSS/SVG。出典は技術・歴史参考でライセンス譲渡ではない。

## 先行6件

| ID | 実用部品 | 主確認 | 初期状態 |
|---|---|---|---|
| steps | 工程進捗 | 工程数・次・失敗・同工程再開 | NOT_RUN |
| buffer | 先読み/再生二層 | 取得と再生を別々に変更・上限 | NOT_RUN |
| refresh | Pull to Refresh | 閾値以下取消・超過更新・途中取消・ボタン代替 | NOT_RUN |
| spotlight | 現在位置の照明 | pointer/矢印・半径 | NOT_RUN |
| magnetic | 対象吸着 | 距離/強さ/復元速度・pointer/keyboard | NOT_RUN |
| sort | 挿入予告付き並替 | ghost・drop・cancel・button代替 | NOT_RUN |

後半6は先行checkpoint後に追記。全条件の結果は実施後に記録する。

## A checkpoint（2026-10-31 13:01 JST）

6件は実装済み。全体215件から221件へ追加（最終12件では227件予定）。Chromium 390px実ブラウザで6件の操作前後の描画差・横はみ出しなし・Reset・閉室unmount・pageerrorなしを確認。画像は `phase3-evidence/checkpoint-a/`。工程の完了/失敗/再開、二層帯90/60、更新中から完了、照明移動、吸着変位、並替取消と確定を確認。帯と並替の画像を目視確認。全入力/全幅/実タッチを確認した意味ではない。

新規DOMモック試験16/16成功。lint・型検査・通常build成功。最初の検査失敗は、共通Rangeでlabel内outputが先行しsliderのアクセシブル名が空だった製品不具合。明示aria-labelで修正しRED→GREEN。390pxのrange既定marginによる2px横溢れも修正し実ブラウザ再確認。初回/二回目失敗JSONを保存し成功で上書きしない。

実ブラウザ結果のHEAD欄は変更前base、dirty=true。添付 `source-sha256.txt` のソース内容が検証対象であり、過去baseそのものが成功したとは扱わない。checkpointは後半実装前の途中成果。既定全体試験、375px/desktop/WebKit、独立レビュー、実iPhone/VoiceOverはこの段階では未完了。

Magneticは停止/画面外/非表示時にCSS補間を取消し論理ターゲット位置へ即時反映する。途中補間座標保持ではない制約。先読み帯は連続した単一区間の模擬で、実メディアの非連続buffered ranges全体を再現しない。

### A 独立静的レビューと是正
独立担当がRefreshの完了後に動き低減を解除すると旧loadingが復活するP2を発見。完了を`done`終端状態に固定。動的matchMedia切替の修正前7/8→修正後8/8、部屋9件と合計17/17成功。修正後buildおよびChromium390px6件も再成功。buffer技術表記をSVGからCSSへ訂正。複数指のpointerId同時操作は未検証P3として残す（単一pointer・ボタン代替確認）。独立点検は静的であり実機独立再現ではない。

## 第3期Bと最終受入範囲

先行6件は2026-10-31 13:08 JSTにリモート `50c15a6ed1bb8a112d30d799816415e3eff24aee` へ保存し、fetchしたHEAD/treeの一致を確認してから後半6件を実装した。ローカル元commit `13d8d9a` と認可API作成commitは著者・日時等によりIDが異なるが、tree `d4e080898c1dc68fa1a919195d5ea45b9b3f441d` は完全一致。元commitはlocal checkpoint枝に保持。単一Draft PR #42、Issue #41。

| ID | 追加した部品・違い | Chromium390pxで実際に見えた代表操作 | 完成状態 |
|---|---|---|---|
| steps | 完了/現在/失敗を分ける工程状態 | 次工程・失敗・同工程再開でSVGの状態が変化 | COMPLETE（限定受入） |
| buffer | 取得と再生の二層進捗 | 90%/60%の異なる帯、利用量を取得量以下に制限 | COMPLETE（限定受入） |
| refresh | 引張閾値による更新開始 | マウスdrag25pxは取消、85pxは回転後に完了表示 | COMPLETE（限定受入） |
| spotlight | 軌跡ではなく現在位置を照らす | 矢印キーで照明中心の描画が移動 | COMPLETE（限定受入） |
| magnetic | 対象位置の有限吸着 | キー入力でボタンが中心から変位 | COMPLETE（限定受入） |
| sort | 挿入予告と順序確定 | ボタン取消で順序保持、マウスdropでALPHA/BETA順序変更 | COMPLETE（限定受入） |
| hold | 長押し進捗と早離し取消 | 短押し未確定、長押し中に帯充填、離して模擬確定 | COMPLETE（限定受入） |
| elastic-button | 押下縮小と減衰復元 | Space押下で縮小/移動、解放後に元transformへ復帰 | COMPLETE（限定受入） |
| state-button | 処理状態・結果・取消 | 取消後旧結果なし、失敗結果がボタンへ表示 | COMPLETE（限定受入） |
| stagger | 実用一覧の時間差と読順 | 最初/最後のカードの透明度が異なり、最後は全項目表示 | COMPLETE（限定受入） |
| shared | 同一カードの一覧/詳細間補間 | 途中取消で幅38%、詳細完了で幅80%へ拡張 | COMPLETE（限定受入） |
| crossfade | 二つの内容状態・境界補間 | 昼夜が途中で重なり、角丸/寸法が変化、最後は夜側へ | COMPLETE（限定受入） |

COMPLETEは上記代表経路と単体回帰の有限な受入範囲。全パラメータ・全端末・実機アクセシビリティを完全検証した意味ではない。昔の同原理を新発明とせず、差替・歴史・出典・権利境界は `phase3-inventory.md`。原典コード・画像・ロゴ追加なし、新アプリ依存なし。

### 検証と独立点検

- 既定`npm run check`：lint、型検査、静的build、Node 49/49、Vitest 147/147（新規30件を含む）成功。既存WAAPIのtimeoutは本クラウド実行では再発しなかった。旧HEADの失敗を解消済みに置換せず、原因UNKNOWNは維持。
- 静的展示件数の期待値だけを215→227、11室→12室へ更新。旧展示のID・試験条件は削除せず、既存製品ファイル変更はpageへの追加登録のみ。
- 共通runtimeのモックで停止/再開の位相保持、画面外・非表示・低減停止、Reset、observer/listener/RAF解除を確認。これはブラウザ描画の成功の代用ではない。
- Bの独立静的点検で製品P1/P2未検出。ブラウザharnessの0件空回り・固有操作なしでの偽PASSという検証P2を指摘。最終12名称集合と固有操作実行必須を追加し、空集合/空操作を実際のguardが拒否する負試験も成功。
- Crossfade/Sharedの透明内容を読み上げ対象から切替、淡色ボタンと白字のCSS競合を局所是正。独立再点検PASS。独立担当は実ブラウザ試験を再実行していない。
- ローカルWebKit起動はhostの7ライブラリ欠落（gtk4、graphene、woff2dec、harfbuzz-icu、hyphen、manette、GLESv2）でBLOCKED。OS変更や安全フラグ追加はせず、PR CIのUbuntu＋公式`install --with-deps`へ分離。
- 既存mainのCIはPages配信のみ。新しいPR専用CIはcontents:readでHEAD固定、全体checkとChromium/WebKitを独立jobにし、失敗を伝播・証拠を回収する。Pagesの公開jobやmain設定は変更しない。

### 残件・未検証

- 実iPhone Safari、実タッチ、VoiceOver、OS文字拡大は未検証。`hasTouch`/tapは模擬入力であり実機合格ではない。
- Aの複数指同時操作はpointerId管理なしのP3留保。B長押しはprimary/pointerId照合・capture喪失取消あり。
- Magnetic停止/非表示時は補間途中座標を保持せず論理ターゲットへ即時移動するP3。通常の有限吸着体験を妨げる重大問題とは判断しない。
- 長押しは通常時に有効描画時間、低減時はrelease時の実経過時間を使う。実破壊操作や認証の承認機構ではない。
- すべての設定組合せ、極端な低速端末、全館全操作の実画面巡回は未実施。既存展示は登録/ソース保持と既定回帰試験を根拠とする。

### 最終ローカル実ブラウザ
2026-10-31 13:14–13:16 JST、Playwright1.56.1 / Chromium141.0.7390.37で390・375・1280pxの各12件＝36ケース成功。各caseは固有操作・描画差・横溢れなし・Resetを検査。各幅で工程の画面外停止、Refresh低減中完了→低減解除後も完了保持、Shared途中停止時の幅保持→再生完了→Reset、閉室unmount、pageerrorなしを確認。375/390のResetはtap模擬。代表14PNGと全36結果を `phase3-evidence/final-local/` に保存。HoldとStateの最終色を画像で目視確認。結果JSONのHEADはA checkpoint＋dirty変更であり、最終ソース同定は同ディレクトリのSHA-256一覧による。
