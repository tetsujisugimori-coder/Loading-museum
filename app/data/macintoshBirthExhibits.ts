export type MacintoshDemoType =
  | "boot" | "disk" | "desktop" | "window" | "menu" | "history"
  | "pointer" | "icons" | "trash" | "scroll" | "accessories" | "paint"
  | "write" | "fonts" | "pixel-icons" | "systems" | "multifinder"
  | "system-seven" | "balloon" | "machines" | "color" | "sound" | "transition";

export type MacintoshBirthExhibit = {
  id: string;
  title: string;
  period: string;
  demo: MacintoshDemoType;
  summary: string;
  interaction: string;
};

export const macintoshBirthExhibits: readonly MacintoshBirthExhibit[] = [
  { id: "macintosh-boot", title: "Macintosh起動体験", period: "1984", demo: "boot", summary: "電源投入から状態表示、ディスク読込、デスクトップ到達までを一続きで体験します。", interaction: "「電源を入れる」で起動し、工程表示の変化を追います。" },
  { id: "finder", title: "Finderで直接操作する", period: "1984–", demo: "desktop", summary: "メニュー、アイコン、ファイル、ゴミ箱を一つのFinder画面で直接扱います。", interaction: "アイコンを選び、開き、Read Meをゴミ箱へドラッグして復元します。" },
  { id: "window-controls", title: "ウィンドウ操作", period: "1984–", demo: "window", summary: "タイトルバー、前後関係、移動、サイズ変更、スクロールを一枚の画面で扱います。", interaction: "ウィンドウを開閉し、タイトルバーをドラッグ、右下でリサイズします。" },
  { id: "mouse-pointer", title: "マウスとポインタ", period: "1984–", demo: "pointer", summary: "指し示し、クリック、選択、ドラッグする直接操作がGUIの中心になりました。", interaction: "対象をクリック／ダブルクリック／ドラッグして操作ログを変えます。" },
  { id: "scroll-bar", title: "スクロールバー", period: "1984–", demo: "scroll", summary: "小さな画面の外側に続く情報空間を、矢印・溝・つまみで移動します。", interaction: "上下ボタン、ページ移動、レンジ操作で文書をスクロールします。" },
  { id: "desk-accessories", title: "デスクアクセサリ", period: "1984–", demo: "accessories", summary: "Calculator、Clock、Scrapbook、Puzzleのような小型道具をメニューから呼び出しました。", interaction: "道具を選び、電卓やパズルの小さな操作を試します。" },
  { id: "macpaint", title: "MacPaint", period: "1984", demo: "paint", summary: "ポインタの軌跡がそのまま絵になる直接描画と、移動・コピー対象を示す蟻の行進を再構成します。", interaction: "ペン、消しゴム、選択範囲の移動、選択解除、塗りつぶし、Undoを使います。" },
  { id: "macwrite", title: "MacWrite", period: "1984", demo: "write", summary: "画面で整えた文字が印刷結果へつながるWYSIWYGの考え方を紹介します。", interaction: "文章を選択し、書体の雰囲気とサイズを変更します。" },
  { id: "mac-fonts", title: "Macintoshフォント", period: "1984–", demo: "fonts", summary: "Chicago、Geneva、Monaco、New Yorkが担った画面上の声を、代替書体で比較します。", interaction: "名称を選び、同じ文章の字幅や表情を比べます。" },
  { id: "susan-kare", title: "Susan Kareとアイコンデザイン", period: "1983–", demo: "pixel-icons", summary: "限られたピクセルで意味と親しみを伝えたアイコン設計を、独自図案で学びます。", interaction: "格子をクリックして、16×16のオリジナル記号を編集します。" },
  { id: "system-1-6", title: "System 1〜System 6", period: "1984–1988", demo: "systems", summary: "Finder、操作、表現、マルチタスクが段階的に育った流れをタイムラインで示します。", interaction: "System 1〜6を選び、その時点で加わった変化を確認します。" },
  { id: "multifinder", title: "MultiFinder", period: "1987–", demo: "multifinder", summary: "複数アプリを同時に置き、重なった窓を切り替える作業空間が定着しました。", interaction: "二つのウィンドウをクリックし、前面と背景を切り替えます。" },
  { id: "system-7", title: "System 7", period: "1991", demo: "system-seven", summary: "カラー、Alias、Balloon Help、改善されたFinderと協調的マルチタスクが初期Macの到達点を形づくります。", interaction: "機能ボタンを選び、デスクトップに起きる変化を確認します。" },
  { id: "balloon-help", title: "Balloon Help", period: "1991", demo: "balloon", summary: "画面上の要素そのものに説明を重ね、操作しながら学べるヘルプです。", interaction: "各部品へフォーカス、ポインタ、またはタップして説明を表示します。" },
  { id: "models", title: "Macintosh機種の変遷", period: "1984–1990", demo: "machines", summary: "128KからClassicまで、数値の羅列ではなく各機種が開いた可能性を追います。", interaction: "6機種を選び、「何が変わったか」を切り替えます。" },
  { id: "macintosh-ii-color", title: "Macintosh IIとカラー化", period: "1987", demo: "color", summary: "モノクロの一体型画面から、拡張可能なカラー作業環境への変化を比較します。", interaction: "同じ独自UIをモノクロ／カラーで切り替えます。" },
  { id: "mac-sound", title: "Macintoshサウンド", period: "1984–", demo: "sound", summary: "起動、警告、操作完了を耳でも伝える、UIフィードバックとしての音を紹介します。", interaction: "ボタンを押した時だけWeb Audio APIの独自合成音を再生します。" },
  { id: "apple-ii-to-mac", title: "Apple IIからMacintoshへ", period: "1977→1991", demo: "transition", summary: "キーボードと文字の世界から、マウス、アイコン、ウィンドウによる直接操作への転換です。", interaction: "スライダーで文字中心からGUI中心へ表示を変え、Apple II展示へ戻れます。" },
];

export const macintoshBirthExhibitCount = macintoshBirthExhibits.length;
