# Phase6A-4 evidence ledger

Base main: `737ec8277724964de21503824514b849f9fabb48` (PR#66 merged). Issue#67. Dedicated branch `feat/image-annotation-phase6a4`.

An initial Windows execution cloned the repository and created the local branch, then stopped with an exec-server transport disconnect. No implementation, commit, push or tests occurred there. Work continued in a separate cloud checkout after confirming the first task had terminated and there was no remote implementation branch. This is an environment failure, not a denied action or product failure.

Code inventory was freshly run against base main and working tree: 266→267 exhibits,13 rooms unchanged, phase4/5/6 practical room27→28. Existing IDs remain; one `image-annotation` entry was appended.

## Exploratory RED → GREEN (not final-HEAD acceptance)

- Reviewer-generated UI tests reproduced unwanted guide pause on ordinary blur/resize, an invalid arrow endpoint release leaving the gesture active, and a minimum arrow becoming immovable through one-ulp translation loss. All three were fixed with tests. Producer rounding repair does not widen numeric validation.
- Browser375 normal discovered a selected arrow endpoint hidden underneath a rectangle. Selected annotations now render last; endpoint and all-corner operations are included in every browser case.
- The first long-text browser check used an incorrect hand-counted string length; it was corrected to compare directly against the submitted text. The earlier FAIL remains separate from subsequent results.
- Initial whole-suite run found old27/three-entry registration expectations. These were updated to28/four entries while preserving all previous IDs and behavior checks.
- Chromium141 launched locally. Local WebKit initially could not launch because required shared libraries were absent. No local WebKit success is claimed from that failure; the pinned CI workflow is the supported acceptance route.
- Initial npm setup failed because the default cache path was unavailable; a workspace-independent /tmp cache succeeded without changing dependencies or the lockfile.

- Final screenshot inspection found selected-list and primary-button hover contrast loss from CSS rule specificity. A real computed-color WCAG contrast check reproduced the failure, then scoped selected/hover rules repaired it. The earlier clean `8d4c0e3` run is superseded, not final acceptance.

- CI WebKit screenshot inspection found native dark select surfaces despite declared light CSS (paint sample RGB51,51,51) and black arrowheads from unsupported context-stroke. The exhibit now uses a light native color scheme with explicit select appearance and per-arrow marker fill. Raster select checks and a marker color/Undo regression guard the fixes.

## Final evidence requirements

The PR must record its actual submitted HEAD and base, fresh lint/type/build/unit outputs, all16 browser conditions, current CI workflow/job results, screenshot hashes, negative controls, unchanged known gaps and independent-review recommendation. Do not promote the exploratory results above to final acceptance. Raw per-case evidence is uploaded by CI even for a failed job.

Physical Safari/iPhone/VoiceOver, physical input, actual OS backgrounding/capture loss, browser pinch, and WebKit native touch drag remain NOT_TESTED. Synthetic cancellation and CDP simulated touch are labeled separately from physical input. Existing dependency security concerns are not resolved by this feature.
