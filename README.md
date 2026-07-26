# 世界のローディング画面博物館

コンピュータの「待ち時間」を伝えてきた9種類の表現を、動く展示として見比べる1ページのデジタル博物館です。

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

すべての展示はHTMLとCSSで構成しています。外部画像やGIFは使用していません。PC、タブレット、スマートフォンに対応し、OSで「視差効果を減らす」が有効な場合はアニメーションを停止します。

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
