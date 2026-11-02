# 既存Flash54展示の現物表

基準e75e74be。既存dataと専用描画分岐を確認。これは操作成功の記録ではない。

| ID | タイトル | 分類 | 操作 | 技法/再構成 |
|---|---|---|---|---|
| motion-tween | モーショントゥイーン | basics | 再生・停止、速度を切り替える | モーショントゥイーン＋イージング → "CSS Animation", "transform" |
| shape-tween | シェイプトゥイーン | basics | ステージまたは変形ボタンを押す | シェイプトゥイーン → "SVG", "CSS clip-path" |
| frame-by-frame | フレーム・バイ・フレーム | basics | 一時停止して、前後ボタンまたは8個のフレームを選ぶ | 連続キーフレーム → "React frame state", "CSS transforms" |
| typewriter | タイプライター | type-logo | 文字列の入力を観察する | テキストフィールド＋フレームスクリプト → "CSS steps()" |
| logo-assembly | ロゴの分解・集合 | type-logo | 「集合」「分解」ボタンで文字単位の動きを切り替える | 文字別ムービークリップ → "CSS transform", "transition-delay" |
| glow-wave-type | 波打つ発光文字 | type-logo | 文字へカーソルを合わせる | 文字分解＋GlowFilter → "CSS Animation", "text-shadow" |
| vector-morph | 円から多角形への変形 | vector | 変形の往復を観察する | シェイプヒント → "SVG path", "clip-path" |
| liquid-rubber | 液体とゴムの伸縮 | vector | 図形をポイントして押しつぶす | シェイプトゥイーン＋スケール → "CSS border-radius", "transform" |
| tile-break | タイル分割と再構成 | vector | クリックしてタイルを分解する | 複製ムービークリップ → "CSS Grid", "3D transform" |
| circle-mask | 円形マスク転換 | masks | ステージをクリックして転換する | マスクレイヤー → "CSS clip-path" |
| venetian-blinds | ブラインド・ワイプ | masks | 帯の時間差を観察する | 複数マスク＋時間差 → "CSS Grid", "transform" |
| spotlight | スポットライト | masks | ステージ内でカーソルを動かす | マスク＋マウス座標 → "CSS radial-gradient", "Pointer Events" |
| rollover-button | 光沢ロールオーバーボタン | ui | ポイントしてクリックする | ボタンシンボル Up/Over/Down/Hit → "CSS :hover", ":active" |
| radial-menu | 放射メニュー | ui | 中央のOPENを押す | ActionScript座標計算 → "CSS transform", "React state" |
| percent-loader | パーセント・ローダー | ui | 進捗を再生・停止する | bytesLoaded / bytesTotal → "CSS", "requestAnimationFrame" |
| cursor-follow | 慣性カーソル追従 | pointer | ステージ内でカーソルを動かす | onMouseMove＋enterFrame → "Pointer Events", "requestAnimationFrame" |
| watching-eyes | 視線追従 | pointer | 目の周囲でカーソルを動かす | 角度計算＋パーツ移動 → "CSS transform", "Pointer Events" |
| paint-trail | 絵筆カーソル | pointer | ドラッグして描き、リセットする | duplicateMovieClip＋座標記録 → "Canvas", "Pointer Events" |
| mascot-idle | マスコットの待機・瞬き | character | 待機ループを観察する | 入れ子ムービークリップ → "CSS Animation" |
| part-animation | パーツアニメーション | character | 歩行パーツの位相差を見る | シンボルの入れ子 → "CSS transform-origin" |
| edge-peek | 画面端から覗く案内役 | character | ステージへカーソルを合わせる | ムービークリップ＋rollOver → "CSS Transition" |
| gravity-bounce | 重力と反発 | physics | 跳ね方を観察する | enterFrameによる速度積分 → "CSS keyframes" |
| spring-drag | ゴム紐とバネ | physics | 球をドラッグして放す | ActionScriptバネ計算 → "Pointer Events", "requestAnimationFrame" |
| rain-fire | 雨・雪・炎 | physics | 天候を切り替えるボタンで、雨・雪・炎を順に選ぶ | 粒子ムービークリップ → "CSS Animation" |
| spark-particles | 光粒子の噴出 | particles | クリック位置から粒子を出す | attachMovie＋enterFrame → "Canvas", "requestAnimationFrame" |
| logo-burst | ロゴの粒子化と再集合 | particles | ロゴをクリックして分解する | BitmapData＋粒子配列 → "CSS Grid", "transform" |
| magic-constellation | 魔法陣と星の軌跡 | particles | 停止して静止構造も確認する | 複数ムービークリップ＋加算合成 → "CSS", "mix-blend-mode" |
| layered-scroll | 多層パララックス | space | 左右へカーソルを動かす | 複数レイヤーの速度差 → "CSS transform" |
| starfield | 星屑ワープ | space | 速度を切り替える | 擬似3D座標投影 → "CSS Animation" |
| horizon-grid | 地平線グリッド | space | グリッドのループを見る | 線描画＋スケール補間 → "CSS perspective" |
| rotating-cube | 回転する立方体 | pseudo-3d | 左右へドラッグして回転する | Papervision3D風の面変換 → "CSS 3D transforms" |
| photo-carousel | 3Dカルーセル | pseudo-3d | 前へ・次へでカードを回す | 三角関数＋depth交換 → "CSS 3D", "React state" |
| wireframe-tunnel | ワイヤーフレーム・トンネル | pseudo-3d | 停止して層構造を見る | 線画シンボルの複製 → "CSS Animation" |
| spectrum | 音楽ビジュアライザー | audio | 音を開始し、停止またはミュートする | SoundMixer.computeSpectrum → "Web Audio API", "CSS" |
| audio-wave | 波形モニター | audio | 音を開始して時間波形を見る | ByteArray波形取得 → "Web Audio API", "CSS" |
| beat-flash | ビート同期フラッシュ | audio | 音を開始し、低速・中速・高速のBPMを選ぶ | 音量ピーク検出 → "Web Audio API", "AnalyserNode", "AudioContext clock" |
| fullscreen-intro | スキップ可能なフルスクリーンイントロ | site | START、SKIP、ENTERを操作する | メインタイムライン＋gotoAndPlay → "React state", "CSS Animation" |
| moving-portfolio | 画面全体が動くポートフォリオ | site | 番号を選んで画面を移動する | ルートムービークリップ移動 → "CSS transform" |
| room-navigation | 部屋を移動するナビゲーション | site | 左右のドアを選ぶ | フレームラベル＋ボタン → "React state", "CSS Transition" |
| flashing-cta | 点滅CTAと価格の飛び込み | banner | 完成までの順番を見て、最後にCTAを押す | タイムライン＋ボタン → "CSS Animation", "HTML button" |
| banner-slot | バナー内スロット | banner | SPINを押す | 乱数＋gotoAndStop → "React state" |
| safe-escape-close | 逃げる閉じるボタン（安全版） | banner | ×へ近づくか、固定の即時終了を押す | rollOver座標変更 → "Pointer Events", "React state" |
| sprite-run | スプライト走行 | game | 走行フレームを見て、低速・標準・高速を切り替える | ムービークリップ＋scrollRect → "React frame state", "CSS Animation" |
| mini-shooter | クリック・シューター | game | ターゲットをクリックする | hitTest＋attachMovie → "Pointer Events", "React state" |
| combo-score | コンボとダメージ数字 | game | HITを連打する。間を空けるとコンボがリセットされる | 動的テキスト＋タイムライン → "CSS Animation", "React array state", "timers" |
| generative-lines | ジェネラティブ線画 | art | 再生成でseedを変え、点の数を調整する | MovieClip.lineTo＋乱数 → "SVG viewBox", "seeded generation" |
| kaleidoscope | 万華鏡 | art | カーソルで色と角度を変える | BitmapData＋複製 → "CSS transform" |
| interactive-poem | インタラクティブ詩 | art | 言葉をクリック、Enter、Spaceで選び、文章の変化を見る | 動的テキスト＋ボタンイベント → "HTML buttons", "React state", "CSS Grid" |
| keyframe-timeline | キーフレーム・タイムライン | craft | フレームを選ぶか再生する | Flashタイムライン → "CSS Grid", "React state" |
| onion-skin | オニオンスキン | craft | 現在フレームと表示範囲（前／前後／次）を選ぶ | オニオンスキン表示 → "React frame state", "CSS opacity" |
| fps-compare | 12 / 24 / 30 / 60fps比較 | craft | 4種類を同時に見比べ、比較を一時停止する | ドキュメントのフレームレート → "CSS steps()" |
| tween-modern-map | 同じ動き：タイムラインからCSSへ | modern | 左右の同じ動きと、7つの比較軸を見る | キーフレーム＋モーショントゥイーン → "DOM", "CSS @keyframes", "Web Animations API" |
| mouse-modern-map | 同じ入力：マウス追従からPointer Eventsへ | modern | 比較ステージ内でポインターを動かす | onMouseMove＋enterFrame → "Pointer Events", "requestAnimationFrame", "DOM / Canvas" |
| audio-modern-map | 統合環境から標準APIの組み合わせへ | modern | 左右の構成と、Flash・現代Webそれぞれの強みを見る | SoundMixer＋BitmapData → "Web Audio API", "Canvas / SVG", "DOM accessibility" |
