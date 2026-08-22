import { describe, expect, it } from "vitest";
import { aiPhases, judgeTiming, nextAiState, nextComparisonPhase } from "../app/components/waapi-interaction-state";

describe("WAAPI interaction state machines", () => {
  it("parry/dodge timing has early, success, and late boundaries", () => {
    expect(judgeTiming(349)).toBe("EARLY");
    expect(judgeTiming(350)).toBe("PERFECT");
    expect(judgeTiming(4000)).toBe("PERFECT");
    expect(judgeTiming(4001)).toBe("LATE");
  });

  it("AI card and comparison phases terminate", () => {
    expect(nextAiState("Idle")).toBe("Starting");
    expect(nextAiState("Completing")).toBe("Complete");
    expect(nextAiState("Complete")).toBe("Complete");
    let phase: Parameters<typeof nextComparisonPhase>[0] = "Request received";
    for (let index = 1; index < aiPhases.length; index += 1) phase = nextComparisonPhase(phase);
    expect(phase).toBe("Complete");
    expect(nextComparisonPhase("Error")).toBe("Request received");
  });
});
