import { describe, expect, it } from "vitest";
import { formatAnimationCode, waapiSampleCount, waapiSamples } from "../app/data/waapiSamples";

const expectedNames = [
  "Fade In", "Fade Out", "Slide In Left", "Slide Out Right", "Scale Pop", "Bounce", "Shake", "Button Press",
  "Modal Open / Close", "Toast Enter / Exit", "Toggle Switch", "Progress Bar", "Typewriter", "Character by Character",
  "Counter Roll", "Cursor Blink", "Windows XP風 横移動セグメントローダー", "Windows 8/10風 回転ドット",
  "Classic Mac 腕時計カーソル風", "macOS風 待機インジケーター", "Dock Bounce風", "ゲーム機風 幾何学オブジェクト形成",
  "Damage Number Pop", "1990年代Web風 Marquee",
];

describe("WAAPI標本データ", () => {
  it("公開標本を重複のない代表24件に限定する", () => {
    expect(waapiSampleCount).toBe(24);
    expect(waapiSamples.map((sample) => sample.name)).toEqual(expectedNames);
    expect(new Set(waapiSamples.map((sample) => sample.id)).size).toBe(24);
    expect(new Set(waapiSamples.map((sample) => sample.name)).size).toBe(24);
  });

  it("全標本が必須メタデータ、通常設定、個別の軽減設定を持つ", () => {
    for (const sample of waapiSamples) {
      for (const value of [sample.id, sample.name, sample.category, sample.era, sample.sourceType, sample.inspiredBy, sample.description, sample.suitableFor, sample.avoidFor, sample.difficulty, sample.intensity, sample.render, sample.reducedMotionDescription]) {
        expect(value.trim(), `${sample.name}の必須情報`).not.toBe("");
      }
      expect(sample.usage.length).toBeGreaterThan(0);
      expect(sample.properties.length).toBeGreaterThan(0);
      expect(sample.normal.keyframes.length).toBeGreaterThan(1);
      expect(sample.reduced.keyframes.length).toBeGreaterThan(1);
      expect(sample.normal.options.duration).toBeTypeOf("number");
      expect(sample.reduced.options.duration).toBeTypeOf("number");
      expect(sample.reduced.options.iterations).not.toBe(Infinity);
      expect(formatAnimationCode(sample)).toContain(JSON.stringify(sample.normal.keyframes, null, 2));
    }
  });

  it("Exitと方向付きSlideの開始・終了状態が名称と一致する", () => {
    const fadeOut = waapiSamples.find((sample) => sample.id === "fade-out")!;
    const slideIn = waapiSamples.find((sample) => sample.id === "slide-in-left")!;
    const slideOut = waapiSamples.find((sample) => sample.id === "slide-out-right")!;
    expect(fadeOut.normal.keyframes.at(-1)?.opacity).toBe(0);
    expect(slideOut.normal.keyframes.at(-1)?.opacity).toBe(0);
    expect(String(slideIn.normal.keyframes[0].transform)).toContain("-72px");
    expect(String(slideIn.normal.keyframes.at(-1)?.transform)).toContain("translateX(0)");
    expect(String(slideOut.normal.keyframes[0].transform)).toContain("translateX(0)");
    expect(String(slideOut.normal.keyframes.at(-1)?.transform)).toContain("72px");
  });

  it("表示するCSSプロパティが実際の通常キーフレームに含まれる", () => {
    for (const sample of waapiSamples) {
      const frameProperties = new Set(sample.normal.keyframes.flatMap((frame) => Object.keys(frame).filter((key) => key !== "offset")));
      for (const property of sample.properties) expect(frameProperties.has(property), `${sample.name}: ${property}`).toBe(true);
    }
  });

  it("旧大量生成用の候補名を公開標本へ混入させない", () => {
    for (const unimplemented of ["Rubber Band", "Genie Effect風", "Treasure Chest Open", "Flash Intro風", "Infinite Loop"]) {
      expect(waapiSamples.some((sample) => sample.name === unimplemented)).toBe(false);
    }
  });
});
