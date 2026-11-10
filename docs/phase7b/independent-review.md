# Stage 7B independent review — initial findings

This reviewer did not implement the six works. Inspected FirstWorks, first-model/runtime, second implementation, registration, browser runner, and raw work/phase7b reports. Workspace inspection occurred after remote HEAD 8d5f3eeb; uncommitted fixes exist, so this is NOT final-HEAD acceptance.

## P2 findings (same-input tests retained)

1. Success Draw cancellation followed by Resume starts the cancelled operation again and eventually displays success. Explicit Replay is distinct from Resume and should be required to create another operation.
2. Spring Toggle reduced-motion ON displays target 1, but OFF returns to the saved intermediate clock position and freezes. A display-only endpoint does not commit terminal model state.
3. Success Draw has the same reduced-motion rewind: failure becomes running after preference OFF.

`tests/phase7b-independent.test.tsx` contains three independent reproductions; all three failed before repair. No implementation changes made by reviewer.

## Independent browser reproduction

Chromium 141.0.7390.37, 390×1000, normal motion at start. Cancel/resume reproduced cancelled→success; reduced-motion toggle reproduced target1→0.463225339535129. Raw JSON, two PNGs, trace and SHA256 manifest reside in the untracked evidence directory `work/phase7b/independent-first`. This is software-generated browser input, not physical Safari or physical keyboard validation.

## Evidence audit and coverage

As of this inspection, the 04:04:16 local matrix stopped at condition5 with FAIL. All28 files listed in that partial report matched SHA256. Earlier reports correctly retained failed build/inventory/browser-start outcomes. None proves finalHEAD or all16 conditions. Runner covers basic action/state/navigation/screenshots, but does not yet independently establish every reversal, speed, resize, dynamic preference change, touch cancel or observation-value equivalence. Fault controls which merely assert constant mismatches are narrower than executable mutation testing.

## Current verdict

PARTIAL / merge recommendation NO pending fixes, same-counterexample rerun, complete finalHEAD CI and independent evidence verification. Existing Issue44/54, physical iPhone/VoiceOver and old WebKit timeout remain outside this acceptance.

## Recheck after repair

Independent rerun of the unchanged three counterexamples and nine existing first-work tests: 12/12 PASS. The clock now materializes the terminal time for reduced motion, and Resume excludes cancelled/idle/completed states. Code inspection confirms both changes address the reproduced failures without changing test expectations. Browser recheck and finalHEAD/CI acceptance remain pending; no final merge recommendation is issued from unit results alone.
