import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedAdminEmails,
  isAllowedAdminEmail,
  isFounder,
} from "./auth";

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

test("getAllowedAdminEmails falls back to founder email when unset", () => {
  assert.deepEqual(getAllowedAdminEmails({}), ["beleanrd@gmail.com"]);
});

test("getAllowedAdminEmails parses multiple comma/space/semicolon ADMIN_EMAILS", () => {
  const env = {
    ADMIN_EMAILS: "Daniel@Uni.de, second@lernly.de; Third@Test.com",
    ADMIN_EMAIL: "fourth@lernly.de",
  };

  assert.deepEqual(getAllowedAdminEmails(env), [
    "daniel@uni.de",
    "second@lernly.de",
    "third@test.com",
    "fourth@lernly.de",
  ]);
  assert.equal(isAllowedAdminEmail("SECOND@lernly.de", env), true);
  assert.equal(isAllowedAdminEmail("stranger@uni.de", env), false);
});
