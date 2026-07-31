export const VANISHED_LOADING_CATEGORIES = [
  "OS起動",
  "アプリ・ファイル",
  "同期・通信",
  "更新・インストール",
] as const;

export type VanishedLoadingCategory =
  (typeof VANISHED_LOADING_CATEGORIES)[number];

export type VanishedLoadingVisualType =
  | "classic-extension-parade"
  | "classic-watch-cursor"
  | "classic-disk-load"
  | "beos-boot-icons"
  | "beos-tracker-launch"
  | "beos-file-access"
  | "nextstep-boot-messages"
  | "nextstep-disk-services"
  | "nextstep-app-launch"
  | "palm-hotsync"
  | "palm-database-load"
  | "palm-beam-transfer"
  | "webos-pulse-boot"
  | "webos-card-launch"
  | "webos-update-install"
  | "windows-phone-dots"
  | "windows-phone-resuming"
  | "windows-phone-store-update";

export type VanishedLoadingExhibit = {
  demoId: string;
  title: string;
  visualType: VanishedLoadingVisualType;
  category: VanishedLoadingCategory;
  era: string;
  context: string;
  motion: string;
  historicalBasis: string;
  reconstructionNote: string;
  stepDelay: number;
  totalSteps: number;
};

export type VanishedOsExhibit = {
  kind: "vanished-os";
  exhibitId: string;
  title: string;
  introduced: string;
  hardware: string;
  bootCharacteristics: string;
  waitingStyle: string;
  aftermath: string;
  legacy: string;
  loadingExhibits: VanishedLoadingExhibit[];
};

export const vanishedOperatingSystems: VanishedOsExhibit[] = [
  {
    kind: "vanished-os",
    exhibitId: "classic-mac-os",
    title: "Classic Mac OS",
    introduced: "1984年",
    hardware: "初期MacintoshからPowerPC世代のMac",
    bootCharacteristics:
      "明るい背景、少ない色数、小さな記号を使い、機械の診断より利用者へ状況を伝えることを優先しました。",
    waitingStyle:
      "起動時の記号列、腕時計カーソル、段階的なバーなど、限られた画素で処理中を明確に区別しました。",
    aftermath:
      "2001年に登場したMac OS Xへの移行が進み、従来環境は互換機能として一定期間受け継がれました。",
    legacy:
      "一貫したデスクトップ、直接操作、親しみやすさを優先する設計思想が、その後のパーソナルコンピューティングへ残りました。",
    loadingExhibits: [
      {
        demoId: "classic-extension-parade",
        title: "起動シンボルと拡張機能列",
        visualType: "classic-extension-parade",
        category: "OS起動",
        era: "System 7〜Mac OS 9期",
        context: "システム起動と拡張機能の読込",
        motion:
          "明るい起動画面の下端へ、小さな機能記号が一つずつ左から並びます。",
        historicalBasis:
          "Classic Mac OS後期の起動では、システム読込中に拡張機能の小さなアイコンが順に表示されました。",
        reconstructionNote:
          "顔や製品アイコンは写さず、起動順と低解像度感を独自の文字・図形へ置き換えています。",
        stepDelay: 520,
        totalSteps: 8,
      },
      {
        demoId: "classic-watch-cursor",
        title: "腕時計カーソル",
        visualType: "classic-watch-cursor",
        category: "アプリ・ファイル",
        era: "1980年代後半〜1990年代",
        context: "アプリケーションやディスク処理の待機",
        motion:
          "ポインターが小さな腕時計へ変わり、針の向きだけで処理中を示します。",
        historicalBasis:
          "Macintosh Human Interface Guidelinesは、時間のかかる処理で待機カーソルを使う考え方と腕時計型カーソルを示しています。",
        reconstructionNote:
          "当時のカーソル画像は使わず、円・線・短い針をCSSで描いた観賞用の再構成です。",
        stepDelay: 430,
        totalSteps: 9,
      },
      {
        demoId: "classic-disk-load",
        title: "ディスク／アプリケーション読込",
        visualType: "classic-disk-load",
        category: "アプリ・ファイル",
        era: "System 6〜Mac OS 9期",
        context: "フロッピー、書類、アプリケーションの読込",
        motion:
          "白黒調の小さなパネル内で、ディスク記号と区切られた進捗が段階的に進みます。",
        historicalBasis:
          "初期Macintoshはフロッピーや低速ディスクからアプリケーションと書類を読み込む待ち時間が日常的にありました。",
        reconstructionNote:
          "特定アプリの実画面ではなく、当時の標準パネルと白黒表示の作法を組み合わせています。",
        stepDelay: 470,
        totalSteps: 10,
      },
    ],
  },
  {
    kind: "vanished-os",
    exhibitId: "beos",
    title: "BeOS",
    introduced: "1995年",
    hardware: "BeBox、PowerPC搭載機、後期のx86 PC",
    bootCharacteristics:
      "起動段階を表す絵記号の列が暗い画面上で順に点灯し、処理の進行を短時間で見せました。",
    waitingStyle:
      "長い説明を避け、点灯順、Trackerの起動、ファイル処理の状態変化で軽快さを伝えます。",
    aftermath:
      "Be社の資産は2001年にPalmへ移り、商用OSとしては主流市場から退きました。",
    legacy:
      "応答性、マルチスレッド、メディア処理を重視する思想は、オープンソースOSのHaikuなどに受け継がれています。",
    loadingExhibits: [
      {
        demoId: "beos-boot-icons",
        title: "段階点灯する起動アイコン列",
        visualType: "beos-boot-icons",
        category: "OS起動",
        era: "BeOS R3〜R5期",
        context: "カーネル、バス、CPU、ディスク、起動ボリュームの初期化",
        motion:
          "異なる役割を示す七つの抽象記号が、左から順に暗色から鮮色へ変わります。",
        historicalBasis:
          "BeOS x86版の起動では、カーネル移行、PCI、CPU、ディスク、起動ボリュームなどに対応するアイコン列が順に点灯しました。",
        reconstructionNote:
          "実アイコンはトレースせず、段階と点灯順だけを幾何図形と短い文字へ置き換えています。",
        stepDelay: 370,
        totalSteps: 8,
      },
      {
        demoId: "beos-tracker-launch",
        title: "Tracker起動待機",
        visualType: "beos-tracker-launch",
        category: "アプリ・ファイル",
        era: "1990年代後半",
        context: "ファイル環境Trackerとデスクトップの準備",
        motion:
          "右上のDeskbar風領域を残しながら、ファイル窓のタイトルと内容が段階的に現れます。",
        historicalBasis:
          "TrackerはBeOSのファイル操作とアプリ起動を担い、起動スクリプトの後半でDeskbarとともにデスクトップを構成しました。",
        reconstructionNote:
          "Tracker固有のロゴやアイコンは使わず、起動順を示す独自の窓とプレースホルダーで補っています。",
        stepDelay: 440,
        totalSteps: 7,
      },
      {
        demoId: "beos-file-access",
        title: "ファイル処理とディスクアクセス",
        visualType: "beos-file-access",
        category: "アプリ・ファイル",
        era: "BeOS R4〜R5期",
        context: "複数ファイルのコピー、属性処理、ディスク書込",
        motion:
          "ファイル行が次々に処理済みへ変わり、下部のディスク活動計が不規則に伸びます。",
        historicalBasis:
          "BeOSはTrackerとBe File Systemでファイル、属性、索引を扱いました。",
        reconstructionNote:
          "特定のコピー画面は断定せず、ファイルシステムの特徴を伝える時代風の処理表示として構成しています。",
        stepDelay: 390,
        totalSteps: 9,
      },
    ],
  },
  {
    kind: "vanished-os",
    exhibitId: "nextstep",
    title: "NeXTSTEP",
    introduced: "1989年",
    hardware: "NeXTワークステーション、後期の他社ワークステーションとx86機",
    bootCharacteristics:
      "黒基調の起動情報から、グレーの立体的なパネルとWorkspace Managerへ移るワークステーションらしい構成です。",
    waitingStyle:
      "診断、ディスク、サービス、アプリ読込を短い状態行や無彩色パネルで段階的に伝えます。",
    aftermath:
      "NeXTの技術はAppleによる買収後、Mac OS Xの基盤へつながりました。",
    legacy:
      "UNIX基盤とオブジェクト指向の開発環境は、macOSやiOSのアプリ開発技術へ続く重要な系譜になりました。",
    loadingExhibits: [
      {
        demoId: "nextstep-boot-messages",
        title: "システム起動メッセージ",
        visualType: "nextstep-boot-messages",
        category: "OS起動",
        era: "NeXTSTEP 1〜3期",
        context: "ROM診断、bootstrap、Machカーネル、initの開始",
        motion:
          "黒い画面へ白とグレーの短い状態行が上から順に追加されます。",
        historicalBasis:
          "NeXTの管理資料は、ROM自己診断、bootstrap、ドライバ、Machカーネル、initという起動段階を説明しています。",
        reconstructionNote:
          "実ログの長文は転載せず、文言と装置名を架空化した短い教育用ログです。",
        stepDelay: 430,
        totalSteps: 9,
      },
      {
        demoId: "nextstep-disk-services",
        title: "ディスクとサービスの読込",
        visualType: "nextstep-disk-services",
        category: "OS起動",
        era: "NeXTSTEP 2〜3期",
        context: "ルートディスク、ネットワーク、ウィンドウサービスの準備",
        motion:
          "無彩色の二段パネルでサービス名が待機から利用可能へ順番に切り替わります。",
        historicalBasis:
          "起動処理はディスク上のシステムファイル、rcスクリプト、loginwindow、Workspace Managerへ進みました。",
        reconstructionNote:
          "特定リリースの画面配置を複製せず、当時のモノクロ調パネルと起動順を組み合わせています。",
        stepDelay: 510,
        totalSteps: 8,
      },
      {
        demoId: "nextstep-app-launch",
        title: "Workspace Managerのアプリ読込",
        visualType: "nextstep-app-launch",
        category: "アプリ・ファイル",
        era: "NeXTSTEP 3期",
        context: "Dockからのアプリケーション起動とメモリ読込",
        motion:
          "Dock風の小枠からアプリを選ぶと、読込パネルの段階表示を経て作業窓が開きます。",
        historicalBasis:
          "NeXTSTEP Conceptsは、Workspace Managerから起動されたアプリケーションがメモリへ読み込まれてアクティブになる流れを説明しています。",
        reconstructionNote:
          "実在アプリのアイコンを使わず、立体枠と文字パネルで起動の間を強調しています。",
        stepDelay: 560,
        totalSteps: 7,
      },
    ],
  },
  {
    kind: "vanished-os",
    exhibitId: "palm-os",
    title: "Palm OS",
    introduced: "1996年",
    hardware: "Pilot／Palm系PDA、対応ハンドヘルド、初期スマートフォン",
    bootCharacteristics:
      "小さなモノクロ表示と限られたメモリを前提に、同期・データベース・赤外線通信の状態を短い文字と反転表示で伝えました。",
    waitingStyle:
      "画面を占有しすぎない短い段階表示と、物理ボタン操作に合う明確な完了状態を使います。",
    aftermath:
      "PDA市場からスマートフォン市場へ軸足が移り、Palm自身も後継のwebOSへ移行しました。",
    legacy:
      "予定表、連絡先、メモの即時利用、ペン操作、PCとの同期という携帯情報端末の基本形を広めました。",
    loadingExhibits: [
      {
        demoId: "palm-hotsync",
        title: "HotSyncの進行表示",
        visualType: "palm-hotsync",
        category: "同期・通信",
        era: "Palm OS 1〜5期",
        context: "PC／Macとの予定表、連絡先、メモ、アプリの同期",
        motion:
          "接続後、複数のConduit名が一行ずつ反転し、同期済みへ切り替わります。",
        historicalBasis:
          "HotSyncはクレードル等から開始し、Conduitを通じてアプリごとのデータを同期・バックアップしました。",
        reconstructionNote:
          "実際の製品アイコンや効果音を使わず、同期対象と進行順をモノクロ文字で再構成しています。",
        stepDelay: 500,
        totalSteps: 10,
      },
      {
        demoId: "palm-database-load",
        title: "データベース／アプリ読込",
        visualType: "palm-database-load",
        category: "アプリ・ファイル",
        era: "Palm OS 3〜5期",
        context: "予定表・アドレス帳などのPalm Database読込",
        motion:
          "小さなレコード行が上から塗りつぶされ、利用可能な件数が段階的に増えます。",
        historicalBasis:
          "Palm OSアプリはPDBなどのデータベースを中心に情報を保存・交換しました。",
        reconstructionNote:
          "特定アプリの実画面ではなく、低解像度端末でのレコード読込を説明する独自パネルです。",
        stepDelay: 420,
        totalSteps: 8,
      },
      {
        demoId: "palm-beam-transfer",
        title: "ビーム送信の通信待機",
        visualType: "palm-beam-transfer",
        category: "同期・通信",
        era: "1990年代後半〜2000年代前半",
        context: "赤外線による名刺・予定・小さなアプリの送信",
        motion:
          "二台の小型端末間を点線が往復し、送信量が短いブロックで増えます。",
        historicalBasis:
          "Palm OS端末は赤外線によるBeamingで対応データを端末間転送できました。",
        reconstructionNote:
          "実機の赤外線画面を複製せず、通信方向と待ち時間を独自の点・端末図形で補っています。",
        stepDelay: 450,
        totalSteps: 9,
      },
    ],
  },
  {
    kind: "vanished-os",
    exhibitId: "webos",
    title: "webOS",
    introduced: "2009年",
    hardware: "Palm Pre／Pixi、後期のHP製スマートフォンやタブレット",
    bootCharacteristics:
      "暗いモバイル画面のパルス、カード型アプリ、バックグラウンド同期や更新を連続した操作感へ溶け込ませました。",
    waitingStyle:
      "光の脈動、カードの立ち上がり、ダウンロードからインストールへの段階変化を軽快に見せます。",
    aftermath:
      "PalmのHPによる買収後、主流スマートフォンからは退きましたが、オープンソース化や接続機器向けへ系譜が続きました。",
    legacy:
      "カード型マルチタスク、ジェスチャー操作、Web技術を中心にしたアプリモデルが後世のモバイルUIへ影響しました。",
    loadingExhibits: [
      {
        demoId: "webos-pulse-boot",
        title: "パルス型の起動待機",
        visualType: "webos-pulse-boot",
        category: "OS起動",
        era: "webOS 1〜2期",
        context: "端末起動とユーザー環境の準備",
        motion:
          "暗い縦長画面の中央で、抽象的な光点がゆっくり縮小・拡大します。",
        historicalBasis:
          "webOS端末の起動は、暗い画面上の中央シンボルとパルス感のある待機演出で知られました。",
        reconstructionNote:
          "企業ロゴは描かず、中心光と速度感のみを独自の円形CSS表現へ抽象化しています。",
        stepDelay: 520,
        totalSteps: 9,
      },
      {
        demoId: "webos-card-launch",
        title: "カード型アプリの読込",
        visualType: "webos-card-launch",
        category: "アプリ・ファイル",
        era: "webOS 1〜3期",
        context: "Launcherからのアプリ起動とカード生成",
        motion:
          "小さな待機点から縦長カードが持ち上がり、内容の領域が順番に現れます。",
        historicalBasis:
          "webOSアプリは起動・非アクティブ・再アクティブ等のライフサイクルを持ち、カードとして前景と背景を移動しました。",
        reconstructionNote:
          "実在アプリの画面は使わず、カード生成と内容読込の間を幾何図形で補っています。",
        stepDelay: 430,
        totalSteps: 8,
      },
      {
        demoId: "webos-update-install",
        title: "App Catalogの更新・インストール",
        visualType: "webos-update-install",
        category: "更新・インストール",
        era: "webOS 1〜3期",
        context: "アプリ取得、ダウンロード、インストール、端末更新",
        motion:
          "ダウンロード、検証、インストールの表示が切り替わり、下部のバーが段階ごとに伸びます。",
        historicalBasis:
          "公式ユーザーガイドはApp Catalogでのダウンロード、Software Managerでの更新、システム更新中の待機を説明しています。",
        reconstructionNote:
          "実際のカタログ画面やアプリアイコンを使わず、処理段階と縦長端末比率だけを再構成しています。",
        stepDelay: 480,
        totalSteps: 11,
      },
    ],
  },
  {
    kind: "vanished-os",
    exhibitId: "windows-phone",
    title: "Windows Phone",
    introduced: "2010年",
    hardware: "各社スマートフォン、特にLumia系端末",
    bootCharacteristics:
      "暗色画面と移動する点、簡潔な状態語、タイル上の取得・インストール状態で待機を画面全体のタイポグラフィへ統合しました。",
    waitingStyle:
      "点の追従、resuming表示、Store進捗という用途ごとに異なる短い動きで状況を伝えます。",
    aftermath:
      "Windows Phone 8.1のサポート終了後、Windows 10 Mobileも2019年にサポートを終え、主流市場から退きました。",
    legacy:
      "Live Tileに代表される情報中心のタイポグラフィと、画面全体をグリッドで構成する発想を残しました。",
    loadingExhibits: [
      {
        demoId: "windows-phone-dots",
        title: "移動する点の起動待機",
        visualType: "windows-phone-dots",
        category: "OS起動",
        era: "Windows Phone 7〜8.1期",
        context: "端末起動とシステム画面への移行",
        motion:
          "暗い縦長画面で小さな点が時間差を付けて弧状に移動し、最後にStart領域へ収束します。",
        historicalBasis:
          "Windows Phone系の待機表現では、複数の小さな点が追従するモーションが起動や処理中に使われました。",
        reconstructionNote:
          "ロゴや実画面を使わず、点の数、余白、暗色背景という特徴を独自描画しています。",
        stepDelay: 320,
        totalSteps: 12,
      },
      {
        demoId: "windows-phone-resuming",
        title: "アプリの「再開中」",
        visualType: "windows-phone-resuming",
        category: "アプリ・ファイル",
        era: "Windows Phone 8〜8.1期",
        context: "中断されたアプリケーションの復帰と再初期化",
        motion:
          "小文字の状態語を大きな余白の中へ置き、下部で点列が短く往復します。",
        historicalBasis:
          "Windows Phone Storeアプリには中断と再開のライフサイクルがあり、復帰時に再初期化が必要な場合がありました。",
        reconstructionNote:
          "特定アプリの文言・画面を断定せず、当時のタイポグラフィと再開待ちを組み合わせています。",
        stepDelay: 400,
        totalSteps: 9,
      },
      {
        demoId: "windows-phone-store-update",
        title: "Storeの取得・更新進捗",
        visualType: "windows-phone-store-update",
        category: "更新・インストール",
        era: "Windows Phone 8〜Windows 10 Mobile期",
        context: "アプリのダウンロード、インストール、更新後の準備",
        motion:
          "タイル横の細い進捗と状態語が、取得中、インストール中、準備完了へ切り替わります。",
        historicalBasis:
          "Microsoft資料はStoreアプリのダウンロード進捗と、更新後に灰色のタイルへinstalling状態を示す仕組みを説明しています。",
        reconstructionNote:
          "Storeや製品アイコンは使わず、情報中心のタイル配置と状態変化だけを独自の色面へ再構成しています。",
        stepDelay: 460,
        totalSteps: 11,
      },
    ],
  },
];
