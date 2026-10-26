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

### Menu / Coin 観察モード（Stage 2A）
対象2カードの「観察モードを開く」で、本体とは独立したプレビューを操作します。再生／再開は停止位置から、最初から再生は0msから。一時停止、前後1000/60msの仮想ステップ、時間スライダーで途中・終了後の巻戻しを観察できます。これは実ディスプレイの60Hz保証ではありません。表示は0〜durationに制限した観察位置、取得したnative currentTime（小数2桁、nullは未取得）、controller状態と実Animation.playStateを分けます。一時停止は入力時のnative時刻を固定し、pending中の進行で停止位置が変わらないようにします。状態確定後のcontroller finishedは観察位置の終端を表すため、native playStateがpausedでも両者は矛盾しません。

Menuは独立CONTINUE→SETTINGS移動をease-out／linearで比較。本体の選択は変わりません。Coinの終点到達は加点ではなく、通常COLLECTだけがResetごと1回100点を確定します。獲得済み状態はモード往復でも維持します。「観察位置を先頭へ」は観察だけを戻し、本体のResetとは別です。

画面外・タブ非表示・閉室・モード終了では観察演出を取消します。画面外・タブ非表示からの復帰は停止した位置で待機し、自動再開しません。観察モード終了・閉室・検索による除去は観察を破棄し、次の観察は0msから停止状態で始まります。動き低減中は連続再生を無効化し、手動seek／コマ送りで確認できます。幅や文字寸法変更でも保持時間で再構成・停止します。WAAPI非対応は利用不能と表示します。[設計と検証範囲](docs/maintenance/waapi-game-stage2a-20261025.md)。


2026-10-26 追加検証による補足：一度観察した通常Coinは、そのカードが閉室などで破棄されるまで自動デモを再開せず、Replay/COLLECTで再生します。Resetも自動再生を復活させません。閉室再開は従来どおり選択・得点を初期化します。追加検証時点では、観察から通常へ戻った後のCoinで、Replay/COLLECT途中の動き低減ONが旧Animationを取消さない問題を独立再現しました（得点は維持）。当時の未修正判定は、[追加検証・マージ判断](docs/maintenance/stage2a-verification-20261026/README.md)を参照してください。

2026-10-26 N2修復：通常Coinの低減ON取消を自動デモの許可条件から分離しました。観察後の自動再生抑止、Replay無加点、COLLECTのResetごと1回100点、明示操作の低減用表示は保持します。Q1のgallery試験は問い合わせ範囲と独立した検証責務を整理し、5000ms・既存期待値を維持しています。ただし反復全checkでtimeoutが残るためQ1は未解決P2、総合PARTIAL・マージ推奨NOです。[修復の証拠・品質ゲート・保証範囲](docs/maintenance/stage2a-repair-20261026/README.md)。
