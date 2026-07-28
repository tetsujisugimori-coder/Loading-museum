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

test("独立した消えたOS展示室へ6 OS・18種類のLoading再構成を書き出す", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /消えたOS展示室/);
  assert.match(html, /主流から退いたOSが残した起動演出と設計思想/);
  assert.match(html, /6(?:<!-- -->)? EXHIBITS/);
  assert.match(
    html,
    /aria-controls="vanished-operating-systems-panel"/,
  );
  assert.match(html, /id="vanished-operating-systems-panel"/);
  assert.equal((html.match(/class="vanishedOsExhibit"/g) ?? []).length, 6);
  assert.equal((html.match(/class="vanishedLoadingExhibit"/g) ?? []).length, 18);
  assert.equal((html.match(/>再生<\/button>/g) ?? []).length, 18);
  assert.equal((html.match(/>停止<\/button>/g) ?? []).length, 18);
  assert.equal(
    (html.match(/JavaScriptとCSSによる教育・研究目的の歴史的表現の再構成（非公式）/g) ?? []).length,
    18,
  );
  assert.equal((html.match(/>史実として確認</g) ?? []).length, 18);
  assert.equal((html.match(/>演出上の補完</g) ?? []).length, 18);

  for (const osName of [
    "Classic Mac OS",
    "BeOS",
    "NeXTSTEP",
    "Palm OS",
    "webOS",
    "Windows Phone",
  ]) {
    assert.match(html, new RegExp(osName));
  }

  for (const category of [
    "OS起動",
    "アプリ・ファイル",
    "同期・通信",
    "更新・インストール",
  ]) {
    assert.match(html, new RegExp(category));
  }

  for (const loadingTitle of [
    "起動シンボルと拡張機能列",
    "腕時計カーソル",
    "ディスク／アプリケーション読込",
    "段階点灯する起動アイコン列",
    "Tracker起動待機",
    "ファイル処理とディスクアクセス",
    "システム起動メッセージ",
    "ディスクとサービスの読込",
    "Workspace Managerのアプリ読込",
    "HotSyncの進行表示",
    "データベース／アプリ読込",
    "ビーム送信の通信待機",
    "パルス型の起動待機",
    "カード型アプリの読込",
    "App Catalogの更新・インストール",
    "移動する点の起動待機",
    "アプリの「再開中」",
    "Storeの取得・更新進捗",
  ]) {
    assert.match(html, new RegExp(loadingTitle));
  }

  for (const heading of [
    "登場時期",
    "主な対象端末・ハードウェア",
    "起動・待機画面の特徴",
    "その後どうなったか",
    "後世に残した思想・技術",
  ]) {
    assert.equal((html.match(new RegExp(heading, "g")) ?? []).length, 6);
  }
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
  assert.match(roomData, /roomId: "vanished-operating-systems"/);
  assert.match(roomData, /theme: "vanished"/);
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

test("消えたOS展示のデータ・起動・停止・reduced motionを実装する", async () => {
  const [osData, player, accordion] = await Promise.all([
    readFile(
      new URL("app/data/vanishedOperatingSystems.ts", projectRoot),
      "utf8",
    ),
    readFile(
      new URL("app/components/VanishedOsPlayer.tsx", projectRoot),
      "utf8",
    ),
    readFile(
      new URL("app/components/ExhibitRoomAccordion.tsx", projectRoot),
      "utf8",
    ),
  ]);

  assert.equal((osData.match(/^    kind: "vanished-os"/gm) ?? []).length, 6);
  assert.equal((osData.match(/^    exhibitId: "/gm) ?? []).length, 6);
  assert.equal((osData.match(/^        demoId: "/gm) ?? []).length, 18);
  assert.equal((osData.match(/^        historicalBasis:/gm) ?? []).length, 18);
  assert.equal((osData.match(/^        reconstructionNote:/gm) ?? []).length, 18);
  assert.match(osData, /visualType: "classic-extension-parade"/);
  assert.match(osData, /visualType: "classic-watch-cursor"/);
  assert.match(osData, /visualType: "beos-boot-icons"/);
  assert.match(osData, /visualType: "nextstep-app-launch"/);
  assert.match(osData, /visualType: "palm-hotsync"/);
  assert.match(osData, /visualType: "palm-beam-transfer"/);
  assert.match(osData, /visualType: "webos-update-install"/);
  assert.match(osData, /visualType: "windows-phone-dots"/);
  assert.match(osData, /visualType: "windows-phone-store-update"/);
  assert.match(osData, /VANISHED_LOADING_CATEGORIES/);
  assert.match(osData, /"OS起動"/);
  assert.match(osData, /"同期・通信"/);
  assert.match(osData, /"更新・インストール"/);
  assert.match(osData, /Mac OS Xへの移行/);
  assert.match(osData, /Haiku/);
  assert.match(osData, /macOSやiOS/);
  assert.match(osData, /後継のwebOS/);
  assert.match(osData, /カード型マルチタスク/);
  assert.match(osData, /2019年にサポートを終え/);

  assert.match(player, /function useLoadingSimulation\(/);
  assert.match(player, /window\.setTimeout/);
  assert.match(player, /window\.clearTimeout/);
  assert.match(
    player,
    /simplified = prefersReducedMotion && phase === "running"[\s\S]*phase: simplified \? "complete" : phase[\s\S]*step: simplified \? totalSteps : step/,
  );
  assert.match(player, /setRunRevision\(\(current\) => current \+ 1\)/);
  assert.match(player, /setStep\(prefersReducedMotion \? totalSteps : 0\)/);
  assert.match(player, /setPhase\(prefersReducedMotion \? "complete" : "running"\)/);
  assert.match(player, /if \(phase === "running"\)/);
  assert.match(player, /disabled=\{simulation\.phase === "running"\}/);
  assert.match(player, /disabled=\{simulation\.phase !== "running"\}/);
  assert.match(player, /aria-label=\{`\$\{osTitle\}の「\$\{demo\.title\}」を\$\{runLabel\}`\}/);
  assert.match(player, /aria-live="polite"/);
  assert.match(player, /role="img"/);
  assert.match(player, /ClassicExtensionParade/);
  assert.match(player, /BeBootIcons/);
  assert.match(player, /NextBootMessages/);
  assert.match(player, /PalmHotSync/);
  assert.match(player, /WebOsUpdateInstall/);
  assert.match(player, /WindowsPhoneStoreUpdate/);
  assert.doesNotMatch(player, /new Audio|<img|https?:\/\//);

  assert.match(accordion, /exhibit\.kind === "vanished-os"/);
  assert.match(accordion, /active=\{runtimeActive\}/);
  assert.match(accordion, /VANISHED_LOADING_CATEGORIES/);
  assert.match(accordion, /exhibit\.loadingExhibits\.filter/);
  assert.match(accordion, /demo=\{demo\}/);
  assert.match(accordion, /史実として確認/);
  assert.match(accordion, /演出上の補完/);
  assert.match(accordion, /roomCard roomCardVanished/);
  assert.match(accordion, /vanishedOsGrid/);
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
  assert.match(
    css,
    /\.vanishedOsGrid\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /@media \(max-width: 650px\)[\s\S]*\.vanishedOsGrid\s*\{[\s\S]*grid-template-columns: 1fr/,
  );
  assert.match(
    css,
    /\.vanishedLoadingGrid\s*\{[\s\S]*grid-template-columns: repeat\(3,/,
  );
  assert.match(
    css,
    /@media \(max-width: 1000px\)[\s\S]*\.vanishedLoadingGrid\s*\{[\s\S]*grid-template-columns: repeat\(2,/,
  );
  assert.match(
    css,
    /@media \(max-width: 650px\)[\s\S]*\.vanishedLoadingGrid\s*\{[\s\S]*grid-template-columns: 1fr/,
  );
  assert.match(css, /\.vanishedOsScreen\s*\{/);
  assert.match(css, /\.classicWatchCursor\[data-running="true"\]/);
  assert.match(css, /\.webosHistoricalPulse\[data-running="true"\]/);
  assert.match(css, /\.windowsMovingDots\[data-running="true"\]/);
  assert.match(css, /content-visibility: auto/);
});
