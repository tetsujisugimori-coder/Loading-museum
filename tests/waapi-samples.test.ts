import { describe, expect, it } from "vitest";
import { formatAnimationCode, waapiSampleCount, waapiSamples } from "../app/data/waapiSamples";

const removed = ["Progress Bar", "Windows XP風 横移動セグメントローダー", "Windows 8/10風 回転ドット", "macOS風 待機インジケーター"];
const games = ["Treasure Chest Open", "Rhythm PERFECT / GOOD / MISS", "Coin Pickup Arc", "Combo Counter Escalation", "HP Bar Damage / Heal", "Boss Entrance", "Menu Selection Cursor", "Card Deal / Shuffle", "Combat Damage Feedback", "Reward Reveal Lab", "Hit Stop & Knockback", "Perfect Parry", "Dodge Afterimage", "Falling Block Line Clear", "Match-3 Cascade", "Pinball Bumper Hit", "Lock-on Reticle", "Inventory Equip Snap", "Status Effect Lab", "Turn Order Reflow", "Battle Transition", "Race Countdown & Launch"];
const ai = ["ChatGPT / Codex-inspired Modular Thought Blocks", "Microsoft Copilot-inspired Ribbon Assembly", "GitHub Copilot-inspired Code Companion", "Gemini-inspired Sparkle Reasoning", "Claude-inspired Warm Thought Pulse", "Perplexity-inspired Answer Weave"];

describe("WAAPI標本データ", () => {
  it("公開標本は重複のない47件で、統合後ゲーム標本とAI標本を含む", () => {
    expect(waapiSampleCount).toBe(47);
    expect(new Set(waapiSamples.map((item) => item.id)).size).toBe(47);
    expect(new Set(waapiSamples.map((item) => item.name)).size).toBe(47);
    removed.forEach((name) => expect(waapiSamples.some((item) => item.name === name)).toBe(false));
    games.forEach((name) => expect(waapiSamples.some((item) => item.name === name)).toBe(true));
    ai.forEach((name) => expect(waapiSamples.some((item) => item.name === name)).toBe(true));
    ["Damage Number Pop", "Critical Hit", "Achievement Unlock", "Quest Complete Stamp", "Level Up Glow"].forEach((name) => expect(waapiSamples.some((item) => item.name === name)).toBe(false));
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
      expect(item.interactionTypes.length, item.name).toBeGreaterThan(0);
      expect(item.visualElements.length, item.name).toBeGreaterThan(0);
      expect(item.stateKinds.length, item.name).toBeGreaterThan(0);
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
    expect(byId("fade-in").playbackPolicy).toBe("manual-entrance");
    expect(byId("slide-in-left").playbackPolicy).toBe("manual-entrance");
    expect(byId("fade-out").playbackPolicy).toBe("manual-exit");
    expect(byId("slide-out-right").playbackPolicy).toBe("manual-exit");
    expect(byId("button-press").playbackPolicy).toBe("direct-interaction");
    expect(byId("toggle-switch").playbackPolicy).toBe("direct-interaction");
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

  it("AI標本は共通状態機械用の分類と誠実な着想説明を持つ", () => {
    const items = waapiSamples.filter((item) => item.category === "AI Working Motion");
    expect(items).toHaveLength(6);
    items.forEach((item) => {
      expect(item.inspirationType).toBe("AI Product Interface");
      expect(item.stateKinds).toEqual(expect.arrayContaining(["Continuous", "Finite", "Failure"]));
      expect(item.inspiredBy).toMatch(/着想|再構成|再現ではありません/);
      expect(item.playbackPolicy).toBe("working-loop");
      expect(formatAnimationCode(item)).not.toContain("observer.onExit");
    });
    expect(new Set(items.map((item) => JSON.stringify(item.normal.keyframes))).size).toBe(6);
  });

  it("ゲーム14件は個別キーフレームと実装コードを持つ", () => {
    const items = waapiSamples.filter((item) => ["combat", "reward-lab", "hit-stop", "parry", "dodge", "line-clear", "match3", "pinball", "lockon", "equip", "status-effects", "turn-order", "battle-transition", "race"].includes(item.render));
    expect(items).toHaveLength(14);
    expect(new Set(items.map((item) => JSON.stringify(item.normal.keyframes))).size).toBe(14);
    items.forEach((item) => {
      expect(item.playbackPolicy).toBe("direct-interaction");
      expect(item.implementationCode?.length, item.name).toBeGreaterThan(80);
      expect(formatAnimationCode(item), item.name).toBe(item.implementationCode);
    });
  });
});
