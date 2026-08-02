"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppleDemoControls, useAppleSequence, type AppleDemoProps } from "./AppleEarlyDemoControls";

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

type CassetteMode = "save" | "load" | "load-failure";
const cassetteModes: Record<CassetteMode, { label: string; steps: readonly ProcessStep[] }> = {
  save: {
    label: "SAVE成功",
    steps: [
      { label: "レコーダー準備", next: "録音待機にします" },
      { label: "録音開始", next: "Apple II側から信号を送ります" },
      { label: "信号送信", next: "録音位置を確認します" },
      { label: "書込終了", next: "レコーダーを停止します" },
      { label: "保存完了", next: "テープを保管できます" },
    ],
  },
  load: {
    label: "LOAD成功",
    steps: [
      { label: "テープ準備", next: "読込位置へ巻き戻します" },
      { label: "再生開始", next: "外部レコーダーを再生します" },
      { label: "信号探索", next: "入力信号を探しています" },
      { label: "信号検出", next: "データ部分へ進みます" },
      { label: "データ読込", next: "メモリへ転送しています" },
      { label: "読込完了", next: "プログラムを利用できます" },
    ],
  },
  "load-failure": {
    label: "LOAD失敗",
    steps: [
      { label: "信号探索", next: "入力信号を探しています" },
      { label: "信号なし", next: "接続と音量を確認します" },
      { label: "接続・音量確認", next: "入力ケーブルとレベルを調整します" },
      { label: "巻き戻し", next: "データ先頭へ戻します" },
      { label: "再試行可能", next: "LOAD成功を選び、もう一度試せます" },
    ],
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
  },
  intermittent: {
    label: "断続的な読込",
    description: "処理を挟みながら複数位置を読むため、ランプの点灯と待機が交互に現れます。",
    steps: ["トラック00を読込", "処理待ち", "トラック05を読込", "処理待ち", "トラック09を読込", "読込完了"],
    positions: [5, 5, 32, 32, 48, 48],
  },
  seek: {
    label: "離れたトラックへシーク",
    description: "離れた読込位置へ移るため、ヘッドの移動量と待ち時間が大きくなります。",
    steps: ["トラック02を読込", "トラック18へ移動", "トラック06へ移動", "トラック24へ移動", "読込完了"],
    positions: [10, 72, 28, 92, 92],
  },
  recovery: {
    label: "読込エラーと再試行",
    description: "同じ位置を読み直し、位置調整を挟んで回復を試みます。",
    steps: ["トラック08を読込", "読込エラー", "位置を再調整", "トラック08を再読込", "読込完了"],
    positions: [38, 38, 12, 38, 38],
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

  return { start, stop };
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { start: startTone, stop: stopTone } = useCassetteTone();
  const current = appleCassetteSteps[sequence.step] ?? appleCassetteSteps[0];
  const tone = current.tone;
  const isRunning = props.active && sequence.phase === "running";
  const pathIndex = sequence.step < 2 ? 0 : sequence.step < 5 ? 1 : 2;

  useEffect(() => {
    if (soundEnabled && isRunning && tone) startTone(tone);
    else stopTone();
    return stopTone;
  }, [isRunning, soundEnabled, startTone, stopTone, tone]);

  return (
    <div className="appleDemo appleCassetteDemo" data-running={isRunning} data-signal-step={sequence.step}>
      <SignalPath activeIndex={pathIndex} />
      <div className="appleWaveform" aria-label="工程に応じて変化する抽象化した信号波形">
        {Array.from({ length: 32 }, (_, index) => <span key={index} style={{ "--wave-index": index } as React.CSSProperties} />)}
      </div>
      <progress className="appleReadProgress" max={appleCassetteSteps.length - 1} value={sequence.step} aria-label="カセット信号の読込位置" />
      <MuseumStatus step={current} important={sequence.phase === "complete" ? "カセット信号の読込が完了しました" : undefined} />
      <label className="appleSoundToggle">
        <input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} />
        抽象化した信号確認音 <span>（初期ミュート／実機音の正確な再現ではありません）</span>
      </label>
      <AppleDemoControls label="Apple Cassette Interface信号探索" sequence={sequence} />
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
  const [mode, setMode] = useState<CassetteMode>("save");
  const selectedMode = cassetteModes[mode];
  const sequence = useAppleSequence(selectedMode.steps.length, props);
  const current = selectedMode.steps[sequence.step] ?? selectedMode.steps[0];
  const reverse = mode === "save";
  const pathIndex = sequence.step === 0 ? 0 : sequence.step >= selectedMode.steps.length - 1 ? 2 : 1;
  const failed = mode === "load-failure" && sequence.step >= 1;

  return (
    <div className="appleDemo appleStorageDemo" data-running={props.active && sequence.phase === "running"} data-failed={failed}>
      <div className="appleMediaSwitch" role="group" aria-label="外部レコーダー操作の結果">
        {(Object.entries(cassetteModes) as [CassetteMode, typeof selectedMode][]).map(([value, item]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); sequence.reset(); }}>{item.label}</button>
        ))}
      </div>
      <SignalPath activeIndex={pathIndex} reverse={reverse} />
      <div className="appleWaveform appleWaveformWide" aria-label={failed ? "信号を検出できない平坦な波形" : "SAVEまたはLOAD中の抽象化した信号波形"}>
        {Array.from({ length: 40 }, (_, index) => <span key={index} />)}
      </div>
      <progress className="appleReadProgress" max={selectedMode.steps.length - 1} value={sequence.step} aria-label={`${selectedMode.label}の進行位置`} />
      <MuseumStatus step={current} important={sequence.phase === "complete" ? `${selectedMode.label}: ${current.label}` : undefined} />
      <AppleDemoControls label={`外部レコーダーの${selectedMode.label}`} sequence={sequence} />
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

export function DiskBootDemo(props: AppleDemoProps) {
  const [inserted, setInserted] = useState(true);
  const steps: readonly ProcessStep[] = inserted
    ? [
      { label: "電源オフ", next: "ディスクを挿入して起動します" }, { label: "電源投入", next: "ドライブが回転します" },
      { label: "先頭トラック探索", next: "起動用データを探します" }, { label: "ディスク読込", next: "画面用データを準備します" },
      { label: "操作可能", next: "プロンプトから操作できます" },
    ]
    : [
      { label: "電源オフ", next: "起動を試します" }, { label: "電源投入", next: "ドライブを確認します" },
      { label: "ディスク未挿入", next: "ディスクを挿入してください" }, { label: "起動停止", next: "挿入後に再実行します" },
    ];
  const sequence = useAppleSequence(steps.length, props);
  const current = steps[sequence.step] ?? steps[0];
  const active = props.active && sequence.phase === "running" && inserted && sequence.step >= 1 && sequence.step < steps.length - 1;
  const error = !inserted && sequence.step >= 2;

  return (
    <div className="appleDemo appleDiskDemo">
      <DiskDriveVisual active={active} error={error} position={Math.min(80, sequence.step * 22)} inserted={inserted} />
      <div className="appleMachineFrame appleDiskScreen"><span>実機風画面</span><div aria-hidden="true">{inserted && sequence.phase === "complete" ? "]" : error ? "NO DISK" : ""}</div></div>
      <label className="appleSoundToggle"><input type="checkbox" checked={inserted} onChange={(event) => { setInserted(event.target.checked); sequence.reset(); }} />ディスク挿入済み</label>
      <MuseumStatus step={current} important={sequence.phase === "complete" ? current.label : undefined} />
      <AppleDemoControls label="Disk IIからの起動" sequence={sequence} />
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
      <DiskDriveVisual active={active} error={error} position={selected.positions[sequence.step] ?? 0} />
      <MuseumStatus step={{ label: state, next: sequence.phase === "complete" ? "別の種類と比較できます" : "ランプとヘッド位置を観察します" }} important={sequence.phase === "complete" ? `${selected.label}が完了しました` : undefined} />
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
