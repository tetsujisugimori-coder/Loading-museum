# Stage 2A 追加検証・証拠の独立最終レビュー

確認: 2026-10-26 JST。検証基準 `406bdbddada5e0783d6b9ce654ceea9788a19040`。

## 独立性と判定

実装非担当のsourceレビュー担当が、Issue35、製品差分、追加診断script、独立コンポーネント試験、統括担当によるnative JSON、並列測定資料、READMEを別々に点検した。独立コンポーネント診断4件はこの担当が実行。native browserは統括担当の実測を証拠として読解したもので、この担当が全操作を再実行した意味ではない。製品コード改修・commit・pushはこの担当では行っていない。

**対象版の総合品質判定PARTIAL、マージ推奨NO、Stage2Bへは未移行。** N2の再現済み未修正P2と品質ゲートの再現性不足が残る。追加検証で機能を修復したわけではない。確認した経路の限定PASSと全館/全経路を分ける。

## 指摘と評価

| ID | 重要度 | 状態・結論 |
|---|---|---|
| N2 | P2 | 観察後の通常Coin低減ON取消漏れ。double/native双方で再現、source原因特定、未修正。マージ阻害 |
| Q1 | P2品質ゲート | 既定check3回中2失敗、worker1も失敗。同じ5000ms timeout。原因未確定で、製品機能不良の確定とは別 |
| N1 | P3 | 通常Coin自動デモの持続抑止はIssue35と整合。READMEへ利用説明を追記したので説明不足は改善。製品仕様変更なし |
| B1 | P3検査設計 | Battle固定時刻read競合と整合する証拠。旧空Assertionの根因は依然未確定。永久ENCOUNTERを再現したとは言わない |
| M1 | P3調査 | WK390通常Menuの画面外100ms検査で残留を1回観測。その後のlive Animationを伴う2回はIO false後100ms内にidle。元失敗の根因不明を維持 |

N2は `normal-mode-review.md` に手順・期待・実測・source根拠・最小案を記載。通常Replay/COLLECTという利用者操作とmedia模擬切替だけでrunning残留を観測したことからP2とする。旧Combatの診断用paused残留P3より強い通常経路の退行証拠だが、得点不変・有限650ms演出である限定を維持する。paused診断は別経路であり通常Coinにpause UIがあるとは説明しない。

## 数値・版の照合

`build-manifest.json` の4ファイルのSHA-256を現物から再計算して一致を確認した。

- `WaapiGameObservation.tsx`: `443ef345a3389ec748d94d3a546c3c428071760773544bb0844895030c4e1b27`
- `WaapiSampleGallery.tsx`: `9069e4ae3e13646cfc63f02a02b2336742cc0ab8f2a7a9a4a5bc48d11ccf83d8`
- `app/globals.css`: `7907ac4cb2aa05e0639617728a7b79e9e14da00e75724f97c4fcab7fbc9e7a68`
- `out/index.html`: `95c274ccc1f91f5af60c04a5bac3f727da8c165bb74bdec97c9516043282d01b`

`final-six.json` の6条件、`final-webkit-retry.json` の2条件が記録する観察component/CSS/export HTML hashも同manifestと一致。これでローカル検査対象版を照合できるが、公開版の動作・最終push後commit・実CIの証明ではない。最終提出のHEAD/tree/remoteは統括担当が別途照合する。

## 全時間suiteの読み方

最初の最終版6条件はChromium375/390/765およびWebKit765がPASS、WebKit390がPARTIAL、WebKit375は開室click10秒timeoutで検査群0件。同一期待値の再試行はWebKit390が8群PASS、WebKit375は8群到達したがMenuの自然途中pause入力が220ms終端だった1経路PARTIAL。

8群へ到達しても `pathFailures` を無視して全面PASSにしてはいけない。最初のWebKit390のPARTIALもCoinではなくMenuの終端入力。これらは「途中停止が壊れた」証拠ではないが、該当試行で中間入力を確認できた証拠でもない。開室timeoutも環境原因と断定せず、製品経路未到達の検査失敗として保存する。

対応driver版Coin独立probeは18件の実中間停止を保持、negative control4件を拒否。5%狙いのWebKitは191–254msへ遅れていたため開始付近成功とは数えない。別 `coin-early-supplement.json` では6回中70/89/96/60msの4回は開始付近入力と保持を確認し、466/490msの2回はEARLY_INPUT_MISSEDのまま。6回とも保持したことと、6回とも狙いの早期位置へ届いたことは違う。

## Battle診断の原因表現

旧操作順・待機・assertを維持した3回は未到達timeout、動き低減切替後のassert失敗、5群PASS。失敗2回目は条件read時にENCOUNTERを含んだことがassert失敗から分かる一方、メッセージ生成の次のreadではREADYだった。失敗後snapshotもsceneBATTLE/READY、Animationなし。

native timer記録は440/930ms指定のid133/134を37890msに登録し、39030/39031msに発火（実遅延1140/1141ms）。source上も440msでscene、930msでREADYを更新する。固定1100ms検査と遅延timer/React描画のread競合に整合する。ただし条件readの厳密なperformance時刻を採っていないため、イベント配信からassertまでの全順序を完全に証明したとはしない。timer遅延の根因・旧空Assertionとの同一性は未特定。

従って「今回観測では永久ENCOUNTER残留ではなく、固定待機の時点差を示す」「旧問題修正済みとは言わない」という整理は妥当。推奨は明示状態を期限内に待ち、期限超過時に同一browser taskのsnapshotを取る検査設計。期待値緩和や待機延長だけによる成功化は推奨しない。Battle製品ファイルはmainと同一だが、その事実だけで共通経路の回帰不存在までは証明しない。

## 通常Menu画面外診断の読み方

`native-normal-return.json` のWKMenuは実画面外矩形を確認した100ms後にtime0/running/pending残留。IO callback時刻をその試行で採っていないため根因は未確定。

`menu-offscreen-probe.json` の3回はscroll前に既にAnimation参照がなく、これは残留なし/状態保持の証拠であって生きたAnimationを取消した証拠ではない。一方 `menu-offscreen-immediate-probe.json` の2回はscroll前にtime0/pending/running、または156ms/runningがあり、その後IO falseを観測し100ms後に旧参照idle/currentTime null、DOM Animationなしとなる。実取消の成功2回として区別する。元失敗を削除せず、非再現を根因解決へ格上げしない。

## テストと説明の妥当性

- 全checkは各171件(Node49+Vitest122)。既定3回は170/171、170/171、171/171成功、worker1は170/171。skip0。5秒上限・既存期待・登録は不変。並列固有の原因説は支持できない。
- 独立追加診断4件は2成功2失敗。既存171件へ合算して成功175件などと報告しない。未解決不具合の期待を保持した診断で、npm test登録を変更していない。
- 初期driver不一致のJSONは参考履歴、対応Playwright1.56/browser版のJSONが判定正本という分離は妥当。
- README追記は自動演出抑止の範囲とN2未修正を明示し、仕様を変更したように説明していない。既存資料の失敗履歴も残す。

## 残る条件

N2局所修正への人間承認と同一期待値再検証、Q1の原因/安定運用判断、未到達/終端入力/旧失敗の区別を維持した提出が必要。実機Safari、VoiceOver、実OS文字拡大・実背景化、公開版操作、実CIは本レビューでは未検証。全197展示の網羅保証はしていない。最終提出HEADに製品変更がないこととGitHub状態は別途最終確認する。

## 最終追加probeの読解（23:39 UTC追記）

`menu-offscreen-immediate-probe.json` repeat2では、scroll前15334msにtime0/running/pending、100ms標本15442msでも同状態でIO false未到達。IO false記録は15630ms、300ms標本15674msでtime220/finished、1000ms標本16342msでidle/currentTime null。従って「100ms待ってもまだ残る」という条件を追加probeでも再現し、通知配信前だったことまで観測できた。ただしIO false直後44msの標本もfinishedなので、IO通知だけを唯一原因と断定せず、React effect反映を含む非同期状態反映と分ける。正確なcancel呼出し時刻はこのsnapshotからは不明（300–1000ms標本の間）。永久残留はこのprobeで観測されない。元の失敗試行にはIO時刻がなく、同じ原因だったと遡及確定しない。

`menu375-early-supplement.json` は6回中11/14msの2回が早期入力と保持成功、92/76msの2回は中間入力保持、220msの2回は終端入力。早期閾値20%(44ms)を後から緩めず、4回のEARLY_INPUT_MISSEDは保持する。これにより「WK375で実中間pauseを一度も確認できない」という欠測は補われるが、元suiteのPARTIALを履歴から消したり、6回すべて早期操作成功と数えたりしない。
