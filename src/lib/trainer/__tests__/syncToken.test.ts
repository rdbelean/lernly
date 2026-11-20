import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { resolveSyncBundlePayload } from "../syncPersistence";
import { createTrainerSyncToken, verifyTrainerSyncToken } from "../syncToken";

test("createTrainerSyncToken and verifyTrainerSyncToken round-trip and reject tampering", () => {
  const secret = "unit-test-secret-key-0123456789";
  const token = createTrainerSyncToken(
    { id: "user-123", email: "daniel@lernly-app.de" },
    secret,
  );

  assert.ok(token.startsWith("lny1."));
  const verified = verifyTrainerSyncToken(token, secret);
  assert.deepEqual(verified, {
    userId: "user-123",
    email: "daniel@lernly-app.de",
  });

  // Wrong secret must fail
  assert.equal(verifyTrainerSyncToken(token, "wrong-secret"), null);

  // Tampered payload must fail
  const parts = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ v: 1, uid: "attacker", email: "evil@example.com" }),
    "utf8",
  ).toString("base64url");
  assert.equal(
    verifyTrainerSyncToken(`${parts[0]}.${tamperedPayload}.${parts[2]}`, secret),
    null,
  );

  // Malformed tokens must fail
  assert.equal(verifyTrainerSyncToken("", secret), null);
  assert.equal(verifyTrainerSyncToken(null, secret), null);
  assert.equal(verifyTrainerSyncToken("lny2.abc.def", secret), null);
});

test("resolveSyncBundlePayload supports { bundle } and { files } payloads", () => {
  const dcfJson = JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "plugin/lernly/skills/lernly-trainer-bauen/references/beispiel-dcf.json",
      ),
      "utf-8",
    ),
  );
  const kursJson = {
    schema: "lernly.kurs/1",
    id: "cf",
    title: "Corporate Finance",
    exam: { totalPoints: 60, fidelity: "strict" },
    topics: [{ id: "dcf", title: "Discounted Cashflow", expectedPoints: 15, tier: 1 }],
  };

  const fromBundle = resolveSyncBundlePayload({
    bundle: {
      course: kursJson,
      topics: { dcf: dcfJson },
    },
  });
  assert.equal(fromBundle.ok, true);
  if (fromBundle.ok) {
    assert.equal(fromBundle.bundle.course.title, "Corporate Finance");
    assert.ok(fromBundle.bundle.topics.dcf);
  }

  const fromFiles = resolveSyncBundlePayload({
    files: {
      "kurs.json": kursJson,
      "themen/dcf.json": dcfJson,
    },
  });
  assert.equal(fromFiles.ok, true);
  if (fromFiles.ok) {
    assert.equal(fromFiles.bundle.course.title, "Corporate Finance");
    assert.ok(fromFiles.bundle.topics.dcf);
  }

  const invalid = resolveSyncBundlePayload({ unknown: true });
  assert.equal(invalid.ok, false);
});
