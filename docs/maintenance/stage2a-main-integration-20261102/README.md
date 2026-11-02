# WAAPI Stage 2A current-main integration — 2026-11-02

## Scope and authority

Implementation handoff for Issue #35 / original PR #36. Draft submission only; no merge, auto-merge, publication or draft removal. This document records implementer self-validation, **not an independent review**. The inherited filename `waapi-observation-independent.test.tsx` names an existing test suite, not a current independent review.

[Issue #35](https://github.com/tetsujisugimori-coder/Loading-museum/issues/35) · [original PR #36](https://github.com/tetsujisugimori-coder/Loading-museum/pull/36) · [fixed original tree and evidence](https://github.com/tetsujisugimori-coder/Loading-museum/tree/74a15e9ee19830756c4043bd9041eed37d922c5d/docs/maintenance) · [integration-policy record](https://github.com/tetsujisugimori-coder/Loading-museum/pull/36#issuecomment-6576555468).

- Current-main baseline: `91615365f5001c4e73b3a0f8d282bff0ed29a6d0`.
- PR #51 is merged into that main. Physics fix HEAD `5d83129c3527f9474a6132f035d38ccc9c6f95b2` is an ancestor, verified from Git history.
- Original PR #36: OPEN, not draft, CONFLICTING; HEAD `74a15e9ee19830756c4043bd9041eed37d922c5d`.
- Historical base: `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`.
- The existing checkout remains clean on its old main at `1d0d7ee`. No deletion, overwrite, stash, pull, or branch switch there.
- Work uses an independent partial clone. The original PR reference and its historical evidence are retained in Git; historical evidence is not relabeled as current validation.
- No repository AGENTS.md or `.agents/skills/*/SKILL.md` exists in current main. The user-level skills found were merge workflows, outside this implementation's authorized scope. The global instruction to date the final report is retained.
- No new access, transfer or repackaging of the held Phase 4B originals/ZIP was performed.

## Integration choice and actual conflicts

| Criterion | A: merge main into original #36 | B: port required changes from current main |
|---|---|---|
| Diff clarity | Includes the original large evidence/document set | Product and formal tests remain compact |
| Current-main protection | README/LOG/package conflicts need reconciliation | Main is the starting tree; all later exhibits remain |
| Traceability | One branch, historical/current evidence interleaved | Exact original SHA plus per-file decision manifest |
| Duplicate risk | Broad old changes harder to distinguish | Target WAAPI files compared to baseline first |
| Independent review | Review historical evidence and integration together | Review selected product changes and new evidence |
| Merge safety | Large accumulated history and conflicts | New Draft against current main, original #36 stays open |

**B selected.** A read-only `git merge-tree --write-tree --name-only origin/main origin/pr36` identified exactly three content conflicts: `LOG.md`, `README.md`, `package.json`. The working branch was never put into a conflicted merge. The virtual result is retained in `merge-tree-analysis.txt`.

Resolution:

- README and LOG: retain current-main content and append the current integration record. Do not replace with old-base versions.
- package.json: retain all 38 existing test file registrations, add the two observation suites and a focused command. Bound Vitest groups to two workers; no assertion removal, test skips or timeout increase.
- `WaapiSampleGallery.tsx` and `WaapiExpandedPreviews.tsx`: current main is identical to the old base for these files. Port Stage 2A and the Turn Reset generation guard without removing later code.
- `WaapiGameObservation.tsx`: new isolated presentation controller from fixed original PR HEAD.
- globals.css: apply only Stage 2A hunks through a three-way patch. No content conflict; preserve all later CSS.
- Original `pr-quality.yml`: do not copy its separate pinned runtime/full-check workflow. Main already has exact-PR-HEAD contracts in `verify-practical.yml` plus all later browser and Physics checks. Retain those unchanged and add `verify-stage2a.yml` for native acceptance and provenance.
- Formal gallery tests: preserve the historical scoping/split improvement. It does not establish the cause of old Q1 timeouts.
- Native scripts: retain predicates and negative controls, replace obsolete 197-object oracle with current-main **13 ROOMS / 251 OBJECTS**, support engine/width selection, and supply matched driver executable paths via a local-only runner.
- Local harness correction: the initial Python file server left native navigation requests pending beyond the original 10-second limit. A separate diagnostic with the buffered Node strategy already used by current-main probes loaded Chromium in 0.714s and WebKit in 0.600s with no pending/failed requests. The runner now uses that Node strategy. Navigation limits, operation timing, assertions and negative controls were not weakened. Preserve the unsuccessful initial runs; this harness finding does not explain historical Q1/B1/M1.

Every original changed file is classified individually in `file-decisions.json` / `.tsv`: product, style, formal test, CI/validation, README/LOG, maintenance document or historical evidence, with decision and reason. Historical artifacts and reviews remain reachable at original PR HEAD; they are not copied into this new PR.

## Protected contracts

- Menu: normal FLIP cursor belongs to the selected DOM row; independent observation goes CONTINUE to SETTINGS. Pause holds input-time native currentTime; seek, resume, step in both directions, easing comparison, final DOM destination and rewinding from finished are covered.
- Coin: observer has no score/award callback. Native animation completion never grants points. Only explicit normal COLLECT grants 100 once per Reset; Reset permits reacquisition. Observation, Replay, mode switches and re-entry preserve the logical state.
- Lifecycle: generation tokens invalidate stale RAF/ready callbacks; cancel on inactive, hidden, reduced motion, mode switch and unmount. Reduction recreates a paused static observation; removal of reduction does not autoplay. N2 normal Coin cancellation and Turn Order immediate Reset/queued FLIP invalidation are retained.

## Current self-validation

The final exact-HEAD results and CI links are recorded on the Draft PR and Issue #35 after readback. Evidence embeds source/build/script hashes; a precommit run's dirty/head fields must not be interpreted as clean final-HEAD evidence.

- First `npm run check`: lint/types/build and 49 Node tests passed. First Vitest group: 147 pass, 3 timeouts, no skips; later groups did not execute because the command failed. Preserve `check-first.log`.
- After explicit two-worker bounds, `npm run check`: **356 pass, 0 fail, 0 skip** (49 Node + 307 Vitest; 37 Vitest files). All original suites are retained.
- Focused Stage 2A / Stage 1 command: **89 pass, 0 fail, 0 skip**; overlaps the full check and is not added to its total.
- Two-worker scheduling changes concurrent resource use, not the five-second per-test limit or assertions. The successful current run does not prove historical Q1/B1/M1 causes.
- `main-preservation.json`: 125 protected source/test/CI files identical to baseline after checkout CRLF→LF normalization; no missing original test registrations. Lists literal IDs where declared in each data source, including all Phase 3–5 registrations and all six Then & Now IDs in Flash data. `git diff` separately confirms no product change outside the four WAAPI files (including the new observation component).
- Static and native inventory oracle: **251 exhibits / 13 rooms**, WAAPI **47**, Flash **60 / 18 categories**, including six Then & Now pairs. Existing registration, search/filter and downstream contract tests run unchanged.
- Browser results are supplied separately with actual engine versions and conditions. Browser emulation is not physical-device or OS accessibility evidence.
- Implementer visually inspected the Chromium 375px Coin and WebKit 390px Menu CSS-text200 captures: controls and readouts wrap without overlap or clipping, the focus outline is visible, and the normal held score/selection is readable. This is screenshot self-QA, not an independent accessibility review.

| Protected later registration | Count |
|---|---:|
| Modern permanent exhibits | 6 |
| Phase 2 A/B studies | 12 |
| Phase 3 practical exhibits | 12 |
| Phase 4A / 4B / 5A additions | 6 / 6 / 6 |
| Flash including six Then & Now pairs | 60 in 18 categories |

## Reproduce the review evidence

Use an isolated Python environment outside the checkout. The GitHub workflow is the canonical Linux invocation (Node 22 / Python 3.12 / Playwright 1.56.0). Local implementer runs used Windows, Node 24.20.0, npm 11.17.0, Python 3.14.7 and Playwright 1.56.0.

```sh
npm ci
npm run check
npm run build
python -m pip install playwright==1.56.0
python -m playwright install --with-deps chromium webkit
REQUIRE_CLEAN=1 EVIDENCE_DIR=work/stage2a-browser python scripts/run-waapi-stage2a.py
```

On PowerShell, set the two environment variables with `$env:REQUIRE_CLEAN='1'` and `$env:EVIDENCE_DIR='work/stage2a-browser'` before the Python command. Engine/width selection uses `BROWSERS` and `WIDTHS`; omitting them runs both engines at 375/390/765px. `SUITES` selects diagnostic subsets; final acceptance runs all five. The runner compares source hashes and HEAD/tree before and after and fails a changed source or unmet clean requirement. Failed suite exits are never retried or relabeled by the runner.

Committed precommit evidence is explicitly exploratory, including dirty provenance and the retained unsuccessful attempts. Exact final-HEAD local/CI records, with `REQUIRE_CLEAN=1`, are authoritative for the handoff. They are linked in the Draft PR and Issue #35; CI artifacts carry the commit SHA in their names.

## Preserved limitations and review gate

- Historical Q1 timeout cause UNKNOWN; B1/M1 causes UNKNOWN. A non-reproduction is not a cause analysis.
- Historical partial browser coverage remains historical.
- Physical iPhone Safari, VoiceOver and actual OS text scaling remain unverified. Synthetic visibility events do not establish physical background-tab behavior.
- Existing CSS text200 horizontal overflow must remain visible as a limitation when observed; no blanket whole-page accessibility PASS is inferred from observation-region checks.
- Independent review should verify conflict selection, downstream preservation, Menu/Coin contracts, Reset/cancel races, reduced motion, state separation, negative-control rejection, evidence origin/source/build hashes and final HEAD, and any new P1/P2.
- **Merge recommendation: NO until independent re-review completes.** Implementer PASS is not merge approval.
