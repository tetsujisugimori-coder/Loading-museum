"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppleDemoControls, useAppleSequence, type AppleDemoProps } from "./AppleEarlyDemoControls";
import { AppleInteractionFlow, type AppleInteractionFrame } from "./AppleInteractionFlow";

type ProcessStep = { label: string; next: string; tone?: number };

const appleCassetteSteps: readonly ProcessStep[] = [
  { label: "接続待ち", next: "テープレコーダーを接続し、再生を開始します" },
  { label: "テープ再生開始", next: "信号が届くまで待ちます", tone: 720 },
  { label: "信号探索", next: "同期パルスを探しています", tone: 900 },
  { label: "同期パルス検出", next: "データ部分の読取りへ進みます", tone: 1_800 },
  { label: "データ読込", next: "受信した値をメモリへ送ります", tone: 1_200 },
  { label: "メモリ転送", next: "転送結果を確認します", tone: 2_100 },
  { label: "読込完了", next: "Monitorから続きの操作ができます" },
];

const appleTwoBootSteps: readonly ProcessStep[] = [
  { label: "電源オフ", next: "再生すると電源を投入します" },
  { label: "電源投入", next: "映像出力が安定するまで待ちます" },
  { label: "画面初期化", next: "画面メモリを初期化しています" },
  { label: "ROM処理", next: "入力環境を準備しています" },
  { label: "操作可能", next: "プロンプトから入力できます" },
];

type CassettePurpose = "save" | "load";
type LoadOutcome = "success" | "no-signal" | "low-volume" | "bad-connection";
const saveSteps: readonly ProcessStep[] = [
  { label: "SAVE命令", next: "レコーダーを録音状態にします" },
  { label: "録音開始", next: "Apple IIから信号を送ります" },
  { label: "データを音へ変換", next: "音の信号をテープへ送ります" },
  { label: "テープへ録音", next: "録音終了を待ちます" },
  { label: "レコーダー停止", next: "保存結果を確認します" },
  { label: "保存完了", next: "テープを保管できます" },
] as const;
const loadSuccessSteps: readonly ProcessStep[] = [
  { label: "読込位置へ巻き戻す", next: "レコーダーを再生します" },
  { label: "レコーダー再生", next: "Apple IIでLOADを実行します" },
  { label: "LOAD命令", next: "入力信号を探します" },
  { label: "信号探索", next: "音のデータ部分を探します" },
  { label: "音をデータへ変換", next: "復元した値をメモリへ送ります" },
  { label: "メモリへ転送", next: "読込結果を確認します" },
  { label: "読込完了", next: "プログラムを利用できます" },
] as const;
const loadFailureLabels: Record<Exclude<LoadOutcome, "success">, string> = {
  "no-signal": "信号なし", "low-volume": "音量不足", "bad-connection": "接続不良",
};
const loadFailureSteps = (outcome: Exclude<LoadOutcome, "success">): readonly ProcessStep[] => [
  ...loadSuccessSteps.slice(0, 4),
  { label: loadFailureLabels[outcome], next: "原因を確認します" },
  { label: "原因確認", next: outcome === "low-volume" ? "音量を調整します" : "接続とテープ位置を確認します" },
  { label: "巻き戻し", next: "信号の先頭へ戻します" },
  { label: "再試行可能", next: "読込結果を成功へ切り替え、再実行できます" },
];

const cassettePurposes: Record<CassettePurpose, { label: string }> = {
  save: {
    label: "プログラムを保存する",
  },
  load: {
    label: "プログラムを読み込む",
  },
};

const gameLoadSteps: readonly ProcessStep[] = [
  { label: "メディア待ち", next: "創作ゲームのディスクを挿入します" },
  { label: "タイトル読込", next: "画面用データを準備しています" },
  { label: "ステージ読込", next: "ゲーム用データを準備しています" },
  { label: "入力準備", next: "操作系を初期化しています" },
  { label: "操作可能", next: "架空のゲームを開始できる状態です" },
];

const accessPatterns = {
  sequential: {
    label: "連続読込",
    description: "隣り合うトラックを順番に読むため、ヘッド移動が小さく連続して待ちます。",
    steps: ["トラック00を読込", "トラック01を読込", "トラック02を読込", "トラック03を読込", "読込完了"],
    positions: [5, 10, 15, 20, 20],
    wait: "短い", feeling: "ランプが連続して点灯し、比較的短く感じます。", timeline: ["開始", "読込", "読込", "読込", "完了"],
  },
  intermittent: {
    label: "断続的な読込",
    description: "処理を挟みながら複数位置を読むため、ランプの点灯と待機が交互に現れます。",
    steps: ["トラック00を読込", "処理待ち", "トラック05を読込", "処理待ち", "トラック09を読込", "読込完了"],
    positions: [5, 5, 32, 32, 48, 48],
    wait: "中程度", feeling: "読込と処理が交互になり、ランプが途切れて見えます。", timeline: ["開始", "読込", "待機", "読込", "待機", "完了"],
  },
  seek: {
    label: "離れたトラックへシーク",
    description: "離れた読込位置へ移るため、ヘッドの移動量と待ち時間が大きくなります。",
    steps: ["トラック02を読込", "トラック18へ移動", "トラック06へ移動", "トラック24へ移動", "読込完了"],
    positions: [10, 72, 28, 92, 92],
    wait: "長い", feeling: "読み取り位置の移動が多く、読込開始まで少し待ちます。", timeline: ["開始", "読込", "移動", "移動", "読込", "完了"],
  },
  recovery: {
    label: "読込エラーと再試行",
    description: "同じ位置を読み直し、位置調整を挟んで回復を試みます。",
    steps: ["トラック08を読込", "読込エラー", "位置を再調整", "トラック08を再読込", "読込完了"],
    positions: [38, 38, 12, 38, 38],
    wait: "不定", feeling: "同じ位置を読み直すため、止まった後に再び動き出して長く感じます。", timeline: ["開始", "読込", "エラー", "位置調整", "再試行", "完了"],
  },
} as const;

type ErrorKind = "cassette" | "no-disk" | "disk-read" | "basic";
const errorScenarios: Record<ErrorKind, { label: string; machineMessage: string; steps: readonly ProcessStep[] }> = {
  cassette: {
    label: "カセット信号なし",
    machineMessage: "NO SIGNAL",
    steps: [
      { label: "信号探索", next: "接続状態を確認します" },
      { label: "信号なし", next: "ケーブルと音量を確認します" },
      { label: "接続確認", next: "入力端子を確認します" },
      { label: "音量確認", next: "入力レベルを調整します" },
      { label: "巻き戻し", next: "信号の先頭へ戻します" },
      { label: "再試行可能", next: "もう一度読込できます" },
    ],
  },
  "no-disk": {
    label: "ディスク未挿入",
    machineMessage: "NO DISK",
    steps: [
      { label: "起動要求", next: "ドライブを確認します" },
      { label: "メディアなし", next: "ディスクを挿入します" },
      { label: "ディスク挿入", next: "ドライブを閉じます" },
      { label: "再起動", next: "ディスクから起動し直します" },
      { label: "回復完了", next: "読込を開始できます" },
    ],
  },
  "disk-read": {
    label: "ディスク読込失敗",
    machineMessage: "I/O ERROR",
    steps: [
      { label: "ディスク読込", next: "指定位置を読んでいます" },
      { label: "読込失敗", next: "同じ位置を再試行します" },
      { label: "再試行", next: "読込位置を調整します" },
      { label: "読込位置変更", next: "調整後の位置を読みます" },
      { label: "回復完了", next: "処理を続けられます" },
    ],
  },
  basic: {
    label: "BASIC命令エラー",
    machineMessage: "? SYNTAX ERROR",
    steps: [
      { label: "命令受付", next: "入力内容を解釈します" },
      { label: "構文エラー", next: "入力行を確認します" },
      { label: "入力行を修正", next: "許可された命令へ直します" },
      { label: "再入力", next: "修正行を受け付けます" },
      { label: "READYへ復帰", next: "次の命令を入力できます" },
    ],
  },
};

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function useCassetteTone() {
  const contextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const stop = useCallback(() => {
    try { oscillatorRef.current?.stop(); } catch { /* already stopped */ }
    oscillatorRef.current?.disconnect();
    gainRef.current?.disconnect();
    oscillatorRef.current = null;
    gainRef.current = null;
  }, []);

  useEffect(() => () => {
    stop();
    void contextRef.current?.close();
  }, [stop]);

  const start = useCallback((frequency: number) => {
    stop();
    const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.012;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillatorRef.current = oscillator;
    gainRef.current = gain;
  }, [stop]);

  const setFrequency = useCallback((frequency: number) => {
    if (oscillatorRef.current && contextRef.current) oscillatorRef.current.frequency.setValueAtTime(frequency, contextRef.current.currentTime);
  }, []);

  return { setFrequency, start, stop };
}

function MuseumStatus({ step, important }: { step: ProcessStep; important?: string }) {
  return (
    <>
      <p className="appleMuseumStatus"><span>展示側ステータス</span><strong>{step.label}</strong><small>次の操作: {step.next}</small></p>
      <span className="visuallyHidden" aria-live="polite">{important ?? ""}</span>
    </>
  );
}

function SignalPath({ activeIndex, reverse = false }: { activeIndex: number; reverse?: boolean }) {
  const nodes = reverse ? ["Apple II メモリ", "カセット入出力", "外部レコーダー"] : ["テープレコーダー", "Cassette Interface", "メモリ"];
  return (
    <ol className="appleSignalPath" aria-label={`信号経路: ${nodes.join("、次に、")}`}>
      {nodes.map((node, index) => <li key={node} data-active={index <= activeIndex}><span>{node}</span>{index < nodes.length - 1 ? <i aria-hidden="true">→</i> : null}</li>)}
    </ol>
  );
}

export function AppleCassetteLoadDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(appleCassetteSteps.length, props);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { setFrequency, start: startTone, stop: stopTone } = useCassetteTone();
  const current = appleCassetteSteps[sequence.step] ?? appleCassetteSteps[0];
  const tone = current.tone;
  const isRunning = props.active && sequence.phase === "running";
  const pathIndex = sequence.step < 2 ? 0 : sequence.step < 5 ? 1 : 2;

  useEffect(() => {
    if (!soundEnabled || !isRunning || !tone) stopTone();
    else setFrequency(tone);
  }, [isRunning, setFrequency, soundEnabled, stopTone, tone]);

  useEffect(() => {
    if (!soundEnabled || !isRunning || sequence.step !== 4) return;
    let high = false;
    const interval = window.setInterval(() => { high = !high; setFrequency(high ? 1_200 : 2_100); }, 130);
    return () => window.clearInterval(interval);
  }, [isRunning, sequence.step, setFrequency, soundEnabled]);

  const startWithSound = () => {
    if (soundEnabled) startTone(tone ?? 720);
  };

  const cassetteFrame: AppleInteractionFrame = {
    operation: sequence.step < 2 ? "レコーダーを再生する" : "読込を待つ",
    internal: current.label,
    visible: soundEnabled && isRunning ? "波形が変わり、抽象信号音が鳴る" : "経路と波形が変わる",
    result: sequence.phase === "complete" ? "プログラムをメモリから利用できる" : "読込経路を確認できる",
  };

  return (
    <div className="appleDemo appleCassetteDemo" data-running={isRunning} data-signal-step={sequence.step}>
      <SignalPath activeIndex={pathIndex} />
      <div className="appleWaveform" aria-label="工程に応じて変化する抽象化した信号波形">
        {Array.from({ length: 32 }, (_, index) => <span key={index} style={{ "--wave-index": index } as React.CSSProperties} />)}
      </div>
      <progress className="appleReadProgress" max={appleCassetteSteps.length - 1} value={sequence.step} aria-label="カセット信号の読込位置" />
      <MuseumStatus step={current} important={sequence.phase === "complete" ? "カセット信号の読込が完了しました" : undefined} />
      <AppleInteractionFlow frame={cassetteFrame} current={current.label} />
      <div className="appleSoundNotice"><p>再生すると抽象化した信号音が鳴ります。小音量で、実機信号の正確な再現ではありません。</p><button type="button" aria-pressed={!soundEnabled} onClick={() => { setSoundEnabled((enabled) => !enabled); stopTone(); }}>{soundEnabled ? "音をミュート" : "音をON"}</button><span>音設定: {soundEnabled ? "ON" : "ミュート"}</span></div>
      <AppleDemoControls label="Apple Cassette Interface信号探索" sequence={sequence} onBeforePlay={startWithSound} />
    </div>
  );
}

export function AppleTwoBootDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(appleTwoBootSteps.length, props);
  const current = appleTwoBootSteps[sequence.step] ?? appleTwoBootSteps[0];
  return (
    <div className="appleDemo appleBootDemo" data-phase={sequence.phase} data-step={sequence.step}>
      <div className="appleMachineFrame">
        <span>実機風画面</span>
        <div className="appleBootScreen" role="img" aria-label={sequence.step >= 4 ? "初期化後に右角括弧のプロンプトが表示された画面" : "電源投入から初期化中の画面"}>
          <span className="appleBootNoise" aria-hidden="true" />
          <span className="appleBootPrompt" aria-hidden="true">{sequence.step >= 4 ? "]" : ""}</span>
        </div>
      </div>
      <MuseumStatus step={current} important={sequence.phase === "complete" ? "Apple II風画面が操作可能になりました" : undefined} />
      <AppleDemoControls label="電源投入工程" sequence={sequence} />
    </div>
  );
}

export function CassetteStorageDemo(props: AppleDemoProps) {
  const [purpose, setPurpose] = useState<CassettePurpose>("save");
  const [loadOutcome, setLoadOutcome] = useState<LoadOutcome>("success");
  const selectedSteps = purpose === "save" ? saveSteps : loadOutcome === "success" ? loadSuccessSteps : loadFailureSteps(loadOutcome);
  const sequence = useAppleSequence(selectedSteps.length, props);
  const current = selectedSteps[sequence.step] ?? selectedSteps[0];
  const reverse = purpose === "save";
  const pathIndex = sequence.step === 0 ? 0 : sequence.step >= selectedSteps.length - 1 ? 2 : 1;
  const failed = purpose === "load" && loadOutcome !== "success" && sequence.step >= 4;
  const result = sequence.phase !== "complete" ? "工程進行中" : failed ? "原因確認後に再試行可能" : purpose === "save" ? "保存完了" : "読込完了";
  const activeDevice = purpose === "save"
    ? sequence.step === 0 ? "コンピュータ: SAVE命令" : sequence.step === 1 || sequence.step === 4 ? "レコーダー: 録音／停止" : "信号経路"
    : sequence.step <= 1 ? "レコーダー: 巻き戻し／再生" : sequence.step === 2 ? "コンピュータ: LOAD命令" : "信号経路";
  const frame: AppleInteractionFrame = {
    operation: activeDevice,
    internal: current.label,
    visible: failed ? `${loadFailureLabels[loadOutcome as Exclude<LoadOutcome, "success">]}と平坦な波形` : "波形と進行位置が変化",
    result,
  };

  return (
    <div className="appleDemo appleStorageDemo" data-running={props.active && sequence.phase === "running"} data-failed={failed}>
      <div className="appleMediaSwitch" role="group" aria-label="カセットを使う目的">
        {(Object.entries(cassettePurposes) as [CassettePurpose, { label: string }][]).map(([value, item]) => (
          <button key={value} type="button" aria-pressed={purpose === value} onClick={() => { setPurpose(value); sequence.reset(); }}>{item.label}</button>
        ))}
      </div>
      {purpose === "load" ? <label className="appleSelectLabel">読込結果を試す<select value={loadOutcome} onChange={(event) => { setLoadOutcome(event.target.value as LoadOutcome); sequence.reset(); }}><option value="success">成功</option><option value="no-signal">信号なし</option><option value="low-volume">音量不足</option><option value="bad-connection">接続不良</option></select></label> : null}
      <div className="appleDeviceOperation"><span>今、利用者が操作する機器</span><strong>{activeDevice}</strong><small>データの移動方向: {purpose === "save" ? "メモリ → 音 → テープ" : "テープ → 音 → メモリ"}</small></div>
      <SignalPath activeIndex={pathIndex} reverse={reverse} />
      <div className="appleWaveform appleWaveformWide" aria-label={failed ? "信号を検出できない平坦な波形" : "SAVEまたはLOAD中の抽象化した信号波形"}>
        {Array.from({ length: 40 }, (_, index) => <span key={index} />)}
      </div>
      <progress className="appleReadProgress" max={selectedSteps.length - 1} value={sequence.step} aria-label={`${cassettePurposes[purpose].label}の進行位置`} />
      <MuseumStatus step={current} important={sequence.phase === "complete" ? `${cassettePurposes[purpose].label}: ${result}` : undefined} />
      <AppleInteractionFlow frame={frame} current={current.label} />
      <AppleDemoControls label={`外部レコーダーで${cassettePurposes[purpose].label}`} sequence={sequence} showLoop={false} />
    </div>
  );
}

function DiskDriveVisual({ active, error, position, inserted = true }: { active: boolean; error: boolean; position: number; inserted?: boolean }) {
  return (
    <div className="appleDiskViews">
      <div className="appleDiskExterior" role="img" aria-label={`外から見えるDisk II: ディスク${inserted ? "挿入済み" : "未挿入"}、アクセスランプ${active ? "点灯" : error ? "エラー" : "消灯"}`} data-active={active} data-error={error}>
        <span>外から見える状態</span><div className="appleDiskSlot">{inserted ? "DISK INSERTED" : "EMPTY"}</div><i className="appleDiskLamp" />
      </div>
      <figure className="appleDiskDrive" data-active={active} data-error={error} style={{ "--head-position": `${position}%` } as React.CSSProperties}>
        <figcaption>内部動作の概念図</figcaption>
        <div className="appleDiskMechanism" aria-hidden="true"><span className="appleDiskPlatter" /><span className="appleDiskTrack" /><span className="appleDiskHead" /></div>
        <p>トラックとヘッド移動を抽象化しています</p>
      </figure>
    </div>
  );
}

const diskBootTimeline = ["ディスク未挿入", "ディスク挿入", "電源投入／再起動", "ドライブ回転", "アクセスランプ点灯", "起動データ探索", "起動データ読込", "画面切替", "起動完了・操作可能"] as const;
const diskBootRunSteps: readonly ProcessStep[] = diskBootTimeline.slice(1).map((label, index) => ({ label, next: index === diskBootTimeline.length - 2 ? "プログラムを操作できます" : `${diskBootTimeline[index + 2]}へ進みます` }));

export function DiskBootDemo(props: AppleDemoProps) {
  const [inserted, setInserted] = useState(false);
  const sequence = useAppleSequence(diskBootRunSteps.length, props);
  const overallStep = inserted ? sequence.step + 1 : 0;
  const current = inserted ? diskBootRunSteps[sequence.step] ?? diskBootRunSteps[0] : { label: "ディスク未挿入", next: "ディスクを挿入します" };
  const active = props.active && sequence.phase === "running" && overallStep >= 3 && overallStep <= 6;
  const bootComplete = inserted && sequence.phase === "complete";
  const frame: AppleInteractionFrame = {
    operation: !inserted ? "ディスクを挿入する" : overallStep <= 2 ? "電源投入または再起動" : "完了を待つ",
    internal: overallStep < 3 ? "起動準備" : overallStep < 6 ? "回転・トラック探索" : "起動データ読込と処理",
    visible: active ? "アクセスランプが点灯し、画面が変化" : bootComplete ? "起動完了を日本語で表示" : "ランプ消灯、画面待機",
    result: bootComplete ? "プログラムを操作できる" : "起動工程を確認できる",
  };

  return (
    <div className="appleDemo appleDiskDemo" data-boot-complete={bootComplete}>
      <ol className="appleDiskBootTimeline" aria-label="ディスク未挿入から操作可能までの起動工程">{diskBootTimeline.map((label, index) => <li key={label} data-current={overallStep === index} data-complete={overallStep > index}><span>{index + 1}</span>{label}</li>)}</ol>
      <div className="appleDiskUserControls" role="group" aria-label="利用者が行うDisk II操作"><span>利用者が行うこと</span><button type="button" onClick={() => { setInserted((value) => !value); sequence.reset(); }}>{inserted ? "ディスクを取り出す" : "ディスクを挿入"}</button><strong>{inserted ? "挿入済み" : "未挿入"}</strong></div>
      <DiskDriveVisual active={active} error={false} position={Math.min(82, Math.max(0, overallStep - 3) * 22)} inserted={inserted} />
      <div className="appleMachineFrame appleDiskScreen"><span>実機風画面と利用者向け案内</span><div><b aria-hidden="true">{bootComplete ? "]" : ""}</b><strong>{bootComplete ? "起動完了" : current.label}</strong><small>{bootComplete ? "プログラムを操作できる状態になりました" : "起動工程を表示しています"}</small></div></div>
      <MuseumStatus step={current} important={sequence.phase === "complete" ? current.label : undefined} />
      <AppleInteractionFlow frame={frame} current={current.label} />
      <p className="appleDiskCompletionExplanation">最終状態では「起動完了」と表示し、プログラムを操作できる状態になりました。</p>
      <p className="appleMediaDifference">カセットではレコーダーを操作してLOADしましたが、Disk IIではディスクを挿入して起動できます。</p>
      <AppleDemoControls label="ディスクを挿入してApple IIを起動" sequence={sequence} showLoop={false} canPlay={inserted} />
    </div>
  );
}

export function DiskAccessPatternDemo(props: AppleDemoProps) {
  const [pattern, setPattern] = useState<keyof typeof accessPatterns>("sequential");
  const selected = accessPatterns[pattern];
  const sequence = useAppleSequence(selected.steps.length, props);
  const state = selected.steps[sequence.step] ?? selected.steps[0];
  const error = /エラー/.test(state);
  const active = props.active && sequence.phase === "running" && !/待ち|完了|エラー/.test(state);
  return (
    <div className="appleDemo appleDiskDemo">
      <label className="appleSelectLabel">アクセスの種類<select value={pattern} onChange={(event) => { setPattern(event.target.value as keyof typeof accessPatterns); sequence.reset(); }}>{Object.entries(accessPatterns).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select></label>
      <p className="applePatternExplanation">{selected.description}</p>
      <div className="appleWaitComparison"><span>待ち時間（概念比較）</span><strong>{selected.wait}</strong><p>{selected.feeling}</p></div>
      <ol className="appleAccessTimeline" aria-label={`${selected.label}の概念タイムライン`}>{selected.timeline.map((item, index) => <li key={`${item}-${index}`} data-current={Math.round((sequence.step / Math.max(1, selected.steps.length - 1)) * (selected.timeline.length - 1)) === index}><span>{item}</span></li>)}</ol>
      <DiskDriveVisual active={active} error={error} position={selected.positions[sequence.step] ?? 0} />
      <MuseumStatus step={{ label: state, next: sequence.phase === "complete" ? "別の種類と比較できます" : "ランプとヘッド位置を観察します" }} important={sequence.phase === "complete" ? `${selected.label}が完了しました` : undefined} />
      <AppleInteractionFlow frame={{ operation: "読込パターンを選び、再生する", internal: state, visible: active ? "アクセスランプ点灯とヘッド移動" : error ? "エラー後に再試行" : "ランプの間隔と待機", result: sequence.phase === "complete" ? `${selected.feeling}` : `待ち時間は${selected.wait}` }} current={state} />
      <AppleDemoControls label={selected.label} sequence={sequence} />
    </div>
  );
}

export function EarlyGameLoadingDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(gameLoadSteps.length, props);
  const current = gameLoadSteps[sequence.step] ?? gameLoadSteps[0];
  return (
    <div className="appleDemo appleGameDemo" data-loaded={sequence.phase === "complete"}>
      <div className="appleGameScreen" role="img" aria-label="実在作品ではない創作ゲームのディスクロード画面"><div className="appleGameLandscape" aria-hidden="true"><span /><span /><span /></div><div className="appleGamePlayer" aria-hidden="true">◆</div><div className="appleGameProgress" style={{ "--load-progress": `${(sequence.step / (gameLoadSteps.length - 1)) * 100}%` } as React.CSSProperties} /></div>
      <MuseumStatus step={current} important={sequence.phase === "complete" ? "創作ゲームが操作可能になりました" : undefined} />
      <AppleDemoControls label="創作ゲームのディスクロード" sequence={sequence} />
    </div>
  );
}

export function ErrorRetryDemo(props: AppleDemoProps) {
  const [kind, setKind] = useState<ErrorKind>("cassette");
  const scenario = errorScenarios[kind];
  const sequence = useAppleSequence(scenario.steps.length, props);
  const current = scenario.steps[sequence.step] ?? scenario.steps[0];
  const errorStep = sequence.step === 1;
  return (
    <div className="appleDemo appleRetryDemo" data-error={errorStep}>
      <label className="appleSelectLabel">エラー種別<select value={kind} onChange={(event) => { setKind(event.target.value as ErrorKind); sequence.reset(); }}>{Object.entries(errorScenarios).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
      <div className="appleMachineFrame appleErrorScreen"><span>実機風の短い通知</span><div aria-hidden="true">{errorStep ? scenario.machineMessage : sequence.phase === "complete" ? "READY" : "_"}</div></div>
      <div className="appleRecoveryPath" aria-label={`${scenario.label}の回復手順`}>{scenario.steps.slice(1).map((step, index) => <span key={step.label} data-current={sequence.step === index + 1}>{step.label}</span>)}</div>
      <MuseumStatus step={current} important={errorStep || sequence.phase === "complete" ? `${scenario.label}: ${current.label}` : undefined} />
      <AppleDemoControls label={scenario.label} sequence={sequence} />
    </div>
  );
}
