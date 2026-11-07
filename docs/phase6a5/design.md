# 第6期A-5 Image Adjustment Lab 設計

Issue #69。基準 main ab05ffa4e95a68bc387bcfbd04a16bad6e331a75（PR #68 merge）。267展示・13室・実用UI28件を保ち、image-adjustment のみ追加し268展示・13室・29件へ進める。

## 固有の教材
A1は表示範囲、A2は切出し、A3は比較、A4は注釈。本展示は実際のRGB画素変換と、その同じ画素から集計したヒストグラムを扱う。外部通信・画像・フォント・依存追加なし。独自の決定的な480×300 RGBAラスタ（集落と水辺／室内の花瓶・箱・林檎）を純粋関数から生成する。写真や歴史資料ではなく階調と陰影を持つ教材イラスト。

## 画素処理
原画は不変。毎回原画から新たなUint8ClampedArrayを計算する。補正画像を次の入力にはしない。数値は整数のみ。空、NaN、Infinity、範囲外、不完全RGBAを拒否。

|parameter|範囲|初期|単位|
|---|---|---|---|
|Brightness|-100〜100|0|1で符号化RGB +2.55|
|Contrast|-100〜100|0|倍率 1+c/100|
|Saturation|0〜200|100|倍率 s/100|
|Temperature|-100〜100|0|赤+0.4t、青−0.4t|

順序は固定：
1. RGB各値へ2.55bを加える。
2. (値−127.5)×(1+c/100)+127.5。
3. Y=0.2126R+0.7152G+0.0722B。各値をY+(値−Y)×s/100。
4. 赤へ0.4t、青へ−0.4t。緑はそのまま。
5. 最後だけMath.round（正側へのhalf rounding）し0〜255へclamp。alphaはコピー。

中間計算は浮動小数点で、途中clampなし。符号化sRGBの数値へ直接適用する教材用近似。線形光、ICC、HDR、広色域、実際のKelvin白色点変換ではない。Rec.709係数を使っても、符号化値から求めるYは物理輝度ではない。無調整は全byte一致。Canvas2D ImageDataを表示しCSS filterは使わない。

## Histogram
RGB各256ビン（整数0〜255）、各非透明画素1票。alpha0は除外、半透明は重み付けしない。教材画像は全画素opaque、alpha挙動は別の小配列試験。各channel合計はcount144000。前後共通の最大binを線形縦軸とし、分布の面積正規化はしない。原画破線／補正実線、色と線種とR/G/B文字、平均と端の画素数で区別。比較表示を変えても補正ヒストグラムは同一。

## Presets
順にBrightness/Contrast/Saturation/Temperature：Original 0/0/100/0、Vivid 4/18/140/0、Soft 4/−18/90/0、Warm 3/4/110/35、Cool 2/8/100/−35、High Contrast 0/55/100/0。適用は1編集で、その後も手動変更可。

## 状態と入力
committed history と transient previewを分離。スライダーpointerdown/keyDownからpointerup/keyUpまでの連続操作は1commit、変化無しは0。直接数値はEnter/適用でcommit。Escape、pointercancel、capture喪失、blur、resize、非表示、別操作でpreviewを破棄。native rangeへ明示setPointerCaptureを使わず（WebKitでthumb配送を妨げる反例）、documentのpointerup/cancelも監視。所有pointer IDと世代を照合し、遅延up/changeを拒否。画像切替は既定値へ戻し、画像と値を一括でundo可能。Resetも現在画像へのundoable edit。履歴上限50、新規編集はfutureを破棄。非同期画像ロード／worker／requestAnimationFrameを使用せず、古い非同期計算結果がReset後に届く経路を作らない。閉室はunmountし、観測を解除。

比較は同じ480×300canvas2枚を同じboxで重ねる。Splitのclip境界は表示だけ。元画像の内容も位置も変えない。

## 検証と限界
小配列手計算と別の行列oracle、入力・履歴単体、16 browser条件、Canvas全byte・PNG・独立集計・入力イベント、破損対照と回復、原証拠manifest検査。Playwright配送はisTrustedのブラウザ入力であり物理入力ではない。合成pointercancelは合成と記録。実機Safari、VoiceOver、物理マウス・タッチ、OS文字拡大は別途NOT_TESTED。CSS 200%文字試験と実OS拡大は別。#44 security、#54 UNKNOWN/未検証は継続。
