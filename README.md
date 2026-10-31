# DIGITAL MOTION ARCHIVE

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

## 第3期：実用UI部品の観察室

Issue #41。既存215展示に、工程進捗・先読み進捗・引いて更新・注目位置・吸着対象・挿入予告付き並替の先行6部品を追加（221件）。同名待機部品を重複登録せず、用途・技術・性質を分けて検索できます。独自再構成と確認範囲は [第3期記録](docs/phase3-studies.md) を参照。後半6部品は次checkpointで追加します。
