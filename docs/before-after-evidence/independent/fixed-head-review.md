# 第6期A-3 独立レビュー（実装者とは別の子エージェント）

対象候補 HEAD `0826a5d5f09c03ee8b0d451c20970ad4eba61601`、tree `00f6f5eb82908618a1a3dbca2c9a92e586c4ff5c`。reviewer `/root/independent_review`。実装変更・commit・push・GitHubの更新は担当していない。

**対象候補のコードと独立Chromium検証は限定PASS。新たな未解決P1/P2なし。端ハンドルのP2-01はRED→GREENを確認。今回の1展示追加に限り、最終提出HEADの製品source同一・正式CI成功を条件に、限定マージ推奨YES。正式CI未確定の段階で全ブラウザPASSとはしない。** Draft解除・merge・公開を許可するレビューではない。

## 候補・証拠の対応

- `work/independent/fixed-head/browser/report.json` は開始時HEAD/tree・dirty空欄・製品/登録/画像/テスト/ハーネス/生成器/workflowのSHA256、ブラウザ版、8条件、全PNG SHA256、実行時刻を保存。
- `work/independent/fixed-head/source-audit.json` で15 sourceファイルの実bytes hashを `git show 0826a5d:<path>` と現在のworktreeへ別途照合。全一致、監査時clean。
- 独立スクリプトは主担当のbrowserハーネスを呼び出さず、別に作成して操作・描画を検査した。原本は `work/independent/review-browser.mjs`、`review-touch.mjs`。中間原本は `docs/before-after-evidence/independent/*.mjs.txt`。最終実行の原本は実行版を保存すること（後述の画像撮影時motion修正・独立境界計測はwork版に追記）。
- 以前の報告にあるbase HEAD＋dirty証拠は開発途中のもの。固定候補の実装がbaseへ含まれていたという意味ではない。後の証拠専用commitは、対象source同一の監査により対応付ける必要がある。

## 独立実行と結果

|対象|結果と根拠|
|---|---|
|画像座標一致|PASS。2ペア、Split/Overlayで両imgの画面上x/y/幅/高さと天然寸法1200×760を照合。表示位置を変えても座標保持。並列は両図版の幅/高さ一致。|
|比較境界|PASS。0/100の全面表示、37%の実境界DOM位置を独立計算。37%画像の左側がAfter、右側がBeforeであることを別に取得した全面baseline PNGの均色内点と照合。|
|透明度|PASS。50%画像の各channelがBefore/After全面baselineの算術平均になることを均色内点で照合。単に製品のopacity属性を読み戻して成功とはしていない。|
|反転|PASS。数値37%を保持。画像src/altとラベルをコードで追い、Before/Afterの交換と方向別の再生終端を確認。親担当の自己検証と区別。|
|マウス|PASS（Playwright browser input、物理マウスではない）。両端handle押下の値保持、drag、Escapeで開始値へ戻ることを実操作。|
|キーボード|PASS。native keyboardで1/10刻み、Home/Endを境界/native rangeで実行。別のキーボード操作補完結果は下記追補を参照。|
|再生/中断|PASS。通常motionは実rAFの途中値、pause/位置保持/resume、mode/pair変更中断、reduced途中切替、閉室再表示を実行。reduced初期条件では明示Replayで即時After、手動比較を保持。|
|古い処理|PASS（コード＋別プロセスの関連unit再実行）。animation epoch、owner pointer/monotonic timestamp、resource generation、取消時capture解放とanchor無効化を確認。実OS capture-loss/背景化はNOT_TESTED。|
|Reset/ペア変更/失敗|PASS（コード＋関連unit）。値50/反転解除、mode/pair保持方針、load/errorのresource失効、再読込の世代更新を確認。network failureの実ブラウザ経路は主担当の自己ハーネスであり、この独立8条件では未実施。|
|スマートフォン/レスポンシブ|PASS。375/390/765/1280px × no-preference/reduceの独立Chromium8条件。並列の同倍率、横超過なし。375と1280の代表画像を独立目視。|
|タッチ/scroll|PASS（Chromium CDP模擬touch、物理touchではない）。375pxでhandle dragが比較を変更し、画像上の縦touchでscrollY5220→5299、比較値50%保持。独立 `fixed-head/touch/report.json`。|
|既存展示|限定PASS。既存登録/並びはappendのみ。関連4 test fileを独立再実行88/88成功（新規38、PanZoom13、ImageCrop30、Diff等7）。全館・旧ブラウザハーネスの実操作は主担当/正式CIの範囲。|
|図版の出自・再現性|PASS。生成器を製品treeへ書かず/tmpへ独立再実行し、4SVGすべて現assetと完全bytes一致。`art-generation.json`。修復図版は欠け/ひび/割れ/花壇の形状変化を含み、補正図版は共通形状でpaletteを比較。架空表示は明示。|
|実機読み上げ・Safari|NOT_TESTED。VoiceOver、物理Safari/iPhone、実機pointer/touch、OS背景化/capture-loss、WebKit native touchをPASSとはしない。|
|独立WebKit|NOT_TESTED（このローカル独立実行）。ブラウザdownloadは環境policyの403で拒否され、別経路で迂回していない。正式WebKit CIの実artifact監査は別途追補予定。|

## 発見・修正・検査自体の評価

1. **P2-01（解消）端のhandle押下による比較位置の跳躍。** 初版はhandleを画像の内側24pxへclampする一方、押下を絶対座標で位置へ変換していた。独立Chromium154/375通常、Home→0%→handle中心でmouseDownだけで8%へ変化。`docs/.../independent/endpoint-red/report.json`とPNG、当時の製品3ファイル実bytes（hash一致）を保全。主担当はhandleの開始値を保持し開始pointerとの差分で移動、取消/reset/resize時anchor失効へ修正。固定候補8条件で0/100の両端押下を再実行し値不変を確認。
2. **P3相当の改善採用。** outputの暗黙live通知が自動比較の逐次更新を読み続ける可能性を指摘し `aria-live="off"` を採用。実機読み上げ確認ではない。既存の全要素reduced ruleが1ms transitionを与える影響を実geometryで発見し、新展示のreducedへ局所的なtransition/animation停止を採用。無関係な既存CSSは変更しない。
3. **独立pixel検査の誤前提を修正し、失敗原本を保存。** SVGの斜線端は全面とclip描画で微小raster差があり、既存bodyの走査線は全域に周期的な色差を作る。数値許容を広げず、raster fixtureだけでラベル/handle/lineとbody走査線を隠し、双方baselineの5×5近傍が厳密に均色な内点を採用。SVGの非均色edgeはpixel同一の保証範囲に含めず、画像boxと境界DOMを別検査。中間の失敗原本は `endpoint-green` / `raster-diagnostic` / `green-flat-interiors` に残す。
4. **DOM値到達と描画到達を区別。** reducedの既存1ms transitionによりARIA=100でもhandle boxが直前の位置だったため、独立検査はhandle中心の実clamp位置への到達を待ってからmouse座標を採取。固定sleepで通していない。`green-isolated-raster` / `green-render-wait` / `endpoint-trace` はこの中間失敗の原本。製品P2再発とは数えない。
5. **独立負対照2件を実施。** 検査対象だけへmask25%固定、alpha .25固定を注入し、それぞれ54・125の均色sampleが独立の37%/50%基準へ不一致となり検出された。製品sourceは変更せずfixture CSSを除去。その後の操作/比較は成功。`fixed-head/browser/report.json.controls`、`fault-mask25.png`、`fault-alpha25.png`。主担当側の負対照とは別の検査経路。

## 限界・画像の条件

- 独立8条件はsystem Chromium154.0.8037.57、Playwright1.56.1、Linux、Node24.19.0。正式CIのChromium141/WebKit26とは版・環境が異なる。
- `fixed-head/browser/*no-preference-final.png` の最初の収集は、途中のdynamic reduced試験後に撮影したため、撮影時はreduced有効。ファイル名のmotionは初期conditionであり撮影時状態ではない。原本を上書きせず、通常motionへ戻した375/1280の代表画像を `fixed-head/normal-capture/` へ追加収集中。この区別により、画像だけから初期motionのまま実行したと誤認しない。
- rasterは同じ実assetの全面baselineを独立取得する検査であり、未知の図柄すべてやアンチエイリアス端の完全一致を保証しない。mask/alpha固定故障は検出するが、全種類の故障検出力を証明したとはしない。
- 通常のfocus/blur、hidden/cancel合成と実OSの挙動を混同しない。実機未検証、既存Issue #29/#44/#54等は今回解消した扱いにしない。

## 追加検査追補

キーボード補完・通常motion代表画像の最終結果を、終了時にこの節へ追記する。

- **キーボード補完PASS**：`fixed-head/keyboard/report.json`。375px・通常motion、native Enterで開室、Spaceで展示選択、native selectのArrowDownでペア変更。Space/Enterで3モード、反転、Replay、一時停止、再開、Resetを操作。境界/native alphaのHome/End/Shift操作を確認。最初のプログラムによるfocusと、その後のnative keyboardを区別して記録した。別にnative Tabの13遷移を記録し、handle→3モード→range→再生→Replay→速度→反転→Reset→summary→展示外へ進み、trapがないことを確認。
- **通常motion代表画像補完PASS**：`fixed-head/normal-capture/report.json` は同じ候補の375/1280・no-preferenceの2条件を再実行し、dynamic reduced検査後に元motionへ戻してから撮影。`captureMotion:"false"` を明示し、画像SHAを保存。最初の8条件report/画像はそのまま保全する。
- 主担当の固定候補後のcancel補助検査で画面外handle座標を使った停止を確認した旨の連絡を受領した。この自己ハーネスの前提修正（各gesture前にhandleをviewへ戻す・最新box採取・dragging状態確認）は妥当な修正方針。製品の新規問題とは判定していない。後のcandidateでは検査source差分と正式CIを別途監査する必要がある。
