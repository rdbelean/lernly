import assert from "node:assert/strict";
import test from "node:test";
import {
  CORPORATE_FINANCE_SEED,
  formatTopicPoints,
  getDailyPlanMinutes,
  getPrimaryFocusTopic,
  getSecuredPoints,
  getTotalPoints,
} from "./seed";

test("Corporate Finance seed sums to 100 exam points and 62 secured points", () => {
  assert.equal(CORPORATE_FINANCE_SEED.topics.length, 7);
  assert.equal(getTotalPoints(CORPORATE_FINANCE_SEED.topics), 100);
  assert.equal(getSecuredPoints(CORPORATE_FINANCE_SEED.topics), 62);
});

test("Primary focus topic is Discounted Cashflow (22 P, 30 %)", () => {
  const focus = getPrimaryFocusTopic(CORPORATE_FINANCE_SEED.topics);
  assert.equal(focus.id, "dcf");
  assert.equal(focus.points, 22);
  assert.equal(focus.mastery, 30);
});

test("Daily plan sums to 48 minutes across 3 items", () => {
  assert.equal(CORPORATE_FINANCE_SEED.dailyPlan.length, 3);
  assert.equal(getDailyPlanMinutes(CORPORATE_FINANCE_SEED.dailyPlan), 48);
});

test("Seed contains 12 due flashcards and 3 calculation exercises", () => {
  assert.equal(CORPORATE_FINANCE_SEED.flashcards.length, 12);
  assert.equal(CORPORATE_FINANCE_SEED.exercises.length, 3);
  assert.equal(CORPORATE_FINANCE_SEED.exercises[0].id, "ex-wacc-1");
  assert.equal(CORPORATE_FINANCE_SEED.exercises[0].correctAnswer, 6.8);
});

test("Estimated topic points are prefixed with approximation symbol", () => {
  assert.equal(formatTopicPoints({ points: 19, estimated: true }), "≈19");
  assert.equal(formatTopicPoints({ points: 22 }), "22");
});
