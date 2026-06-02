import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldUseTwoPass } from "./twoPass";

test("anonymous → single-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: true, usesByok: false, plan: null }), false);
});
test("logged-in Free → single-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "free" }), false);
});
test("BYOK → two-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: true, plan: null }), true);
});
test("paid plans → two-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "einzelklausur" }), true);
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "semester" }), true);
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "monthly" }), true);
});
test("logged-in unknown plan, no BYOK → single-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: null }), false);
});
