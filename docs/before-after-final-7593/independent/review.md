# 7593独立レビュー

HEAD `7593e5136efc90c6bccf63fa2fc3e429b51a128d` / tree `d453f5aab866cd5194b831080571208ef3463a56`。実装者とは別の子エージェントによる実行。開始・監査時clean。

**最終判定：総合PARTIAL／Before / After Compareの確認済み実装範囲は限定PASS／全PRのマージ推奨NO。** 新展示の主16条件と独立検証は成立したが、既存展示の正式WebKit回帰検査2件に未解明の失敗がある。変更範囲との因果はUNKNOWNであり、既存維持を完了扱いにしない。失敗を消すための待ち時間・許容拡大や無関係な製品修正は行わず、Draft・未マージの判断材料として提出する。

## 新HEADでの独立検証

- 独自oracleのChromium375/390/765/1280 × 通常/reduced **8条件成功**。両ペアの源SVG XML契約/public-out完全bytes一致、同一box/37%境界、endpoint-baseline Split37/Overlay50、反転、keyboard/mouse、再生中断、閉室再表示などを新規実行。独立負対照2件を検出。`browser/report.json`。
- 採用portableをREQUIRE_CLEAN=1、Chromium375通常で新規実行。2ペアのnative mouse表示75%、keyboard、endpoint画像の実変化、Split37/Overlay50と故障除去後の復旧が成功。独立4故障を拒否。追跡script SHAは提案と同じ `5aefe861ea147e05b28a6a0a665d5467d387d1ff519f528059adba3fce4ad7ce`。`portable-chromium/report.json`。
- **主ハーネス自体も別プロセスで独立再実行**（Chromium375通常、clean）。1条件成功・故障5件検出・errors0。0%の1px露出は300!=301±0.05、100%の1px欠けは1!=0±0.05、実図版の1px移動は37!=38±0.05で拒否し、各復旧後に再検査した。既存mask25/alpha.25もそれぞれ2514/12164 pixel不一致で拒否。`primary-harness-control/report.json`。
- この主ハーネス実行のすべてのrasterでmarginX=marginY=1を確認。**元の外周1px・RGB3・不一致fraction<.002、既存境界除外は維持**。PNG/CSS寸法の量子化paddingは診断記録だけで、成功領域や閾値の拡大には使われない。
- 15 source、portableの7 source、主ハーネスの228 sourceを対象git blobと照合。独立script SHAの原本一致、**ローカル99PNGの実bytes hash一致**を確認。`source-audit.json`。
- 4b4790から製品/図版/テスト/依存に差分なしを確認。90関連unit、touch、全モードkeyboard、再生中hidden、native両端到達の前回証拠は、同じ製品sourceへの結果として保持する。これらを7593で再実行したと偽らない。

## 検査の誤成功・受入条件の再評価

1. **参照の二重合成を除去。** actual PNGは製品表示のまま取得し、その後のexpected PNGだけ製品bcLayerを隠して試験指定SVGをcanvas背景へ1回描く。期待画像は製品のmask/opacityから正解を生成せず、試験指定pair/amount/反転と固定源寸法/containを使う。これにより、actualの半透明AA外周へ同じSVGを再合成して濃くする参照側の構造を除く。
2. **元ROIは維持。** 未採用の2px量子化guard案は保全されたが、提出検査へ採用されていない。computed mask4辺と0/100/37の正系検査があり、外周pixelの比較対象外部分も別の幾何契約で守る。新しい1px故障3件が検査の検出力を補完する。
3. **native入力の期待値は入力側から算出。** テスト既知の開始50%、trusted owner pointerが実際に受け取ったclientX差、実frame幅から算出する。製品stateや現在のline値を期待値として採用しない。UAが要求protocol座標を丸める場合、要求target定数と実配送値を混同しない。
4. owner/type、down後の非ゼロmove、末尾move/up、fresh sequenceを要求し、downだけ・古い配送列で50%のまま通る誤成功を防ぐ。raw lineは算出した実期待値、native rangeはMath.roundした期待値へ厳密に照合する。物理mouse/touchの確認ではない。
5. 主検査が失敗してもWK375の独立probeを実行するが、primary failureをcontinue-on-error等で打ち消さない。独立probe成功をもってjob全体をPASSへ上書きしない。

## 正式CIと残る限界

7593の正式CIは確認待ち。54442では独立WebKit26/375通常probeの2ペア比較・4故障拒否・復旧が成功し、scriptと7sourceをログから対象gitへ独立照合した。一方、primaryは要求targetをraw値とみなした待ちで停止しており、当時のjobFAIL/cases0はそのまま保全する。7593の実配送値検査と単独参照により旧失敗が閉鎖できたかは、このHEADの正式結果で判定する。

ZIP配信先のproxy CONNECT403により、正式artifact ZIP内部・PNG実bytesの独立監査はBLOCKED。同hostの再試行・迂回は行わない。CIログ/metadataに記録されたsource/画像hashと、ローカル99PNGを実bytesで照合したことを区別する。実機Safari/VoiceOver、物理入力、実OS背景化/capture-loss、WebKit native touchはNOT_TESTED。


## cold request失敗fixtureの独立確認

直前のwarm-cache試験は、画像を何度も表示した後にabort routeを付けたため、要求するHTTP requestが発生したことを保証していなかった。今回の差分では製品を変更せず、fresh BrowserContextで初回ロード前にrouteを設置し、実命中を必須にした。contextはfinallyで閉じ、成功した主caseはbringToFrontしてwarm pair切替を続ける。

このHEADの主ハーネスを独立にChromium375通常へ再実行し、restoration-after.svgの実abort 1件→製品alert/自動比較disabled→unroute＋明示retry→ready=true/位置50・pageerror0を確認。その後の主caseの通常pair切替、5故障対照と復旧も成功。source-audit.jsonに実命中URL/回数を記録。異常状態をskipせず、ネットワーク境界へ失敗が入ったことを実測する検査への訂正である。WebKitで同じ実測が成立するかはこのHEADの正式CIで確認する。

最終CIを変えないため、このディレクトリはwork配下へ保存し、製品/追跡docs/commitは独立担当から変更していない。正式WebKit主検査・独立probeと全CIの結果を取得後に、判定を追補する。


## 最終正式CI・既存回帰検査の判定（この節が以前の待機記載に優先）

### 新展示：確認済み範囲はPASS

- BeforeAfter run42091230501の8/8job successと8artifact metadataのHEAD7593一致を直接APIで確認。主試験はChromium/WebKit ×4幅×両motionの計16条件が終了。child reviewerはWebKit4jobの生ログを直接取得し、8条件・40故障拒否・元ROI1・cold実命中・実配送期待値/幾何を別途監査した。
- WK375の独立probeは同HEAD/tree/clean、script SHAと製品/図版7sourceをGit blobへ照合し一致。両ペアのSplit37/Overlay50・4故障拒否・復旧が成功。これを主検査や他の幅の独立再操作と混同しない。
- `formal-webkit-log-audit.json`、`artifact-metadata-audit.json`、4job raw logsへ根拠を保存。metadata/upload-log digest一致を確認したが、ZIPそのものの実bytesを検証したとはしない。

### 全PR：NOを維持する未解明の回帰検査

1. **Museum practical-browser / WebKit / 390px**、初回job127469992191。最初のStep Progressで、scrollTo(0,0)後の固定100ms待ちのdata-activeがtrueで、false期待に失敗。casesは0件。直後のfailureContextでは同stageがy=3893.4375、active=false、document visibleだった。IntersectionObserver/Reactの観測時点差は候補だが、内部原因と新変更の寄与はUNKNOWN。1回の同HEAD/同条件診断rerunは主担当が別に記録し、初回REDを保持する。rerunが成功しても最初から安定PASSだったとはしない。
2. **Flash Phase2 / WebKit / 1280px / then版 FrameByFrameLab**、job127469904626。主ペア検査24/24成功後、編集補完は7/8成功、`cancel retains exact partial ink` で失敗。後続touchコマンドはshell failureで実行されていない。取消前後DOMの読取タイミング、実pointercancelの配送idなどは検査コードから候補を挙げられるが、点列差と実artifact bytesは取得不能で、どれが原因か確定しない。Flashの追加rerunは行っていない。

- `regression-source-audit.json` で、上記の製品/共通runtime/検査/workflowなど関連26ファイルがbase main05735と7593で完全同一であることをhash付きで確認。新比較展示はこれらのテストで未選択・未mountで、新componentのeffectsは実行されない。新CSSも比較展示へscopedされる。
- このsourceの不変性は、旧展示の失敗が新展示の直接コード変更によるものではないことを支持する。しかし、共有bundle/layout/schedulingなどの影響まで否定する証拠ではなく、同一環境のmain baseline失敗も観測していない。『既知の既存flake』と断定して受入を通過させない。
- 失敗jobのraw logsをこのディレクトリへ独立取得して保存。旧ZIP配信先の403により失敗画像/詳細JSON内部を読めず、Flashの厳密な差分内容はUNKNOWN。新展示のローカル99PNG検証や正式ログの成功と区別する。

### 限定マージ判断

比較展示の完成度・同一座標・3モード・反転・自動比較・状態取消/失効・keyboard/スマートフォン/reduced対応を支持する実装・検証根拠は十分に増えた。一方、ユーザーの受入基準には既存展示の維持も含まれる。未解明の旧展示回帰失敗を軽微な既存問題と断定するには根拠が足りないため、**全PRのマージ推奨はNO**。新展示に新規未解決P1/P2を確認したという判定ではなく、全体の回帰保証が未完了であることを理由とする。

総合PARTIALとして、Issue/Draft PR・最終HEAD・成功範囲・初回RED・診断rerunの別結果・未検証範囲をそのまま提出する。Draft解除/merge/auto-merge/公開は行わない。
