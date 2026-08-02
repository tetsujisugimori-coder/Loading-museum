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

常設展示の下に、開閉できる5つの年代・操作展示室と、独立したFlash特別展示室があります。「MS-DOS・PCコマンドライン展示室」「Linux / UNIX 展示室」「消えたOS展示室」では、文字端末やClassic Mac OS、BeOS、NeXTSTEP、Palm OS、webOS、Windows Phoneの待機・起動・読込・同期・更新表現を収録しています。

「Apple創成期展示室」は「Apple IからApple IIへ」を主題に、1976〜1979年の文字・カセット・カラー・ディスクの状態表現を13展示でたどります。Apple Iでは周辺機器を組み合わせる構成、Monitor入力、Apple Cassette Interfaceの信号経路、文字スクロールを扱い、Apple IIでは電源投入、BASIC、外部レコーダーのSAVE成功・LOAD成功・LOAD失敗、ローレゾ／ハイレゾ描画を扱います。Disk IIでは外から見える挿入・アクセスランプ・画面変化と、トラックやヘッドを示す教育用の内部概念図を分離しました。各カードは「史料ベース」「概念再構成」「創作比較」に分類し、観察点と短い操作案内を常時表示し、技術背景・史実・注意事項・出典は「詳しい解説」へ収めています。

「カーソル展示室」では、標準矢印、リンク用の手、Iビーム、待機、禁止、ドラッグ、クリックエフェクト、残像の8展示をマウスまたはタッチで体験できます。

独立した「Flash特別展示室」では、Flashが何だったかを解説する常設展とは役割を分け、Flashが生んだ動きと操作感を18カテゴリ・54展示で体験できます。8姿勢を選べるフレーム・バイ・フレーム、文字単位のロゴ集合、ビート検出、段階広告、スプライト走行、コンボ数字、seed付き線画、言葉を組み替える詩、制作補助としてのオニオンスキンなど、代表展示には固有の状態と操作を用意しました。CSS、SVG、Canvas、Pointer Events、Web Audio APIなどで再構成し、全体では常設展示を含む115種類の表現を掲載しています。

第18カテゴリ「Flash表現は現代Webへどう引き継がれたか」では、技術名を対応づけるだけでなく、同じ動きや同じ入力を左右で実演します。Flashがタイムライン、入力、音、描画を一つの制作環境へ統合した強みと、現代Webがそれらをプラグイン不要のブラウザ標準へ分け、DOM、モバイル、検索、アクセシビリティと連携しやすくした強みの両方を比較できます。

展示はHTML、CSS、JavaScriptで構成し、外部画像やGIFは使用していません。歴史的特徴を教育・研究目的で再構成した非公式展示であり、実際のスクリーンショット、企業ロゴ、製品アイコン、起動音は転載していません。PC、タブレット、スマートフォンに対応します。展示室全体・展示単位・画面外・タブ非表示・展示室を閉じた状態で継続アニメーションを停止し、OSで「視差効果を減らす」が有効な場合は代表フレームへ切り替えます。音声を使う展示は初期ミュートで、利用者が開始または明示的に有効にした合成音だけを再生し、自動再生しません。

Apple創成期展示室の史実説明は、Computer History Museum所蔵のApple-1 Operation Manual、Apple II Reference ManualとDisk II Manual、Smithsonian所蔵のApple I Cassette Interfaceを主な参照資料としています。

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
