import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceSequenceForRun,
  ARCHIVE_ERAS,
  createCompletedSequence,
  createInitialSequence,
  createReducedMotionSequence,
  createReplaySequence,
  getSequenceDelay,
  nextSequenceState,
  SEQUENCE_DELAYS,
  TITLE,
} from "../app/components/museum-title-sequence-state.ts";

test("loadingから最初の年代へ移行する", () => {
  const next = nextSequenceState(createInitialSequence());
  assert.equal(next.phase, "years");
  assert.equal(next.eraIndex, 0);
});

test("年代が指定順に進む", () => {
  let state = nextSequenceState(createInitialSequence());
  const visited = [];
  for (let index = 0; index < ARCHIVE_ERAS.length; index += 1) {
    visited.push(ARCHIVE_ERAS[state.eraIndex]);
    if (index < ARCHIVE_ERAS.length - 1) state = nextSequenceState(state);
  }
  assert.deepEqual(visited, ARCHIVE_ERAS);
});

test("最後の年代からtypingへ移行する", () => {
  const state = {
    ...createInitialSequence(),
    phase: "years",
    eraIndex: ARCHIVE_ERAS.length - 1,
  };
  assert.equal(nextSequenceState(state).phase, "typing");
});

test("タイトル文字数が1文字ずつ増える", () => {
  const state = { ...createInitialSequence(), phase: "typing" };
  assert.equal(nextSequenceState(state).characterCount, 1);
});

test("タイトル入力後にsignal-lockへ移行する", () => {
  const state = {
    ...createInitialSequence(),
    phase: "typing",
    characterCount: TITLE.length - 1,
  };
  const next = nextSequenceState(state);
  assert.equal(next.phase, "signal-lock");
  assert.equal(next.signalLockStep, "brighten");
  assert.equal(next.characterCount, TITLE.length);
});

test("signal-lockは輝度、ノイズ、completeの順に進む", () => {
  const brighten = {
    ...createInitialSequence(),
    phase: "signal-lock",
    characterCount: TITLE.length,
    signalLockStep: "brighten",
  };
  const noise = nextSequenceState(brighten);
  const complete = nextSequenceState(noise);
  assert.equal(noise.signalLockStep, "noise");
  assert.equal(complete.phase, "complete");
});

test("complete以降は状態が進まない", () => {
  const complete = createCompletedSequence(3);
  assert.strictEqual(nextSequenceState(complete), complete);
  assert.equal(getSequenceDelay(complete), null);
});

test("ReplayはrunIdを増やして初期状態へ戻す", () => {
  const replay = createReplaySequence(createCompletedSequence(4));
  assert.deepEqual(replay, createInitialSequence(5));
});

test("古いrunIdによるタイマー更新を無視する", () => {
  const current = createInitialSequence(8);
  assert.strictEqual(advanceSequenceForRun(current, 7), current);
  assert.equal(advanceSequenceForRun(current, 8).phase, "years");
});

test("すべての年代に年とテーマが定義されている", () => {
  assert.deepEqual(ARCHIVE_ERAS, [
    { year: 1960, theme: "MAINFRAME" },
    { year: 1984, theme: "GUI" },
    { year: 1995, theme: "WEB" },
    { year: 2007, theme: "TOUCH" },
    { year: 2026, theme: "GENERATIVE UI" },
  ]);
});

test("完了状態はタイトル全文と最後の年代を保持する", () => {
  const complete = createCompletedSequence(2);
  assert.equal(complete.characterCount, TITLE.length);
  assert.equal(complete.eraIndex, ARCHIVE_ERAS.length - 1);
});

test("reduced motionは即時に完了状態を生成する", () => {
  assert.deepEqual(createReducedMotionSequence(6), createCompletedSequence(6));
});

test("各段階の待機時間は純粋関数から取得できる", () => {
  assert.equal(getSequenceDelay(createInitialSequence()), SEQUENCE_DELAYS.loading);
  assert.equal(getSequenceDelay({ ...createInitialSequence(), phase: "years" }), SEQUENCE_DELAYS.era);
  assert.equal(getSequenceDelay({ ...createInitialSequence(), phase: "typing" }), SEQUENCE_DELAYS.character);
  assert.equal(getSequenceDelay({ ...createInitialSequence(), phase: "signal-lock", signalLockStep: "brighten" }), SEQUENCE_DELAYS.signalBrighten);
  assert.equal(getSequenceDelay({ ...createInitialSequence(), phase: "signal-lock", signalLockStep: "noise" }), SEQUENCE_DELAYS.signalNoise);
});
