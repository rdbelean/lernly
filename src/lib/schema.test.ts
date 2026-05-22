import { test } from "node:test";
import assert from "node:assert/strict";
import { StudyPackSchema } from "./schema";

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
