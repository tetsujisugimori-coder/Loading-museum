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

## Independent browser and remote-source recheck

Fetched remote 0966dc09b8344047801b7d6d8d11dbef1a1a842f independently; tree 3dde74cefe97f8142141060ba1b80ee84dc015a0. All tracked app/scripts/tests/workflow/package source bytes matched the reviewed workspace. Rebuilt output was supplied by coordinator (reviewer did not rebuild concurrently).

Chromium141.0.7390.37 at390×1000 independently confirms cancelled state cannot resume, and reduced-motion ON→OFF retains spring final position1. Both browser counterexamples now PASS. Fixed trace/PNGs/report/manifest are in work/phase7b/independent-first-fixed, separate from original RED evidence. WebKit independent attempt failed before launch due to missing GTK4/Graphene/WOFF2/Harfbuzz-ICU/Hyphen/Manette/GLES shared libraries; no WebKit behavioral success is claimed by this reviewer. CI remains pending. This is code-scoped defect resolution, not full matrix or final integration acceptance.

## WPE WebKit follow-up and navigation limit

Using the available existing MiniBrowser WPE wrapper, WebKit26 launched successfully. Spring final-state retention passed. First cancellation attempt reached success before the cancellation precondition could be established; its raw FAIL is classified UNCONFIRMED, not as cancelled-job revival. A separately recorded early-cancel trial using the supported0.5 speed control established cancelled→cancelled and passed. Original JSON/trace remain unchanged; interpretation is separate. Evidence: independent-first-fixed-webkit and independent-first-fixed-webkit-slow with SHA256 manifests.

The earlier old-Flash navigation timeout did not repeat in the coordinator's fresh eight-condition Chromium run. Independent code inspection found both hash handlers still target setOpen(true), but no causal explanation for the earlier timeout was established. It remains UNKNOWN; this reviewer did not modify old Flash product code. Full local matrix then hit default WebKit library startup failure, separate from the successful independent WPE trials.

## Batched pointer delivery counterexample

Added an independent same-task event sequence (pointerdown→pointermove→pointerup inside a single React act, without rendering between events). With SecondWorks from remote0966dc0, expected order B→C→A fails; with the synchronous drag-session snapshot repair, the same test passes. All four reviewer-owned tests pass after repair. The original component was preserved under work/phase7b-old; RED and GREEN logs remain separate. This checks render-latency independence rather than adding a fixed wait to the browser test.

Browser-runner failure accounting was also reviewed: only a RUNNING case is now marked FAIL, so next-engine launch failure no longer rewrites the preceding successful case. Overall run remains FAIL. The attempting stage should be advanced after successful launch to avoid labeling subsequent execution failures as launch failures.
