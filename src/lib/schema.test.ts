import { test } from "node:test";
import assert from "node:assert/strict";
import { ExamProfileSchema, StudyPackSchema } from "./schema";

const base = {
  courseTitle: "T",
  flashcards: [
    { id: "1", category: "c", question: "q", answer: "a", difficulty: "easy" },
  ],
  overview: { topics: [] },
  authors: [],
  schedule: { daysUntilExam: 7, days: [] },
  quizletExport: "",
};

test("accepts a pack with openQuestions and no blueprint/simulator", () => {
  const r = StudyPackSchema.safeParse({
    ...base,
    examType: "open_questions",
    openQuestions: {
      questions: [
        { id: "oq1", question: "q", modelAnswer: "a", keyPoints: ["k"] },
      ],
    },
  });
  assert.equal(r.success, true);
});

test("accepts a legacy pack with blueprint + simulator", () => {
  const r = StudyPackSchema.safeParse({
    ...base,
    examType: "essay",
    essayBlueprint: { totalWords: 1, timeMinutes: 1, parts: [], checklist: [] },
    simulator: { questions: [] },
  });
  assert.equal(r.success, true);
});

test("accepts a pack with neither trainer (core only)", () => {
  const r = StudyPackSchema.safeParse({ ...base, examType: "oral" });
  assert.equal(r.success, true);
});

test("accepts a legacy pack without examLens or simulator points", () => {
  const r = StudyPackSchema.safeParse({
    ...base,
    examType: "multiple_choice",
    simulator: {
      questions: [
        {
          id: "q1",
          scenario: "",
          question: "q",
          options: ["a", "b"],
          correctIndex: 0,
          explanation: "e",
        },
      ],
    },
  });
  assert.equal(r.success, true);
});

test("accepts a pack with examLens and simulator points", () => {
  const r = StudyPackSchema.safeParse({
    ...base,
    examType: "multiple_choice",
    examLens: {
      examCount: 3,
      topics: [{ name: "Vertical Integration", appearances: 2 }],
    },
    simulator: {
      questions: [
        {
          id: "q1",
          scenario: "",
          question: "q",
          options: ["a", "b"],
          correctIndex: 0,
          explanation: "e",
          category: "Vertical Integration",
          points: 25,
        },
      ],
    },
  });
  assert.equal(r.success, true);
});

test("accepts a legacy single-exam profile without multi-exam fields", () => {
  const r = ExamProfileSchema.safeParse({
    formats: [{ type: "mc", share: 1 }],
    topics: [{ name: "T", weight: 0.5 }],
  });
  assert.equal(r.success, true);
});

test("accepts a merged profile with sources/appearances/exam_count", () => {
  const r = ExamProfileSchema.safeParse({
    formats: [{ type: "essay", share: 1 }],
    topics: [
      { name: "T", weight: 0.5, sources: [1, 3], appearances: 2 },
    ],
    exam_count: 3,
    per_exam: [
      { filename: "a.pdf", year: "2023" },
      { filename: "b.pdf" },
      { filename: "c.pdf" },
    ],
    example_questions: ["Erläutern Sie X anhand eines Beispiels. (25 P)"],
  });
  assert.equal(r.success, true);
});
