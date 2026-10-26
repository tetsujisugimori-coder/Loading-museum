# Quality-gate repetition and interruption history

The package scripts and 5000ms test limit are unchanged. `measure_checks.py` runs the original `npm run check` with the default pool three times and worker1 twice; it records namespace-visible CPU/process samples, elapsed time, commands, results and source hashes. Those metrics do not prove exclusive host CPU access.

## Confirmed default runs

| Run | Node | Vitest | Total | Wall seconds | Outcome |
|---|---:|---:|---:|---:|---|
| default-1 | 49/49 | 128/130 | 177/179 | 113.068 | FAILED: HP Reset and existing Menu observation integration timeouts |
| default-2 | 49/49 | 126/130 | 175/179 | 142.777 | FAILED: both Q1 responsibilities and two HP paths timeouts |
| default-3 | 49/49 | 129/130 | 178/179 | 197.090 | FAILED: existing 14-game gallery interaction timeout |

All three have zero skipped/cancelled tests. Their failures are valid wall-clock quality-gate failures; they are not observed semantic assertion mismatches. Do not discard them because a later worker1 run succeeds. The new N2 regression cases passed in these runs, but the overall gate did not.

## Environment interruption, not a product result

The initial runner's worker1-1 started at 03:34:20 UTC. Its log confirms build and Node49 success followed by Vitest startup; no terminal Vitest result was obtained. Around 03:35 UTC the exec-server connection failed. Same-worktree reads subsequently recovered, while resuming session26111 first returned transport/recovery failure and then `Unknown process id 26111`. The original log remained unchanged since 03:36:21 UTC and worker1-2 was not observed to start. `transport-interruption.json` preserves this boundary. The old worker1 result is UNKNOWN, not PASS or a fabricated test failure.

After inspecting retained files and waiting beyond a normal observed check interval, two worker1 runs were started in `recovery-worker1/` with a separate runner and logs. The original files were not overwritten. The old process exit could not independently be proven from the new PID namespace, so CPU exclusivity is not guaranteed. Results: worker1-1 passed 179/179 (156.076s); worker1-2 passed 175/179 with four existing observation-test 5000ms timeouts (229.486s). Both have zero skipped/cancelled tests. The second run failed easing change, pending pause, Menu integration and Coin integration paths. Thus worker1 is not a sufficient stabilization by itself, consistent with the earlier historical worker1 failure. Full results remain in that directory's results.json.

## Preflight failure retained

`preflight-type-failure/` retains the earlier check that stopped at typecheck because new diagnostic spy wrappers had union-signature TS2345 errors, plus the interrupted following iteration and original diagnostic source copies. Type annotations were corrected without changing query runtime behavior. Lint/typecheck then succeeded. Those runs did not reach product tests and are not counted among the five completed product-check repetitions.

## Decision

Q1 remains unresolved. Query cost was measured and reduced, and responsibilities were separated without removing assertions, but the independent review and default repetition still reproduce 5000ms failures. Existing worker1 failure history also prevents treating parallel execution as the sole cause. The remaining environmental/runtime variation is UNKNOWN. No timeout extension, retry, skip, broad product rewrite or worker-configuration change is adopted. Merge recommendation remains NO until a reproducible quality gate is established.
