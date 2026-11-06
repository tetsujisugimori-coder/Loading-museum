# Image Annotation & Hotspots / Phase 6A-4

Issue #67. A browser-local exhibit, not an image editor service. No uploaded images, network saves, persistence, collaboration, or AI annotation generation.

## Interaction contract

- Original source artwork: an imaginary island map (1200×760) and imaginary weather instrument (760×1000), made as SVG specifically for this exhibit. Samples point to actual objects in those drawings. These are not historical documents or reproductions.
- Pin: number, title, description, color, location. Arrow: both endpoints, color and stroke. Rectangle: translucent fill, outline, move and four corner handles. Text: location, title and description, optional reference to another pin/rectangle. A dotted connector follows the linked target.
- Image click adds pin/text. Image drag creates arrow/rectangle. A selected annotation is rendered above the others so its handles remain usable even when shapes overlap. All four types can also be added at the center and edited through native forms without dragging.
- Position fields use normalized image coordinates 0–1. Rectangle X/Y and X2/Y2 are its opposite corners, equivalent to location and size. Arrow fields are its start/end points. Title is 1–100 characters, description up to 1500, number a positive safe integer, line width 1–12. Form edits are tentative until Apply.
- Drag preview is separate from committed annotations. Pointer release creates exactly one history operation, regardless of move-event count. Escape, pointercancel, lost capture, external focus loss, unavailable viewport, selection/tool/scene/mode change cancel the draft. Invalid endpoint release rolls back and terminates the gesture.
- Only the owner pointer and generation can modify a draft; monotonic timestamps reject older inputs. An invalidated session cannot overwrite later commits. Detached callbacks check liveness. Concurrent pointer downs do not replace the owner.
- Undo/Redo stores exact annotation snapshots for the latest 50 committed operations. It restores additions, geometry, text, colors, deletion and linked references. A new commit clears redo. Deleting a target retains text but removes its link; Undo restores both atomically.
- Reset restores the current scene's completed sample, edit mode, empty history and stopped guide. Scene switching discards all edits/history, preserves selected edit/view mode, and loads that scene's sample. Closing the exhibit unmounts it; reopening is fresh.

## Image-space contract

Annotations are normalized to each source image, not the SVG viewport. For source size W,H and viewport width Vw,height Vh, scale = min(Vw/W, Vh/H). The contained image is centered, with offsets (Vw−W×scale)/2 and (Vh−H×scale)/2. Client coordinates subtract the current viewport position and these offsets, then divide by contained dimensions. Scrolling uses fresh client bounds at input time. CSS does not add a border to the SVG viewport. Image and overlay share one preserveAspectRatio="xMidYMid meet" viewBox.

No image-naturalWidth assumption is used: WebKit's reported intrinsic SVG dimensions need not match the declared source coordinate system. Zero/non-finite dimensions reject input, and resizing cancels active gestures without modifying committed coordinates. Margin input cannot create annotations; already-owned drags clamp at image edges.

Coordinates remain binary64 values. String(number) is the lossless form codec. Numeric fields reject nonfinite/out-of-range values and decimal spellings whose intended precision cannot be preserved by that codec. Rectangle width/height and arrow normalized length must be at least 0.025. Numeric validation never enlarges limits with an epsilon. Only producer-side operations repair a rounding result toward a feasible representable boundary. No-op and repeated form application remain exact. Unit stress probes cover edge, minimum and round-trip cases.

## Guide and accessibility

Guide order is stable ascending annotation number, including number edits; list, highlight and description use the same order. Play, pause/resume, restart, previous/next, list jump and End are distinct controls. Each playing item has 3.5 seconds; after the final interval the last item remains highlighted with a finished message. Duplicate/stale timer generations are ignored. Guide playback enters view mode and disables edits. Switching to edit ends the guide. Window blur, page hidden, offscreen root or unavailable viewport pauses playback. Ordinary canvas focus changes and positive resizing do not interrupt it.

Reduced motion preserves every annotation and every control; there is no camera travel or decorative movement to skip. Tab reaches palette, SVG annotation buttons, list, forms and guide controls. Enter/Space selects an annotation, arrow keys on the canvas move it 1% (Shift:5%), Delete removes it, Escape cancels a drag. In guide mode left/right step through stops. Form inputs retain native text navigation. Selection uses number, checkmark and outline, not only color. Deletion and guide End return focus to canvas; form submission returns focus to Apply. Primary buttons are at least44 CSS pixels. Annotations use44px hit regions; very tightly packed or minimum-sized shapes can overlap, so the list and form provide the equivalent unambiguous alternative.

## Verification and evidence

Run `npm run check`, `node --test tests/regression-result-contract.test.mjs`, `node scripts/inventory.mjs`, and the existing regression workflows. The new browser harness is `scripts/verify-image-annotation-browser.mjs`, using pinned Playwright1.56.1 and pngjs7 outside app dependencies. `.github/workflows/verify-image-annotation.yml` runs Chromium/WebKit ×375/390/765/1280, each with normal/reduced motion (16 cases).

Each case observes input events (trusted/synthetic identified), committed state mirrored into DOM, SVG geometry, and PNG pixels separately. It covers creation, both arrow ends, four rectangle corners, no-op form round trips, deletion/Undo/Redo, pointer cancel/Escape/foreign/late input, interrupted selection, letterboxing, resized and zero-sized viewports, keyboard/focus, native touch tap (plus Chromium CDP touch drag), guide lifecycle, long text and scene switch. A deliberate240-source-pixel translation must fail the same pin-paint oracle and pass after removal.

Results are stored in a fresh run directory with parent-created UUID, HEAD/tree, actual export SHA-256, exact ordered case/check sets, input events and image hashes. The result contract rejects empty, duplicate, stale, partial, failed, no-input, missing-screenshot and undetected-fault results. Contract fixture tests are not counted as browser passes. Final acceptance must match the submitted HEAD; exploratory dirty-tree results are not final-head evidence.

See `docs/image-annotation-evidence/README.md` and the PR for the current measured results, failures and limitations. This is implementation self-verification, not independent acceptance. **Merge recommendation remains NO before independent review.** Existing #44 security and #54 device/verification gaps remain open.

## PR #68 keyboard reacceptance contract

- Tab only moves focus; it does not select or reorder annotation marks.
- Arrow keys and Delete/Backspace delivered to an annotation edit that focused annotation. Arrow editing also selects it. Keys delivered to the canvas itself edit the explicit selection.
- Enter/Space select the focused annotation. Deletion returns focus to the canvas. Undo restores the whole annotation transaction, including related links.
- The original head `60ed975e1d934c032521f5217e12c9d984caff5b` edited the previous selection instead of the focused mark. Independent Chromium actual Tab and programmatic focus controls reproduced ArrowRight and Delete (four fresh-page cases). Unit RED covered ArrowRight/Delete/Backspace; the local fix passes all 14 component tests.
- Browser evidence now records focus and annotation identity and checks Tab/focus against arrows, Delete, Backspace, Enter and Space. Result acceptance also requires fault removal recovery, actual PNG files and matching SHA-256, not filenames alone.
- This is a candidate pending fixed-head browser/CI and independent reacceptance. Final outcome belongs in PR #68's evidence record. Physical input, Safari devices and assistive technology are not inferred from Playwright results. Issues #44 and #54 remain open risks.
