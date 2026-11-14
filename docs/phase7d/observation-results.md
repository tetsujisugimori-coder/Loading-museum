# Phase 7D A1/A2/A3: recorded results and final-candidate status

## A. Overall

PARTIAL. Root causes UNKNOWN. Product merge recommendation NO. This report records experiment1 at f7d1bb68f529e45a5a7a03aec2a1acb2111ea8fc (tree cdb63d51f6767f0950fb8f7a64c0884640021471). The following report/auditor-only checkpoint will have its own exact-HEAD CI and independent review; those later results must be reported separately, never substituted for this experiment.

## B. Diagnostic technical acceptance

The planned90 attempts all exist:87 COMPLETE,85 primary PASS,2 primary FAIL,3 target NOT_TESTED/INCOMPLETE. Evidence-integrity checks pass, while the completeness gate correctly exits1 for the WebKit job. This is not90 successful trials, not a Green workflow and not universal product acceptance. Local same-tree clean-copy lint (four pre-existing warnings), typecheck/build and894 aggregate tests passed.35 newly added and46 retained diagnostic tests passed. Four additional incomplete-trace negative controls are added in the final-candidate checkpoint, bringing the new contract suite to39. These counts are separate from real browser trials.

## C. A1/A2/A3 comparison

Rows below are primary PASS / primary FAIL / target INCOMPLETE, not success percentages with missing trials removed.

| Engine/work | A1 | A2 | A3 |
|---|---|---|---|
| WebKit Swipe | 10 / 1 / 1 | 12 / 0 / 0 | 11 / 1 / 0 |
| WebKit Status | 5 / 0 / 1 | 5 / 0 / 1 | 6 / 0 / 0 |
| Chromium Swipe | 6 / 0 / 0 | 6 / 0 / 0 | 6 / 0 / 0 |
| Chromium Status | 6 / 0 / 0 | 6 / 0 / 0 | 6 / 0 / 0 |

The intended count was not reduced.54 WebKit attempts and36 Chromium attempts ran. Three original-prefix assertions failed before the target, so the relevant complete group counts remain below12/6. No replacement successes are silently appended. Within each engine, groups share a runner and build with balanced order; engines ran on different hosted jobs. Small observed differences and incomplete denominators do not establish significance or causality. API-only trace differs from the old A/B/C trace policy, so those rates are not pooled.

## D. Swipe reproduction and transition

Two target failures after the unchanged pointer sequence and500ms advance:

- WebKit A1-10: primary `dismissing`; no further DOM read or image acquisition was performed, as predeclared. Its later state is UNKNOWN.
- WebKit A3-6: primary `dismissing` → pre-image DOM `dismissed` → PNG visually `dismissed` → post-image DOM `dismissed`. Original trace confirms the sequence and the primary FAIL remains FAIL.

For A3-6, host-monotonic intervals (ms, one process): target runFor99369.228205–99372.148341; primary read99372.158821–99379.258919; pre-image read99379.273616–99387.133987; screenshot99387.145338–99584.685042; post-image read99584.704188–99588.199953. All later observations use the unchanged commanded virtual date1794360035076. The virtual value is a command ledger, not an independently sampled callback or commit timestamp. These two clocks are not converted or subtracted across domains.

The state was already terminal in the pre-image DOM read. Thus the narrow explanation “only the screenshot made this particular trial complete” is contradicted. Added DOM API calls, elapsed real processing and other shared observation effects remain confounded. No exact timer callback or React commit time is claimed.

## E. Status Morph and prefix failures

Target repeated-Replay Error expectation: WebKit16 reached/16 PASS, Chromium18 reached/18 PASS. The old Loading-versus-Error failure was not reproduced at this target in experiment1; it is not resolved.

WebKit Status A1-4/A2-4 failed the existing earlier success-prefix assertion: after Replay+3000ms, expected Success but read Loading. WebKit Swipe A1-5 failed the existing keyboard prefix after500ms: expected dismissed but read dismissing. All three traces/JSON remain in the artifact and target results are NOT_TESTED. These are real nonterminal prefix observations, not resource shortages and not equivalent to the target sequence. Their internal causes remain UNKNOWN.

## F. DOM and screenshot effects

The first read is unchanged across groups. A1 adds nothing; A2 adds four reads; A3 adds read/image/read. A3-6 establishes a transition between separate DOM observations before screenshot acquisition. It does not establish that the read itself caused the transition. A2 had no failed target requiring a recovery observation in experiment1. No “A2 fixes the bug” or “screenshot causes completion” conclusion is justified.

## G. H1–H7

| Hypothesis | Verdict | Evidence boundary |
|---|---|---|
| H1 timer callback incomplete at first read | UNKNOWN | No internal callback probe in these groups. |
| H2 callback complete but React commit delayed | UNKNOWN | No internal callback/request/commit boundaries. |
| H3 commit complete but DOM read delayed | UNKNOWN | Separate read results do not timestamp commit. |
| H4 extra Playwright APIs influence progress | UNKNOWN | Transition between reads observed, intervention versus elapsed processing not isolated. |
| H5 screenshot influences rendering/progress | UNKNOWN | General effect unmeasured; screenshot is not necessary for the observed A3-6 terminal read. |
| H6 virtual clock/event-loop interaction | UNKNOWN | Fixed command ledger plus asynchronous observation difference is compatible with multiple causes. |
| H7 Swipe and Status have different causes | UNKNOWN | Distinct targets and prefix observations; neither sameness nor difference is established. |

The narrower screenshot-only explanation is rejected for A3-6, not H5 universally. Normal trials cannot supply failed-trial internal history. No product fix is justified by this evidence.

## H. Diagnostic improvements and negative controls

Retained existing uninstrumented-build preparation, original product/prefix input and deadlines. Added fixed balanced plan, API host timings, separate virtual command ledger, immutable primary, pre/post image states, preserved incomplete records, original trace reconciliation and SHA-bound raw evidence. The auditor checks HEAD/tree, actual target-HEAD runner and source, original manifest bytes, actual output hashes in CI, entire protocol API order/parameters/selectors, and raw read results. Incomplete traces now also verify the executed prefix rather than escaping raw validation.

Independent review reproduced a forged-trace acceptance (wrong element plus inserted evaluate) and missing provenance binding; same-counterexample checks now reject these.39 new contract tests include missing/aborted records, wrong order, stale HEAD/build, changed states/clocks, extra reads/images/waits, primary FAIL replacement, original-prefix tampering and truthful incomplete retention. These are evidence mutations, not a claim that all faults were injected into the live product.

## I. Formal CI and regressions

Experiment1 diagnosis: https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42937810064

Its WebKit workflow correctly fails the completeness gate; Chromium workflow succeeds with36 complete primary passes. Original-byte audits distinguish integrity PASS from completeness PARTIAL and product FAIL.

The original f7d1 formal16 run is42937809750. Formal7D16 conditions and related7A/B/C, WAAPI and other registered regressions must be checked again on the final checkpoint. Pending jobs are not PASS. Final exact-HEAD statuses and independent artifact reconciliation are to be attached to the existing Issue/PR after they finish. The earlier6653 formal16 PASS does not discharge this requirement or erase either original or newly reproduced failure.

## J. Evidence, HEAD and retention

The committed `observation-experiment-1.json` is a derived index of all90 attempts, group counts, primary/secondary/timing records and SHA references, not a replacement for original artifacts.

- WebKit artifact13818764205: SHA256 6ab565bd3bcc1ee22f4de5927bef9c2bea28d8fd004962f1142c6cac735a2d76; expiry2026-12-11T01:21:28Z.
- Chromium artifact13819208569: SHA256 f4b8d21f5408d1eddd38dcc7d4f52e52e86fd3503fdbb41be81647db7fdd71b1; expiry2026-12-11T01:22:12Z.
- Both original ZIPs were downloaded, SHA-matched to GitHub and retained locally with extracted JSON/trace/PNG and source/build manifest. Plan, per-trial JSON and report hashes are reconciled. Independent reviewer visually checked the A3 failure PNG and audited WebKit originals.
- Playwright1.56.1, Linux7.0.0-1017-azure x64. Exact browser versions and per-job provenance are in the committed index/original JSON.
- New artifacts retain30 days. Copy ZIPs plus SHA ledger to an authorized durable archive before expiry; current local copies alone are not a guarantee of long-term durability. No new third-party store is used. Prior run42894048407 and42909089704 originals remain preserved separately.

## K. Unresolved and NOT_TESTED

Root causes, internal callback/commit times, read-versus-event-loop causality, equal neutrality of observation groups, exact OS/cache effects and physical Safari/VoiceOver/physical input remain unresolved or NOT_TESTED.292 exhibits/13 rooms, old IDs/classification/URLs/search and product sources remain unchanged. Existing #44/#54, Image Adjustment native WebKit touch and WAAPI timing issues are not declared solved. Shared /tmp exhaustion caused local sandbox startup failures; task-local workspace TMPDIR was used and no shared files deleted. The evidence-heavy checkout lint was killed; the clean isolated copy passed lint/typecheck.

## L. Merge recommendation

NO. Diagnostic improvements and the screenshot-before/after counterexample are useful; they do not justify a causal product repair or product acceptance. Draft remains, no main merge, no deployment/publication, no timeout/timer extension, no arbitrary wait, no expectation relaxation and no skipped WebKit.
