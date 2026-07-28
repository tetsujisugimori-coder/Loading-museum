"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AnimationType,
  DosRoomExhibit,
  ExhibitRoom,
  TerminalRoomExhibit,
} from "../data/exhibitRooms";
import {
  VANISHED_LOADING_CATEGORIES,
  type VanishedOsExhibit,
} from "../data/vanishedOperatingSystems";
import { TerminalDemoPlayer } from "./TerminalDemoPlayer";
import { VanishedOsPlayer } from "./VanishedOsPlayer";

const SPINNER_FRAMES = ["-", "\\", "|", "/"] as const;
const DOT_FRAMES = ["Loading", "Loading.", "Loading..", "Loading..."] as const;
const PROGRESS_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
const LOG_STEPS = [1, 2, 3] as const;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const LOG_LINES: Record<
  Extract<
    AnimationType,
    "copy-log" | "extract-log" | "compile-log" | "disk-check-log"
  >,
  readonly string[]
> = {
  "copy-log": [
    "Copying FILE01.TXT",
    "Copying FILE02.TXT",
    "Copy complete.",
  ],
  "extract-log": [
    "Extracting README.TXT",
    "Extracting PROGRAM.EXE",
    "Done.",
  ],
  "compile-log": [
    "Compiling...",
    "Linking...",
    "Build successful.",
  ],
  "disk-check-log": [
    "Checking drive C:",
    "Scanning directories...",
    "No errors found.",
  ],
};

function useSequencedValue<T>(
  values: readonly T[],
  delay: number,
  enabled: boolean,
) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled || values.length < 2) {
      return;
    }

    const timerId = window.setInterval(() => {
      setIndex((current) => (current + 1) % values.length);
    }, delay);

    return () => window.clearInterval(timerId);
  }, [delay, enabled, values.length]);

  return values[index % values.length];
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function renderTextProgress(progress: number) {
  const filled = Math.round(progress / 10);
  return `[${"#".repeat(filled)}${"-".repeat(10 - filled)}] ${progress}%`;
}

function DosLogAnimation({
  lines,
  active,
}: {
  lines: readonly string[];
  active: boolean;
}) {
  const visibleCount = useSequencedValue(LOG_STEPS, 900, active);
  const visibleLines = lines.slice(0, visibleCount);

  return (
    <div className="dosLog" aria-hidden="true">
      {visibleLines.map((line) => (
        <span className="dosLogLine" key={line}>
          {line}
        </span>
      ))}
    </div>
  );
}

function SpinnerAnimation({ active }: { active: boolean }) {
  const frame = useSequencedValue(SPINNER_FRAMES, 180, active);
  return <span aria-hidden="true">{frame}</span>;
}

function DotsAnimation({ active }: { active: boolean }) {
  const text = useSequencedValue(DOT_FRAMES, 420, active);
  return <span aria-hidden="true">{text}</span>;
}

function TextProgressAnimation({ active }: { active: boolean }) {
  const progress = useSequencedValue(PROGRESS_VALUES, 520, active);
  const text = renderTextProgress(progress);
  return <span aria-hidden="true">{text}</span>;
}

function DosAnimation({
  animationType,
  active,
}: {
  animationType: AnimationType;
  active: boolean;
}) {
  if (animationType === "spinner") {
    return <SpinnerAnimation active={active} />;
  }

  if (animationType === "dots") {
    return <DotsAnimation active={active} />;
  }

  if (animationType === "blink") {
    return (
      <span className="dosBlink" data-active={active} aria-hidden="true">
        Please wait...
      </span>
    );
  }

  if (animationType === "text-progress") {
    return <TextProgressAnimation active={active} />;
  }

  return <DosLogAnimation lines={LOG_LINES[animationType]} active={active} />;
}

function DosExhibitCard({
  exhibit,
  active,
}: {
  exhibit: DosRoomExhibit;
  active: boolean;
}) {
  return (
    <article className="dosExhibit">
      <div className="dosExhibitTopline">
        <span>COMMAND DISPLAY</span>
        <span>{exhibit.codeLanguage}</span>
      </div>
      <h3>{exhibit.title}</h3>
      <div
        className="dosScreen"
        role="img"
        aria-label={`${exhibit.title}: ${exhibit.explanation}`}
      >
        <span className="dosPrompt" aria-hidden="true">
          C:&gt;
        </span>
        <DosAnimation animationType={exhibit.animationType} active={active} />
      </div>
      <dl className="dosFacts">
        <div>
          <dt>主な使用場面</dt>
          <dd>{exhibit.usage}</dd>
        </div>
        <div>
          <dt>分類</dt>
          <dd>
            <span className="classificationLabel">{exhibit.classification}</span>
          </dd>
        </div>
      </dl>
      <p className="dosExplanation">{exhibit.explanation}</p>
      <p className="implementationNote">
        <strong>実装コメント</strong>
        {exhibit.implementationNote}
      </p>
      <details className="codeDisclosure">
        <summary>再現方法を見る</summary>
        <pre>
          <code>{exhibit.codeExample}</code>
        </pre>
      </details>
    </article>
  );
}

function TerminalExhibitCard({
  exhibit,
  active,
  prefersReducedMotion,
}: {
  exhibit: TerminalRoomExhibit;
  active: boolean;
  prefersReducedMotion: boolean;
}) {
  return (
    <article className="unixExhibit">
      <div className="unixExhibitTopline">
        <span>TERMINAL DEMO</span>
        <span>{exhibit.animationType.toUpperCase()}</span>
      </div>
      <h3>{exhibit.title}</h3>
      <dl className="unixFacts">
        <div>
          <dt>主な年代</dt>
          <dd>{exhibit.period}</dd>
        </div>
        <div>
          <dt>系統・代表的な環境</dt>
          <dd>{exhibit.environment}</dd>
        </div>
      </dl>
      <p className="unixExplanation">{exhibit.explanation}</p>
      <TerminalDemoPlayer
        exhibit={exhibit}
        active={active}
        prefersReducedMotion={prefersReducedMotion}
      />
      <p className="reconstructionLabel">JavaScriptで再構成したデモ</p>
      <p className="implementationNote">
        <strong>実装コメント</strong>
        {exhibit.implementationNote}
      </p>
      <details className="codeDisclosure">
        <summary>再現方法を見る</summary>
        <pre>
          <code>{exhibit.codeExample}</code>
        </pre>
      </details>
    </article>
  );
}

function VanishedOsExhibitCard({
  exhibit,
  active,
  prefersReducedMotion,
}: {
  exhibit: VanishedOsExhibit;
  active: boolean;
  prefersReducedMotion: boolean;
}) {
  const groupedLoadingExhibits = VANISHED_LOADING_CATEGORIES.map(
    (category) => ({
      category,
      demos: exhibit.loadingExhibits.filter(
        (demo) => demo.category === category,
      ),
    }),
  ).filter(({ demos }) => demos.length > 0);

  return (
    <article className="vanishedOsExhibit">
      <div className="vanishedOsTopline">
        <span>RETIRED SYSTEM / RECONSTRUCTED</span>
        <span>{exhibit.introduced}</span>
      </div>
      <div className="vanishedOsHeading">
        <h3>{exhibit.title}</h3>
        <span>{exhibit.loadingExhibits.length} LOADING STUDIES</span>
      </div>
      <p className="vanishedOsLead">{exhibit.waitingStyle}</p>
      <details className="vanishedOsContext">
        <summary>OSの背景を見る</summary>
        <dl className="vanishedOsFacts">
          <div>
            <dt>登場時期</dt>
            <dd>{exhibit.introduced}</dd>
          </div>
          <div>
            <dt>主な対象端末・ハードウェア</dt>
            <dd>{exhibit.hardware}</dd>
          </div>
          <div>
            <dt>起動・待機画面の特徴</dt>
            <dd>{exhibit.bootCharacteristics}</dd>
          </div>
          <div>
            <dt>その後どうなったか</dt>
            <dd>{exhibit.aftermath}</dd>
          </div>
          <div>
            <dt>後世に残した思想・技術</dt>
            <dd>{exhibit.legacy}</dd>
          </div>
        </dl>
      </details>
      <div className="vanishedLoadingGroups">
        {groupedLoadingExhibits.map(({ category, demos }) => (
          <section
            className="vanishedLoadingGroup"
            aria-labelledby={`${exhibit.exhibitId}-${category}`}
            key={category}
          >
            <h4 id={`${exhibit.exhibitId}-${category}`}>{category}</h4>
            <div className="vanishedLoadingGrid">
              {demos.map((demo) => (
                <article className="vanishedLoadingExhibit" key={demo.demoId}>
                  <div className="vanishedLoadingTopline">
                    <span>{exhibit.title}</span>
                    <span>{demo.era}</span>
                  </div>
                  <h5>{demo.title}</h5>
                  <dl className="vanishedLoadingFacts">
                    <div>
                      <dt>使われた場面</dt>
                      <dd>{demo.context}</dd>
                    </div>
                    <div>
                      <dt>動きの特徴</dt>
                      <dd>{demo.motion}</dd>
                    </div>
                  </dl>
                  <VanishedOsPlayer
                    demo={demo}
                    osTitle={exhibit.title}
                    active={active}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                  <div className="vanishedEvidence">
                    <p>
                      <strong>史実として確認</strong>
                      {demo.historicalBasis}
                    </p>
                    <p>
                      <strong>演出上の補完</strong>
                      {demo.reconstructionNote}
                    </p>
                  </div>
                  <p className="reconstructionLabel">
                    JavaScriptとCSSによる教育・研究目的の歴史的表現の再構成（非公式）
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export function ExhibitRoomAccordion({ room }: { room: ExhibitRoom }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = `${room.roomId}-panel`;
  const toggleId = `${room.roomId}-toggle`;
  const roomClassName =
    room.theme === "unix"
      ? "roomCard roomCardUnix"
      : room.theme === "vanished"
        ? "roomCard roomCardVanished"
        : "roomCard";
  const gridClassName =
    room.theme === "unix"
      ? "unixExhibitGrid"
      : room.theme === "vanished"
        ? "vanishedOsGrid"
        : "dosExhibitGrid";
  const runtimeActive = isOpen && isPageVisible;
  const animationsActive =
    runtimeActive && !prefersReducedMotion;

  useEffect(() => {
    const updatePageVisibility = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    updatePageVisibility();
    document.addEventListener("visibilitychange", updatePageVisibility);

    return () => {
      document.removeEventListener("visibilitychange", updatePageVisibility);
    };
  }, []);

  const closeRoom = () => {
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <article className={roomClassName}>
      <button
        ref={toggleRef}
        id={toggleId}
        className="roomToggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="roomIndex">ROOM / {room.roomId.toUpperCase()}</span>
        <span className="roomTitle">{room.roomTitle}</span>
        <span className="roomDescription">{room.description}</span>
        <span className="roomMeta">
          <span>{room.period}</span>
          <span>{room.exhibits.length} EXHIBITS</span>
        </span>
        <span className="roomArrow" aria-hidden="true">
          ↓
        </span>
      </button>

      <div
        id={panelId}
        className="roomPanel"
        data-open={isOpen}
        role="region"
        aria-labelledby={toggleId}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="roomPanelInner">
          <div className={gridClassName}>
            {room.exhibits.map((exhibit) =>
              exhibit.kind === "terminal" ? (
                <TerminalExhibitCard
                  key={exhibit.exhibitId}
                  exhibit={exhibit}
                  active={runtimeActive}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ) : exhibit.kind === "vanished-os" ? (
                <VanishedOsExhibitCard
                  key={exhibit.exhibitId}
                  exhibit={exhibit}
                  active={runtimeActive}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ) : (
                <DosExhibitCard
                  key={exhibit.exhibitId}
                  exhibit={exhibit}
                  active={animationsActive}
                />
              )
            )}
          </div>
          <div className="roomCloseRow">
            <button className="roomCloseButton" type="button" onClick={closeRoom}>
              展示室を閉じる
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
