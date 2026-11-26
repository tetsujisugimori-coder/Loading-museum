# API offline diagnosis — phase A frozen before WAAPI investigation

Original run43708599257 / attempt1 / HEAD179234d4351a988afcc7631795c7e162c8eb7882,
tree2cf11528672af37db548fed2a46be3dcb8ccfae4. No new browser execution,
dispatch, product adjustment or experiment-plan change is part of this diagnosis.
Technical original-evidence audit and offline diagnostic tests are separate from
product acceptance. Overall PARTIAL, root causes UNKNOWN, production108 NO,
merge NO, Draft retained. Private original ZIPs, traces, full ledgers and execution
details are retained only in the approved Windows Vault, not public Git.

## Immutable baseline

WebKit artifact14160131687: 3,845,907 bytes, SHA256
56ce13137e430fe06be514bf093284c1ec870a93babba38cb8e1d04778afb31d.
Chromium control artifact14159454338: 2,966,627 bytes, SHA256
fe9e53e8212a3a0f138ea54c63d2a63178f1e8c417ca67304ae37aa60b570271.
Official identity/size/digest, ZIP/trace CRC, internal file hashes, raw trial/report,
original primary bodies and fixed Git source hashes were checked. The separately
uploaded build-manifest sidecar is required and byte-equal to the report-bound one.
Original audit PASS means technical evidence consistency, not product PASS.

| WebKit group | PASS | FAIL | NOT_TESTED |
|---|---:|---:|---:|
| N0 | 18 | 0 | 0 |
| N1 | 14 | 1 | 3 |
| D1 | 17 | 1 | 0 |
| S1 | 15 | 1 | 2 |

Total72:64 PASS/3 FAIL/5 NOT_TESTED; diagnostic67 COMPLETE/5 INCOMPLETE.
Chromium48 PASS. Raw trace reconciliation is67 complete PASS plus5 verified
interrupted prefixes for WebKit, not72 completed product successes.

The three FAILs are webkit-swipe-S1-1, webkit-swipe-N1-2 and
webkit-swipe-D1-5. All preserve primary=dismissing/FAIL, followup=dismissed/PASS.
The D1 intermediate read already returned dismissed. The S1 original image also
shows dismissed, but is a post-primary observation, not primary-time evidence.

Five NOT_TESTED trials stopped before target primary: status-N1-4/status-S1-4
observed Loading instead of Success at success-prefix; swipe-N1-7/swipe-S1-8/
swipe-N1-11 observed dismissing instead of dismissed at keyboard-prefix.
They are started trials with an unreached target primary, not unstarted trials
and not target product FAIL. All original IDs carry the `webkit-` prefix.

## Observation boundary and group isolation

For Swipe: keyboard prefix, Undo,300ms return prefix, drag130px, mouse-up,
target runFor500ms, one primary getAttribute, synchronous exclusive primary-file
write, assigned intermediate, one common followup. Status uses the inherited
cancel/success prefixes and two Replay target operations with runFor3000ms.

| Group | After primary persistence, before common followup |
|---|---|
| N0 | No intermediate browser API |
| N1 | evaluate(()=>null) |
| D1 | One extra data-state getAttribute |
| S1 | One screenshot |

All groups have the same kind-specific primary-before-intervention sequence.
Post-primary interventions cannot cause their own earlier primary observation.
Primary-rate differences are also confounded by trial order, host durations,
caches and common observers; group labels are not causal proof. N0 still has
trace, primary/followup reads, host persistence and lifecycle bookkeeping.

Automation input command boundaries and DOM value reads are OBSERVED. Handler/
timer callback start/finish, state-update request, React commit and DOM-reflection
event timestamps have NO_RECORDING_MECHANISM in this API plan. They are not
recorded absence of execution. Trace events in these originals are page-creation
notifications, not product callbacks. Expected files missing would be MISSING_RECORD
and rejected; prefix-unreached primary is NOT_REACHED. Cause remains INDETERMINATE.

The three primary-API-end to followup-API-end host intervals are approximately 129.50ms(S1),
6.50ms(N1),12.78ms(D1). Commanded virtual-date ledgers do not advance after primary.
This is not a direct browser clock reading at either observation and not a
conversion of host milliseconds into virtual time. The screenshot/no-op/DOM
operation durations differ; their separate effects are not identified.

## H1–H7 candidate register (not established causes)

| Candidate | Supporting/compatible evidence | Counterevidence or limit | Missing/minimum distinguishing observation |
|---|---|---|---|
| H1 callback start/completion | Acknowledged inputs and transient DOM state are compatible with delayed callback work | Later terminal observation opposes a permanent failure for these3 only; no callback probe | Same-generation callback enter/exit marker; absence cannot be inferred from current traces |
| H2 update request to commit | primary old state followed by terminal state is compatible with queued React work | No update-request or commit timestamp; cannot separate H1/H3/H4/H5 | Request marker paired with React layout-effect commit for the target generation |
| H3 commit to DOM reflection | The first DOM value differs from a later value | DOM reads are not commit/reflection event timestamps; node identity not directly tracked | Same-generation commit marker and DOM reflection observation, with measurement effect acknowledged |
| H4 measurement influence | Intermediates and common host gaps precede later reads | Assigned intermediates are after primary and cannot explain their own earlier FAIL; no-op/image/read have different durations | Separately approved finite comparison with fixed original input and declared measurement sites; neutrality UNKNOWN |
| H5 clock domains | Commanded virtual advance500ms and much shorter host API duration are distinct | No extra commanded advance before followup; browser time at primary/followup not sampled | Explicit paired clock evidence if separately authorized; added sampling is itself an observer |
| H6 generation/cancel race | Source uses epochs, invalidation and callback guards; prefix includes Undo/cancel | Runtime token/guard/cancel events absent; input trace is not internal event evidence | Target token/current generation and cancellation reason, without assuming guard rejection |
| H7 collection/classification boundary | Five prefixes stop before primary; immediate-clock-return/DOM boundary may sample transient state | Raw reads, primary bodies, plan membership and64/3/5 classification reconcile; no misclassification demonstrated | Retain fixed-plan/raw/summary/primary checks; distinguish missing recorder from missing record |

These are candidate explanations, not root-cause findings. Existing evidence
narrows the phenomenon to distinct sampled DOM states across host API boundaries,
not to one uniquely identified internal stage. Product scheduling versus the
inspection boundary remains unresolved.

## Diagnostic validity and limits

The new offline analyzer imports only pure existing contracts/trace specification,
reads original ZIPs without extraction or modification, and writes exclusive new
ledgers. It checks context, API/time order, manifest, primary bodies and fixed Git
commit/tree/blob hashes. Synthetic fixtures cover normal groups, FAIL followed by
PASS, unreached primary, missing trace/event/time, wrong context/HEAD, reordered
observations, extra advance/evidence and rewritten primary. Synthetic protocol
data are not passed off as real browser fault injection or historical traces.

No original auditor bug is claimed from these controls. Initial test-authoring
errors (shared synthetic object references and assertion-message/sequence matching)
are retained separately; correcting them does not relax a product oracle.

Independent review then found a real omission in the **new offline wrapper**:
five internally rebound synthetic registrations with foreign runner/version/build
identity or a post-start registration timestamp were accepted. This was not an
attack forging an official original ZIP digest and did not alter64/3/5. The old
original auditor already contained those guards. The wrapper now retains them,
also checking Node/OS identity; seven rebound registration controls are rejected.
The first A1 technical verdict/commit/archive remains immutable and is superseded
by a separate A2 verdict, commit and Vault stage before WAAPI begins. This new
wrapper defect is not evidence that H7 caused the historical product failures.

The API ZIPs do not preserve execution-source bodies or served build JS. Their
2116 source hashes match fixed Git179 and runner identity, but this is not direct
execution-byte attestation. Trace resources are absent and network records empty.
Another Boundary job's same-HEAD body preservation is not substituted for this
API job. Source-supported reasoning is conditional on these provenance limits.

Next minimum step, if later authorized: bind source/build/served bytes, predeclare
a finite subset of the existing inputs, instrument callback/request/commit/DOM
boundaries and generations in an isolated diagnostic copy, and explicitly test
observer effects. No such new trial is registered as executed here. No product
change follows from the current UNKNOWN result. Phase A's ledger/judgment is
frozen before phase B begins; WAAPI will use its own original run and evidence.
