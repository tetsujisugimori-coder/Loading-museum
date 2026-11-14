# Boundary preparation validation registration (not production)

Baseline b0eb2feb715eb0614550e6b227e83e3b0cb43de2; previous120 paths and output untouched.

Predeclared normal validation: 3 groups (A/B/C) x 2 engines (Chromium/WebKit) x 2 targets (Swipe/Status), iteration1 only = 12 validation records. Every record has validation-* namespace and independent output. All108 production slots remain NOT_EXECUTED. These are engineering validation, not the preregistered experiment or failure-rate evidence.

Fault validation: isolated C builds, Chromium, Swipe target, each currently supported source mutation once. Fixed target-callback ordinal2 excludes keyboard prefix ordinal1. Separate output per fault. Callback body suppression is not proof of callback delivery suppression. Commit delay, cancellation race and DOM reflection delay remain NOT_TESTED unless actual distinct mechanisms are implemented and observed. No synthetic log-only fault is counted as runtime injection.

Build attempts are immutable new directories. A source change during concurrent implementation correctly makes the build manifest fail; successful Next compilation alone is not a valid build provenance PASS. Freeze sources before definitive build/run.

New CI is validation-only, no production switch exists. PR synchronization still triggers pre-existing old120 workflows. Their results and failures remain separately identified and retained, never pooled with the new validation evidence. Existing workflow/old120 source is unchanged.

The original source defines virtual clock advances and API timeout, not a host wall-clock deadline. The latter is NOT_DEFINED_BY_ORIGINAL_CONTRACT, not invented or interpreted as500/3000ms host time. Product cause and instrumentation neutrality remain UNKNOWN.
