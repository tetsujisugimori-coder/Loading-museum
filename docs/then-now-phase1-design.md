# Flash Then & Now 第1期 — 設計・調査

2026-11-02 / Issue #50 / branch `feat/flash-then-now-phase1`

## 基準と現物

main `e75e74be3d6b3620c785c4b60c6823bf2080cb7f`、tree `7cc586b689afcd5c29259b5334b90f3db14e795d`。#14、#49はmerged、#36はopen/unmerged。専用のblob遅延・sparse checkoutを作成し、既存checkoutを変更しない。4B保留証拠原本/ZIPは展開・読取・転送しない。リポジトリ内/作業祖先にAGENTS.mdなし。

`node scripts/inventory.mjs` の基準実測はFlash54、全館245。18カテゴリ、13室。内訳：常設9、DOS8、Linux5、消えたOS18、Apple13、Macintosh18、cursor8、Flash54、DOM17、WAAPI47、現代6、2期12、3期12、4A6、4B6、5A6。全登録の静的保全を全展示の実操作成功とは呼ばない。

## 採用と重複点検

54件のID/操作/技術の現物表は `then-now-existing-inventory.md`。`FlashVisuals.tsx` の専用分岐と `FlashRefinedVisuals.tsx` の専用実装も確認した。既存generic visualsに新しい名前を付ける方法は採らない。

| 新作品 / 分類 | 類似する既存作 | 新たな観察・制作判断 |
|---|---|---|
| Vector Morph / vector | shape-tween、vector-morph、liquid-rubber | 8点の対応順を編集、同じ終点と異なる中間輪郭を比較。Thenは24段階の簡潔な変形、Nowはガイドと対応点。液体表現を足さない |
| Cursor Creature / character | cursor-follow、watching-eyes、part-animation、mascot-idle | 独自の角張った紙鳥。視線/翼/足/間合いと注視・追従・回避、Nowは入力速度で後退。touch/keyboardの代替目標 |
| Kinetic Typography / type-logo | typewriter、logo-assembly、glow-wave-type、interactive-poem | 文字の入場時差と意味/字間。固定ロゴ完成や逐字表示ではなくLISTEN/EXPANDの振付を作る |
| Physics Playground / physics | gravity-bounce、spring-drag、rain-fire | 操作可能な重力/反発/摩擦、単体と二体衝突、ドラッグ解放と状態計測。無作為な移動で代用しない |
| Interactive Intro / site | fullscreen-intro、moving-portfolio、room-navigation | 定時進行と操作進行を比較し、途中選択を本編構図へ持ち越す。Skip/Replay/途中観察/終端 |
| Sound Reactor / audio | spectrum、audio-wave、beat-flash、audio-modern-map | 合成音の音高と音量を別操作。実FFT帯域を独自の幾何建築に写像し波形と対比。BPMだけの同期ではない |

既存modernカテゴリ3作品は技術の継承/構成比較として保持。今回は制作判断と操作による違いを主役にする。過去と現在に優劣を設定しない。Thenの美意識にも固有の価値を残す。Then/Now各ペアで一展示、既存6カテゴリ内へ追加し18カテゴリを維持。

## 史料：確認事実と解釈

2026-11-02に一次技術資料を閲覧。資料のコード/画像は転載しない。

- [Adobe Shape tweening](https://helpx.adobe.com/animate/desktop/animation/shape-tweening.html)：始終の形状と中間補間、shape hintsによる点対応を確認。今回の8点補間は独自の簡略モデル。
- [Adobe Tweens](https://helpx.adobe.com/animate/using/tweens.html)：classic tweenとFlash CS3以前との関係、位置/回転等のプロパティ補間を確認。全Flash作品が同じ演出だったという根拠にはしない。
- [Adobe Motion tweens and text](https://www.adobe.com/learn/animate/web/motion-tween-animate-text)：個別symbol/layerへ分けたテキスト演出の現行資料。Flash時代の特定作品の実証とは区別する。
- [Adobe Scenes](https://helpx.adobe.com/animate/desktop/animation/scenes.html)：scene単位の制作構造を確認。特定サイトのSkip Intro実装や歴史的初出の証明ではない。
- [AIR SDK SoundMixer AS3 reference](https://airsdk.dev/reference/actionscript/3.0/flash/media/SoundMixer.html)：時間波形/FFTのcomputeSpectrumを確認。独自合成音を解析する発想へ参照。
- [AIR SDK Sprite AS3 reference](https://airsdk.dev/reference/actionscript/3.0/flash/display/Sprite.html)：display listとstartDragの技術的存在を確認。物理玩具やマスコットの流行/初出はこのAPIだけでは証明できない。
- [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)、[Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)、[requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)：現在の入力・時計・解析の構成資料。

「Flash時代を意識した」美術上の解釈とAPI存在の確認を分ける。6作の歴史的初出・発明者・特定の原作品はすべてUNKNOWN。個別の実在作品を忠実に複製したと称さない。独自SVG図形/文字/合成音のみで、外部画像・楽曲・キャラクター・商標ロゴなし。

## 実装契約

- 既存展示室と18カテゴリnavの構造/配色を踏襲。比較カードのみ既存grid全幅、desktopはThen/Now二列、700px以下で上下。見出し→共通操作→Then/Now実演・固有操作・状態→意図/資料/限界。本文13px、操作44px以上、focusを明示。
- これは測定データの高度なページ構成設計ではなく、指定済み比較配置への独自の動く作品追加。可視化skillのconcept-first workflowはデータ可視化のcompositionに適用される範囲を確認した。新設ページ/データ物語/背景生成を行わず、画像concept承認を追加条件にしない。実ブラウザ描画で外観を確認する。
- SVG/DOM/React/TS/RAF/Pointer Events/Web Audio。新規アプリ依存なし。制作assetはコードで編集できる形を維持。汎用なのは時計・range・枠だけ。作品ごとに輪郭補間、入力反応、文字振付、物理、状態機械、音解析が別。
- 同時に選択される新作は1ペア、最大2時計/2AudioContext。初期停止。共通開始/停止とReset。カテゴリ移動/閉室でunmount、非表示で処理を破棄、画面外でRAF停止。音の復帰は明示操作。時計のdt上限を設けbackground catch-upなし。
- 保存/通信/URL状態なし。Resetはgeneration remount。reduced motionは自動移動を停止し、slider/step/直接操作で意味を保持。音量解析の小さなmeterは継続可能、巨大変形/点滅なし。
- 音開始は利用者の明示clickだけ。音量を抑え、停止/ミュート/閉室で解放。API不可やresume拒否を成功へ読み替えない。

## 受入計画

前半3作をcomponent/実browserで検証してcommit、後半3作も同様。最終Ch/WK×375/390/1280で6作、実click/tap/drag/key、開始/停止/途中/再実行、高速入力、Reset、reduced切替後操作、閉室/再表示、pageerror、横超過、保存なしを確認。正常音と音不可を分ける。旧54定義のdeep equality、旧製品/lockfile/証拠blobの不変、全館数/カテゴリ/一意IDを検査。既存CIの数値表示期待だけは245→251の仕様変更に合わせるが操作assert/timeoutを緩和しない。Windows既存WAAPI timeout根因UNKNOWN、Issue #44依存警告、実iPhone/Mac Safari/VoiceOver未検証は別記録。
