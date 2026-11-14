# Phase 7D: observation API isolation, preregistered protocol

Baseline: 421f9506afb8f9efa5aa20ae0fea4ac9b11e8bc7, tree 241499ad87b38b745a295a6536bd6d3087e2db1a. Issue #87 / Draft PR #88. This is a new experiment and does not replace either prior 90-trial experiment or the earlier 36 trials. Baseline final 82 primary PASS / 4 primary FAIL / 4 prefix INCOMPLETE, formal 16 conditions / 96 work-conditions PASS and 15 successful / 2 failed workflows remain recorded. Swipe and Status causes UNKNOWN; product merge recommendation NO.

## Archive first

The current archive inventory is `api-isolation-archive-ledger.json`. Original ZIP SHA verification and temporary retention are distinct from durable storage. The two priority artifacts were freshly downloaded from GitHub and matched to the requested hashes. Existing earlier ZIPs were matched to current GitHub artifact digests. No recompression, original overwrite, public repository upload, unapproved alternative transfer or shared temporary-file cleanup was performed.

No destination-specific approval for these original ZIPs was found in the available approval record search. Destination, private ACL, write capacity and continuity therefore remain unverified. G = ARCHIVE_BLOCKED, durable readback NOT_TESTED. Required next input: approval for these ZIPs and their SHA ledger in a specific private durable folder/bucket, with enough space and readable retention/access policy. This block does not turn temporary storage into durable storage or disappear when experiments succeed.

## Fixed operations

The new runner reuses the prior input/prefix sequence and uninstrumented A build. No product, dependency lock or formal acceptance runner change. Original input coordinates, keyboard/Replay sequence, target expected states, 500 ms Swipe and 3000 ms Status advances and 9000 ms timeout are unchanged. No additional virtual-clock advance, arbitrary wait, start barrier or deadline extension.

Every group performs exactly one original `root.getAttribute('data-state')` immediately after the target advance. Primary PASS/FAIL is frozen and synchronously written to an exclusive per-trial primary JSON before any group-specific API. This host-only common persistence consumes real time and is disclosed as common observation bookkeeping. All groups then perform exactly one identical `root.getAttribute('data-state')` followup, using the same root/selector/API. Intermediate operations alone differ:

- N0: no intermediate browser API.
- N1: exactly `page.evaluate(()=>null)`. It intentionally performs no DOM read or write and returns null; it is not assumed neutral to event-loop processing.
- D1: one additional `root.getAttribute('data-state')`.
- S1: one `page.screenshot()` before the common followup.

Only S1 receives a PNG. No failure-only screenshots, hidden extra reads, polls or retries. API-only tracing has screenshots=false, snapshots=false, sources=false. N0 is not unobserved: common primary/followup reads, trace, host bookkeeping and browser lifecycle still intervene. Host monotonic durations and commanded virtual-date ledger remain separate time axes. Clock origin is read only at the pre-existing origin operation.

## Fixed 120 trials

WebKit Swipe: 12 per group (48). WebKit Status: 6 per group (24). Chromium Swipe and Status: each 6 per group (24 + 24). Fresh browser and context per trial. All groups in one engine share one runner and one build. Separate hosted engine jobs are not paired runner comparisons. OS cache independence is not claimed.

Four Williams rows are fixed: N0 N1 S1 D1; N1 D1 N0 S1; D1 S1 N1 N0; S1 N0 D1 N1. Case order alternates and Status shifts by two rows. Twelve-block position counts balance exactly; six-block position counts are necessarily 1 or 2 (minimal imbalance), not falsely called exact balance. The complete executable plan is in `scripts/phase7d-api-plan.mjs`. Before launch, `plan.json` and `plan.sha256` record order, all trial IDs, HEAD/tree, runner/build hashes, OS, Node and Playwright version and registration timestamp. No sample-size reduction or success-based stopping is allowed. Prefix INCOMPLETE and intermediate failures remain explicit.

## Evidence and validation

Preserve report, per-trial JSON, primary JSON, API-only trace and assigned PNG; record head/tree, browser/version, Playwright, OS/runner, viewport/motion, input order, virtual commands, original primary and followup, host start/end times, pageerrors and file hashes. Source and build hashes bind the unmodified A build. Every manifest file and original trace API parameter/result is reconciled; no-op expression/return, identical selectors, screenshot order, virtual commands and incomplete prefixes are explicitly checked. The primary snapshot and followup never overwrite one another.

Contract controls cover primary FAIL-to-PASS replacement, missing followup, wrong selector, inserted API, disguised no-op, screenshot reordering, extra virtual advance, concealed prefix failure, old HEAD, JSON/trace inconsistency, ZIP/SHA mismatch and trial count/order changes. These are contract/evidence mutations, not claims that all defects were injected into the live product. Raw ZIP digest readback and a separate independent reviewer are required; no self-review is described as independent.

## Hypothesis interpretation

Use this experiment's definitions, distinct from earlier H labels:

1. H1 ordinary asynchronous progress.
2. H2 no-op API changes progress.
3. H3 DOM-read-specific action.
4. H4 screenshot-specific action.
5. H5 virtual clock/event-loop interaction.
6. H6 delayed React commit.
7. H7 different causes in Swipe and Status.

Assign SUPPORTED / REJECTED / PARTIAL / UNKNOWN / NOT_TESTED individually. A transition in N0 or N1 weakens a claim that an extra DOM-read-specific operation is necessary, but N0 still includes its common followup read. API durations are confounded with API identity; rates alone cannot establish causality. No internal callback/update/commit measurements are included here. A separate instrumented group would need to reproduce the same failure before failed-trial internal cause attribution. General causes remain UNKNOWN absent that evidence. Do not repair the product by guessing.

## Final gates

A plan preregistration; B all 120 attempts and retention; C original/trace consistency; D hypotheses; E final-head formal 7D 16 conditions/96 work-conditions; F WAAPI2A/B; G private durable original ZIP readback/SHA; H independent review; I overall; J product merge. Keep these separate. Run lint/typecheck/build/unit/contracts, 7A/B/C and all existing required workflows on the final HEAD. Current or historical WAAPI2A 220/220 ms failure is a separate unresolved issue. Failure, pending and missing evidence never count as PASS. Results go to existing Issue #87 and Draft PR #88; no Draft release, merge or deployment.
