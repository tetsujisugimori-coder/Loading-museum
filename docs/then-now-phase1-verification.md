# Flash Then & Now 第1期 — 自己検証と独立レビュー引継ぎ

Issue: https://github.com/tetsujisugimori-coder/Loading-museum/issues/50

## 対象と同一性

- 開始main `e75e74be3d6b3620c785c4b60c6823bf2080cb7f` / tree `7cc586b689afcd5c29259b5334b90f3db14e795d`。再fetchでも不変。#14/#49 merged、#36は未統合で混入なし。
- 専用checkout `task-2/loading-museum`、branch `feat/flash-then-now-phase1`。既存checkout/未コミット作業は変更しない。
- 前半commit `02f3976`、後半 `d69ae56`、紙鳥の低減時手送り `e24aa79`、音の実解析を厳格に確認するprobe `f26dfb7`。
- 最終製品単体検証はe24aa79、最終matrixの実行HEADは各results.jsonに記録。以降の提出差分は報告/証拠と補助probe/CI登録で、製品ファイルのSHAはresults.jsonから再照合できる。提出の最終HEAD/treeとCI URLはPR本文/通常コメントへ記録する。

## 登録の実測と保全

`inventory-final.json`：**Flash60・18カテゴリ、全館251・13室**。新設展示室なし。6つのThen/Nowペアを各一展示として、既存vector/character/type-logo/physics/site/audioへ分類。

既存54展示の全フィールドのJSON digest `79937099bb71d7631029211365c11e704830bca01423b0cd8958691353d12831`、18カテゴリのdigest `3fb7ebcebe39ddc9af1f7f371361267af37e30d7de6179cbb8ca338381d88488` を登録試験で一致確認。既存IDの削除・変更なし、新旧60IDは一意。

Git treeメタデータ照合では基準718blob中707不変、旧path変更11件は登録、統合、件数assert、README/LOG、証拠改行保護、追加CIだけ。既存Flash描画2ファイル・globals・page・他室データ・WAAPI・lockfile・公開workflowを保全。過去docs578pathもblob不変。保留4B証拠原本/ZIPは展開・読取・転送・再パッケージ化しない。この静的保全を全展示の実操作成功とは呼ばない。

## 作品の完成範囲と美術上の自己レビュー

| 作品 | Then / Now | 固有操作・発見と旧作との差 |
|---|---|---|
| Vector Morph | 24段階の簡潔な輪郭 / 対応点を編む幾何 | 星/円の切替、進行位置、対応順、ガイド。既存自動morphと違い、同じ終点へ違う中間輪郭で至る。点のずれで輪郭が縮み直す発見を主役にした |
| Cursor Creature | ゆったりした相棒 / 間合いを取る紙鳥 | 独自の角張った頭・翼・足・瞳。注視/追従/回避、速度と距離、合図、左右/矢印/一歩。丸い点列や目玉だけの追従と異なる人格。低減時も手送りで反応を比較 |
| Kinetic Typography | MOTIONの文字入場 / LISTEN・EXPANDの意味と字間 | 6文字の独立位相、二構成、語/字間/時間位置。固定ロゴ集合や逐字表示と違い、字間と意味を利用者が振り付ける。途中のずれも作品として読める |
| Physics Playground | 単体の弾み / 同質量二体の衝突 | drag/capture/release、keyboard、重力/反発/摩擦、1刻み、Reset、速度線/E。既存バネ追従に加え、条件を変えた衝突結果を観察。天井/床/左右の描画と有界範囲を揃えた |
| Interactive Intro | 定時シーン＋分岐 / 入力で構図を組む | 有限scene0〜4、線/点分岐、Skip/Replay/本編操作。既存のSTART→ENTERより、途中選択が本編の構図へ持ち越される。Nowはfadeを重ねず、要素数と配置を段階的に構築 |
| Sound Reactor | 実波形と棒 / 帯域ごとの屋根 | 独自三角波、Hz/音量、ミュート/停止、実FFT/RMS。既存BPMピークと違い、音高の位置と音量の高さを分けて観察。無音時に架空の動きを足さない |

ThenもNowも現在のSVG/DOM/React/TS/RAF/Pointer Events/Web Audioによる独自制作。新規ライブラリ/画像/楽曲/ロゴ/キャラクター転載なし。Flash Player/SWFなし。色だけで区別せずThen/Now見出しと説明を併記し、平面・明快な輪郭・硬質な幾何を維持した。Thenに一律の性能不足、Nowに一律の優位を与えていない。

各カードは共通開始/停止・Resetと固有操作、内部状態、意図、資料、限界を備える。PC二列、700px以下は上下。操作44px、native rangeと名前、focus表示を確認。初期停止、画面外RAF停止、非表示/閉室の破棄、音は明示再開始。低減時は自動移動を抑え、途中位置/1刻み/一歩/手動scene/穏やかな計測図を残す。

## 単体・buildと失敗履歴

- 最終製品：lint、TypeScript、Pages向け通常静的build、**302成功/0失敗/0skip**。既存281＋追加21（前半7/後半11/登録3）。Node49＋Vitest147/32/25/20/8/21。Windowsでworker環境変数4種を1にした診断。原テスト/5秒/CI既定並列は変更しない。
- 初回既定並列はNode49成功後、旧WAAPI147のうち146成功/1件5000ms timeoutでチェーン停止。後続群はそのrunでは未実行。原11試験単独成功、直前HEADの全299/301成功も別ログ。既定並列の根因解消とはしない。
- 低頻度frame時計は同じ入力/期待/期限で1 RED→1 GREEN。選択実行の他9未実行を成功に数えない。250msのcatch-up上限と、物理100ms/1/120秒substepを分離。
- 音APIなし、resume拒否、古いresumeの失効、close/unmount、物理12,000刻み、点対応、途中形状、文字位相、分岐/終端を追加単体で確認。mock音を実音解析と呼ばない。
- 初回のrangeラベル、停止中の手動入力、WK開始未成立、pointerleaveの同期読取、旧比較CSS変数の誤認、既存タイトルmarkerの誤集計、音API欠如の各履歴は `then-now-evidence/README.md` と原結果へ保持。未完走を完走へ読み替えない。

## ブラウザとCIの読み方

最終の `final-browser/results.json` は36条件完走、33成功・3 PARTIAL（Ch/WK×375/390/1280×6作品）、child runner exit2。pageerror/横超過/新作由来保存/閉室後RAF残留0。旧Flash補助probeはCh6成功、Windows WKは最初のロゴ操作前のgeometry/hit待ちが8秒timeout、後続5未実施。`legacy-flash-hit-confirmed/results.json` が最終の診断結果。原テスト/旧製品/8秒/期待状態は変更せず、成功へ読み替えない。`pointer-dynamics/results.json` は距離/実ポインター速度の補助2条件とも成功。近接約2000px/sでThen WATCH/Now RETREAT、遠方WATCH、領域外REST。前半/後半/最終の重複を固有件数へ合算しない。

Windows WebKit26.0では標準/接頭辞AudioContextとも未提供。不可表示の確認と音正常系のNOT_TESTEDを分け、ローカル許容モードは該当caseをPARTIAL、runner exit2にする。CIではこの許容を設定せず、ネイティブのFFT/RMS・音量/音高・ミュートを必須にしている。

実音量低下は非ゼロRMSの低下、ミュートは発音graphがrunningのままRMS低下、音高は帯域移動で判定。実音のThen/Now PNGを計測中に採取する。全体cardの停止後PNGを発音中の証拠に読み替えない。保存は新作分0。既存タイトルのsessionStorage marker書込は総件数にも別件数にも残す。

CIは既存5jobを維持し、新規Ch/WK2jobを追加。Playwright1.56.1をアプリ依存外で固定。旧browser3本の変更は表示件数245→251のみ。既存操作assert/期限を緩和しない。CI成功/ローカル自己検証/独立レビューは別の証拠。最新CIの完走とジョブ内件数はPR本文/通常コメントを参照。

## 独立レビュー重点・未検証

1. 6作品が旧作の名前替えや一律の豪華化になっていないか。Thenの魅力、Nowの編集判断、途中状態の面白さ。
2. 点対応と時間位置、紙鳥の距離/速度/退避解除/低減時手送り、文字の位相と意味/字間。
3. 物理のcapture/cancel/高速連打/閉室、境界と衝突、有限値。精密物理/完全エネルギー保存は保証しない。
4. Introの自動/入力進行、粗いframe、分岐/Skip/終端/Replay。元のWindows環境遅延全体の根因はUNKNOWN。
5. 実解析と無音/音不可を区別。開始競合、世代失効、共通停止/画面外/閉室のAudioContext/RAF解放。
6. 既存54件・18カテゴリ・継承比較・他室/WAAPI/過去証拠の保全。静的数と実操作の範囲を混同しない。

実iPhone/Mac Safari、VoiceOver、物理touch drag、OS設定の実切替、実スピーカー聴取、全館全操作はNOT_TESTED。Playwright模擬幅/tap/mouse drag/keyと区別。Issue #44の既存依存警告とWindows WAAPI timeout根因UNKNOWNを維持する。

独立レビューは未実施。提出はDraft・未マージ・未公開。自己検証による独立PASSの代用はしない。マージ/auto-merge/Draft解除/本番公開は依頼者の判断まで行わない。
