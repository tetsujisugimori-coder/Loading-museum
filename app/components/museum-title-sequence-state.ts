export type ArchiveEra = {
  year: number;
  theme: string;
};

export const ARCHIVE_ERAS = [
  { year: 1960, theme: "MAINFRAME" },
  { year: 1984, theme: "GUI" },
  { year: 1995, theme: "WEB" },
  { year: 2007, theme: "TOUCH" },
  { year: 2026, theme: "GENERATIVE UI" },
] as const satisfies readonly ArchiveEra[];

export const TITLE_FIRST_LINE = "DIGITAL MOTION";
export const TITLE_SECOND_LINE = "ARCHIVE";
export const TITLE = `${TITLE_FIRST_LINE} ${TITLE_SECOND_LINE}`;

export const SEQUENCE_DELAYS = {
  loading: 650,
  era: 190,
  character: 45,
  signalBrighten: 160,
  signalNoise: 200,
} as const;

export type SignalLockStep = "brighten" | "noise";
export type SequencePhase = "loading" | "years" | "typing" | "signal-lock" | "complete";

export type SequenceState = {
  phase: SequencePhase;
  eraIndex: number;
  characterCount: number;
  signalLockStep: SignalLockStep | null;
  runId: number;
};

export function createInitialSequence(runId = 0): SequenceState {
  return {
    phase: "loading",
    eraIndex: 0,
    characterCount: 0,
    signalLockStep: null,
    runId,
  };
}

export function createCompletedSequence(runId: number): SequenceState {
  return {
    phase: "complete",
    eraIndex: ARCHIVE_ERAS.length - 1,
    characterCount: TITLE.length,
    signalLockStep: null,
    runId,
  };
}

export function createReducedMotionSequence(runId: number): SequenceState {
  return createCompletedSequence(runId);
}

export function createReplaySequence(current: SequenceState): SequenceState {
  return createInitialSequence(current.runId + 1);
}

export function nextSequenceState(current: SequenceState): SequenceState {
  if (current.phase === "loading") {
    return { ...current, phase: "years", eraIndex: 0 };
  }

  if (current.phase === "years") {
    if (current.eraIndex < ARCHIVE_ERAS.length - 1) {
      return { ...current, eraIndex: current.eraIndex + 1 };
    }
    return { ...current, phase: "typing", characterCount: 0 };
  }

  if (current.phase === "typing") {
    if (current.characterCount < TITLE.length - 1) {
      return { ...current, characterCount: current.characterCount + 1 };
    }
    return {
      ...current,
      phase: "signal-lock",
      characterCount: TITLE.length,
      signalLockStep: "brighten",
    };
  }

  if (current.phase === "signal-lock") {
    if (current.signalLockStep === "brighten") {
      return { ...current, signalLockStep: "noise" };
    }
    return createCompletedSequence(current.runId);
  }

  return current;
}

export function getSequenceDelay(sequence: SequenceState): number | null {
  if (sequence.phase === "loading") return SEQUENCE_DELAYS.loading;
  if (sequence.phase === "years") return SEQUENCE_DELAYS.era;
  if (sequence.phase === "typing") return SEQUENCE_DELAYS.character;
  if (sequence.phase === "signal-lock") {
    return sequence.signalLockStep === "brighten"
      ? SEQUENCE_DELAYS.signalBrighten
      : SEQUENCE_DELAYS.signalNoise;
  }
  return null;
}

export function advanceSequenceForRun(
  current: SequenceState,
  scheduledRunId: number,
): SequenceState {
  return current.runId === scheduledRunId ? nextSequenceState(current) : current;
}
