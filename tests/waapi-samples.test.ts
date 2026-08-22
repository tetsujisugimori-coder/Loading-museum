import { describe, expect, it } from "vitest";
import { formatAnimationCode, waapiSampleCount, waapiSamples } from "../app/data/waapiSamples";

const removed = ["Progress Bar", "Windows XP風 横移動セグメントローダー", "Windows 8/10風 回転ドット", "macOS風 待機インジケーター"];
const games = ["Treasure Chest Open", "Achievement Unlock", "Rhythm PERFECT / GOOD / MISS", "Coin Pickup Arc", "Combo Counter Escalation", "Critical Hit", "HP Bar Damage / Heal", "Boss Entrance", "Menu Selection Cursor", "Quest Complete Stamp", "Level Up Glow", "Card Deal / Shuffle"];

describe("WAAPI標本データ", () => {
  it("公開標本は重複のない32件で、重複ローダー4件を除きゲーム12件を含む", () => {
    expect(waapiSampleCount).toBe(32);
    expect(new Set(waapiSamples.map((item) => item.id)).size).toBe(32);
    expect(new Set(waapiSamples.map((item) => item.name)).size).toBe(32);
    removed.forEach((name) => expect(waapiSamples.some((item) => item.name === name)).toBe(false));
    games.forEach((name) => expect(waapiSamples.some((item) => item.name === name)).toBe(true));
  });

  it("全標本が通常・軽減設定と再現コードを持ち、Infinityを使わない", () => {
    for (const item of waapiSamples) {
      expect(item.normal.keyframes.length, item.name).toBeGreaterThan(1);
      expect(item.reduced.keyframes.length, item.name).toBeGreaterThan(1);
      expect(item.normal.options.iterations, item.name).not.toBe(Infinity);
      expect(item.reduced.options.iterations, item.name).not.toBe(Infinity);
      expect(item.sequence?.every((part) => part.options.iterations !== Infinity) ?? true).toBe(true);
      expect(item.reducedSequence?.every((part) => part.options.iterations !== Infinity) ?? true).toBe(true);
      expect(formatAnimationCode(item), item.name).toMatch(/animate|querySelectorAll/);
    }
  });

  it("FadeとSlideの開始・終了状態を厳密に定義する", () => {
    const byId = (id: string) => waapiSamples.find((item) => item.id === id)!;
    expect(byId("fade-in").normal.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(byId("fade-out").normal.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(byId("slide-in-left").normal.keyframes[0]).toMatchObject({ opacity: 0, transform: "translateX(var(--slide-distance))" });
    expect(byId("slide-in-left").normal.keyframes.at(-1)).toMatchObject({ opacity: 1, transform: "translateX(0)" });
    expect(byId("slide-out-right").normal.keyframes[0]).toMatchObject({ opacity: 1, transform: "translateX(0)" });
    expect(byId("slide-out-right").normal.keyframes.at(-1)).toMatchObject({ opacity: 0, transform: "translateX(var(--slide-distance))" });
    expect(formatAnimationCode(byId("slide-in-left"))).toContain("getBoundingClientRect");
  });

  it("軽減表示でもExit、Counter、Toggle、Marqueeの意味を維持する", () => {
    const byId = (id: string) => waapiSamples.find((item) => item.id === id)!;
    expect(byId("fade-out").reduced.keyframes.at(-1)?.opacity).toBe(0);
    expect(byId("slide-out-right").reduced.keyframes.at(-1)?.opacity).toBe(0);
    expect(byId("counter-roll").reduced.keyframes.at(-1)?.transform).toBe("translateY(-252px)");
    expect(byId("toggle-switch").reduced.keyframes.at(-1)?.transform).toBe("translateX(26px)");
    expect(byId("web-1990s-marquee").reduced.keyframes.at(-1)?.transform).toBe("translateX(0)");
  });

  it("複合・動的・開閉コードが実演定義を含む", () => {
    const byId = (id: string) => waapiSamples.find((item) => item.id === id)!;
    expect(formatAnimationCode(byId("character-by-character"))).toContain("querySelectorAll");
    expect(formatAnimationCode(byId("coin-pickup-arc"))).toContain("getBoundingClientRect");
    expect(formatAnimationCode(byId("modal-open-close"))).toContain("const exit");
    expect(formatAnimationCode(byId("treasure-chest-open"))).toContain("[data-chest-glow]");
    expect(formatAnimationCode(byId("typewriter"))).toContain("textContent.length");
  });
});
