import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatInterval,
  isCardDue,
  previewIntervals,
  scheduleCard,
  type CardSchedule,
} from "./sm2";

const NOW = new Date("2026-11-20T10:00:00.000Z");
const DAY = 86_400_000;

test("new card: Nochmal <1 Min, Schwer 1 Tag, Gut 3 Tage, Leicht 7 Tage", () => {
  assert.deepEqual(previewIntervals(undefined), ["< 1 Min", "1 Tag", "3 Tage", "7 Tage"]);
});

test("learned card intervals grow with ease (SM-2)", () => {
  const s: CardSchedule = { ease: 2.5, intervalDays: 3, reps: 1, lapses: 0, due: NOW.toISOString() };
  assert.deepEqual(previewIntervals(s), ["< 1 Min", "4 Tage", "8 Tage", "10 Tage"]);
});

test("Gut on a new card is due in exactly 3 days and keeps ease", () => {
  const s = scheduleCard(undefined, 2, NOW);
  assert.equal(s.intervalDays, 3);
  assert.equal(s.reps, 1);
  assert.equal(s.ease, 2.5);
  assert.equal(Date.parse(s.due) - NOW.getTime(), 3 * DAY);
});

test("Nochmal resets reps, counts a lapse, lowers ease and is due in 1 minute", () => {
  const prev: CardSchedule = { ease: 2.5, intervalDays: 8, reps: 3, lapses: 0, due: NOW.toISOString() };
  const s = scheduleCard(prev, 0, NOW);
  assert.equal(s.reps, 0);
  assert.equal(s.lapses, 1);
  assert.equal(s.intervalDays, 0);
  assert.ok(Math.abs(s.ease - 2.3) < 1e-9);
  assert.equal(Date.parse(s.due) - NOW.getTime(), 60_000);
});

test("ease never drops below 1.3", () => {
  let s: CardSchedule | undefined;
  for (let i = 0; i < 20; i++) s = scheduleCard(s, 1, NOW);
  assert.ok(s && s.ease >= 1.3);
});

test("isCardDue: new cards are due, future cards are not", () => {
  assert.equal(isCardDue(undefined, NOW), true);
  assert.equal(isCardDue(scheduleCard(undefined, 2, NOW), NOW), false);
  assert.equal(isCardDue(scheduleCard(undefined, 2, NOW), new Date(NOW.getTime() + 3 * DAY)), true);
});

test("formatInterval labels", () => {
  assert.equal(formatInterval(0), "< 1 Min");
  assert.equal(formatInterval(1), "1 Tag");
  assert.equal(formatInterval(12), "12 Tage");
  assert.equal(formatInterval(65), "2 Mon.");
});
