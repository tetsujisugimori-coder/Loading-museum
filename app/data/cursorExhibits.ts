export type CursorExhibitType =
  | "arrow"
  | "link"
  | "ibeam"
  | "waiting"
  | "forbidden"
  | "drag"
  | "click"
  | "trail";

export type CursorExhibit = {
  id: string;
  name: string;
  category: "カーソル";
  period: string;
  purpose: string;
  description: string;
  interaction: string;
  technologies: readonly string[];
  relatedExhibits: readonly string[];
  type: CursorExhibitType;
  implementationNote: string;
};

export const cursorExhibits: readonly CursorExhibit[] = [
  {
    id: "standard-arrow",
    name: "標準矢印カーソル",
    category: "カーソル",
    period: "1960年代〜現在",
    purpose: "選択",
    description: "画面上の位置と選択対象を示す、最も基本的なポインターです。",
    interaction: "展示領域内でポインターを動かしてください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: [],
    type: "arrow",
    implementationNote: "CSSの多角形で抽象化した矢印を作り、JavaScriptで展示領域内に収まる位置へ追従させています。",
  },
  {
    id: "link-hand",
    name: "リンク用の手カーソル",
    category: "カーソル",
    period: "1990年代〜現在",
    purpose: "リンク",
    description: "移動先や実行可能な対象があることを、手の形への変化で知らせます。",
    interaction: "リンク風ボタンへホバー、フォーカス、またはタップしてください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: [],
    type: "link",
    implementationNote: "CSS図形の手を使い、JavaScriptとフォーカスイベントで矢印から手への状態変化を再現しています。",
  },
  {
    id: "text-ibeam",
    name: "Iビームカーソル",
    category: "カーソル",
    period: "1970年代〜現在",
    purpose: "入力",
    description: "文字の入力位置や、選択できる文章領域を示す縦長のカーソルです。",
    interaction: "文章または入力欄へホバーし、入力欄は実際に編集できます。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: [],
    type: "ibeam",
    implementationNote: "CSSの縦線と横棒でIビームを作り、JavaScriptでテキスト領域上の形状を切り替えています。",
  },
  {
    id: "waiting-pointer",
    name: "待機カーソル",
    category: "カーソル",
    period: "1980年代〜現在",
    purpose: "待機",
    description: "操作位置を保ちながら、背後で処理が続いていることを小さな回転で伝えます。",
    interaction: "展示領域で、矢印に添うリングの回転を観察してください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: ["ローディング展示室"],
    type: "waiting",
    implementationNote: "OS固有画像を使わず、CSSの境界線アニメーションで矢印横の待機リングを再現しています。",
  },
  {
    id: "forbidden-pointer",
    name: "禁止カーソル",
    category: "カーソル",
    period: "1980年代〜現在",
    purpose: "禁止",
    description: "現在の場所では操作を受け付けないことを、円と斜線で伝えます。",
    interaction: "操作できない領域へホバー、フォーカス、またはタップしてください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: ["通知・警告展示室（準備中）"],
    type: "forbidden",
    implementationNote: "展示配色に合わせたCSSの円と斜線で一般的な禁止記号を再現しています。",
  },
  {
    id: "drag-pointer",
    name: "ドラッグ中カーソル",
    category: "カーソル",
    period: "1980年代〜現在",
    purpose: "ドラッグ",
    description: "対象をつかんで移動している状態を、閉じた手の形と対象の移動で示します。",
    interaction: "カードを押したまま、展示領域内で少し移動してください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: [],
    type: "drag",
    implementationNote: "Pointer Eventsで押下と移動を追跡し、CSSの手とカードを展示領域内だけで動かしています。",
  },
  {
    id: "click-effect",
    name: "クリックエフェクト",
    category: "カーソル",
    period: "2000年代〜現在",
    purpose: "操作のフィードバック",
    description: "クリックやタップが受け付けられた位置を、短い光の波紋で知らせます。",
    interaction: "展示領域の好きな場所を連続してクリックまたはタップしてください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: ["通知・警告展示室（準備中）"],
    type: "click",
    implementationNote: "JavaScriptで押した位置だけを記録し、CSSアニメーションで複数の波紋を約600ミリ秒後に消しています。",
  },
  {
    id: "cursor-trail",
    name: "カーソルの残像",
    category: "カーソル",
    period: "1990年代〜現在",
    purpose: "位置の強調・装飾",
    description: "移動経路を短時間だけ残し、速さや方向を視覚的に強調する表現です。",
    interaction: "展示領域内でポインターをゆっくり、次に素早く動かしてください。",
    technologies: ["CSS", "JavaScript", "Pointer Events"],
    relatedExhibits: ["スクロール展示室（準備中）"],
    type: "trail",
    implementationNote: "固定した5個のCSS点をJavaScriptで順送りし、DOMを増やさず残像を再現しています。動きを減らす設定では非表示です。",
  },
];
