# DIGITAL MOTION ARCHIVE

## 第6期A-4：Image Annotation & Hotspots（Issue #67）

「画像へ意味を付ける」を既存実用UI室へ1展示追加。**267展示・13室、同室28展示**。独自の島の観察図と装置図にピン・矢印・矩形・説明文を追加し、ドラッグ・数値編集・関連付け・削除・Undo/Redo・順次ガイドを体験できます。

[設計・操作・座標契約](docs/image-annotation.md)／[検証台帳](docs/image-annotation-evidence/README.md)。画像の比率を保ち、余白への入力を拒否。編集/閲覧、取消、キーボード、狭幅、reduced motionに対応。ブラウザ内のみで動作し、保存やアップロードはありません。独立レビュー前は**マージ推奨NO・Draft維持**。以下の過去件数は当時の履歴です。

## 第6期A-3：Before / After Compare（Issue #65）

既存実用UI室へ「Before / After Compare / 画像の変化を見比べる」を追加。**266展示・13室、同室27展示**。同じ座標の独自SVG2組をSplit、Overlay、並列で比較し、反転・自動比較・一時停止・再開・Replay・Resetを操作できます。キーボード、ハンドルのタッチ操作、reduced motionに対応。「画像編集・比較」で検索できます。

図版は架空の港の修復と窓辺の色補正を模した教材です。実写真・歴史資料ではありません。[操作契約と検証](docs/before-after-compare.md)／[自己検証・独立レビューの証拠](docs/before-after-evidence/)。以下の過去各期の件数・判定は当時の記録として保持します。

## 第6期A-2：Image Crop（Issue #63）

既存実用UI室へ「Image Crop / 構図を切り取る」を1展示追加。**265展示・13室、同室26展示**。家・花壇・橋・木立の独自SVGを切抜き枠で選び、編集中のプレビューと確定結果を比較できます。枠内移動、四隅伸縮、自由／1:1／16:9／4:3、数値適用、方向ボタン、専用キーボード、確定・取消・Reset。元絵は保持し、追加依存・保存・書出し・通信はありません。

[設計・補正規則・自己検証・引渡し](docs/image-crop-studies.md)／[証拠台帳](docs/image-crop-evidence/README.md)。自己検証と独立レビューを区別し、**独立レビュー前のマージ推奨NO・Draft維持**。実機Safari／VoiceOverなどは未検証。#29/#44/#54を今回成功で解消しません。以下の展示数は各時点の履歴です。

## 第6期A-1：Pan & Zoom（Issue #61）

既存実用UI室へ「Pan & Zoom / 拡大して探す」を1展示追加。**264展示・13室**。観測所・庭・小道の独自SVGを、倍率・位置・ミニマップの窓を比べながら探索できます。＋/−、数値、ドラッグ、方向ボタン、専用領域の矢印、全体表示、Reset、5つの目印一覧。タッチはページscroll優先の初期OFFと明示的移動modeを切替。外部画像・実通信・保存・新規依存なし。

[方式・取消・検証・独立レビュー引継ぎ](docs/pan-zoom-studies.md)。自己検証は独立レビューではありません。Draft維持・独立レビュー前のマージ推奨NO。実機Safari/VoiceOver/OS capture喪失と既存UNKNOWNは未解消。以下の展示数は各期時点の記録です。

## 実用UI 第5期B（Issue #59）

Kanban Board / Node Flow Editor / Schedule Grid / Diff Viewer / Theme Studio / Shortcut Recorder を既存の実用UI室へ追加。**263展示・13室**。配置・履歴・関係・時間・版・設定を、データと表示の両方から観察できます。保存・実通信なし。

[設計と独立レビューへの引継ぎ](docs/phase5b-studies.md)。自己検証と独立レビューは別に記録し、レビュー完了までDraft維持・マージ推奨NO。以下の過去の展示数は各期の記録です。


## Flash Then & Now 第2期（Issue #57）

既存Flash室に6作品を追加。**全館257展示・Flash66展示・13室**。Mask Theatre、Elastic Navigation、Parallax Stage、Frame-by-Frame Lab、Isometric Explorer、Preloader TheatreをThen / Nowで操作・比較します。各組を1展示として数え、既存60作品は維持しています。

Thenだけ／Nowだけ／比較、共通開始・停止・Resetと作品固有の編集・探索を用意。過去と現在を優劣で並べず、幕、メニュー、舞台、作画、箱庭、待ち時間の異なる美意識を楽しむ独自制作です。

[設計・独立レビュー引渡し](docs/flash-phase2-design.md) / [重複と登録監査](docs/flash-phase2-inventory.md)。検証の実測は提出記録を参照。実機Safari・VoiceOver、既知#29/#44/#54を完了扱いしません。

## WAAPI Stage 2B 判定時間軸（Issue #55）

Perfect Parry／Dodge Afterimageに、通常ゲームと独立した入力シミュレーションと観察時計を追加。420〜680msの両端を含む成功窓、確定入力・結果、入力後420msの演出を別々に表示し、再生・一時停止・再開・seek・前後ステップで比較できます。確定した判定は巻き戻しで変わりません。Dodgeの残像は現行どおり3枚の固定輪郭で、成功の根拠ではありません。

[設計・自己検証・独立レビューへの引継ぎ](docs/maintenance/stage2b-timing-20261103/README.md)。展示の追加はなく251展示・13室を維持。Issue #54の旧未検証とIssue #44の依存課題は未解決のままです。

## WAAPI Stage 2A 現main統合（Issue #35）

Menu Selection Cursor／Coin Pickup Arcに、通常の選択・得点から独立した観察プレビューを追加。再生・一時停止・再開・seek・前後1ステップを操作できます。Coinは通常モードの明示COLLECTだけがResetごとに100点を確定します。Stage 2A統合時の251展示・13室と後続展示を保持しています。

[統合方針・ファイル別判断・検証と引継ぎ](docs/maintenance/stage2a-main-integration-20261102/README.md)。PR #36の過去の限定GOは当時の条件の履歴です。今回の自己検証と独立再レビューを区別し、独立再レビュー前のマージ推奨はNOです。

## Flash Then & Now 第1期（Issue #50）

既存Flash展示室の6カテゴリ内へ、Then/Nowを一組とする6作品を追加。第1期完了時の登録は **Flash60展示・18カテゴリ、全館251展示・13室**。新しい展示室は作りません。過去と現在を優劣で並べず、異なる制作判断を操作して比べます。両方とも現代ブラウザによる独自制作です。

| 作品 | Then / Nowと観察できること |
|---|---|
| Vector Morph — 対応点の工房 | 簡潔な輪郭補間 / 対応点の順序編集。同じ終点でも異なる中間形状 |
| Cursor Creature — 紙鳥の間合い | 一対一の相棒 / 入力速度で後退する紙鳥。視線・追従・回避・合図 |
| Kinetic Typography — 文字の振付 | 文字の入場リズム / 言葉の意味と字間。時差・構成・途中位置 |
| Physics Playground — 反発の庭 | 単体の弾み / 二体の衝突。ドラッグ解放・重力・反発・摩擦・速度/エネルギー |
| Interactive Intro — 観測室への道 | 有限の定時シーン / 操作で組む構図。分岐・Skip・Replay・本編 |
| Sound Reactor — 周波数の建築 | 波形とスペクトル / 周波数帯域の幾何。独自合成音の音高・音量と実FFT/RMS |

各カテゴリの先頭で、共通開始/停止・Reset、各面の固有操作、内部状態、意図・資料・限界を確認できます。PCは横比較、スマートフォンは上下。動き低減中もスライダー・手動送り・キーボード等で観察できます。音は各面の明示開始だけで、停止・閉室では解放します。Web Audioがない環境では不可を表示し、架空の解析で代用しません。

[既存54件の現物表](docs/then-now-existing-inventory.md) / [調査・設計・一次資料](docs/then-now-phase1-design.md) / [自己検証履歴](docs/then-now-evidence/README.md)。既存の技術継承比較3作品も残しています。新規依存・外部素材・SWF実行なし。以下の各期の件数は、その公開時点の歴史的記録として保持します。

## 第5期A：データ操作・選択・探索（Issue #48）

既存239展示を保全し、Editable Data Table / Date Range Picker / Virtualized List / Filter Builder / Tree View / Multi-Select Chips の6展示を同じ部品室へ追加。現物集計は **245展示・13室**。架空データの編集・範囲・仮想化・条件式・階層・複数選択を実際に操作し、結果と内部状態を比較できます。実通信・外部保存はありません。

[採用差分・設計と制約](docs/phase5a-inventory.md) / [試験・未検証・独立レビューへの引継ぎ](docs/phase5a-studies.md)。以下の第4期以前の数字は各増築時点の記録として保持します。独立レビュー前の総合PASSやマージ承認を意味しません。

## 第4期B：操作・非同期・画面構成

Command Palette / Optimistic Action / Upload Queue / Form Wizard / Resizable Split Pane / Context Menu を既存の第4期部品室へ統合。登録現物は233＋6＝239展示、13室です。模擬操作だけを使い、外部アップロード・保存・送信は行いません。

[採用比較・参考資料](docs/phase4b-inventory.md) / [検証記録](docs/phase4b-studies.md)。先行更新と巻戻し、同時実行枠、取消と古い応答の失効、画面端補正、キーボード・focusの関係を操作して観察できます。実機未検証とIssue #44の依存警告は継続します。

## 第4期A：通知・入力・検索・画面切替

常設展に Toast Stack / Undo Snackbar / Inline Validation / Search Suggestions / Sliding Tabs / Animated Accordion の6部品を追加。基準mainの登録227展示を再集計し、今回で233展示・13室です。第4期Bの空展示は含みません。

各部品は操作結果と途中の位置・幅・高さを観察する独自再構成です。通知は最大4件、Undoは最後の1操作を5秒保留。停止・画面外・タブ非表示では期限を停止し、動き低減でも操作結果は保持します。入力は日本語IME変換中の警告を抑え、候補・タブ・見出しにキーボード操作を用意。Resetと閉室は古い処理を破棄します。実保存・通信・データ削除はしません。

[採用理由・既存展示との比較・一次資料](docs/phase4a-inventory.md) / [検証・限界・証拠](docs/phase4a-studies.md)。依存関係のcritical警告は[Issue #44](https://github.com/tetsujisugimori-coder/Loading-museum/issues/44)へ分離し、解消済み・安全性PASSとは扱っていません。

## WAAPI標本ギャラリー

ページ内の「SPECIMEN CABINET / WAAPI」から47件の標本を開けます。Fade / Slideは手動再生、Button / Toggleは対象を直接操作、ゲーム14件は個別の入力と状態遷移、AI 6件は作業中だけ動く固有グリフとして実装しています。OSの `prefers-reduced-motion` 設定では反復や大きな移動を止め、文字・色・静的配置で同じ意味を残します。

DIGITAL MOTION ARCHIVEは、ローディング画面やカーソルなど、画面上の状態と操作を伝えてきたデジタルアニメーションを収集し、HTML、CSS、JavaScriptで再現する1ページのミュージアムです。

## 展示

1. CUIの回転文字
2. 点が増える表示
3. Windows風の砂時計
4. 初期WebのGIF風スピナー
5. Apple風の点が巡るスピナー
6. Windows Vista風の青い光
7. CSSの円弧スピナー
8. プログレスバー
9. スケルトンスクリーン

常設展示の下に、開閉できる6つの年代・操作展示室と、独立したFlash特別展示室があります。「MS-DOS・PCコマンドライン展示室」「Linux / UNIX 展示室」「消えたOS展示室」では、文字端末やClassic Mac OS、BeOS、NeXTSTEP、Palm OS、webOS、Windows Phoneの待機・起動・読込・同期・更新表現を収録しています。

「Apple I / Apple II 展示室」は、Apple IからApple II、Disk IIへ進む変化を扱います。実機未経験者向けの「はじめてのApple I / Apple II」入門ツアーに続き、「詳しく触る」の13展示を`利用者の操作 → 機器やデータの変化 → 画面・音・ランプの変化 → 結果`として観察できます。接続により機能が増えるApple I、再生操作で初めて鳴る初期ONの抽象カセット音、LIST／RUNを直接実行するBASIC、目的から選ぶSAVE／LOAD、3用途のハイレゾ線画、ディスク挿入から起動完了まで、4種類のDisk II待機タイムラインを収録しています。各カードは「史料ベース」「概念再構成」「創作比較」に分類し、現代の操作との近い考え方も、同一の仕組みではないことを添えて表示します。

「Macintosh誕生展示室」は、1984年の初代MacintoshからSystem 7までを扱う18展示です。電源投入、状態表示、フロッピー読込、Finder、ウィンドウ、メニュー、MacPaintへ進む導入体験の後、フォント、ピクセルアイコン、System 1〜6、MultiFinder、System 7、Balloon Help、機種変遷、カラー化、独自合成音、Apple IIからGUIへの転換を、マウス・タッチ・キーボードで操作できます。MacPaintでは白抜きの窓を選択して移動し、画像と選択枠をまとめてUndoまたは初期化できます。

「カーソル展示室」では、標準矢印、リンク用の手、Iビーム、待機、禁止、ドラッグ、クリックエフェクト、残像の8展示をマウスまたはタッチで体験できます。

独立した「Flash特別展示室」では、Flashが何だったかを解説する常設展とは役割を分け、Flashが生んだ動きと操作感を18カテゴリ・54展示で体験できます。8姿勢を選べるフレーム・バイ・フレーム、文字単位のロゴ集合、ビート検出、段階広告、スプライト走行、コンボ数字、seed付き線画、言葉を組み替える詩、制作補助としてのオニオンスキンなど、代表展示には固有の状態と操作を用意しました。CSS、SVG、Canvas、Pointer Events、Web Audio APIなどで再構成し、従来の150展示にWAAPI47標本を加え、全体では197種類の表現を掲載しています。

第18カテゴリ「Flash表現は現代Webへどう引き継がれたか」では、技術名を対応づけるだけでなく、同じ動きや同じ入力を左右で実演します。Flashがタイムライン、入力、音、描画を一つの制作環境へ統合した強みと、現代Webがそれらをプラグイン不要のブラウザ標準へ分け、DOM、モバイル、検索、アクセシビリティと連携しやすくした強みの両方を比較できます。

展示はHTML、CSS、JavaScriptで構成し、外部画像やGIFは使用していません。歴史的特徴を教育・研究目的で再構成した非公式展示であり、実際のスクリーンショット、企業ロゴ、製品アイコン、起動音は転載していません。PC、タブレット、スマートフォンに対応します。展示室全体・展示単位・画面外・タブ非表示・展示室を閉じた状態で継続アニメーションを停止し、OSで「視差効果を減らす」が有効な場合は代表フレームへ切り替えます。音声を使う展示は初期ミュートで、利用者が開始または明示的に有効にした合成音だけを再生し、自動再生しません。

Apple I / Apple II 展示室の史実説明は、Computer History Museum所蔵のApple-1 Operation Manual、Apple II Reference ManualとDisk II Manual、Smithsonian所蔵のApple I Cassette Interfaceを主な参照資料としています。

## 開発

Node.js 22.13以上を使用します。

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

静的ビルドと確認:

```bash
npm run build
npm run check
npm run lint
npm run typecheck
npm test
```

静的ファイルは `out/` に出力されます。

## GitHub Pages

`main`へのpush後、GitHub Actionsが静的サイトを自動公開します。

公開URL: https://tetsujisugimori-coder.github.io/Loading-museum/

## WAAPI状態整合の回帰検証

[2026-10-25修正記録](docs/maintenance/waapi-consistency-20261025.md)に5件の状態不具合・全館集計の原因と検証範囲を記録しています。Match-3は補充なしの有限盤面、Falling Blockは即時の配置・消去と残存行移動の簡略教材です。

実DOMブラウザ検査は `scripts/verify-waapi-browser.py`。既存のPython Playwrightと対応ブラウザが利用可能な環境で、static exportを `/Loading-museum/` に配信して実行します。`WAAPI_URL`、`WAAPI_BROWSERS`、`WAAPI_WIDTHS`、必要なら `WAAPI_CHROMIUM_PATH` / `WAAPI_WEBKIT_PATH` を指定できます。スクリプトはインストール・公開を行わず、利用不能環境をUNVERIFIEDとして報告します。通常npm checkとは別の検証です。

PR #32追加修正では、Match-3の3列4行盤面で「3行3列 ↔ 4行3列」の交換から5石→3石の2段連鎖・800点を実演できます。盤面・得点は即時確定し、各石の交換・消去・落下履歴を装飾レイヤーで再生します。再操作・Reset・動き軽減への途中切替では演出を取り消して確定盤面へ戻り、古いアニメーションから結果を変更しません。[追加設計・検証記録](docs/maintenance/waapi-cascade-motion-20261025.md)。

### WAAPI Game UI 状態整合（第1段階）
Menu照準は選択行へ追従。Parry/Dodgeの成功窓は開始後420〜680ms（両端を含む）で、動き軽減でも判定時間は変わりません。Battleの画面外中断はFIELDへ戻して明示します。Combatの軽減途中切替は演出を取消し結果を保持します。Coinの自動デモ/Replayは無加点、COLLECTまたはコイン操作でResetごとに1回100点を獲得します。得点は同期確定、軌道は補助演出です。[設計・検証範囲](docs/maintenance/waapi-game-stage1-20261025.md)。

## 現代アニメーション常設展（第1期）

6作品を原典から着想した独自の操作実験として収録。作品名・タグで絞り込み、選択した作品だけを表示します。独自のCanvas描画、手続き3D投影、CSSとWeb Audioの合成音を使い、外部画像・音素材・原典コードは含みません。音は利用者が有効化するまで無音です。紙・レンズ・ガラスは原典の物理・シェーダーを独自の近似へ置き換え、、作品ごとの説明に差を記載しています。詳細は [調査と限界](docs/modern-animation-phase1.md) を参照してください。

## 第2期A：表現実験

独立した展示室にStarfield Warp、Plasma Dream、Liquid Metaballs、Flocking Life、Pixel Dissolve、Tile Flipを収録。Canvasで描画し、図柄もコードから独自生成します。星の透視、波の重ね合わせ、陰関数、群れの近傍則、画素・タイル遷移を操作できます。原典のコード・素材を使用しません。動き低減時は自動再生を止めます。

第2期BではInfinite Tunnel、Raster Bars、Elastic Space、Kaleidoscope、Ink Bloom、Glitch Laboratoryを追加。Canvasによる独自の近似です。インクは流体計算ではなく半透明粒子、グリッチは強い点滅を伴わない画素ずれです。作品ごとの操作・原理・着想は展示内に記載しています。

## Image Crop 数値精度の補修（2026-11-05）

PR #64 P2-01では、最小枠の表示値をそのまま再適用しても構図が変わらないよう、入力表示と座標計算を共通化しました。入力の最小値・元絵境界は緩和しません。[方式比較](docs/image-crop-precision-design.md)・[新規検証と再レビュー引渡し](docs/image-crop-precision-verification.md)。265展示・13室・実用UI26展示を維持。独立再レビュー未完了の間はPARTIAL・マージ推奨NO、Draftを維持します。

## 第3期：実用UI部品の観察室

Issue #41。既存215展示に、工程進捗・先読み進捗・引いて更新・注目位置・吸着対象・挿入予告付き並替の先行6部品を追加（221件）。同名待機部品を重複登録せず、用途・技術・性質を分けて検索できます。独自再構成と確認範囲は [第3期記録](docs/phase3-studies.md) を参照。後半6部品は次checkpointで追加します。

第3期Bでは長押し・弾性・処理状態ボタン、時間差一覧、共有要素遷移、Crossfadeを追加し、同室12部品・全館227展示になりました。旧150/197の記載は各増築時点の内訳です。操作に応じた状態・描画を観察する独自教材で、実削除やネットワーク処理は行いません。差替判断・原典・UNKNOWNの歴史は [棚卸し](docs/phase3-inventory.md)、試験と残件は [作品別記録](docs/phase3-studies.md) に保持します。

第6期A-3の回帰検査再受入では、Flashの入力配送からの全点列照合と、Step Progressのscroll/Observer/DOM収束を検査します。固定待機の延長をせず、元の10秒以内で状態を確認し、通常検査への故障注入が非ゼロ終了することも確認します。[検査契約と旧REDの扱い](docs/regression-timing-reacceptance.md)。
