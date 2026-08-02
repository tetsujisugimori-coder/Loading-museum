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
  era: 230,
  lastEra: 400,
  indexComplete: 200,
  character: 40,
  typingHold: 80,
  signalBrighten: 150,
  signalNoise: 200,
  signalLocked: 180,
} as const;

export type SignalLockStep = "brighten" | "noise" | "locked";
export type SequencePhase =
  | "loading"
  | "years"
  | "index-complete"
  | "typing"
  | "typing-hold"
  | "signal-lock"
  | "complete";

export type SequenceState = {
  phase: SequencePhase;
  eraIndex: number;
  characterCount: number;
  signalLockStep: SignalLockStep | null;
  runId: number;
};

export type TimelineNodeState = "complete" | "current" | "pending";

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

export function isLastEra(sequence: SequenceState): boolean {
  return sequence.eraIndex === ARCHIVE_ERAS.length - 1;
}

export function getCompletedEraCount(sequence: SequenceState): number {
  if (sequence.phase === "loading") return 0;
  if (sequence.phase === "years") return sequence.eraIndex + 1;
  return ARCHIVE_ERAS.length;
}

export function getTimelineNodeState(
  nodeIndex: number,
  sequence: SequenceState,
): TimelineNodeState {
  if (sequence.phase === "years" && nodeIndex === sequence.eraIndex) return "current";
  if (nodeIndex < getCompletedEraCount(sequence)) return "complete";
  return "pending";
}

export function nextSequenceState(current: SequenceState): SequenceState {
  if (current.phase === "loading") {
    return { ...current, phase: "years", eraIndex: 0 };
  }

  if (current.phase === "years") {
    if (!isLastEra(current)) {
      return { ...current, eraIndex: current.eraIndex + 1 };
    }
    return { ...current, phase: "index-complete" };
  }

  if (current.phase === "index-complete") {
    return { ...current, phase: "typing", characterCount: 0 };
  }

  if (current.phase === "typing") {
    if (current.characterCount < TITLE.length) {
      return { ...current, characterCount: current.characterCount + 1 };
    }
    return { ...current, phase: "typing-hold" };
  }

  if (current.phase === "typing-hold") {
    return {
      ...current,
      phase: "signal-lock",
      signalLockStep: "brighten",
    };
  }

  if (current.phase === "signal-lock") {
    if (current.signalLockStep === "brighten") {
      return { ...current, signalLockStep: "noise" };
    }
    if (current.signalLockStep === "noise") {
      return { ...current, signalLockStep: "locked" };
    }
    return createCompletedSequence(current.runId);
  }

  return current;
}

export function getSequenceDelay(sequence: SequenceState): number | null {
  if (sequence.phase === "loading") return SEQUENCE_DELAYS.loading;
  if (sequence.phase === "years") {
    return isLastEra(sequence) ? SEQUENCE_DELAYS.lastEra : SEQUENCE_DELAYS.era;
  }
  if (sequence.phase === "index-complete") return SEQUENCE_DELAYS.indexComplete;
  if (sequence.phase === "typing") return SEQUENCE_DELAYS.character;
  if (sequence.phase === "typing-hold") return SEQUENCE_DELAYS.typingHold;
  if (sequence.phase === "signal-lock") {
    if (sequence.signalLockStep === "brighten") return SEQUENCE_DELAYS.signalBrighten;
    if (sequence.signalLockStep === "noise") return SEQUENCE_DELAYS.signalNoise;
    return SEQUENCE_DELAYS.signalLocked;
  }
  return null;
}

export function advanceSequenceForRun(
  current: SequenceState,
  scheduledRunId: number,
): SequenceState {
  return current.runId === scheduledRunId ? nextSequenceState(current) : current;
}
