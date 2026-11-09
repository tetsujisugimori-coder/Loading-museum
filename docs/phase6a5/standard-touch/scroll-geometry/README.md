# Scroll / range geometry controlled experiment (Issue #77)

This is an additive diagnostic experiment stacked on PR #76, not a product behavior fix. PR #70 → #72 → #74 → #76 dependencies and HOLD remain unchanged. The baseline is `cc1a760209e0dba9c94f17f64ad26acf71576bcc` (tree `2ffc0134665171026d48c5b798c66f9a5d7629fe`); observed main at start `ab05ffa4e95a68bc387bcfbd04a16bad6e331a75`. No AGENTS.md was present at baseline or main. Product code, lockfile, old v1/v2 comparator, old data and failure evidence are preserved.

## Pre-registered protocol

`diagnostics/scroll-geometry/protocol.json` is the machine-readable plan. 3 independent contexts per cell, no result-driven addition/removal. Chromium/WebKit 1.56.1 × 375/390/765/1280 × normal/reduced × mouse drag/touchscreen tap × A/B/C/D × 3 × product/plain = 768 trial records, 384 pairs. Subset local development runs are explicitly separate from the full formal CI matrix and are never pooled.

A: same viewport-relative rect and page scroll. B: same rect, product scrollY1000/plain0. C: same scroll, product rectY410/plain310. D: both differ. Both pages receive experimental body min-height12000 and a fixed range CSS override, leaving actual native input and React handlers untouched. Other rect metrics remain x24, width viewport−48, height44. The original underlying document structure remains different; this is not a perfectly isolated browser engine experiment. The effect of experimental layout and observers is not proven neutral.

CSS dimensions / scrolling tolerance 0.5 CSS px; scale and DPR exact. Positive viewport sizes and consistent rectangle edges required. Inputs use the real native range value −100..100, initial0, target50 (75% of the range), CSS thumb20. Drag follows ten mouse moves from the current thumb; tap uses Playwright touchscreen.tap. No synthetic dispatch, force-click, increased sleeps or product state assignment. Fixed double-rAF observation barriers and the screenshot timing are recorded. Tap is atomic in Playwright; the saved tap-return PNG is after the API returns, not a proven in-contact frame. This observation limitation is NOT_CAPTURED_IN_CONTACT, not successful physical capture.

## Independent conditions and outcomes

Each trial samples initial/final, capture events and every rAF: rect8; layout and visual viewport, scale/DPR; window/document-scroller/documentElement/body scroll; native value; React state/history. Missing original fields remain NOT_RECORDED. Sampling is finite and cannot establish no changes between samples.

The new contract separates rect, scroll, viewport, within-trial drift and evidence validity. It does not replace or weaken standard-touch. A controlled B condition is ESTABLISHED for studying an intentional difference but remains RECORDED_CONDITIONS_DIFFER; only A can be RECORDED_CONDITIONS_MATCH. Outcome is separately COMPLETED/CANCELLED/INCOMPLETE/NOT_DELIVERED. Different native or committed values never establish or defeat condition equivalence. Target attainment, physical input, root cause and neutral measurement are distinct. Root cause UNKNOWN; physical iPhone Safari NOT_TESTED.

## Reproduction

Use clean committed sources, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`; run the dedicated node contracts. Install pinned Playwright1.56.1 and pngjs7.0.0 into a separate tools prefix, install Chromium/WebKit dependencies, set PLAYWRIGHT_MODULE. Run `node scripts/prepare-standard-touch.mjs` then `node scripts/verify-scroll-geometry.mjs`. SCROLL_EVIDENCE controls output directory; SCROLL_ENGINES/SCROLL_WIDTHS explicitly identify subset runs. Full formal run uses defaults. A mismatch, missing data or partial matrix sets nonzero exit and PARTIAL; raw failures are retained.

The read-only server checks original source/export hashes; experimental runner adds HEAD/tree/protocol/source binding. Every trial has its own pair/trial ID, JSON hash, three image hashes and trace ZIP hash in report.json. Before/mid/after PNGs and traces are original evidence. New evidence never replaces old 192-trial/96-pair artifacts. Public Actions artifacts expire; durable archives and SHA256 must be recorded in the final report.

## Acceptance / unresolved

Successful construction and evidence integrity do not imply successful gestures. Cancellation is retained. A missing event is not inferred to have happened. Null/unrecorded values are not treated as zero. The independent review must separately verify source, original artifact digest, bytes, all trial identities/counts, condition construction, images and event statistics, and inject faults. Actual physical touch and Safari remain NOT_TESTED; browser automation is not physical acceptance.

## Additional strict acceptance checks

The read-only aggregate verifier `scripts/audit-scroll-geometry.mjs` reconstructs comparisons from every raw JSON and checks all 768 required identities, all JSON/PNG/trace hashes and byte counts, three screenshot phases, and the externally pinned HEAD/tree/protocol/source binding. Invoke it with an independently verified binding JSON as its second argument. Do not give the report its own unverified binding as proof. Duplicate identities and omitted matrix cells fail; a development subset is PARTIAL.

The original run/artifact relationship was also queried directly through GitHub: run 42515166947, artifact 13631601940, HEAD cc1a760209e0dba9c94f17f64ad26acf71576bcc, 40,625,587 bytes, API digest `sha256:33c49490cd6f3e4f7bf33156c8806bc215f41a852d2475a4cd959d5a42ecbfc0`. It matches the independent local recount. This API confirmation supplements, rather than changes, the recount worker's stated scope.

Local Chromium preliminary sampling at 390px completed 96 rows/48 pairs on the pre-review code. Its old status label TECHNICAL_PASS meant only that subset and must not be used as full acceptance. The corrected runner labels subsets PARTIAL. The first local attempt could not find the pinned browser executable; the available cached executable was then selected. Local WebKit launch was NOT_TESTED because GTK4/Graphene/WOFF2/Harfbuzz ICU/Hyphen/Manette/GLES dependencies were absent. Formal CI installs its own dependencies and is evaluated separately. These failed or partial runs are retained; no filtering or replacement is performed.

The aggregate now also decodes all PNG rasters and Playwright trace ZIPs. It checks viewport dimensions, trace context and input commands, and the recorded finish result against the raw JSON. Matching hashes alone are insufficient: an empty trace or 1×1 placeholder image is rejected. Full-run errors, unsupported schema, contradictory completion metadata and source-manifest mismatch also fail.

### Trace volume protocol amendment before final acceptance

Preliminary full-snapshot traces grew to about700MB for384 Chromium trials. The final protocol retains Playwright API commands/results, browser context and the exact serialized recorder finish result but disables automatic screencast/DOM snapshot streams. Three explicit full-resolution PNG phases, all raw events and rAF snapshots, and the complete command trace are still retained. A dry-run probe confirmed API commands and serialized results remain present. This is a pre-final-run acquisition amendment, not deletion or replacement of old evidence. Earlier traces remain intact. Do not pool timing statistics across these protocol versions or claim observer neutrality.

Independent inference review adds two limits: the serialized finish result in the API trace is a second transport copy of the same recorder output, not an independent sensor for geometry or events. Without automatic screencast/DOM snapshots, three PNGs cannot retrospectively exclude transient occlusion, DOM changes, or behavior between sampled instants. Do not pool cancellation or completion rates across the earlier full-snapshot protocol and the final protocol either: tracing overhead may affect behavior. Final acceptance uses only one fixed final acquisition revision; prior runs are historical evidence.
