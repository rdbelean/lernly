import { test } from "node:test";
import assert from "node:assert/strict";
import { finalizeProfile } from "./examAnalysis";
import type { ExamProfile } from "./schema";

const baseProfile: ExamProfile = {
  formats: [{ type: "mc", share: 1 }],
  topics: [],
  depth: "apply",
  recurring_patterns: [],
  phrasing_style: "",
  structure: "",
  notes: "",
};

test("finalizeProfile derives appearances from validated sources", () => {
  const out = finalizeProfile(
    {
      ...baseProfile,
      topics: [
        { name: "A", weight: 0.5, evidence: "", sources: [1, 3, 3, 99, 0] },
        { name: "B", weight: 0.3, evidence: "" }, // no sources at all
      ],
    },
    3,
    [{ filename: "a.pdf" }, { filename: "b.pdf" }, { filename: "c.pdf" }],
  );
  // 99 and 0 are out of range, 3 deduped → [1, 3] → 2 appearances.
  assert.deepEqual(out.topics[0].sources, [1, 3]);
  assert.equal(out.topics[0].appearances, 2);
  // Missing sources fall back to [1] / 1 — honest minimum, never zero.
  assert.deepEqual(out.topics[1].sources, [1]);
  assert.equal(out.topics[1].appearances, 1);
  assert.equal(out.exam_count, 3);
  assert.equal(out.per_exam?.length, 3);
});

test("finalizeProfile caps and trims example questions, clears year", () => {
  const out = finalizeProfile(
    {
      ...baseProfile,
      topics: [{ name: "A", weight: 1, evidence: "", sources: [1] }],
      example_questions: Array.from({ length: 9 }, (_, i) =>
        `${i}`.repeat(400),
      ),
      year: "2023",
    },
    1,
    [{ filename: "a.pdf", year: "2023" }],
  );
  assert.equal(out.example_questions?.length, 6);
  assert.equal(out.example_questions?.[0].length, 300);
  assert.equal(out.year, undefined);
});
