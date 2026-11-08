# Original PR #76 artifact: scroll and geometry reanalysis

## Result

All **96 original product/plain pairs** remain in this analysis, including off-mode rows and WebKit tap cancellations. There are 192 canonical trial JSON files and 192 matching PNG files.

- Initial and sealed-final range `x,y,width,height` match in 96/96 pairs. All four recorded values remain stable through every recorded event.
- Initial and sealed-final viewport fields match in 96/96 pairs. All recorded viewport fields remain stable through every recorded event.
- **Window scroll differs in 96/96 pairs**, initially and finally. Plain is `(0,0)` in every row. Product has the nonzero `scrollY` values below. Scroll is stable during every recorded trial.
- Event comparison is available for 64 pairs. Their event range rectangles and viewport match, but window scroll differs in all 64. The other 32 pairs use off mode, so event data is **NOT_RECORDED**, not a measured absence of events.
- `document.documentElement.scrollLeft/scrollTop`, `document.body.scrollLeft/scrollTop`, and `document.scrollingElement` were **NOT_RECORDED**. No zero is substituted.
- Raw rectangles contain only `x,y,width,height`. Raw `top,right,bottom,left` are **NOT_RECORDED**. The output also includes clearly labeled algebraic values (`left=x`, `top=y`, `right=x+width`, `bottom=y+height`); those are not claimed as directly measured fields.

| Engine | Width | Product scrollY | Plain scrollY | Pairs |
|---|---:|---:|---:|---:|
| Chromium | 375 | 4642 | 0 | 12 |
| Chromium | 390 | 4593 | 0 | 12 |
| Chromium | 765 | 2709 | 0 | 12 |
| Chromium | 1280 | 1958 | 0 | 12 |
| WebKit | 375 | 4637 | 0 | 12 |
| WebKit | 390 | 4604 | 0 | 12 |
| WebKit | 765 | 2710 | 0 | 12 |
| WebKit | 1280 | 1958 | 0 | 12 |

These results establish matching recorded viewport-relative range geometry, but **do not establish fully matching scroll conditions**. They do not determine whether the scroll difference caused a behavioral difference. No rows were reclassified as physical-device acceptance; causal attribution remains UNKNOWN and physical-device testing remains NOT_TESTED.

## Original event results retained

- Drag, Chromium and WebKit: all 32 observed product/plain pairs (minimal/full) have COMPLETED on both sides and final DOM value 50. All 16 off pairs retain NOT_TESTED on both sides and final DOM value 50.
- Chromium tap: all 16 observed pairs have COMPLETED on both sides and final DOM value 50. All eight off pairs retain NOT_TESTED and value 50.
- WebKit tap: all 16 observed pairs have CANCELLED on both sides, **product final DOM value 0 versus plain 50**. All eight off pairs retain NOT_TESTED, also product 0 versus plain 50. Cancellation is not converted to success merely because the plain value reached 50.
- Original reported diagnosis counters are retained unchanged. A separate normalized count maps off-mode event types, and minimal-mode touchmove/capture-lifecycle types, to NOT_RECORDED rather than treating instrumentation omissions as observed zero events.

## Provenance and verification

Original ZIP: `/workspace/shared/loading76-independent-calculator/13631601940.zip`

SHA-256: `33c49490cd6f3e4f7bf33156c8806bc215f41a852d2475a4cd959d5a42ecbfc0`

Bytes: 40,625,587. ZIP entries: 475, with no duplicate names. The artifact ID 13631601940 and run ID 42515166947 are the identifiers supplied in the task; this audit verifies the provided ZIP digest and does not independently re-query GitHub's run/artifact association.

All 192 canonical JSON SHA-256 values and all 192 canonical PNG SHA-256 values match `standard-touch/report.json`. All 192 PNG signatures, chunk CRCs, and compressed image streams validate. All per-row metadata reports HEAD `cc1a760209e0dba9c94f17f64ad26acf71576bcc`, the same source hash manifest and build manifest. The 23 source hashes were independently checked against that commit's git blobs and all match (`source-at-head-verification.json`). Build output hashes were checked for consistency between records, not independently rebuilt or fetched.

All 96 pair identities are generated from the complete Cartesian product: 2 engines × 4 widths × 2 reduced-motion states × 2 input methods × 3 capture modes. Each pair contains exactly one product row and one plain row. The 24 `latest-*` JSON entries are auxiliary aliases and are not counted as additional trials. The image-adjustment section is a separate artifact section.

`report.json` stores a pre-seal final snapshot and each original row JSON stores a sealed final snapshot. The only differing final-snapshot field is `at` in all 192 rows. This reanalysis uses the original sealed row snapshots. The original report's PREPARATION_PASS status is retained, not silently reinterpreted as evidence of scroll equivalence.

## PNG review

All PNG files passed the byte/hash/format checks described above. Visual review was a **four-image spot check**, not a visual review of all 192 images:

- `chromium-375-normal-product-drag-full.png`: COMPLETED, final 50, committed 50, history 1.
- `chromium-375-normal-plain-drag-full.png`: COMPLETED, final 50, no product commit/history contract.
- `webkit-390-normal-product-tap-full.png`: CANCELLED, final 0, last input 50, committed 0, history 0.
- `webkit-390-normal-plain-tap-full.png`: CANCELLED, final 50, last input 50.

These screenshots agree with their sealed raw JSON values. The product page content and plain document clearly differ behind the standardized control. Screenshots cannot supply unrecorded document/body scroll measurements or prove a causal explanation.

## Deliverables

- `summary.json`: counts, grouped scroll values, retained result outcomes.
- `pairs96.json`, `pairs96.csv`: every original pair, identity/hash, comparisons, final values and diagnoses.
- `rows192.json`, `rows192.csv`: every original row, initial/final geometry, viewport, window/document/body-scroll availability, manifest, event-scope/result details.
- `snapshots3504.csv`: both initial/final snapshots and all 3,120 recorded event snapshots, including all eight raw rectangle fields and separately labeled derived rectangle fields.
- `events3120.jsonl`, `events3120.csv`: every recorded event including type, phase, trust, pointer type, coordinates, value, viewport and scroll.
- `zip-entry-manifest.json`: SHA-256, CRC and size for all 475 original entries.
- `original-extracted/standard-touch/`: original report, all 192 canonical JSON and all 192 PNG files extracted byte-for-byte. The untouched complete ZIP remains at the path above.
- `source-at-head/`: exact instrument, contract, schema and test-driver source from the referenced git commit.
- `source-at-head-verification.json`: 23 source-hash matches against original metadata.
- `provenance.json`: method and script hash.
- `reanalyze_original.py`: reproducible standard-library-only script. Run `python reanalyze_original.py --zip /workspace/shared/loading76-independent-calculator/13631601940.zip --out OUTPUT_DIRECTORY`.

No repository file was edited and no GitHub operation was performed.
