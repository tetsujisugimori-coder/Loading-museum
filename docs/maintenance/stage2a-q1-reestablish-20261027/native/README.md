# Native re-establishment evidence — 2026-10-27

## Result: PARTIAL (not a full-suite PASS)

These are new executions against the recovered worktree, not recovered historical evidence. No product code or test expectations were changed. Execution began at HEAD `e258b7b08fca6d7a4b5d91d5c7fb0f0a56d5cabd` and ended at `95555da7190a760a232fd2d31cf10196d0bd7c61`; intervening documentation/CI changes did not change the measured application sources. `execution.json` contains source/verifier SHA-256, final build identity, all 15 served HTML/JS/CSS hashes (15 equal), suite commands, exits, and monotonic durations. The build was supplied after the parent's final checks (2026-10-27 00:24:17 UTC). Browser/server processes were stopped at 00:38:02.421497 UTC (09:38:02 JST).

| Unchanged verifier / scope | Actual result | Measured duration |
| --- | --- | --- |
| Coin cancellation + strict assessor, Chromium/WebKit × 375/390/765 | 6/6 PASS; 228 behavioral checks; 12 natural cancellation paths; 12 separate predicate controls | 76.986 s + assessor 0.115 s |
| Menu/Coin observation, same six conditions | 5 PASS, WebKit765 PARTIAL; 48 named groups, not 48 independent complete passes | 102.406 s |
| Stage 1, same six conditions | 6/6 PASS; 30 named groups | 152.553 s |
| Authorized supplementary WebKit765 Menu probe, one execution | 2 live-pause samples PASS, 1 INPUT_MISSED; overall PARTIAL | See process/probe JSON |

Runner exit status alone is not the verdict: the strict N2 assessor is recorded separately; observation exited 1. No mock success is counted as native success. N2 tests preserve normal-mode autoplay suppression, explicit Replay/COLLECT, score/acquisition/Reset, motion reduction toggles and cancellation, and lifecycle observations as defined by the unchanged verifier. Read `n2-strict.json` and `n2-summary.json` for per-condition checks and input/cancel timestamps. All conditions' pageerror lists are preserved; none were reported.

## WebKit765 observation boundary

The original Menu mid-flight pause path arrived after natural completion (native currentTime 220/220 ms, finished before pause). This is not proof of stopping a running animation and remains PARTIAL. The original Coin path reached 194/650 ms while running and held the paused position.

One separately authorized browser-local-input probe records `performance.now()`, native currentTime/playState/pending, ready/RAF and pause settlement/hold timestamps. Requested positions were 20, 110 and 190 ms; actual input positions were **147 running**, **132 running**, and **220 finished**. The first two paused and held the same times; the last is INPUT_MISSED, not a cancellation defect and not a PASS. This probe does not overwrite the original real-input result. No native currentTime assignment, mocked animation, duration modification or sleep extension was used. Its three arithmetic/predicate controls are not browser evidence. Timely near-start/near-end input and the arrival-delay root cause remain unconfirmed. The selected WebKit765 Menu PNG shows the final CSS-200% state, not the earlier live-pause instant.

## Runtime and reproducibility

See `runtime-setup.json`, acquisition logs, and `webkit-library-sources.json` for exact versions, failures and package hashes. Installed Python Playwright 1.62 had no local browser; matching official acquisition failed with a 195-byte HTML response. The escalation launch failed before execution (sandbox startup); the protected path was not accessed or modified. The independently permitted temporary Playwright **1.56.0** environment and its matching official **Chromium 141.0.7390.37 / WebKit 26.0** were used instead. This version difference is explicit, not represented as a 1.62 run.

WebKit initially lacked runtime libraries. An apt download attempt could not read a restricted configuration and was not retried. Public official Debian packages were independently downloaded and extracted only under `/tmp`, with cache-local library links and LD_LIBRARY_PATH; no OS installation or global configuration change. One early launch diagnostic was interrupted without a conclusive stage; its empty output and interruption metadata remain. A bounded subsequent launch and actual page interaction succeeded before the suites. Temporary HOME/cache paths avoid user-cache writes. Exact commands, versions, package URLs/SHA and limits are retained. Outer diagnostic guards only bound our own subprocesses; existing test expectations/timeouts were not extended.

## Evidence retention / size

- `n2.json.gz` is the lossless full six-condition raw result. `compression-manifest.json` records original and compressed bytes/SHA-256 and a byte-identical decompression check. The redundant new plaintext was removed only after verification; historical evidence was untouched.
- `n2-summary.json` preserves per-condition checks, all 12 natural cancellation paths, timestamps, identity, score/acquired state and errors. It supplements rather than replaces the compressed raw data.
- All 18 screenshots were generated by the unchanged verifiers. Six representative PNGs (1,611,485 bytes) are included: N2 Chromium390/WebKit390, observation Chromium390 Menu/Coin, WebKit390 Coin, WebKit765 Menu. The other 12 are retained under `/tmp/loading-q1-20261027-unpublished-png`; `image-manifest.json` lists every generated hash, selection and reason. Temporary retention is not a durable archive. Image selection reduced repository volume, not executed checks.
- Selected N2 WebKit390 and observation WebKit765 Menu were visually opened; this is not an independent six-image accessibility review. A limited token/authorization/password pattern scan found no matches in the new JSON/log/script files; this is not an exhaustive secret audit.
- `artifact-manifest.json` inventories this frozen directory (excluding itself).

## Guarantee boundaries

Native results are local executions, not GitHub CI or physical Safari/iPhone/VoiceOver/OS backgrounding/text-size evidence. CSS 200%, reduced-motion media emulation and synthetic visibility conditions are explicitly synthetic. The scripts cover their declared Menu/Coin and Stage 1 paths, not all 197 exhibits, all theme/motion/font combinations, exhaustive keyboard Tab/focus-return behavior, or forced invocation of every stale callback. HP's full native regression suite was not run here. New Stage 1 successes do not establish that historical B1/M1 or input-arrival/locator intermittent causes are fixed. Their previous UNKNOWN/PARTIAL history is preserved. No old missing 153-count evidence was reused. Full native acceptance remains PARTIAL because the original WebKit765 Menu live-pause path and timely near-terminal supplementary input remain incomplete.
