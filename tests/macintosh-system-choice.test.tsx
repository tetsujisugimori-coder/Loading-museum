// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ChoiceDemo } from "../app/components/MacintoshBirthExhibitRoom";
import { SYSTEM_1_TO_6_CHOICES } from "../app/components/macintosh-interaction-state";

const labels = SYSTEM_1_TO_6_CHOICES.map((choice) => choice.label);
const notes = SYSTEM_1_TO_6_CHOICES.map((choice) => choice.note);

afterEach(cleanup);

function expectSystem(number: 1 | 5 | 6) {
  const choice = SYSTEM_1_TO_6_CHOICES[number - 1];
  expect(screen.getByRole("button", { name: choice.label }).getAttribute("aria-pressed")).toBe("true");
  const output = screen.getByRole("status");
  expect(output.textContent).toContain(choice.label);
  expect(output.textContent).toContain(choice.year);
  expect(output.textContent).toContain(choice.note);
  expect(screen.getByRole("img", { name: `${choice.label}の簡略プレビュー` }).getAttribute("data-system")).toBe(choice.label);
}

describe("System 1〜6の操作回帰", () => {
  it("クリックでSystem 1→5→6→1→6を連続して切り替える", async () => {
    const user = userEvent.setup();
    render(<ChoiceDemo labels={labels} note={notes} />);

    expectSystem(1);
    for (const number of [5, 6, 1, 6] as const) {
      await user.click(screen.getByRole("button", { name: `System ${number}` }));
      expectSystem(number);
    }
  });

  it("Tab→EnterとTab→SpaceでSystem 5／6を切り替える", async () => {
    const user = userEvent.setup();
    render(<ChoiceDemo labels={labels} note={notes} />);

    await user.click(screen.getByRole("button", { name: "System 4" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "System 5" }));
    await user.keyboard("{Enter}");
    expectSystem(5);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "System 6" }));
    await user.keyboard(" ");
    expectSystem(6);
  });
});
