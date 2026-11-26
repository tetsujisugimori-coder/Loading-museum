# WAAPI Stage 2A independent offline cause review

This phase began only after API phase A2 was frozen at ba06f078aa1fa282c85d34834ab6479db5cd0c16 (tree dd0da26e704821c82e43d6d938915c544076776a) and its Vault readback passed. API findings are not evidence of a shared WAAPI cause.

## Original evidence and separate judgments

Run [43708599164](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/43708599164), attempt 1, fixed HEAD 179234d4351a988afcc7631795c7e162c8eb7882 / tree 2cf11528672af37db548fed2a46be3dcb8ccfae4:

- WebKit artifact 14159717811: 2,568,318 bytes; SHA-256 466373eb32f9de5d09957b3acc952700630a448df9b27c7ebb03ff9db20bed4e.
- Chromium control artifact 14159204043: 3,407,099 bytes; SHA-256 4b53d853c2c7cc821b083aeb5d7475eb986fb7720a8a801c34770c215a33d40d.
- WebKit: observation process exit 1 / FAIL; style, layout, n2, stage1 each exit 0 / PASS. Within observation, width 375 is PARTIAL with one retained Menu Selection Cursor mid-flight-pause path failure; widths 390 and 765 PASS. This is not a process exception or timeout.
- Chromium: all five suites PASS; observation all three widths PASS.

Original ZIPs, logs and JSON are immutable. Official artifact size/digest and outer CRC were checked. Run-log ZIP has no official digest exposed by that endpoint; its local full-byte SHA/CRC is recorded separately. These Stage 2A archives do not contain browser protocol traces, original source bodies or build-output bodies. Provenance hash claims can be checked against Git; that is not an execution-byte or body-preservation proof.

## Observed boundary

In WebKit width 375 Menu (duration 220ms), the recorded performance.now sequence is: preflight 4329, fonts ready 4329, preflight done 4341, immediately-before-play-click 4341, after-ready-await continuation 4714. At that continuation the first pre-pause read is currentTime 220, playState finished, pending false. The extra currentTime-positive rAF loop records zero iterations. Immediately after pause click currentTime is 220, playState paused; ready-after-pause is 4715. The settled snapshot is 220/paused, controller finished. The original live-pause predicate correctly rejects an endpoint, retains pathFailures, and continues independent later cases without erasing the failed path.

The 373ms interval is **play-click-before to ready-await continuation**. It includes synchronous click dispatch/handler work, native ready settlement and scheduling before the continuation; it does not measure how long the ready promise itself was pending. Animation creation/start, promise resolution itself, callback entry/exit and React commit were not timestamped. No finish/cancel event timeline exists in these artifacts; this absence is not evidence that those events did not fire.

Other WebKit Menu widths: click-to-continuation 73ms / 131ms, first native time 73ms / 130ms with running state, both accepted. WebKit Coin widths all accepted. Chromium provides six accepted pause observations, not a randomized or matched-load causal experiment. Browser versions are retained in private original records.

## Hypotheses and limits

| Candidate | Supporting observation | Counterevidence / limit | Minimal future distinction |
|---|---|---|---|
| Play handler, ready settlement or continuation scheduling delayed the pause opportunity | First read after 373ms is already at 220ms endpoint | No subinterval probes; other widths and Coin pass | Finite preregistered handler/ready/continuation timestamps with baseline control |
| Native timing or controller/DOM reflection mismatch | Native finished before pause; settled controller finished | Recorded endpoint values are mutually consistent; no captured incorrect transition | Creation/start and native-state timeline; separate DOM-read endpoint |
| Observation costs influence opportunity | fonts/rAF preflight, synchronous click and reads are part of measurement path | Their causal contribution was not isolated | Matched finite observation control, only with separate authorization |
| Virtual versus real-clock mismatch | Timing-sensitive path | Fixed observation script uses real time and has no virtual-clock API; cannot transfer API virtual-clock conclusions | No virtual-clock diagnosis asserted for this run |
| Collection/classification hides a failure | Later checks continue after failed path | Original pathFailures, PARTIAL and process exit 1 agree | Offline negative controls reject hiding/rewriting |

Root cause and product-versus-harness responsibility remain UNKNOWN. The rejected mid-flight path is a real unmet acceptance condition, not proof of a broken pause implementation after an in-flight input. Measurement neutrality is not established. ready/finished/cancel event instrumentation absent from the original test is not retroactively mandatory. Existing n2 and stage1 outcomes remain separate.

## Offline diagnostic implementation

`scripts/phase7d-waapi-offline-diagnosis.py` reads official ZIP metadata and immutable archives, checks ZIP identity/CRC/safe entries, fixed HEAD/tree and source claims, suite membership/order, width membership/order, raw pause checkpoints, clock order, state consistency, the original live-pause predicate, retained path failures and process/log classification. Git blob SHA-1 uses the `blob <byte-length>\0<body>` framing, separately from file SHA-256. It does not launch/import Playwright, change original predicates, regenerate a trace or revise a primary result.

The synthetic controls cover normal and retained-failure records, missing recorded checkpoint/time, contradictory state, foreign HEAD, order changes, primary afterwrite, hiding a past failure with success, suite-level hiding, duplicate checkpoints and changed source claims. Missing checkpoint is a recorded-protocol negative control, not a claim that the original archive contained native event logs. These are new diagnostic validity tests, not a claimed pre-existing product RED-to-GREEN repair. API A1-to-A2 same-input registration counterexamples are documented separately.

Reproduce without a browser:

```text
node --test tests/phase7d-api-offline-diagnosis.test.mjs tests/phase7d-api-contract.test.mjs tests/phase7d-observation-contract.test.mjs tests/phase7d-causal-contract.test.mjs
python -B tests/phase7d-waapi-offline-diagnosis.test.py
python -B scripts/phase7d-waapi-offline-diagnosis.py <original-artifact.zip> <official-artifacts.json> <fixed-Git-repository> <new-output.json>
npm run check
```

The dedicated offline workflow contains these synthetic/contract checks only, no browser installation/launch and no manual dispatch. Existing automatic workflows and their original contracts are unchanged. No new browser experiment, production 108, timeout change, wait or product-source repair was performed. Final-HEAD official CI and Vault readback are separate submission records; local controls do not establish formal CI or product acceptance.

Overall PARTIAL; root UNKNOWN; production 108 NO; merge NO; keep Draft.

Independent review found a numeric-guard gap in the new offline wrapper (not in the original browser test): three decoded synthetic inputs with missing/out-of-range immediate time or nonfinite clocks were accepted. The original wrapper snapshot and exact input bytes were retained before adding finite-clock/native-time/frame guards. These same inputs must be rejected after the fix; normal originals must remain accepted with their old failure intact. The other four suite PASS labels above reproduce original provenance process exit codes with original result/log bodies present, not a fresh product execution or complete independent re-evaluation of their internal assertions.
