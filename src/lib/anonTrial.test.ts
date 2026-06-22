import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANON_DEVICE_COOKIE,
  isValidDeviceId,
  parseDeviceIdFromCookie,
  deviceCookieOptions,
} from "./anonTrial";

const VALID = "123e4567-e89b-12d3-a456-426614174000";

test("isValidDeviceId accepts a uuid, rejects junk/empty/nullish", () => {
  assert.equal(isValidDeviceId(VALID), true);
  assert.equal(isValidDeviceId("not-a-uuid"), false);
  assert.equal(isValidDeviceId(""), false);
  assert.equal(isValidDeviceId(null), false);
  assert.equal(isValidDeviceId(undefined), false);
});

test("parseDeviceIdFromCookie extracts a valid id from a Cookie header", () => {
  assert.equal(parseDeviceIdFromCookie(`${ANON_DEVICE_COOKIE}=${VALID}`), VALID);
  assert.equal(
    parseDeviceIdFromCookie(`foo=bar; ${ANON_DEVICE_COOKIE}=${VALID}; baz=1`),
    VALID,
  );
});

test("parseDeviceIdFromCookie returns null for missing/invalid", () => {
  assert.equal(parseDeviceIdFromCookie(null), null);
  assert.equal(parseDeviceIdFromCookie("other=1"), null);
  assert.equal(parseDeviceIdFromCookie(`${ANON_DEVICE_COOKIE}=garbage`), null);
});

test("deviceCookieOptions is HttpOnly, SameSite=Lax, 1-year", () => {
  const o = deviceCookieOptions();
  assert.equal(o.httpOnly, true);
  assert.equal(o.secure, true);
  assert.equal(o.sameSite, "lax");
  assert.equal(o.path, "/");
  assert.equal(o.maxAge, 365 * 24 * 60 * 60);
});
