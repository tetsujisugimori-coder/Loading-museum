# Image Crop P2-01：自己検証・再レビュー引渡し

2026-11-05 JST。対象Issue #63 / Draft PR #64。独立再レビューは親担当が別担当を手配する。未完了の間は総合PARTIAL、限定マージ推奨NO。Draft解除・merge・auto-merge・公開はしない。

## 基準と設計

開始時PR/local `95ab616f961fcfb5af9ac393c44f33ead68d285b`、tree `dc9ebcc42c54142aa724ab0739998741737294e5`、clean。main `8f065e0d0392b78b927d148648d0b77205ef979a`。設計比較と採用契約は[設計記録](image-crop-precision-design.md)。過去の証拠は変更しない。元絵・CSS・登録・展示数265/13室/実用UI26・依存lockは変更しない。

## 修正前の再現

`image-crop-precision-evidence/model-red/results.json`は同一再現器の43検査中14失敗。16:9の四隅の最小枠を表示経由で再適用すると拒否。4:3は受理しても幅/高さが変わる。1:1はモデル4隅とChromium4隅で安定。最小以外の混合操作・自由比率の端にも6桁丸めによる変化を検出した。

`browser-red-correct-{chromium,webkit}/results.json`は製品変更前の実ブラウザ（375px・通常motion）。両engineで16:9四隅の拒否と4:3四隅の変化を実マウス・trusted form submitで確認した。SE例は内部幅142.22222222222223、高さ80.00000000000001、表示幅142.222222を再適用して最小寸法エラー。4:3は106.66666666666666×80から106.666667×80.00000025000001へ変化。確定結果は維持された。元絵右端を超える厳密二進数和が通常加算で1000へ丸まる反例も旧版が受理した。

WebKitの1:1などの一部ケースはactionability/PNGの8秒待ちに失敗したため、全ケースの製品挙動を再現済みとはしない。最初の`browser-red-{engine}`はSVG baseValのfloat32を論理値として読んだ再現器の誤りを含む。修正した属性原文の再現を`browser-red-correct-*`へ別保存した。`model-baseline-key-order-attempt.json`はJSON key順を誤って比較した診断途中の記録。製品故障の証拠に数えない。

## 修正と検査

- 編集欄を最短往復表現に統一。整数比率の高さ計算を全操作で共用。概数は結果説明だけに明示。
- 十進表記がNumber変換で別の数値表記へ丸まる入力は拒否。等価な0/指数表記は許可。入力検証にepsilonを追加しない。
- TwoSumで右端/下端の丸め残差を判定。操作で生成する境界だけ隣接表現を内側へ選択し、最小・元絵内を満たす。独立BigInt dyadic oracleで照合。
- 同じ43検査は最初の修正後43/43。追加で最小値へのサブULP丸め、underflowを検査する（45件）。反復16回/12回、2500操作、全比率・全四隅、最大・近接端・明示的違反を含む。
- Vitestは既存26件に実フォーム3比率各16回と十進表記/精度/ゼロ操作1件を追加（30件）。既存Pan & Zoom13件、全館検査を維持。
- 既存source故障2件とPNG誤位置/誤比率の負対照を保持。6桁化の再導入、最小寸法の1e-6緩和、丸め残差無視の3故障を追加。故障が実際に適用され、子process異常/timeoutを成功と扱わず、原文bytesをfinallyで復旧する。
- 既存8独立jobへ精度モデル/実ブラウザ検査を追加。Chromium/WebKit×375/390/765/1280×normal/reduce。制限時間・retry・許容差・skipは緩和しない。失敗はnonzero。

## ローカル実行の区別

環境はWindows、Node v24.20.0、既存固定Playwrightブラウザ。buildは成功、最初の既存Image Crop/Pan & Zoomは39/39。その後の追加検査では、変更していないPan & Zoomも含む複数の5秒timeoutとworker RPC timeoutが発生した。`unit-green.log`、`unit-green-serial.log`、`controls-green.log`を保存し、成功としない。source故障対照は子process60秒timeoutを正しく失敗として報告した。この失敗を製品の数値精度不整合と同一視しない。

最初の修正後Chromium375通常は26チェック中24成功。失敗2件はPNG screenshotの8秒安定待ちで、数値反復自体には不整合を検出していない。`browser-green-chromium-375`に記録。全条件の成功へ代用しない。

WebKit375通常の修正後も26件中24成功。全3比率×4隅は各12回再適用、全座標・入力欄・確定結果保持、raster照合が成功。旧版と同じWindows/engine/幅/motionで16:9拒否→受理・座標一致、4:3変形→座標一致を確認した。後半のconfirm-cancel-resetはclick安定待ち、mixedはPNG安定待ちで8秒timeout。取得できた代表PNGを目視し、元絵の枠/屋根のpreview/家と橋の確定結果/通知の対応を確認した。CIのLinux実行と同一環境とは呼ばない。

長い往復小数は小幅のinput内で横にスクロールして編集する標準動作となる（値自体は省略・丸めない）。これは表示桁を失わない方式のUI上の限界として記録し、元絵/previewの引伸ばしやページ横超過と混同しない。

型の誤りを修正した後の`typecheck-corrected.log`は成功。`model-green-45`は重複のない45件成功。途中の`model-green-final`は新反例2件が二重登録された47件の診断結果であり、45件とは別の47種類があると数えない。最終再現器はlabelの重複自体を拒否する。ローカル全館回帰は最初のVitestブロックで15/150件失敗とworker RPC timeoutになったため、その先のblockは未実行。旧展示にも時間超過が生じ、成功と扱わない。

CIと独立再レビューの確定結果は、固定HEAD取得後にPR #64 / Issue #63の証拠台帳へ追記する。ローカル実行中の結果はdirty作業treeとsource hashを記録し、cleanな提出HEAD実行と区別する。

中間提出HEAD `fe6cc020aff40492c0fd437eeb4169a07ff8e9a7` / tree `c58cdd35ebb3a5105cf7a0769848e4108b5e705b`の[Image Crop CI 41964678477](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41964678477)は8/8 job成功。従来検査16条件と新精度検査16条件（26チェック/条件）を受理。全8 ZIPのGitHub digest、clean HEAD/tree、144件のsource hash照合、92 PNGのhash、各jobのモデル45件、source故障5種類のexit1/原文bytes復旧、PNG故障4件を実ファイルで照合した。照合結果は`image-crop-precision-evidence/ci-fe6cc02-verification.json`。最終HEADはPR台帳の新しいCIを参照し、この中間HEADを最終HEAD検証と呼ばない。

照合器は`scripts/audit-image-crop-precision-ci.py`。configは`head`/`tree`/`dest`/`artifacts`（GitHub metadataと有効なdownload_url）を持つJSONをローカルのignored workに置き、`python scripts/audit-image-crop-precision-ci.py config.json`で実行する。署名付きURLは公開記録へ保存しない。8個・16条件・45独自label・各26項目・5故障・4PNG故障・全PNG/ソースhash・元絵内の座標保持のどれかが欠けると拒否する。照合器自身は独立レビューではない。

## 再現方法と独立レビュー重点

```sh
npm ci
npm run lint
npm run typecheck
npm test
node scripts/verify-image-crop-controls.mjs
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-image-crop-browser.mjs
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-image-crop-precision-browser.mjs
```

純粋モデルは`node --experimental-strip-types scripts/verify-image-crop-precision-model.mjs`。engine/幅/motionはBROWSERS/WIDTHS/MOTIONSで指定できる。新ブラウザ結果は既存browser結果を上書きしない。実入力はPlaywright mouse/keyboard・trusted form、補助イベントは既存検査で明示、実機ではない。

独立担当は元HEADの失敗、製品/model/codec、試験の故障注入、精度拒否が有効な別表記を不当に拒否しないか、全操作が正規の高さ経路を通るか、厳密和の判定と範囲構成、PNGの実座標一致、取消/確定/Reset/幅0/古いpointer/Pan & Zoomの回帰を調べる。製品コードの独立実行結果で判断し、自己検証の結論を流用しない。

実機Safari・VoiceOver・物理入力・OS背景化/実capture喪失・ブラウザpinch zoomはNOT_TESTED。Issue #29/#44/#54等は今回の結果で解消扱いにしない。P2-01閉鎖は独立再レビュー待ち、実装の自己検証結果だけでYESへ昇格しない。
