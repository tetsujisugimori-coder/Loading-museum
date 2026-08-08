// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import DomAnimationRoom from "../app/components/DomAnimationRoom";

afterEach(cleanup);

function exhibit(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  const card = heading.closest("article");
  if (!card) throw new Error(`${title} card was not found`);
  return within(card);
}

test("DOM API展示を開き、transform・classList・要素追加を操作できる", async () => {
  const user = userEvent.setup();
  render(<DomAnimationRoom />);

  await user.click(screen.getByRole("button", { name: /DOM ANIMATION ROOM/ }));

  const move = exhibit("Transform Move");
  await user.click(move.getByRole("button", { name: "再生" }));
  expect(move.getByText("MOVE").getAttribute("style")).toContain("translateX(160px)");
  expect(move.getByRole("status").textContent).toContain("translateX(160px)");

  const classList = exhibit("classList Toggle");
  await user.click(classList.getByRole("button", { name: "点灯／消灯を切り替える（toggle）" }));
  expect(classList.getByText("点灯中").parentElement?.classList.contains("is-active")).toBe(true);
  expect(classList.getByRole("status").textContent).toContain("is-active");

  const structure = exhibit("Create and Remove Element");
  await user.click(structure.getByRole("button", { name: "星を作って追加する" }));
  await user.click(structure.getByRole("button", { name: "星を作って追加する" }));
  expect(structure.getByRole("status").textContent).toContain("child count: 2");
  await user.click(structure.getByRole("button", { name: "全削除" }));
  expect(structure.getByRole("status").textContent).toContain("child count: 0");
});

test("学習用DOMの文字・セレクタ・到着ゲートを実際の対象へ反映する", async () => {
  const user = userEvent.setup();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollTargets: Element[] = [];
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value(this: Element) { scrollTargets.push(this); },
  });

  try {
    render(<DomAnimationRoom />);
    await user.click(screen.getByRole("button", { name: /DOM ANIMATION ROOM/ }));

    const sign = exhibit("textContent — 展示看板");
    await user.click(sign.getByRole("button", { name: "NEXT EXHIBIT" }));
    expect(sign.getByText("NEXT EXHIBIT", { selector: ".domLearningTarget" })).toBeTruthy();
    expect(sign.getByRole("status").textContent).toContain("textContent: NEXT EXHIBIT");

    const selector = exhibit("querySelector — 展示物を探す");
    await user.click(selector.getByRole("button", { name: "#featured-exhibit" }));
    expect(selector.getByRole("status").textContent).toContain("id=featured-exhibit");
    await user.click(selector.getByRole("button", { name: '[data-kind="signal"]' }));
    expect(selector.getByRole("status").textContent).toContain("data-kind=signal");

    const guide = exhibit("scrollIntoView() — 到着ゲートへ案内");
    await user.click(guide.getByRole("button", { name: "到着ゲートまで案内する" }));
    expect(scrollTargets).toEqual([document.getElementById("arrival-gate")]);
  } finally {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: originalScrollIntoView,
    });
  }
});
