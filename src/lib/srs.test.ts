import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNextReview, MASTERY_INTERVAL_DAYS } from "./srs";

const NOW = new Date("2026-06-08T12:00:00.000Z");
const DAY = 86_400_000;

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const dueInDays = (now: Date, d: number) => now.getTime() + d * DAY;

// --- First rating of a card (prev === null) ----------------------------------

test("fresh 'known' → reps 1, ease up, interval 5d", () => {
  const r = computeNextReview(null, "known", NOW);
  assert.equal(r.reps, 1);
  assert.ok(close(r.ease, 2.55));
  assert.equal(r.intervalDays, 5);
  assert.equal(r.dueAt.getTime(), dueInDays(NOW, 5));
});

test("fresh 'almost' → reps 1, ease flat 2.5, interval 3d", () => {
  const r = computeNextReview(null, "almost", NOW);
  assert.equal(r.reps, 1);
  assert.ok(close(r.ease, 2.5));
  assert.equal(r.intervalDays, 3);
  assert.equal(r.dueAt.getTime(), dueInDays(NOW, 3));
});

test("fresh 'again' → reps 0, ease down 2.3, interval 1d", () => {
  const r = computeNextReview(null, "again", NOW);
  assert.equal(r.reps, 0);
  assert.ok(close(r.ease, 2.3));
  assert.equal(r.intervalDays, 1);
  assert.equal(r.dueAt.getTime(), dueInDays(NOW, 1));
});

// --- Multiplicative growth on established cards ------------------------------

test("'almost' on an established card multiplies interval by ease", () => {
  const r = computeNextReview(
    { ease: 2.5, intervalDays: 3, reps: 1 },
    "almost",
    NOW,
  );
  assert.equal(r.intervalDays, 8); // round(3 * 2.5) = 8
  assert.equal(r.reps, 2);
  assert.ok(close(r.ease, 2.5));
});

test("'known' on an established card grows by ease + bonus", () => {
  const r = computeNextReview(
    { ease: 2.5, intervalDays: 6, reps: 1 },
    "known",
    NOW,
  );
  assert.ok(close(r.ease, 2.55)); // 2.5 + 0.05
  assert.equal(r.intervalDays, 16); // round(6 * (2.55 + 0.15)) ≈ round(16.2) = 16
  assert.equal(r.reps, 2);
});

// --- 'again' resets the rep streak ------------------------------------------

test("'again' resets reps to 0 and interval to 1 regardless of history", () => {
  const r = computeNextReview(
    { ease: 2.5, intervalDays: 30, reps: 5 },
    "again",
    NOW,
  );
  assert.equal(r.reps, 0);
  assert.equal(r.intervalDays, 1);
  assert.ok(close(r.ease, 2.3));
});

test("'known' right after 'again' takes the first-rep branch (5d)", () => {
  const lapsed = computeNextReview(
    { ease: 2.5, intervalDays: 14, reps: 3 },
    "again",
    NOW,
  );
  const recovered = computeNextReview(lapsed, "known", NOW);
  assert.equal(recovered.intervalDays, 5); // reps was reset to 0 → first-rep branch
  assert.equal(recovered.reps, 1);
});

// --- Ease clamping ----------------------------------------------------------

test("ease never drops below the 1.3 floor", () => {
  const r = computeNextReview(
    { ease: 1.35, intervalDays: 1, reps: 0 },
    "again",
    NOW,
  );
  assert.ok(close(r.ease, 1.3)); // 1.35 - 0.2 = 1.15 → clamped to 1.3
});

test("ease never rises above the 3.0 ceiling", () => {
  const r = computeNextReview(
    { ease: 2.98, intervalDays: 5, reps: 1 },
    "known",
    NOW,
  );
  assert.ok(close(r.ease, 3.0)); // 2.98 + 0.05 = 3.03 → clamped to 3.0
});

// --- Mastery threshold is reachable in ~2 good reps -------------------------

test("two 'known' reps cross the mastery threshold", () => {
  const first = computeNextReview(null, "known", NOW); // interval 5
  const second = computeNextReview(first, "known", NOW); // interval 14
  assert.ok(first.intervalDays < MASTERY_INTERVAL_DAYS);
  assert.ok(second.intervalDays >= MASTERY_INTERVAL_DAYS);
});
