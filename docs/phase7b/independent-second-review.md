# Independent implementation review: second three works

Scope: Expanding Card, Drag & Settle, Skeleton Reveal, their pure helpers and tests, browser-runner coverage, and registry preservation. This reviewer implemented the first three works; this report does **not** independently approve those works. This is a working-tree review, not yet final-HEAD acceptance.

## Reproduced findings

Independent test input: `tests/phase7b-second-independent.test.tsx`.

1. P2: Changing reduced-motion during card expansion left progress 0.1500466392318244 with expanded=true. Fixed by finalizing the active goal. Same input now passes.
2. P2: A keyboard reorder during settling jumped an item from 54.474430352354176 CSS px to 0. Fixed by capturing rendered calculation positions rather than committed indices. Same input now passes.
3. P2: Resuming a cancelled simulated load resurrected the cancelled job and completed it. Fixed by distinguishing cancelled/completed/idle from paused and disabling resume. Same input now passes.
4. P2 follow-up: Pointer pickup during settling still jumps 54.474430352354176 CSS px to 0 before the pointer moves. Fixed by retaining the displayed pickup origin. The identical independent pointerdown input now passes. Keyboard and pointer repairs were verified separately.
5. Defensive boundary: cardRect now clamps invalid progress. NaN, ±Infinity, negative and >1 cases pass independent endpoint expectations.

Initial original implementation SHA256: `29dd0243b769c70a42fbc64a806ab165f3c21665722db75374361e698934e8ec`.
Initial independent three tests: 3 RED. First repair recheck: 4 PASS / 1 RED including the pointer follow-up. Second repair recheck: 5 PASS. Added capture-lifecycle cases: pointercancel followed by late pointerup passes; unexpected lostpointercapture followed by pointerup fails (order incorrectly commits B → C → A). Capture-loss repair independently rerun: all 8 adversarial cases PASS, including normal release after committed pointerup. Original 10 cases also PASS (18 total in this rerun). Original second-work suite independently rerun: 10 PASS. These are jsdom/model tests, not physical inputs.

## Registration

Compared to merged base `8eae48a276baacebfed23f602294f30f32b6a2bd`, app/data changes are only the new six-item registry and its import/map in museumClassification. Existing data definitions and previous catalog entries are unchanged. ModernAnimationRoom retains previous IDs and anchors and adds a distinct collection. Shared references remain single registrations.

## Browser evidence boundary

The reviewed runner covers 16 requested browser/viewport/motion configurations, basic operation, keyboard and mouse drag, cancellation, room unmount, overflow, and screenshots/traces. A successful run does not itself cover every speed/pause/resume/retarget/pointercancel/dynamic reduced-motion combination. The latter require additional evidence or remain explicitly unverified in browsers. Physical Safari, physical touch and screen readers are not tested by jsdom or hosted browser automation.

## Judgment

At this working-tree checkpoint: PARTIAL; reported local SecondWorks P2 findings are closed in the working tree. Final HEAD, final CI and repaired browser evidence must be checked separately. No merge, publish, permission or existing issue-state changes were made by this reviewer.

## Capture follow-up

Unexpected pointer capture loss must cancel only a currently active drag, and a normal release after a completed pointerup must not cancel the committed reorder. The original component had no lostpointercapture handler. Independent synthetic event input reproduced the unintended commit. The repaired component tracks active pointer capture and cancels unexpected loss, while accepting normal release after commit. This is not a physical touch test.

## Repaired-source check

SecondWorks SHA256 `f53d045b07585e884adf2d2eecd39360d8d299f320d4bed93c90fe92e412d9ca`; second-model SHA256 `6153ffdd45204642c96ecf449c2781e1a07432a95d5459b414c2df98a6c2850c`. Local independent rerun: 18 PASS. Final CI/browser verification is still separate.
