# Phase 7D observation-effect diagnosis: preregistered follow-up

This is diagnosis, not a product repair or merge approval. Issue #87 / Draft PR #88 stay open and Draft. Baseline HEAD 6653ec725ba61ab3c47c5725678ad25f0479e375, tree 8dcd268f8aec9e4410eb42137c99c26052fd5b8d. Existing product code, fixed timer delays, deadlines and formal acceptance oracle are unchanged. No arbitrary wait, skip, expectation weakening or speculative React change.

## Original failure evidence independently rechecked

- Run 42909089704, artifact 13806678526. ZIP SHA256 5690635bdd98962cbdba47ed6eda9452c90a2feab6482980e8feb9e7732e1cd7. Manifest report plus 18 files match, and 2035 recorded source hashes match baseline.
- WebKit Swipe A trial2: diagnostic COMPLETE, primary FAIL (`dismissing`, expected `dismissed`). Trace call@135 runFor(500) completes, call@137 returns `dismissing`, then call@139 captures image. No API error. The PNG visually displays `dismissed`; it is a later observation, not a representation of the initial failed read. Internal timer/commit boundaries are UNKNOWN.
- Trial JSON SHA256 c3e5647cead25455d00f8f01f490774de125b62c79d57bbd42a1db97da205229; trace 06a02a919bc4b8b5e829549d5bcf5554bbda4b65054e8426b21746eac64b2cb5; PNG 139c73ecf320e6cc9afcff2e7cb5677474556e0f9e8e9050f371ecc70c084b98. All three A Swipe PNGs have the same digest, despite distinct initial DOM outcomes.
- Original formal run 42894048407 Swipe765 artifact 13801286914 ZIP f04669d0764283537ec2696d2c434e464f8767e4b93965ed2ab9a82c78946971: 86 manifest files match; failure trace call@5198 runFor500 → call@5200 `dismissing`.
- Same run Status375 artifact 13801457371 ZIP bffe7b13965630704aa4808abe66b7f3edf0dbf0ba05e79271e4d827691f60aa: 16 manifest files match; Cancelled → Success → Error selection → two Replay → call@1020 runFor3000 → call@1022 `Loading`. Those failed formal cases have report and failure-trace, not dedicated failed-case JSON/PNG; unrelated images must not be substituted.

## Fixed experiment before execution

All groups use the existing uninstrumented A build prepared by `prepare-phase7d-diagnostic.mjs`. The original input sequences from `diagnose-phase7d-async.mjs` are retained, including existing setup assertions and controlled prefix advances. The same original `getAttribute('data-state')` immediately follows target `clock.runFor` in all groups and determines the immutable primary result.

- A1: stop DOM/image observations after the single primary read.
- A2: four further `getAttribute` calls, no added virtual advance or waits.
- A3: one pre-image DOM read, one screenshot, one post-image DOM read, no added virtual advance or waits.
- Every trial launches a fresh browser and context. Full API start/end host monotonic timestamps, separate UTC timestamps, result and error are recorded.
- Shared trace is API-only: screenshots=false, snapshots=false, sources=false. Unlike previous A/B/C, no automatic screencast or DOM snapshots. Trace and lifecycle overhead remain observers. Do not pool these rates with prior A/B/C.
- Initial browser date is directly read at the original pause-origin API. Subsequent virtual dates are a **commanded ledger**, not independent Date/React/timer measurements. This avoids adding a browser API before or after the A1 primary read. Host and virtual clocks are never converted into one time axis.
- No internal timer, setState or commit probe is added to these groups. Those internal boundaries remain UNKNOWN. An eventual terminal image does not prove callback or commit time.

Fixed counts: WebKit Swipe12/group, WebKit Status6/group, Chromium Swipe6/group, Chromium Status6/group = 90. No adaptive stopping, lower-repeat option or success-only retention. Six permutations balance group position; case order alternates during the common six blocks. Additional six WebKit Swipe blocks retain position balance. Every engine's groups execute in the same job/runner/build. Chromium versus WebKit normally uses separate runners and is not a paired same-runner engine comparison. OS/cache effects may remain despite fresh browser/context.

`plan.json` with plan hash is written before browser execution. Raw per-trial JSON, report, trace and assigned A3 PNG are retained for PASS, FAIL and INCOMPLETE. No failure-only extra screenshot is inserted into A1/A2. Aborted runs remain partial and missing records fail the audit. Original artifacts are never overwritten.

## Technical gate and negative controls

The contract compares externally expected HEAD/tree/matrix, fixed plan/order, input API sequence, trace policy, primary and secondary reads, virtual command amounts, timestamps, source/build hashes and completeness. The auditor hashes all original files, reconciles per-trial JSON with report, and directly reconciles original trace `getAttribute` return values and screenshot order with the claimed primary/secondary observations. Rewriting a report's primary fields cannot hide a conflicting raw trace. Cryptographic hashes bind retained bytes; they are not a claim of tamper-proof execution against an adversary rewriting all evidence.

Negative controls cover truncation, missing records, changed order, stale HEAD/build, altered state or clock, extra waits/reads/images, hidden page errors, false COMPLETE and primary FAIL→PASS replacement. These are contract/evidence mutations, not injected product defects or proof of timer causality. Diagnostic COMPLETE and product PASS are separate aggregates; the diagnostic workflow can succeed with retained product failures.

## Hypotheses and acceptance policy

H1 callback incomplete, H2 update requested but commit delayed, H3 commit/read timing gap, H4 extra API processing effect, H5 screenshot effect, H6 clock/event-loop interaction, H7 different Swipe/Status causes are evaluated separately as SUPPORTED/REJECTED/PARTIAL/UNKNOWN from actual evidence. Normal trials never establish failed-trial internal history. Small failure-rate differences are descriptive only, not significance or causal proof.

The final report will separately state A overall, B technical diagnostic acceptance, C group counts/comparison, D Swipe transitions, E Status, F observation effect, G H1–H7, H negative controls, I final formal16 and regressions, J HEAD/artifacts/retention, K unresolved limits, L merge recommendation. Current cause UNKNOWN and product merge recommendation NO.

Artifacts use the previously authorized GitHub Actions store, 30-day retention for new diagnosis. Record GitHub's actual `expires_at` after execution. Preserve original ZIPs and SHA ledger outside expiring artifacts before expiry; local retained copies are not a durability guarantee. Old artifacts and their recorded dates remain separate. Related #44/#54, Image Adjustment native WebKit touch and WAAPI timing issues remain unresolved where previously unresolved. Real Safari/VoiceOver/physical input remain NOT_TESTED.

## Pre-execution review checkpoint

Independent review identified and reproduced a false acceptance of a forged trace with an inserted evaluate operation and a wrong-element final read. The verifier now specifies the entire expected protocol API sequence, selectors and important parameters independently, rejects extra/changed operations, and binds the raw pause-origin response. A second provenance gap was repaired by retaining original build-manifest bytes and verifying their SHA/data, the actual runner and committed source hashes, plus actual output hashes when the build is present. Same counterexample negative controls now reject those mutations.35 new and46 retained diagnostic tests pass (81 total); these are technical contract tests, not90 browser trials.

A broad lint invocation in the evidence-heavy local checkout was killed; its log is retained. Focused changed-file lint passes. Clean isolated-checkout lint/typecheck/full regressions and CI still need to establish the final result. The shared /tmp is full, so task-local TMPDIR is used without deleting shared files.
