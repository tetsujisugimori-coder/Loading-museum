# 現代アニメーション第1期：調査と再構成

Issue #37。原典の記事と操作を調査し、原典コード・画像・音声は転載していない。新しい図、文字、メッシュ、音はコードで独自生成した。Codropsの[共通ライセンス](https://tympanus.net/codrops/licensing/)は特記なきダウンロードデモをMITとしているが、素材の扱いは個別に確認が必要。Clip Menuの[リポジトリ](https://github.com/codrops/EaseReverseClipMenu)はMIT表記で、画像・動画はMidjourney生成と記載されている。本展示はこれらを取り込まない。

Windows実装環境ではBlenderコマンドが見つからなかった。一方、親側のクラウド環境では /usr/bin/blender の存在が確認されており、全環境で不在という意味ではない。事前制作メッシュは複雑な折り目と材質を作り込める一方、アセットの制作・配布が必要。紙とガラスには後から親側クラウドのBlenderで独自制作したメッシュを採用し、Canvasで透視投影する。WebGLには依存しない。

| ID | 原典・著者 | 原典の技術と動作 | 再構成と差 |
| --- | --- | --- | --- |
| unwoven | [Unwoven / Clément Grellier](https://tympanus.net/codrops/2026/09/05/building-an-infinite-loom-unravelling-images-into-threads-with-three-js/) | Three.jsリボンが端で解体・再集合 | 独自の風景画を帯と短い断片に分け波打たせる。ドラッグ・ホイール・スライダー。原典の写真と無限カルーセルは含まない |
| paper | [Paper Crumple / Toi Nagasawa](https://tympanus.net/codrops/2026/09/19/crumbled-paper-houdini-vat-threejs/) | Houdini VAT、Three.js、cannon-es、投擲 | Blenderで制作した三角メッシュ、面の明暗と遠近投影、ドラッグ・重力・慣性。紙の塑性変形や自己衝突は近似しない |
| lens | [Square Lens / Tomoyuki Nakata](https://tympanus.net/codrops/2026/08/25/building-a-mouse-following-square-lens-effect-with-three-js-and-glsl/) | Three.js/GLSL、色、屈折、RGB分離 | 独自画像のCanvas画素をCPUでサンプリングし屈折と色ずれを作る。GLSLは使わない |
| drift | [A Drift / Robert Aperios](https://tympanus.net/codrops/2026/10/13/scroll-driven-ghost-trails/) | Canvas、GSAP、Three.js、スクロール軌跡 | 文字単位の波と輪郭コピー、内部スクロール、文字・残像数・変形を制御。原典の画像演出や音楽は含まない |
| glass | [Glass Xylophone / Sujen Phea](https://tympanus.net/codrops/2026/08/04/building-an-endless-interactive-glass-xylophone-with-three-js/) | Three.js、ガラスシェーダー、螺旋、流体と音 | Blenderで制作した角柱の透視投影、なぞりと音階ボタン、配置調整、Web Audio合成音。流体や実屈折は省略 |
| clip | [Clip Menu / Codrops](https://tympanus.net/Development/EaseReverseClipMenu/)・[参考リポジトリ](https://github.com/codrops/EaseReverseClipMenu) | GSAP easeReverse、clip、途中反転 | CSS clip-pathの途中反転と開閉別の曲線・時間。GSAP独自のeaseReverseそのものではない |

各作品は主な原理を操作できる独自再構成として実装。トップページの既存展示は維持し、6件の共通ID・タグ配列は将来のトップ選抜から参照できる。トップ候補はUnwoven、Glass Xylophone、Clip Menu。音声は明示有効化するまで無音。動き低減と画面外・閉室の停止に対応する。

## 動作確認記録

2026-10-30 JST、ローカルBlender素材統合前の版をEdgeで375px表示の紙の三角メッシュと投擲ボタン、390px表示のガラス8音ボタン・音声有効化・打鍵、レンズの色領域を確認。初期段階では全作品を選択し、Clip Menuの展開も確認した。デスクトップEdgeによる幅変更でありiPhone Safari実機ではない。ドラッグ・なぞりのタッチ実機、音の可聴性、全作品の連続操作や端末性能は未検証。画像単独では動作を証明できないため、操作内容をここに記録する。

2026-10-30 追加確認：Edge 390pxでUnwovenの分解量を35から80、A Driftの文字と軌跡を変更し、Clip Menuの時間を2000msに変更して連続開閉した。幅変更はデスクトップ検証で、iPhone実機やタッチ性能の証明ではない。

## Blender独自素材（2026-10-30）

親側クラウド環境のBlender 4.3.2で独自に作成した、紙と角に丸みのあるガラス棒のメッシュをCanvas表示用JSONとして使用。原典のコード・画像・モデル・テクスチャは取り込んでいない。WindowsでBlenderを実行したわけではない。制作元の `.blend`、GLB、生成・検証スクリプトおよびプレビューは [Library保存版ZIP](https://chatgpt.com/api/library/files/libfile_b1335ba1bf708191a122b2454fc41f40/download) に保全し、配信用にはJSONのみを収録した。

- ZIP：951,627 bytes、SHA-256 `3eb9ac373f01c16026db0feb097560c7ae56ee82d907ddb6c96f17efd8d5178e`。受取側でサイズとハッシュを照合し、Blenderのプレビューを確認。
- `paper.json`：SHA-256 `4cc78f1f508880f1b8932b534affeeed2230811d03a5bc8c102f42654b167472`。625対応頂点・1152三角面、平面から折れた器状への補間。閉じた紙玉、紙の自己衝突やHoudini物理の再現ではない。
- `glass-bar.json`：SHA-256 `2fdf775a316b2e8592f9f0a0b7c2c547fc763f0cfe3ff0e504da461bedf823b1`。X軸が長辺の96頂点・188三角面。ブラウザではCanvasによる近似的な透視と半透明表現であり、実屈折ではない。
- 素材側検証では有限値、頂点対応、三角面のindexと非退化、`.blend`再読込、GLB再取込時のshape keyを確認。ブラウザ上の操作検証とは別の結果。
2026-10-30追記：Blender JSON統合版をEdgeで紙の最大変形・停止切替、ガラス8本と1番の打鍵として確認。統合後の375px・390pxは未確認。Canvas上の視覚確認であり、音の可聴性やiPhone実機の証明ではない。A Driftは残像数1・6・12、進行0・50・100の座標境界を自動検査した。
