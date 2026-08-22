export type SampleCategory = "Entrance" | "Exit" | "Attention" | "Feedback" | "Loading" | "Text" | "Advanced" | "Continuous";
export type SampleEra = "1990s" | "2000s" | "2010s" | "2020s";
export type SampleSourceType = "OS" | "Game" | "Web" | "App" | "Generic UI";
export type SampleIntensity = "Subtle" | "Standard" | "Strong";
export type SampleDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type SampleRenderKind = "box" | "button" | "modal" | "toast" | "toggle" | "progress" | "typewriter" | "characters" | "counter" | "cursor" | "xp-segments" | "orbit-dots" | "watch" | "spinner-spokes" | "dock" | "geometry" | "damage" | "marquee";

export type MotionDefinition = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  explanation: string;
};

export type WaapiSample = {
  id: string;
  name: string;
  category: SampleCategory;
  usage: string[];
  era: SampleEra;
  sourceType: SampleSourceType;
  inspiredBy: string;
  description: string;
  suitableFor: string;
  avoidFor: string;
  difficulty: SampleDifficulty;
  intensity: SampleIntensity;
  properties: string[];
  render: SampleRenderKind;
  normal: MotionDefinition;
  reduced: MotionDefinition;
  reducedMotionDescription: string;
  stagger?: number;
  tags: string[];
};

const once = (duration: number, easing = "cubic-bezier(.2,.8,.2,1)"): KeyframeAnimationOptions => ({ duration, easing, iterations: 1, fill: "both" });
const loop = (duration: number, easing = "linear"): KeyframeAnimationOptions => ({ duration, easing, iterations: Infinity, fill: "both" });
const reducedFade = (exit = false): MotionDefinition => ({ keyframes: exit ? [{ opacity: 1 }, { opacity: .4 }] : [{ opacity: .55 }, { opacity: 1 }], options: once(180, "ease-out"), explanation: "大きな移動を使わず、短い濃淡変化だけで状態を示します。" });

export const waapiSamples: readonly WaapiSample[] = [
  {
    id: "fade-in", name: "Fade In", category: "Entrance", usage: ["Card", "Modal"], era: "2020s", sourceType: "Generic UI", inspiredBy: "汎用UIの入場表現", description: "透明な状態から静かに表示します。", suitableFor: "補助情報やカードの穏やかな入場", avoidFor: "即時性が必要な警告", difficulty: "Beginner", intensity: "Subtle", properties: ["opacity"], render: "box",
    normal: { keyframes: [{ opacity: 0 }, { opacity: 1 }], options: once(360, "ease-out"), explanation: "opacityを0から1へ補間し、レイアウトを動かさず表示します。" }, reduced: reducedFade(), reducedMotionDescription: "同じ意味を保ち、180msの短いフェードにします。", tags: ["fade", "entrance", "show"],
  },
  {
    id: "fade-out", name: "Fade Out", category: "Exit", usage: ["Card", "Toast"], era: "2020s", sourceType: "Generic UI", inspiredBy: "汎用UIの退場表現", description: "表示状態から透明になって退出します。", suitableFor: "閉じる要素の穏やかな退場", avoidFor: "消失後も操作可能な状態のままにする実装", difficulty: "Beginner", intensity: "Subtle", properties: ["opacity"], render: "box",
    normal: { keyframes: [{ opacity: 1 }, { opacity: 0 }], options: once(320, "ease-in"), explanation: "opacityを1から0へ補間し、終了側を非表示にします。" }, reduced: reducedFade(true), reducedMotionDescription: "短い濃淡変化で非表示側へ移します。", tags: ["fade", "exit", "hide"],
  },
  {
    id: "slide-in-left", name: "Slide In Left", category: "Entrance", usage: ["Card", "Navigation"], era: "2020s", sourceType: "Generic UI", inspiredBy: "左側から入るナビゲーション", description: "要素が左から所定位置へ入ります。", suitableFor: "進行方向を示す一覧やパネル", avoidFor: "方向に意味がない小さな通知", difficulty: "Beginner", intensity: "Standard", properties: ["opacity", "transform"], render: "box",
    normal: { keyframes: [{ opacity: 0, transform: "translateX(-72px)" }, { opacity: 1, transform: "translateX(0)" }], options: once(460), explanation: "負のtranslateXから0へ移し、左からの入場を示します。" }, reduced: reducedFade(), reducedMotionDescription: "72pxの移動を除き、フェードだけにします。", tags: ["slide", "left", "entrance"],
  },
  {
    id: "slide-out-right", name: "Slide Out Right", category: "Exit", usage: ["Card", "Navigation"], era: "2020s", sourceType: "Generic UI", inspiredBy: "右側へ抜けるナビゲーション", description: "要素が現在位置から右へ退出します。", suitableFor: "次へ進む画面やスワイプ結果", avoidFor: "戻る操作など逆方向を示す場面", difficulty: "Beginner", intensity: "Standard", properties: ["opacity", "transform"], render: "box",
    normal: { keyframes: [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(72px)" }], options: once(420, "ease-in"), explanation: "0から正のtranslateXへ移し、右側の非表示状態で終えます。" }, reduced: reducedFade(true), reducedMotionDescription: "右移動を除き、短いフェードアウトにします。", tags: ["slide", "right", "exit"],
  },
  {
    id: "scale-pop", name: "Scale Pop", category: "Entrance", usage: ["Badge", "Notification"], era: "2020s", sourceType: "Generic UI", inspiredBy: "小さな通知の出現", description: "小さく始まり、一度だけ少し大きくなって着地します。", suitableFor: "バッジや軽い成功通知", avoidFor: "頻繁に更新される一覧全体", difficulty: "Beginner", intensity: "Standard", properties: ["opacity", "transform"], render: "box",
    normal: { keyframes: [{ opacity: 0, transform: "scale(.62)" }, { opacity: 1, transform: "scale(1.12)", offset: .72 }, { opacity: 1, transform: "scale(1)" }], options: once(430, "cubic-bezier(.18,.89,.32,1.28)"), explanation: "1を少し越えるscaleで短いオーバーシュートを作ります。" }, reduced: reducedFade(), reducedMotionDescription: "拡大を除き、枠線と濃淡だけで出現を示します。", tags: ["scale", "pop", "badge"],
  },
  {
    id: "bounce", name: "Bounce", category: "Attention", usage: ["Notification", "Game UI"], era: "2010s", sourceType: "Generic UI", inspiredBy: "弾む注意喚起", description: "高さを変えながら二度着地します。", suitableFor: "一度だけ注目させたいアイコン", avoidFor: "長文や頻繁な自動再生", difficulty: "Intermediate", intensity: "Strong", properties: ["transform"], render: "box",
    normal: { keyframes: [{ transform: "translateY(0)" }, { transform: "translateY(-34px)", offset: .34 }, { transform: "translateY(0)", offset: .58 }, { transform: "translateY(-14px)", offset: .76 }, { transform: "translateY(0)" }], options: once(760, "ease-out"), explanation: "高さの異なる二つの山で減衰する跳ね返りを作ります。" }, reduced: { keyframes: [{ borderColor: "#4de77d" }, { borderColor: "#f3d56b" }, { borderColor: "#4de77d" }], options: once(300), explanation: "上下移動を止め、枠線の変化で注意を示します。" }, reducedMotionDescription: "移動せず枠線を一度変化させます。", tags: ["bounce", "attention"],
  },
  {
    id: "shake", name: "Shake", category: "Feedback", usage: ["Form", "Error"], era: "2010s", sourceType: "Generic UI", inspiredBy: "入力エラーの拒否反応", description: "左右へ素早く揺れてエラーを伝えます。", suitableFor: "送信直後の入力エラー", avoidFor: "原因説明の代用や連続再生", difficulty: "Intermediate", intensity: "Strong", properties: ["transform"], render: "box",
    normal: { keyframes: [{ transform: "translateX(0)" }, { transform: "translateX(-12px)" }, { transform: "translateX(10px)" }, { transform: "translateX(-7px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], options: once(440, "ease-in-out"), explanation: "左右の距離を徐々に減らして、短い拒否反応を作ります。" }, reduced: { keyframes: [{ borderColor: "#4de77d" }, { borderColor: "#ff6f75" }, { borderColor: "#4de77d" }], options: once(320), explanation: "揺れを止め、エラー色の枠線と文章で状態を示します。" }, reducedMotionDescription: "左右移動を赤い枠線変化へ置換します。", tags: ["shake", "error", "form"],
  },
  {
    id: "button-press", name: "Button Press", category: "Feedback", usage: ["Button"], era: "2020s", sourceType: "Generic UI", inspiredBy: "押下の触覚的フィードバック", description: "ボタンが沈み、すぐ元の高さへ戻ります。", suitableFor: "主要ボタンの押下確認", avoidFor: "押下状態を長時間保持する選択UI", difficulty: "Beginner", intensity: "Subtle", properties: ["transform", "boxShadow"], render: "button",
    normal: { keyframes: [{ transform: "translateY(0) scale(1)", boxShadow: "0 5px 0 #183d2c" }, { transform: "translateY(4px) scale(.97)", boxShadow: "0 1px 0 #183d2c" }, { transform: "translateY(0) scale(1)", boxShadow: "0 5px 0 #183d2c" }], options: once(230, "ease-out"), explanation: "translateYと影の高さを同時に縮め、物理的な押下感を示します。" }, reduced: { keyframes: [{ backgroundColor: "#153b29" }, { backgroundColor: "#286344" }, { backgroundColor: "#153b29" }], options: once(180), explanation: "沈み込みを使わず背景色だけで押下を返します。" }, reducedMotionDescription: "位置を動かさず背景色を一度変えます。", tags: ["button", "press", "feedback"],
  },
  {
    id: "modal-open-close", name: "Modal Open / Close", category: "Feedback", usage: ["Modal"], era: "2020s", sourceType: "Generic UI", inspiredBy: "ダイアログの開閉", description: "背景から浮かぶ開場と、元へ戻る閉場を切り替えます。", suitableFor: "確認ダイアログや短いフォーム", avoidFor: "画面全体を頻繁に遮る通知", difficulty: "Intermediate", intensity: "Standard", properties: ["opacity", "transform"], render: "modal",
    normal: { keyframes: [{ opacity: 0, transform: "translateY(18px) scale(.92)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], options: once(360), explanation: "フェード、上移動、拡大を組み合わせ、逆順で閉じます。" }, reduced: reducedFade(), reducedMotionDescription: "開閉とも移動と拡大を除いた短いフェードにします。", tags: ["modal", "open", "close"],
  },
  {
    id: "toast-enter-exit", name: "Toast Enter / Exit", category: "Feedback", usage: ["Toast", "Notification"], era: "2020s", sourceType: "App", inspiredBy: "画面端の一時通知", description: "右端から入り、確認後は右端へ退出します。", suitableFor: "保存完了などの補助通知", avoidFor: "操作を止める重大な警告", difficulty: "Intermediate", intensity: "Standard", properties: ["opacity", "transform"], render: "toast",
    normal: { keyframes: [{ opacity: 0, transform: "translateX(76px)" }, { opacity: 1, transform: "translateX(0)" }], options: once(400, "cubic-bezier(.2,.9,.25,1)"), explanation: "正のtranslateXから入り、逆順再生で同じ右側へ退出します。" }, reduced: reducedFade(), reducedMotionDescription: "横移動を除き、短いフェードで入退場します。", tags: ["toast", "enter", "exit"],
  },
  {
    id: "toggle-switch", name: "Toggle Switch", category: "Feedback", usage: ["Form", "Settings"], era: "2010s", sourceType: "App", inspiredBy: "二値設定のスイッチ", description: "ノブがトラックの反対側へ移り、ON/OFFを示します。", suitableFor: "即時反映される二値設定", avoidFor: "送信前に確定が必要な選択", difficulty: "Intermediate", intensity: "Subtle", properties: ["transform", "backgroundColor"], render: "toggle",
    normal: { keyframes: [{ transform: "translateX(0)", backgroundColor: "#9aa9a0" }, { transform: "translateX(26px)", backgroundColor: "#eafff1" }], options: once(260, "cubic-bezier(.25,.8,.25,1)"), explanation: "ノブをトラック幅に合わせて26px移動し、ON色へ変えます。" }, reduced: { keyframes: [{ backgroundColor: "#9aa9a0" }, { backgroundColor: "#eafff1" }], options: once(160), explanation: "ノブ位置は状態更新後に静的に切り替え、色変化を短くします。" }, reducedMotionDescription: "連続移動を行わず、状態と色を即座に更新します。", tags: ["toggle", "switch", "settings"],
  },
  {
    id: "progress-bar", name: "Progress Bar", category: "Loading", usage: ["Loading", "Progress"], era: "2000s", sourceType: "Generic UI", inspiredBy: "完了量を示す線形進捗", description: "トラック内の塗りが0%から100%へ進みます。", suitableFor: "完了量を計測できる処理", avoidFor: "終了量が不明な待機", difficulty: "Beginner", intensity: "Subtle", properties: ["transform"], render: "progress",
    normal: { keyframes: [{ transform: "scaleX(.02)" }, { transform: "scaleX(1)" }], options: once(1400, "cubic-bezier(.3,.7,.2,1)"), explanation: "左端を基準にscaleXを増やし、レイアウト計算なしで進捗を描きます。" }, reduced: { keyframes: [{ opacity: .65 }, { opacity: 1 }], options: once(240), explanation: "100%の静的バーを表示し、短い濃淡だけで更新を示します。" }, reducedMotionDescription: "完成状態のバーを静的表示し、意味を維持します。", tags: ["progress", "bar", "loading"],
  },
  {
    id: "typewriter", name: "Typewriter", category: "Text", usage: ["Text", "Hero"], era: "2010s", sourceType: "Web", inspiredBy: "端末入力とタイプライター", description: "一行の文字列を左から段階的に露出します。", suitableFor: "短い見出しや端末風演出", avoidFor: "本文、読み上げ順を遅らせる情報", difficulty: "Intermediate", intensity: "Standard", properties: ["clipPath"], render: "typewriter",
    normal: { keyframes: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], options: once(1500, "steps(16, end)"), explanation: "clip-pathの右側を段階的に開き、文字列を順に露出します。" }, reduced: reducedFade(), reducedMotionDescription: "全文を最初から提示し、短いフェードだけにします。", tags: ["typewriter", "text", "terminal"],
  },
  {
    id: "character-by-character", name: "Character by Character", category: "Text", usage: ["Text", "Headline"], era: "2020s", sourceType: "Web", inspiredBy: "文字単位の段階入場", description: "独立した文字が時間差で下から現れます。", suitableFor: "短いロゴタイプや見出し", avoidFor: "長文や重要な即時情報", difficulty: "Intermediate", intensity: "Standard", properties: ["opacity", "transform"], render: "characters", stagger: 70,
    normal: { keyframes: [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], options: once(320), explanation: "各文字へ70msずつdelayを足し、個別の入場を見せます。" }, reduced: reducedFade(), reducedMotionDescription: "文字ごとの遅延を除き、全文を一度に表示します。", tags: ["character", "stagger", "text"],
  },
  {
    id: "counter-roll", name: "Counter Roll", category: "Text", usage: ["Counter", "Score"], era: "2020s", sourceType: "App", inspiredBy: "機械式カウンターの桁送り", description: "数字列が縦へ送り出され、目標値で止まります。", suitableFor: "短い統計値やスコア更新", avoidFor: "正確な値を即時確認する必要がある頻繁な更新", difficulty: "Advanced", intensity: "Standard", properties: ["transform"], render: "counter",
    normal: { keyframes: [{ transform: "translateY(0)" }, { transform: "translateY(-252px)" }], options: once(1100, "cubic-bezier(.15,.7,.2,1)"), explanation: "縦に積んだ数字列を上へ送り、最後の値を窓内へ止めます。" }, reduced: reducedFade(), reducedMotionDescription: "最終値を静的表示し、短いフェードで更新します。", tags: ["counter", "number", "roll"],
  },
  {
    id: "cursor-blink", name: "Cursor Blink", category: "Text", usage: ["Text", "Terminal"], era: "1990s", sourceType: "OS", inspiredBy: "CLIの入力待ちカーソル", description: "文字カーソルだけが一定間隔で明滅します。", suitableFor: "入力可能な端末表示", avoidFor: "入力できない装飾だけの場所", difficulty: "Beginner", intensity: "Subtle", properties: ["opacity"], render: "cursor",
    normal: { keyframes: [{ opacity: 1 }, { opacity: 0 }], options: loop(700, "steps(1, end)"), explanation: "steps easingで中間値を作らず、カーソルを明確に点滅させます。" }, reduced: { keyframes: [{ opacity: 1 }, { opacity: .65 }], options: once(200), explanation: "ループを止め、入力位置が分かる静的カーソルを残します。" }, reducedMotionDescription: "点滅を停止してカーソルを表示したままにします。", tags: ["cursor", "blink", "terminal"],
  },
  {
    id: "windows-xp-segments", name: "Windows XP風 横移動セグメントローダー", category: "Loading", usage: ["Loading", "OS UI"], era: "2000s", sourceType: "OS", inspiredBy: "XP-eraの短い矩形が横切る不定進捗", description: "複数のセグメントがまとまってトラックを横断します。", suitableFor: "終了量が不明な短い待機", avoidFor: "実際の完了率を伝える処理", difficulty: "Intermediate", intensity: "Standard", properties: ["transform", "opacity"], render: "xp-segments",
    normal: { keyframes: [{ transform: "translateX(-86px)", opacity: .2 }, { opacity: 1, offset: .25 }, { opacity: 1, offset: .75 }, { transform: "translateX(188px)", opacity: .2 }], options: loop(1200), explanation: "小さな矩形群を左外から右外へ一定速度で通過させます。" }, reduced: { keyframes: [{ opacity: .55 }, { opacity: 1 }], options: once(260), explanation: "横断ループを止め、中央の静的セグメントを穏やかに強調します。" }, reducedMotionDescription: "横移動を停止し、中央に進行中の形を残します。", tags: ["windows", "xp", "segment", "loader"],
  },
  {
    id: "windows-orbit-dots", name: "Windows 8/10風 回転ドット", category: "Loading", usage: ["Loading", "OS UI"], era: "2010s", sourceType: "OS", inspiredBy: "Windows 8/10-eraの時間差で巡る点", description: "円周上の点が時間差で強くなり、回転を連想させます。", suitableFor: "小さな不定待機表示", avoidFor: "長時間表示や完了率の提示", difficulty: "Advanced", intensity: "Standard", properties: ["opacity", "transform"], render: "orbit-dots", stagger: 95,
    normal: { keyframes: [{ opacity: .15, transform: "scale(.65)" }, { opacity: 1, transform: "scale(1)", offset: .35 }, { opacity: .15, transform: "scale(.65)" }], options: loop(900, "ease-in-out"), explanation: "円周上の各点へ95msのdelayを付け、点の強弱が巡る軌道を作ります。" }, reduced: { keyframes: [{ opacity: .45 }, { opacity: .8 }], options: once(220), explanation: "時間差ループを止め、円形の静的な待機記号を残します。" }, reducedMotionDescription: "回転感のある連続変化を止め、点を静的表示します。", tags: ["windows", "dots", "orbit", "loader"],
  },
  {
    id: "classic-mac-watch", name: "Classic Mac 腕時計カーソル風", category: "Loading", usage: ["Loading", "OS UI"], era: "1990s", sourceType: "OS", inspiredBy: "Classic Mac-eraの腕時計型待機カーソル", description: "文字盤の針が進み、待機中であることを抽象的に示します。", suitableFor: "歴史的UIの説明展示", avoidFor: "現代の標準カーソルとしての常用", difficulty: "Intermediate", intensity: "Subtle", properties: ["transform"], render: "watch",
    normal: { keyframes: [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], options: loop(1200, "steps(8, end)"), explanation: "中心を基準に針を8段階で一周させ、古いカーソルのテンポを抽象化します。" }, reduced: { keyframes: [{ opacity: .65 }, { opacity: 1 }], options: once(220), explanation: "針を12時位置で止め、輪郭だけを短く強調します。" }, reducedMotionDescription: "針の回転を止め、腕時計形状を静的表示します。", tags: ["classic mac", "watch", "cursor"],
  },
  {
    id: "macos-spinner", name: "macOS風 待機インジケーター", category: "Loading", usage: ["Loading", "OS UI"], era: "2000s", sourceType: "OS", inspiredBy: "macOS-eraの放射状スポークの濃淡遷移", description: "放射状スポークが順番に濃くなります。", suitableFor: "小さな不定待機表示", avoidFor: "長時間処理や完了量の説明", difficulty: "Intermediate", intensity: "Subtle", properties: ["opacity"], render: "spinner-spokes", stagger: 80,
    normal: { keyframes: [{ opacity: .16 }, { opacity: 1, offset: .2 }, { opacity: .16 }], options: loop(960), explanation: "12本のスポークへ80msずつdelayを加え、濃淡が円周を巡るように見せます。" }, reduced: { keyframes: [{ opacity: .35 }, { opacity: .7 }], options: once(220), explanation: "連続する濃淡遷移を止め、静的な放射形を表示します。" }, reducedMotionDescription: "スポークの連続変化を停止します。", tags: ["macos", "spinner", "spokes"],
  },
  {
    id: "dock-bounce", name: "Dock Bounce風", category: "Attention", usage: ["App", "Notification"], era: "2000s", sourceType: "OS", inspiredBy: "Dock-eraのアプリアイコンが基準線から跳ねる注意喚起", description: "抽象アイコンが基準線から二度跳ねます。", suitableFor: "利用者の操作を一度だけ求める通知", avoidFor: "繰り返し続ける販促やロゴ演出", difficulty: "Intermediate", intensity: "Strong", properties: ["transform"], render: "dock",
    normal: { keyframes: [{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-38px) scale(.98)", offset: .32 }, { transform: "translateY(0) scale(1.04)", offset: .55 }, { transform: "translateY(-16px) scale(1)", offset: .74 }, { transform: "translateY(0) scale(1)" }], options: once(820, "ease-out"), explanation: "基準線へ二度着地させ、二回目の高さを下げて減衰を示します。" }, reduced: { keyframes: [{ boxShadow: "0 0 0 #4de77d" }, { boxShadow: "0 0 20px #4de77d" }, { boxShadow: "0 0 0 #4de77d" }], options: once(320), explanation: "跳ねを止め、アイコンの発光で注意を示します。" }, reducedMotionDescription: "上下移動を一度の発光へ置換します。", tags: ["dock", "bounce", "icon"],
  },
  {
    id: "geometric-formation", name: "ゲーム機風 幾何学オブジェクト形成", category: "Advanced", usage: ["Game UI", "Loading"], era: "2000s", sourceType: "Game", inspiredBy: "ゲーム機起動時の複数パーツが空間から集まる構成", description: "異なる位置の幾何学パーツが中央で一つの記号を形成します。", suitableFor: "短いブランド非依存の起動演出", avoidFor: "実在ロゴの模倣や頻繁な画面遷移", difficulty: "Advanced", intensity: "Strong", properties: ["opacity", "transform"], render: "geometry", stagger: 65,
    normal: { keyframes: [{ opacity: 0, transform: "translate(var(--part-x), var(--part-y)) rotate(var(--part-r)) scale(.35)" }, { opacity: 1, transform: "translate(0, 0) rotate(0deg) scale(1)" }], options: once(900, "cubic-bezier(.16,.82,.25,1)"), explanation: "CSS変数で各パーツの開始位置と角度を変え、同じ中心へ時間差で集合させます。" }, reduced: reducedFade(), reducedMotionDescription: "集合移動を除き、完成した抽象図形を一度に表示します。", tags: ["game", "geometry", "startup"],
  },
  {
    id: "damage-number-pop", name: "Damage Number Pop", category: "Feedback", usage: ["Game UI", "Notification"], era: "2010s", sourceType: "Game", inspiredBy: "ゲームUIのダメージ数値フィードバック", description: "数値が上へ飛び出し、拡大後に減衰します。", suitableFor: "短いゲーム内結果の補助表示", avoidFor: "数値だけに依存する重要情報", difficulty: "Intermediate", intensity: "Strong", properties: ["opacity", "transform"], render: "damage",
    normal: { keyframes: [{ opacity: 0, transform: "translateY(8px) scale(.55)" }, { opacity: 1, transform: "translateY(-10px) scale(1.32)", offset: .32 }, { opacity: 1, transform: "translateY(-22px) scale(1)", offset: .68 }, { opacity: 0, transform: "translateY(-34px) scale(.92)" }], options: once(760, "cubic-bezier(.2,.75,.25,1)"), explanation: "上昇、拡大、減衰を4段階で組み合わせ、短い数値反応を作ります。" }, reduced: { keyframes: [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }], options: once(300), explanation: "上昇と拡大を除き、数値を短く表示して意味を残します。" }, reducedMotionDescription: "数値の移動を止め、静的な表示へ変更します。", tags: ["damage", "number", "game"],
  },
  {
    id: "web-1990s-marquee", name: "1990年代Web風 Marquee", category: "Continuous", usage: ["Text", "Decoration"], era: "1990s", sourceType: "Web", inspiredBy: "初期Webの文字列が表示領域を横断するmarquee表現", description: "テキストが右端の外から左端の外まで横断します。", suitableFor: "Web史を扱う展示や意図的なレトロ表現", avoidFor: "本文、重要通知、読み続ける必要がある情報", difficulty: "Intermediate", intensity: "Strong", properties: ["transform"], render: "marquee",
    normal: { keyframes: [{ transform: "translateX(0)" }, { transform: "translateX(var(--marquee-distance))" }], options: loop(5200), explanation: "ステージ幅と文字幅から実移動距離を測り、表示領域全体を一定速度で横断します。" }, reduced: { keyframes: [{ opacity: .65 }, { opacity: 1 }], options: once(220), explanation: "横断を止め、全文を中央へ静的表示します。" }, reducedMotionDescription: "自動スクロールを停止し、文字列を常時読める状態にします。", tags: ["1990s", "web", "marquee", "text"],
  },
] as const;

export const waapiSampleCount = waapiSamples.length;

export function formatAnimationCode(sample: WaapiSample, reducedMotion = false) {
  const motion = reducedMotion ? sample.reduced : sample.normal;
  return `const keyframes = ${JSON.stringify(motion.keyframes, null, 2)};\n\nconst options = ${JSON.stringify(motion.options, null, 2)};\n\nelement.animate(keyframes, options);`;
}
