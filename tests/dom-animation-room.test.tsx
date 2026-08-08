// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

function mockReducedMotion(matches: boolean) {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  return () => Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
  });
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

test("追加した展示物は退場中もDOMに残り、transitionend後に取り除かれる", async () => {
  const user = userEvent.setup();
  render(<DomAnimationRoom />);
  await user.click(screen.getByRole("button", { name: /DOM ANIMATION ROOM/ }));

  const structure = exhibit("Create and Remove Element");
  const container = structure.getByLabelText("DOM APIで追加される要素の領域");
  await user.click(structure.getByRole("button", { name: "星を作って追加する" }));
  const created = container.lastElementChild as HTMLElement;
  expect(created).toBeTruthy();

  await user.click(structure.getByRole("button", { name: "最後の星を取り除く" }));
  expect(container.lastElementChild).toBe(created);
  expect(created.classList.contains("domCreatedItemLeaving")).toBe(true);
  expect(structure.getByRole("status").textContent).toContain("退場中");

  // 同じ要素を連続で削除しようとしても、退場処理は一度だけです。
  await user.click(structure.getByRole("button", { name: "最後の星を取り除く" }));
  fireEvent.transitionEnd(created);
  expect(container.childElementCount).toBe(0);
  expect(structure.getByRole("status").textContent).toContain("DOMから削除");
});

test("軽減モーション時の削除は退場待機なしで完了する", async () => {
  const restoreMatchMedia = mockReducedMotion(true);

  try {
    const user = userEvent.setup();
    render(<DomAnimationRoom />);
    await user.click(screen.getByRole("button", { name: /DOM ANIMATION ROOM/ }));
    const structure = exhibit("Create and Remove Element");
    const container = structure.getByLabelText("DOM APIで追加される要素の領域");
    await user.click(structure.getByRole("button", { name: "星を作って追加する" }));
    await user.click(structure.getByRole("button", { name: "最後の星を取り除く" }));
    expect(container.childElementCount).toBe(0);
    expect(structure.getByRole("status").textContent).toContain("DOMから削除");
  } finally {
    restoreMatchMedia();
  }
});

test("学習用DOMの文字・セレクタ・到着ゲートを実際の対象へ反映する", async () => {
  const user = userEvent.setup();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollCalls: Array<{ target: Element; options: ScrollIntoViewOptions }> = [];
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value(this: Element, options: ScrollIntoViewOptions) { scrollCalls.push({ target: this, options }); },
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
    await user.click(selector.getByRole("button", { name: ".museum-artifact" }));
    expect(selector.getByRole("status").textContent).toContain("class=museum-artifact domFound");
    await user.click(selector.getByRole("button", { name: '[data-kind="signal"]' }));
    expect(selector.getByRole("status").textContent).toContain("data-kind=signal");

    const guide = exhibit("scrollIntoView() — 到着ゲートへ案内");
    await user.click(guide.getByRole("button", { name: "到着ゲートまで案内する" }));
    expect(scrollCalls).toEqual([{
      target: document.getElementById("arrival-gate"),
      options: { behavior: "smooth", block: "center" },
    }]);
  } finally {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: originalScrollIntoView,
    });
  }
});

test("軽減モーション時のscrollIntoViewは即時移動オプションを使う", async () => {
  const restoreMatchMedia = mockReducedMotion(true);
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollCalls: Array<{ target: Element; options: ScrollIntoViewOptions }> = [];
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value(this: Element, options: ScrollIntoViewOptions) { scrollCalls.push({ target: this, options }); },
  });

  try {
    const user = userEvent.setup();
    render(<DomAnimationRoom />);
    await user.click(screen.getByRole("button", { name: /DOM ANIMATION ROOM/ }));
    const guide = exhibit("scrollIntoView() — 到着ゲートへ案内");
    await user.click(guide.getByRole("button", { name: "到着ゲートまで案内する" }));
    expect(scrollCalls).toEqual([{
      target: document.getElementById("arrival-gate"),
      options: { behavior: "auto", block: "center" },
    }]);
  } finally {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: originalScrollIntoView,
    });
    restoreMatchMedia();
  }
});
