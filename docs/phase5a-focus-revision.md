# Phase 5A focus correction — implementation self-verification

This is implementation self-verification, not independent review. PR #49 remains Draft; no merge, auto-merge, Ready, or publication is authorized.

## Baseline and reproduced defect

Windows desktop ギャラリア, dedicated sparse checkout. Remote main `b355db856688b3cc8c3c627ddc10625bbaa45bd0`, PR HEAD `909b23dedc379d929c06b4f57f98899e930b5454`, tree `119ebe2aa9bb165615026c40ba845b0edb28b908` matched the handoff. No pre-existing working changes. No repository or ancestor AGENTS.md or applicable local .agents/skills was found. Past docs/evidence were excluded from checkout. The Phase 4B held originals/ZIPs were not accessed, transferred, or repackaged.

The unchanged product build was tested with Playwright 1.56.1, Chromium 141.0.7390.37 and WebKit 26.0 on Windows, 390px. `focus-revision/red-ready/results.json` records 14 scenarios, 10 RED and 4 PASS. At six conditions, deleting first/middle/last, after OR, or after reduced-motion Reset moved real focus from the delete BUTTON to BODY in both engines. The add button changed disabled=true to false and condition DOM count changed 6 to 5. Three-to-two and one-to-zero correctly restored focus before the fix. This confirms the static P2 candidate dynamically: immediate focus targeted the still-disabled old DOM button.

Two early browser setup attempts (`red/`, `red-chromium/`) stopped before interaction because browser/Winldd installation had not completed. They are NOT_TESTED, not product RED. Their JSON is retained separately. Browser acquisition subsequently completed using Node's system CA store with TLS verification enabled. Product dependencies and lockfile were not changed by acquisition.

## Local changes

- Filter Builder: a ref records deletion intent; useLayoutEffect restores add-button focus after React commits conditions and enables the DOM button. No sleep, retry, or forced remount. Ordinary field edits do not steal focus.
- Date Range Picker: specification A. Closed days cannot be endpoints but may lie inside a range. Only explanatory text changed; date comparison and selection logic remain intact.
- Multi-Select Chips: preserve the search-focus/independent toggle-button model. A useId-linked polite status describes current candidate name, position/count, selected state, or capped state. aria-describedby links help and status to the search input. Native buttons retain accessible names, aria-pressed, aria-disabled, and Tab access. aria-activedescendant was not added to the plain text input/group-of-buttons model; introducing a combobox/listbox would change this interaction contract. Synthetic composing Enter checks the existing isComposing guard; physical OS IME and screen-reader output remain unverified.
- Eight separate unit regressions and an additional browser harness cover maximum/first/middle/last/zero deletion, Shift+Tab/Tab, re-add, OR, Reset/reduced motion, date interior/endpoint/reverse year crossing, and Chips candidate/search/toggle/composition/cap/reset. Existing 273 tests and the original 48 browser conditions are unchanged. Additional regressions run separately in existing CI jobs; job boundaries and timeouts are unchanged.

## Verification status

The initial eight new unit tests recorded 5 RED / 3 PASS before the product changes; after changes they recorded 8 PASS. The first full check passed lint but stopped at a new test-helper TypeScript error (unsupported Testing Library exact option); that helper was corrected. Neither failed setup nor this failed check is counted as PASS. Final results and CI are recorded in the follow-up verification section and PR comment.

## Carry-forward limits

Independent re-review, real Safari/iPhone, VoiceOver, physical touch, and OS IME are NOT_TESTED. Issue #44's three existing critical findings and the earlier Windows WAAPI timeout cause UNKNOWN are not resolved by this correction. This work does not certify all dependency safety. Overall PARTIAL and merge recommendation NO pending independent re-review.
