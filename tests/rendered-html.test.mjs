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
  assert.equal((html.match(/再現方法を見る/g) ?? []).length, 8);
  assert.equal((html.match(/実装コメント/g) ?? []).length, 8);

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

test("展示室のデータ定義とタイマー停止・フォーカス復帰を実装する", async () => {
  const [roomData, accordion] = await Promise.all([
    readFile(new URL("app/data/exhibitRooms.ts", projectRoot), "utf8"),
    readFile(
      new URL("app/components/ExhibitRoomAccordion.tsx", projectRoot),
      "utf8",
    ),
  ]);

  assert.equal((roomData.match(/exhibitId: "/g) ?? []).length, 8);
  assert.match(roomData, /roomId: "ms-dos-pc-command-line"/);
  assert.match(roomData, /classification: "当時広く使われた表現"/);
  assert.match(roomData, /classification: "時代風の再現"/);
  assert.match(accordion, /window\.setInterval/);
  assert.match(accordion, /window\.clearInterval/);
  assert.match(accordion, /visibilitychange/);
  assert.match(accordion, /const animationsActive = isOpen && isPageVisible/);
  assert.match(accordion, /aria-expanded=\{isOpen\}/);
  assert.match(accordion, /aria-controls=\{panelId\}/);
  assert.match(accordion, /inert=\{!isOpen\}/);
  assert.match(accordion, /toggleRef\.current\?\.focus\(\)/);
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
});
