## A. 総合判定
**PARTIAL**。今回のLayer Composer実装・自動技術検証はPASS。実機Safari・物理タッチ等の未検証を含めた総合評価はPARTIALとします。

## B. 限定マージ推奨
**YES（独立再受入後の今回の展示範囲に限定）**。Draft・未マージ・未公開を維持し、最終判断はユーザーへ委ねます。既存A5診断の解決を意味しません。

## C. GitHubと固定対象
- Issue #79 / Draft PR #80
- branch: `feat/79-layer-composer`
- HEAD: `6b1b32b6cd6d8684ab622043960277824925a348`
- tree: `9201452b568748c1bc7ddda6c3d383648d32ba9e`
- base main: `ab05ffa4e95a68bc387bcfbd04a16bad6e331a75`（最終確認でも不変）
- 変更32ファイル。製品HEADと証拠専用branchのcommitを区別しています。
- [変更一覧・検証台帳](https://github.com/tetsujisugimori-coder/Loading-museum/tree/d7e1327dadd49c1c4256b8f3b8783cfa2beffada/docs/layer-composer-evidence/6b1b32b)

## D. 実装と展示数
既存mainから独立実装し、267→**268展示**、**13室維持**、実用UI28→**29展示**。
独自Canvas教材3種（丘・太陽・葉）、追加/削除/複製/選択/順序/表示/ロック、X/Y/寸法/比率、透明度、Normal/Multiply/Screen、Undo/Redo/Reset、完成比較・PNG保存を実装。
作品座標は600×400で固定。CSS座標と分離し、選択枠は出力に含めません。最大20レイヤー・60確定操作履歴。マウス、明示的タッチ編集モード、数値、キーボードを提供。
新規runtime依存・外部画像通信・アップロード・永続保存は追加していません。
[操作・合成契約](https://github.com/tetsujisugimori-coder/Loading-museum/blob/6b1b32b6cd6d8684ab622043960277824925a348/docs/layer-composer.md)

## E. 合成・PNGの正確性
表示Canvasと保存PNGを別々にPNG復号し、600×400の全RGBAを完全一致照合。順序・非表示・透明度0/50/100%・3合成モードを検査。
小さな固定RGBA画像に対し、製品関数を期待値に再利用しない独立スカラー式で**576画素サンプル**を照合（Canvas量子化は2LSB以内、PNG往復は誤差0）。
独立担当は別の手計算1px既知値も検証し、375/1280px×DPR1/2×2ブラウザの**8条件**でブラウザごとの出力全画素hash一致を確認。異なるブラウザ間のアンチエイリアス完全一致は主張しません。

## F. ブラウザ・CI
- ローカル最終HEAD：Chromium/WebKit×375/390/765/1280×normal/reduced **16/16条件、272分類チェック**。32PNG・16trace。
- 新CI：同じ16条件を8jobsに分割し、全jobs成功。ローカル結果とは別の証拠です。
- lint、型検査、production build、**696名前付き試験（Vitest584＋Node112）PASS**。このうち新規モデル/UI42＋証拠検査34。既存lint警告2件は残存し、新規エラー0。
- 最終HEADに関連する**12 workflows成功**。新Layer Composer workflowはPR headを明示checkout。他の既存workflowのmerge-ref実行はexact-head検証と区別。
- [新CI・8原artifact](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099303)

## G. 保全・故障対照
既存practical実装/public資産53ファイル、既存data21ファイルと画像4記事を独立照合。既存PR70/72/74/76/78のHEAD・実験証拠・判定基準は未変更。既存登録検査は新1件分のみ更新。
不正数値、欠落画像、描画context失敗、PNG出力失敗、古い非同期出力、取消・late pointerup、Undo後の新編集、件数の不正型、欠測・hash改竄、古いHEAD/tree/buildを負対照で拒否。
clean build wrapperがHEAD/tree/sourceと全outのhashを記録し、検証前に再照合します。CIartifactには全out自体は含まず、そのhashはmanifestと実ジョブログの整合性までが独立確認範囲です。

## H. 指摘と修正
- P2-01：native透明度rangeを枠外で離すとpending残留。input pointer captureだけでは直らず、対象pointer IDに限定したwindow終了/取消処理で修正。同じChromium/WebKit反例とlate入力を再検証。
- P2-02：証拠検査が文字列/Infinity件数、case別ファイル欠落を受理。厳密な数値件数・export/screen/trace完全セット・hashを必須化し同じ反例を拒否。
- P2-03：WebKit selectが暗背景・暗文字。展示に限定したcolor-scheme:lightで修正し、最終375/1280実画像を独立目視。
- P1なし、未解決P2なし。P3残余：interactive canvasのrole=imgと支援技術実機検証は未確認。数値・ラベル付き操作代替は提供。
旧ローカル並行試行のTarget crashed、旧HEADのtimeout、初期登録期待値失敗は成功数へ算入せず保存。原因未確認のクラッシュを製品解消済みとも扱いません。最終clean HEADの完走と分離しました。

## I. 未検証・UNKNOWN
物理iPhone Safari、物理タッチ/キーボード、VoiceOver、OSレベル文字拡大はNOT_TESTED。CSS200%検査と実機文字拡大を混同しません。WebKit自動tap・合成pointercancelは実機native drag/cancelの証明ではありません。
A5 native range/pointercancelおよびIssues #44/#54の継続課題は未解決。PNG生成をOS保存完了と誤認させません。

## J. 次工程と証拠
実機Safari/VoiceOverでタッチ編集とページスクロール、キーボード代替、PNG保存を検証。既存A5原因診断は別工程で継続。外部画像やプロジェクト永続保存は別の要件・安全性検討とします。
[独立原証拠ZIP](https://github.com/tetsujisugimori-coder/Loading-museum/blob/d7e1327dadd49c1c4256b8f3b8783cfa2beffada/docs/layer-composer-evidence/6b1b32b/independent-evidence.zip)
SHA256: `acb92f4fabed272ed3fa73bc616e1a7452380aace2dd3591900a865944dd2ee4`。GitHubから再取得し一致確認済み。旧HEAD別・注入検証・最終実画面を分離。パスを伏せたログはその旨明記。
[ローカル最終原report](https://github.com/tetsujisugimori-coder/Loading-museum/blob/d7e1327dadd49c1c4256b8f3b8783cfa2beffada/docs/layer-composer-evidence/6b1b32b/local-browser-report.json) は読戻しSHA256 `6e1777f04ae31b13d3ea934fdc8b08e94e9c066db4c80df0192f8dbeb5d87c4b` 一致。

### 最終workflow一覧
- Verify Pan and Zoom: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099296 (success)
- WAAPI Stage 2B timing: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099292 (success)
- Physics lifecycle RED to GREEN: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099294 (success)
- Verify practical phase 5B: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099300 (success)
- WAAPI Stage 2A integration: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099301 (success)
- Flash Then & Now phase 2: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099289 (success)
- Verify museum and practical UI: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099408 (success)
- Regression timing reacceptance: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099302 (success)
- Verify Before After Compare: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099290 (success)
- Verify Image Annotation: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099297 (success)
- Verify Layer Composer: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099303 (success)
- Verify Image Crop: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099295 (success)


### 正式独立再レビュー
[独立レビュー（全文投稿後に読戻し確認）](https://github.com/tetsujisugimori-coder/Loading-museum/pull/80#pullrequestreview-5831216991)：総合PARTIAL、検証範囲PASS、限定マージ推奨YES。実装担当と別の担当がGitHubから最終HEADを取得し、8原CI ZIPのdigest、HEAD/tree/source、boundログのoutputHash、32PNG復号、576oracle画素、16traceを再確認しました。
