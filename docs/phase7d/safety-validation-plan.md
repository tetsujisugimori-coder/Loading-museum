# Safety validation, fixed before browser execution

Production108 is disabled throughout. No product code changes; no root-cause inference.

A: separate-process Git HEAD/tree/blob format/source, build set and HTTP raw bytes. Required contract/tools hashes are bound. HTTP evidence proves captured requested resources only.
B/C: all inherited108 ordered slots, WebKit72/Chromium36, inherited selectors/operations/deadlines and clocks unchanged. Only synthetic dummy records run. First result never overwritten; completion is a separate record. Controlled interruptions after reserve/primary at1,2,54,108. Production state remains NOT_EXECUTED.
D: dedicated minimal JavaScript model (not React/product component) with actual timer/callback/update/commit/DOM boundaries. Exactly two engines × four cases =8 trials: Chromium normal, commit-delay, cancel-race, dom-delay; then WebKit same order. No retry. Virtual100ms completes timer; held boundary explicitly released, no sleep. Cancel occurs after held update and before commit. Observe pre/post release and raw trace/HAR. Normal finishes Done; delayed commit leaves both Idle pre-release; delayed DOM leaves committed Done/DOM Idle; cancellation rejects stale commit and preserves Cancelled. This is model-level runtime injection, NOT proof of product-specific React commit fault coverage. Product-specific requested faults remain NOT_TESTED if no product injection runs.

Stop each trial on launch/navigation/action failure; record NOT_TESTED/INCOMPLETE, do not count as semantic detection. Each trial new browser/context, timeout9000ms inherited; no screenshot needed. Save same-context complete HAR, raw response bodies, trace, snapshot, errors. Measurement neutrality UNKNOWN. Browser runtime fail leaves recorded failed slot; never repeat for success.
E: replace Windows-literal shell glob with the exact same four existing phase7d TSX paths. Source hashes/sets recorded on Windows and Linux. Original FAIL retained.

Capacity baseline cloud 36GiB available,3.88M inodes. Expected new outputs <2GiB excluding reused installed dependencies. Dedicated ../temp and evidence; no other cleanup.

The eight browser trials run once by explicit dispatch only, not PR/push. PR/push run contracts and Windows/Linux checks only. Cloud WebKit prerequisite libraries are unavailable; no local browser trials will be spent. CI installs official Playwright dependencies in its isolated runner. Independent model audit uses fixed source-to-build identity copy paths, not a general Next build provenance claim.

## Preflight findings and scope limits
Independent review found coordinated build/manifest/HTTP replacement, self-selected tool policy, missing execution-attempt history, a Windows file-URL error, and missing session records. These are fixed with fixed CLI policy/identity-copy source checks, append-only execution directories and ordered slot coverage, and pathToFileURL. Raw reviewer counterexamples are retained separately.

Initial local safety tests accidentally used the OS default temporary directory before the dedicated default was enforced. These records are retained without cleanup; no existing files were removed. Current tests default to work/safety/temp, or explicit SAFETY_TEMP. This is an operational deviation, not a successful dedicated-temp result for those initial runs.

The new HTTP provenance mechanism is validated on the identity-copied minimal fixture, NOT the full Next production output. Browser model evidence does not establish the original Swipe/Status React commit boundary. Real product fault injection and full product executable provenance remain NOT_TESTED. Original formal7D/API/WAAPI failures are not changed by this work. Consequently overall safety acceptance is PARTIAL until those gaps and final CI/archive checks are satisfied. Production108 and PR merge remain NO.
