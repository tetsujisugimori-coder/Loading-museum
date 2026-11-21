# Fixed-plan membership correction — review 5909931999

## Scope and fixed baseline

Baseline implementation `57dcdf3a9c9c12e69168d3eb6ca64f1995454b6b`, tree
`6b796c35ef421058718dc33a0e03a78f75172189`. Its parent is `004489c`.
This is an additional correction, not a repeat of the earlier P2-02/P2-03 work.
The baseline has 20 completed workflows: 19 success, one API failure. Those
results do not establish the new submitted revision's CI status.
No repository AGENTS.md is tracked at the baseline; the existing safety
contracts, source preservation workflow and prior result documents were read.

## Plan fixed before correction

Use the existing synthetic directory fixture. Keep plan, build source/output,
primary result, and top-level summary/raw identities fixed. Mutate row HEAD
alone, tree alone, both, missing HEAD, missing tree, and both missing. Keep raw,
summary and individual rows mutually consistent; for attempted rows, synthesize
trace navigation identifiers matching the changed row. Test each mutation under
COMPLETE, INCOMPLETE and NOT_TESTED. Before each mutation accept the unchanged
membership control. Preserve each mutated directory and replay its exact bytes
with the corrected auditor. No browser is launched and no historical trace is
modified or made public.

## Change

`auditIsolatedDirectory` now requires each row HEAD/tree to be present as strings
and equal to the fixed plan, before per-row evidence/trace inspection. The check
is unconditional: COMPLETE, INCOMPLETE and NOT_TESTED do not bypass membership.
A mutually consistent foreign row and trace no longer establish membership.
Product code, timeout, operation order and expectations are unchanged.

## Same-counterexample results

Reconstructed synthetic fixtures, not the reviewer's original private script:
18 new-rejection assertions failed on the unmodified baseline auditor. Independent
replay distinguished 12 actual misacceptances from 6 existing trace-level
rejections (missing identities on attempted COMPLETE/INCOMPLETE rows). The
misacceptances are HEAD/tree/both changes in all 3 states (9), plus missing
identities on NOT_TESTED rows (3). The original two HEAD/tree counterexamples
both returned auditIntegrity PASS / processExitCode 1. Every fixture's preceding
unchanged control was accepted. On the corrected auditor, the same 18 saved directories
were rejected with explicit row HEAD/tree membership errors. No hash corruption,
syntax error or browser timeout is used as the rejection mechanism.
The ordinary synthetic fixture still has 13 unstarted rows, hence its engineering
processExitCode remains 1 even when auditIntegrity is PASS. The original defect
was evidence membership misacceptance, not demonstrated overall process success.

## Verification status

Focused browser/error/trace contracts: 108 tests, 105 PASS, 3 NOT_TESTED.
The 3 private-original-trace tests remain absent in public execution. Synthetic
trace success does not replace a real browser positive control. Existing fake
23-byte ZIP, CRC, foreign trial, primary and raw/summary checks remain included.
Linux standard check exited 0 (lint, typecheck, build, 729 Vitest and 218 Node
tests). The other four safety contract files passed 85/85. Combined seven
contract files are 193 total, 190 PASS, 3 NOT_TESTED. An initial additional-contract
invocation from the workspace rather than repository cwd failed to locate the
workflow; its log is preserved, and the corrected-cwd invocation passed. This
was an invocation failure, not a product fault or successful negative control.
Independent review, submission identity and final CI are recorded separately;
uncompleted checks are not PASS.

## Preservation and limits

Original baseline evidence remains untouched. New same-byte replay inputs,
baseline failures, corrected outputs, source changes and logs are saved separately.
The connected Windows computer was offline at the start: Windows transfer is
NOT_TRANSFERRED, not a claimed write/permission failure. Alternative Library
preservation requires actual readback and independent size/SHA/CRC checks.
The old 65 unpreserved artifacts remain a separate backlog and are not included
in new preservation counts.

Overall PARTIAL; production 108 NO; merge NO; Draft maintained. API/WebKit product
failures and Swipe/Status Morph causes UNKNOWN remain separate. No new browser
trial, stopped-14 retry, manual dispatch, publication, main update or merge.
