# PR #70 touch-cancellation local diagnosis and reacceptance

## Scope and frozen reference
Issue #69 / PR #70. Baseline `14dfc8ab5266f56a7effb347c083957bb34b8fd3`, tree `138e2312873d9930e7c3d8af94bfe8227020d957`, current main `ab05ffa4e95a68bc387bcfbd04a16bad6e331a75` (checked at start). No previous evidence is replaced. #44 and #54 continue. No merge, deployment, or ready-for-review transition.

## Plan and observation protocol
1. Baseline: compare product native range and plain HTML native range at matching viewport/position/dimensions, with `touch-action:auto/pan-y/none`, capture absent/present, mouse click, Playwright touchscreen tap, and Chromium CDP touch drag. All are browser automation, not physical touch. Each case gets a fresh context/page. Linux matrix is 36 Chromium +24 WebKit =60 conditions.
2. Record pointer/touch/input/change/focus/blur events with trusted flags, native value, preview/committed parameters, history and timestamps; capture and microtask samples are observations at different stages, not a promise that React commits have flushed. Final state is read after two animation frames, not arbitrary sleep. Preserve event sequence because browser event timestamps need not be monotonic in dispatch order.
3. Repeat on Windows via independent reviewer, and in clean Ubuntu/Windows CI with fixed Playwright 1.55.1 and1.56.1. SDK versions are external test tools; product dependencies/lock are unchanged.
4. Correct the independently reproduced P3 legend discrepancy. Preserve cancellation semantics, source pixels/RGB function/histogram function. Re-run 16 acceptance conditions and independent math/raw-archive audit.

## Baseline observation (Linux, exploratory collection)
`baseline-linux-matrix.json.gz` contains all60 completed cases. The existing baseline build was served; worktree has diagnostic additions and unrelated P3 edits during this exploratory collection, so this is not a final clean-HEAD acceptance run. Original event sample phase `after-dispatch` means a queued microtask; it must not be interpreted as a guarantee of completed React render. Final-state fields are separate.

- Chromium141.0.7390.37, Playwright1.56.1: all6 product tap and6 product CDP drag cases commit53, history1, no pointercancel. Plain native input also retains53. All mouse cases commit/change normally.
- WebKit26.0: all6 product tap cases yield trusted input54, preview54, then trusted pointercancel, then pointerup; final value0/history0/pendingfalse. All6 plain HTML tap cases produce pointercancel while retaining54. All12 WebKit mouse cases retain54.
- Changing touch-action or adding pointer capture does not remove the cancellation. React and product handlers are **not necessary** to trigger it. The product's cancellation rollback explains why its final value differs from plain HTML. No evidence yet distinguishes a WebKit engine issue from Playwright's WebKit input backend.
- Classification: confirmed interaction between automated native control cancellation and the product's required rollback contract; the origin/appropriateness of the browser cancellation is **UNKNOWN**. Do not call physical iOS broken or fixed.

## Local changes
P3: every original path uses dash `3 2`; every adjusted path is solid. Channel buttons All/R/G/B isolate a named channel without color discrimination. This preserves labeled numeric table and before/after differentiation. Two new tests fail against the old UI and pass after local correction (`p3-red.log`, `p3-green.log`). Browser oracle checks dash attributes and all256 coordinates per path.

No change to touch state logic is justified by these observations. In particular, pointercancel is not ignored, touchend does not override it, and historical/stale up/change protections remain. Native WebKit range touch stays an acceptance blocker, not an expected pass. Safe alternatives are number fields, keyboard, or mouse.

## Evidence semantics and running
`node scripts/diagnose-adjustment-touch.mjs` uses `PLAYWRIGHT_MODULE` and optional BROWSERS, TOUCH_SURFACES, TOUCH_ACTIONS, TOUCH_METHODS, TOUCH_EVIDENCE. Default is the complete60-case matrix. Browser binaries must match the selected Playwright version. It writes reports/screenshots under work/touch-reacceptance. No output is committed over prior evidence.

The diagnostic separates `COLLECTION_COMPLETE` from `productAcceptance`. Any product touch that fails to commit the intended adjustment as one history entry makes productAcceptance FAIL and exits nonzero. Empty, duplicate, missing, unfinished, untrusted-only, pageerror, missing state/PNG evidence is rejected, not PASS. A successful mouse/keyboard or ordinary16-case suite does not cancel the native touch failure. CI uploads evidence even on failure.

Final HEAD/tree, source hashes, OS/builds, CI run and raw ZIP audit, independent reviewer results will be recorded in PR/Issue after runs complete. This document is not a claim those future runs passed. Known baseline Multi-select Chromium375 FAIL and local screenshot stability timeouts remain independent historical findings; CI success does not erase them. Physical iOS/Safari, VoiceOver, physical input, OS text scaling remain NOT_TESTED.

## Independently discovered resize race (separate from native touch cancellation)
The Windows reviewer observed an actual width change before a trusted keyup, while the browser delivered `resize` / ResizeObserver later. The pending value could commit first. Waiting500ms made the test succeed, but that is not a correction of the race. The initial exploratory timeline overlapped a build, so the reviewer is repeating the RED case on a frozen build rather than claiming that mixed run is final-HEAD evidence.

A local regression models the same event ordering: change measured root width without notifying ResizeObserver, then release via keyboard, element pointerup, or document pointerup. All3 cases plus zero-width completion fail against c642a4e (22 prior tests still pass), and pass after the correction. The component snapshots root width at gesture start and synchronously compares real layout again before either commit path. A changed or zero width cancels. Height-only reflow does not cancel, preserving the prior fix. RGB/histogram/source-image code is unchanged. `resize-red.log` and `resize-green.log` retain results.

The formal16-condition suite adds `resize-before-observer`, a labeled synthetic fault-order control alongside real-browser resize operations. It must not be called physical input. The independent Windows trusted-event RED→GREEN timeline remains a separate evidence source. The old native touch failure still requires its own judgment; this resize correction does not fix or reclassify it.

Independent fixed-build RED confirmed by the Windows reviewer at c642a4ea8045f6f5e9e8185ea254224cbea5b417:30 trials,3 late-commit failures (Chromium delay0/trial2; WebKit delay16/trial1 and delay50/trial1). The recorded order is actual root width340→359.40625, trusted keyup, committed3→4, then resize/RO. Delay values are diagnostic branches, not increased acceptance waits. The exact same30 trials are required after the correction.
