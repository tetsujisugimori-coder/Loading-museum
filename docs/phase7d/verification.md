# 第7期D 実施記録

この文書の計画は成功証拠ではない。最終結果・HEAD・CIはPRの最終報告を参照する。

- /tmpが満杯に近いため既存ファイルを削除せず、TMPDIRと原証拠をworkspaceの専用領域へ分離した。
- 検証実施・初回失敗・修正・再実行を以下に追記する。

## Initial local checks
- TypeScript passed. ESLint passed with four pre-existing warnings.
- 44 phase7d unit/independent tests and 10 evidence-contract negative controls passed.
- Initial evidence build was refused by the existing clean-tree precondition before compilation; log retained in work/phase7d-build.log. A committed build is required next.

## Preserved local failures and corrections
- Production build initially rejected the external node_modules symlink. Reusing identical local dependency files inside this worktree allowed the unchanged build contract to succeed.
- Local git push could not obtain HTTPS credentials. The authorized GitHub connector submitted an identical tree; local source commit and connector commit were compared by tree SHA, and the original local commit is preserved separately.
- The first Chromium swipe pilot measured the returning Undo transform too early. The pointer lifecycle pilot on WebKit exposed the same problem after Reset. The trace supports a coordinate/input timing race (x352.181 instead of the usual x187.5 on a375px viewport), not a weakened interaction assertion. The harness now advances its controlled clock300ms for the existing240ms CSS return before measuring coordinates. Original failures remain in the local evidence archive.
- Default local WebKit launch reported missing shared libraries. Explicit WPE launch with the already available local library bundle is recorded separately from GitHub Actions' standard Playwright installation. This does not constitute physical Safari verification.
- The first complete local unit run contains859 successful tests (729Vitest and130Node), independently recounted. Final acceptance depends on matching final HEAD CI and raw browser artifacts, not this preliminary count alone.
