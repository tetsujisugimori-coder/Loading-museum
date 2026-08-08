import assert from "node:assert/strict";
import test from "node:test";

import {
  rectanglesOverlap,
  selectSystemChoice,
  SYSTEM_1_TO_6_CHOICES,
} from "../app/components/macintosh-interaction-state.ts";

test("Read Meの実矩形はゴミ箱へ四方向から重なる", () => {
  const trash = { left: 100, right: 160, top: 100, bottom: 160 };
  const fileSize = 68;

  for (const file of [
    { left: 32, right: 32 + fileSize, top: 110, bottom: 110 + fileSize },
    { left: 160, right: 160 + fileSize, top: 110, bottom: 110 + fileSize },
    { left: 110, right: 110 + fileSize, top: 32, bottom: 32 + fileSize },
    { left: 110, right: 110 + fileSize, top: 160, bottom: 160 + fileSize },
  ]) {
    assert.equal(rectanglesOverlap(file, trash), true);
  }

  assert.equal(rectanglesOverlap({ left: 31, right: 99, top: 110, bottom: 178 }, trash), false);
});

test("System 1→5→6→1→6をクリック相当の操作で連続選択する", () => {
  let selected = 0;
  assert.deepEqual(SYSTEM_1_TO_6_CHOICES[selected], {
    label: "System 1",
    year: "1984",
    note: "Finderと単一アプリの直接操作",
    preview: "単一アプリ",
  });

  for (const requested of [4, 5, 0, 5]) {
    selected = selectSystemChoice(selected, requested, "click");
    assert.equal(selected, requested);
  }

  assert.deepEqual(SYSTEM_1_TO_6_CHOICES[selected], {
    label: "System 6",
    year: "1988",
    note: "安定した日常環境。System 5/6の詳細差は展示上簡略化しています。",
    preview: "安定した環境",
  });
});

test("System 5をEnter、System 6をSpace相当の操作で選択する", () => {
  const system5 = selectSystemChoice(0, 4, "enter");
  assert.equal(system5, 4);
  assert.equal(SYSTEM_1_TO_6_CHOICES[system5].label, "System 5");
  assert.equal(SYSTEM_1_TO_6_CHOICES[system5].year, "1987");
  assert.match(SYSTEM_1_TO_6_CHOICES[system5].note, /MultiFinder/);
  assert.equal(SYSTEM_1_TO_6_CHOICES[system5].preview, "MultiFinder");

  const system6 = selectSystemChoice(system5, 5, "space");
  assert.equal(system6, 5);
  assert.equal(SYSTEM_1_TO_6_CHOICES[system6].label, "System 6");
});
