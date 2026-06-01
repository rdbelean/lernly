import { test } from "node:test";
import assert from "node:assert/strict";
import { isFounder } from "./auth";

test("isFounder accepts the founder email exactly", () => {
  assert.equal(isFounder("beleanrd@gmail.com"), true);
});

test("isFounder is case-insensitive and trims whitespace", () => {
  assert.equal(isFounder("  BELEANRD@Gmail.com  "), true);
});

test("isFounder rejects other emails", () => {
  assert.equal(isFounder("someone@else.com"), false);
});

test("isFounder rejects empty / null / undefined", () => {
  assert.equal(isFounder(""), false);
  assert.equal(isFounder(null), false);
  assert.equal(isFounder(undefined), false);
});
