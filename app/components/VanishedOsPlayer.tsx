"use client";

import { useEffect, useState } from "react";
import type {
  VanishedOsExhibit,
  VanishedOsVisualType,
} from "../data/vanishedOperatingSystems";

type BootPhase = "idle" | "booting" | "complete" | "stopped";

const BE_BOOT_SYMBOLS = ["CPU", "RAM", "BUS", "DISK", "DESK"] as const;
const NEXT_BOOT_LINES = [
  "Testing workstation memory",
  "Starting object services",
  "Mounting workspace",
  "Loading interface",
] as const;
const PALM_APPS = ["DATE", "ADDR", "MEMO", "TODO"] as const;
const WEBOS_CARDS = ["MAIL", "WEB", "PHOTO"] as const;
const PHONE_TILES = ["CALL", "PEOPLE", "MAIL", "PHOTO", "MUSIC", "WEB"] as const;

function useBootSimulation(
  totalSteps: number,
  delay: number,
  active: boolean,
  prefersReducedMotion: boolean,
) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<BootPhase>("idle");
  const [runRevision, setRunRevision] = useState(0);

  useEffect(() => {
    if (
      !active ||
      prefersReducedMotion ||
      phase !== "booting" ||
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
    setPhase(prefersReducedMotion ? "complete" : "booting");
    setRunRevision((current) => current + 1);
  };

  const stop = () => {
    if (phase === "booting") {
      setPhase("stopped");
    }
  };
  const simplified = prefersReducedMotion && phase === "booting";

  return {
    phase: simplified ? "complete" : phase,
    run,
    runRevision,
    step: simplified ? totalSteps : step,
    stop,
  };
}

function ClassicMacVisual({
  complete,
  progress,
}: {
  complete: boolean;
  progress: number;
}) {
  return complete ? (
    <div className="classicDesktop">
      <div className="classicMenu">
        <span>FILE</span>
        <span>VIEW</span>
        <span>HELP</span>
      </div>
      <div className="classicWindow">
        <span className="classicWindowTitle">Welcome</span>
        <span className="classicDocument" />
      </div>
    </div>
  ) : (
    <div className="classicBoot">
      <div className="friendlyComputer">
        <span className="friendlyScreen">:)</span>
      </div>
      <span>Starting personal workspace</span>
      <div className="vanishedProgress">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function BeOsVisual({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  return complete ? (
    <div className="beDesktop">
      <div className="beDeskbar">
        <span />
        <span />
        <span />
      </div>
      <div className="beWindow">
        <span>MEDIA WORKSPACE</span>
      </div>
    </div>
  ) : (
    <div className="beBoot">
      <span className="beBootLabel">BOOT SEQUENCE</span>
      <div className="beSymbols">
        {BE_BOOT_SYMBOLS.map((symbol, index) => (
          <span
            className="beSymbol"
            data-lit={step > index}
            key={symbol}
          >
            {symbol}
          </span>
        ))}
      </div>
    </div>
  );
}

function NextstepVisual({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  return (
    <div className="nextBoot">
      <div className="nextCube" aria-hidden="true">
        <span>N</span>
      </div>
      {complete ? (
        <div className="nextWorkspace">
          <div className="nextDock">
            <span />
            <span />
            <span />
          </div>
          <div className="nextWindow">WORKSPACE READY</div>
        </div>
      ) : (
        <div className="nextLines">
          {NEXT_BOOT_LINES.slice(0, Math.max(step, 1)).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PalmOsVisual({
  complete,
  progress,
}: {
  complete: boolean;
  progress: number;
}) {
  return (
    <div className="palmDevice">
      <div className="palmScreen">
        {complete ? (
          <div className="palmApps">
            {PALM_APPS.map((app) => (
              <span key={app}>{app}</span>
            ))}
          </div>
        ) : (
          <div className="palmBoot">
            <strong>HANDHELD OS</strong>
            <span>INITIALIZING</span>
            <div className="palmProgress">
              {Array.from({ length: 6 }, (_, index) => (
                <i data-on={progress > index * 16} key={index} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="palmKeys">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function WebOsVisual({
  complete,
  step,
  running,
}: {
  complete: boolean;
  step: number;
  running: boolean;
}) {
  return (
    <div className="webosPhone">
      <div className="webosScreen">
        {complete ? (
          <div className="webosCards">
            {WEBOS_CARDS.map((card, index) => (
              <span
                className="webosCard"
                style={{ transform: `translateX(${index * 18}px)` }}
                key={card}
              >
                {card}
              </span>
            ))}
          </div>
        ) : (
          <div className="webosBoot">
            <span className="webosPulse" data-running={running} />
            <span>mobile workspace</span>
            <div className="webosDots">
              {Array.from({ length: 4 }, (_, index) => (
                <i data-on={step > index} key={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WindowsPhoneVisual({
  complete,
  step,
}: {
  complete: boolean;
  step: number;
}) {
  const visibleTiles = complete ? PHONE_TILES.length : Math.max(step - 1, 0);

  return (
    <div className="phoneFrame">
      <div className="phoneScreen">
        <span className="phoneHeading">
          {complete ? "START" : "LOADING"}
        </span>
        <div className="phoneTiles">
          {PHONE_TILES.map((tile, index) => (
            <span
              className="phoneTile"
              data-visible={visibleTiles > index}
              key={tile}
            >
              {tile}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function VanishedOsVisual({
  visualType,
  complete,
  progress,
  step,
  running,
}: {
  visualType: VanishedOsVisualType;
  complete: boolean;
  progress: number;
  step: number;
  running: boolean;
}) {
  switch (visualType) {
    case "classic-mac":
      return <ClassicMacVisual complete={complete} progress={progress} />;
    case "beos":
      return <BeOsVisual complete={complete} step={step} />;
    case "nextstep":
      return <NextstepVisual complete={complete} step={step} />;
    case "palm-os":
      return <PalmOsVisual complete={complete} progress={progress} />;
    case "webos":
      return (
        <WebOsVisual complete={complete} step={step} running={running} />
      );
    case "windows-phone":
      return <WindowsPhoneVisual complete={complete} step={step} />;
  }
}

export function VanishedOsPlayer({
  exhibit,
  active,
  prefersReducedMotion,
}: {
  exhibit: VanishedOsExhibit;
  active: boolean;
  prefersReducedMotion: boolean;
}) {
  const simulation = useBootSimulation(
    exhibit.bootSteps,
    exhibit.stepDelay,
    active,
    prefersReducedMotion,
  );
  const complete = simulation.phase === "complete";
  const running = active && simulation.phase === "booting";
  const progress = Math.round(
    (simulation.step / exhibit.bootSteps) * 100,
  );
  const runLabel =
    simulation.phase === "idle" ? "起動する" : "再実行";
  const stateLabel = prefersReducedMotion
    ? complete
      ? "簡略表示で起動完了"
      : "動きを減らす設定"
    : simulation.phase === "booting"
      ? "起動中"
      : simulation.phase === "complete"
        ? "起動完了"
        : simulation.phase === "stopped"
          ? "停止中"
          : "待機中";

  return (
    <>
      <div
        className="vanishedOsScreen"
        data-os={exhibit.visualType}
        data-phase={simulation.phase}
        data-running={running}
        role="img"
        aria-label={`${exhibit.title}を連想させるJavaScriptとCSSの起動再現。状態: ${stateLabel}`}
      >
        <VanishedOsVisual
          visualType={exhibit.visualType}
          complete={complete}
          progress={progress}
          step={simulation.step}
          running={running}
        />
      </div>
      <div className="vanishedOsControls">
        <button
          className="bootOsButton"
          type="button"
          onClick={simulation.run}
          disabled={simulation.phase === "booting"}
          aria-label={`${exhibit.title}を${runLabel}`}
        >
          {runLabel}
        </button>
        <button
          className="stopOsButton"
          type="button"
          onClick={simulation.stop}
          disabled={simulation.phase !== "booting"}
          aria-label={`${exhibit.title}の起動再現を停止`}
        >
          停止
        </button>
        <span className="vanishedOsState" aria-live="polite">
          {stateLabel}
        </span>
      </div>
      <p className="reconstructionLabel">
        JavaScriptとCSSによる再現展示
      </p>
    </>
  );
}
