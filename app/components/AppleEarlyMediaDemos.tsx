"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppleDemoControls,
  useAppleSequence,
  type AppleDemoProps,
} from "./AppleEarlyDemoControls";

const cassetteLoadSteps = [
  "CLOAD",
  "SEARCHING FOR PROGRAM",
  "SIGNAL FOUND",
  "READING 0016 BYTES",
  "CHECKING DATA",
  "READY",
];

const appleTwoBootSteps = [
  "POWER ON",
  "VIDEO SIGNAL STABILIZING",
  "SCREEN MEMORY CLEARED",
  "]",
  "READY FOR INPUT",
];

const cassetteStorageSteps = [
  "PREPARE TAPE",
  "START RECORDER",
  "TRANSMITTING AUDIO PULSES",
  "VERIFYING SIGNAL",
  "SAVE COMPLETE",
];

const gameLoadSteps = [
  "INSERT PROGRAM MEDIA",
  "READING TITLE DATA",
  "LOADING LEVEL 01",
  "INITIALIZING CONTROLS",
  "PROGRAM READY",
];

const retrySteps = [
  "READ REQUEST",
  "NO SIGNAL",
  "REWIND / CHECK CONNECTION",
  "RETRYING",
  "SIGNAL ACQUIRED",
  "READY",
];

const accessPatterns = {
  sequential: ["TRACK 00", "TRACK 01", "TRACK 02", "TRACK 03", "READ COMPLETE"],
  intermittent: ["TRACK 00", "WAIT", "TRACK 05", "WAIT", "TRACK 09", "READ COMPLETE"],
  seek: ["TRACK 02", "SEEK 18", "SEEK 06", "SEEK 24", "READ COMPLETE"],
  recovery: ["TRACK 08", "READ ERROR", "RECALIBRATE", "TRACK 08", "READ COMPLETE"],
} as const;

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function useCassetteTone() {
  const contextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      oscillatorRef.current?.stop();
      oscillatorRef.current?.disconnect();
      gainRef.current?.disconnect();
      void contextRef.current?.close();
    };
  }, []);

  const stop = useCallback(() => {
    oscillatorRef.current?.stop();
    oscillatorRef.current?.disconnect();
    gainRef.current?.disconnect();
    oscillatorRef.current = null;
    gainRef.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    const AudioContextConstructor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 1_200;
    gain.gain.value = 0.018;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillatorRef.current = oscillator;
    gainRef.current = gain;
  }, [stop]);

  return { start, stop };
}

export function AppleCassetteLoadDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(cassetteLoadSteps.length, props);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { start: startTone, stop: stopTone } = useCassetteTone();
  const isReading = sequence.phase === "running" && sequence.step >= 1 && sequence.step < 5;

  useEffect(() => {
    if (soundEnabled && isReading) startTone();
    else stopTone();
    return stopTone;
  }, [isReading, soundEnabled, startTone, stopTone]);

  return (
    <div className="appleDemo appleCassetteDemo" data-running={isReading}>
      <div className="appleCassette" aria-hidden="true">
        <span className="appleCassetteReel" />
        <span className="appleCassetteWindow" />
        <span className="appleCassetteReel" />
      </div>
      <div className="appleWaveform" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => (
          <span key={index} style={{ "--wave-index": index } as React.CSSProperties} />
        ))}
      </div>
      <output className="appleStatusReadout" aria-live="polite">
        {cassetteLoadSteps[sequence.step] ?? "PRESS PLAY"}
      </output>
      <label className="appleSoundToggle">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(event) => setSoundEnabled(event.target.checked)}
        />
        SIGNAL SOUND <span>（初期ミュート）</span>
      </label>
      <AppleDemoControls label="カセットロード" sequence={sequence} />
    </div>
  );
}

export function AppleTwoBootDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(appleTwoBootSteps.length, props);
  return (
    <div className="appleDemo appleBootDemo" data-phase={sequence.phase}>
      <div className="appleBootScreen" aria-hidden="true">
        <span className="appleBootNoise" />
        <span className="appleBootPrompt">{sequence.step >= 3 ? "]" : ""}</span>
      </div>
      <output className="appleStatusReadout" aria-live="polite">
        {appleTwoBootSteps[sequence.step] ?? "POWER OFF"}
      </output>
      <AppleDemoControls label="Apple II風起動" sequence={sequence} />
    </div>
  );
}

export function CassetteStorageDemo(props: AppleDemoProps) {
  const [mode, setMode] = useState<"save" | "load">("save");
  const sequence = useAppleSequence(cassetteStorageSteps.length, props);
  const labels = mode === "save"
    ? cassetteStorageSteps
    : ["PREPARE TAPE", "SEARCHING", "SIGNAL FOUND", "READING DATA", "LOAD COMPLETE"];

  return (
    <div className="appleDemo appleStorageDemo" data-running={sequence.phase === "running"}>
      <div className="appleMediaSwitch" role="group" aria-label="カセット操作">
        <button type="button" aria-pressed={mode === "save"} onClick={() => { setMode("save"); sequence.reset(); }}>SAVE</button>
        <button type="button" aria-pressed={mode === "load"} onClick={() => { setMode("load"); sequence.reset(); }}>LOAD</button>
      </div>
      <div className="appleWaveform appleWaveformWide" aria-hidden="true">
        {Array.from({ length: 40 }, (_, index) => <span key={index} />)}
      </div>
      <output className="appleStatusReadout" aria-live="polite">
        {labels[sequence.step] ?? `${mode.toUpperCase()} READY`}
      </output>
      <AppleDemoControls label="カセット保存と読み込み" sequence={sequence} />
    </div>
  );
}

function DiskDriveVisual({ state, inserted = true }: { state: string; inserted?: boolean }) {
  const active = /TRACK|SEEK|READ|BOOT|LOAD|CALIBRATE/.test(state) && !/COMPLETE|ERROR/.test(state);
  return (
    <div className="appleDiskDrive" data-active={active} data-error={/ERROR|NO DISK/.test(state)} aria-hidden="true">
      <div className="appleDiskSlot">{inserted ? <span className="appleDiskLabel">DISK</span> : null}</div>
      <span className="appleDiskLamp" />
      <div className="appleDiskMechanism">
        <span className="appleDiskPlatter" />
        <span className="appleDiskHead" />
      </div>
    </div>
  );
}

export function DiskBootDemo(props: AppleDemoProps) {
  const [inserted, setInserted] = useState(true);
  const steps = inserted
    ? ["POWER ON", "BOOT DEVICE SELECTED", "TRACK 00", "LOADING SYSTEM", "READY"]
    : ["POWER ON", "NO DISK", "INSERT MEDIA", "WAITING", "BOOT HALTED"];
  const sequence = useAppleSequence(steps.length, props);

  return (
    <div className="appleDemo appleDiskDemo">
      <DiskDriveVisual state={steps[sequence.step] ?? "IDLE"} inserted={inserted} />
      <label className="appleSoundToggle">
        <input type="checkbox" checked={inserted} onChange={(event) => { setInserted(event.target.checked); sequence.reset(); }} />
        DISK INSERTED
      </label>
      <output className="appleStatusReadout" aria-live="polite">{steps[sequence.step] ?? "DRIVE IDLE"}</output>
      <AppleDemoControls label="Disk II風起動" sequence={sequence} />
    </div>
  );
}

export function DiskAccessPatternDemo(props: AppleDemoProps) {
  const [pattern, setPattern] = useState<keyof typeof accessPatterns>("sequential");
  const steps = accessPatterns[pattern];
  const sequence = useAppleSequence(steps.length, props);
  return (
    <div className="appleDemo appleDiskDemo">
      <label className="appleSelectLabel">
        ACCESS PATTERN
        <select value={pattern} onChange={(event) => { setPattern(event.target.value as keyof typeof accessPatterns); sequence.reset(); }}>
          <option value="sequential">SEQUENTIAL</option>
          <option value="intermittent">INTERMITTENT</option>
          <option value="seek">RANDOM SEEK</option>
          <option value="recovery">ERROR / RETRY</option>
        </select>
      </label>
      <DiskDriveVisual state={steps[sequence.step] ?? "IDLE"} />
      <output className="appleStatusReadout" aria-live="polite">{steps[sequence.step] ?? "DRIVE IDLE"}</output>
      <AppleDemoControls label="Disk IIアクセスパターン" sequence={sequence} />
    </div>
  );
}

export function EarlyGameLoadingDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(gameLoadSteps.length, props);
  return (
    <div className="appleDemo appleGameDemo" data-loaded={sequence.phase === "complete"}>
      <div className="appleGameScreen" aria-hidden="true">
        <div className="appleGameLandscape"><span /><span /><span /></div>
        <div className="appleGamePlayer">◆</div>
        <div className="appleGameProgress" style={{ "--load-progress": `${(sequence.step / (gameLoadSteps.length - 1)) * 100}%` } as React.CSSProperties} />
      </div>
      <output className="appleStatusReadout" aria-live="polite">{gameLoadSteps[sequence.step] ?? "PROGRAM STOPPED"}</output>
      <AppleDemoControls label="ゲームロード風演出" sequence={sequence} />
    </div>
  );
}

export function ErrorRetryDemo(props: AppleDemoProps) {
  const sequence = useAppleSequence(retrySteps.length, props);
  const state = retrySteps[sequence.step] ?? "IDLE";
  return (
    <div className="appleDemo appleRetryDemo" data-error={/NO SIGNAL/.test(state)}>
      <div className="appleRetryDiagram" aria-hidden="true">
        <span>MEDIA</span><i>→</i><span className="appleRetryNode">INPUT</span><i>→</i><span>MEMORY</span>
      </div>
      <output className="appleStatusReadout" aria-live="polite">{state}</output>
      <AppleDemoControls label="エラーと再試行" sequence={sequence} />
    </div>
  );
}
