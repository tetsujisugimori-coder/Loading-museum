// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DomAnimationRoom } from "../app/components/DomAnimationRoom";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openDom11() {
  const user = userEvent.setup();
  render(<DomAnimationRoom />);
  await user.click(screen.getByRole("button", { name: /ROOM \/ DOM-ANIMATION/ }));
  const heading = screen.getByRole("heading", { name: "11. querySelectorAll でまとめて操作" });
  const card = heading.closest("article")!;
  const stage = within(card).getByRole("group", { name: "11. querySelectorAll でまとめて操作の実行結果表示エリア" });
  return { user, card, stage, play: within(card).getByRole("button", { name: "再生" }), reset: within(card).getByRole("button", { name: "リセット" }) };
}

function expectEvenSelection(stage: HTMLElement) {
  expect(Array.from(stage.querySelectorAll("li"), item => item.textContent)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"]);
  expect(Array.from(stage.querySelectorAll(".is-marked"), item => item.textContent)).toEqual(["P2", "P4", "P6"]);
  expect(Array.from(stage.querySelectorAll("li:not(.is-marked)"), item => item.textContent)).toEqual(["P1", "P3", "P5"]);
}

describe("DOM11 表示番号の偶数選択", () => {
  it("P1〜P6を生成し、P2/P4/P6だけを強調して結果説明と一致する", async () => {
    const { user, card, stage, play } = await openDom11();
    expect(stage.children.length).toBe(0);
    await user.click(play);
    expectEvenSelection(stage);
    expect(card.querySelector(".domOperationResult")?.textContent).toContain("偶数番号 P2/P4/P6");
    expect(card.querySelector(".domOperationAction")?.textContent).toContain("P2/P4/P6");
  });

  it("resetで選択とノードを除き、再実行と連続再生でも同じ6件と選択集合を保つ", async () => {
    const { user, card, stage, play, reset } = await openDom11();
    await user.click(play);
    await user.click(reset);
    expect(stage.children.length).toBe(0);
    expect(stage.querySelectorAll(".is-marked").length).toBe(0);
    expect(card.querySelector(".domOperationResult")?.textContent).toContain("リセットしました。");
    for (let run = 0; run < 3; run += 1) {
      await user.click(play);
      expectEvenSelection(stage);
    }
  });

  it("表示コード例を実DOMへ適用しても同じ番号だけを強調する", async () => {
    const { user, card, stage, play } = await openDom11();
    await user.click(play);
    const scene = stage.querySelector("ul")!.cloneNode(true) as HTMLUListElement;
    scene.querySelectorAll("li").forEach(item => item.classList.remove("is-marked"));
    const code = card.querySelector("code")!.textContent!;
    // Execute the educational JavaScript, not a copied implementation of its predicate.
    new Function("scene", code)(scene);
    expectEvenSelection(scene);
  });

  it("DOM17展示の表示順とIDを維持する", async () => {
    await openDom11();
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(17);
    expect(Array.from(document.querySelectorAll(".domOperationResult"), node => node.id)).toEqual(["operation-01-create-append-result", "operation-02-prepend-result", "operation-03-insert-before-result", "operation-04-set-attribute-result", "operation-05-remove-attribute-result", "operation-06-class-list-add-remove-result", "operation-07-class-toggle-loop-result", "operation-08-style-set-property-result", "operation-09-dataset-state-result", "operation-10-text-content-result", "operation-11-query-selector-all-result", "operation-12-closest-result", "operation-13-contains-result", "operation-14-clone-node-result", "operation-15-replace-children-result", "operation-16-event-listener-result", "operation-17-scroll-and-rect-result"]);
  });
});
