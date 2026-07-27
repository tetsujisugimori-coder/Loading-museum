export type ExhibitClassification =
  | "実在ソフトを参考にした再現"
  | "当時広く使われた表現"
  | "時代風の再現";

export type AnimationType =
  | "spinner"
  | "dots"
  | "blink"
  | "text-progress"
  | "copy-log"
  | "extract-log"
  | "compile-log"
  | "disk-check-log";

export type CodeLanguage = "JavaScript" | "CSS";

export type RoomExhibit = {
  exhibitId: string;
  title: string;
  animationType: AnimationType;
  usage: string;
  classification: ExhibitClassification;
  explanation: string;
  implementationNote: string;
  codeLanguage: CodeLanguage;
  codeExample: string;
};

export type ExhibitRoom = {
  roomId: string;
  roomTitle: string;
  period: string;
  description: string;
  exhibits: RoomExhibit[];
};

export const exhibitRooms: ExhibitRoom[] = [
  {
    roomId: "ms-dos-pc-command-line",
    roomTitle: "MS-DOS・PCコマンドライン展示室",
    period: "1980年代〜1990年代",
    description: "文字だけで待機や進捗を表現した時代",
    exhibits: [
      {
        exhibitId: "rotating-spinner",
        title: "回転スピナー",
        animationType: "spinner",
        usage: "処理中や通信待ちの簡易表示",
        classification: "当時広く使われた表現",
        explanation:
          "四つの記号を同じ位置で順番に見せ、限られた文字画面でも処理が続いていることを伝えます。",
        implementationNote:
          "JavaScriptで「-」「\\」「|」「/」を一定間隔ごとに切り替えて再現しています。",
        codeLanguage: "JavaScript",
        codeExample: `const SPINNER_FRAMES = ["-", "\\\\", "|", "/"] as const;
const frame = useSequencedValue(SPINNER_FRAMES, 180, active);`,
      },
      {
        exhibitId: "growing-dots",
        title: "ドット増加",
        animationType: "dots",
        usage: "読み込み中や応答待ちの表示",
        classification: "当時広く使われた表現",
        explanation:
          "単語の後ろに点を一つずつ足し、文章だけで時間の経過を感じさせる表現です。",
        implementationNote:
          "JavaScriptでドット数をゼロから三つまで循環させて再現しています。",
        codeLanguage: "JavaScript",
        codeExample: `const DOT_FRAMES = ["Loading", "Loading.", "Loading..", "Loading..."] as const;
const text = useSequencedValue(DOT_FRAMES, 420, active);`,
      },
      {
        exhibitId: "blinking-wait",
        title: "点滅する待機表示",
        animationType: "blink",
        usage: "処理完了まで操作を待ってもらう場面",
        classification: "当時広く使われた表現",
        explanation:
          "短い案内文の明暗を変え、画面が停止していないことを控えめに示します。",
        implementationNote:
          "CSSで穏やかな点滅を再現し、動きを減らす設定にも対応しています。",
        codeLanguage: "CSS",
        codeExample: `.dosBlink[data-active="true"] {
  animation: dos-blink 1.1s steps(2, end) infinite;
}`,
      },
      {
        exhibitId: "text-progress",
        title: "文字プログレスバー",
        animationType: "text-progress",
        usage: "インストールや長い処理の進捗表示",
        classification: "当時広く使われた表現",
        explanation:
          "角括弧の中を記号で埋め、数値と組み合わせて完了までの距離を示します。",
        implementationNote:
          "JavaScriptで進捗値から十文字のバーとパーセント表示を生成しています。",
        codeLanguage: "JavaScript",
        codeExample: `const progress = useSequencedValue(PROGRESS_VALUES, 520, active);
const text = renderTextProgress(progress);`,
      },
      {
        exhibitId: "file-copy",
        title: "ファイルコピー表示",
        animationType: "copy-log",
        usage: "複数ファイルをコピーする場面",
        classification: "時代風の再現",
        explanation:
          "処理対象のファイル名を順番に表示し、最後に完了メッセージを加えた時代風のログです。",
        implementationNote:
          "JavaScriptでログ行を順番に追加し、三行分の表示領域を保ったまま再現しています。",
        codeLanguage: "JavaScript",
        codeExample: `const visibleCount = useSequencedValue(LOG_STEPS, 900, active);
const visibleLines = lines.slice(0, visibleCount);`,
      },
      {
        exhibitId: "archive-extract",
        title: "圧縮ファイル展開表示",
        animationType: "extract-log",
        usage: "圧縮された配布物を展開する場面",
        classification: "時代風の再現",
        explanation:
          "展開中のファイル名と完了状態を、簡潔な英語のログとして構成した再現です。",
        implementationNote:
          "JavaScriptで展開対象のログ行を一定間隔で一行ずつ追加しています。",
        codeLanguage: "JavaScript",
        codeExample: `const visibleCount = useSequencedValue(LOG_STEPS, 900, active);
const visibleLines = lines.slice(0, visibleCount);`,
      },
      {
        exhibitId: "compile-build",
        title: "コンパイル進行表示",
        animationType: "compile-log",
        usage: "ソースコードから実行ファイルを作る場面",
        classification: "時代風の再現",
        explanation:
          "コンパイル、リンク、成功という流れを、特定製品に依存しない短いログで表現しています。",
        implementationNote:
          "JavaScriptでビルド工程のメッセージを順番に追加して再現しています。",
        codeLanguage: "JavaScript",
        codeExample: `const visibleCount = useSequencedValue(LOG_STEPS, 900, active);
const visibleLines = lines.slice(0, visibleCount);`,
      },
      {
        exhibitId: "disk-check",
        title: "ディスク確認風表示",
        animationType: "disk-check-log",
        usage: "ドライブやディレクトリの状態を確認する場面",
        classification: "時代風の再現",
        explanation:
          "ドライブ確認の進行を示す典型的な語句を組み合わせた、特定コマンドに依存しない再現です。",
        implementationNote:
          "JavaScriptで確認工程のログを一行ずつ表示し、最後に結果を示しています。",
        codeLanguage: "JavaScript",
        codeExample: `const visibleCount = useSequencedValue(LOG_STEPS, 900, active);
const visibleLines = lines.slice(0, visibleCount);`,
      },
    ],
  },
];
