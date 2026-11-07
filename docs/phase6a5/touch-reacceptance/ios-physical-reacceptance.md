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

## PR #72 follow-up: versioned records and automatic comparison

This section supersedes the earlier export-button instructions. The observer no longer
adds a button to the product. It does not prevent default, set capture, write a range
value, or synthesize input. Export is separate from observation, so export-time blur
cannot change the frozen final state. `isTrusted` alone **does not identify physical
hardware input**; Playwright dispatch also produces trusted events.

1. Serve an explicitly approved local build (no Pages deployment). Record exact HEAD,
   tree and SHA-256 for recorder, fixture, comparator, browser validator, product TSX,
   adjustment-model.ts, image-adjustment.css and practical.css. Use an independent
   expected manifest, not identity copied out of an untrusted submitted record.
2. Before loading the observer, set `window.__iadTouchProbeConfig` with `head`, `tree`,
   `sourceHashes` and `trialId`, `repetition` (1,2,3...), `method` (`tap` or `drag`),
   `inputKind: 'physical'`, device model, exact OS, Safari version, operator label,
   sessionId and `capture: false`. Do not include credentials or private URLs.
   This is an operator assertion, not an automatic proof of hardware input.
3. For a matched product/plain pair use the same trialId, repetition, device, viewport,
   zoom, orientation, range rect, min/max/step, touch-action and capture policy. The
   fixture accepts x/y=0. Product/plain **document scroll positions may differ**;
   actual viewport rect and touch coordinates must match. Preserve both scroll logs.
4. Start a fresh trial from Brightness=0/history=0. Record intended and observed touch
   coordinates, tap vs drag separately. Perform at least three pairs per method and
   preserve unsuccessful attempts. A drag starts at 50% and ends at 75%; a tap is at
   75%. Record screen video/screenshots when possible. Do not reinterpret a pointer
   cancel as success or add a forced commit.
5. After the gesture and rendering settle, call `window.__iadTouchProbe.finish()` in
   Web Inspector. This freezes final state and removes listeners. A still-pending
   edit fails validation. Then call `.download()`; it refuses an unsealed trial.
   Do not click a UI save control before freezing. No export event is part of the trial.
6. Save a screenshot next to each JSON. Add `png: {file: 'trial.png', sha256: '...'}`
   to that record's envelope using the actual file hash, preserving the original
   downloaded JSON separately. This attachment step does not change recorded events.
7. Run `node scripts/adjustment-physical-contract.mjs manifest.json product-tap-1.json
   plain-tap-1.json ...` with all twelve records (two surfaces × two methods × three
   repeats). CLI exit 0 means complete paired evidence with product numeric outcome
   accepted, 1 means complete comparison with product failure, and 2 means invalid,
   missing or incomparable evidence. A report's physical result is still
   `REQUIRES_OPERATOR_AND_SCREENSHOT_REVIEW`, never automatic physical PASS.

The executable JSON contract checks version, required metadata, expected HEAD/tree/
source hashes, ordering, trusted flags for native claims, coordinates, initial/final
state, touch and pointer termination, drag movement, paired geometry/input, repetition
coverage and screenshot presence/hash/CRC/IDAT decoding and pixel structure. It does not authenticate
an operator, recover missing events, prove causation, or substitute for image decoding
and visual inspection. Physical trial completeness includes both tap and drag.
Capture snapshots and subsequent animation-frame observations are distinguished and
ordered by `seq`/`observedAt`; they are not claimed to be React commit timestamps.

`verify-adjustment-probe.mjs` exercises this same observer in product and plain HTML
with matching viewport rectangles. Chromium mouse/tap/CDP drag and WebKit mouse/tap,
each capture on/off, total 20 cases. CDP is a Chromium input backend, not physical
touch and not an alternate WebKit backend. WebKit native drag and real Safari remain
NOT_TESTED. Synthetic observer unit controls are explicitly separate.


### Copyable preparation and trial example

From the clean PR #72 checkout, run:

```sh
node scripts/adjustment-probe-manifest.mjs > /tmp/iad-manifest.json
npm run build
```

Serve the build and fixture locally with an approved LAN-accessible development
server. Transfer the manifest to the test operator without modifying it. Before
loading the recorder in **each** page, paste the manifest JSON as `manifest` and set:

```js
window.__iadTouchProbeConfig = {
  ...manifest,
  trialId: 'ios-tap-1', repetition: 1, method: 'tap', inputKind: 'physical',
  device: 'ACTUAL MODEL', os: 'ACTUAL IOS VERSION', browser: 'ACTUAL SAFARI VERSION',
  operator: 'TESTER LABEL', sessionId: 'ACTUAL SESSION ID', capture: false
};
```

Replace every uppercase value with the actual observation; do not submit these
placeholders. Use `ios-tap-1` for both product and plain HTML, then `ios-tap-2/3`.
Use `ios-drag-1/2/3` for drag pairs. `sourceHashes` comes from the manifest generator,
not hand-written guesses. Save matching screenshot and envelope per trial:

```sh
# Hash the actual PNG and add its basename/digest to a copy of the downloaded JSON.
node --input-type=module -e '
import fs from "node:fs"; import {createHash} from "node:crypto";
const [raw,png,out]=process.argv.slice(1), r=JSON.parse(fs.readFileSync(raw));
r.png={file:png.split(/[\\/]/).pop(),sha256:createHash("sha256").update(fs.readFileSync(png)).digest("hex")};
fs.writeFileSync(out,JSON.stringify(r,null,2));' original.json trial.png trial-with-png.json
```

Keep original.json, trial-with-png.json and trial.png together. The comparison CLI
reads PNG files next to their envelopes and rejects missing, truncated or altered
images. Final visual/hardware review is still required even if numeric checks pass.
