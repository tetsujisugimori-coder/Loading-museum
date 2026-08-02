"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const ARCHIVE_YEARS = [1960, 1984, 1995, 2007, 2026] as const;
export const TITLE_SEQUENCE_STORAGE_KEY = "digital-motion-archive-title-seen-v1";

const TITLE_FIRST_LINE = "DIGITAL MOTION";
const TITLE_SECOND_LINE = "ARCHIVE";
const TITLE = `${TITLE_FIRST_LINE} ${TITLE_SECOND_LINE}`;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const LOADING_DURATION = 650;
const YEAR_DURATION = 160;
const CHARACTER_DURATION = 45;

type SequencePhase = "loading" | "years" | "typing" | "complete";

type SequenceState = {
  phase: SequencePhase;
  yearIndex: number;
  characterCount: number;
  runId: number;
};

const initialSequence: SequenceState = {
  phase: "loading",
  yearIndex: 0,
  characterCount: 0,
  runId: 0,
};

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

function completedSequence(runId: number): SequenceState {
  return {
    phase: "complete",
    yearIndex: ARCHIVE_YEARS.length - 1,
    characterCount: TITLE.length,
    runId,
  };
}

function nextSequenceState(current: SequenceState): SequenceState {
  if (current.phase === "loading") {
    return { ...current, phase: "years", yearIndex: 0 };
  }

  if (current.phase === "years") {
    if (current.yearIndex < ARCHIVE_YEARS.length - 1) {
      return { ...current, yearIndex: current.yearIndex + 1 };
    }
    return { ...current, phase: "typing", characterCount: 0 };
  }

  if (current.phase === "typing") {
    if (current.characterCount < TITLE.length) {
      return { ...current, characterCount: current.characterCount + 1 };
    }
    return completedSequence(current.runId);
  }

  return current;
}

function phaseDelay(sequence: SequenceState) {
  if (sequence.phase === "loading") return LOADING_DURATION;
  if (sequence.phase === "years") return YEAR_DURATION;
  if (sequence.phase === "typing") return CHARACTER_DURATION;
  return null;
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

export function MuseumTitleSequence() {
  const [sequence, setSequence] = useState<SequenceState>(initialSequence);
  const reducedMotionRef = useRef(false);

  const replay = useCallback(() => {
    setSequence((current) => {
      if (reducedMotionRef.current) return completedSequence(current.runId + 1);
      return { ...initialSequence, runId: current.runId + 1 };
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let initializationTimeoutId: number | undefined;
    reducedMotionRef.current = mediaQuery.matches;

    if (mediaQuery.matches || sessionHasSeenSequence()) {
      initializationTimeoutId = window.setTimeout(() => {
        setSequence((current) => completedSequence(current.runId));
      }, 0);
    } else {
      rememberSequence();
    }

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      if (event.matches) {
        setSequence((current) => completedSequence(current.runId));
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
    const delay = phaseDelay(sequence);
    if (delay === null || reducedMotionRef.current) return;

    const timeoutId = window.setTimeout(() => {
      setSequence((current) => (
        current.runId === sequence.runId ? nextSequenceState(current) : current
      ));
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [sequence]);

  const isComplete = sequence.phase === "complete";

  return (
    <div className="museumTitleSequence" data-phase={sequence.phase}>
      <p className="eyebrow">Digital motion archive / permanent collection</p>
      <div className="museumTitleStage">
        <h1 className="museumTitleHeading">
          <span className="visuallyHidden">{TITLE}</span>
          <span className="museumTitleReducedFallback" aria-hidden="true">
            <span className="museumTitleText">
              <span className="museumTitleSegment">{TITLE_FIRST_LINE}</span>
              <span className="museumTitleSegment">
                {TITLE_SECOND_LINE}<span className="museumTitleCursor museumTitleCursorBlink" />
              </span>
            </span>
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
              <span className="museumTitleChronology">
                <span className="museumTitleChronologyLabel">ARCHIVE YEAR</span>
                <span className="museumTitleYear">{ARCHIVE_YEARS[sequence.yearIndex]}</span>
                <span className="museumTitleYearProgress">
                  {String(sequence.yearIndex + 1).padStart(2, "0")} / {String(ARCHIVE_YEARS.length).padStart(2, "0")}
                </span>
              </span>
            ) : null}
            {sequence.phase === "typing" ? (
              <TypedTitle characterCount={sequence.characterCount} />
            ) : null}
            {isComplete ? (
              <span className="museumTitleText">
                <span className="museumTitleSegment">{TITLE_FIRST_LINE}</span>
                <span className="museumTitleSegment">
                  {TITLE_SECOND_LINE}
                  <span className="museumTitleCursor museumTitleCursorBlink" />
                </span>
              </span>
            ) : null}
          </span>
        </h1>
      </div>
      <div className="museumTitleSupport" data-visible={isComplete}>
        <p className="subtitle">ローディング、カーソル、UIアニメーションの歴史と再現</p>
        <button className="museumTitleReplay" type="button" onClick={replay}>
          <span aria-hidden="true">↻</span> Replay
        </button>
      </div>
    </div>
  );
}
