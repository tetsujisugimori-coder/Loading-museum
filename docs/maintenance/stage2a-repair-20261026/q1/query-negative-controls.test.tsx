// @vitest-environment jsdom
// Diagnostic query-contract controls, not product tests or npm test replacements.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
afterEach(cleanup);
function fixture({ search = "検索", close = "サンプル一覧を閉じる", expanded = true, hidden = false, duplicate = false } = {}) {
  return render(<div><button aria-expanded={expanded} hidden={hidden}>{close}</button>{duplicate && <button aria-expanded={expanded}>{close}</button>}<div className="waapiFilters"><label>{search}<input /></label><label>カテゴリ<select><option>すべて</option></select></label><label>用途<select><option>すべて</option></select></label><button>絞り込みを解除</button></div></div>);
}
function closeQuery() { return screen.getByRole("button", { name: /サンプル一覧を閉じる/, expanded: true }); }
function searchQuery() { return within(document.querySelector(".waapiFilters") as HTMLElement).getByLabelText("検索"); }
it("valid scoped labels and expanded visible close trigger remain queryable", () => {
  fixture(); expect(searchQuery().tagName).toBe("INPUT"); expect(closeQuery().tagName).toBe("BUTTON");
  const filters = within(document.querySelector(".waapiFilters") as HTMLElement);
  expect(filters.getByLabelText("カテゴリ").tagName).toBe("SELECT");
  expect(filters.getByLabelText("用途").tagName).toBe("SELECT");
  expect(filters.getByRole("button", { name: "絞り込みを解除" }).tagName).toBe("BUTTON");
});
it("missing search label is rejected", () => { fixture({search: ""}); expect(searchQuery).toThrow(); });
it("renamed search label is rejected", () => { fixture({search: "Wrong label"}); expect(searchQuery).toThrow(); });
it("renamed close trigger is rejected", () => { fixture({close: "Wrong label"}); expect(closeQuery).toThrow(); });
it("collapsed close trigger is rejected", () => { fixture({expanded: false}); expect(closeQuery).toThrow(); });
it("hidden close trigger is rejected", () => { fixture({hidden: true}); expect(closeQuery).toThrow(); });
it("duplicate expanded close triggers are rejected", () => { fixture({duplicate: true}); expect(closeQuery).toThrow(); });
