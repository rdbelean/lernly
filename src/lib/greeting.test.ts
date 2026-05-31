import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardGreeting } from "./greeting";

test("dashboardGreeting uses the name when present", () => {
  assert.equal(dashboardGreeting("Max"), "Hey Max");
});

test("dashboardGreeting trims surrounding whitespace", () => {
  assert.equal(dashboardGreeting("  Lena  "), "Hey Lena");
});

test("dashboardGreeting falls back when empty / whitespace / nullish", () => {
  assert.equal(dashboardGreeting(""), "Willkommen zurück");
  assert.equal(dashboardGreeting("   "), "Willkommen zurück");
  assert.equal(dashboardGreeting(null), "Willkommen zurück");
  assert.equal(dashboardGreeting(undefined), "Willkommen zurück");
});
