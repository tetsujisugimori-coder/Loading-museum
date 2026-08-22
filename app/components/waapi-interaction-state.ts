export const aiPhases = ["Request received", "Searching", "Reading", "Reasoning", "Writing", "Verifying", "Complete"] as const;
export type AiComparisonPhase = (typeof aiPhases)[number] | "Error";
export type AiWorkingState = "Idle" | "Starting" | "Working" | "Tool / Reasoning" | "Completing" | "Complete" | "Error";

export function nextAiState(state: AiWorkingState): AiWorkingState {
  const order: AiWorkingState[] = ["Idle", "Starting", "Working", "Tool / Reasoning", "Completing", "Complete"];
  return order[Math.min(order.length - 1, Math.max(0, order.indexOf(state) + 1))];
}

export function nextComparisonPhase(phase: AiComparisonPhase): AiComparisonPhase {
  if (phase === "Error") return "Request received";
  return aiPhases[Math.min(aiPhases.length - 1, aiPhases.indexOf(phase) + 1)];
}

export function judgeTiming(elapsed: number, windowStart = 350, windowEnd = 4000) {
  if (elapsed < windowStart) return "EARLY" as const;
  if (elapsed <= windowEnd) return "PERFECT" as const;
  return "LATE" as const;
}
