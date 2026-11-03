# Flash Phase 2: initial CI collection-count failure

Recorded: 2026-11-03 10:03 UTC (19:03 JST).

## Finding: CONFIRMED

Three jobs in the initial all-museum run stopped at an obsolete inventory assertion. The harness expected **251 objects**, while the rendered museum correctly reported **257 objects / 13 rooms** after the six requested additions. These failures occurred before the relevant exhibit-operation checks. They do not establish whether subsequent interaction checks pass or fail.

- Baseline main: `d71411a0a635ec1f69d9fa16b717b3880e02054a`.
- Initial submitted PR HEAD: `932387c1080b0b8901ca80a7a81f9c3b3a64a939`.
- Next submitted PR HEAD: `851b71abf4e69e0efa94f593a0f76f27e2f750ce`.
- The diff between those two PR heads changes only `package.json`, enumerating the new test-suite paths for shell compatibility. Product source is identical between them. These are PR heads; no claim is made that they are the Actions synthetic merge commit.

## Official failure evidence

Read the official logs independently. Minimal assertion excerpt, common to all three jobs:

- Expected: `/13 ROOMS \/ 251 OBJECTS/`
- Actual rendered page text includes: `13 ROOMS / 257 OBJECTS`

| Job | Official log failure time (UTC, 2026-11-03) | Assertion location |
| --- | --- | --- |
| [Phase 4B Chromium](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41615204851/job/125846821487) | 09:58:52.1414419 | `scripts/verify-phase4b-browser.mjs:17:458` |
| [Phase 5A WebKit](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41615204851/job/125846821802) | 09:59:22.5605068 | `scripts/verify-phase5a-browser.mjs:16:636` |
| [Phase 5A Chromium](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41615204851/job/125846821978) | 09:59:06.5444636 | `scripts/verify-phase5a-browser.mjs:16:636` |

No runner configuration, credentials, or raw log dump is included here.

## Local correction

Only current inventory expectations and their explanatory text were updated in five harnesses:

1. `scripts/verify-phase4a-browser.mjs`: exact object count 251 → 257.
2. `scripts/verify-phase4b-browser.mjs`: exact 13-room / 251-object expectation → 13 / 257.
3. `scripts/verify-phase5a-browser.mjs`: same exact inventory correction.
4. `scripts/verify-waapi-observation.py`: exact inventory correction and current-collection comment.
5. `scripts/verify-waapi-stage2b.py`: exact inventory correction and matching result-description text.

No product code, interaction assertion, room count, WAAPI count (47), timeout, retry count, or skip behavior was changed. The count remains an exact requirement, not a tolerance. Historical evidence was not overwritten. A scan of `scripts/` found no remaining old `251` expectations.

## RED → GREEN and limits

Using the same current exported `out/index.html`, with React comment boundaries removed to read the text consistently:

- Old exact 251-object regex: **false / RED**.
- Corrected exact 257-object regex: **true / GREEN**.

This is an assertion-level counterexample on identical generated HTML, not a browser interaction rerun. The three edited JavaScript files passed `node --check`; both edited Python files passed `ast.parse`; `git diff --check` passed.

At the time of this note, post-correction browser operations and final-HEAD official CI remain pending. Preserve the initial failures and assess the subsequent CI separately. Passing this entry assertion alone must not be reported as successful exhibit-operation coverage. No retry was used to conceal the original mismatch.
