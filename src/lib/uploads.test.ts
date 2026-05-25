import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STUDY_UPLOADS_BUCKET,
  sanitizeUploadName,
  buildUploadPath,
} from "./uploads";

test("bucket id is stable", () => {
  assert.equal(STUDY_UPLOADS_BUCKET, "study-uploads");
});

test("sanitizeUploadName strips path separators, unsafe chars and leading dots", () => {
  assert.equal(sanitizeUploadName("../etc/pa ss wörd.pdf"), "etc_pa_ss_w_rd.pdf");
  assert.equal(sanitizeUploadName("Lecture 01.pdf"), "Lecture_01.pdf");
});

test("buildUploadPath nests under the user id with a random prefix", () => {
  const path = buildUploadPath("user-123", "Lecture 01.pdf");
  assert.match(path, /^user-123\/[^/]+-Lecture_01\.pdf$/);
  // first folder segment must equal the uid (RLS depends on this)
  assert.equal(path.split("/")[0], "user-123");
});

test("buildUploadPath produces unique paths for the same name", () => {
  const a = buildUploadPath("u", "x.pdf");
  const b = buildUploadPath("u", "x.pdf");
  assert.notEqual(a, b);
});
