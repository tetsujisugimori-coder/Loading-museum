export type BeginnerTourStepId =
  | "apple-one-setup"
  | "apple-one-monitor"
  | "apple-comparison"
  | "apple-two-basic"
  | "cassette-conversion"
  | "media-comparison";

export type ComparisonRow = {
  label: string;
  appleOne?: string;
  appleTwo?: string;
  cassette?: string;
  disk?: string;
};

export const introSteps: readonly { id: BeginnerTourStepId; label: string; summary: string }[] = [
  { id: "apple-one-setup", label: "Apple Iの構成", summary: "基板へ入力・表示・電源・保存機器を接続します。" },
  { id: "apple-one-monitor", label: "Apple Iでの入力", summary: "メモリの場所を番号で指定し、値を直接扱います。" },
  { id: "apple-comparison", label: "Apple IとApple II", summary: "基板中心の構成から、BASICを使いやすい製品へ進みます。" },
  { id: "apple-two-basic", label: "Apple IIのBASIC", summary: "行番号、LIST、RUN、結果、修正の順に操作します。" },
  { id: "cassette-conversion", label: "カセット保存", summary: "データを音へ変換して録音し、再生した音から復元します。" },
  { id: "media-comparison", label: "Disk IIへの変化", summary: "順番に再生するテープから、必要な場所を探せるディスクへ移ります。" },
] as const;

export const appleOneConnections = [
  { id: "keyboard", name: "キーボード", note: "利用者が文字や数値を入力", path: "Apple I基板へ入力" },
  { id: "display", name: "テレビ / モニター", note: "Apple Iから届く文字を表示", path: "Apple I基板から出力" },
  { id: "power", name: "電源", note: "基板を動かすため別途用意", path: "Apple I基板へ給電" },
  { id: "recorder", name: "カセットレコーダー", note: "プログラムを音として録音・再生", path: "Cassette Interfaceへ音を送る" },
  { id: "interface", name: "Cassette Interface", note: "音とコンピュータのデータを変換", path: "Apple I基板へデータを送る" },
] as const;

export const monitorGuideSteps = [
  { command: "0300", title: "1. メモリの場所を指定", note: "0300は、コンピュータ内部の記憶場所を示す番号です。" },
  { command: "A9 01", title: "2. 値を書き込む", note: "A9 01は、その場所へ保存する命令やデータの例です。" },
  { command: "0300: A9 01", title: "3. 書き込んだ値を確認", note: "場所の番号と保存された値を並べて確かめます。" },
  { command: "0300 R", title: "4. 指定位置から開始", note: "開始位置を指定して処理へ進む、当時の考え方を示します。" },
] as const;

export const appleComparison: readonly ComparisonRow[] = [
  { label: "販売形態", appleOne: "基板中心", appleTwo: "筐体とキーボードを備えた製品" },
  { label: "画面", appleOne: "外部テレビやモニター", appleTwo: "外部画面へ文字やカラーを表示" },
  { label: "入力", appleOne: "Monitorでメモリ操作", appleTwo: "BASICでプログラム入力" },
  { label: "実行", appleOne: "アドレスやMonitor操作", appleTwo: "RUNコマンド" },
  { label: "保存", appleOne: "カセット信号", appleTwo: "カセット、後にDisk II" },
  { label: "主な利用者像", appleOne: "電子工作やコンピュータに詳しい利用者", appleTwo: "家庭や教育でも扱いやすい構成" },
] as const;

export const basicGuideSteps = [
  { command: "10 PRINT \"HELLO\"", title: "1. 行番号付きで入力", note: "行番号は、プログラムの順番を表します。" },
  { command: "LIST", title: "2. 内容を確認", note: "LISTは、入力済みのプログラムを一覧表示します。" },
  { command: "RUN", title: "3. 実行", note: "RUNは、プログラムを先頭から実行します。" },
  { command: "HELLO / READY", title: "4. 結果と待機", note: "READYは、次の入力を受け付けられる状態です。" },
  { command: "? SYNTAX ERROR → 修正", title: "5. エラー時は修正", note: "入力を直して、再びRUNします。展示では安全な回数で停止します。" },
] as const;

export const cassetteFlow = [
  { label: "コンピュータのデータ", detail: "0と1などのデータ" },
  { label: "音の信号へ変換", detail: "高低やパルスの違い" },
  { label: "テープへ録音", detail: "普通のカセットテープに記録" },
  { label: "テープを再生", detail: "録音された音を読み出す" },
  { label: "メモリへ復元", detail: "音を再びデータへ戻す" },
] as const;

export const mediaComparison: readonly ComparisonRow[] = [
  { label: "データ探索", cassette: "テープを順番に再生", disk: "必要な場所へ移動" },
  { label: "読込", cassette: "比較的遅い", disk: "カセットより扱いやすい" },
  { label: "操作", cassette: "録音・再生や巻き戻しが必要", disk: "ディスク挿入後に読み込み" },
  { label: "状態の手掛かり", cassette: "音、テープ走行、信号", disk: "回転、アクセスランプ、待ち時間" },
  { label: "再試行", cassette: "巻き戻しや音量調整", disk: "再読込や別トラック探索" },
] as const;

export const glossaryTerms = [
  { term: "基板", meaning: "部品と配線を載せ、コンピュータの中心となる板。" },
  { term: "Monitor", meaning: "メモリの確認・変更や処理開始を文字入力で行う簡単な操作環境。画面機器のmonitorとは別の意味です。" },
  { term: "メモリ", meaning: "コンピュータが作業中のデータや命令を一時的に置く場所。" },
  { term: "アドレス", meaning: "メモリ内の場所を示す番号。" },
  { term: "BASIC", meaning: "人が比較的読み書きしやすい命令でプログラムを作る言語。" },
  { term: "SAVE", meaning: "プログラムやデータを後で使えるよう記録する操作。" },
  { term: "LOAD", meaning: "記録したプログラムやデータをメモリへ読み戻す操作。" },
  { term: "カセットインターフェース", meaning: "コンピュータのデータとレコーダーの音声信号を橋渡しする装置。" },
  { term: "信号", meaning: "データを伝えるために変化する電気や音。" },
  { term: "パルス", meaning: "短い音や電気信号の変化。" },
  { term: "同期", meaning: "データの始まりや区切りを送る側と読む側で合わせる処理。" },
  { term: "Disk II", meaning: "Apple IIでフロッピーディスクを読み書きするためのドライブシステム。" },
  { term: "トラック", meaning: "ディスク上でデータが記録される区切り。" },
  { term: "シーク", meaning: "読み取り位置を、必要なデータがあるトラックへ動かす処理。" },
  { term: "ROM", meaning: "電源を切っても内容が残り、起動処理や基本機能を収める記憶領域。" },
] as const;
