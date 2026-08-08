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
  await user.click(classList.getByRole("button", { name: "トグル" }));
  expect(classList.getByText("ACTIVE").parentElement?.classList.contains("is-active")).toBe(true);
  expect(classList.getByRole("status").textContent).toContain("is-active");

  const structure = exhibit("Create and Remove Element");
  await user.click(structure.getByRole("button", { name: "要素追加" }));
  await user.click(structure.getByRole("button", { name: "要素追加" }));
  expect(structure.getByRole("status").textContent).toContain("child count: 2");
  await user.click(structure.getByRole("button", { name: "全削除" }));
  expect(structure.getByRole("status").textContent).toContain("child count: 0");
});
