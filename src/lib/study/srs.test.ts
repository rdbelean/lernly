import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIntervalLabel,
  previewStudyIntervals,
  scheduleStudyCard,
} from "./srs";

const NOW = 1_763_400_000_000;

test("new card produces 1 / 3 / 8 day intervals matching design spec", () => {
  const preview = previewStudyIntervals(undefined);
  assert.deepEqual(preview, { 1: 1, 2: 3, 3: 8 });
  assert.equal(formatIntervalLabel(preview[1]), "morgen");
  assert.equal(formatIntervalLabel(preview[2]), "in 3 Tagen");
  assert.equal(formatIntervalLabel(preview[3]), "in 8 Tagen");
});

test("Leicht grows interval on subsequent reviews and raises ease up to 3.0", () => {
  const first = scheduleStudyCard(undefined, 3, NOW);
  assert.equal(first.intervalDays, 8);
  assert.equal(first.reps, 1);

  const second = scheduleStudyCard(first, 3, NOW);
  assert.ok(second.intervalDays > first.intervalDays);
  assert.equal(second.reps, 2);

  let state = second;
  for (let i = 0; i < 20; i++) {
    state = scheduleStudyCard(state, 3, NOW);
  }
  assert.equal(state.easeFactor, 3.0);
});

test("Schwer resets reps and interval to 1 day and floors ease at 1.3", () => {
  let state = scheduleStudyCard(undefined, 3, NOW);
  state = scheduleStudyCard(state, 1, NOW);
  assert.equal(state.intervalDays, 1);
  assert.equal(state.reps, 0);

  for (let i = 0; i < 20; i++) {
    state = scheduleStudyCard(state, 1, NOW);
  }
  assert.equal(state.easeFactor, 1.3);
});

test("Mittel grows established cards gently without dropping ease", () => {
  const first = scheduleStudyCard(undefined, 2, NOW);
  assert.equal(first.intervalDays, 3);
  const second = scheduleStudyCard(first, 2, NOW);
  assert.equal(second.intervalDays, 6);
  assert.equal(second.easeFactor, 2.5);
});
