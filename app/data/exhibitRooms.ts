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

export type TerminalAnimationType =
  | "unix-login"
  | "linux-boot"
  | "sysvinit"
  | "apt-progress"
  | "configure-make";

export type CodeLanguage = "JavaScript" | "CSS";

type RoomExhibitBase = {
  exhibitId: string;
  title: string;
  explanation: string;
  implementationNote: string;
  codeLanguage: CodeLanguage;
  codeExample: string;
};

export type DosRoomExhibit = RoomExhibitBase & {
  kind: "dos";
  animationType: AnimationType;
  usage: string;
  classification: ExhibitClassification;
};

export type TerminalRoomExhibit = RoomExhibitBase & {
  kind: "terminal";
  animationType: TerminalAnimationType;
  period: string;
  environment: string;
  authenticDelay: number;
  viewingDelay: number;
};

export type RoomExhibit = DosRoomExhibit | TerminalRoomExhibit;

export type ExhibitRoom = {
  roomId: string;
  roomTitle: string;
  period: string;
  description: string;
  theme: "dos" | "unix";
  exhibits: RoomExhibit[];
};

export const exhibitRooms: ExhibitRoom[] = [
  {
    roomId: "ms-dos-pc-command-line",
    roomTitle: "MS-DOS・PCコマンドライン展示室",
    period: "1980年代〜1990年代",
    description: "文字だけで待機や進捗を表現した時代",
    theme: "dos",
    exhibits: [
      {
        kind: "dos",
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
        kind: "dos",
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
        kind: "dos",
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
        kind: "dos",
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
        kind: "dos",
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
        kind: "dos",
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
        kind: "dos",
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
        kind: "dos",
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
  {
    roomId: "linux-unix",
    roomTitle: "Linux / UNIX 展示室",
    period: "1970年代〜現在",
    description: "端末ログ、起動、サービス管理、パッケージ操作の多様な系譜",
    theme: "unix",
    exhibits: [
      {
        kind: "terminal",
        exhibitId: "unix-login",
        title: "UNIX風ログイン",
        animationType: "unix-login",
        period: "1970年代以降",
        environment: "UNIX系端末／シェル",
        explanation:
          "端末で資格情報を入力し、前回ログインの案内を経てシェルへ入る流れを短く再構成しています。パスワードの内容は表示しません。",
        implementationNote:
          "JavaScriptでユーザー名を一文字ずつ表示し、パスワード待機とブロックカーソルを組み合わせています。実際の認証や入力処理は行いません。",
        codeLanguage: "JavaScript",
        codeExample: `const steps = makeLoginSteps();
const demo = useTerminalSequence(steps, baseDelay, active, prefersReducedMotion);`,
        authenticDelay: 420,
        viewingDelay: 850,
      },
      {
        kind: "terminal",
        exhibitId: "linux-kernel-boot",
        title: "Linuxカーネル起動ログ",
        animationType: "linux-boot",
        period: "1990年代以降",
        environment: "Linuxカーネル／架空の汎用環境",
        explanation:
          "CPU、メモリ、仮想ストレージ、デバイス認識を示す短い架空ログです。Linux環境ごとに起動表示が異なることを前提にしています。",
        implementationNote:
          "JavaScriptで待ち時間に強弱を付けながら架空ログを追加し、最新行へ自動スクロールします。実在する端末名、利用者、通信先は使用していません。",
        codeLanguage: "JavaScript",
        codeExample: `const steps = makeBootSteps();
screen.scrollTop = stepIndex === 0 ? 0 : screen.scrollHeight;`,
        authenticDelay: 120,
        viewingDelay: 360,
      },
      {
        kind: "terminal",
        exhibitId: "sysvinit-startup",
        title: "SysVinit風の起動表示",
        animationType: "sysvinit",
        period: "1990年代〜2000年代",
        environment: "Red Hat系など／SysVinit風",
        explanation:
          "サービス名と状態を縦に並べた、Red Hat系などで見られたSysVinit風の再現です。Linux共通の標準表示ではありません。",
        implementationNote:
          "JavaScriptで点の増減とサービスごとに異なる待ち時間を再現し、完了時だけ右端へ状態を表示します。サービス操作は行いません。",
        codeLanguage: "JavaScript",
        codeExample: `const steps = makeSysvSteps();
const delay = baseDelay * steps[stepIndex].delayFactor;`,
        authenticDelay: 300,
        viewingDelay: 650,
      },
      {
        kind: "terminal",
        exhibitId: "apt-progress",
        title: "Debian系APT風の進捗表示",
        animationType: "apt-progress",
        period: "1990年代後半以降",
        environment: "Debian系／APT風",
        explanation:
          "一覧取得、ダウンロード、展開、設定という流れを短くまとめたAPT風の再現です。実際の通信やパッケージ操作は行いません。",
        implementationNote:
          "JavaScriptで取得、展開、設定の段階を切り替え、回転カーソル、文字バー、速度、残り時間を変化させます。",
        codeLanguage: "JavaScript",
        codeExample: `const steps = makeAptSteps();
const delay = baseDelay * steps[stepIndex].delayFactor;`,
        authenticDelay: 220,
        viewingDelay: 520,
      },
      {
        kind: "terminal",
        exhibitId: "configure-make-build",
        title: "configure・make風コンパイル",
        animationType: "configure-make",
        period: "1970年代〜現在",
        environment: "UNIX/Linux開発環境",
        explanation:
          "環境確認、複数ソースのコンパイル、リンク、完了という開発作業の流れを、架空のファイル名で短く再構成しています。",
        implementationNote:
          "JavaScriptでchecking、compiling、linkingの段階、ファイル名、文字バーを切り替えるデモです。実際のコマンド実行やコンパイルは行いません。",
        codeLanguage: "JavaScript",
        codeExample: `const steps = makeCompileSteps();
const demo = useTerminalSequence(steps, baseDelay, active, prefersReducedMotion);`,
        authenticDelay: 180,
        viewingDelay: 480,
      },
    ],
  },
];
