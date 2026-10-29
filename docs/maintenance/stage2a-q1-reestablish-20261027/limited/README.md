# Limited unchanged-source comparison — 2026-10-27

Two runs only, after baseline five checks/build released the CPU window. Native measurements began after these completed. Baseline source HEAD `b2d921182de7a92acc9227b0f767f1f555de2a16`; no product/formal test changes. Original and transformed SHA-256 values are in `source-manifest.json`. This is new evidence, not restoration of the lost 152 files or the former eight unsubmitted tests.

| Run | Checks | Failure/skip | Outer monotonic seconds |
|---|---:|---:|---:|
| Related five files, original source, worker1 | 78/78 | 0/0 | 14.887766 |
| Same expectations, instrumented `/tmp` copy, worker1 | 78/78 | 0/0 | 14.156863 |

No retries, skipped conditions, timeout changes, split assertions, or product edits. Each existing test retains Vitest's 5000 ms limit. These 78 are a subset of the baseline 179, not new acceptance checks.

## File-level comparison in milliseconds

| File | Whole-suite worker1-1 | Whole-suite worker1-2 | Limited original | Limited instrumented |
|---|---:|---:|---:|---:|
| observation (37) | 4834 | 4984 | 5108 | 4743 |
| gallery (12) | 3925 | 4010 | 4326 | 4122 |
| HP (4) | 1220 | 1314 | 1268 | 1211 |
| stage1-expanded / Dodge etc. (23) | 481 | 548 | 470 | 478 |
| Macintosh choice (2) | 218 | 234 | 213 | 213 |

File totals are not individual test durations. Limited original's largest individual test was gallery 879.804 ms; instrumented's largest was gallery 868.187 ms. Neither run reproduced a timeout. Instrumented being faster does not establish a performance improvement: operations were unchanged, run order and runtime variability remain confounders.

## Observed segments

The instrumented log contains 78 buffered per-test records. Largest single measured operation was HP Reset test's click dispatch/React processing, 179.762 ms. Representative expensive query: AI comparison global button lookup 157.044 ms; Coin integration full-DOM label lookup 122.693 ms. These show measurable costs, not a demonstrated current failure cause.

Macintosh click sequence: role-query accumulated 89.107 ms, existing await-containing lines accumulated 51.835 ms, initial render 17.213 ms, cleanup 1.913 ms. Await-containing-line measurement can include its argument query, so nested/overlapping measurements must not be summed as disjoint time. Key sequence awaits ranged 4.690–14.629 ms. Small-DOM tests also passed; all remain available in raw JSON rather than attributing Q1 only to Gallery lookup.

## Instrumentation boundary

- `run.py` records exact commands and outer `time.monotonic()` elapsed values; `runs.json` preserves both return codes. It generated copies under `/tmp`, retaining existing relative product imports through the original app symlink.
- `runtime-profile.ts.txt` captures original `process.hrtime.bigint` before fixture fake timers; wraps synchronous render/query/fireEvent/cleanup operations with try/finally and returns the original values/throws.
- Existing awaited user-event/act lines have timestamps immediately before/after; no added await, timer wait, or act-then subscription. `act-call-return` does **not** measure asynchronous settlement. Logs are buffered until explicit afterEach. Proxy calls, timestamp reads, serialization and changed staging root add diagnostic overhead, so this is not identical runtime execution.
- At completion of the two product runs the independent fake-clock control was pending. It was subsequently executed in the separate four-control run below. The original two product results were not altered. The outer Python clock is independent of fixture fake time.
- No CPU profile, GC attribution, host-wide resource proof, browser measurement, or new independent review is claimed here. Cleanup durations measure the explicit call only; they do not prove all possible resource leaks absent.

Current classification: failure **not reproduced**, shared root cause **UNKNOWN** (product/test/environment/mixed not resolved). Do not manufacture RED/GREEN or change product/expectations based on these successful runs. A formal CI gate can be re-established and observed separately without declaring the historical instability cured.

Stored `.tsx.txt` files are exact instrumented copies, not included as new formal TypeScript tests. `run.py` expects the companion runtime wrapper already copied into its staging tests folder as shown by the recorded generated files; it is a record of the two-run diagnostic, not an auto-retry job.

## Separate wrapper controls — 00:20:22 UTC

Four controls passed, zero failures/skips, test time 16 ms / Vitest total 574 ms. These are instrumentation controls, **not four extra product acceptance checks**. No product test was rerun.

1. Advancing fixture fake time 10000 ms changed captured monotonic time by only **0.268524 ms**.
2. Wrapped synchronous query returned the exact original DOM element.
3. Wrapped synchronous query propagated the identical injected error object.
4. Before/after markers returned synchronously and did not introduce another await or advance promise settlement ahead of the existing await.

Raw log, JSON, exit code and exact test source are stored as `wrapper-controls*`. Command from the original diagnostic staging root:

```sh
node /workspace/scratch/e622c1e9421e/loading-q1-recovered/node_modules/vitest/vitest.mjs run tests/wrapper-controls.test.tsx --maxWorkers=1 --minWorkers=1 --reporter=default --reporter=json --outputFile=/tmp/q1-limited-20261027/wrapper-controls-results.json
```

These controls validate the measured wrapper properties, not zero instrumentation overhead, completeness of cleanup, or the cause of historical Q1 failures.
