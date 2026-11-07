# PR #72 investigation and acceptance boundary

Baseline: f7253d5af3fbbc57052c5bff3b7fc1c08ee6af87,
tree b14f6a275206d85083fc6c1c98c68548eb931fa0. Parent PR #70 remains
01e11d4bd15813cc6fe57c01623ef10b9836a335. No product, RGB, history,
dependency, lock or public deployment change is part of this follow-up.

## New evidence before repair

An independent clean checkout executed the scope tests: **five**, not the earlier
comment's six equivalent cases. That historical comment is not silently rewritten.
Three added scope test groups fail against baseline: runtime/style/recorder omissions,
malformed file evidence, and a watched file renamed to an unwatched path. Git rename
folding hid its old watched name and yielded an incorrect successful skip.
New Chromium/WebKit executions also showed fixture x/y=0 becoming 46/484 and an
observer unit sequence dropping lostpointercapture after an off-target pointerup.
The last is a synthetic observer test, not evidence of physical native delivery.

## Local changes and expected evidence

- Retain three-dot merge-base comparison; disable rename folding so deletion of a
  watched old path is visible. Include actual shared layout/CSS and recorder contracts.
- Execute scope/gate/record contracts on both CI OSes. `fileURLToPath` handles Windows
  paths. Invalid SHA, missing Git objects, diff failure, unsupported event and missing
  output fail closed; workflow_dispatch selects diagnosis explicitly.
- Keep the four native job names, and their real native acceptance failures. Add an
  always-run **Touch diagnostic gate**. A failed selector, absent decision, skipped
  selected job, failed regression or failed native job cannot produce a green gate.
  Unrelated changes are explicitly skipped by scope and can have a green aggregate.
- Run exact-head A5 sixteen browser conditions and the existing all-unit command on
  selected stacked PRs, rather than silently relying on main-only workflows.
- Record HEAD/tree/hash, trial/environment/provenance, positions, touch points,
  snapshot state and frozen final state. Export no longer adds a product UI button.
- Provide paired-record validation and three-repeat physical handoff. This does not
  execute a real-device test or distinguish engine vs backend causation by itself.

## CI policy limitations

Final independent scope audit found one more transitive dependency: the A5
result contract imports the sixteen-condition matrix from
`scripts/annotation-result-contract.mjs`. A change to that shared matrix was
incorrectly skipped. A recursive local-module dependency test reproduced RED;
the shared contract is now watched and the same test is GREEN. The combined
scope/gate/physical/native contract suite now contains 78 tests (previous 77
results remain historical evidence). No product or browser assertion changed.

No branch-protection or required-check settings are changed. The available GitHub
connector exposes no read endpoint for those rules; their actual configured required
contexts are UNKNOWN. Repository maintainers should consider the stable always-run
`Touch diagnostic gate` rather than conditional matrix names when later deciding
required checks. This is a recommendation, not a claim that settings were changed.
Dispatch selection is tested locally; a real GitHub workflow_dispatch is NOT_TESTED
unless a separately recorded run exists. PR-triggered Linux/Windows runs are reported
with their actual outcomes. Native failure remains failure even when the evidence
collector or recorder validation passes.

## Cause boundaries

Prior independent findings and new product/plain native taps agree: WebKit emits
trusted input 54 and pointercancel; product cancellation restores 0/history0, plain
HTML retains 54. React is not necessary for the cancel event. This establishes the
interaction and state response, not whether WebKit engine or Playwright's WebKit
input backend is defective. Engine/backend cause remains UNKNOWN. No cancellation
contract is relaxed. Physical Safari, physical touch and native WebKit drag remain
NOT_TESTED. Independent code/new-browser/raw-artifact review follows the final HEAD.

## Independent counterexamples found during this implementation

The first comparison implementation incorrectly accepted eight explicitly mutated
records, and the next candidate 86662 accepted three further cross-family gesture
mutations. Those failures are retained alongside the same-input rejection results.
Cancellation cannot be product PASS; pointer and finger identifiers, within-gesture
ordering, actual movement, both endpoints, input/final values and pending state are
checked. PNG validation now decodes pixels after CRC and IDAT checks. Synthetic
observer tests are NOT_TESTED for native product acceptance.

A unit-fixture alias was also found while extending these tests: mutation of a shared
viewport could contaminate subsequent negatives. Each fixture is now cloned, and each
negative first verifies its own unmodified positive control. Earlier counts are kept
as the results of those earlier test versions, not promoted to the final result.

Local broad browser run at 86662 did not complete: after initial successful cases it
hit a missing image-adjustment locator timeout. Shared /tmp exhaustion also occurred
during this period; causality is UNKNOWN. The failed original run is retained. A new
run with a workspace-local TMPDIR and final-HEAD CI is separate, not a reclassification.
