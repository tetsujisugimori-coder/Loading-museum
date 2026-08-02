export type AppleEarlyVisualType =
  | "apple-one-monitor"
  | "apple-one-cassette"
  | "apple-two-boot"
  | "apple-basic"
  | "cassette-storage"
  | "disk-boot"
  | "disk-patterns"
  | "text-scroll"
  | "low-resolution"
  | "high-resolution"
  | "game-loading"
  | "error-retry";

export type AppleEarlyExhibit = {
  id: string;
  name: string;
  period: string;
  system: string;
  medium: string;
  visualType: AppleEarlyVisualType;
  reconstruction: string;
  statusLanguage: string;
  technicalBackground: string;
  modernWebConnection: string;
  caution: string;
  historicalBasis: string;
  instructions: string;
};

const sharedCaution =
  "実機ROM、ソフトウェア、画面、ロゴを複製せず、TypeScript・React・CSSで操作の流れを抽象化した教育目的の非公式再構成です。";

export const appleEarlyExhibits: readonly AppleEarlyExhibit[] = [
  {
    id: "apple-one-monitor",
    name: "Apple I風モニタ入力",
    period: "1976",
    system: "Apple Iを参考にしたモニタ環境",
    medium: "キーボード / メモリ",
    visualType: "apple-one-monitor",
    reconstruction: "16進数のアドレスと値を入力し、短い応答が返る文字中心の操作感。",
    statusLanguage: "点滅カーソル、入力文字、改行後のアドレス表示が、受付と処理完了を伝えます。",
    technicalBackground: "初期のモニタプログラムは、メモリ内容の確認や変更を簡潔な文字入力で行う入口でした。",
    modernWebConnection: "開発者コンソールやコマンドパレットの、入力と即時フィードバックの原型として比較できます。",
    caution: sharedCaution,
    historicalBasis: "1976年のApple-1 Operation Manualに記載されたSystem Monitorと文字入出力を参考にしています。",
    instructions: "例示コマンドを選ぶか、4桁の16進数、または「アドレス: 値」を入力してEnterを押します。",
  },
  {
    id: "apple-one-cassette",
    name: "Apple I風カセットロード",
    period: "1976",
    system: "Apple I / Apple Cassette Interfaceを参考",
    medium: "コンパクトカセット",
    visualType: "apple-one-cassette",
    reconstruction: "LOAD開始、信号待ち、パルス検出、メモリ転送、成功または失敗、プロンプト復帰。",
    statusLanguage: "波形、読取位置、短い文字メッセージ、カーソルの停止と復帰で進行を示します。",
    technicalBackground: "Apple Cassette Interfaceはテープレコーダーからプログラムを読み込むための拡張基板でした。",
    modernWebConnection: "ストリーミング受信や不定長処理で、複数の手掛かりを組み合わせて状態を示す設計につながります。",
    caution: sharedCaution,
    historicalBasis: "1976年のApple-1 Cassette Interface資料とSmithsonian所蔵品の説明を参考にしています。",
    instructions: "再生でロードを開始します。音は初期ミュートで、明示的に有効化した場合だけ合成パルス音が鳴ります。",
  },
  {
    id: "apple-two-power-on",
    name: "Apple II電源投入",
    period: "1977–1979",
    system: "Apple IIを参考にした家庭用コンピュータ",
    medium: "ROM / キーボード / 画面",
    visualType: "apple-two-boot",
    reconstruction: "電源投入直後の不定な表示、画面クリア、短い起動案内、BASIC風READY状態への遷移。",
    statusLanguage: "一瞬の乱れ、画面消去、プロンプト出現という画面全体の変化が準備完了を伝えます。",
    technicalBackground: "ROM上のモニタやBASICへ短時間で入る構成を、固有画面を使わず段階として抽象化しています。",
    modernWebConnection: "スプラッシュ画面から操作可能状態へ移るアプリ起動シーケンスと比較できます。",
    caution: sharedCaution,
    historicalBasis: "1978年および1979年のApple II Reference Manualにある起動、Monitor、BASICの説明を参考にしています。",
    instructions: "再生、一時停止、再開、リセット、速度変更で起動段階を観察します。",
  },
  {
    id: "apple-two-basic",
    name: "Apple II BASIC風入力",
    period: "1977–1979",
    system: "Apple IIのInteger BASIC / Applesoft系を参考",
    medium: "ROM BASIC / キーボード",
    visualType: "apple-basic",
    reconstruction: "行番号付き入力、LIST、RUN、短い文字出力、数値ループ、命令エラー、READY復帰。",
    statusLanguage: "入力行、一覧、結果、エラー語、READY表示が処理の区切りを示します。",
    technicalBackground: "完全な処理系ではなく、許可した短い命令だけを解釈する安全な簡易パーサーです。",
    modernWebConnection: "教育用コード実行UIで、入力を制限し安全な結果だけを返す設計に通じます。",
    caution: `${sharedCaution} 任意JavaScriptは評価・実行しません。`,
    historicalBasis: "Apple II BASICおよびApplesoft II BASICの当時のマニュアルにある行番号、LIST、RUNの操作体系を参考にしています。",
    instructions: "サンプルを読み込むか、行番号付きPRINT文、LIST、RUN、NEWを入力します。",
  },
  {
    id: "apple-two-cassette-storage",
    name: "カセット保存と読み込み",
    period: "1977–1978",
    system: "Apple IIを参考",
    medium: "コンパクトカセット",
    visualType: "cassette-storage",
    reconstruction: "プログラムのSAVE、LOAD、信号待ち、完了、信号不足による失敗。",
    statusLanguage: "テープ移動、パルス、短い状態語、READYへの復帰が保存・再読込を知らせます。",
    technicalBackground: "ディスク普及前後の家庭用コンピュータでは、カセットが安価なプログラム保存媒体でした。",
    modernWebConnection: "保存と復元を別操作として明示し、失敗時に再試行可能にするUIと比較できます。",
    caution: sharedCaution,
    historicalBasis: "Apple II Reference Manualのカセット入出力説明を参考にし、信号表現と文言は独自に再構成しています。",
    instructions: "SAVE、LOAD、LOAD FAILUREを選び、再生して状態の違いを比較します。",
  },
  {
    id: "disk-two-boot",
    name: "Disk II風起動",
    period: "1978–1979",
    system: "Apple II / Disk IIを参考",
    medium: "5.25インチフロッピーディスク",
    visualType: "disk-boot",
    reconstruction: "ディスク挿入、回転、ヘッド移動、トラック探索、読込、起動完了と未挿入エラー。",
    statusLanguage: "アクセスランプ、回転、ヘッド位置、トラック表示、画面メッセージを組み合わせます。",
    technicalBackground: "Disk IIはコントローラとドライブ動作を通じて、カセットより直接的なランダムアクセスを可能にしました。",
    modernWebConnection: "バックグラウンドI/Oを、進捗率だけでなく装置状態と工程名でも示す監視UIにつながります。",
    caution: sharedCaution,
    historicalBasis: "1978年のDisk II Floppy Disk Subsystem Installation & Operating Manualを参考にしています。",
    instructions: "ディスク挿入状態を切り替え、再生して正常起動と未挿入エラーを比較します。",
  },
  {
    id: "disk-two-access-patterns",
    name: "Disk IIアクセスパターン",
    period: "1978–1979",
    system: "Apple II / Disk IIを参考",
    medium: "5.25インチフロッピーディスク",
    visualType: "disk-patterns",
    reconstruction: "連続、断続、探索多め、失敗、再試行のアクセス挙動を同じ装置図で比較。",
    statusLanguage: "ランプの点灯間隔、回転、ヘッド移動幅、工程文字がパターン差を示します。",
    technicalBackground: "同じ読込中でも、データ配置や再試行によって装置の動きと待ち方は異なります。",
    modernWebConnection: "ネットワークの連続転送、バースト、再試行を区別するパフォーマンス表示と比較できます。",
    caution: sharedCaution,
    historicalBasis: "Disk IIの機械動作を一般化した比較展示で、特定ソフトの実アクセス列は複製していません。",
    instructions: "アクセスパターンを選択し、再生してランプ、ヘッド、文字表示を見比べます。",
  },
  {
    id: "apple-text-scroll",
    name: "テキストスクロール",
    period: "1976–1979",
    system: "Apple I / Apple IIの文字画面を参考",
    medium: "ビデオ出力 / メモリ",
    visualType: "text-scroll",
    reconstruction: "画面下端への行追加、上方向スクロール、速度変更、画面クリア。",
    statusLanguage: "最新行が下端に現れ、過去行が上へ送られる動きそのものが処理継続を伝えます。",
    technicalBackground: "限られた行数の文字画面では、新しい出力のために既存行を上へ送る必要がありました。",
    modernWebConnection: "ターミナルログ、ビルド出力、AI生成文のストリーミング表示へ直結する表現です。",
    caution: sharedCaution,
    historicalBasis: "Apple-1の文字出力仕様とApple IIのテキスト画面を参考にした一般化したスクロール展示です。",
    instructions: "再生、一時停止、速度変更、ループ、画面クリアを試します。",
  },
  {
    id: "apple-two-low-resolution",
    name: "ローレゾ風グラフィック描画",
    period: "1977–1979",
    system: "Apple IIの低解像度カラー表示を参考",
    medium: "ビデオメモリ / カラー表示",
    visualType: "low-resolution",
    reconstruction: "粗い色ブロックと線を段階的に描き、完成後は静止する抽象図形。",
    statusLanguage: "ブロックが順に埋まる過程が、計算と描画の進行を直接見せます。",
    technicalBackground: "低解像度モードの限られた格子と色を、DOMグリッドで概念的に再構成しています。",
    modernWebConnection: "ピクセルアート、スケルトン描画、段階レンダリングの見せ方へつながります。",
    caution: `${sharedCaution} 実在ゲーム、キャラクター、画面配置は使用していません。`,
    historicalBasis: "Apple II Reference ManualのLow-Resolution Graphics解説を参考にしています。",
    instructions: "再生、速度、ループ、リセットでブロックが描かれる順番を観察します。",
  },
  {
    id: "apple-two-high-resolution",
    name: "ハイレゾ風描画",
    period: "1977–1979",
    system: "Apple IIの高解像度表示を参考",
    medium: "高解像度ビデオメモリ",
    visualType: "high-resolution",
    reconstruction: "点、線、波形、疑似円を少しずつ描く完全オリジナルの幾何学模様。",
    statusLanguage: "描画済みの軌跡と停止位置が計算の到達点を示します。",
    technicalBackground: "実機では画素配置と色生成に固有の制約があり、任意の画素を現代Canvasと同様に扱えるわけではありませんでした。",
    modernWebConnection: "Canvasの逐次描画、データ可視化、生成途中のプレビューと比較できます。",
    caution: `${sharedCaution} 色にじみは史実上の制約を説明する抽象表現で、画素挙動の完全再現ではありません。`,
    historicalBasis: "1978・1979年のApple II Reference ManualにあるHigh-Resolution Graphicsと色制約の説明を参考にしています。",
    instructions: "再生、一時停止、再開、速度変更、リセットでCanvas描画を制御します。",
  },
  {
    id: "early-game-loading",
    name: "ゲームロード風演出",
    period: "1978–1979",
    system: "Apple II時代のソフト読込を参考",
    medium: "Disk II / カラー表示",
    visualType: "game-loading",
    reconstruction: "タイトル文字、ディスクアクセス、画面切替、色ブロック、操作可能状態への遷移。",
    statusLanguage: "装置動作と画面の段階変化が、待機から操作可能への移行を伝えます。",
    technicalBackground: "ロード中の限られたフィードバックを、架空作品「ORBITAL GARDEN」の独自画面で再構成します。",
    modernWebConnection: "ゲームや重いWebアプリのプリロード、段階的アセット準備と比較できます。",
    caution: `${sharedCaution} 実在ゲーム、ロゴ、キャラクター、音楽、画面構成は使用していません。`,
    historicalBasis: "当時のディスク読込とカラー表示を組み合わせた創作展示で、特定ソフトを史実として示すものではありません。",
    instructions: "再生してタイトル描画から「INPUT READY」までの段階を観察します。",
  },
  {
    id: "early-errors-retry",
    name: "エラーと再試行",
    period: "1976–1979",
    system: "Apple I / Apple IIを参考",
    medium: "カセット / Disk II / キーボード",
    visualType: "error-retry",
    reconstruction: "カセット信号不足、ディスク未挿入、読込失敗、命令エラーから再試行とプロンプト復帰。",
    statusLanguage: "短い大文字のエラーとカーソル復帰で、原因説明より先に処理停止を伝えます。",
    technicalBackground: "限られた文字数の環境では、現在のエラーUIより短く、利用者の知識を前提とした通知が中心でした。",
    modernWebConnection: "原因、回復手段、再試行を明示する現代UIとの違いを比較できます。",
    caution: sharedCaution,
    historicalBasis: "当時の短いエラー表示を一般化し、具体的な文言と回復手順は教育用に独自作成しています。",
    instructions: "エラー種別を選び、再生後にRETRYを実行してプロンプト復帰を確認します。",
  },
];

export const appleEarlyExhibitCount = appleEarlyExhibits.length;
