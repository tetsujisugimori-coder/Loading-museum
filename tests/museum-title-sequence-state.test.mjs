import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceSequenceForRun,
  ARCHIVE_ERAS,
  createCompletedSequence,
  createInitialSequence,
  createReducedMotionSequence,
  createReplaySequence,
  getCompletedEraCount,
  getSequenceDelay,
  getTimelineNodeState,
  isLastEra,
  nextSequenceState,
  SEQUENCE_DELAYS,
  TITLE,
} from "../app/components/museum-title-sequence-state.ts";

function createYearsState(eraIndex) {
  return { ...createInitialSequence(), phase: "years", eraIndex };
}

test("loadingから最初の年代へ移行する", () => {
  const next = nextSequenceState(createInitialSequence());
  assert.equal(next.phase, "years");
  assert.equal(next.eraIndex, 0);
});

test("年代ごとにeraIndexが進む", () => {
  let state = createYearsState(0);
  for (let index = 1; index < ARCHIVE_ERAS.length; index += 1) {
    state = nextSequenceState(state);
    assert.equal(state.eraIndex, index);
  }
});

test("通常年代は共通の待機時間を使う", () => {
  assert.equal(getSequenceDelay(createYearsState(0)), SEQUENCE_DELAYS.era);
  assert.equal(getSequenceDelay(createYearsState(3)), SEQUENCE_DELAYS.era);
  assert.equal(SEQUENCE_DELAYS.era, 230);
});

test("最後の年代だけ長い待機時間を使う", () => {
  const lastEra = createYearsState(ARCHIVE_ERAS.length - 1);
  assert.equal(isLastEra(lastEra), true);
  assert.equal(getSequenceDelay(lastEra), SEQUENCE_DELAYS.lastEra);
  assert.equal(SEQUENCE_DELAYS.lastEra, 400);
});

test("最後の年代後にindex-completeへ移行する", () => {
  const next = nextSequenceState(createYearsState(ARCHIVE_ERAS.length - 1));
  assert.equal(next.phase, "index-complete");
  assert.equal(getSequenceDelay(next), SEQUENCE_DELAYS.indexComplete);
});

test("index-complete後にtypingへ移行する", () => {
  const state = { ...createInitialSequence(), phase: "index-complete", eraIndex: ARCHIVE_ERAS.length - 1 };
  const next = nextSequenceState(state);
  assert.equal(next.phase, "typing");
  assert.equal(next.characterCount, 0);
});

test("タイトル文字数が1文字ずつ増える", () => {
  const state = { ...createInitialSequence(), phase: "typing" };
  assert.equal(nextSequenceState(state).characterCount, 1);
});

test("タイトル全文をtyping状態で保持する", () => {
  const state = { ...createInitialSequence(), phase: "typing", characterCount: TITLE.length - 1 };
  const next = nextSequenceState(state);
  assert.equal(next.phase, "typing");
  assert.equal(next.characterCount, TITLE.length);
});

test("タイトル全文表示後にtyping-holdへ移行する", () => {
  const state = { ...createInitialSequence(), phase: "typing", characterCount: TITLE.length };
  const next = nextSequenceState(state);
  assert.equal(next.phase, "typing-hold");
  assert.equal(getSequenceDelay(next), SEQUENCE_DELAYS.typingHold);
});

test("typing-hold後にsignal-lockのbrightenへ移行する", () => {
  const state = { ...createInitialSequence(), phase: "typing-hold", characterCount: TITLE.length };
  const next = nextSequenceState(state);
  assert.equal(next.phase, "signal-lock");
  assert.equal(next.signalLockStep, "brighten");
});

test("signal-lockはbrightenからnoiseへ進む", () => {
  const state = { ...createInitialSequence(), phase: "signal-lock", signalLockStep: "brighten" };
  assert.equal(nextSequenceState(state).signalLockStep, "noise");
});

test("signal-lockはnoiseからlockedへ進む", () => {
  const state = { ...createInitialSequence(), phase: "signal-lock", signalLockStep: "noise" };
  assert.equal(nextSequenceState(state).signalLockStep, "locked");
});

test("signal-lockのlocked後にcompleteへ進む", () => {
  const state = { ...createInitialSequence(), phase: "signal-lock", signalLockStep: "locked" };
  assert.equal(nextSequenceState(state).phase, "complete");
});

test("complete以降は状態が進まない", () => {
  const complete = createCompletedSequence(3);
  assert.strictEqual(nextSequenceState(complete), complete);
  assert.equal(getSequenceDelay(complete), null);
});

test("complete状態は最後の年代とタイトル全文を保持する", () => {
  const complete = createCompletedSequence(2);
  assert.equal(complete.characterCount, TITLE.length);
  assert.equal(complete.eraIndex, ARCHIVE_ERAS.length - 1);
});

test("ReplayはrunIdを増やす", () => {
  const replay = createReplaySequence(createCompletedSequence(4));
  assert.equal(replay.runId, 5);
});

test("Replayは初期状態へ戻す", () => {
  const replay = createReplaySequence(createCompletedSequence(4));
  assert.deepEqual(replay, createInitialSequence(5));
});

test("古いrunIdによるタイマー更新を無視する", () => {
  const current = createInitialSequence(8);
  assert.strictEqual(advanceSequenceForRun(current, 7), current);
  assert.equal(advanceSequenceForRun(current, 8).phase, "years");
});

test("reduced motionは即時completeになる", () => {
  assert.deepEqual(createReducedMotionSequence(6), createCompletedSequence(6));
});

test("年代走査中の点灯数とノード状態をeraIndexから算出する", () => {
  const state = createYearsState(2);
  assert.equal(getCompletedEraCount(state), 3);
  assert.deepEqual(
    ARCHIVE_ERAS.map((_, index) => getTimelineNodeState(index, state)),
    ["complete", "complete", "current", "pending", "pending"],
  );
});

test("年代走査完了後は全タイムラインノードが点灯する", () => {
  const state = { ...createInitialSequence(), phase: "index-complete", eraIndex: ARCHIVE_ERAS.length - 1 };
  assert.equal(getCompletedEraCount(state), ARCHIVE_ERAS.length);
  assert.deepEqual(
    ARCHIVE_ERAS.map((_, index) => getTimelineNodeState(index, state)),
    Array.from({ length: ARCHIVE_ERAS.length }, () => "complete"),
  );
});

test("全年代と全時間定数を一か所で管理する", () => {
  assert.deepEqual(ARCHIVE_ERAS, [
    { year: 1960, theme: "MAINFRAME" },
    { year: 1984, theme: "GUI" },
    { year: 1995, theme: "WEB" },
    { year: 2007, theme: "TOUCH" },
    { year: 2026, theme: "GENERATIVE UI" },
  ]);
  assert.deepEqual(SEQUENCE_DELAYS, {
    loading: 650,
    era: 230,
    lastEra: 400,
    indexComplete: 200,
    character: 40,
    typingHold: 80,
    signalBrighten: 150,
    signalNoise: 200,
    signalLocked: 180,
  });
});
