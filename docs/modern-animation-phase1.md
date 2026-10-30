# 現代アニメーション第1期：調査と再構成

Issue #37。原典の記事と操作を調査し、原典コード・画像・音声は転載していない。新しい図、文字、メッシュ、音はコードで独自生成した。Codropsの[共通ライセンス](https://tympanus.net/codrops/licensing/)は特記なきダウンロードデモをMITとしているが、素材の扱いは個別に確認が必要。Clip Menuの[リポジトリ](https://github.com/codrops/EaseReverseClipMenu)はMIT表記で、画像・動画はMidjourney生成と記載されている。本展示はこれらを取り込まない。

Windows実装環境ではBlenderコマンドが見つからなかった。一方、親側のクラウド環境では /usr/bin/blender の存在が確認されており、全環境で不在という意味ではない。事前制作メッシュは複雑な折り目と材質を作り込める一方、アセットの制作・配布が必要。今回は軽量で配布資産を必要としない独自の手続き生成とCanvas透視投影を選択した。WebGLには依存しない。

| ID | 原典・著者 | 原典の技術と動作 | 再構成と差 |
| --- | --- | --- | --- |
| unwoven | [Unwoven / Clément Grellier](https://tympanus.net/codrops/2026/09/05/building-an-infinite-loom-unravelling-images-into-threads-with-three-js/) | Three.jsリボンが端で解体・再集合 | 独自の風景画を帯と短い断片に分け波打たせる。ドラッグ・ホイール・スライダー。原典の写真と無限カルーセルは含まない |
| paper | [Paper Crumple / Toi Nagasawa](https://tympanus.net/codrops/2026/09/19/crumbled-paper-houdini-vat-threejs/) | Houdini VAT、Three.js、cannon-es、投擲 | 三角メッシュ、面の明暗と遠近投影、ドラッグ・重力・慣性。紙の塑性変形や自己衝突は近似しない |
| lens | [Square Lens / Tomoyuki Nakata](https://tympanus.net/codrops/2026/08/25/building-a-mouse-following-square-lens-effect-with-three-js-and-glsl/) | Three.js/GLSL、色、屈折、RGB分離 | 独自画像のCanvas画素をCPUでサンプリングし屈折と色ずれを作る。GLSLは使わない |
| drift | [A Drift / Robert Aperios](https://tympanus.net/codrops/2026/10/13/scroll-driven-ghost-trails/) | Canvas、GSAP、Three.js、スクロール軌跡 | 文字単位の波と輪郭コピー、内部スクロール、文字・残像数・変形を制御。原典の画像演出や音楽は含まない |
| glass | [Glass Xylophone / Sujen Phea](https://tympanus.net/codrops/2026/08/04/building-an-endless-interactive-glass-xylophone-with-three-js/) | Three.js、ガラスシェーダー、螺旋、流体と音 | 直方体の透視投影、なぞりと音階ボタン、配置調整、Web Audio合成音。流体や実屈折は省略 |
| clip | [Clip Menu / Codrops](https://tympanus.net/Development/EaseReverseClipMenu/)・[参考リポジトリ](https://github.com/codrops/EaseReverseClipMenu) | GSAP easeReverse、clip、途中反転 | CSS clip-pathの途中反転と開閉別の曲線・時間。GSAP独自のeaseReverseそのものではない |

各作品は主な原理を操作できる独自再構成として実装。トップページの既存展示は維持し、6件の共通ID・タグ配列は将来のトップ選抜から参照できる。トップ候補はUnwoven、Glass Xylophone、Clip Menu。音声は明示有効化するまで無音。動き低減と画面外・閉室の停止に対応する。

## 動作確認記録

2026-10-30 JST、ローカルEdgeで375px表示の紙の三角メッシュと投擲ボタン、390px表示のガラス8音ボタン・音声有効化・打鍵、レンズの色領域を確認。初期段階では全作品を選択し、Clip Menuの展開も確認した。デスクトップEdgeによる幅変更でありiPhone Safari実機ではない。ドラッグ・なぞりのタッチ実機、音の可聴性、全作品の連続操作や端末性能は未検証。画像単独では動作を証明できないため、操作内容をここに記録する。

2026-10-30 追加確認：Edge 390pxでUnwovenの分解量を35から80、A Driftの文字と軌跡を変更し、Clip Menuの時間を2000msに変更して連続開閉した。幅変更はデスクトップ検証で、iPhone実機やタッチ性能の証明ではない。
