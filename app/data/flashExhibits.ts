export type FlashInteractionType =
  | "automatic"
  | "hover"
  | "pointer"
  | "click"
  | "drag"
  | "audio";

export type FlashVisualType =
  | "motion"
  | "shape"
  | "frames"
  | "type"
  | "logo"
  | "glow-text"
  | "morph"
  | "liquid"
  | "tiles"
  | "mask"
  | "blinds"
  | "spotlight"
  | "button"
  | "radial-menu"
  | "loader"
  | "follow"
  | "eyes"
  | "paint"
  | "character"
  | "parts"
  | "peek"
  | "bounce"
  | "spring"
  | "weather"
  | "particles"
  | "burst"
  | "constellation"
  | "parallax"
  | "starfield"
  | "grid"
  | "cube"
  | "carousel"
  | "wireframe"
  | "audio-bars"
  | "waveform"
  | "beat"
  | "intro"
  | "portfolio"
  | "room"
  | "banner"
  | "slot"
  | "safe-close"
  | "sprite"
  | "shooter"
  | "score"
  | "generative"
  | "kaleidoscope"
  | "poem"
  | "timeline"
  | "onion"
  | "fps"
  | "comparison-motion"
  | "comparison-pointer"
  | "comparison-media";

export type FlashExhibit = {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  flashTechnique: string;
  modernTechnique: string[];
  interactionType: FlashInteractionType;
  visualType: FlashVisualType;
  instruction: string;
  reducedMotionFallback: string;
  accessibilityNote: string;
};

export type FlashCategory = {
  id: string;
  number: string;
  title: string;
  summary: string;
};

export const flashCategories: FlashCategory[] = [
  { id: "basics", number: "01", title: "基本アニメーション", summary: "タイムラインとトゥイーンが生む、Flashの基本語彙。" },
  { id: "type-logo", number: "02", title: "文字・ロゴ", summary: "文字を一個の物体として分解し、跳ねさせ、再結合する。" },
  { id: "vector", number: "03", title: "ベクター・図形変形", summary: "拡大しても滑らかな輪郭を、別の形へ連続変形する。" },
  { id: "masks", number: "04", title: "マスク・画面転換", summary: "見える範囲そのものを動かして場面を切り替える。" },
  { id: "ui", number: "05", title: "ボタン・UI", summary: "触れた瞬間に応える、光沢と立体感のある操作部品。" },
  { id: "pointer", number: "06", title: "マウス連動", summary: "ポインター座標を演出へ変え、画面を触れる空間にする。" },
  { id: "character", number: "07", title: "キャラクター", summary: "少ないパーツとループで、マスコットに生命感を与える。" },
  { id: "physics", number: "08", title: "擬似物理", summary: "重力、反発、バネを軽量な計算と誇張で表現する。" },
  { id: "particles", number: "09", title: "パーティクル", summary: "小さなシンボルを複製し、光、煙、爆発を作る。" },
  { id: "space", number: "10", title: "背景・空間表現", summary: "多層移動と消失点で、平面のステージに奥行きを作る。" },
  { id: "pseudo-3d", number: "11", title: "擬似3D", summary: "拡縮、傾き、重なり順で立体らしいカメラ感を生む。" },
  { id: "audio", number: "12", title: "音連動", summary: "利用者が開始した合成音を、波形と光へ翻訳する。" },
  { id: "site", number: "13", title: "Flashサイト演出", summary: "イントロからENTERまで、ページ全体をひとつの作品にする。" },
  { id: "banner", number: "14", title: "バナー広告", summary: "小さな矩形へ、価格、CTA、ミニゲームを詰め込む文化。" },
  { id: "game", number: "15", title: "ゲーム演出", summary: "スプライト、ヒット、スコアで即時フィードバックを作る。" },
  { id: "art", number: "16", title: "芸術・実験表現", summary: "規則と偶然、文字と図形を組み合わせるインタラクティブ作品。" },
  { id: "craft", number: "17", title: "制作技法", summary: "キーフレーム、レイヤー、オニオンスキンを制作画面として可視化。" },
  { id: "modern", number: "18", title: "Flash表現は現代Webへどう引き継がれたか", summary: "一つの制作環境に統合されていた動き、入力、音、描画が、複数のブラウザ標準へ分かれて継承された道筋を比べる。" },
];

const common = {
  reducedMotionFallback: "自動再生を止め、代表フレームを静止表示します。",
  accessibilityNote: "動きは停止でき、色だけに頼らないラベルを併記しています。",
};

export const flashExhibits: FlashExhibit[] = [
  { ...common, id: "motion-tween", title: "モーショントゥイーン", categoryId: "basics", description: "始点と終点の間を補間する、Flash制作の中心的な移動表現。", flashTechnique: "モーショントゥイーン＋イージング", modernTechnique: ["CSS Animation", "transform"], interactionType: "automatic", visualType: "motion", instruction: "再生・停止、速度を切り替える" },
  { ...common, id: "shape-tween", title: "シェイプトゥイーン", categoryId: "basics", description: "円の輪郭が星へ溶けるように変わる、ベクターならではの補間。", flashTechnique: "シェイプトゥイーン", modernTechnique: ["SVG", "CSS clip-path"], interactionType: "click", visualType: "shape", instruction: "ステージまたは変形ボタンを押す" },
  { ...common, id: "frame-by-frame", title: "フレーム・バイ・フレーム", categoryId: "basics", description: "しゃがみ、踏み切り、跳躍、振り向き、着地まで、輪郭の異なる8枚を順に描く。", flashTechnique: "連続キーフレーム", modernTechnique: ["React frame state", "CSS transforms"], interactionType: "automatic", visualType: "frames", instruction: "一時停止して、前後ボタンまたは8個のフレームを選ぶ" },
  { ...common, id: "typewriter", title: "タイプライター", categoryId: "type-logo", description: "文字が一字ずつ打ち込まれ、最後にカーソルが点滅する。", flashTechnique: "テキストフィールド＋フレームスクリプト", modernTechnique: ["CSS steps()"], interactionType: "automatic", visualType: "type", instruction: "文字列の入力を観察する" },
  { ...common, id: "logo-assembly", title: "ロゴの分解・集合", categoryId: "type-logo", description: "架空ロゴORBITALの文字が別方向・別角度・別の奥行きから時間差で集まり、輪郭が発光して確定する。", flashTechnique: "文字別ムービークリップ", modernTechnique: ["CSS transform", "transition-delay"], interactionType: "click", visualType: "logo", instruction: "「集合」「分解」ボタンで文字単位の動きを切り替える" },
  { ...common, id: "glow-wave-type", title: "波打つ発光文字", categoryId: "type-logo", description: "文字ごとの位相差とグローで、音楽サイト風の見出しを作る。", flashTechnique: "文字分解＋GlowFilter", modernTechnique: ["CSS Animation", "text-shadow"], interactionType: "hover", visualType: "glow-text", instruction: "文字へカーソルを合わせる" },
  { ...common, id: "vector-morph", title: "円から多角形への変形", categoryId: "vector", description: "輪郭の対応点が移動し、図形が連続的に姿を変える。", flashTechnique: "シェイプヒント", modernTechnique: ["SVG path", "clip-path"], interactionType: "automatic", visualType: "morph", instruction: "変形の往復を観察する" },
  { ...common, id: "liquid-rubber", title: "液体とゴムの伸縮", categoryId: "vector", description: "押されてつぶれ、遅れて戻る誇張された柔らかさ。", flashTechnique: "シェイプトゥイーン＋スケール", modernTechnique: ["CSS border-radius", "transform"], interactionType: "hover", visualType: "liquid", instruction: "図形をポイントして押しつぶす" },
  { ...common, id: "tile-break", title: "タイル分割と再構成", categoryId: "vector", description: "一枚の面を小片に分け、時間差で反転させる。", flashTechnique: "複製ムービークリップ", modernTechnique: ["CSS Grid", "3D transform"], interactionType: "click", visualType: "tiles", instruction: "クリックしてタイルを分解する" },
  { ...common, id: "circle-mask", title: "円形マスク転換", categoryId: "masks", description: "円形の窓が拡大し、次の場面を中央から露出する。", flashTechnique: "マスクレイヤー", modernTechnique: ["CSS clip-path"], interactionType: "click", visualType: "mask", instruction: "ステージをクリックして転換する" },
  { ...common, id: "venetian-blinds", title: "ブラインド・ワイプ", categoryId: "masks", description: "細い帯が順に開き、写真スライド風の場面を見せる。", flashTechnique: "複数マスク＋時間差", modernTechnique: ["CSS Grid", "transform"], interactionType: "automatic", visualType: "blinds", instruction: "帯の時間差を観察する" },
  { ...common, id: "spotlight", title: "スポットライト", categoryId: "masks", description: "ポインターの周囲だけ、隠されたグラフィックを照らす。", flashTechnique: "マスク＋マウス座標", modernTechnique: ["CSS radial-gradient", "Pointer Events"], interactionType: "pointer", visualType: "spotlight", instruction: "ステージ内でカーソルを動かす" },
  { ...common, id: "rollover-button", title: "光沢ロールオーバーボタン", categoryId: "ui", description: "触れると発光し、押すと沈む四状態のFlashボタン。", flashTechnique: "ボタンシンボル Up/Over/Down/Hit", modernTechnique: ["CSS :hover", ":active"], interactionType: "hover", visualType: "button", instruction: "ポイントしてクリックする" },
  { ...common, id: "radial-menu", title: "放射メニュー", categoryId: "ui", description: "中央ボタンから選択肢が円形に展開する。", flashTechnique: "ActionScript座標計算", modernTechnique: ["CSS transform", "React state"], interactionType: "click", visualType: "radial-menu", instruction: "中央のOPENを押す" },
  { ...common, id: "percent-loader", title: "パーセント・ローダー", categoryId: "ui", description: "バー、数値、回転リングで読み込みの進行を強調する。", flashTechnique: "bytesLoaded / bytesTotal", modernTechnique: ["CSS", "requestAnimationFrame"], interactionType: "automatic", visualType: "loader", instruction: "進捗を再生・停止する" },
  { ...common, id: "cursor-follow", title: "慣性カーソル追従", categoryId: "pointer", description: "本体と残像が少し遅れて追いつく、代表的なマウス演出。", flashTechnique: "onMouseMove＋enterFrame", modernTechnique: ["Pointer Events", "requestAnimationFrame"], interactionType: "pointer", visualType: "follow", instruction: "ステージ内でカーソルを動かす" },
  { ...common, id: "watching-eyes", title: "視線追従", categoryId: "pointer", description: "二つの目玉がカーソル方向を見て、画面に人格を与える。", flashTechnique: "角度計算＋パーツ移動", modernTechnique: ["CSS transform", "Pointer Events"], interactionType: "pointer", visualType: "eyes", instruction: "目の周囲でカーソルを動かす" },
  { ...common, id: "paint-trail", title: "絵筆カーソル", categoryId: "pointer", description: "ドラッグした軌跡へ色付きの点を残す簡易ペイント。", flashTechnique: "duplicateMovieClip＋座標記録", modernTechnique: ["Canvas", "Pointer Events"], interactionType: "drag", visualType: "paint", instruction: "ドラッグして描き、リセットする" },
  { ...common, id: "mascot-idle", title: "マスコットの待機・瞬き", categoryId: "character", description: "呼吸する上下動と不規則な瞬きで静止画に生命感を出す。", flashTechnique: "入れ子ムービークリップ", modernTechnique: ["CSS Animation"], interactionType: "automatic", visualType: "character", instruction: "待機ループを観察する" },
  { ...common, id: "part-animation", title: "パーツアニメーション", categoryId: "character", description: "頭、腕、脚を別シンボルとして回転し、歩行を組み立てる。", flashTechnique: "シンボルの入れ子", modernTechnique: ["CSS transform-origin"], interactionType: "automatic", visualType: "parts", instruction: "歩行パーツの位相差を見る" },
  { ...common, id: "edge-peek", title: "画面端から覗く案内役", categoryId: "character", description: "画面外から覗いて短い案内を出す、Flashサイトの定番マスコット。", flashTechnique: "ムービークリップ＋rollOver", modernTechnique: ["CSS Transition"], interactionType: "hover", visualType: "peek", instruction: "ステージへカーソルを合わせる" },
  { ...common, id: "gravity-bounce", title: "重力と反発", categoryId: "physics", description: "落下速度へ重力を足し、床で減衰反転するボール。", flashTechnique: "enterFrameによる速度積分", modernTechnique: ["CSS keyframes"], interactionType: "automatic", visualType: "bounce", instruction: "跳ね方を観察する" },
  { ...common, id: "spring-drag", title: "ゴム紐とバネ", categoryId: "physics", description: "ドラッグした球が中心へ引かれ、減衰しながら戻る。", flashTechnique: "ActionScriptバネ計算", modernTechnique: ["Pointer Events", "requestAnimationFrame"], interactionType: "drag", visualType: "spring", instruction: "球をドラッグして放す" },
  { ...common, id: "rain-fire", title: "雨・雪・炎", categoryId: "physics", description: "方向、寿命、揺らぎの違いで三種類の自然現象を抽象化。", flashTechnique: "粒子ムービークリップ", modernTechnique: ["CSS Animation"], interactionType: "click", visualType: "weather", instruction: "天候を切り替えるボタンで、雨・雪・炎を順に選ぶ" },
  { ...common, id: "spark-particles", title: "光粒子の噴出", categoryId: "particles", description: "小さな光が中心から飛び出し、減速しながら消える。", flashTechnique: "attachMovie＋enterFrame", modernTechnique: ["Canvas", "requestAnimationFrame"], interactionType: "click", visualType: "particles", instruction: "クリック位置から粒子を出す" },
  { ...common, id: "logo-burst", title: "ロゴの粒子化と再集合", categoryId: "particles", description: "ロゴを点へ分解し、ばらけた粒が元の形へ戻る。", flashTechnique: "BitmapData＋粒子配列", modernTechnique: ["CSS Grid", "transform"], interactionType: "click", visualType: "burst", instruction: "ロゴをクリックして分解する" },
  { ...common, id: "magic-constellation", title: "魔法陣と星の軌跡", categoryId: "particles", description: "回転する輪と点滅する星を重ねたファンタジーUI。", flashTechnique: "複数ムービークリップ＋加算合成", modernTechnique: ["CSS", "mix-blend-mode"], interactionType: "automatic", visualType: "constellation", instruction: "停止して静止構造も確認する" },
  { ...common, id: "layered-scroll", title: "多層パララックス", categoryId: "space", description: "遠景ほど小さくゆっくり動かし、奥行きのある横スクロールを作る。", flashTechnique: "複数レイヤーの速度差", modernTechnique: ["CSS transform"], interactionType: "pointer", visualType: "parallax", instruction: "左右へカーソルを動かす" },
  { ...common, id: "starfield", title: "星屑ワープ", categoryId: "space", description: "点が中心から放射状へ伸び、宇宙を高速移動する感覚を作る。", flashTechnique: "擬似3D座標投影", modernTechnique: ["CSS Animation"], interactionType: "automatic", visualType: "starfield", instruction: "速度を切り替える" },
  { ...common, id: "horizon-grid", title: "地平線グリッド", categoryId: "space", description: "消失点へ集まる線と流れる床面でレトロな仮想空間を描く。", flashTechnique: "線描画＋スケール補間", modernTechnique: ["CSS perspective"], interactionType: "automatic", visualType: "grid", instruction: "グリッドのループを見る" },
  { ...common, id: "rotating-cube", title: "回転する立方体", categoryId: "pseudo-3d", description: "六面のシンボルを組み、平面ブラウザ上で立体回転させる。", flashTechnique: "Papervision3D風の面変換", modernTechnique: ["CSS 3D transforms"], interactionType: "drag", visualType: "cube", instruction: "左右へドラッグして回転する" },
  { ...common, id: "photo-carousel", title: "3Dカルーセル", categoryId: "pseudo-3d", description: "カードが楕円軌道を回り、手前の項目ほど大きくなる。", flashTechnique: "三角関数＋depth交換", modernTechnique: ["CSS 3D", "React state"], interactionType: "click", visualType: "carousel", instruction: "前へ・次へでカードを回す" },
  { ...common, id: "wireframe-tunnel", title: "ワイヤーフレーム・トンネル", categoryId: "pseudo-3d", description: "同心矩形の拡縮で奥から迫るトンネルを作る。", flashTechnique: "線画シンボルの複製", modernTechnique: ["CSS Animation"], interactionType: "automatic", visualType: "wireframe", instruction: "停止して層構造を見る" },
  { ...common, id: "spectrum", title: "音楽ビジュアライザー", categoryId: "audio", description: "利用者が開始した合成音の強さを周波数バー風に表示する。", flashTechnique: "SoundMixer.computeSpectrum", modernTechnique: ["Web Audio API", "CSS"], interactionType: "audio", visualType: "audio-bars", instruction: "音を開始し、停止またはミュートする" },
  { ...common, id: "audio-wave", title: "波形モニター", categoryId: "audio", description: "AnalyserNodeが取得した時間領域データを走査線状の点へ置き換える。", flashTechnique: "ByteArray波形取得", modernTechnique: ["Web Audio API", "CSS"], interactionType: "audio", visualType: "waveform", instruction: "音を開始して時間波形を見る" },
  { ...common, id: "beat-flash", title: "ビート同期フラッシュ", categoryId: "audio", description: "短いアタックと減衰を持つ合成ビートを解析し、検出したピークだけを光とメーターへ同期する。", flashTechnique: "音量ピーク検出", modernTechnique: ["Web Audio API", "AnalyserNode", "AudioContext clock"], interactionType: "audio", visualType: "beat", instruction: "音を開始し、低速・中速・高速のBPMを選ぶ", accessibilityNote: "常時点滅を避け、reduced motionではscaleを止めて穏やかなメーターだけを更新します。" },
  { ...common, id: "fullscreen-intro", title: "スキップ可能なフルスクリーンイントロ", categoryId: "site", description: "ローディング、ロゴ、ENTERへ進む短いFlashサイト風オープニング。", flashTechnique: "メインタイムライン＋gotoAndPlay", modernTechnique: ["React state", "CSS Animation"], interactionType: "click", visualType: "intro", instruction: "START、SKIP、ENTERを操作する" },
  { ...common, id: "moving-portfolio", title: "画面全体が動くポートフォリオ", categoryId: "site", description: "選択した作品へステージ全体が滑って移動する。", flashTechnique: "ルートムービークリップ移動", modernTechnique: ["CSS transform"], interactionType: "click", visualType: "portfolio", instruction: "番号を選んで画面を移動する" },
  { ...common, id: "room-navigation", title: "部屋を移動するナビゲーション", categoryId: "site", description: "左右の扉を選び、仮想の館内を移動する。", flashTechnique: "フレームラベル＋ボタン", modernTechnique: ["React state", "CSS Transition"], interactionType: "click", visualType: "room", instruction: "左右のドアを選ぶ" },
  { ...common, id: "flashing-cta", title: "点滅CTAと価格の飛び込み", categoryId: "banner", description: "商品、コピー、価格、限定ラベルを順番に表示し、最後にCTAが短く2回だけ発光して操作を促す。", flashTechnique: "タイムライン＋ボタン", modernTechnique: ["CSS Animation", "HTML button"], interactionType: "automatic", visualType: "banner", instruction: "完成までの順番を見て、最後にCTAを押す", accessibilityNote: "高速な点滅や常時点滅は使わず、CTA登場後の短い強調だけを行います。reduced motionでは完成状態を静止表示します。" },
  { ...common, id: "banner-slot", title: "バナー内スロット", categoryId: "banner", description: "クリックで絵柄が回り、必ず停止する短いミニゲーム広告。", flashTechnique: "乱数＋gotoAndStop", modernTechnique: ["React state"], interactionType: "click", visualType: "slot", instruction: "SPINを押す" },
  { ...common, id: "safe-escape-close", title: "逃げる閉じるボタン（安全版）", categoryId: "banner", description: "悪名高い挙動を小さな領域だけで再現し、即時終了手段を常設する。", flashTechnique: "rollOver座標変更", modernTechnique: ["Pointer Events", "React state"], interactionType: "hover", visualType: "safe-close", instruction: "×へ近づくか、固定の即時終了を押す", accessibilityNote: "キーボード用の固定終了ボタンが常に操作できます。" },
  { ...common, id: "sprite-run", title: "スプライト走行", categoryId: "game", description: "腕と脚の前後関係が異なる8姿勢を切り替え、固定した走者の背後で遠景と前景を流す。", flashTechnique: "ムービークリップ＋scrollRect", modernTechnique: ["React frame state", "CSS Animation"], interactionType: "automatic", visualType: "sprite", instruction: "走行フレームを見て、低速・標準・高速を切り替える" },
  { ...common, id: "mini-shooter", title: "クリック・シューター", categoryId: "game", description: "照準でターゲットをクリックし、爆発と得点を返す小さなゲーム。", flashTechnique: "hitTest＋attachMovie", modernTechnique: ["Pointer Events", "React state"], interactionType: "click", visualType: "shooter", instruction: "ターゲットをクリックする" },
  { ...common, id: "combo-score", title: "コンボとダメージ数字", categoryId: "game", description: "HITごとに固有のダメージ数字を生成し、コンボ段階、ゲージ、5・10連続の節目を返す。", flashTechnique: "動的テキスト＋タイムライン", modernTechnique: ["CSS Animation", "React array state", "timers"], interactionType: "click", visualType: "score", instruction: "HITを連打する。間を空けるとコンボがリセットされる", accessibilityNote: "reduced motionでは数字を移動させず、静かな履歴として更新します。" },
  { ...common, id: "generative-lines", title: "ジェネラティブ線画", categoryId: "art", description: "seedから配置した点を距離条件で結び、同じseedなら同じSVG線画を再現する。", flashTechnique: "MovieClip.lineTo＋乱数", modernTechnique: ["SVG viewBox", "seeded generation"], interactionType: "click", visualType: "generative", instruction: "再生成でseedを変え、点の数を調整する" },
  { ...common, id: "kaleidoscope", title: "万華鏡", categoryId: "art", description: "ひとつの形を回転・反転して対称模様へ展開する。", flashTechnique: "BitmapData＋複製", modernTechnique: ["CSS transform"], interactionType: "pointer", visualType: "kaleidoscope", instruction: "カーソルで色と角度を変える" },
  { ...common, id: "interactive-poem", title: "インタラクティブ詩", categoryId: "art", description: "8つの語を選ぶたびに距離とつながりを組み替え、選択語を起点に一文を再構成する。", flashTechnique: "動的テキスト＋ボタンイベント", modernTechnique: ["HTML buttons", "React state", "CSS Grid"], interactionType: "click", visualType: "poem", instruction: "言葉をクリック、Enter、Spaceで選び、文章の変化を見る" },
  { ...common, id: "keyframe-timeline", title: "キーフレーム・タイムライン", categoryId: "craft", description: "レイヤーとフレームを並べ、再生ヘッドが制作工程を走る。", flashTechnique: "Flashタイムライン", modernTechnique: ["CSS Grid", "React state"], interactionType: "click", visualType: "timeline", instruction: "フレームを選ぶか再生する" },
  { ...common, id: "onion-skin", title: "オニオンスキン", categoryId: "craft", description: "現在フレームを選び、異なる姿勢の前後フレームを半透明で重ねて制作差分を確認する。", flashTechnique: "オニオンスキン表示", modernTechnique: ["React frame state", "CSS opacity"], interactionType: "click", visualType: "onion", instruction: "現在フレームと表示範囲（前／前後／次）を選ぶ" },
  { ...common, id: "fps-compare", title: "12 / 24 / 30 / 60fps比較", categoryId: "craft", description: "同じ距離と時間を移動する4行を同時表示し、更新段階の違いを比べる。", flashTechnique: "ドキュメントのフレームレート", modernTechnique: ["CSS steps()"], interactionType: "click", visualType: "fps", instruction: "4種類を同時に見比べ、比較を一時停止する" },
  { ...common, id: "tween-modern-map", title: "同じ動き：タイムラインからCSSへ", categoryId: "modern", description: "見た目が同じ移動を、Flashの統合タイムラインと現代WebのDOM・keyframesで左右比較する。", flashTechnique: "キーフレーム＋モーショントゥイーン", modernTechnique: ["DOM", "CSS @keyframes", "Web Animations API"], interactionType: "automatic", visualType: "comparison-motion", instruction: "左右の同じ動きと、7つの比較軸を見る" },
  { ...common, id: "mouse-modern-map", title: "同じ入力：マウス追従からPointer Eventsへ", categoryId: "modern", description: "同じポインターへ左右が同時に追従し、入力とフレーム更新の考え方の違いを示す。", flashTechnique: "onMouseMove＋enterFrame", modernTechnique: ["Pointer Events", "requestAnimationFrame", "DOM / Canvas"], interactionType: "pointer", visualType: "comparison-pointer", instruction: "比較ステージ内でポインターを動かす" },
  { ...common, id: "audio-modern-map", title: "統合環境から標準APIの組み合わせへ", categoryId: "modern", description: "Flash内部でまとまっていた音と描画が、Web Audio、Canvas、SVGなど複数の標準へ分かれた構成を比べる。", flashTechnique: "SoundMixer＋BitmapData", modernTechnique: ["Web Audio API", "Canvas / SVG", "DOM accessibility"], interactionType: "click", visualType: "comparison-media", instruction: "左右の構成と、Flash・現代Webそれぞれの強みを見る" },
];

export const flashExhibitCount = flashExhibits.length;
