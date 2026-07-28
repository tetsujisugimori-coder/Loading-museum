# 世界のローディング画面博物館

コンピュータの「待ち時間」を伝えてきた9種類の常設展示と、時代別展示室を見比べる1ページのデジタル博物館です。

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

常設展示の下に、開閉できる「MS-DOS・PCコマンドライン展示室」「Linux / UNIX 展示室」「消えたOS展示室」があります。文字端末の待機・進捗表現に加え、Classic Mac OS、BeOS、NeXTSTEP、Palm OS、webOS、Windows Phoneの起動・読込・同期・更新中の表現を収録しています。

展示はHTML、CSS、JavaScriptで構成し、外部画像やGIFは使用していません。歴史的特徴を教育・研究目的で再構成した非公式展示であり、実際のスクリーンショット、企業ロゴ、製品アイコン、起動音は転載していません。PC、タブレット、スマートフォンに対応し、OSで「視差効果を減らす」が有効な場合はアニメーションを停止または最小化します。

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
npm run lint
npm run typecheck
npm test
```

静的ファイルは `out/` に出力されます。

## GitHub Pages

`main`へのpush後、GitHub Actionsが静的サイトを自動公開します。

公開URL: https://tetsujisugimori-coder.github.io/Loading-museum/
