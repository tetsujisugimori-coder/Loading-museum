export type AppleEarlyVisualType =
  | "apple-one-setup"
  | "apple-one-monitor"
  | "apple-one-cassette"
  | "text-scroll"
  | "apple-two-boot"
  | "apple-basic"
  | "cassette-storage"
  | "low-resolution"
  | "high-resolution"
  | "disk-boot"
  | "disk-patterns"
  | "game-loading"
  | "error-retry";

export type AppleEarlyCategory = "Apple I" | "Apple II" | "Disk II" | "比較展示";
export type AppleEarlyReconstructionLevel = "史料ベース" | "概念再構成" | "創作比較";

export type AppleEarlyExhibit = {
  id: string;
  name: string;
  category: AppleEarlyCategory;
  period: string;
  system: string;
  medium: string;
  visualType: AppleEarlyVisualType;
  reconstructionLevel: AppleEarlyReconstructionLevel;
  shortDescription: string;
  observationPoint: string;
  technicalBackground: string;
  modernWebConnection: string;
  caution: string;
  historicalBasis: string;
  sources: readonly string[];
  instructions: string;
};

const APPLE_ONE_MANUAL = "Apple-1 Operation Manual（Computer History Museum, 1976）";
const APPLE_TWO_MANUAL = "Apple II Reference Manual（1978／1979）";
const DISK_TWO_MANUAL = "Disk II Floppy Disk Subsystem Installation & Operating Manual（1978）";
const SMITHSONIAN_ACI = "Apple I Microcomputer Cassette Interface（Smithsonian）";
const sharedCaution = "実機ROM、ソフトウェア、画面、ロゴ、筐体意匠を複製しない教育目的の非公式Web再構成です。";

export const appleEarlyExhibits: readonly AppleEarlyExhibit[] = [
  {
    id: "apple-one-setup",
    name: "周辺機器を組み合わせる Apple I",
    category: "Apple I",
    period: "1976",
    system: "Apple I",
    medium: "基板 / 電源 / キーボード / ディスプレイ",
    visualType: "apple-one-setup",
    reconstructionLevel: "概念再構成",
    shortDescription: "基板中心の製品へ、利用者が電源・入力・表示・保存機器を接続する構成図です。",
    observationPoint: "周辺機器を接続すると、入力から表示、保存までの経路が順に成立する点。",
    technicalBackground: "Apple Iは組み立て済み基板として販売され、利用には電源、キーボード、ディスプレイなどを別途用意する必要がありました。",
    modernWebConnection: "複数の機器やサービスを接続して一つの操作環境を構成するシステム図と比較できます。",
    caution: `${sharedCaution} 配線と配置は理解を助ける模式図で、実機の回路図ではありません。`,
    historicalBasis: "Apple-1 Operation Manualの接続と入出力の説明を基に、必要な構成要素を整理しています。",
    sources: [APPLE_ONE_MANUAL],
    instructions: "接続確認を再生し、電源、キーボード、ディスプレイ、Cassette Interfaceが加わる順序を観察します。",
  },
  {
    id: "apple-one-monitor",
    name: "メモリアドレスを入力する Apple I Monitor",
    category: "Apple I",
    period: "1976",
    system: "Apple I System Monitor",
    medium: "キーボード / メモリ",
    visualType: "apple-one-monitor",
    reconstructionLevel: "史料ベース",
    shortDescription: "16進アドレスの参照と値の書込みを、制限したMonitor風入力で試します。",
    observationPoint: "点滅カーソルが入力可能を示し、アドレス応答が受付結果を示す点。",
    technicalBackground: "System Monitorはメモリ内容の確認や変更を簡潔な文字入力で行う入口でした。",
    modernWebConnection: "開発者コンソールやコマンドパレットの入力と即時フィードバックに通じます。",
    caution: sharedCaution,
    historicalBasis: "Apple-1 Operation Manualに記載されたSystem Monitorと文字入出力を直接参考にしています。",
    sources: [APPLE_ONE_MANUAL],
    instructions: "例示コマンド、4桁の16進数、または「アドレス: 値」を入力してEnterを押します。",
  },
  {
    id: "apple-one-cassette",
    name: "カセット信号を探す Apple Cassette Interface",
    category: "Apple I",
    period: "1976",
    system: "Apple I / Apple Cassette Interface",
    medium: "外部テープレコーダー / 拡張インターフェース",
    visualType: "apple-one-cassette",
    reconstructionLevel: "概念再構成",
    shortDescription: "外部レコーダーの音声信号を検出し、インターフェースからメモリへ転送する流れです。",
    observationPoint: "信号探索、同期パルス、データ読込に合わせて経路と波形が変わる点。",
    technicalBackground: "Apple Cassette Interfaceはカセットそのものではなく、外部テープレコーダーとApple Iを接続する拡張インターフェースでした。",
    modernWebConnection: "入力経路、受信工程、完了を分けて示すストリーミング状態UIと比較できます。",
    caution: `${sharedCaution} 波形と合成音は工程差を伝える抽象表現で、実機信号の正確な再現ではありません。`,
    historicalBasis: "Apple I Cassette Interface資料とSmithsonian所蔵品の説明を基に、信号経路を模式化しています。",
    sources: [APPLE_ONE_MANUAL, SMITHSONIAN_ACI],
    instructions: "再生して「テープレコーダー → Cassette Interface → メモリ」の強調位置を追います。確認音は初期ミュートです。",
  },
  {
    id: "apple-text-scroll",
    name: "文字出力を送り続けるスクロール",
    category: "Apple I",
    period: "1976–1979",
    system: "Apple I / Apple IIの文字画面",
    medium: "ビデオ出力 / メモリ",
    visualType: "text-scroll",
    reconstructionLevel: "概念再構成",
    shortDescription: "新しい行が下端に加わり、古い行が上へ送られる文字画面の動きです。",
    observationPoint: "最新行の追加と上方向への移動が、処理の継続を直接伝える点。",
    technicalBackground: "行数の限られた文字画面では、新しい出力のため既存行を上へ送る必要がありました。",
    modernWebConnection: "ターミナルログ、ビルド出力、ストリーミング生成文へ続く表現です。",
    caution: sharedCaution,
    historicalBasis: "Apple Iの文字出力とApple IIのテキスト画面を参考にした一般化した展示です。",
    sources: [APPLE_ONE_MANUAL, APPLE_TWO_MANUAL],
    instructions: "再生、一時停止、速度、ループ、画面クリアで行の移動を観察します。",
  },
  {
    id: "apple-two-power-on",
    name: "電源投入から入力可能になるまで",
    category: "Apple II",
    period: "1977–1979",
    system: "Apple II",
    medium: "ROM / キーボード / 画面",
    visualType: "apple-two-boot",
    reconstructionLevel: "概念再構成",
    shortDescription: "電源投入、画面初期化、ROM処理、プロンプト表示を、実機風画面と展示解説に分けます。",
    observationPoint: "画面の乱れと消去の後、短いプロンプトが現れて入力可能になる点。",
    technicalBackground: "Apple IIは筐体、キーボード、カラー表示、ROM上のMonitorやBASICを一体化しました。",
    modernWebConnection: "アプリが初期化を終えて操作可能になる起動シーケンスと比較できます。",
    caution: `${sharedCaution} 日本語工程名は博物館側の解説で、実機表示を再現した文言ではありません。`,
    historicalBasis: "Apple II Reference Manualの起動、Monitor、BASICの説明を基に工程を抽象化しています。",
    sources: [APPLE_TWO_MANUAL],
    instructions: "再生し、展示側の工程名と実機風画面の変化を分けて観察します。",
  },
  {
    id: "apple-two-basic",
    name: "BASICプログラムの入力・LIST・RUN",
    category: "Apple II",
    period: "1977–1979",
    system: "Apple II BASIC",
    medium: "ROM BASIC / キーボード",
    visualType: "apple-basic",
    reconstructionLevel: "史料ベース",
    shortDescription: "行番号付き入力を一覧し、実行して文字と数値を出力する安全な簡易BASICです。",
    observationPoint: "LIST、RUN、エラー、READYが入力受付と処理の区切りを示す点。",
    technicalBackground: "許可したPRINT、短いループ、LIST、RUN、NEWだけを解釈する簡易パーサーです。",
    modernWebConnection: "教育用コード実行UIで入力を制限し、安全な結果だけを返す設計に通じます。",
    caution: `${sharedCaution} 任意JavaScriptは評価・実行しません。`,
    historicalBasis: "当時のApple II BASICマニュアルにある行番号、LIST、RUNの操作体系を参考にしています。",
    sources: [APPLE_TWO_MANUAL],
    instructions: "LISTまたはRUNを入力するか、行番号付きPRINT文を追加してEnterを押します。",
  },
  {
    id: "apple-two-cassette-storage",
    name: "外部レコーダーへのSAVEとLOAD",
    category: "Apple II",
    period: "1977–1978",
    system: "Apple II",
    medium: "外部テープレコーダー / コンパクトカセット",
    visualType: "cassette-storage",
    reconstructionLevel: "概念再構成",
    shortDescription: "利用者が外部レコーダーを操作するSAVE成功、LOAD成功、LOAD失敗を比較します。",
    observationPoint: "録音と再生で信号方向が逆になり、失敗時は原因と次の操作が示される点。",
    technicalBackground: "カセットではコンピュータ側の命令だけでなく、外部レコーダーの録音・再生・巻き戻し操作も必要でした。",
    modernWebConnection: "保存と復元を分け、失敗時に原因と回復方法を示すUIと比較できます。",
    caution: `${sharedCaution} 工程名と波形は操作を理解するための抽象表現です。`,
    historicalBasis: "Apple II Reference Manualのカセット入出力を参考にし、三つの結果を教育用に整理しています。",
    sources: [APPLE_TWO_MANUAL],
    instructions: "SAVE成功、LOAD成功、LOAD失敗を選び、再生して工程と次の操作を比較します。",
  },
  {
    id: "apple-two-low-resolution",
    name: "色ブロックで見るローレゾ描画",
    category: "Apple II",
    period: "1977–1979",
    system: "Apple II低解像度カラー表示",
    medium: "ビデオメモリ / カラー表示",
    visualType: "low-resolution",
    reconstructionLevel: "概念再構成",
    shortDescription: "粗い格子を色ブロックで順に埋め、低解像度描画の進行を見せます。",
    observationPoint: "ブロックの蓄積が計算と描画の到達位置を示す点。",
    technicalBackground: "低解像度モードの限られた格子と色をDOMグリッドで概念的に再構成しています。",
    modernWebConnection: "ピクセルアート、段階レンダリング、描画進捗表示につながります。",
    caution: `${sharedCaution} 実在ゲームや画面配置は使用していません。`,
    historicalBasis: "Apple II Reference ManualのLow-Resolution Graphics解説を参考にしています。",
    sources: [APPLE_TWO_MANUAL],
    instructions: "再生、速度、ループ、リセットでブロックが蓄積する順番を観察します。",
  },
  {
    id: "apple-two-high-resolution",
    name: "線と曲線で見るハイレゾ描画",
    category: "Apple II",
    period: "1977–1979",
    system: "Apple II高解像度表示",
    medium: "高解像度ビデオメモリ",
    visualType: "high-resolution",
    reconstructionLevel: "概念再構成",
    shortDescription: "線と疑似円を少しずつ描く、完全オリジナルの幾何学模様です。",
    observationPoint: "描画済みの軌跡と停止位置が計算の到達点を示す点。",
    technicalBackground: "実機の画素配置と色生成には固有の制約があり、現代Canvasと同じではありません。",
    modernWebConnection: "Canvasの逐次描画、データ可視化、生成途中のプレビューと比較できます。",
    caution: `${sharedCaution} 画素挙動や色にじみの完全再現ではありません。`,
    historicalBasis: "Apple II Reference ManualのHigh-Resolution Graphicsと色制約の説明を参考にしています。",
    sources: [APPLE_TWO_MANUAL],
    instructions: "再生、一時停止、速度、リセットでCanvas描画を制御します。",
  },
  {
    id: "disk-two-boot",
    name: "Disk IIからの起動",
    category: "Disk II",
    period: "1978–1979",
    system: "Apple II / Disk II",
    medium: "5.25インチフロッピーディスク",
    visualType: "disk-boot",
    reconstructionLevel: "概念再構成",
    shortDescription: "外から見える挿入・アクセスランプ・画面変化と、内部動作の概念図を分離します。",
    observationPoint: "ディスク挿入後、ランプと待機時間を経て画面が入力可能へ変わる点。",
    technicalBackground: "Disk IIはカセットより高速で扱いやすい読込と、トラック単位のアクセスを可能にしました。",
    modernWebConnection: "バックグラウンドI/Oを装置状態と工程名で示す監視UIと比較できます。",
    caution: `${sharedCaution} プラッタ、ヘッド、トラックは内部動作を説明する概念図です。`,
    historicalBasis: "Disk II Manualの挿入、起動、ドライブ操作を基に工程を一般化しています。",
    sources: [DISK_TWO_MANUAL],
    instructions: "ディスク挿入を切り替え、正常起動と未挿入停止を比較します。",
  },
  {
    id: "disk-two-access-patterns",
    name: "連続読込・シーク・再試行の違い",
    category: "Disk II",
    period: "1978–1979",
    system: "Apple II / Disk II",
    medium: "5.25インチフロッピーディスク",
    visualType: "disk-patterns",
    reconstructionLevel: "概念再構成",
    shortDescription: "同じ読込でも異なるランプ間隔、トラック位置、ヘッド移動を比較する内部模式図です。",
    observationPoint: "連続、断続、離れたトラックへのシーク、エラー再試行で待ち方が変わる点。",
    technicalBackground: "データ配置や再試行によってドライブの動きと待機時間は変化します。",
    modernWebConnection: "ネットワークの連続転送、バースト、再試行を区別する表示と比較できます。",
    caution: `${sharedCaution} 特定ソフトの実アクセス列や機構の正確な動きを再現していません。`,
    historicalBasis: "Disk IIの機械動作を一般化した比較展示です。",
    sources: [DISK_TWO_MANUAL],
    instructions: "4種類のアクセスを選び、工程説明、ランプ、ヘッド、読込位置を比較します。",
  },
  {
    id: "early-game-loading",
    name: "創作ゲームで見るディスクロード",
    category: "比較展示",
    period: "1978–1979",
    system: "Apple II時代との比較",
    medium: "Disk II / カラー表示",
    visualType: "game-loading",
    reconstructionLevel: "創作比較",
    shortDescription: "架空のゲーム画面で、ディスク読込から操作可能になるまでを比較します。",
    observationPoint: "装置状態と画面の段階変化が、待機から操作可能への移行を伝える点。",
    technicalBackground: "読込中の限られたフィードバックを、特定作品に依存しない独自画面へ置き換えています。",
    modernWebConnection: "ゲームや重いWebアプリのプリロードと段階的アセット準備に通じます。",
    caution: `${sharedCaution} 実在ゲーム、ロゴ、キャラクター、音楽、画面構成は使用していません。`,
    historicalBasis: "当時のディスク読込とカラー表示を組み合わせた創作比較で、史実の画面再現ではありません。",
    sources: [APPLE_TWO_MANUAL, DISK_TWO_MANUAL],
    instructions: "再生して読込位置と画面変化を追い、操作可能になる合図を観察します。",
  },
  {
    id: "early-errors-retry",
    name: "4種類のエラーと回復方法を比較する",
    category: "比較展示",
    period: "1976–1979",
    system: "Apple I / Apple IIとの比較",
    medium: "カセット / Disk II / キーボード",
    visualType: "error-retry",
    reconstructionLevel: "概念再構成",
    shortDescription: "信号なし、未挿入、読込失敗、命令エラーで異なる停止状態と回復手順を比較します。",
    observationPoint: "短い実機風エラーと、博物館側が示す原因・次の操作を分離している点。",
    technicalBackground: "短い通知だけだった初期環境と、原因と回復手段を説明する現代UIを対比します。",
    modernWebConnection: "原因、回復手段、再試行を一緒に示すエラーリカバリー設計と比較できます。",
    caution: `${sharedCaution} 具体的な工程と回復手順は比較のための教育用構成です。`,
    historicalBasis: "当時の短いエラー表示を一般化し、4種類の回復手順は独自に整理しています。",
    sources: [APPLE_ONE_MANUAL, APPLE_TWO_MANUAL, DISK_TWO_MANUAL],
    instructions: "エラー種別を選び、再生して停止理由と回復方法を確認します。",
  },
];

export const appleEarlyExhibitCount = appleEarlyExhibits.length;
