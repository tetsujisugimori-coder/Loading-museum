# Physical iPhone Safari / native range event comparison protocol

**STATUS: NOT_TESTED.** This provides a repeatable measurement procedure, not a physical iPhone result. Issues #69 and #71, PR #70. No deployment, browser security settings, product cancellation contract, or source pixels are changed here.

## Preparation
- Use a physical iPhone and its real Safari browser. Record the device model, iOS/Safari build, orientation, zoom, UTC time, product HEAD/tree and tester. Do not confuse desktop WebKit emulation with physical touch.
- Make the same fixed product HEAD available to that iPhone through an approved development server on the local network. Do not publish GitHub Pages merely to perform this test.
- For a plain HTML control, locally serve this directory (for example Python http.server), and open ios-native-range.html from the iPhone. Its control supports query parameters x, y, w, h (CSS pixel rectangle) and touchAction=auto/pan-y/none.
- Attach an approved Safari Web Inspector to the physical device. With Image Adjustment open, paste the contents of ios-range-instrument.js into the product page console. On the plain HTML fixture the same script loads automatically. The probe does not preventDefault, modify slider values, synthesize events, or upload data.

## Capture steps
1. On the product page with Brightness=0 and no open gesture, inject the observer before touching the range. Record the nativeRange.rect values reported to the inspector and capture a screenshot.
2. Perform one genuine finger tap at 75% of the native range width. After the final state settles, select Save touch probe JSON and retain the file.
3. Reload the product page for a fresh value=0 and history=0. Reinject the observer and perform one genuine finger drag from 50% to 75% horizontally, then release. Export another JSON.
4. Repeat both physical operations at least 3 times without deleting failed records. Record any scrolling, loss of focus, backgrounding or interruptions.
5. On the standalone HTML fixture, set x/y/w/h from the recorded product CSS rectangle to approximate the same target location and dimensions, then repeat the tap and drag sequences three times each. Preserve actual geometry in all exports; annotate when scrolling or layout means geometry is not equivalent.
6. Preserve the actual gesture sequence and screenshots. Do not sort events by timeStamp instead of observed order.

## Fields and interpretation
Each file records source surface (product versus plain HTML), browser user agent, bounding rect and touch-action, pointer ID/type, isTrusted, event type and order, event timeStamp, observer time, input value, pending preview, committed value, history, focus/blur and scrolling. Captured and next-animation-frame states differ; next-frame is not a guarantee of React render completion, so each export also contains a separate final snapshot.

Compare pointerdown/move/up/cancel and lostpointercapture, touchstart/move/end/cancel, input/change/focus/blur. Compare tap and drag **separately**. Synthetic JavaScript dispatchEvent is untrusted and not evidence of physical native drag.

Playwright 1.56.1 source uses Input.dispatchTapEvent for WebKit and Input.dispatchTouchEvent(touchStart/touchEnd) for Chromium. The difference is confirmed; where the observed WebKit pointercancel originates is UNKNOWN. Playwright touchscreen.tap offers only a tap API, not native WebKit drag. A separate upstream issue about canceled pointerdown preventing click is not a confirmed duplicate of this native range pointercancel.

## Decision and evidence preservation
Physical PASS/FAIL requires actual on-device event records and product final state. The cause remains UNKNOWN unless the engine-versus-automation boundary is isolated. Unperformed gestures and operating systems are NOT_TESTED. Never ignore pointercancel, force a commit, weaken assertions, or reclassify existing CI failures as success.

Keep previous fixed HEADs, failed native Actions jobs, original ZIPs, PNGs and hashes, red/green timelines and the new raw iPhone traces as separate evidence. Do not mark PR #70 ready or merge it without independent validation on any new HEAD.
