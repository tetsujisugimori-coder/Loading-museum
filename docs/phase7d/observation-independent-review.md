# Independent observation evidence review

Reviewed original CI run 42937810064 at HEAD f7d1bb68f529e45a5a7a03aec2a1acb2111ea8fc, tree cdb63d51f6767f0950fb8f7a64c0884640021471, plus the subsequently strengthened uncommitted auditor. This is an evidence review, not product acceptance or final-HEAD CI certification. No product or implementation files were edited by this reviewer.

## Result

No additional P1/P2 finding identified in the reviewed scope. Prior complete-trace selector/input validation and build/runner binding findings are addressed. The strengthened incomplete-prefix validation was exercised against all original traces, including all three interrupted trials.

- WebKit: 54 retained trials, 51 COMPLETE; 49 PASS, 2 FAIL, 3 NOT_TESTED.
- Chromium: 36 retained trials, 36 COMPLETE/PASS.
- All 90 raw trace sequences passed the strengthened validator. Three original incomplete traces each rejected a changed final selector, forged DOM result, and inserted evaluate call: 9 independent negative mutations rejected.
- Current observation-contract suite: 39/39 PASS, independently executed.
- Both original ZIP manifests: every listed file digest and report digest matched. Original trial/report equality was checked for all five non-PASS WebKit cases.

## Original failure facts

- WebKit Swipe A3 iteration 6: primary read dismissing; before-image read dismissed; PNG visibly displays dismissed and the Undo-restorable completed state; after-image read dismissed. Primary FAIL remains FAIL. The transition was visible before the screenshot, so screenshot alone is not established as its cause.
- WebKit Swipe A1 iteration 10: primary read dismissing after the fixed 500 ms virtual advance; no secondary observation.
- WebKit Status A1/A2 iteration 4: prefix Success expectation read Loading after 3000 ms. Target primary was never reached.
- WebKit Swipe A1 iteration 5: keyboard prefix dismissed expectation read dismissing after 500 ms. Target primary was never reached.

## Provenance

GitHub artifact metadata was read independently through the connector. Original ZIP digests match it:

- 13818764205 (WebKit): 6ab565bd3bcc1ee22f4de5927bef9c2bea28d8fd004962f1142c6cac735a2d76
- 13819208569 (Chromium): f4b8d21f5408d1eddd38dcc7d4f52e52e86fd3503fdbb41be81647db7fdd71b1

WebKit build manifest original bytes and embedded data matched; runner digest matched the source at the evidence HEAD; all 2042 committed source hashes matched. The workflow supplies DIAGNOSTIC_BUILD_DIR to check actual build output. The uploaded ZIP does not contain all output bytes, so independent offline output-byte verification was not claimed.

## Limitations and remaining acceptance work

The final report/strengthened auditor commit and its fresh CI are still pending at review time. Do not describe this f7d1bb68 evidence as final-HEAD CI. Causes remain UNKNOWN; group comparisons and later successful reads do not establish scheduling causality. Physical Safari, VoiceOver and physical input remain NOT_TESTED. Interrupted runs remain PARTIAL rather than being silently excluded.

## Auditor source fingerprints at independent review
- scripts/phase7d-observation-contract.mjs: 668d6a273084bf5aef3c549b806199d1a930f916f5bac50961afb763e128bffa
- scripts/phase7d-observation-trace-spec.mjs: e708aa91f2dce6b1c5e38adea3b18e2fa3e9b61407680b88b1ce58af2511337f
- scripts/audit-phase7d-observation.mjs: f8960a204969d76140ff2393e0ad51f737c7096f19d7168c0c600d9eaa408a73
