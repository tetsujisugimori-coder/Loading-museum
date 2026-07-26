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
  assert.equal((html.match(/<article/g) ?? []).length, 9);
  assert.equal((html.match(/role="img"/g) ?? []).length, 9);
  assert.doesNotMatch(html, /72%/);
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
});
