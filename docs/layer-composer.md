# Layer Composer / 第6期A-6

## Editing contract

The practical room entry is `Layer Composer / 画像を重ねて作品を作る`. Three original, procedurally drawn canvas assets (landscape, sun and leaves) are generated synchronously with Canvas 2D. They are project-owned teaching artwork, not third-party photographs. No network image request, user upload, tracking or persistent storage is added.

The work is always **600×400 logical pixels**, including its downloaded PNG, regardless of CSS size or device pixel ratio. Model coordinates are separate from viewport coordinates. Width/height range 1–1200, X −1200–600, Y −1200–400; overflow is clipped at output. Aspect-lock uses the selected layer's current ratio. The top list entry is foreground; transparent regions are still rectangular selection targets. Up to20 layers and60 completed undo steps are retained. IDs are never reused after undo.

Select in list or canvas. Drag with mouse; touch movement requires the explicit checkbox (OFF permits vertical page scrolling). Use X/Y and dimensions as alternatives, or focus canvas and press arrows (1px) / Shift+arrows(10px). Numeric input is applied together with its button. Locked layers cannot move or resize; appearance, visibility and ordering remain editable. Hidden layers are omitted from render/export. Position/size Reset is different from whole-work Reset.

Normal uses source-over; Multiply multiplies channels; Screen uses `Cs+Cb−Cs×Cb`. Canvas 2D applies source alpha multiplied by layer opacity, then composites in back-to-front order. Fully transparent source pixels preserve the backdrop. Output includes transparency where no visible layer covers the canvas. Browser rounding is permitted within2 channel units in the independent small-fixture oracle; canvas-to-PNG round-trip must be byte-exact after decoding. Selection frames are DOM overlays and never enter output.

## History, cancellation, failures

A pointer drag and an opacity range interaction have one pre-operation snapshot and one commit, not one entry per movement. Escape, pointercancel, blur and resize cancel pending edits. Undo followed by a new edit discards redo. Reset can itself be undone. A cancelled gesture cannot be committed by a late pointerup. Controls expose numeric values and keyboard alternatives; no animation is required.

Preview and PNG rerender the current model with the same Canvas renderer. Export is disabled until assets are ready and during pending edits. Missing assets, invalid numbers, context failure and null/throwing PNG encoding fail visibly. An asynchronous PNG callback is discarded if editing changed in the meantime. “生成してブラウザへ渡しました” is not a claim that the OS finished saving.

## Verification and limitations

`npm run check` runs lint, type checking and complete existing+new tests. `scripts/verify-layer-composer.mjs` requires a production `out/`, Playwright1.56.1 and pngjs7 supplied separately. It runs Chromium/WebKit ×375/390/765/1280 ×normal/reduced. Environment variables PLAYWRIGHT_MODULE / PNG_MODULE select optional tools, BROWSERS/WIDTHS/MOTIONS select explicit subsets; subsets never claim16 conditions. REQUIRE_CLEAN=1 rejects dirty submissions. Reports include actual HEAD/tree and build hash, fresh run nonce and per-case checks. CI uploads raw artifacts even on failure; report status must independently be PASS.

The tiny-image oracle supplies literal RGBA data and independently calculates W3C alpha/blend equations, not production helpers. It decodes PNG pixels, rejects an intentionally corrupted pixel and checks recovery. Missing-image, invalid-state, missing-context, PNG output failure and cancelled gestures are negative controls. Native touch protocol, synthetic pointercancel and physical hardware are distinguished in reports.

Physical iPhone Safari, physical multitouch/keyboard, VoiceOver and OS200% scaling remain NOT_TESTED. Automated CSS200% font scaling is separate. No resolution of A5 native range/pointercancel diagnostics or Issues44/54 is inferred. No unpublished A5 branch is a dependency. No deployment or merge is performed by this work.
