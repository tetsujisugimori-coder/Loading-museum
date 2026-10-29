# 現代アニメーション第1期：調査と実装

2026-10-30 / Issue #37

原典の記事を参照し、コードと画像・音源は複製していない。原典の各リポジトリの利用許諾は本実装への転載許諾として扱わない。作品は独自CSS図形とWeb Audioの正弦波で構成し、Blender製アセットはない。実行環境でBlenderコマンドは見つからなかった。Blenderによる事前メッシュは複雑な折り目を表現しやすいが、制作と配布資産が必要。今回は依存と容量を抑えるCSS近似を採用し、実物理や屈折を再現したとは扱わない。

| ID | 原典・著者 | 原典の技術と動作 | 今回の差・残課題 |
| --- | --- | --- | --- |
| unwoven | [Unwoven / Clément Grellier](https://tympanus.net/codrops/2026/09/05/building-an-infinite-loom-unravelling-images-into-threads-with-three-js/) | Three.js、独立リボン、画面端で解体 | 独自グラデーションとCSS帯。写真、連続スクロール、曲面は未実装 |
| paper | [Paper Crumple / Toi Nagasawa](https://tympanus.net/codrops/2026/09/19/crumbled-paper-houdini-vat-threejs/) | Houdini VAT、Three.js、cannon-es、ドラッグと投擲 | CSSの折り目と遠近変形。メッシュ、慣性、投擲、衝突は未実装 |
| lens | [Square Lens / Tomoyuki Nakata](https://tympanus.net/codrops/2026/08/25/building-a-mouse-following-square-lens-effect-with-three-js-and-glsl/) | Three.js/GLSL、色と屈折、RGB分離 | CSSマスクと拡大の近似。物理的屈折、分離量の制御は未実装 |
| drift | [A Drift / Robert Aperios](https://tympanus.net/codrops/2026/10/13/scroll-driven-ghost-trails/) | Canvas、GSAP、Three.js、スクロール軌跡 | CSS輪郭文字の重ね合わせ。スクロール連動と文字ごとの波変形は未実装 |
| glass | [Glass Xylophone / Sujen Phea](https://tympanus.net/codrops/2026/08/04/building-an-endless-interactive-glass-xylophone-with-three-js/) | Three.js、ガラスシェーダー、螺旋、流体と音 | CSS半透明の棒とWeb Audio正弦波。無限螺旋、流体、屈折は未実装 |
| clip | [Clip Menu / Codrops](https://tympanus.net/Development/EaseReverseClipMenu/)・[参考リポジトリ](https://github.com/codrops/EaseReverseClipMenu) | GSAP easeReverse、clip、途中反転 | CSS clip-pathと異なる開閉曲線。速度・曲線選択は未実装 |

6件はいずれも第一段階の部分完成。既存WAAPI Menuと比較できる。データのIDとタグは共通配列に置き、将来トップ候補が同じデータを参照できる。実機iPhone SafariとWebGLは未検証（今回WebGL依存なし）。

## 検証記録（初期段階）

2026-10-30 JST、ローカルEdgeで展示室を開き、Unwovenを選択、紙・レンズ・文字・楽器を順に選択し、楽器の「音を有効にする」と1番の打鍵、Clip Menuの「開く」による展開状態を確認。打鍵の可聴性、連続操作、画面幅375/390、iPhone実機は未確認。独立コードレビューでレンズ枠、停止、検索結果、音声エラー、タップ幅、件数の指摘を受け修正。修正後の全項目の独立再レビューは未完了。
