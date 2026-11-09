# Independent scroll-auditor fault tests

**Synthetic controls are never browser evidence.** This package tests the validator and aggregator. It does not claim a completed real 768-trial matrix, physical-device acceptance, causal attribution, or observer neutrality.

## Final result

- **67/67 final focused mutation expectations satisfied.** Two positive controls introduce no new target errors; all 65 negative controls reject. Two malformed outer objects throw rather than returning structured FAIL, which is fail-closed but less graceful.
- **16 actual Chromium row positives:** A–D × drag/tap × product/plain, width 375, normal motion, repetition 1. All **48 PNGs and 16 traces** pass the final binary verifier. These are representative positive byte checks, not a full matrix or WebKit check.
- **Nine copied-trace negatives all reject:** empty capture, missing final, identity-only capture, duplicate after hiding an input failure, duplicate before, capture error, input error, captured value mismatch, and absent screenshot calls.
- **12 explicit aggregate guard probes reject:** missing/null/non-array errors, context/browser cleanup failure, missing/false fullMatrix, missing/wrong expectedRows, and partial/unsupported/missing status.
- No repository implementation was edited by this tester. All mutations occur in generated/copied files outside the repository.

## Important matrix distinction

The final 67-case replay uses an **intentionally incomplete two-record synthetic matrix**. Before fault injection, the complete aggregator returns FAIL because 766 required trials are absent and binary aggregate counts are incomplete. The test records those specific baseline errors. A negative test passes only if it introduces **a new target error or a binary validation error**, not merely because the pre-existing incomplete matrix remains FAIL. The final baseline is rechecked after restoring all bytes.

In `final-mini-results.json`, `actual: PASS` means no additional target error was introduced in that isolated control. `rawAggregateStatus` remains FAIL. This must not be represented as full-matrix acceptance.

A full 768-record/384-pair synthetic fixture passed an earlier frozen auditor with matching generated viewport-sized RGB PNGs and generated trace structures. This demonstrates that the then-current aggregate was not a blanket rejection. That positive predates the final exact-13-field and duplicate-call trace checks. The final actual 768-row CI audit remains the authoritative full-matrix task and is outside this package's claim.

## Final frozen source hashes

- `frozen-final/scripts/audit-scroll-geometry.mjs`: `176c0794c736d4f7864c0e69d3ce7963a0a2bad19678f6d438db0c15a2d5e18e`
- `frozen-final/diagnostics/scroll-geometry/contract.mjs`: `585b217c4f6cee8b7fcbd636c5723600e5ce826712808db66d5ab71d755592b4`
- `frozen-final/scripts/audit-scroll-files.py`: `f8fcc594eb3bc1bbf8c5ab00a50deec6f93a02f975a7d643a6b13a40aad812e2`

The implementation was changing during the investigation, so source snapshots are included. Do not combine results from different snapshots silently.

## Reproduce the final focused suite

Requirements: Node.js and Python 3, standard libraries only. Run from this package directory:

```sh
python3 generate-final-mini-fixture.py
node test-final-mini.mjs
```

Expected: `totalTests: 67`, `satisfied: 67`, no unexpected passes or failures. Generated files stay in `final-mini-fixture/`; no source repository files are modified. Every modified raw file is restored from its exact original bytes, not reserialized JSON.

For the representative actual bytes and copied-trace closure negatives:

```sh
python3 test-final-binary.py /absolute/path/to/work/scroll-66f99c0
```

The supplied directory must contain the 16 named Chromium 375/normal/r1 trials described above. The script reads originals only, writes mutated ZIPs under `final-binary-negative-fixtures/`, and writes `final-binary-results.json`. Actual evidence files are not bundled into this compact package. The recorded result includes SHA-256 for each original JSON and trace checked.

## Coverage

- Missing, duplicate and unknown trials.
- Report/raw/expected HEAD, tree, protocol and source-hash bindings.
- Every row identity component and raw canonical trial/pair identities.
- JSON/PNG/trace hash, size and missing-file checks.
- Missing/extra screenshot phase keys and unsafe paths.
- Row execution errors and missing/nonempty page errors.
- Unsupported raw/run schema, unsupported event type, unsupported reported status, and false success claims.
- Pointer/touch unpaired endings, changed IDs/types, unfinished lifecycle after completion, orphan touchmove, incompatible input route, and untrusted events.
- Temporary scroll drift.
- Hash-consistent invalid PNG/trace bytes, raw-vs-row image manifest mismatch, and phase-file reuse.
- Exact capture fields and uniqueness of trace call IDs.

An unsupported row-result claim is intentionally ignored and recomputed from raw evidence. An unsupported run status is rejected as contradictory run completion metadata. These are different checks.

## Earlier findings and fixes

`results.json` is the first 67-case full synthetic run against `frozen-source` (auditor `3119fd0d…`, contract `717d7d3a…`). Its accepted synthetic PNGs were 1×1 and traces were empty ZIPs, clearly labeled invalid as browser evidence. It exposed seven false PASS cases: unsupported run schema, non-PNG bytes, non-trace bytes, raw image-manifest mismatch, phase-file aliasing, orphan touchmove, and input-route mismatch. The eighth expectation mismatch was an obsolete test expectation that unsupported report status should be ignored; the implementation correctly rejected it after the parent's aggregate guards were added.

`trace-closure-results.json` records additional false PASS cases in `frozen-current`: empty/partial captured records and duplicate after-call IDs hiding an error. `final-binary-results.json` confirms the final fixes reject them.

`aggregate-guards-results.json` confirms the parent-added run completion and fatal-error guards. The first inspected source had hash `50488b05…`, but the source copy captured the newly added guards as `3119fd0d…`; only the copied snapshot's hash is claimed for executed results.

The middle full768 replay stopped after five completed cases because of a missing helper in the test harness. That helper and an exact-byte restoration issue in the smaller harness were corrected before the final successful run. No completion claim is made for that interrupted replay. Its full positive result is summarized in `middle-positive-summary.json`; the original full positive output is retained outside the compact package.

## Package contents

- Final reproducible scripts: `generate-final-mini-fixture.py`, `test-final-mini.mjs`, `test-final-binary.py`.
- Final results: `final-mini-results.json`, `final-binary-results.json`, `aggregate-guards-results.json`.
- Earlier reproducible controls and source snapshots: `test-auditor.mjs`, `test-aggregate-guards.mjs`, `generate-current-fixture.py`, `test-current.mjs`, `test-trace-closure.py`, and `frozen-source/`, `frozen-current/`, `frozen-final/`.
- Earlier result summaries and `SHA256SUMS.json` for package integrity.

The earlier full control can be regenerated with `node test-auditor.mjs`. It generates 768 records and runs all first-snapshot faults; it deliberately preserves the historical expectation mismatch described above. The middle full positive can be regenerated with `python3 generate-current-fixture.py` followed by `node test-current.mjs`, using its own frozen snapshot. This is slower than the final focused replay.
