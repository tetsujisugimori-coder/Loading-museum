export type VanishedOsVisualType =
  | "classic-mac"
  | "beos"
  | "nextstep"
  | "palm-os"
  | "webos"
  | "windows-phone";

export type VanishedOsExhibit = {
  kind: "vanished-os";
  exhibitId: string;
  title: string;
  visualType: VanishedOsVisualType;
  introduced: string;
  hardware: string;
  bootCharacteristics: string;
  waitingStyle: string;
  aftermath: string;
  legacy: string;
  stepDelay: number;
  bootSteps: number;
};

export const vanishedOperatingSystems: VanishedOsExhibit[] = [
  {
    kind: "vanished-os",
    exhibitId: "classic-mac-os",
    title: "Classic Mac OS",
    visualType: "classic-mac",
    introduced: "1984年",
    hardware: "初期MacintoshからPowerPC世代のMac",
    bootCharacteristics:
      "明るい背景と、小さなコンピュータの顔を思わせる親しみやすい記号。起動を機械の診断ではなく、利用者への挨拶として見せました。",
    waitingStyle:
      "簡潔な案内と小さな進捗表示で、専門的な処理を意識させない待ち時間を作りました。",
    aftermath:
      "2001年に登場したMac OS Xへの移行が進み、従来環境は互換機能として一定期間受け継がれました。",
    legacy:
      "一貫したデスクトップ、直接操作、親しみやすさを優先する設計思想が、その後のパーソナルコンピューティングへ残りました。",
    stepDelay: 520,
    bootSteps: 5,
  },
  {
    kind: "vanished-os",
    exhibitId: "beos",
    title: "BeOS",
    visualType: "beos",
    introduced: "1995年",
    hardware: "BeBox、PowerPC搭載機、後期のx86 PC",
    bootCharacteristics:
      "暗い背景に並ぶ処理アイコンが、起動段階に合わせて順番に点灯する構成。並列処理やメディア志向を軽快に印象づけました。",
    waitingStyle:
      "説明文を増やさず、点灯したアイコンの数で起動の進み具合を見せます。",
    aftermath:
      "Be社の資産は2001年にPalmへ移り、商用OSとしては主流市場から退きました。",
    legacy:
      "応答性、マルチスレッド、メディア処理を重視する思想は、オープンソースOSのHaikuなどに受け継がれています。",
    stepDelay: 330,
    bootSteps: 6,
  },
  {
    kind: "vanished-os",
    exhibitId: "nextstep",
    title: "NeXTSTEP",
    visualType: "nextstep",
    introduced: "1989年",
    hardware: "NeXTワークステーション、後期の他社ワークステーションとx86機",
    bootCharacteristics:
      "黒を基調にした画面、白い状態表示、立体的なワークステーション記号を組み合わせた無機質な起動演出です。",
    waitingStyle:
      "装飾を抑えた短い状態行で、システムが段階的に利用可能になる様子を伝えます。",
    aftermath:
      "NeXTの技術はAppleによる買収後、Mac OS Xの基盤へつながりました。",
    legacy:
      "UNIX基盤とオブジェクト指向の開発環境は、macOSやiOSのアプリ開発技術へ続く重要な系譜になりました。",
    stepDelay: 460,
    bootSteps: 5,
  },
  {
    kind: "vanished-os",
    exhibitId: "palm-os",
    title: "Palm OS",
    visualType: "palm-os",
    introduced: "1996年",
    hardware: "Pilot／Palm系PDA、対応ハンドヘルド、初期スマートフォン",
    bootCharacteristics:
      "小さなモノクロ表示と限られたメモリを前提に、短く簡潔な起動表示からすぐ手帳画面へ移ります。",
    waitingStyle:
      "長い演出を避け、最低限の反転表示と短いバーで、すぐ操作できる感覚を優先しました。",
    aftermath:
      "PDA市場からスマートフォン市場へ軸足が移り、Palm自身も後継のwebOSへ移行しました。",
    legacy:
      "予定表、連絡先、メモの即時利用、ペン操作、PCとの同期という携帯情報端末の基本形を広めました。",
    stepDelay: 360,
    bootSteps: 4,
  },
  {
    kind: "vanished-os",
    exhibitId: "webos",
    title: "webOS",
    visualType: "webos",
    introduced: "2009年",
    hardware: "Palm Pre／Pixi、後期のHP製スマートフォンやタブレット",
    bootCharacteristics:
      "スマートフォン画面中央の光が軽く脈動し、起動後は複数アプリをカードとして並べる画面へ移ります。",
    waitingStyle:
      "短い光の変化と滑らかなカード移動で、処理待ちをモバイル操作の流れへ溶け込ませました。",
    aftermath:
      "PalmのHPによる買収後、主流スマートフォンからは退きましたが、オープンソース化や接続機器向けへ系譜が続きました。",
    legacy:
      "カード型マルチタスク、ジェスチャー操作、Web技術を中心にしたアプリモデルが後世のモバイルUIへ影響しました。",
    stepDelay: 410,
    bootSteps: 5,
  },
  {
    kind: "vanished-os",
    exhibitId: "windows-phone",
    title: "Windows Phone",
    visualType: "windows-phone",
    introduced: "2010年",
    hardware: "各社スマートフォン、特にLumia系端末",
    bootCharacteristics:
      "暗い背景から色面のタイルが順番に現れ、情報を文字と面で整理したスタート画面へ移ります。",
    waitingStyle:
      "タイルの出現順と短いフェードで、起動後に使える情報領域が増えていく様子を見せました。",
    aftermath:
      "Windows Phone 8.1のサポート終了後、Windows 10 Mobileも2019年にサポートを終え、主流市場から退きました。",
    legacy:
      "Live Tileに代表される情報中心のタイポグラフィと、画面全体をグリッドで構成する発想を残しました。",
    stepDelay: 300,
    bootSteps: 7,
  },
];
