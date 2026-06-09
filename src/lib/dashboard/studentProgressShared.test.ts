import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStreaks,
  buildHeatmapGrid,
  topicsDone,
  masteryPct,
} from "./studentProgressShared";

const TODAY = "2026-06-09";

test("computeStreaks: empty history → 0/0", () => {
  assert.deepEqual(computeStreaks([], TODAY), { current: 0, longest: 0 });
});

test("computeStreaks: only today → 1/1", () => {
  assert.deepEqual(computeStreaks(["2026-06-09"], TODAY), { current: 1, longest: 1 });
});

test("computeStreaks: consecutive run ending today", () => {
  assert.deepEqual(
    computeStreaks(["2026-06-07", "2026-06-08", "2026-06-09"], TODAY),
    { current: 3, longest: 3 },
  );
});

test("computeStreaks: run ending yesterday still counts as current", () => {
  assert.deepEqual(
    computeStreaks(["2026-06-07", "2026-06-08"], TODAY),
    { current: 2, longest: 2 },
  );
});

test("computeStreaks: a gap breaks current but longest captures the old run", () => {
  assert.deepEqual(
    computeStreaks(
      ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-07"],
      TODAY,
    ),
    { current: 0, longest: 3 },
  );
});

test("computeStreaks: longest can sit in the middle of history", () => {
  assert.deepEqual(
    computeStreaks(
      ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-06-09"],
      TODAY,
    ),
    { current: 1, longest: 4 },
  );
});

test("computeStreaks: duplicates and unsorted input are tolerated", () => {
  assert.deepEqual(
    computeStreaks(["2026-06-09", "2026-06-08", "2026-06-09"], TODAY),
    { current: 2, longest: 2 },
  );
});

test("buildHeatmapGrid: shape, today is the last in-range cell, maxCount", () => {
  const grid = buildHeatmapGrid(
    [
      { day: "2026-06-09", count: 5 },
      { day: "2026-06-02", count: 2 },
    ],
    TODAY,
    2,
  );
  assert.equal(grid.weeks.length, 2);
  assert.ok(grid.weeks.every((col) => col.length === 7));
  assert.equal(grid.maxCount, 5);

  const flat = grid.weeks.flat();
  const todayCell = flat.find((c) => c.day === "2026-06-09");
  assert.ok(todayCell && todayCell.inRange && todayCell.count === 5);
  // 2026-06-09 is a Tuesday → the rest of that week (Wed+) is out of range.
  const tomorrow = flat.find((c) => c.day === "2026-06-10");
  assert.ok(tomorrow && tomorrow.inRange === false);
});

test("topicsDone: correct>0 & wrong==0 is durch; wrong>0 or skipped-only is offen", () => {
  const per = {
    Bilanz: { correct: 3, wrong: 0, skipped: 0 },
    "Cash Flow": { correct: 2, wrong: 1, skipped: 0 },
    Steuern: { correct: 0, wrong: 0, skipped: 4 },
  };
  assert.deepEqual(topicsDone(["Bilanz", "Cash Flow", "Steuern"], per), {
    done: 1,
    total: 3,
  });
});

test("topicsDone: matches on a normalized (trim+lowercase) key", () => {
  assert.deepEqual(
    topicsDone(["Vertical Integration"], {
      " vertical integration ": { correct: 2, wrong: 0, skipped: 0 },
    }),
    { done: 1, total: 1 },
  );
});

test("topicsDone: empty per_topic → 0 done; empty names → 0/0", () => {
  assert.deepEqual(topicsDone(["A", "B"], {}), { done: 0, total: 2 });
  assert.deepEqual(topicsDone([], { A: { correct: 1, wrong: 0, skipped: 0 } }), {
    done: 0,
    total: 0,
  });
});

test("masteryPct: 0/0 → 0, rounds, and clamps at 100", () => {
  assert.equal(masteryPct(0, 0), 0);
  assert.equal(masteryPct(1, 2), 50);
  assert.equal(masteryPct(3, 7), 43);
  assert.equal(masteryPct(7, 7), 100);
  assert.equal(masteryPct(10, 7), 100);
});
