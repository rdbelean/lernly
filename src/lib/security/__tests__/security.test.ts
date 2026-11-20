import assert from "node:assert/strict";
import test from "node:test";
import { hasAnalyticsConsent } from "@/lib/consent";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security/headers";
import {
  checkMemoryRateLimit,
  clearMemoryRateLimitBucketsForTest,
  extractClientIp,
  readJsonBodyWithLimit,
} from "@/lib/security/rateLimitCore";
import {
  isUuid,
  normalizeDisplayName,
  normalizeEmail,
  sanitizeIdempotencyKey,
} from "@/lib/security/validation";
import { formatExamCountdown } from "@/lib/study/importCourse";

test("normalizeEmail handles trimming, case, plus-tags, and Apple Private Relay", () => {
  assert.equal(normalizeEmail("  Anna.Mueller+uni@Gmail.COM "), "anna.mueller+uni@gmail.com");
  assert.equal(
    normalizeEmail("  XYZ987AB@privaterelay.appleid.com "),
    "xyz987ab@privaterelay.appleid.com",
  );
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail(`${"a".repeat(250)}@example.com`), null);
  assert.equal(normalizeEmail(null), null);
});

test("normalizeDisplayName keeps apostrophes, hyphens, and umlauts while neutralizing HTML", () => {
  assert.equal(normalizeDisplayName("  Seán O'Connor  "), "Seán O'Connor");
  assert.equal(
    normalizeDisplayName("Müller-Lüdenscheid   René"),
    "Müller-Lüdenscheid René",
  );
  assert.equal(normalizeDisplayName("<script>alert(1)</script>Max"), "scriptalert(1)/scriptMax");
  assert.equal(normalizeDisplayName("  \u0000\u0007   "), null);
  assert.equal(normalizeDisplayName("A".repeat(120), 20), "A".repeat(20));
});

test("isUuid and sanitizeIdempotencyKey validate strict formats", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid("../../etc/passwd"), false);

  assert.equal(sanitizeIdempotencyKey("checkout_user-12345"), "checkout_user-12345");
  assert.equal(sanitizeIdempotencyKey("short"), null);
  assert.equal(sanitizeIdempotencyKey("bad key with spaces"), null);
});

test("checkMemoryRateLimit enforces sliding window ceilings and resets cleanly", () => {
  clearMemoryRateLimitBucketsForTest();
  const base = 1_700_000_000_000;
  assert.equal(checkMemoryRateLimit("ip:test", 2, 60, base).allowed, true);
  assert.equal(checkMemoryRateLimit("ip:test", 2, 60, base + 100).allowed, true);

  const blocked = checkMemoryRateLimit("ip:test", 2, 60, base + 200);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60);

  const expired = checkMemoryRateLimit("ip:test", 2, 60, base + 61_000);
  assert.equal(expired.allowed, true);
});

test("extractClientIp takes first x-forwarded-for hop and falls back to x-real-ip", () => {
  const h = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    "x-real-ip": "198.51.100.2",
  });
  assert.equal(extractClientIp(h), "203.0.113.10");

  const h2 = new Headers({ "x-real-ip": "198.51.100.2" });
  assert.equal(extractClientIp(h2), "198.51.100.2");
  assert.equal(extractClientIp(new Headers()), "unknown");
});

test("readJsonBodyWithLimit rejects oversized bodies with 413 and malformed JSON with 400", async () => {
  const bigReq = new Request("https://lernly.test/api", {
    method: "POST",
    body: JSON.stringify({ data: "x".repeat(512) }),
  });
  const tooBig = await readJsonBodyWithLimit(bigReq, 128);
  assert.equal(tooBig.ok, false);
  if (!tooBig.ok) {
    assert.equal(tooBig.status, 413);
  }

  const badReq = new Request("https://lernly.test/api", {
    method: "POST",
    body: "{not-json",
  });
  const bad = await readJsonBodyWithLimit(badReq, 1024);
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.status, 400);
  }

  const goodReq = new Request("https://lernly.test/api", {
    method: "POST",
    body: JSON.stringify({ ok: true }),
  });
  const good = await readJsonBodyWithLimit(goodReq, 1024);
  assert.equal(good.ok, true);
});

test("buildSecurityHeaders & CSP enforce framing protection and strict production policy", () => {
  const prodHeaders = buildSecurityHeaders(false);
  const byKey = new Map(prodHeaders.map((h) => [h.key, h.value]));

  assert.equal(byKey.get("X-Frame-Options"), "DENY");
  assert.equal(byKey.get("X-Content-Type-Options"), "nosniff");
  assert.equal(byKey.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(byKey.get("Strict-Transport-Security") ?? "", /max-age=63072000/);

  const prodCsp = buildContentSecurityPolicy(false);
  assert.match(prodCsp, /frame-ancestors 'none'/);
  assert.match(prodCsp, /object-src 'none'/);
  assert.match(prodCsp, /upgrade-insecure-requests/);
  assert.doesNotMatch(prodCsp, /unsafe-eval/);

  const devCsp = buildContentSecurityPolicy(true);
  assert.doesNotMatch(devCsp, /upgrade-insecure-requests/);
});

test("formatExamCountdown computes exact UTC calendar-day diffs across late nights and DST boundaries", () => {
  const lateNight = new Date(2026, 10, 20, 23, 59, 59);
  assert.equal(formatExamCountdown("2026-11-20", lateNight), "KLAUSUR HEUTE");
  assert.equal(formatExamCountdown("2026-11-21", lateNight), "KLAUSUR MORGEN");
  assert.equal(formatExamCountdown("2026-11-25", lateNight), "KLAUSUR IN 5 TAGEN");
  assert.equal(formatExamCountdown("2026-11-19", lateNight), "KLAUSUR VORBEI");
  assert.equal(formatExamCountdown("invalid-date", lateNight), "KLAUSURPLAN AKTIV");

  // Across Central European DST fall-back (Oct 25 2026) -> exact 10 calendar days
  const beforeDst = new Date(2026, 9, 20, 23, 30, 0);
  assert.equal(formatExamCountdown("2026-10-30", beforeDst), "KLAUSUR IN 10 TAGEN");
});

test("hasAnalyticsConsent defaults to false before explicit user opt-in (TDDDG § 25)", () => {
  assert.equal(hasAnalyticsConsent(), false);
});
