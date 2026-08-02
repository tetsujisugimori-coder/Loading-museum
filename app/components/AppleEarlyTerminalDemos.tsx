"use client";

import { useState } from "react";
import { AppleDemoControls, useAppleSequence } from "./AppleEarlyDemoControls";

const MONITOR_EXAMPLES = ["E000", "0300: A9 01", "FF00"] as const;
const SCROLL_LINES = [
  "CHECKING MEMORY BANK 00",
  "WRITING DISPLAY PAGE",
  "READING INPUT BUFFER",
  "COPYING 16 BYTES",
  "VERIFYING RESULT",
  "PROCESS COMPLETE",
] as const;

function promptLine(text: string, index: number) {
  return <span key={`${index}-${text}`}>{text}</span>;
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
  const [program, setProgram] = useState<string[]>([
    '10 PRINT "HELLO ARCHIVE"',
    "20 FOR I=1 TO 3",
    "30 PRINT I",
    "40 NEXT I",
  ]);
  const [output, setOutput] = useState<string[]>(["READY"]);

  const submit = () => {
    const normalized = command.trim().toUpperCase();
    if (!normalized) return;
    if (/^\d+\s+(PRINT\s+("[A-Z0-9 !?._-]{0,30}"|I)|FOR\s+I=1\s+TO\s+3|NEXT\s+I)$/i.test(normalized)) {
      setProgram((current) => [...current.filter((line) => line.split(" ")[0] !== normalized.split(" ")[0]), normalized].sort((a, b) => Number(a.split(" ")[0]) - Number(b.split(" ")[0])));
      setOutput([normalized, "READY"]);
    } else if (normalized === "LIST") {
      setOutput([...program, "READY"]);
    } else if (normalized === "RUN") {
      setOutput(runBasicProgram(program));
    } else if (normalized === "NEW") {
      setProgram([]);
      setOutput(["READY"]);
    } else {
      setOutput(["? SYNTAX ERROR", "READY"]);
    }
    setCommand("");
  };

  return (
    <div className="appleInteractiveDemo">
      <div className="appleCrt appleBasicScreen" role="log" aria-live="polite" aria-label="Apple II BASIC風の入力結果">
        {output.map(promptLine)}
        <span>&gt; {command}<span className="appleBlockCursor" aria-hidden="true" /></span>
      </div>
      <form className="appleCommandForm" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label>
          BASIC風入力
          <input value={command} onChange={(event) => setCommand(event.target.value.slice(0, 48))} spellCheck={false} placeholder={'LIST / RUN / 50 PRINT "TEXT"'} />
        </label>
        <button type="submit" aria-label="BASIC風コマンドを実行">Enter</button>
        <button type="button" onClick={() => setCommand("LIST")}>LIST</button>
        <button type="button" onClick={() => setCommand("RUN")}>RUN</button>
      </form>
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
