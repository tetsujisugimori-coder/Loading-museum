# DIGITAL MOTION ARCHIVE

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

「Macintosh誕生展示室」は、1984年の初代MacintoshからSystem 7までを扱う18展示です。電源投入、状態表示、フロッピー読込、Finder、ウィンドウ、メニュー、MacPaintへ進む導入体験の後、フォント、ピクセルアイコン、System 1〜6、MultiFinder、System 7、Balloon Help、機種変遷、カラー化、独自合成音、Apple IIからGUIへの転換を、マウス・タッチ・キーボードで操作できます。

「カーソル展示室」では、標準矢印、リンク用の手、Iビーム、待機、禁止、ドラッグ、クリックエフェクト、残像の8展示をマウスまたはタッチで体験できます。

独立した「Flash特別展示室」では、Flashが何だったかを解説する常設展とは役割を分け、Flashが生んだ動きと操作感を18カテゴリ・54展示で体験できます。8姿勢を選べるフレーム・バイ・フレーム、文字単位のロゴ集合、ビート検出、段階広告、スプライト走行、コンボ数字、seed付き線画、言葉を組み替える詩、制作補助としてのオニオンスキンなど、代表展示には固有の状態と操作を用意しました。CSS、SVG、Canvas、Pointer Events、Web Audio APIなどで再構成し、全体では常設展示を含む133種類の表現を掲載しています。

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
