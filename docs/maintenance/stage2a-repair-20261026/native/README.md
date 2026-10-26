# Native N2 repair verification

This directory adds evidence; the earlier `stage2a-verification-20261026` records are unchanged.

## Method and scope

- Chromium and WebKit at 375 / 390 / 765 CSS px, real native WAAPI. Installed Playwright 1.56 matches the browser binaries; browser version is recorded in each result.
- `Element.animate` and `Animation.cancel` wrappers delegate to the original native methods. They record identity, performance.now, currentTime, playState, pending, duration and cancellation before/after; they do not replace animations or timings.
- The matchMedia listener is installed before application code, so media input snapshots precede React's response. A/B use Replay/COLLECT, then browser reduced-motion emulation. A naturally ended animation at that input is `INPUT_MISSED`, never a running cancellation PASS.
- Canonical v3 checks both Coin and score-pulse animation references. A successful result requires native cancel records and idle/currentTime null for both. Normal Coin has no pause UI; `pausedDiagnostic` uses native pause strictly as a separate diagnostic.
- Positive / negative predicate fixtures validate the verifier, not product behavior. Negative controls reject no cancel, natural finish, input after finish and missing score-pulse cancellation.
- Reduced explicit Replay must use exact Coin 1 ms / score pulse 180 ms with zero delay, not merely a broad duration ceiling.
- Browser-local button.click is synthetic UI input. It avoids the Playwright round-trip consuming most of the 650 ms normal animation. This is not proof of physical touch or accessibility-tool operation. The separate Stage 2A suite owns pointer/keyboard coverage.
- Media emulation and synthetic document.hidden are not real OS preference/backgrounding. Hidden checks target the existing observation-controller contract; no new normal-Coin hidden contract is asserted.
- Offscreen testing uses actual scroll beyond the IntersectionObserver root margin, and records IO callback and native cancel timestamps separately. Menu keeps the same idle expectation with a 1,500 ms bounded condition wait, not an assumption that a fixed 100 ms is always enough. This does not change any unit-test 5,000 ms timeout.
- All source files and served HTML/JS/CSS are SHA-256 recorded. No public website or deployment is modified.

## Initial verifier v1 (retained)

`verify-coin-cancellation-v1.py`, `baseline.json`, `baseline.log`, `baseline-server.log` and representative PNGs retain the first run. Five reached conditions (all Chromium widths and WebKit375/390) each reproduced both Replay/COLLECT cancellation failures. WebKit765 timed out during the Playwright gallery-opening click and did not reach the checks. These are not converted into six full successful baseline runs.

The v1 tracked the Coin animation only, used an overly broad reduced-duration upper bound and a fixed Menu cancellation read at 100 ms. After review, v2 adds the score pulse, exact reduced timing and native cancellation references. The subsequent v2 locator failure is preserved below. Canonical v3 baseline and repaired outputs use the same script and expectations. v1 is supporting historical evidence, not interchangeable with v3.

## Commands

```sh
bash docs/maintenance/stage2a-repair-20261026/native/run-native.sh baseline-v3 /workspace/scratch/e622c1e9421e/loading-stage2a-verification
bash docs/maintenance/stage2a-repair-20261026/native/run-native.sh repaired
```

No fixtures, mocks, skips, automatic success retries, timeout changes or product state injections are used to make native checks pass. Failed/late attempts are retained and reported separately.

## Q1 continuous user journey

The v3 script also executes the former single gallery test's original order in each native condition: initial absence, open all 47, normalized Fade search, clear, UI Feedback + Modal filters, no results, clear to 47 and close/cancel. This retains cross-step interaction coverage alongside the unit test's independent responsibility split. Native cancellation is checked on the references actually live before close, and the cancel-call count must increase. It is not a claim that splitting the unit test alone proves stability.

## Harness corrections retained separately

`baseline-v2.json` and `verify-coin-cancellation-v2.py` retain the unsuccessful attempt to add the Q1 journey. All six conditions stopped at the exact `get_by_label('カテゴリ')` lookup before N2. Actual label DOM text includes its option texts (for example `カテゴリすべてAI Working MotionAdvancedEntranceExitGame UIOS / HistoricalTextUI Feedback`), so the exact Playwright label lookup was wrong. The corrected v3 verifies that the label's own text node is uniquely `カテゴリ` / `用途`, then operates that label's child select. Label text is retained in each condition. These six exceptions are harness failures, not product cancellation results.

The canonical same-script comparison is `baseline-v3.json` versus `repaired.json`. `assess-native.py` independently checks exact pair identity, two unique captured IDs, two matching post-cancel references, native cancel before/after evidence for each, every recorded behavioral assertion, six distinct conditions, two operations each and all positive/negative controls. The stricter checker adds explicit missing-score-reference, duplicate/wrong-ID and missing-score-cancel negatives. Predicate fixtures are not included in native operation counts.

`verify-major-regressions.py` is a copy of the pre-existing major-regression script with only the category query fixed and option count / executed category count assertions added. The previous `.all()` loop could iterate zero times with the wrong exact label query. No earlier category test claim is retrospectively promoted by this correction. The original script is unchanged.

Strict assessment requires the Coin to be live at media input and both owned animations to be running/paused before native cancel, with elapsed time below the end. Coin uses native duration 650 ms. Score uses recorded native duration 240 ms plus source-defined delay 620 ms (arithmetic end 860 ms); native effect endTime was not captured. Cancellation after natural finish is a separate `CANCELLED_AFTER_NATURAL_FINISH` result, never PASS. Two further negative controls reject finished-before-cancel and a score at its end. The major-regression category predicate also rejects an empty locator, empty expected category set and unexecuted iterations.

## Final native results (2026-10-26 UTC)

| Suite | Result | Evidence / limitation |
|---|---|---|
| N2 v3 baseline | 12/12 natural Replay/COLLECT paths FAIL; six paused diagnostics FAIL | Both owned references captured. Six conditions completed, 222/228 behavioral assertions passed; six repeated-motion cancellations failed. |
| N2 same-script repaired | 12/12 natural paths PASS; six paused diagnostics PASS; 228/228 behavioral assertions PASS | Strict identity/live-before-cancel/idle-after checks, 12 predicate controls, pageerror 0. |
| Stage 2A original full time-control suite | Six conditions PASS, 48 named check groups | Includes Menu/Coin time controls, normal-state separation, light/dark media, CSS text200, keyboard, offscreen, synthetic visibility and media. No physical Safari/VoiceOver claim. |
| Stage 1 original full suite | Four PASS, two FAIL; 22 completed check groups | Chromium765 next Perfect Parry locator evaluation timed out after one early-input sample. WebKit390 requested Dodge500ms but actual input1083ms: before ACTIVE WINDOW, result LATE HIT. Root causes not established. These two conditions did not reach Battle/Combat/Coin. |
| Major older regressions | Six conditions pass all nine groups (54 groups); overall 2 PASS/4 PARTIAL | Match-3, Falling Block, HP Reset/damage, Inventory, Lock-on, category coverage and lifecycle checks pass. Existing whole-page CSS text200 horizontal overflow remains at375/390 in both engines;765 passes. This is not all197 exhibits PASS. |
| Stage1 isolated repeat, one each | Chromium765 PASS (five groups); WebKit390 FAIL (two groups) | Chromium original timeout is retained, not fixed. WebKit390 now passes all12 Parry/Dodge checks and Battle offscreen FIELD/INTERRUPTED, then a bare assertion in the later Battle Reset/reduced-motion segment fails. Exact assertion location was not recorded by the original harness; do not infer which. |
| Separate WebKit390 Dodge latency probe | Three observations, pageerror0 | Actual505/502/503ms: before ACTIVE WINDOW, next RAF LEFT · S-RANK. This does not reproduce or explain the earlier1083ms delay. Immediate DOM still shows ACTIVE WINDOW before React's next frame, explicitly recorded. |

At390px repaired Coin native times just before cancellation were Chromium Replay0ms/COLLECT0ms and WebKit Replay74ms/COLLECT140ms. Both Coin and score pulse were running and become idle/currentTime null after native cancel. Across all widths, Coin cancellation occurred at0–350ms, below650ms. Score pulse is separately tracked; its source-defined start delay620ms does not remove the obligation to cancel its running native animation.

N2 and full Stage2A are confirmed only in these emulated local browser conditions. Stage1 intermittent failures and existing layout debt remain distinct. Original B1/M1 histories remain unchanged; new passes do not establish their historical root causes. No physical touch, real OS backgrounding/reduced-motion setting/text scaling, Safari device or VoiceOver result is claimed.

### Runtime and identity

`repaired.json.gz` contains the final source/build digest set, exact script digest, source base HEAD and start/end times. The product source is an uncommitted repair atop the recorded base HEAD, identified by file digest, not falsely presented as the old commit's bytes. Gallery SHA256 is `0292e0340f1e5e854777a9d342bfa83b60a26e42ff0b66b9fdf343098ca3f365`; CSS SHA256 is `7907ac4cb2aa05e0639617728a7b79e9e14da00e75724f97c4fcab7fbc9e7a68`.

`regression-served-digests.json` and `supplement-served-digests.json` independently compare all12 HTTP-served HTML/JS/CSS files with the same local final out; all match. Each supplemental runner checks its server PID alive first. The initial attempt to read the repaired server from a separate exec returned connection refused, so it is not evidence of byte equality for that initial server; its own GET log contains this run's browser requests and no bind error. The execution sandbox separates process/network contexts. Subsequent same-runner HTTP checks succeed.

The old worker1 interrupted check session had uncertain termination after an environment transport interruption; native suites were started after the parent explicitly reported no active local heavy work, but absolute CPU isolation cannot be guaranteed. Native elapsed times and failures are retained rather than attributed conclusively to environment load.

`regression-runs.log` records: observation395s exit0; stage1227s exit1; major353s exit2; isolated Chromium76540s exit0; WebKit39039s exit1; Dodge probe12s exit0. Runner exit0 alone is not a suite PASS: each suite exit/result is separate.

### Lossless evidence packaging

The four large raw N2 JSONs are stored as `.json.gz` using gzip mtime0. `compressed-evidence-manifest.json` records both byte counts and SHA256 values and successful byte-for-byte decompression checks. Original raw copies are retained in `/tmp/stage2a-native-original-20261026`; repository `.gz` is complete portable evidence. `assess-native.py` accepts either raw or gzip. The baseline/repaired strict assessments were rerun successfully from compressed input with unchanged verdicts. Old previous-directory evidence was not changed.
