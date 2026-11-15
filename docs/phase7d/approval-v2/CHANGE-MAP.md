# LM88-CHANGE-MAP v2

2026-11-15. A-only documentation scope. Original files are retained byte-for-byte, not retroactively amended.

| Prior item | Byte-level finding | v2 treatment |
|---|---|---|
| API GitHub MD hash c5dd02… | matches recovered12116-byte current MD, including appended calibration/global-cap and two-stage attestation paragraphs, UTF-8 no BOM LF | exact original included; annex adds concrete future obligations |
| WAAPI GitHub MD hash5e26a6… | matches recovered12903-byte current MD, including appended paragraphs, UTF-8 no BOM LF | exact original included; editorial clarification below |
| API/WAAPI posted JSON hashes | match recovered7929/7348-byte full JSON, UTF-8 no BOM LF | full original JSON included, slot order unchanged22/13 |
| GitHub complete comment vs Vault posting draft | API13845 and WAAPI14664 bytes, exact equality | comment contains heading/hash/order table in addition to MD; comment SHA is NOT MD SHA |
| `registration-identities.json` | older JSON hashes799b11…/45abff…; superseded by combined identity file | private old identity and original versions retained, status not silently updated |
| `combined-design-identities.json` | current6 design/JSON/cause-ledger byte sizes and hashes reconcile | current register adds primary ledgers and old-version identities; old file remains preserved |
| WAAPI transfer display appeared as `play-click-before��ready-await-continuation` | independent actual-byte check found zero U+FFFD and the original correct arrow `→`; initial interpretation of a display artifact was wrong | no original-text correction warranted. Retain exact original;373ms includes click/native/scheduling/continuation, NOT Promise pending duration. This row records the author's corrected interpretation, not a defect in the source |
| Missing concrete future artifacts | no diagnostic code/build/CPU pins/capture implementation produced | null/uncreated and C blocked; no invented actual hash |
| PR body old b6a150d report | historical top does not describe5de4 documentation baseline | prepend current package status; retain old body under historical heading |

`publication-comparison.json` records exact body hashes and full JSON slot order. Table order is separately compared, not inferred just from presence of IDs. Source baseline inventory is from Git objects (including dotfiles), not from execution logs. There is no claim that this A package makes old executed-byte binding proven.

Private primary ledgers are inspected and hashed, not copied into public Git: API old72=64PASS/3FAIL/5NOT_TESTED; WAAPI old observationFAIL/other4suitesPASS. New5de results remain distinct historical runs (API61PASS/6FAIL/5NOT_TESTED; WAAPI observationFAIL with404ms interval), as reported in prior final report. We do not turn reported81ZIP+21log preservation into a new full raw-evidence audit.
