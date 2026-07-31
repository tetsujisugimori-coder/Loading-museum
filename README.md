# デジタルアニメーションミュージアム

Digital Animation Museumは、ローディング画面やカーソルなど、画面上の状態と操作を伝えてきたデジタルアニメーションを収集し、HTML、CSS、JavaScriptで再現する1ページのミュージアムです。

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

常設展示の下に、開閉できる「MS-DOS・PCコマンドライン展示室」があります。文字を切り替える8種類の待機・進捗表現と、それぞれの分類、解説、再現方法を収録しています。

「Linux / UNIX 展示室」では端末上のログイン、起動、サービス管理、パッケージ操作、コンパイルの表示を再構成しています。

「カーソル展示室」では、標準矢印、リンク用の手、Iビーム、待機、禁止、ドラッグ、クリックエフェクト、残像の8展示をマウスまたはタッチで体験できます。形状は特定OSや製品の画像を使わず、CSS図形とPointer Eventsで抽象化しています。

展示はHTML、CSS、JavaScriptで構成し、外部画像やGIFは使用していません。PC、タブレット、スマートフォンに対応し、OSで「視差効果を減らす」が有効な場合はアニメーションを停止または最小化します。

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
