# P2-01 cleanup correction plan (fixed 2026-11-14T23:51:07Z)

Baseline b796f8e565dae5beb70d6655af6c99479d05337d, tree de7fe45996232fa202934e8865d52a14e2e4aea4. Scope: runner cleanup/evidence persistence and regression auditing, not product behavior.

## Fixed policy before implementation
- Keep the same eight ordered model slots: Chromium normal/commit-delay/cancel-race/dom-delay, then WebKit same four. No added real-browser trial, manual workflow dispatch, or production108.
- Normal path executes all eight. On the FIRST operation, cleanup, required-evidence, or persistence failure: attempt every applicable cleanup and every result save, stop further browser launches, and record all remaining slots NOT_TESTED with stop reason. Never retry a failed slot.
- Preserve first observation/error separately from cleanup errors. A successful observation with failed cleanup/evidence is INCOMPLETE, not PASS. Evidence status never changes the original observed value or exception.
- Independently attempt trace stop, pending response capture settlement, context close/HAR finalization, and browser close; failure in one does not skip the others.
- Allocate all eight records before launching. Write each slot and aggregate with exclusive creation; never overwrite old output. Aggregator rejects empty/missing/duplicate/order-mismatched sets, and requires all eight PASS plus complete required evidence to report success.
- Missing/failed trace/HAR, unstarted slots, operation or cleanup failure, write failure, or server close failure forces nonzero exit. Write failures are also printed to stderr; no claim of successful persistence if the directory is unwritable or an individual save fails.

## Synthetic regression matrix
Normal control; first-normal context.close rejection (same old/new condition); browser.close rejection; both close rejections; trace.stop rejection; HAR close failure/missing; trace missing; operation error plus close errors; served/result/aggregate write failure. These use a Playwright substitute and are labelled synthetic. They are not real browser crashes, product faults, or physical behavior evidence.

Preserve baseline RED and normal control, failed setup attempts separately, final GREEN, actual commands, identities and hashes. Existing42 tests, new regressions, Linux/Windows standard checks and a new-output real-repository dummy108 must be run. Formal CI, oldfb4 run43651015237 and baselineb796 CI remain separate by HEAD/event/run/attempt; no manual dispatch.

Independent review checks same counterexample, complete8 records, primary observation immutability, cleanup continuation, persistence errors and audit false acceptance. Windows preservation uses a new subfolder under the approved PR88 archive and independent byte/SHA/ZIP readback. Root causes UNKNOWN; Next/React boundaries NOT_TESTED; Draft maintained, merge NO, production108 NO.

Capacity start: shared filesystem about29GiB free /3,672,209 free inodes. Dedicated work/temp/evidence only; no deletion of earlier artifacts or shared Temp.
