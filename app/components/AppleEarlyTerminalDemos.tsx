"use client";

import { useState } from "react";
import { AppleDemoControls, useAppleSequence } from "./AppleEarlyDemoControls";
import { AppleInteractionFlow, type AppleInteractionFrame } from "./AppleInteractionFlow";

const MONITOR_EXAMPLES = ["E000", "0300: A9 01", "FF00"] as const;
const SCROLL_LINES = [
  "CHECKING MEMORY BANK 00",
  "WRITING DISPLAY PAGE",
  "READING INPUT BUFFER",
  "COPYING 16 BYTES",
  "VERIFYING RESULT",
  "PROCESS COMPLETE",
] as const;
const BASIC_SAMPLE_PROGRAM = ['10 PRINT "HELLO ARCHIVE"', "20 FOR I=1 TO 3", "30 PRINT I", "40 NEXT I"] as const;

const SETUP_STAGES: readonly (AppleInteractionFrame & { label: string; connected: number })[] = [
  { label: "基板のみ", connected: 0, operation: "基板を用意する", internal: "電源も入力経路もない", visible: "画面は表示されない", result: "まだ入力も表示もできない" },
  { label: "電源を接続", connected: 1, operation: "電源を接続する", internal: "基板へ電力が届く", visible: "電源表示が点灯する", result: "基板が動作可能になる" },
  { label: "キーボードを接続", connected: 2, operation: "キーを押す", internal: "入力信号が基板へ流れる", visible: "入力信号が移動する", result: "文字を入力できる" },
  { label: "ディスプレイを接続", connected: 3, operation: "表示機器を接続する", internal: "基板が文字信号を出力する", visible: "画面に A が現れる", result: "入力した文字を確認できる" },
  { label: "カセット経路を接続", connected: 4, operation: "Interfaceとレコーダーを接続する", internal: "音とデータの変換経路が加わる", visible: "保存・読込経路が点灯する", result: "プログラムを保存・読込できる" },
] as const;

function promptLine(text: string, index: number) {
  return <span key={`${index}-${text}`}>{text}</span>;
}

export function AppleOneSetupDemo({ active, prefersReducedMotion }: { active: boolean; prefersReducedMotion: boolean }) {
  const sequence = useAppleSequence({ active, baseDelay: 720, prefersReducedMotion, stepCount: SETUP_STAGES.length });
  const stage = SETUP_STAGES[sequence.step] ?? SETUP_STAGES[0];
  return (
    <div className="appleInteractiveDemo appleSetupDemo" data-stage={sequence.step}>
      <div className="appleSetupDiagram appleSetupCapabilityDiagram" role="img" aria-label="電源、キーボード、ディスプレイ、Cassette Interfaceを接続するたびにApple Iで使える機能が増える概念図">
        <div className="appleSetupBoard" data-powered={stage.connected >= 1}>Apple I<span>{stage.label}</span><i aria-hidden="true">{stage.connected >= 1 ? "POWER ON" : "基板のみ"}</i></div>
        <ul>
          {["電源", "キーボード", "ディスプレイ", "Cassette Interface＋レコーダー"].map((part, index) => (
            <li key={part} data-connected={stage.connected > index}>
              <span aria-hidden="true">{stage.connected > index ? "●" : "○"}</span><strong>{part}</strong>
              {index === 1 ? <small className="appleSetupSignal">KEY → SIGNAL</small> : null}
              {index === 2 ? <small className="appleSetupScreen">{stage.connected >= 3 ? "A_" : ""}</small> : null}
              {index === 3 ? <small className="appleSetupCassettePath">DATA ↔ SOUND ↔ TAPE</small> : null}
            </li>
          ))}
        </ul>
      </div>
      <AppleInteractionFlow frame={stage} current={stage.label} important={sequence.phase === "complete" ? "Apple Iで入力、表示、保存、読込ができる構成になりました" : undefined} />
      <AppleDemoControls label="Apple Iの機能が増える接続" sequence={sequence} showLoop={false} />
    </div>
  );
}

export function AppleOneMonitorDemo() {
  const [command, setCommand] = useState("");
  const [lines, setLines] = useState<string[]>(["MONITOR READY", "\\"]);

  const submit = () => {
    const normalized = command.trim().toUpperCase();
    if (!normalized) return;
    let response = "ERR / USE 4 HEX DIGITS OR ADDRESS: VALUES";
    if (/^[0-9A-F]{4}$/.test(normalized)) {
      response = `${normalized}: ${normalized === "E000" ? "4C 00 E0" : "00 00 00"}`;
    } else if (/^[0-9A-F]{4}:\s(?:[0-9A-F]{2}\s?){1,8}$/.test(normalized)) {
      response = `STORED / ${normalized.slice(0, 4)}`;
    }
    setLines((current) => [...current.slice(-5), `\\ ${normalized}`, response, "\\"]);
    setCommand("");
  };

  const reset = () => {
    setCommand("");
    setLines(["MONITOR READY", "\\"]);
  };

  return (
    <div className="appleInteractiveDemo">
      <div className="appleCrt appleMonitorScreen" role="log" aria-live="polite" aria-label="Apple I風モニタ入力の応答">
        {lines.map(promptLine)}
        <span className="appleInputEcho">{command}<span className="appleBlockCursor" aria-hidden="true" /></span>
      </div>
      <form className="appleCommandForm" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label>
          16進モニタ入力
          <input value={command} onChange={(event) => setCommand(event.target.value.slice(0, 28))} spellCheck={false} autoCapitalize="characters" placeholder="E000 または 0300: A9 01" />
        </label>
        <button type="submit" aria-label="モニタコマンドを実行">Enter</button>
        <button type="button" onClick={reset} aria-label="モニタ画面をリセット">リセット</button>
      </form>
      <div className="appleExampleCommands" aria-label="入力例">
        {MONITOR_EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setCommand(example)}>{example}</button>)}
      </div>
    </div>
  );
}

function runBasicProgram(program: readonly string[]) {
  const output: string[] = [];
  for (const line of program) {
    const statement = line.replace(/^\d+\s+/, "");
    const printText = statement.match(/^PRINT\s+"([A-Z0-9 !?._-]{0,30})"$/i);
    if (printText) output.push(printText[1]);
    if (/^PRINT\s+I$/i.test(statement)) output.push("1", "2", "3");
  }
  return output.length ? [...output, "READY"] : ["? COMMAND ERROR", "READY"];
}

export function AppleBasicDemo() {
  const [command, setCommand] = useState("");
  const [program, setProgram] = useState<string[]>([...BASIC_SAMPLE_PROGRAM]);
  const [output, setOutput] = useState<string[]>(["READY"]);
  const [stage, setStage] = useState("プログラムを書く");
  const [lastAddedLine, setLastAddedLine] = useState<string | null>(null);

  const executeCommand = (rawCommand: string) => {
    const normalized = rawCommand.trim().toUpperCase();
    if (!normalized) return;
    if (/^\d+\s+(PRINT\s+("[A-Z0-9 !?._-]{0,30}"|I)|FOR\s+I=1\s+TO\s+3|NEXT\s+I)$/i.test(normalized)) {
      setProgram((current) => [...current.filter((line) => line.split(" ")[0] !== normalized.split(" ")[0]), normalized].sort((a, b) => Number(a.split(" ")[0]) - Number(b.split(" ")[0])));
      setOutput([normalized, "READY"]);
      setStage("プログラムへ行を追加");
      setLastAddedLine(normalized);
    } else if (normalized === "LIST") {
      setOutput([...program, "READY"]);
      setStage("LISTで内容を見る");
    } else if (normalized === "RUN") {
      setOutput(runBasicProgram(program));
      setStage("RUNで実行し、結果を確認する");
    } else if (normalized === "NEW") {
      setProgram([]);
      setOutput(["READY"]);
      setStage("プログラムを消去");
      setLastAddedLine(null);
    } else {
      setOutput(["? SYNTAX ERROR", "READY"]);
      setStage("入力を修正する");
    }
    setCommand("");
  };

  const restoreSample = () => {
    setProgram([...BASIC_SAMPLE_PROGRAM]);
    setOutput(["READY"]);
    setStage("サンプルから開始");
    setLastAddedLine(null);
  };

  return (
    <div className="appleInteractiveDemo appleBasicWorkspace">
      <p className="appleBasicStage"><span>現在の段階</span><strong>{stage}</strong></p>
      <div className="appleBasicPanels">
        <section aria-labelledby="apple-basic-program-title"><h5 id="apple-basic-program-title">プログラム</h5><pre>{program.map((line) => <code key={line} className={lastAddedLine === line ? "is-new" : ""}>{line}</code>)}</pre></section>
        <section aria-labelledby="apple-basic-action-title"><h5 id="apple-basic-action-title">操作</h5>
          <form className="appleBasicActionForm" onSubmit={(event) => { event.preventDefault(); executeCommand(command); }}>
            <label>行を追加<input value={command} onChange={(event) => setCommand(event.target.value.slice(0, 48))} spellCheck={false} placeholder={'50 PRINT "TEXT"'} /></label>
            <button type="submit">行を追加</button>
            <button type="button" onClick={() => executeCommand("LIST")}>LISTを実行</button>
            <button type="button" onClick={() => executeCommand("RUN")}>RUNを実行</button>
            <button type="button" onClick={() => executeCommand("NEW")}>NEWで消去</button>
            <button type="button" onClick={restoreSample}>サンプルへ戻す</button>
          </form>
        </section>
        <section aria-labelledby="apple-basic-result-title"><h5 id="apple-basic-result-title">結果</h5><div className="appleCrt appleBasicScreen" role="log" aria-live="polite">{output.map(promptLine)}</div></section>
      </div>
      <dl className="appleBasicTerms"><div><dt>行番号</dt><dd>実行順を整理する番号</dd></div><div><dt>LIST</dt><dd>入力したプログラムを表示</dd></div><div><dt>RUN</dt><dd>入力したプログラムを実行</dd></div><div><dt>READY</dt><dd>次の入力を受け付けられる状態</dd></div></dl>
      <p className="appleSafetyNote">許可したPRINT、3回ループ、LIST、RUN、NEWだけを解釈します。JavaScriptは実行しません。</p>
    </div>
  );
}

export function TextScrollDemo({ active, prefersReducedMotion }: { active: boolean; prefersReducedMotion: boolean }) {
  const sequence = useAppleSequence({ active, baseDelay: 420, prefersReducedMotion, stepCount: SCROLL_LINES.length });
  const visibleLines = SCROLL_LINES.slice(0, sequence.step + 1);

  return (
    <div className="appleInteractiveDemo">
      <div className="appleCrt appleScrollScreen" role="log" aria-live="polite" aria-label="上方向へスクロールする処理ログ">
        {visibleLines.slice(-4).map(promptLine)}
        <span className="appleScrollPrompt">READY / LINE {String(sequence.step + 1).padStart(2, "0")}</span>
      </div>
      <AppleDemoControls
        label="テキストスクロール"
        phase={sequence.phase}
        speed={sequence.speed}
        loop={sequence.loop}
        onPlay={sequence.play}
        onPause={sequence.pause}
        onReset={sequence.reset}
        onSpeedChange={sequence.setSpeed}
        onLoopChange={sequence.setLoop}
      />
      <button className="appleClearButton" type="button" onClick={sequence.reset} aria-label="テキスト画面をクリア">画面クリア</button>
    </div>
  );
}
