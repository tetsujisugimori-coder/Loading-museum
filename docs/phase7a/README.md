# Phase 7A: Historical / Modern Motion and Small Motion

Issue [#81](https://github.com/tetsujisugimori-coder/Loading-museum/issues/81). Baseline main `38838bc76ca05aab27be6b714b60a9e1a211b20d` (Layer Composer merged). No changes to the outstanding Image Adjustment Lab / native-touch PR chain #70, #72, #74, #76, #78 or Issues #44 / #54. No image-editor expansion, new room, merge, auto-merge or publication.

## Inventory and hierarchy

Before: 268 distinct works, 13 rooms, one 9-work loading gallery. After: 274 works and the same 13 rooms. The gallery has never been counted as an additional room in the existing header; it remains a separate collection entrance.

| Existing room | Before | After | Historical references | Modern references |
|---|---:|---:|---:|---:|
| MS-DOS・PCコマンドライン | 8 | 8 | 8 | 0 |
| Linux / UNIX | 5 | 5 | 5 | 0 |
| 消えたOS | 18 | 18 | 18 | 0 |
| Apple I / Apple II | 13 | 13 | 13 | 0 |
| Macintosh誕生 | 18 | 18 | 18 | 0 |
| カーソル | 8 | 8 | 8 | 8 |
| Flash特別展示室 | 66 | 66 | 66 | 15 |
| DOM ANIMATION ROOM | 17 | 17 | 0 | 17 |
| WAAPI標本室 | 47 | 47 | 3 | 44 |
| 現代アニメーション常設展 | 6 | 12 | 0 | 12 |
| インタラクティブ作品・表現実験 | 12 | 12 | 0 | 12 |
| 実用UI部品の観察室 | 12 | 12 | 0 | 12 |
| 第4・5期：実用UI部品の観察室 | 29 | 29 | 0 | 29 |
| Loading gallery (not a room) | 9 | 9 | 6 | 3 |
| Unique total | 268 | 274 | 145 | 152 |

Historical: 8 room references + gallery. Modern: 8 room references + gallery. The 23 shared references are 8 enduring cursor interfaces and 15 Flash Then/Now/technology-comparison works. `145 + 152 - 23 = 274`. A cursor interface's historical provenance and its current interaction are both the subject of that room. WAAPI's three `OS / Historical` specimens are Historical even though their implementation is modern. Reconstructing Flash in CSS/SVG does not make all Flash works Modern. The first six loading examples are historical styles, the final three generic CSS/progress/skeleton examples are Modern. These are curatorial classifications, not claims of a single invention date.

`museumClassification.ts` is an additive reference index. It imports existing data; it does not duplicate players or migrate IDs. Original data modules remain byte-identical. The room list opens existing components. The Small Motion collection belongs **inside** the existing modern room; the six original modern works and their tag search remain available. Old literal anchors are retained, and nested old anchors such as `#finder` open their existing room. New links select works in single-player rooms and reset only that room's filter for the explicit navigation.

The DOM index copies only the existing IDs/titles, with an audit that compares all 17 IDs back to the authoritative component. The original nine gallery works do not have per-work registration IDs; the additive index uses gallery-slot keys, not a claim that those were legacy IDs. `inventory.json` is the pre-commit audit snapshot; runtime/CI reports bind their own exact HEAD, source and build hashes.

## Six small works and overlap decisions

All figures are original SVG geometry. No external images, copied reference code, libraries, stored personal data or actual network operations are added.

- **Bell Bounce**: notification, acknowledgement and re-notification; adjustable pivot angle and speed, appearing unread badge. Existing WAAPI notification-bell is a fixed motion specimen; this adds notification lifecycle and amplitude/timeline study rather than replacing it.
- **Bookmark Fold**: saved/unsaved state with different fold/rotation directions, color and a check. Existing Clip Menu reveals a region, and Flash shape tween explores outlines; this focuses on reversible save feedback.
- **Squash & Stretch**: single-ball fall, compression, volume-approximate stretch and rebound. Gravity changes timing; rebound changes lift. This is an authored shape-animation study, not Physics Playground's numerical collisions or a physically exact simulation.
- **Send Flight**: a rectangular send button folds into a plane, flies, and reaches completion; cancellation invalidates older work. Existing Async Action Button explores async result state. Here the shape's continuous short choreography is the subject. No request is sent.
- **Blink & Look**: fixed eye position with gaze, eyelids and three expressions, gaze lock and timeline inspection. Existing `watching-eyes` and `mascot-idle` already cover gaze/blinks; this deliberately narrows the new work to expression and eyelid-frame comparison. It does not duplicate Cursor Creature's moving body, inertia or avoidance.
- **Drop & Ripple**: a timed drop/impact/ripple sequence with independent size, fall speed and spread controls. Existing click-ripple indicates an input location; this work studies the causal timing between a drop and its expanding surface rings.

These distinctions are visible beside each work. The prior exhibits remain unchanged and are not silently renamed into the six additions.

## Playback contract

One selected Small Motion player is mounted. SVG transforms are derived from a clamped 0..1 timeline; one requestAnimationFrame loop advances it. Controls are native buttons, ranges and a select. Pause preserves progress; Replay restarts the last gesture; Reset restores all settings and state. Keyboard range movement and 5% steps provide intermediate inspection. Speed applies to the remaining timeline without changing its endpoint. Squash/drop controls change their authored geometry/timing, not a simulated conservation law.

Each loop owns a generation. Pause, reset, replay, cancelled send, visibility transitions and unmount invalidate older callbacks. rAF cleanup cancels scheduling. IntersectionObserver pauses offscreen players, `visibilitychange` pauses hidden documents, and a resumed loop resets its timestamp so hidden elapsed time is not replayed. Closing the room or changing selection unmounts the previous player.

Reduced motion never auto-runs: an explicit action shows its final state, while manual seek/steps permit intermediate inspection. Changing the OS preference during playback stops at the current frame; the final-state control completes explicitly. State text is separate from visual progress, and range outputs do not announce every frame.

## Verification and evidence

- `npm run lint`: zero errors; two pre-existing unused-variable warnings in `verify-regression-independent.mjs` remain.
- `npm run typecheck` and `npm test`: run against submitted code. The full suite includes the new lifecycle, navigation and geometry cases; no earlier assertion is weakened. Existing browser scripts change only their expected all-museum count from 268 to 274.
- `node scripts/audit-phase7a.mjs`: verifies 22 original data files and nine original gallery bodies byte-for-byte, 13 rooms, 274 unique registered references, category completeness and DOM IDs.
- `node scripts/build-layer-composer.mjs`: reusable existing build binding validates a clean source tree, exact HEAD/tree, source hash and exported-content hash.
- `scripts/verify-phase7a-browser.mjs`: Chromium/WebKit × 375/390/765/1280 × normal/reduced. Checks all six works, controls, pause/resume, repeated Replay, Reset, cancel, final states, gaze, keyboard, actual touch taps, offscreen pause/resume, simulated document visibility, room close, legacy URLs, cross-classification links, narrow width and 200% text. Saves PNGs, traces, per-work assertions and source/build provenance.
- `.github/workflows/verify-phase7a.yml`: exact PR HEAD, both engines, all four widths and both preferences. Missing browser or incomplete matrix is failure, never PASS. Existing related regression workflows remain in place.

The early uncommitted Chromium375 two-condition pilot passed but is **not final-HEAD evidence**. Default local WebKit startup initially failed for missing system libraries; the already available official MiniBrowser with a local library-path wrapper was health-checked successfully. Local wrapper use must remain labelled separately from CI's standard browser install.

Physical iPhone Safari, physical mouse/touch gestures, VoiceOver/screen-reader experience, real OS-background-tab behavior and native WebKit range touch are NOT_TESTED. A synthetic visibility event checks our lifecycle handler but is not a claim about browser scheduling of a real background tab. This does not resolve existing native WebKit touch issues.

**Submission-stage verdict: PARTIAL / merge recommendation NO until independent review and exact-HEAD final CI complete.** Final verdict, corrections, CI links and evidence digests are recorded on the Draft PR. Draft is retained and no merge is performed.

### Nested focus correction

The serial final-HEAD run exposed a reduced-motion navigation failure in an existing Vanished OS room. The target existed and the room had removed `inert`, but its skipped descendant retained computed `visibility: hidden`. Waiting two seconds and focusing again did not recover. Independent replay confirmed that re-scrolling after layout, then checking visibility and actual focus, did recover. The navigation now uses a bounded two-second readiness loop that re-scrolls, waits for an uninert/visible destination, verifies focus success, and cancels on a newer hash, user input or unmount. No global visibility, animation or content-visibility CSS is changed. Three regression cases cover readiness and cancellation. Earlier failing matrix reports are retained; the corrected final HEAD must run all 16 conditions again.

### Short-motion browser observation window

The first corrected-HEAD run then exposed a test scheduling race: at 2× speed the test could not reliably intercept a short work's active interval to click Pause. The trace records Replay at 24.113s, the progress observation at 24.381s, and the Pause request starting at 24.975s; the locator never resolved, and the work was complete by timeout. A later snapshot still showed progress 0.2962, so exact completion before Pause dispatch is not established. This is retained as a failed run, not a product PASS. Pause/resume and visibility checks now use the supported 0.25× observation speed with real pointer input; the maximum speed value and 2× terminal state remain separately asserted. No timeout or state assertion is weakened.
