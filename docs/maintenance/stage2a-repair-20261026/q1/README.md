# Q1 gallery 5000ms 品質ゲート調査

基準: `5bb0d052d4a6aea74c97794f5596eef900ad015f`。旧 `stage2a-verification-20261026/parallel` の失敗証拠は不変。本調査はQ1担当による jsdom 試験実測であり、nativeブラウザの性能証明ではない。

## 原因の切り分けと採用方針

元の対象は1本の同期試験で、47展示を開き、正規化検索、全件解除、カテゴリ/用途複合フィルター、0件、再度全件解除、閉鎖取消を一続きに検査していた。`fireEvent` は React `act` の同期更新を含み、計測対象経路に独立した非同期待機はない。今回は未待機更新を失敗原因として観測していない。

原試験単独3回は1成功・2失敗。対象時間は2377/7063/5339ms、後2件は同じ5000ms timeout。単独起動でも再現するため、並列だけを原因とはしない。`-t`指定で非対象10件は未実行となるが、これは診断限定実行であり正式品質ゲートからskipしたものではない。

同一操作・期待値の計測コピー3回も全てtimeout。合計区間6103/6312/6698msのうち、`screen` queryだけが3712/3506/3561ms（約53〜61%）を占めた。最後の全DOM `getByRole(button, close-name)` が重く、検索/カテゴリの全DOM `getByLabelText` にも大きな時間を費やしていた。cleanupは約5〜10msで支配要因ではない。根拠は `profile-before-summary.json` と原raw log。

第一希望として、製品を変更せずquery範囲を適正化した。

- 検索・カテゴリ・用途・解除は実 `.waapiFilters` 内で `within`。引き続きlabel/role/nameで取得し、scope不在は失敗。
- 閉鎖は `getByRole('button', { name: /サンプル一覧を閉じる/, expanded: true })`。Testing Library現物 `node_modules/@testing-library/dom/dist/queries/role.js` ではexpanded条件をaccessible-name計算の前に適用する。全標本のbutton名を毎回計算せず、従来role/name/可視性/一意性条件にexpanded条件を追加する。
- `hidden:true`、固定待機、timeout延長、retry、skipは使わない。

このquery改善だけの候補は、計測3回が2成功1失敗、非計測3回も2成功1失敗だった。計測1回目ではclose queryが2062msから122msへ減り、全区間2875msになった一方、3回目は5727msで失敗した。query寄与は実測できたが、**これだけで安定化したとは判定しない**。候補失敗も `profile-scoped-3.log`、`scoped-2.log` へ保存する。

次善策として、このquery修正を維持し、独立した検証責務2本へ分離する。名前正規化検索と複合フィルターは別の入力契約で、後者は前者の入力を必要としない。各試験は実galleryを開き、モック標本への差替えや47件の削減をしない。全件remountを2度累積する単一test予算を分けるが、分割だけを根因解消とは呼ばず、正式全check反復と合わせて判定する。

実行環境の変動で個々のrender/remount時間にも差があり、その根因（host共有負荷等）はUNKNOWN。今回の局所対策は、過剰なテストDOM問い合わせの寄与と同期検査責務の累積を減らすもので、製品の性能問題が存在しないという証明ではない。

## 既存検査との対応

| 元の検査・操作 | 最終の責務 |
|---|---|
| 初期Fade Inなし、WAAPI regionなし | 初期DOM/正規化検索/開閉 |
| 開室、47以上article、47/47表示 | 初期DOM/正規化検索/開閉（47/47は両方） |
| 空白・大文字FADE IN検索、1/47、Fade In | 初期DOM/正規化検索/開閉 |
| 検索解除 | 同試験。47/47を明示追加 |
| UI Feedback→Modal、1/47、Modal Open/Close | 複合フィルター/0件/解除/閉鎖取消 |
| 一致しない文字列→0件説明 | 複合フィルター/0件/解除/閉鎖取消 |
| 複合条件解除→47/47 | 複合フィルター/0件/解除/閉鎖取消 |
| 閉鎖後Fade Inなし、cancel数増加 | 両試験。元の複合条件解除直後の閉鎖経路も保持 |

旧11件から12件へ。削除したassertはなく、各責務内の操作順を保持。検査対象を減らしたのではなく、独立入力契約の境界でfixtureを分けた。従来の長いチェーンが一つのタイムアウト予算で終わる性能契約を保証するものではない。

## Queryの負対照

`query-negative-controls.test.tsx` は診断用fixture7件。正しいlabelと展開済み可視closeを取得でき、検索label欠落/改名、close改名、aria-expanded=false、hidden close、duplicate closeを全て拒否する。7成功・失敗0。正式製品テスト件数とは別集計。不要なDOMの探索を減らしても、指定label/name/可視性/一意性の欠陥を成功に変えないことを確認した。

## 測定と限界

- 計測は製品コードを変更せず、コピーした元試験の区間を `performance.now()` で測る。計測自体の微小な負荷はあり、非計測版も反復した。
- 各profileのquery内訳と外側区間は入れ子のため加算してはいけない。scoped queryは`screen`spy外となるため、前後query総和の単純比較ではなく同じ外側区間とclose queryを比較する。
- 担当間でCalculator全単体・nativeブラウザ・buildを同時実行しない時間窓を調整した。host全体の独占は保証しない。
- 各コマンド、UTC開始時刻、実時間、終了値、loadはJSON、期待値/失敗位置はraw logに保存。正式default3/worker1 2回と最終判定は親調査の全check資料を参照する。
- split後の反復結果は以下へ追記する。結果が揃うまでQ1解消・マージ推奨YESとはしない。

### 分割の保証境界

元の「正規化検索→clear→カテゴリ/用途」の連続履歴は、最終unitでは独立した2回のmountに分かれる。個別assertは全て保持するが、同じmount上でのこの交互作用まで同一unitが保証すると説明してはいけない。検索clear直後の47/47を新たに明示確認し、両試験で最終閉鎖とAnimation取消を確認する。各試験は元と同じbeforeEach/afterEachを通り、cleanup/vi.restoreAllMocksを維持する。親調査のnativeブラウザ補完で、元の連続操作順そのものを別途確認する。native補完の未完条件があれば、その条件の履歴交互作用は未検証とする。

最終Q1反復はN2局所effect適用後のsourceで行う。query単独候補・baselineと厳密に同一sourceではない。最終sourceと正式testのSHA-256を `targeted-final.json` に記録し、N2差分を含む版での結果として区別する。

## 最終対象単独反復（2026-10-26 03:10:41–03:11:28 UTC）

N2局所修正適用後。全6実行exit 0。正式2責務を同じ5000ms上限で3回実行し、6成功・0失敗。各runで非対象10件は`-t`選別による未実行（Vitest表示10 skipped）であり、正式全checkでは全12件を実行する。

| run | 初期DOM/正規化検索/解除/開閉 | 複合フィルター/0件/解除/閉鎖取消 | プロセス実時間 |
|---|---:|---:|---:|
| separated-1 | 1524ms | 1055ms | 7.894s |
| separated-2 | 1012ms | 2779ms | 6.894s |
| separated-3 | 1132ms | 1039ms | 9.805s |

計測コピーも2責務×3runで6成功・0失敗、対象時間2501/1624、1243/936、1265/1232ms。プロセス実時間にはcollect/transform/environmentが含まれ、対象testの5000msと混同しない。全プロファイルと要約は `profile-final-summary.json`、コマンド・source/test SHAと実測は `targeted-final.json`。

これは局所対策後の単独反復成立の証拠であり、3回だけで根治や任意環境の安定性を保証しない。全check既定3回・worker1 2回、native連続履歴、独立レビューによる最終判断は統括資料へ引き継ぐ。未知のhost変動や実CIの再現性を成功扱いしない。
