"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  TerminalAnimationType,
  TerminalRoomExhibit,
} from "../data/exhibitRooms";

type DemoSpeed = "authentic" | "viewing";

type LoginState = {
  kind: "login";
  phase: "username" | "password" | "last-login" | "prompt";
  username: string;
};

type BootState = {
  kind: "boot";
  lines: string[];
};

type SysvService = {
  name: string;
  complete: boolean;
};

type SysvState = {
  kind: "sysvinit";
  services: SysvService[];
  activeService?: string;
  dots?: string;
  ready?: boolean;
};

type AptState = {
  kind: "apt";
  phase: "fetch" | "download" | "unpack" | "configure" | "done";
  progress: number;
  spinner: string;
  speed?: string;
  remaining?: string;
};

type CompileState = {
  kind: "compile";
  phase: "checking" | "compiling" | "linking" | "done";
  progress: number;
  lines: string[];
};

type TerminalDemoState =
  | LoginState
  | BootState
  | SysvState
  | AptState
  | CompileState;

type DemoStep = {
  state: TerminalDemoState;
  delayFactor: number;
};

const TERMINAL_SPINNER = ["/", "-", "\\", "|"] as const;
const LOGIN_NAME = "guest";
const BOOT_LINES = [
  "Booting fictional Linux environment...",
  "[    0.012] CPU0: Generic 64-bit processor detected",
  "[    0.029] Memory: 4096 MB available",
  "[    0.047] clocksource: generic timer initialized",
  "[    0.083] bus: virtual system bus registered",
  "[    0.116] storage: /dev/vda 64 GiB (virtual)",
  "[    0.121] vda: vda1 vda2",
  "[    0.178] input: generic keyboard connected",
  "[    0.205] net: loopback interface ready",
  "[    0.247] console: virtual terminal initialized",
  "[    0.304] fs: checking fictional root volume",
  "[    0.612] fs: root volume mounted read-write",
  "[    0.668] init: starting user space",
  "[    0.744] system ready",
  "archive-linux login:",
] as const;

function makeLoginSteps(): DemoStep[] {
  const typingSteps = Array.from(LOGIN_NAME, (_, index) => ({
    state: {
      kind: "login" as const,
      phase: "username" as const,
      username: LOGIN_NAME.slice(0, index + 1),
    },
    delayFactor: [0.75, 0.48, 0.68, 0.52, 0.9][index],
  }));

  return [
    {
      state: { kind: "login", phase: "username", username: "" },
      delayFactor: 0.7,
    },
    ...typingSteps,
    {
      state: { kind: "login", phase: "password", username: LOGIN_NAME },
      delayFactor: 1.8,
    },
    {
      state: { kind: "login", phase: "last-login", username: LOGIN_NAME },
      delayFactor: 1.15,
    },
    {
      state: { kind: "login", phase: "prompt", username: LOGIN_NAME },
      delayFactor: 1,
    },
  ];
}

function makeBootSteps(): DemoStep[] {
  const delayFactors = [
    0.55, 0.32, 0.46, 0.28, 0.35, 1.45, 0.24, 0.3, 0.22, 0.42, 1.2, 0.28,
    0.25, 0.38, 1,
  ];

  return BOOT_LINES.map((_, index) => ({
    state: { kind: "boot", lines: BOOT_LINES.slice(0, index + 1) },
    delayFactor: delayFactors[index],
  }));
}

function makeSysvSteps(): DemoStep[] {
  const serviceNames = [
    "system logger",
    "device manager",
    "network services",
    "local services",
  ];
  const dotPatterns = [".", "..", "...", ".."];
  const serviceWaits = [0.7, 1.15, 0.82, 1.3];
  const steps: DemoStep[] = [];
  const completeServices: SysvService[] = [];

  serviceNames.forEach((name, serviceIndex) => {
    dotPatterns.forEach((dots, dotIndex) => {
      steps.push({
        state: {
          kind: "sysvinit",
          services: [
            ...completeServices,
            { name, complete: false },
          ],
          activeService: name,
          dots,
        },
        delayFactor:
          dotIndex === dotPatterns.length - 1
            ? serviceWaits[serviceIndex]
            : 0.42 + dotIndex * 0.08,
      });
    });
    completeServices.push({ name, complete: true });
    steps.push({
      state: {
        kind: "sysvinit",
        services: [...completeServices],
      },
      delayFactor: 0.38,
    });
  });

  steps.push({
    state: {
      kind: "sysvinit",
      services: [...completeServices],
      ready: true,
    },
    delayFactor: 1,
  });

  return steps;
}

function makeAptSteps(): DemoStep[] {
  const steps: DemoStep[] = [];
  const appendPhase = (
    phase: AptState["phase"],
    progressValues: number[],
    delayFactors: number[],
    details?: Array<Pick<AptState, "speed" | "remaining">>,
  ) => {
    progressValues.forEach((progress, index) => {
      steps.push({
        state: {
          kind: "apt",
          phase,
          progress,
          spinner: TERMINAL_SPINNER[index % TERMINAL_SPINNER.length],
          ...details?.[index],
        },
        delayFactor: delayFactors[index],
      });
    });
  };

  appendPhase("fetch", [0, 16, 43, 71, 100], [0.45, 0.72, 0.38, 0.62, 0.4]);
  appendPhase(
    "download",
    [0, 8, 27, 55, 78, 100],
    [0.55, 0.42, 0.82, 0.36, 0.68, 0.45],
    [
      { speed: "0.0 MB/s", remaining: "--" },
      { speed: "0.8 MB/s", remaining: "6秒" },
      { speed: "1.4 MB/s", remaining: "4秒" },
      { speed: "2.1 MB/s", remaining: "2秒" },
      { speed: "1.6 MB/s", remaining: "1秒" },
      { speed: "2.0 MB/s", remaining: "0秒" },
    ],
  );
  appendPhase("unpack", [0, 22, 58, 84, 100], [0.55, 0.35, 0.75, 0.42, 0.5]);
  appendPhase("configure", [0, 34, 69, 100], [0.65, 0.48, 0.78, 0.45]);
  appendPhase("done", [100], [1]);

  return steps;
}

function makeCompileSteps(): DemoStep[] {
  return [
    {
      state: {
        kind: "compile",
        phase: "checking",
        progress: 0,
        lines: ["checking... build environment"],
      },
      delayFactor: 0.7,
    },
    {
      state: {
        kind: "compile",
        phase: "checking",
        progress: 12,
        lines: [
          "checking... build environment",
          "checking... C compiler",
        ],
      },
      delayFactor: 0.48,
    },
    {
      state: {
        kind: "compile",
        phase: "checking",
        progress: 24,
        lines: [
          "checking... build environment",
          "checking... C compiler",
          "checking... system headers",
        ],
      },
      delayFactor: 0.82,
    },
    {
      state: {
        kind: "compile",
        phase: "compiling",
        progress: 38,
        lines: ["compiling... src/archive.c"],
      },
      delayFactor: 0.38,
    },
    {
      state: {
        kind: "compile",
        phase: "compiling",
        progress: 52,
        lines: [
          "compiling... src/archive.c",
          "compiling... src/terminal.c",
        ],
      },
      delayFactor: 0.62,
    },
    {
      state: {
        kind: "compile",
        phase: "compiling",
        progress: 68,
        lines: [
          "compiling... src/archive.c",
          "compiling... src/terminal.c",
          "compiling... src/exhibit.c",
        ],
      },
      delayFactor: 0.35,
    },
    {
      state: {
        kind: "compile",
        phase: "compiling",
        progress: 82,
        lines: [
          "compiling... src/terminal.c",
          "compiling... src/exhibit.c",
          "compiling... src/catalog.c",
        ],
      },
      delayFactor: 0.76,
    },
    {
      state: {
        kind: "compile",
        phase: "linking",
        progress: 92,
        lines: [
          "compiling... src/catalog.c",
          "linking... loading-museum",
        ],
      },
      delayFactor: 0.95,
    },
    {
      state: {
        kind: "compile",
        phase: "linking",
        progress: 100,
        lines: ["linking... loading-museum"],
      },
      delayFactor: 0.52,
    },
    {
      state: {
        kind: "compile",
        phase: "done",
        progress: 100,
        lines: ["Build complete", "guest@archive:~/museum$"],
      },
      delayFactor: 1,
    },
  ];
}

function getDemoSteps(animationType: TerminalAnimationType) {
  switch (animationType) {
    case "unix-login":
      return makeLoginSteps();
    case "linux-boot":
      return makeBootSteps();
    case "sysvinit":
      return makeSysvSteps();
    case "apt-progress":
      return makeAptSteps();
    case "configure-make":
      return makeCompileSteps();
  }
}

function useTerminalSequence(
  steps: readonly DemoStep[],
  baseDelay: number,
  active: boolean,
  prefersReducedMotion: boolean,
) {
  const [stepIndex, setStepIndex] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [runRevision, setRunRevision] = useState(0);
  const finalStepIndex = Math.max(steps.length - 1, 0);
  const displayedStepIndex = prefersReducedMotion ? finalStepIndex : stepIndex;

  useEffect(() => {
    if (
      !active ||
      !hasRun ||
      prefersReducedMotion ||
      stepIndex >= finalStepIndex
    ) {
      return;
    }

    const delayFactor = steps[stepIndex]?.delayFactor ?? 1;
    const delay = Math.max(40, Math.round(baseDelay * delayFactor));
    const timerId = window.setTimeout(() => {
      setStepIndex((current) => Math.min(current + 1, finalStepIndex));
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [
    active,
    baseDelay,
    finalStepIndex,
    hasRun,
    prefersReducedMotion,
    runRevision,
    stepIndex,
    steps,
  ]);

  const run = () => {
    setStepIndex(0);
    setHasRun(true);
    setRunRevision((current) => current + 1);
  };

  return {
    hasRun,
    isComplete: prefersReducedMotion || stepIndex >= finalStepIndex,
    run,
    runRevision,
    state: steps[displayedStepIndex]?.state,
    stepIndex: displayedStepIndex,
  };
}

function TerminalCursor({
  active,
  revision,
}: {
  active: boolean;
  revision: number;
}) {
  return (
    <span
      key={revision}
      className="terminalCursor"
      data-active={active}
      aria-hidden="true"
    />
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const width = 16;
  const filled = Math.round((progress / 100) * width);
  return (
    <span className="terminalProgress" aria-label={`${progress}%`}>
      [{`#`.repeat(filled)}{`-`.repeat(width - filled)}] {progress}%
    </span>
  );
}

function LoginDemo({
  state,
  cursorActive,
  runRevision,
}: {
  state: LoginState;
  cursorActive: boolean;
  runRevision: number;
}) {
  return (
    <>
      <span className="unixLogLine">
        login: {state.username}
        {state.phase === "username" ? (
          <TerminalCursor active={cursorActive} revision={runRevision} />
        ) : null}
      </span>
      {state.phase !== "username" ? (
        <span className="unixLogLine">
          Password:
          {state.phase === "password" ? (
            <TerminalCursor active={cursorActive} revision={runRevision} />
          ) : null}
        </span>
      ) : null}
      {state.phase === "last-login" || state.phase === "prompt" ? (
        <span className="unixLogLine">
          Last login: Mon Jul 28 09:12:00 on tty1
        </span>
      ) : null}
      {state.phase === "prompt" ? (
        <span className="unixLogLine">
          guest@archive:~$
          <TerminalCursor active={cursorActive} revision={runRevision} />
        </span>
      ) : null}
    </>
  );
}

function BootDemo({ state }: { state: BootState }) {
  return (
    <>
      {state.lines.map((line, index) => (
        <span className="unixLogLine bootLogLine" key={`${index}-${line}`}>
          {line}
        </span>
      ))}
    </>
  );
}

function SysvinitDemo({ state }: { state: SysvState }) {
  return (
    <>
      {state.services.map((service) => (
        <span className="sysvLine" key={service.name}>
          <span>
            Starting {service.name}
            {!service.complete && state.activeService === service.name
              ? state.dots
              : null}
          </span>
          <span className="sysvStatus">
            {service.complete ? "[  OK  ]" : ""}
          </span>
        </span>
      ))}
      {state.ready ? <span className="unixLogLine">System ready.</span> : null}
    </>
  );
}

function AptDemo({ state }: { state: AptState }) {
  const phaseLabels: Record<AptState["phase"], string> = {
    fetch: "取得中: package lists",
    download: "取得中: museum-demo archive",
    unpack: "展開中: museum-demo",
    configure: "設定中: museum-demo",
    done: "処理完了",
  };

  return (
    <>
      <span className="unixLogLine aptPhase">
        {phaseLabels[state.phase]} {state.phase === "done" ? "" : state.spinner}
      </span>
      <span className="unixLogLine">
        <ProgressBar progress={state.progress} />
      </span>
      {state.phase === "download" ? (
        <span className="aptTransfer">
          <span>速度 {state.speed}</span>
          <span>残り {state.remaining}</span>
        </span>
      ) : null}
      {state.phase === "done" ? (
        <span className="unixLogLine">Done.</span>
      ) : null}
    </>
  );
}

function CompileDemo({
  state,
  cursorActive,
  runRevision,
}: {
  state: CompileState;
  cursorActive: boolean;
  runRevision: number;
}) {
  return (
    <>
      <span className="compilePhase">{state.phase}</span>
      <span className="unixLogLine">
        <ProgressBar progress={state.progress} />
      </span>
      {state.lines.map((line, index) => (
        <span className="unixLogLine" key={`${index}-${line}`}>
          {line}
          {state.phase === "done" && index === state.lines.length - 1 ? (
            <TerminalCursor active={cursorActive} revision={runRevision} />
          ) : null}
        </span>
      ))}
    </>
  );
}

function DemoDisplay({
  animationType,
  state,
  cursorActive,
  runRevision,
}: {
  animationType: TerminalAnimationType;
  state: TerminalDemoState;
  cursorActive: boolean;
  runRevision: number;
}) {
  if (animationType === "unix-login" && state.kind === "login") {
    return (
      <LoginDemo
        state={state}
        cursorActive={cursorActive}
        runRevision={runRevision}
      />
    );
  }
  if (animationType === "linux-boot" && state.kind === "boot") {
    return <BootDemo state={state} />;
  }
  if (animationType === "sysvinit" && state.kind === "sysvinit") {
    return <SysvinitDemo state={state} />;
  }
  if (animationType === "apt-progress" && state.kind === "apt") {
    return <AptDemo state={state} />;
  }
  if (animationType === "configure-make" && state.kind === "compile") {
    return (
      <CompileDemo
        state={state}
        cursorActive={cursorActive}
        runRevision={runRevision}
      />
    );
  }
  return null;
}

export function TerminalDemoPlayer({
  exhibit,
  active,
  prefersReducedMotion,
}: {
  exhibit: TerminalRoomExhibit;
  active: boolean;
  prefersReducedMotion: boolean;
}) {
  const [speed, setSpeed] = useState<DemoSpeed>("viewing");
  const screenRef = useRef<HTMLDivElement>(null);
  const steps = useMemo(
    () => getDemoSteps(exhibit.animationType),
    [exhibit.animationType],
  );
  const baseDelay =
    speed === "authentic" ? exhibit.authenticDelay : exhibit.viewingDelay;
  const demo = useTerminalSequence(
    steps,
    baseDelay,
    active,
    prefersReducedMotion,
  );
  const runLabel = demo.hasRun ? "再実行" : "実行";
  const cursorActive =
    active && demo.hasRun && !prefersReducedMotion;

  useEffect(() => {
    if (exhibit.animationType !== "linux-boot" || !screenRef.current) {
      return;
    }
    screenRef.current.scrollTop =
      demo.stepIndex === 0 ? 0 : screenRef.current.scrollHeight;
  }, [
    demo.runRevision,
    demo.stepIndex,
    exhibit.animationType,
  ]);

  return (
    <>
      <div
        ref={screenRef}
        className="unixScreen"
        data-demo={exhibit.animationType}
        role="log"
        aria-live="polite"
        aria-atomic={exhibit.animationType !== "linux-boot"}
        aria-label={`${exhibit.title}のJavaScript再構成デモ`}
      >
        <pre>
          <code>
            {demo.state ? (
              <DemoDisplay
                animationType={exhibit.animationType}
                state={demo.state}
                cursorActive={cursorActive}
                runRevision={demo.runRevision}
              />
            ) : null}
          </code>
        </pre>
      </div>
      <div className="demoControls">
        <button
          className="runDemoButton"
          type="button"
          onClick={demo.run}
          aria-label={`${exhibit.title}を${runLabel}`}
        >
          {runLabel}
        </button>
        <label className="speedControl">
          <span>速度</span>
          <select
            value={speed}
            onChange={(event) => setSpeed(event.target.value as DemoSpeed)}
            aria-label={`${exhibit.title}の再生速度`}
          >
            <option value="authentic">実機風</option>
            <option value="viewing">観賞用</option>
          </select>
        </label>
        <span className="demoState" aria-live="polite">
          {prefersReducedMotion
            ? "動きを減らす設定: 最終状態"
            : demo.isComplete
              ? "完了"
              : demo.hasRun
                ? "実行中"
                : "待機中"}
        </span>
      </div>
    </>
  );
}
