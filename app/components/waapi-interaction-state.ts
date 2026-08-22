export const aiPhases = ["Idle", "Starting", "Searching", "Reading", "Reasoning / Tool", "Writing", "Verifying", "Complete"] as const;
export type AiComparisonPhase = (typeof aiPhases)[number] | "Error";
export type AiWorkingState = AiComparisonPhase;

export function nextAiState(state: AiWorkingState): AiWorkingState {
  if (state === "Error") return "Idle";
  return aiPhases[Math.min(aiPhases.length - 1, Math.max(0, aiPhases.indexOf(state) + 1))];
}

export function nextComparisonPhase(phase: AiComparisonPhase): AiComparisonPhase {
  return nextAiState(phase);
}

export function judgeTiming(elapsed: number, windowStart = 420, windowEnd = 680) {
  if (elapsed < windowStart) return "EARLY" as const;
  if (elapsed <= windowEnd) return "PERFECT" as const;
  return "LATE" as const;
}
