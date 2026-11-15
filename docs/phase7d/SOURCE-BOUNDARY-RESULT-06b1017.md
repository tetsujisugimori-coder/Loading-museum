# Execution-source and isolated-browser follow-up

## Judgment and identities
Overall **PARTIAL**. Source/body preservation and synthetic contract regressions PASS; actual-browser safety scope **BLOCKED**, product acceptance NOT_ESTABLISHED, production108 NO, merge NO, Draft retained. Swipe/Status Morph causes UNKNOWN.

Start90e91adfae8475525d842cd0828e90b2417521c5/tree92c627478dff18698ff16c6ec0b28f1a2cb78917 was review-document-only. Tested implementation06b101712f6d9b54b97c7ca3a973bb6c3f47ab14/tree8cb4223f861e2199894096862420f4f9d6fdd75c. This result document is a later documentation commit, not the code tested. Normal Git push authentication was unavailable; the authorized GitHub connection created the same staged tree and fast-forwarded the existing branch with exact expected parent, force=false. Remote and local tree/readback matched.

## Changes and counterexamples
Ten implementation/plan files: execution-source module/tests/contract; isolated runner/classifier/auditor/tests/plan; safety workflow; LOG. No product component, dependency lock, formal expected value, deadline or Pages setting changed. PR introduction now preserves the complete old body as history and separates new progress.

Actual source bodies and original Git blob bodies are captured before new workflow commands and isolated builds/browser preparation. Fixed path sets, size/rawSHA256, Git commit/tree/blob are independently read back. Git blob framing uses SHA1 of `blob <length>\0<body>`, not raw SHA256. Missing body, one-byte alteration, coordinated body/hash alteration, extra source, wrong HEAD/scope/blob and set mismatch are rejected. LF/CRLF correspondence is separate from raw-byte identity; dependency package bodies and transient change-then-restore are not proven.

Independent pre-execution review found three blockers and confirmed their corrections using the same cases: wrong state accepted as normalPASS; copied/transformed source/build self-assertion; mutable supposedly fixed settings. Final source15+isolated24+existing67 contracts =106PASS. Build normal/corruption controls reject missing/altered/extra copied source and changed manifests, while legitimate primaryFAIL remains FAIL. These are synthetic/controlled contract checks, not actual browser fault injection.

## Fixed actual execution
14 predeclared slots, maximum12launch attempts, no retries. Both isolated normal/injected Next builds completed; prebuild/prebrowser each384actual source bodies, copied-source transformation from Git, output manifests and bytes passed separate-process and independent-person audits.

The first Chromium normal launch aborted before a context/page existed: `socket() failed: Operation not permitted (1)` at process_singleton_posix.cc292, SIGABRT; crashpad also reported missing database. This is a launch-environment blocker, not the investigated product assertion or an intentionally injected native crash.

Fixed stopping policy preserved14individual records and aggregate: attempted1, successful browsers0, primary observations0, INCOMPLETE1, NOT_TESTED13, process exit1. Raw `realBrowserLaunches:1` means launch attempts, not successful browsers. Raw `NORMAL_CONTROL_FAIL` means normal control could not be established, not productFAIL (primary is absent). No HAR/trace/HTTP response bodies exist because no context started. Build-byte identity does not establish browser execution-byte identity.

Actual Chromium/WebKit normal controls, cleanup/save/interruption injections and Next/React operations remain NOT_TESTED. Dependency ldd preflight had passed but did not prove runtime socket permission. No changed flags, security settings, retry or additional slot was used.

## Historical CI and evidence
Reviewed4aeaa46 had19PR+1push workflows,17success/3failure; these are not currentHEAD CI results.
- Formal7D43656923580: Chromium8PASS; WebKit4PASS then765normal Status Morph Loading!=Error at55:471, remaining3NOT_TESTED.
- API43656923689: independent72raw-row recount60PASS/4FAIL/8NOT_TESTED;64COMPLETE/8INCOMPLETE.
- WAAPI2A43656923683: observation failure; no common-cause assertion.
- SafetyPR43656923669/push43656920094: contracts succeeded, fixture skipped. Oldsource bodies were absent, not repaired retroactively.

Baseline81artifacts: old10preserved. Six needed Boundary originals expiring2026-12-15 additionally preserved/read back:16,339,266bytes, officialdigest/size/allbytes/outerCRC/12nestedtraceCRC/60trialmanifest entries verified. Primary11PASS/1FAIL (WebKitStatusC Loading),12COMPLETE. All six lack declared.nojekyll and source/dependency bodies; full build/source preservation not claimed. Count16/81;65unrelatedsuccessful regression originals remain NOT_PRESERVED, expiry2027-02-13, explicitly deferred rather than used for this limited judgment.

New isolated original ZIP:126,027,933bytes, SHA256 `5240f9fd386018d08e39b1f2d3153d506692fcec1b4725549fb49a200f6e5678`,5868manifest files/190,722,507raw bytes. Includes actual copied sources/builds and all fixed records; excludes node_modules/.next/browser-cache, with exclusions explicit. Library saved original was actually reobtained by the independent reviewer: all bytes/size/SHA,5869 ZIP entries CRC and5868manifest file sizes/hashes PASS; no private download URLs are committed.

Windows remains offline and new transfers NOT_TRANSFERRED, not classified as capacity/permission failure. Library access scope/retention UNKNOWN; byte integrity is separate. Historical two formal7D originals remain in Library, no new Windows transfer inferred.

## Local checks and outstanding work
Fresh108dummy registration has108unique slots, allrecorded, synthetic firstFAIL1 retained, production0. Preliminary local standard check discovered isolated work-copy tests and failed6injected-copy cases (`validation fault requires boundary sink`), not a product regression. That log and its missing pre-command capture qualification are retained. A separate clean checkout canonical check uses pre-command raw-source capture; it passed lint/typecheck/build,729Vitest+218Node, exit0, with384source bodies read back before/after. This is not a retry of browser slots or removal of oldFAIL. Windows canonical equality awaits new CI.

06b1017 automatically triggered20CI; safety push43667344021/PR43667348288, formal7D43667348305/API43667348398/WAAPI43667348304. Final documentation HEAD CI must be read independently; no manual dispatch. Pending CI/artifact readback is not PASS.

Next: establish a browser-capable isolated execution environment and obtain a separately fixed authorized validation plan, without reusing blocked slots or enabling production108. Full actual-browser/NextReact evidence, finalCI/artifacts and Windows transfer remain open. No product repair is inferred from these infrastructure results.
