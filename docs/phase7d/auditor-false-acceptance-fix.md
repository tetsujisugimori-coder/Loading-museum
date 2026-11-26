# Boundary auditor correction (PR #88, synthetic evidence only)

## Scope and acceptance

Baseline `3c775369f32163ce9a59450de900728b70d48ee3`. Overall **PARTIAL**. Production108 **NO**, merge **NO**, both product root causes **UNKNOWN**. No application, runner, clock advances, timeout, formal expectation or production gate changes. No browser trials were run for this correction.

The original six counterexample byte files were **NOT_OBTAINED**. The published review describes B/C × invalid-single-event / reverse-clock / operation-ID corruption but does not include their exact inputs. We reconstructed those six categories using the baseline audit test fixture and froze all bytes and SHA-256 in `tests/fixtures/phase7d-boundary-audit-red/`. All six were accepted as PASS/COMPLETE by the unmodified baseline. They are **new reconstructed counterexamples, not proof of byte-identical original reproduction**. This unmet completion criterion prevents overall technical PASS.

The original baseline B/C fixture itself has only a malformed commit event (no work/generation/operationId or sink schema). Frozen inputs are not silently repaired. A separate complete schema synthetic fixture covers B/C × Swipe/Status. Additional negatives start from that valid fixture, so rejection does not depend solely on malformed original headers. Normal fixtures are synthetic contracts, not browser execution evidence.

## Correction

- Validate canonical instrumentation (conflicting aliases rejected), sink types/identity/limit, present events even for INCOMPLETE records.
- Exact event fields and group/phase/work/trial identities; continuous sequence; safe numeric generation/token; operationId derived exactly as emitter (token before generation).
- Date-clock monotonicity, performance-clock monotonicity after first state-request/operation-start. Clock.install happens after initial mount: pre-install performance epoch is not independently identifiable and is not compared across that boundary. Neither clock is compared numerically with host time or the other clock.
- Synchronous commit→DOM and cancellation request→processed pairs, C operation/registration/callback/guard relationships, guard values and captured generations. Duplicate registrations rejected; null cancellation rejected.
- Fault markers require matching validation-only build fault metadata; normal records cannot activate injected-guard exceptions. Directory audit supplies metadata only after its existing build-manifest/hash checks. Independent HEAD/tree/blob provenance is still a separate missing guarantee.
- DOM observations allow arbitrary string/null, preserving an unexpected product state rather than declaring it invalid evidence. Initial/request-free commits and repeated renders are allowed. Missing callback alone does not invalidate a complete collection or prove non-firing.
- Product primary PASS/FAIL stays independent of evidence COMPLETE/INCOMPLETE. Existing raw trace, host journal and immutable primary comparisons remain. These detect inconsistencies, not coordinated rewriting of every trust-chain artifact.

## Synthetic verification

- Baseline existing auditor tests: 37 PASS.
- Six frozen reconstructed negatives: baseline accepted all six; modified auditor rejects all six, hashes unchanged.
- First new-suite baseline comparison: 112 tests, 40 PASS / 72 expected RED failures. These numbers describe audit-test assertions, **not product trial outcomes**.
- Separate B/C × Swipe/Status normal, valid product FAIL without callback, overflow/INCOMPLETE, unknown DOM observation, repeated renders; negative schema/phase/work/ID/clock/sequence/guard and aliases.
- Independent reviewer found additional guard-generation, null-cancellation, fault-marker, duplicate-registration, extra-header cases plus DOM over-rejection. Fixed and added regressions; the first corrected aggregate had 249 PASS (boundary + old API contract + diagnostic instrumentation). Final execution logs and exact candidate identity are reported separately on PR.

## Limits and next gates

COMPLETE means collection satisfies this contract, not independently proven recording completeness of every internal event. Arbitrary loss with coordinated resequencing/rewriting may be undetectable. Callback absence, host operation attribution, instrumentation neutrality and causes remain UNKNOWN. The raw trace records the collected sink but does not independently observe internal callback execution. Some lifecycle generation changes bypass explicit request hooks; no invented mapping to host API is asserted.

Original formal7D, API and WAAPI failures remain historical failures; new synthetic success does not resolve them. Real commit-delay/cancel-race/DOM-delay injection, production108 execution/recovery and independent HEAD/tree/blob binding are separate work. New evidence durable archive/readback remains **PENDING** until confirmed; existing32ZIPs were not rehashed in this correction. No product acceptance, Draft release, merge or publication.

## Independent final correction review

A separate reviewer executed the focused suites: **256 PASS / 0 FAIL / 0 SKIP**, diff whitespace check PASS. Previously found guard-generation, null cancellation, duplicate registration, unbound fault marker, unexpected sink attribute and validationId alias defects are rejected; positive stale callback, fired-timer cancellation, direct Cancel, unknown DOM and repeated render controls are accepted. No additional major unresolved issue was found in that bounded search. Overall remains PARTIAL because original-six identity, exact-head hosted CI and durable archive are separate gates.

Reviewed auditor SHA-256: `7724e99e35bd4e3f7b1af21a3dccd8d81ed694750c16aca1240f50885d60ee3c`.
