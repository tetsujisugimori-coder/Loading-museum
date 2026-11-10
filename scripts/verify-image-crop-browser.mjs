import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url), pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = await fs.realpath('out'), dest = process.env.EVIDENCE_DIR || 'work/image-crop-browser'; await fs.mkdir(dest, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/Loading-museum/, ''); if (p.endsWith('/')) p += 'index.html';
    const file = await fs.realpath(path.resolve(root, '.' + p)); if (!file.startsWith(root + path.sep)) throw Error('path');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream'); res.end(await fs.readFile(file));
  } catch { res.statusCode = 404; res.end('missing'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/Loading-museum/`;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim(), sha = b => createHash('sha256').update(b).digest('hex');
const report = { head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), dirty: git('status', '--porcelain'), node: process.version, platform: process.platform, started: new Date().toISOString(), cases: [], images: [], controls: [], errors: [], notTested: ['physical Safari', 'VoiceOver', 'physical mouse/OS SendInput', 'WebKit native touch', 'real OS capture loss/backgrounding', 'browser pinch zoom'] };
report.exportSHA256 = sha(await fs.readFile(path.join(root, 'index.html'))); report.sourceCanonicalSHA256 = {};
for (const f of ['app/components/practical/ImageCrop.tsx', 'app/components/practical/CropGarden.tsx', 'app/components/practical/image-crop-model.ts', 'app/components/practical/image-crop.css', 'app/components/PracticalRoom.tsx', 'app/data/phase6aExhibits.ts', 'app/page.tsx', 'scripts/verify-image-crop-browser.mjs', 'scripts/verify-image-crop-controls.mjs', 'tests/image-crop.test.tsx']) report.sourceCanonicalSHA256[f] = sha((await fs.readFile(f, 'utf8')).replaceAll('\r\n', '\n'));
const engines = (process.env.BROWSERS || 'chromium,webkit').split(','), widths = (process.env.WIDTHS || '375,390,765,1280').split(',').map(Number), motions = (process.env.MOTIONS || 'no-preference,reduce').split(','); report.expected = engines.length * widths.length * motions.length;
let browser, page;
const near = (a, b, t = .01) => assert.ok(Math.abs(a - b) <= t, `${a} != ${b} ±${t}`);
const nearRect = (a, b) => { for (const k of ['x', 'y', 'width', 'height']) near(a[k], b[k]); };
const initial = { x: 100, y: 120, width: 480, height: 360 };
try {
  if (process.env.REQUIRE_CLEAN === '1') assert.equal(report.dirty, '', 'Source must match submitted HEAD');
  for (const engine of engines) {
    browser = await pw[engine].launch({ headless: true });
    for (const width of widths) for (const motion of motions) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: motion, hasTouch: width < 500 }); page = await context.newPage(); page.setDefaultTimeout(8000);
      const errors = [], observations = []; page.on('pageerror', e => errors.push(String(e))); report.current = { engine, version: browser.version(), width, motion };
      await page.addInitScript(() => sessionStorage.setItem('digital-motion-archive-title-seen-v1', 'seen'));
      await page.goto(url); assert.match(await page.locator('.archiveMeta').textContent(), /13 ROOMS \/ 280 OBJECTS/);
      const room = page.locator('.phase4Room'); await room.getByRole('button', { name: '部品展示室を開く', exact: true }).click(); assert.equal(await room.locator('nav button').count(), 29);
      const search = room.getByLabel('部品名・用途・技術で検索'); await search.fill('トリミング'); assert.equal(await room.locator('nav button').count(), 1); await room.locator('nav button').click(); await search.fill('');
      const stage = room.getByTestId('image-crop'), zone = stage.getByRole('group', { name: '切抜き枠の操作領域' }), frame = stage.getByTestId('ic-frame'), preview = stage.getByTestId('ic-preview'), confirmed = stage.getByTestId('ic-confirmed'), source = stage.locator('.icSource');
      await page.waitForFunction(() => document.querySelector('.icCanvas')?.dataset.ready === 'true');
      const select = stage.getByLabel('切抜き比率'), palette = await select.evaluate(el => ({ scheme: getComputedStyle(el).colorScheme, color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
      const selectPNG = await select.screenshot(), selectName = `${engine}-${width}-${motion}-ratio.png`; await fs.writeFile(path.join(dest, selectName), selectPNG); report.images.push({ name: selectName, sha256: sha(selectPNG) });
      report.palette = palette; assert.equal(palette.scheme, 'light', 'Native select must paint in the explicit light field palette');
      const click = async name => { await stage.getByRole('button', { name, exact: true }).click(); };
      const rect = () => frame.evaluate(el => Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, el[k].baseVal.value])));
      const confirmedBox = () => confirmed.getAttribute('viewBox');
      async function input(values) { for (const [label, value] of Object.entries(values)) await stage.getByLabel(label, { exact: true }).fill(String(value)); await click('数値を適用'); }
      async function ratio(value) { await stage.getByLabel('切抜き比率').selectOption(value); }
      async function snapshot(locator, name) { const data = await locator.screenshot(); await fs.writeFile(path.join(dest, name), data); report.images.push({ name, sha256: sha(data) }); }
      // Independent DOM/SVG geometry: actual frame corners in source-screen coordinates.
      async function geometry(expected) {
        await page.waitForFunction(e => {
          const f = document.querySelector('[data-testid="ic-frame"]'), p = document.querySelector('[data-testid="ic-preview"]')?.viewBox.baseVal;
          return f && p && ['x', 'y', 'width', 'height'].every(k => Math.abs(f[k].baseVal.value - e[k]) <= .01 && Math.abs(p[k] - e[k]) <= .01);
        }, expected);
        const actual = await frame.evaluate(el => { const m = el.getScreenCTM(), r = el.getBoundingClientRect(), p = new DOMPoint(el.x.baseVal.value, el.y.baseVal.value).matrixTransform(m); return { left: r.left, top: r.top, width: r.width, height: r.height, px: p.x, py: p.y, scale: m.a }; });
        nearRect(await rect(), expected); near(actual.left, actual.px); near(actual.top, actual.py); near(actual.width / actual.scale, expected.width); near(actual.height / actual.scale, expected.height);
        observations.push({ expected, frameScreen: actual });
      }
      // Raster oracle: compare actual PNG with the SAME illustration rendered at test-owned
      // coordinates and ratio. Matching DOM metadata alone cannot satisfy this check.
      async function drawing(locator, expected, label) {
        const expectedBox = `${expected.x} ${expected.y} ${expected.width} ${expected.height}`, actualArt = await locator.locator('[data-crop-art]').evaluate(el => el.outerHTML), originalArt = await source.locator('[data-crop-art]').evaluate(el => el.outerHTML);
        assert.equal(actualArt, originalArt, 'result must use the unmodified source illustration');
        const before = await locator.screenshot(), attrs = await locator.evaluate(el => ({ viewBox: el.getAttribute('viewBox'), style: el.getAttribute('style') }));
        let reference;
        try { await locator.evaluate((el, e) => { el.setAttribute('viewBox', e.box); el.style.aspectRatio = `${e.width} / ${e.height}`; }, { box: expectedBox, ...expected }); reference = await locator.screenshot(); }
        finally { await locator.evaluate((el, a) => { el.setAttribute('viewBox', a.viewBox); if (a.style === null) el.removeAttribute('style'); else el.setAttribute('style', a.style); }, attrs); }
        assert.equal(sha(before), sha(reference), `${label}: actual crop raster differs from independent expected composition`);
        const b = await locator.boundingBox(); near(b.width / b.height, expected.width / expected.height, .015); return sha(before);
      }
      await geometry(initial); const houseHash = await drawing(preview, initial, 'initial preview'); await drawing(confirmed, initial, 'initial committed');
      assert.equal(await stage.getByRole('button', { name: '切抜きを確定' }).isDisabled(), true);
      const saved = await confirmedBox(); await input({ X: 650, Y: 80, 幅: 300, 高さ: 420 }); const orchard = { x: 650, y: 80, width: 300, height: 420 };
      await geometry(orchard); const orchardHash = await drawing(preview, orchard, 'orchard preview'); assert.notEqual(houseHash, orchardHash); assert.equal(await confirmedBox(), saved); await drawing(confirmed, initial, 'committed stays initial');
      if (width === 375 || width === 1280) await snapshot(stage, `${engine}-${width}-${motion}-orchard.png`);
      await click('切抜きを確定'); await ratio('wide'); await click('↓ 下'); await click('編集を取消'); await geometry(orchard); assert.equal(await stage.getByLabel('切抜き比率').inputValue(), 'free'); await drawing(confirmed, orchard, 'confirmed orchard'); await click('Reset');
      // Native Playwright mouse input; source screen scale independently converts its delta.
      async function nativeDrag(handle, dx, dy, escape = false) {
        await zone.scrollIntoViewIfNeeded(); const target = handle ? stage.locator(`[data-crop-handle="${handle}"]`) : frame, b = await target.boundingBox(), scale = await source.evaluate(el => el.getScreenCTM().a);
        const x = b.x + b.width / 2, y = b.y + b.height / 2;
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 3 });
        if (escape) await page.keyboard.press('Escape'); await page.mouse.up(); return { dx: dx / scale, dy: dy / scale };
      }
      const delta = await nativeDrag(null, 12, 8); const dragged = { ...initial, x: initial.x + delta.dx, y: initial.y + delta.dy }; await geometry(dragged); await drawing(preview, dragged, 'native moved preview'); assert.equal(await confirmedBox(), saved);
      await input({ X: dragged.x, Y: dragged.y, 幅: dragged.width, 高さ: dragged.height }); await geometry(dragged); await nativeDrag(null, 10, 5, true); await geometry(dragged);
      for (const corner of ['nw', 'ne', 'sw', 'se']) {
        await click('Reset'); const d = await nativeDrag(corner, 7, 5), west = corner.endsWith('w'), north = corner.startsWith('n');
        const expected = { x: initial.x + (west ? d.dx : 0), y: initial.y + (north ? d.dy : 0), width: initial.width + (west ? -d.dx : d.dx), height: initial.height + (north ? -d.dy : d.dy) }; await geometry(expected); await drawing(preview, expected, corner);
      }
      // Boundary/minimum and ratio checks include actual pointer input at each corner.
      for (const fixed of ['square', 'wide', 'photo']) { await click('Reset'); await ratio(fixed); await nativeDrag('se', 13, 9); const r = await rect(); near(r.width / r.height, { square: 1, wide: 16 / 9, photo: 4 / 3 }[fixed], .00001); await drawing(preview, r, fixed); }
      await click('Reset'); await input({ X: 780, Y: 590, 幅: 200, 高さ: 100 }); await ratio('square'); await geometry({ x: 780, y: 500, width: 200, height: 200 });
      await ratio('free'); await input({ X: 0, Y: 0, 幅: 80, 高さ: 80 }); await click('← 左'); await click('↑ 上'); await geometry({ x: 0, y: 0, width: 80, height: 80 });
      await input({ X: 920, Y: 620, 幅: 80, 高さ: 80 }); await click('→ 右'); await click('↓ 下'); await geometry({ x: 920, y: 620, width: 80, height: 80 });
      for (const bad of ['', 'Infinity', 'NaN', '-1', '1001']) { const old = await preview.getAttribute('viewBox'); await stage.getByLabel('X', { exact: true }).fill(bad); await click('数値を適用'); assert.equal(await preview.getAttribute('viewBox'), old); assert.match(await stage.getByRole('status').textContent(), /空欄|有限|内側/); }
      await click('Reset'); await ratio('wide'); await geometry({ x: 100, y: 165, width: 480, height: 270 }); const fixedBeforeInvalid = await preview.getAttribute('viewBox');
      await stage.getByLabel('幅', { exact: true }).fill('Infinity'); await click('数値を適用'); assert.match(await stage.getByRole('status').textContent(), /有限/); assert.equal(await preview.getAttribute('viewBox'), fixedBeforeInvalid);
      // Synthetic cancellation/foreign pointer/stale probes: stub capture only here.
      await zone.evaluate(el => { el.__capture = el.setPointerCapture; el.setPointerCapture = () => {}; });
      for (const [corner, minimum, maximum] of [
        ['nw', { x: 500, y: 400, width: 80, height: 80 }, { x: 0, y: 0, width: 580, height: 480 }],
        ['ne', { x: 100, y: 400, width: 80, height: 80 }, { x: 100, y: 0, width: 900, height: 480 }],
        ['sw', { x: 500, y: 120, width: 80, height: 80 }, { x: 0, y: 120, width: 580, height: 580 }],
        ['se', { x: 100, y: 120, width: 80, height: 80 }, { x: 100, y: 120, width: 900, height: 580 }],
      ]) for (const expand of [false, true]) {
        await click('Reset'); const sx = corner.endsWith('w') ? 1 : -1, sy = corner.startsWith('n') ? 1 : -1, sign = expand ? -1 : 1;
        await stage.locator(`[data-crop-handle="${corner}"]`).dispatchEvent('pointerdown', { pointerId: 70, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 });
        await zone.dispatchEvent('pointermove', { pointerId: 70, clientX: sx * sign * 100000, clientY: sy * sign * 100000 });
        await zone.dispatchEvent('pointerup', { pointerId: 70, clientX: sx * sign * 100000, clientY: sy * sign * 100000 }); await geometry(expand ? maximum : minimum);
      }
      async function syntheticStart() {
        await geometry(initial); const scale = await source.evaluate(el => el.getScreenCTM().a);
        await frame.dispatchEvent('pointerdown', { pointerId: 77, pointerType: 'mouse', button: 0, clientX: 120, clientY: 150 }); await zone.dispatchEvent('pointermove', { pointerId: 77, clientX: 140, clientY: 160 });
        await geometry({ ...initial, x: 100 + 20 / scale, y: 120 + 10 / scale }); assert.equal(await zone.getAttribute('data-dragging'), 'true');
      }
      async function stale() { await zone.dispatchEvent('pointermove', { pointerId: 77, clientX: 190, clientY: 210 }); await zone.dispatchEvent('pointerup', { pointerId: 77, clientX: 190, clientY: 210 }); }
      await click('Reset'); await syntheticStart(); const provisional = await preview.getAttribute('viewBox'); await frame.dispatchEvent('pointerdown', { pointerId: 78, pointerType: 'mouse', button: 0, clientX: 120, clientY: 150 }); await zone.dispatchEvent('pointermove', { pointerId: 78, clientX: 400, clientY: 400 }); await zone.dispatchEvent('pointerup', { pointerId: 78 }); assert.equal(await preview.getAttribute('viewBox'), provisional); await zone.dispatchEvent('pointercancel', { pointerId: 77 }); await stale(); await geometry(initial);
      for (const action of ['lostpointercapture', 'blur', 'hidden', 'Reset', '切抜きを確定', '編集を取消', 'ratio', 'numeric']) {
        await click('Reset'); await syntheticStart();
        if (action === 'lostpointercapture') await zone.dispatchEvent(action, { pointerId: 77 });
        else if (action === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        else if (action === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; });
        else if (action === 'ratio') await ratio('square'); else if (action === 'numeric') await click('数値を適用'); else await click(action);
        const immediate = { box: await preview.getAttribute('viewBox'), dragging: await zone.getAttribute('data-dragging') };
        await page.waitForFunction(() => document.querySelector('.icCanvas')?.dataset.dragging === 'false');
        const expected = action === 'ratio' ? { x: 100, y: 60, width: 480, height: 480 } : initial;
        await geometry(expected);
        const stable = await preview.getAttribute('viewBox'); await stale(); assert.equal(await preview.getAttribute('viewBox'), stable); assert.equal(await zone.getAttribute('data-dragging'), 'false'); assert.equal(await confirmedBox(), saved);
        (report.renderTransitions ??= []).push({ engine, width, motion, action, immediate, afterRender: stable });
      }
      await zone.evaluate(el => { el.setPointerCapture = el.__capture; delete el.__capture; });
      await click('Reset'); await click('→ 右'); await click('切抜きを確定'); const stable = await preview.getAttribute('viewBox'), committedStable = await confirmedBox();
      await zone.evaluate(el => el.style.width = '0px'); await page.waitForFunction(() => document.querySelector('.icCanvas')?.dataset.ready === 'false'); assert.equal(await preview.getAttribute('viewBox'), stable);
      await zone.evaluate(el => el.style.width = ''); await page.waitForFunction(() => document.querySelector('.icCanvas')?.dataset.ready === 'true'); assert.equal(await preview.getAttribute('viewBox'), stable); assert.equal(await confirmedBox(), committedStable);
      await page.setViewportSize({ width: width + 30, height: 1000 }); assert.equal(await preview.getAttribute('viewBox'), stable); await page.setViewportSize({ width, height: 1000 }); await geometry({ ...initial, x: 110 });
      await stage.getByLabel('X', { exact: true }).focus(); await page.keyboard.press('ArrowRight'); assert.equal(await preview.getAttribute('viewBox'), stable); await zone.focus(); await page.keyboard.press('ArrowRight'); await geometry({ ...initial, x: 120 });
      const handle = stage.getByRole('button', { name: '右下の角を伸縮' }); await handle.focus(); await page.keyboard.press('ArrowDown'); await geometry({ ...initial, x: 120, height: 370 }); assert.equal(await handle.evaluate(el => el === document.activeElement), true);
      const focusStyle = await handle.evaluate(el => ({ outline: getComputedStyle(el).outlineStyle, width: el.clientWidth, height: el.clientHeight })); assert.notEqual(focusStyle.outline, 'none'); assert.ok(focusStyle.width >= 40 && focusStyle.height >= 40);
      // Two deliberately wrong rendered crops must be caught by the raster/ratio oracle.
      if (width === 375 && motion === 'no-preference') {
        const expected = { ...initial, x: 120, height: 370 }, attrs = await preview.evaluate(el => ({ viewBox: el.getAttribute('viewBox'), style: el.getAttribute('style') }));
        for (const fault of ['wrong-position', 'stretched-ratio']) {
          await preview.evaluate((el, fault) => { if (fault === 'wrong-position') el.setAttribute('viewBox', '0 0 480 370'); else el.style.aspectRatio = '1 / 1'; }, fault);
          await snapshot(preview, `${engine}-${width}-${motion}-fault-${fault}.png`);
          let rejected = false; try { await drawing(preview, expected, fault); } catch (e) { assert.match(String(e), /raster differs|!=/); rejected = true; }
          assert.equal(rejected, true, `${fault} must be rejected`); report.controls.push({ engine, fault, result: 'REJECTED', type: 'temporary DOM render fault' });
          await preview.evaluate((el, a) => { el.setAttribute('viewBox', a.viewBox); el.setAttribute('style', a.style); }, attrs); await drawing(preview, expected, 'restored');
        }
      }
      if (width === 375 || width === 1280) { await snapshot(stage, `${engine}-${width}-${motion}-exhibit.png`); await snapshot(zone, `${engine}-${width}-${motion}-frame.png`); }
      // Chromium touch emulation is distinct from synthetic pointer dispatch and real devices.
      if (engine === 'chromium' && width === 375 && motion === 'no-preference') {
        await click('Reset'); await zone.scrollIntoViewIfNeeded(); const b = await frame.boundingBox(), cdp = await context.newCDPSession(page), x = b.x + b.width / 2, y = b.y + b.height / 2;
        const old = await preview.getAttribute('viewBox');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 2, y: y + i }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); assert.notEqual(await preview.getAttribute('viewBox'), old);
        const scroll = await page.evaluate(() => scrollY), crop = await preview.getAttribute('viewBox');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 450 }] });
        for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 450 - i * 20 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForFunction(s => scrollY > s + 10, scroll); assert.equal(await preview.getAttribute('viewBox'), crop);
        report.touch = { source: 'Chromium CDP emulated touch', cropDrag: 'PASS', outsidePageScroll: 'PASS', physicalDevice: false };
      }
      const overflow = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth })); assert.ok(overflow.scroll <= overflow.viewport, JSON.stringify(overflow)); assert.deepEqual(errors, []);
      // Close during drag; late release is unable to mutate the remounted exhibit.
      await click('Reset'); await zone.scrollIntoViewIfNeeded(); const f = await frame.boundingBox(); await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2); await page.mouse.down(); await page.mouse.move(f.x + f.width / 2 + 5, f.y + f.height / 2 + 5);
      await room.getByRole('button', { name: '閉室して一覧へ戻る', exact: true }).evaluate(el => el.click()); await page.mouse.up(); assert.equal(await stage.count(), 0); assert.equal(await room.getByRole('button', { name: '部品展示室を開く', exact: true }).evaluate(el => el === document.activeElement), true);
      await room.getByRole('button', { name: '部品展示室を開く', exact: true }).click(); await page.waitForFunction(() => document.querySelector('.icCanvas')?.dataset.ready === 'true'); await geometry(initial);
      // Existing Pan & Zoom remains reachable and operational in the same room.
      await room.getByRole('button', { name: 'Pan & Zoom / 拡大して探す', exact: true }).click(); await page.waitForFunction(() => document.querySelector('.pzViewport')?.dataset.ready === 'true'); await room.getByRole('button', { name: '拡大', exact: true }).click(); assert.match(await room.getByTestId('pz-reading').textContent(), /150%/); assert.deepEqual(errors, []);
      report.cases.push({ ...report.current, status: 'PASS', native: 'Playwright mouse/keyboard', synthetic: ['all corners past opposite/at source boundaries', 'foreign pointer', 'cancel', 'lost capture', 'hidden', 'blur', 'stale after command'], observations, overflow, pageerrors: errors, houseHash, orchardHash }); console.log('PASS', engine, width, motion); await context.close(); page = null;
    }
    await browser.close(); browser = null;
  }
} catch (e) { report.errors.push(String(e.stack || e)); console.error(e); process.exitCode = 1; if (page) await page.screenshot({ path: path.join(dest, 'failure.png'), fullPage: true }).catch(() => {}); }
finally { if (browser) await browser.close().catch(() => {}); await new Promise(r => server.close(r)); report.complete = report.cases.length === report.expected && !report.errors.length; report.finished = new Date().toISOString(); await fs.writeFile(path.join(dest, 'results.json'), JSON.stringify(report, null, 2)); if (!report.complete) process.exitCode = 1; }
