# Stage 2A 独立レビュー（2026-10-26 JST）

## 範囲と独立性
実装非担当のレビュー担当が、`WaapiGameObservation.tsx`、`WaapiSampleGallery.tsx` の差分、追加CSS、README、設計、追加試験を点検した。基準mainは `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。独立した期待値の試験を `tests/waapi-observation-independent.test.tsx` へ追加。ここでの操作試験は jsdom / WAAPI double であり、実ブラウザ・実機・支援技術の検査とは別である。

## 指摘と再確認

### R1 / P3: 再生中stepが前回RAF時刻を基準にする
初回ソースでは、実Animationの時刻より古い `time.current` に±1000/60msを加えていた。独立検証着手時には実装者自己点検によって修正済みだったため、旧計算だけを隔離コピーに戻し、現行と同じ期待値で再現した。

手順: 表示sampleを64msへ進める → native時刻だけ73msへ進む（次のRAF前の入力を表現）→前/後1step。期待は89.6667ms／56.3333ms。旧計算は80.6667ms／47.3333msでどちらも9msずれた。pause対照は73msを保ち成功。旧コピー: 2失敗・1成功、現行: 3成功・0失敗。修正は入力時にnative currentTimeを読んでからseek。表示用RAFの時間を判定の正本にしない。

これは旧mainの不具合ではなく、本変更の開発途中に存在した観察機能の問題。独立レビューが修正を行ったとは表現しない。初回隔離ハーネスはJSX設定欠落でReact未定義だったが、設定を合わせて再実行してから上記の差を確認した。ハーネスの失敗を製品不具合へ計上しない。

### R2 / P3: 観察位置の保持範囲を設計で広く記載
当初設計はunmount・モード切替も「戻ると保持時間」と読める記述だった。実装はモード閉鎖で観察だけunmountし、次回0msから停止。本体はモード往復で保持する。これは仕様上許容する方針だが、説明と実装の一致が必要。

README・設計を訂正し、画面外/visibility復帰は位置保持、モード終了・閉室・検索除去後の新観察は0msと区別。通常本体のモード往復保持と、閉室による従来再初期化も区別した。該当文章と既存のmode exit/reopen・gallery closure試験を確認済み。

### 実装担当以外の試験担当が検出したready状態
別試験担当がpauseのready解決後もpending表示が残る可能性を指摘。現在はready解決後に実状態を再取得し、世代・Animation identityで古い解決を拒否する。独立レビューでもソースとpending/旧ready試験を確認する。readyは取消時のrejectionを完了へ格上げせず、finished Promiseはゲーム状態を更新しない。

### ブラウザ担当によるP3: 狭幅・文字200%の横超過
実測担当の初回JSONを独立に読み、Chromiumのrange入力UA余白、およびWebKit 26.0の長いselect optionに起因するscrollWidth 359px / clientWidth 310pxを確認。これは全館タイトルの既存負債とは別の本変更内の問題。input margin:0、短いoption名、説明の折返し段落への移動をソースで確認し、option値やeasing計算を変更せず教材説明を保持している。短名選択肢を含むbuildの最終6条件JSONを確認し、対象の文字200%/両テーマで横超過検査成功を確認。初回失敗は維持し、ライブDOMの診断だけで解消扱いしていない。

### R3 / P3: 終端付近の実native時刻と観察位置の区別
WebKit765でduration220msに対してnative currentTime224ms、表示位置220msを実測担当が観測。clampによる範囲内位置は妥当だが、「native時間を読む」説明の精度を高めるため、範囲内の観察位置と実native currentTimeを別表示することを独立レビューで推奨。nullも0とせず未取得と表記する。独立追加2試験は変更前に失敗（既存3成功）。変更後はoutput対象を明示し、同名説明が複数あることによる試験selectorの曖昧性だけを修正。値の期待は緩めない。

### R4 / P3: pause pending中の時刻進行と停止位置固定
実測担当のWebKit390では入力直前19/135/165msからpauseのready後174/158/207msへ進むケースを観測。1試行は入力時点で既に220msだったため、中間pauseの成功へ数えない。native APIの標準挙動をブラウザ不具合と断定せず、観察UI仕様として入力時native時刻をcapture→pause→同値currentTime設定で位置を固定する。nullは代入しない。独立double試験でpause処理中73→120msに進む状況を置き、修正前の73ms保持契約失敗を記録した。このdoubleは実ブラウザ時間進行そのものの再現ではなく、入力時刻固定のnegative control。修正後は同じ契約試験成功。native最終確認は別記する。

### R5 / P3: native終端超過時のbackstep基準
実装者自己点検で、native224ms・観察位置220msから戻る1stepが207.333msとなり、観察終端から1stepの203.333msに一致しない問題を検出。独立レビューも「入力時native読取→0〜durationへ正規化→delta」が表示契約に合うと確認。修正前sourceの隔離コピーに同一7試験を適用し6成功1失敗（4ms差）、現行は7成功0失敗。修正後の旧source negative controlであり、ライブ修正前に実行したとは称さない。隔離初回は追加dataファイル不足でテスト収集できず、補完後の実行を上記結果とした。

## 状態保護の判断
- 観察componentに得点・選択のsetterを渡さず、DOMも独立。本体はhiddenのままマウントを保持する。
- Coinの加点は通常COLLECT経路に限る。観察seek/完了は加点経路を持たない。
- Menu通常位置は選択行所属と実矩形FLIPを保持。観察は別のCONTINUE→SETTINGSシナリオ。
- native時間を正本とし、RAFは読取。停止・再作成・unmountは世代更新で旧RAF/readyを拒否。
- 観察fill:bothは専用DOMの表示保持のみ。通常Menuのno-fillやゲーム完了契約を変更しない。
- Reduced motionのONは取消・保持時間の停止previewへ再構成、OFFだけで再開しない。
- 追加wrapperはdisplay:contentsにより既存レイアウトのgrid参加を維持。対象外の展示定義やExpanded Game本体には変更なし。197全操作の検証と同義ではない。

## 実行記録
独立追加3試験は成功。観察本試験・独立3試験・Stage1 Menu/Coin・Stage1 Expandedを同じコマンドで再実行し、4ファイル61試験成功、失敗0・skip0（2026-10-26 05:08 JST、13.00秒）。ログは `waapi-stage2a-independent-tests.log`。以前の部分実行は重複のため加算しない。`git diff --check` も問題なし。追加のnative実値/null・入力時pause固定・終端backstepを含む独立7試験は2026-10-26 05:51 JSTに再実行し7成功。旧61試験と重複するため加算しない。ブラウザ担当の最終実測証拠は下記のとおり独立に読解した。

## 未検証・判定の限界
独立担当自身によるnativeブラウザ操作、実機Safari、VoiceOver、実OS動き低減/文字拡大は未実施。動的描画・座標は実ブラウザ担当の実測結果と分ける。全館タイトルCSS200%横超過とtypewriter ID重複は既存負債。現在ソース/試験の範囲でP0〜P2阻害指摘なし。R1/R2は修正後確認済みだが、全197展示や将来環境の安全保証ではない。


## 最終候補の証拠確認（native実行担当の結果を独立に読解）
`waapi-stage2a-browser-evidence/final-six.json` はChromium141.0.7390.37 / WebKit26.0 × 375/390/765、各8群。5条件PASS、WebKit390はCoin自然再生の途中pause入力が終端後となった経路だけPARTIALで、全経路成功とは表現しない。native currentTime/位相/取消/得点分離・選択保持・CSS200%・両テーマ等の実測を、jsdom doubleとは区別した。このJSONは最後のtoggle CSS変更前のロジック版であり、最終CSS版は別検証で対応を記す。

旧主要5ゲームは6条件×9群54群、pageerror0。全館タイトルCSS200%のモバイル横超過は既存PARTIAL。Stage1は6条件それぞれ5群成功証跡があるが、WebKit765 Battleの前試行空AssertionErrorは診断付き同条件で再現せず根因未特定として残す。既定並列unit timeoutも逐次成功によって解消と断定しない。

最終ソース候補での全checkはNode49＋Vitest122＝171成功、既存134＋新規37（観察30＋独立7）。独立担当は自身の7件実行と他担当全件ログ読解を区別する。実GitHub Actions、最終commit/tree照合は提出担当の後続確認であり、ローカル成功をCI成功としない。

総合の独立推奨はPARTIAL。確認済み観察経路の機能はPASS範囲を持つが、未到達経路・既定並列timeout・旧Battle試行の根因未確定を開示して人間がDraftで判断する。P0〜P2の確認済み未解消阻害問題は現在ない。第2B/HP比較をこの結果で自動開始しない。


WebKit390 Coin自然pauseの補足native試行では107/121/105msで入力し、ready後も同値保持を確認した（実測担当JSON参照）。同じ補足の1回は650ms終端到達後だったため未到達として残す。補足成功は元の6条件試行のPARTIALを消去・書換えしない。


## 最終CSS版の確認とレビュー確定（2026-10-26 06:07 JST）
`final-style-six.json`を読み、Chromium/WebKit×3幅の全6条件PASSを確認した。toggleは従来UA33pxから共通40pxスタイルへ変更、全12対象で実Tab移動によるfocus-visibleと3px outline、Space/Enter/touch・通常状態保全・CSS200%を確認。P3 UI一貫性指摘はこの範囲で解消。`waapiDetailsToggle`のlayout classは流用せず、既存button/focus selectorへ追加するだけで副作用を限定した。

JSON間の観察component SHA-256 `443ef345a3389ec748d94d3a546c3c428071760773544bb0844895030c4e1b27` は同一。CSS/static indexは異なるため、全native操作試験は直前ロジック版、最終CSS版はfocused12群という実施範囲を維持する。実行者の報告だけでなくJSONのstatus・対象hash・経路制約を確認したが、独立担当自身がnativeブラウザを操作したとは表現しない。

独立レビュー確定: **PARTIAL、確認済みP0〜P2未解消阻害なし**。開発中P3は修正後の試験/実測により確認、旧timeout/Battle試行の原因未特定・未検証環境を残す。Draft提出は可能とするが、マージ権限や本番公開判断を代行しない。
