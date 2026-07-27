"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AnimationType,
  ExhibitRoom,
  RoomExhibit,
} from "../data/exhibitRooms";

const SPINNER_FRAMES = ["-", "\\", "|", "/"] as const;
const DOT_FRAMES = ["Loading", "Loading.", "Loading..", "Loading..."] as const;
const PROGRESS_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
const LOG_STEPS = [1, 2, 3] as const;

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

function RoomExhibitCard({
  exhibit,
  active,
}: {
  exhibit: RoomExhibit;
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

export function ExhibitRoomAccordion({ room }: { room: ExhibitRoom }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = `${room.roomId}-panel`;
  const toggleId = `${room.roomId}-toggle`;
  const animationsActive = isOpen && isPageVisible;

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
    <article className="roomCard">
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
          <div className="dosExhibitGrid">
            {room.exhibits.map((exhibit) => (
              <RoomExhibitCard
                key={exhibit.exhibitId}
                exhibit={exhibit}
                active={animationsActive}
              />
            ))}
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
