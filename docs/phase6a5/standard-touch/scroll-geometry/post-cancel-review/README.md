# Post-cancellation terminal regression

The original failed run has 768 rows, 288 accepted pairs and 192 WebKit tap record-validation errors. Every error is UNPAIRED_POINTER_END. The unmodified sample JSON files are taken from the original ZIP; provenance.json records its verified server/archive digest and member hashes.

The trusted sequence contains pointerdown(0) → touchstart → input → gotpointercapture → pointercancel(0) → pointerup(0) → lostpointercapture → touchend. Cancellation remains CANCELLED. The extra same-ID/type pointerup is retained as a post-cancel terminal, not as successful completion. Wrong ID/type, orphan/duplicate terminal siblings still reject.

Independent historical replay with the proposed comparator validates all 768 records and 384 constructions, but does NOT change the original run's failed status. Its full final CI must be executed again on the corrected HEAD. Product final 0 and plain 50 remain different in every WebKit tap condition; no causal claim is made.

The committed unit replay uses the exact two original JSON records through the immutable pre-fix comparator and the current comparator. All earlier frozen snapshots remain untouched.

The independent failed-run report and its original workspace-relative replay script are retained verbatim for provenance. The script records the reviewer's historical directory layout and is not a portable repository entry point. For a portable focused replay use `node --test tests/scroll-geometry-post-cancel.test.mjs`. Full replay requires the linked original artifact and its independently checked binding; the current read-only aggregator intentionally continues to reject the old report's recorded failure metadata.
