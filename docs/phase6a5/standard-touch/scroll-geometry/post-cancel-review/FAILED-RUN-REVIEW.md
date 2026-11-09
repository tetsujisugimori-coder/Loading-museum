# Independent review of failed final candidate ea7fa2c

**Not accepted. No success review posted.** This preserves the actual failure and separates it from a later candidate-validator replay.

## Provenance and source

- Fresh clone/fetch of `ea7fa2cd13758ea715be38d3785597ae82aa8ef7`, tree `88adfed5688012137bf50db8f0e4af0a70e22c70`.
- All 2005 baseline files unchanged; 51 additions. Source contract 41/41; immutable 27-case replay satisfied. Same cloud host as implementation, separate fresh checkout; these are not claims of a separate physical test machine.
- GitHub run `42538443562`, attempt 1, job `128907847282` failed. Browser step and aggregate step exited 1. Fault-control step and unchanged original regression executed successfully. Post setup-node cleanup was skipped; upload and checkout cleanup succeeded.
- Original artifact `13641232166`, 306324644 bytes, SHA-256 `ab6c52acc08bb628b65c95be60e964c4362abce6900041ea95eabe0b36dde683`. Downloaded ZIP matches server digest, size, run/head linkage and ZIP CRC. Original bytes are preserved unchanged.

## Raw findings

- 768 unique trial records were acquired. Runner accepted 288 pairs and recorded 192 validation errors. Every error was `UNPAIRED_POINTER_END`, affecting every WebKit tap trial.
- Exact final-source reaggregation reproduces FAIL: 768 rows, 288 accepted pairs, 386 aggregate errors. These include run/row failure flags and invalid records; do not relabel this run successful.
- Binary checks nevertheless pass all 2304 PNGs and 768 API traces. This establishes artifact structure and raw/trace consistency, not experiment acceptance or independent sensor truth.
- Real trusted WebKit sequence: pointerdown(0,touch), touchstart, input, gotpointercapture, pointercancel(0,touch), pointerup(0,touch), lostpointercapture, touchend. The old validator erased the active pointer at cancellation and rejected the subsequent native pointerup.
- In each A/B/C/D condition, WebKit tap has 24 product and 24 plain trials. All contain pointer cancellation; product final DOM value is 0, plain final DOM value is 50. Preserve this cancellation/value distinction.

## Narrow proposed validator correction

The uncommitted candidate with contract SHA-256 `aad088911ff1546f4c453a3822a0cf2dbd9cb5bcad947618e4fb053a2444f228` retains one matching-ID/type post-cancel pointerup and separately counts it. Replaying the original 768 raw records under this candidate yields valid records and 384 established pairs. Outcomes remain CANCELLED.

Independent siblings reject a changed pointer ID, changed type, orphan up without start/cancel, and duplicate post-cancel up. See `post-cancel-candidate-replay.json` and `replay-post-cancel.mjs`. This is a historical diagnostic replay, **not retroactive acceptance and not new-head browser evidence**. A fresh final-HEAD run is still required.

## Supplementary final-head evidence

- Preparation run `42538443503`, artifact `13640143849`, 3172324 bytes, SHA-256 `755d3a82e51bfd0536367f276cba3f035bba84c499cfff47f9a8db233f962188`: independent 64-row/64-PNG/16-group consistency recount passes. Post-seal execution assertions are supported by completed job logs, not repeated in this recount. Physical device and physical neutrality remain NOT_TESTED.
- Standard run `42538443514`, artifact `13640631978`, 40625069 bytes, SHA-256 `e6c8a48139aa632eb8a1022e34da40738d6659b8d6b541b3350df015d6147543`: independent 192-row/192-PNG/96-pair recount passes; all old strict comparisons remain CONDITIONS_DIFFER. This older protocol is not pooled with the new acquisition revision.
- Legacy regression inside both the standard and failed scroll artifacts independently passes its raw contract: 16 conditions, 368 checks, 64 screenshots, 64 negative controls and 283 source hashes. Browser/raster execution is not repeated and exported build bytes were not provided, so the export hash cannot be independently recomputed.
- Routing run `42538443536` is successful but native-range and adjustment-regression jobs were skipped. It is counted only for performed routing/contracts/gate checks, never browser coverage.

## Visual/API checks and limits

Original B WebKit after-images show product DOM0 with cancellation versus plain DOM50 with cancellation. An original D Chromium mid-drag image shows DOM25 while committed value/history remain initial. Associated API calls and event coordinates were inspected and saved in `failed-run-spot-inspections.json`.

Cause stays UNKNOWN; physical iPhone Safari, observer neutrality, unrecorded between-sample behavior and missing screencast/DOM snapshots are not accepted. The API finish payload duplicates the same recorder output, rather than independently confirming it. Source review and fault generators ran on the same cloud host as implementation; original browser acquisition ran on GitHub-hosted CI. No implementation files were changed by this review, and nothing was merged.
