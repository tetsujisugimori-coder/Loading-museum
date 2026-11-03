# PR #56 Phase 5A count investigation (2026-11-03)

## Finding: CONFIRMED observation race, timing-dependent trigger

Scope: main `26dae458be5df77bfc4f78f350996f3d375045ed` and submitted PR `7e5f2039e5fb894ffb9e01f40af63c9ad7c66782`. Original CI run41574840008 checked out the latter exactly, not GitHub's synthetic merge. Original artifact and failure log are preserved here; the full runner log is referenced at https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41574840008 rather than republished; no screenshot of the failing list exists in that artifact (only prior table/date screenshots).

Both product counter and rows use the same `shown` array. At fractional row boundaries `ceil((top+216)/36)-floor(top/36)+6` legitimately alternates between12 and13. The old probe pressed PageDown, awaited only top>0, assigned300000 while keyboard scrolling was still in progress, awaited only top>100000, then read counter and row count in different browser tasks. These predicates establish progress, not completion.

Same local Linux/Chromium141.0.7390.37, Playwright core1.56.1,375×900,touch context, production exports, instrumentation and operations were used on both revisions. Each revision ran12 original overlapping gestures,12 direct-only controls,12 keyboard-scrollend-before-direct controls. PR had5/12 split mismatches (13/12); main1/12 (12/13). Direct-only and separated controls had0/12 each on both. This is a diagnostic sample, not a statistical claim of equal rates or proof that Stage2B cannot influence scheduling.

Concrete PR counter-read at629.7ms: top300062, counter13, DOM13, records8333–8345. Next row-read at638.1ms: top300096, counter12, DOM12, records8334–8345. Combining these yields the CI's13/12 while both committed snapshots are correct. Main likewise yielded12/13 across different snapshots. All1786 PR and1782 main atomic scroll/MutationObserver/RAF/read samples agreed internally. React model top can briefly trail browser scrollTop before its scroll handler commit; that is separately observable and is not a DOM counter disagreement. Raw traces retain timestamps, row IDs, model/viewport positions, events and mutations.

Classification: test observation bug with browser keyboard-scroll timing as trigger. The mechanism is CONFIRMED by reproduction. The exact original CI interleaving cannot be reconstructed because its original trace was not captured. No product count divergence observed. Stage2B is not necessary to trigger the mechanism: it occurs in old main. Timing rates remain environment-sensitive.

## Contract and correction

The intended acceptance is (a) internally coherent committed DOM during observed scrolling, (b) viewport/model/range coherence after settling, then (c) separate filter/reset interactions. It does not require React state to synchronously match scrollTop before the browser delivers a scroll event.

`observeVirtualList` takes each snapshot in one browser evaluation/RAF callback, fails immediately on counter/row disagreement or >13 rows, and waits for identical position/model/count/IDs for at least6 frames AND100ms, with modelTop aligned to rounded viewport position. It then checks the full expected record ID range from36px row height,216px viewport and3-row overscan.8s remains a bounded failure timeout, not retry allowance. The keyboard gesture is observed to settle before the independent300000px jump. Evidence includes all convergence samples. No expected12/13 relaxation, sleep-only pass, skip or retry was introduced. A scrollend alone was rejected as the criterion: traces show one event from interruption followed by further keyboard movement.

This is measured bounded convergence, not proof of arbitrary future inactivity. Filter and Reset assertions remain unchanged. Product/Stage2B code and application dependencies are untouched.

## Detection controls

The new browser control script tests overlapping original gesture and separated gesture, then deliberately corrupts counter/removes a row and requires immediate rejection; perpetual scroll must time out. All5 controls pass on each baseline/PR Chromium build (2 healthy and3 expected negative outcomes, not10 product successes). The formal all-museum workflow now runs and stores these controls for both engines. No production state is altered outside disposable test pages.

## Initial failures retained

Local original all-museum probe on both revisions passed Virtualized List320 but failed the unchanged MultiSelectChips320 `aria-disabled` assertion (`false` vs`true`) before375. This is separate from the count investigation and not hidden. It may relate to local touch/scroll timing; root cause is not established. CI results and any later rerun must be reported separately. An initial optional npm Playwright acquisition failed because default npm cache could not be created; existing Playwright core1.56.1 and installed matching browsers were then used without dependency changes.

Exact final HEAD regression/CI results and distinct independent Stage2B reviewer results will be linked in the PR comment after completion. Existing Issue54 UNKNOWN and real-device gaps, and Issue44 security residuals, remain unchanged.
