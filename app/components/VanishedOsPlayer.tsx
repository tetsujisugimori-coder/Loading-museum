"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  VanishedLoadingExhibit,
  VanishedLoadingVisualType,
} from "../data/vanishedOperatingSystems";

type LoadingPhase = "idle" | "running" | "complete" | "stopped";

const CLASSIC_EXTENSIONS = ["INIT", "SND", "TYPE", "NET", "PRINT", "DESK"];
const BE_BOOT_STAGES = ["ATOM", "BUS", "CPU", "I/O", "DISK", "VOL", "SCRIPT"];
const NEXT_BOOT_LINES = [
  "ROM diagnostics complete",
  "loading bootstrap from sd0",
  "probing display and bus devices",
  "starting Mach services",
  "mounting root filesystem",
  "running system initialization",
  "starting window services",
  "opening login workspace",
];
const NEXT_SERVICES = ["ROOT DISK", "NETWORK", "WINDOW SERVER", "LOGINWINDOW"];
const PALM_CONDUITS = ["DATE BOOK", "ADDRESS", "TO DO", "MEMO PAD", "BACKUP"];
const PALM_RECORDS = ["CALENDAR", "CONTACTS", "MEMOS", "PREFERENCES"];
const WEBOS_UPDATE_STAGES = ["DOWNLOADING", "VERIFYING", "INSTALLING", "FINISHING"];
const WINDOWS_STORE_STAGES = ["GETTING", "INSTALLING", "PREPARING", "READY"];

function useLoadingSimulation(
  totalSteps: number,
  delay: number,
  active: boolean,
  prefersReducedMotion: boolean,
) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<LoadingPhase>("idle");
  const [runRevision, setRunRevision] = useState(0);

  useEffect(() => {
    if (
      !active ||
      prefersReducedMotion ||
      phase !== "running" ||
      step >= totalSteps
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setStep((current) => {
        const next = Math.min(current + 1, totalSteps);
        if (next >= totalSteps) {
          setPhase("complete");
        }
        return next;
      });
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [
    active,
    delay,
    phase,
    prefersReducedMotion,
    runRevision,
    step,
    totalSteps,
  ]);

  const run = () => {
    setStep(prefersReducedMotion ? totalSteps : 0);
    setPhase(prefersReducedMotion ? "complete" : "running");
    setRunRevision((current) => current + 1);
  };

  const stop = () => {
    if (phase === "running") {
      setPhase("stopped");
    }
  };
  const simplified = prefersReducedMotion && phase === "running";

  return {
    phase: simplified ? "complete" : phase,
    run,
    step: simplified ? totalSteps : step,
    stop,
  };
}

function ProgressBlocks({
  count,
  lit,
}: {
  count: number;
  lit: number;
}) {
  return (
    <span className="historicalProgressBlocks" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i data-lit={index < lit} key={index} />
      ))}
    </span>
  );
}

function ClassicExtensionParade({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  const visibleCount = complete
    ? CLASSIC_EXTENSIONS.length
    : Math.min(step, CLASSIC_EXTENSIONS.length);

  return (
    <div className="classicExtensionScreen">
      <div className="classicStartupSymbol" aria-hidden="true">
        <span className="classicScreenFace">:)</span>
      </div>
      <span className="classicWelcome">
        {complete ? "Desktop ready" : "Welcome — loading system resources"}
      </span>
      <div className="classicExtensionRow">
        {CLASSIC_EXTENSIONS.map((extension, index) => (
          <span data-visible={index < visibleCount} key={extension}>
            <i aria-hidden="true" />
            {extension}
          </span>
        ))}
      </div>
    </div>
  );
}

function ClassicWatchCursor({
  complete,
  running,
  step,
}: {
  complete: boolean;
  running: boolean;
  step: number;
}) {
  return (
    <div className="classicWatchPanel">
      <div className="classicFileWindow">
        <span className="classicTitleBars" />
        <span className="classicFileIcon" aria-hidden="true" />
        <span>{complete ? "Document opened" : "Reading application…"}</span>
      </div>
      <span
        className="classicWatchCursor"
        data-running={running}
        style={{ "--watch-step": step } as CSSProperties}
        aria-hidden="true"
      >
        <i />
      </span>
    </div>
  );
}

function ClassicDiskLoad({
  complete,
  progress,
}: {
  complete: boolean;
  progress: number;
}) {
  const lit = Math.round(progress / 10);

  return (
    <div className="classicDiskDialog">
      <span className="classicDialogTitle">DISK ACCESS</span>
      <span className="classicDiskGlyph" aria-hidden="true">
        <i />
      </span>
      <strong>{complete ? "Application available" : "Reading archive…"}</strong>
      <ProgressBlocks count={10} lit={lit} />
      <small>{progress}%</small>
    </div>
  );
}

function BeBootIcons({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  return (
    <div className="beHistoricalBoot">
      <span className="beBootCaption">
        {complete ? "WORKSPACE READY" : "BOOT SEQUENCE"}
      </span>
      <div className="beHistoricalSymbols">
        {BE_BOOT_STAGES.map((stage, index) => (
          <span data-lit={complete || step > index} key={stage}>
            <i aria-hidden="true" />
            <small>{stage}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function BeTrackerLaunch({
  complete,
  progress,
  step,
}: {
  complete: boolean;
  progress: number;
  step: number;
}) {
  return (
    <div className="beTrackerScreen">
      <div className="beMiniDeskbar">
        <span>12:42</span>
        <i />
        <i />
      </div>
      <div className="beTrackerWindow" data-ready={complete}>
        <strong>{complete ? "HOME" : "TRACKER"}</strong>
        <span className="beTrackerPath">/boot/home</span>
        <div className="beTrackerFiles">
          {["PREFS", "DOCS", "MEDIA"].map((item, index) => (
            <i data-visible={complete || step > index + 2} key={item}>
              {item}
            </i>
          ))}
        </div>
        <span className="beTrackerLoad" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function BeFileAccess({
  complete,
  progress,
  step,
}: {
  complete: boolean;
  progress: number;
  step: number;
}) {
  const activity = 24 + ((step * 37) % 72);

  return (
    <div className="beFilePanel">
      <div className="beFileHeader">
        <strong>FILE PROCESS</strong>
        <span>{complete ? "DONE" : `${progress}%`}</span>
      </div>
      <div className="beFileRows">
        {["ARCHIVE.01", "INDEX.DATA", "ATTR.MAP", "MEDIA.CACHE"].map(
          (file, index) => (
            <span data-done={complete || step > index * 2} key={file}>
              <i />
              {file}
            </span>
          ),
        )}
      </div>
      <div className="beDiskActivity">
        <small>DISK ACTIVITY</small>
        <span style={{ width: `${complete ? 0 : activity}%` }} />
      </div>
    </div>
  );
}

function NextBootMessages({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  const visibleLines = complete
    ? NEXT_BOOT_LINES
    : NEXT_BOOT_LINES.slice(0, Math.max(step, 1));

  return (
    <div className="nextBootConsole">
      <span className="nextConsoleHeader">SYSTEM STARTUP / CONSOLE</span>
      <div>
        {visibleLines.map((line, index) => (
          <span data-current={!complete && index === visibleLines.length - 1} key={line}>
            {line}
          </span>
        ))}
      </div>
      {complete ? <strong>login workspace available</strong> : null}
    </div>
  );
}

function NextDiskServices({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  return (
    <div className="nextServicePanel">
      <div className="nextPanelTitle">SYSTEM SERVICES</div>
      <div className="nextServiceRows">
        {NEXT_SERVICES.map((service, index) => {
          const ready = complete || step > index * 2;
          return (
            <span data-ready={ready} key={service}>
              <i />
              <b>{service}</b>
              <small>{ready ? "AVAILABLE" : "WAITING"}</small>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function NextAppLaunch({
  complete,
  progress,
  step,
}: {
  complete: boolean;
  progress: number;
  step: number;
}) {
  return (
    <div className="nextWorkspaceLaunch">
      <div className="nextLaunchDock">
        {["A", "B", "C"].map((item, index) => (
          <span data-selected={index === 1} key={item}>
            {item}
          </span>
        ))}
      </div>
      <div className="nextLaunchPanel" data-complete={complete}>
        <div className="nextPanelTitle">
          {complete ? "APPLICATION" : "WORKSPACE MANAGER"}
        </div>
        <strong>{complete ? "Application ready" : "Reading application…"}</strong>
        <span>{step < 3 ? "Locating bundle" : step < 6 ? "Loading objects" : "Opening window"}</span>
        <ProgressBlocks count={8} lit={Math.round(progress / 12.5)} />
      </div>
    </div>
  );
}

function PalmDevice({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="palmHistoricalDevice">
      <div className="palmHistoricalScreen">{children}</div>
      <div className="palmHistoricalKeys" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function PalmHotSync({
  complete,
  progress,
  step,
}: {
  complete: boolean;
  progress: number;
  step: number;
}) {
  const conduitIndex = Math.min(
    Math.floor(step / 2),
    PALM_CONDUITS.length - 1,
  );

  return (
    <PalmDevice>
      <div className="palmSyncScreen">
        <strong>{complete ? "HOTSYNC COMPLETE" : "HOTSYNC"}</strong>
        <span className="palmConnection">{complete ? "OK" : "LOCAL: CONNECTED"}</span>
        <div>
          {PALM_CONDUITS.map((conduit, index) => (
            <span
              data-current={!complete && index === conduitIndex}
              data-done={complete || index < conduitIndex}
              key={conduit}
            >
              {conduit}
            </span>
          ))}
        </div>
        <small>{progress}%</small>
      </div>
    </PalmDevice>
  );
}

function PalmDatabaseLoad({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  return (
    <PalmDevice>
      <div className="palmDatabaseScreen">
        <strong>{complete ? "DATABASE READY" : "OPENING DATABASE"}</strong>
        {PALM_RECORDS.map((record, index) => (
          <span data-loaded={complete || step > index * 2} key={record}>
            <i />
            {record}
            <small>{complete || step > index * 2 ? "OK" : "…"}</small>
          </span>
        ))}
      </div>
    </PalmDevice>
  );
}

function PalmBeamTransfer({
  complete,
  progress,
  running,
}: {
  complete: boolean;
  progress: number;
  running: boolean;
}) {
  return (
    <div className="palmBeamScene">
      <span className="palmBeamUnit">PDA</span>
      <span className="palmBeamSignal" data-running={running}>
        · · ·
      </span>
      <span className="palmBeamUnit">PDA</span>
      <strong>{complete ? "BEAM RECEIVED" : "BEAMING RECORD…"}</strong>
      <ProgressBlocks count={9} lit={Math.round(progress / 11)} />
    </div>
  );
}

function WebOsPhone({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="webosHistoricalPhone">
      <div className="webosHistoricalScreen">{children}</div>
    </div>
  );
}

function WebOsPulseBoot({
  complete,
  progress,
  running,
}: {
  complete: boolean;
  progress: number;
  running: boolean;
}) {
  return (
    <WebOsPhone>
      <div className="webosPulseBoot">
        <span className="webosHistoricalPulse" data-running={running} />
        <small>{complete ? "CARDS AVAILABLE" : `STARTING ${progress}%`}</small>
      </div>
    </WebOsPhone>
  );
}

function WebOsCardLaunch({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  return (
    <WebOsPhone>
      <div className="webosCardLoading">
        <span className="webosCardWait" data-visible={!complete}>
          • • •
        </span>
        <div className="webosLoadingCard" data-raised={step > 1 || complete}>
          <strong>{complete ? "MESSAGES" : "OPENING"}</strong>
          {[2, 4, 6].map((threshold) => (
            <i data-visible={complete || step > threshold} key={threshold} />
          ))}
        </div>
      </div>
    </WebOsPhone>
  );
}

function WebOsUpdateInstall({
  complete,
  progress,
  step,
}: {
  complete: boolean;
  progress: number;
  step: number;
}) {
  const stageIndex = complete
    ? WEBOS_UPDATE_STAGES.length - 1
    : Math.min(
        Math.floor((step / 11) * WEBOS_UPDATE_STAGES.length),
        WEBOS_UPDATE_STAGES.length - 1,
      );

  return (
    <WebOsPhone>
      <div className="webosUpdatePanel">
        <strong>SOFTWARE MANAGER</strong>
        <span className="webosPackageGlyph" aria-hidden="true" />
        <b>{complete ? "UPDATE COMPLETE" : WEBOS_UPDATE_STAGES[stageIndex]}</b>
        <div className="webosUpdateTrack">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>{progress}%</small>
      </div>
    </WebOsPhone>
  );
}

function WindowsPhoneFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="windowsHistoricalPhone">
      <div className="windowsHistoricalScreen">{children}</div>
    </div>
  );
}

function WindowsPhoneDots({
  complete,
  running,
  step,
}: {
  complete: boolean;
  running: boolean;
  step: number;
}) {
  return (
    <WindowsPhoneFrame>
      <div className="windowsDotBoot">
        <div className="windowsMovingDots" data-running={running}>
          {Array.from({ length: 5 }, (_, index) => (
            <i
              data-active={!complete && (step + index) % 6 > 1}
              key={index}
            />
          ))}
        </div>
        <strong>{complete ? "start" : "loading"}</strong>
      </div>
    </WindowsPhoneFrame>
  );
}

function WindowsPhoneResuming({
  complete,
  running,
}: {
  complete: boolean;
  running: boolean;
}) {
  return (
    <WindowsPhoneFrame>
      <div className="windowsResumeScreen">
        <strong>{complete ? "ready" : "resuming…"}</strong>
        <div className="windowsResumeDots" data-running={running}>
          <i />
          <i />
          <i />
        </div>
        {complete ? <span className="windowsResumeTile">APP</span> : null}
      </div>
    </WindowsPhoneFrame>
  );
}

function WindowsPhoneStoreUpdate({
  complete,
  progress,
  step,
}: {
  complete: boolean;
  progress: number;
  step: number;
}) {
  const stageIndex = complete
    ? WINDOWS_STORE_STAGES.length - 1
    : Math.min(
        Math.floor((step / 11) * WINDOWS_STORE_STAGES.length),
        WINDOWS_STORE_STAGES.length - 1,
      );

  return (
    <WindowsPhoneFrame>
      <div className="windowsStorePanel">
        <span className="windowsStoreTile">APP</span>
        <div>
          <strong>archive reader</strong>
          <b>{WINDOWS_STORE_STAGES[stageIndex].toLowerCase()}</b>
          <span className="windowsStoreTrack">
            <i style={{ width: `${progress}%` }} />
          </span>
          <small>{progress}%</small>
        </div>
      </div>
    </WindowsPhoneFrame>
  );
}

function VanishedLoadingVisual({
  visualType,
  complete,
  progress,
  running,
  step,
}: {
  visualType: VanishedLoadingVisualType;
  complete: boolean;
  progress: number;
  running: boolean;
  step: number;
}) {
  switch (visualType) {
    case "classic-extension-parade":
      return <ClassicExtensionParade complete={complete} step={step} />;
    case "classic-watch-cursor":
      return (
        <ClassicWatchCursor
          complete={complete}
          running={running}
          step={step}
        />
      );
    case "classic-disk-load":
      return <ClassicDiskLoad complete={complete} progress={progress} />;
    case "beos-boot-icons":
      return <BeBootIcons complete={complete} step={step} />;
    case "beos-tracker-launch":
      return (
        <BeTrackerLaunch
          complete={complete}
          progress={progress}
          step={step}
        />
      );
    case "beos-file-access":
      return (
        <BeFileAccess complete={complete} progress={progress} step={step} />
      );
    case "nextstep-boot-messages":
      return <NextBootMessages complete={complete} step={step} />;
    case "nextstep-disk-services":
      return <NextDiskServices complete={complete} step={step} />;
    case "nextstep-app-launch":
      return (
        <NextAppLaunch complete={complete} progress={progress} step={step} />
      );
    case "palm-hotsync":
      return <PalmHotSync complete={complete} progress={progress} step={step} />;
    case "palm-database-load":
      return <PalmDatabaseLoad complete={complete} step={step} />;
    case "palm-beam-transfer":
      return (
        <PalmBeamTransfer
          complete={complete}
          progress={progress}
          running={running}
        />
      );
    case "webos-pulse-boot":
      return (
        <WebOsPulseBoot
          complete={complete}
          progress={progress}
          running={running}
        />
      );
    case "webos-card-launch":
      return <WebOsCardLaunch complete={complete} step={step} />;
    case "webos-update-install":
      return (
        <WebOsUpdateInstall
          complete={complete}
          progress={progress}
          step={step}
        />
      );
    case "windows-phone-dots":
      return (
        <WindowsPhoneDots complete={complete} running={running} step={step} />
      );
    case "windows-phone-resuming":
      return (
        <WindowsPhoneResuming complete={complete} running={running} />
      );
    case "windows-phone-store-update":
      return (
        <WindowsPhoneStoreUpdate
          complete={complete}
          progress={progress}
          step={step}
        />
      );
  }
}

export function VanishedOsPlayer({
  demo,
  osTitle,
  active,
  prefersReducedMotion,
}: {
  demo: VanishedLoadingExhibit;
  osTitle: string;
  active: boolean;
  prefersReducedMotion: boolean;
}) {
  const simulation = useLoadingSimulation(
    demo.totalSteps,
    demo.stepDelay,
    active,
    prefersReducedMotion,
  );
  const complete = simulation.phase === "complete";
  const running = active && simulation.phase === "running";
  const progress = Math.round(
    (simulation.step / demo.totalSteps) * 100,
  );
  const runLabel =
    simulation.phase === "idle" ? "再生" : "リプレイ";
  const stateLabel = prefersReducedMotion
    ? complete
      ? "動きを減らした最終状態"
      : "動きを減らす設定"
    : simulation.phase === "running"
      ? "再生中"
      : simulation.phase === "complete"
        ? "完了"
        : simulation.phase === "stopped"
          ? "停止中"
          : "待機中";

  return (
    <>
      <div
        className="vanishedOsScreen"
        data-demo={demo.visualType}
        data-phase={simulation.phase}
        data-running={running}
        role="img"
        aria-label={`${osTitle}の「${demo.title}」をJavaScriptとCSSで再構成した展示。状態: ${stateLabel}`}
      >
        <VanishedLoadingVisual
          visualType={demo.visualType}
          complete={complete}
          progress={progress}
          running={running}
          step={simulation.step}
        />
      </div>
      <div className="vanishedOsControls">
        <button
          className="bootOsButton"
          type="button"
          onClick={simulation.run}
          disabled={simulation.phase === "running"}
          aria-label={`${osTitle}の「${demo.title}」を${runLabel}`}
        >
          {runLabel}
        </button>
        <button
          className="stopOsButton"
          type="button"
          onClick={simulation.stop}
          disabled={simulation.phase !== "running"}
          aria-label={`${osTitle}の「${demo.title}」を停止`}
        >
          停止
        </button>
        <span className="vanishedOsState" aria-live="polite">
          {stateLabel}
        </span>
      </div>
    </>
  );
}
