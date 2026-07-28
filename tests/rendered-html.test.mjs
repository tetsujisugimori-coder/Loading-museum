import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../out/", import.meta.url);

test("GitHub Pages用の静的HTMLへ9種類の展示を書き出す", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<title>世界のローディング画面博物館<\/title>/);
  assert.match(html, /CUIの回転文字/);
  assert.match(html, /点が増える表示/);
  assert.match(html, /Windows風の砂時計/);
  assert.match(html, /初期WebのGIF風スピナー/);
  assert.match(html, /Apple風の点が巡るスピナー/);
  assert.match(html, /Windows Vista風の青い光/);
  assert.match(html, /CSSの円弧スピナー/);
  assert.match(html, /プログレスバー/);
  assert.match(html, /スケルトンスクリーン/);
  assert.equal((html.match(/class="exhibit"/g) ?? []).length, 9);
  assert.equal((html.match(/class="stage" role="img"/g) ?? []).length, 9);
  assert.doesNotMatch(html, /72%/);
});

test("既存9展示の下へ閉じたMS-DOS展示室と8種類の展示を書き出す", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /時代別展示室/);
  assert.match(html, /MS-DOS・PCコマンドライン展示室/);
  assert.match(html, /1980年代〜1990年代/);
  assert.match(html, /文字だけで待機や進捗を表現した時代/);
  assert.match(html, /8(?:<!-- -->)? EXHIBITS/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(
    html,
    /aria-controls="ms-dos-pc-command-line-panel"/,
  );
  assert.match(html, /id="ms-dos-pc-command-line-panel"/);
  assert.equal((html.match(/class="dosExhibit"/g) ?? []).length, 8);
  assert.equal((html.match(/再現方法を見る/g) ?? []).length, 13);
  assert.equal((html.match(/実装コメント/g) ?? []).length, 13);

  for (const title of [
    "回転スピナー",
    "ドット増加",
    "点滅する待機表示",
    "文字プログレスバー",
    "ファイルコピー表示",
    "圧縮ファイル展開表示",
    "コンパイル進行表示",
    "ディスク確認風表示",
  ]) {
    assert.match(html, new RegExp(title));
  }

  assert.match(html, /当時広く使われた表現/);
  assert.match(html, /時代風の再現/);
});

test("MS-DOS展示室の下へ閉じたLinux / UNIX展示室と5種類のデモを書き出す", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /Linux \/ UNIX 展示室/);
  assert.match(html, /1970年代〜現在/);
  assert.match(
    html,
    /端末ログ、起動、サービス管理、パッケージ操作の多様な系譜/,
  );
  assert.match(html, /5(?:<!-- -->)? EXHIBITS/);
  assert.match(html, /aria-controls="linux-unix-panel"/);
  assert.match(html, /id="linux-unix-panel"/);
  assert.equal((html.match(/class="unixExhibit"/g) ?? []).length, 5);
  assert.equal((html.match(/JavaScriptで再構成したデモ/g) ?? []).length, 5);
  assert.equal((html.match(/>実行<\/button>/g) ?? []).length, 5);
  assert.equal((html.match(/>実機風<\/option>/g) ?? []).length, 5);
  assert.equal((html.match(/>観賞用<\/option>/g) ?? []).length, 5);

  for (const title of [
    "UNIX風ログイン",
    "Linuxカーネル起動ログ",
    "SysVinit風の起動表示",
    "Debian系APT風の進捗表示",
    "configure・make風コンパイル",
  ]) {
    assert.match(html, new RegExp(title));
  }

  assert.match(html, /Red Hat系などで見られたSysVinit風の再現/);
  assert.match(html, /Linux共通の標準表示ではありません/);
  assert.match(html, /実際の通信やパッケージ操作は行いません/);
  assert.match(html, /UNIX\/Linux開発環境/);
  assert.match(html, /実際のコマンド実行やコンパイルは行いません/);
  assert.doesNotMatch(html, /\b(?:\d{1,3}\.){3}\d{1,3}\b/);
});

test("展示室のデータ定義とタイマー停止・フォーカス復帰を実装する", async () => {
  const [roomData, accordion] = await Promise.all([
    readFile(new URL("app/data/exhibitRooms.ts", projectRoot), "utf8"),
    readFile(
      new URL("app/components/ExhibitRoomAccordion.tsx", projectRoot),
      "utf8",
    ),
  ]);

  assert.equal((roomData.match(/exhibitId: "/g) ?? []).length, 13);
  assert.equal((roomData.match(/\r?\n        kind: "dos"/g) ?? []).length, 8);
  assert.equal(
    (roomData.match(/\r?\n        kind: "terminal"/g) ?? []).length,
    5,
  );
  assert.match(roomData, /roomId: "ms-dos-pc-command-line"/);
  assert.match(roomData, /roomId: "linux-unix"/);
  assert.match(roomData, /classification: "当時広く使われた表現"/);
  assert.match(roomData, /classification: "時代風の再現"/);
  assert.match(accordion, /window\.setInterval/);
  assert.match(accordion, /window\.clearInterval/);
  assert.match(accordion, /visibilitychange/);
  assert.match(
    accordion,
    /REDUCED_MOTION_QUERY = "\(prefers-reduced-motion: reduce\)"/,
  );
  assert.match(accordion, /window\.matchMedia\(REDUCED_MOTION_QUERY\)/);
  assert.match(
    accordion,
    /mediaQuery\.addEventListener\("change", updatePreference\)/,
  );
  assert.match(
    accordion,
    /mediaQuery\.removeEventListener\("change", updatePreference\)/,
  );
  assert.match(
    accordion,
    /const animationsActive =\s+runtimeActive && !prefersReducedMotion/,
  );
  assert.match(accordion, /aria-expanded=\{isOpen\}/);
  assert.match(accordion, /aria-controls=\{panelId\}/);
  assert.match(accordion, /inert=\{!isOpen\}/);
  assert.match(accordion, /toggleRef\.current\?\.focus\(\)/);
});

test("Linux / UNIXデモの再実行・速度切替・安全な停止を実装する", async () => {
  const player = await readFile(
    new URL("app/components/TerminalDemoPlayer.tsx", projectRoot),
    "utf8",
  );

  assert.match(player, /function useTerminalSequence\(/);
  assert.match(player, /window\.setTimeout/);
  assert.match(player, /window\.clearTimeout/);
  assert.match(player, /setRunRevision\(\(current\) => current \+ 1\)/);
  assert.match(player, /setStepIndex\(0\)/);
  assert.match(player, /speed === "authentic"/);
  assert.match(player, /value="authentic"/);
  assert.match(player, /value="viewing"/);
  assert.match(player, /const runLabel = demo\.hasRun \? "再実行" : "実行"/);
  assert.match(player, /displayedStepIndex = prefersReducedMotion \? finalStepIndex/);
  assert.match(player, /delayFactor/);
  assert.match(player, /screenRef\.current\.scrollTop/);
  assert.match(player, /screenRef\.current\.scrollHeight/);
  assert.match(player, /data-active=\{active\}/);
  assert.match(player, /makeLoginSteps/);
  assert.match(player, /makeBootSteps/);
  assert.match(player, /makeSysvSteps/);
  assert.match(player, /makeAptSteps/);
  assert.match(player, /makeCompileSteps/);
  assert.match(player, /Password:/);
  assert.doesNotMatch(player, /Password:\s+\w+/);
  assert.match(player, /TERMINAL_SPINNER = \["\/", "-", "\\\\", "\|"\]/);
  assert.match(
    player,
    /lines: \["Build complete", "guest@archive:~\/museum\$"\]/,
  );
  assert.match(player, /role="log"/);
  assert.match(player, /aria-live="polite"/);

  const accordion = await readFile(
    new URL("app/components/ExhibitRoomAccordion.tsx", projectRoot),
    "utf8",
  );
  assert.match(accordion, /const runtimeActive = isOpen && isPageVisible/);
  assert.match(accordion, /active=\{runtimeActive\}/);
  assert.match(accordion, /prefersReducedMotion=\{prefersReducedMotion\}/);
});

test("CSSとJavaScriptをLoading-museumサブパスから参照する", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");
  const assetPaths = [
    ...html.matchAll(/(?:href|src)="(\/Loading-museum\/_next\/[^"]+)"/g),
  ].map((match) => match[1]);

  assert.ok(assetPaths.some((path) => path.endsWith(".css")));
  assert.ok(assetPaths.some((path) => path.endsWith(".js")));

  for (const assetPath of new Set(assetPaths)) {
    const outputPath = assetPath.replace(/^\/Loading-museum\//, "");
    await access(new URL(outputPath, outputRoot));
  }
});

test("静的export設定と既存レスポンシブ・reduced-motion対応を維持する", async () => {
  const [config, css] = await Promise.all([
    readFile(new URL("next.config.ts", projectRoot), "utf8"),
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
  ]);

  assert.match(config, /output:\s*"export"/);
  assert.match(config, /basePath:\s*pagesBasePath/);
  assert.match(config, /assetPrefix:\s*pagesBasePath/);
  assert.match(config, /repositoryName = "Loading-museum"/);
  assert.match(css, /@media \(max-width: 1000px\)/);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.timeline\s*\{[\s\S]*grid-template-columns: repeat\(3,/);
  assert.match(
    css,
    /\.dosExhibitGrid\s*\{[\s\S]*grid-template-columns: repeat\(2,/,
  );
  assert.match(css, /\.dosBlink\[data-active="true"\]/);
  assert.match(
    css,
    /@media \(max-width: 650px\)[\s\S]*\.dosExhibitGrid\s*\{[\s\S]*grid-template-columns: 1fr/,
  );
  assert.match(
    css,
    /\.unixExhibitGrid\s*\{[\s\S]*grid-template-columns: repeat\(2,/,
  );
  assert.match(
    css,
    /@media \(max-width: 650px\)[\s\S]*\.unixExhibitGrid\s*\{[\s\S]*grid-template-columns: 1fr/,
  );
  assert.match(css, /\.unixScreen\s*\{[\s\S]*overflow: auto/);
  assert.match(css, /\.terminalCursor\[data-active="true"\]/);
  assert.match(css, /\.sysvLine\s*\{[\s\S]*grid-template-columns:/);
  assert.match(css, /\.aptTransfer\s*\{/);
  assert.match(css, /\.terminalProgress\s*\{/);
});
