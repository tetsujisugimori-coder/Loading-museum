"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceSequenceForRun,
  ARCHIVE_ERAS,
  createCompletedSequence,
  createInitialSequence,
  createReducedMotionSequence,
  createReplaySequence,
  getCompletedEraCount,
  getTimelineNodeState,
  getSequenceDelay,
  TITLE,
  TITLE_FIRST_LINE,
  TITLE_SECOND_LINE,
  type SequenceState,
} from "./museum-title-sequence-state";

export const TITLE_SEQUENCE_STORAGE_KEY = "digital-motion-archive-title-seen-v1";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function sessionHasSeenSequence() {
  try {
    return window.sessionStorage.getItem(TITLE_SEQUENCE_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function rememberSequence() {
  try {
    window.sessionStorage.setItem(TITLE_SEQUENCE_STORAGE_KEY, "seen");
  } catch {
    // Storage can be unavailable in restricted browsing contexts. The sequence still works.
  }
}

function TypedTitle({ characterCount }: { characterCount: number }) {
  const firstLine = TITLE_FIRST_LINE.slice(0, Math.min(characterCount, TITLE_FIRST_LINE.length));
  const secondLineCount = Math.max(0, characterCount - TITLE_FIRST_LINE.length - 1);
  const secondLine = TITLE_SECOND_LINE.slice(0, secondLineCount);
  const cursorOnFirstLine = characterCount <= TITLE_FIRST_LINE.length;

  return (
    <span className="museumTitleText">
      <span className="museumTitleSegment">
        {firstLine}
        {cursorOnFirstLine ? <span className="museumTitleCursor" /> : null}
      </span>
      <span className="museumTitleSegment">
        {secondLine}
        {!cursorOnFirstLine ? <span className="museumTitleCursor" /> : null}
      </span>
    </span>
  );
}

function CompletedTitle({ blinkingCursor }: { blinkingCursor: boolean }) {
  return (
    <span className="museumTitleText">
      <span className="museumTitleSegment">{TITLE_FIRST_LINE}</span>
      <span className="museumTitleSegment">
        {TITLE_SECOND_LINE}
        <span className={blinkingCursor ? "museumTitleCursor museumTitleCursorBlink" : "museumTitleCursor"} />
      </span>
    </span>
  );
}

function ArchiveTimeline({ sequence }: { sequence: SequenceState }) {
  return (
    <span className="museumTitleTimeline" data-completed={getCompletedEraCount(sequence)}>
      {ARCHIVE_ERAS.map((era, index) => (
        <span
          className="museumTitleTimelineNode"
          data-state={getTimelineNodeState(index, sequence)}
          key={era.year}
        >
          <span className="museumTitleTimelineDot" />
          <span className="museumTitleTimelineYear">{era.year}</span>
        </span>
      ))}
    </span>
  );
}

export function MuseumTitleSequence() {
  const [sequence, setSequence] = useState(createInitialSequence);
  const reducedMotionRef = useRef(false);

  const replay = useCallback(() => {
    setSequence((current) => {
      if (reducedMotionRef.current) return createReducedMotionSequence(current.runId + 1);
      return createReplaySequence(current);
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let initializationTimeoutId: number | undefined;
    reducedMotionRef.current = mediaQuery.matches;

    if (mediaQuery.matches || sessionHasSeenSequence()) {
      initializationTimeoutId = window.setTimeout(() => {
        setSequence((current) => (
          mediaQuery.matches
            ? createReducedMotionSequence(current.runId)
            : createCompletedSequence(current.runId)
        ));
      }, 0);
    }

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      if (event.matches) {
        setSequence((current) => createReducedMotionSequence(current.runId));
      }
    };

    mediaQuery.addEventListener("change", handleMotionPreference);
    return () => {
      if (initializationTimeoutId !== undefined) {
        window.clearTimeout(initializationTimeoutId);
      }
      mediaQuery.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    const delay = getSequenceDelay(sequence);
    if (delay === null || reducedMotionRef.current) return;

    const timeoutId = window.setTimeout(() => {
      setSequence((current) => advanceSequenceForRun(current, sequence.runId));
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [sequence]);

  useEffect(() => {
    if (sequence.phase !== "complete") return;
    rememberSequence();
  }, [sequence.phase]);

  const isComplete = sequence.phase === "complete";
  const isSignalLock = sequence.phase === "signal-lock";
  const currentEra = ARCHIVE_ERAS[sequence.eraIndex];

  return (
    <div
      className="museumTitleSequence"
      data-phase={sequence.phase}
      data-signal-step={sequence.signalLockStep ?? undefined}
    >
      <p className="eyebrow">Digital motion archive / permanent collection</p>
      <div className="museumTitleStage">
        <h1 className="museumTitleHeading">
          <span className="visuallyHidden">{TITLE}</span>
          <span className="museumTitleReducedFallback" aria-hidden="true">
            <CompletedTitle blinkingCursor />
          </span>
          <span className="museumTitleAnimated" aria-hidden="true">
            {sequence.phase === "loading" ? (
              <span className="museumTitleSystemLine">
                <span>LOADING</span>
                <span className="museumTitleLoadingDots">...</span>
                <span className="museumTitleLoadingBar">[■■■■■]</span>
              </span>
            ) : null}
            {sequence.phase === "years" ? (
              <span className="museumTitleEraScan">
                <span className="museumTitleChronology">
                  <span className="museumTitleChronologyLabel">ARCHIVE YEAR</span>
                  <span className="museumTitleYear">{currentEra.year}</span>
                  <span className="museumTitleEraTheme">{currentEra.theme}</span>
                  <span className="museumTitleYearProgress">
                    {String(sequence.eraIndex + 1).padStart(2, "0")} / {String(ARCHIVE_ERAS.length).padStart(2, "0")}
                  </span>
                </span>
                <ArchiveTimeline sequence={sequence} />
              </span>
            ) : null}
            {sequence.phase === "index-complete" ? (
              <span className="museumTitleIndexComplete">
                <span className="museumTitleSystemMessage">ARCHIVE INDEX COMPLETE</span>
                <ArchiveTimeline sequence={sequence} />
              </span>
            ) : null}
            {sequence.phase === "typing" || sequence.phase === "typing-hold" ? (
              <TypedTitle characterCount={sequence.characterCount} />
            ) : null}
            {isSignalLock ? (
              <span className="museumTitleSignalFrame" data-signal-step={sequence.signalLockStep}>
                <CompletedTitle blinkingCursor={false} />
                <span className="museumTitleSignalNoise" aria-hidden="true" />
                {sequence.signalLockStep === "locked" ? (
                  <span className="museumTitleSignalStatus">SIGNAL LOCKED</span>
                ) : null}
              </span>
            ) : null}
            {isComplete ? (
              <CompletedTitle blinkingCursor />
            ) : null}
          </span>
        </h1>
      </div>
      <div className="museumTitleSupport" data-visible={isComplete}>
        <p className="subtitle">ローディング、カーソル、UIアニメーションの歴史と再現</p>
        <button className="museumTitleReplay" type="button" onClick={replay}>
          <span aria-hidden="true">↻</span> RUN INTRO AGAIN
        </button>
      </div>
    </div>
  );
}
