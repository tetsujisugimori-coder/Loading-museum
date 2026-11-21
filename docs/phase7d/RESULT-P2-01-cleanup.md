# P2-01 cleanup exception result

## Scope and identity
Baseline b796f8e565dae5beb70d6655af6c99479d05337d, base416a04aad057eeee41157b86383ccdf22ec91d0f. Implementation candidate1b2d81c38d794fd2ce0662a7e5fda83386955928/treea5977e26e8d5d023f317257d841e04aa5aa9b689. Later documentation commits must not be confused with this tested source identity; final CI is separately pending.

## Same-condition RED/GREEN
Independent isolated clone and unchanged complete synthetic Playwright substitute:
- Old normal: eight records, exit0. First normal context.close rejection: zero records, exit1.
- Candidate normal: eight PASS records, exit0. Same rejection: one INCOMPLETE plus seven NOT_TESTED, eight individual records, primary observation retained, browser.close attempted, exit1.
- Original stub without trace/HAR/HTTP is now rejected even when operations appear normal. This is required missing-evidence rejection, not normal complete evidence.
- Additional independent late-pageerror counterexample was accepted before correction; unchanged counterexample after correction preserves the primary observation and records cleanup.pageerror/INCOMPLETE.

All above are synthetic API substitutes, NOT actual Chromium/WebKit execution. No new real-browser run or manual dispatch was performed in this follow-up. Product React-boundary and Next-build-byte coverage remain NOT_TESTED.

## Checks
Existing safety42 plus new cleanup25 =67 PASS. Cases include normal, context/browser/both close errors, trace failure/missing, HAR finalization/missing, late pageerror/capture, operation+cleanup, individual/aggregate persistence failure and setup failure. Empty/short/duplicate/order/semantic/evidence inconsistencies are rejected by aggregate checks. The normal path is accepted without weakening expectations.
Linux npm run check PASS: lint/typecheck/build,729 Vitest and218 Node checks. Initial local build failure was Turbopack refusing an external node_modules symlink; its raw log is preserved. Using ordinary local dependency files fixes this environment issue without product changes.
Actual repository dummy run in a new directory:108 planned unique slots,108 dummy attempts recorded, synthetic primary FAIL1 retained, production108 NOT_EXECUTED (productionTrialsExecuted0).
Windows npm run check and67 safety tests PASS (exit0); actual-repository108 dummy retains primaryFAIL1/production0. Linux/Windows declared test-set fields and source hashes match excluding the platform label. Final documentation-head CI remains pending; no pending result is inferred PASS.

## Historical CI separation
Old fb4 manual run43651015237 attempt1: Windows/Linux contracts success, fixture failure at sourceInventory Git cat-file ENOBUFS before browser launch; eight slots NOT_RUN. Subsequent missing-directory audit failure is not P2-01. Raw three artifacts retained with official digest/size/SHA/CRC Windows verification.
Baseline b796 has separate PR19 and push1 runs, including pending, cancelled, success and failure states. Candidate1b2d81c PR19/push1 were queued at snapshot. No rerun/dispatch was requested.

## Preservation and review
Independent review https://github.com/tetsujisugimori-coder/Loading-museum/pull/88#pullrequestreview-5908039058 was posted and read back. No remaining blocking P1/P2 in the bounded cleanup fix at independently checked bytes. This is not proof against arbitrary OS termination or permanent storage failure.
Core evidence ZIP:1,626,718 bytes, SHA-256908d6af088ff4577c11ca8d5b09eea255894562edd57ce1e0ca3a13b5f3d04f4, Library saved and independently re-downloaded on Windows: full bytes/SHA/CRC/all956 manifest entries and bundle bytes PASS; supplementary raw generated test records and final documents retained separately. Windows independent readback status and exact locations appear in final PR report. Library access scope/retention UNKNOWN, separate from byte integrity.

## Decision
Bounded P2-01 synthetic regression closed; overall PARTIAL until required final CI and wider safety gaps are resolved. Production108 NO, PR88 merge NO, Draft maintained. Swipe/Status Morph root causes UNKNOWN. No product repair, main change, force push, publication, old-evidence overwrite or shared Temp cleanup.
