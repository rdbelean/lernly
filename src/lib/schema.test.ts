import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ExamProfileSchema,
  StudyPackSchema,
  VisualMapSchema,
} from "./schema";
import { DEMO_VISUAL_MAP_V2 } from "./fixtures/visualMapDemo";

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

// ---------------------------------------------------------------------------
// Study-guide visual frameworks (tree / checklist / formula variables)
// ---------------------------------------------------------------------------

const guideBlock = (frameworks: unknown[]) => ({
  blocks: [
    {
      title: "T",
      color: "blue",
      frameworks,
    },
  ],
});

test("formula framework carries variables + hook (study-guide pattern)", () => {
  const r = VisualMapSchema.safeParse(
    guideBlock([
      {
        kind: "formula",
        title: "Lineare Regression",
        formula: "\\(Y = a + bX\\)",
        variables: [
          { symbol: "Y", meaning: "Vorhergesagter Wert" },
          { symbol: "b", meaning: "Steigung — Änderungsrate" },
        ],
        hook: "Eine Einheit mehr X → b Einheiten mehr Y.",
      },
    ]),
  );
  assert.equal(r.success, true);
  if (r.success) {
    const fw = r.data.blocks[0].frameworks[0];
    assert.equal(fw.kind, "formula");
    if (fw.kind === "formula") {
      assert.equal(fw.variables?.length, 2);
      assert.equal(fw.variables?.[1].symbol, "b");
      assert.equal(typeof fw.hook, "string");
    }
  }
});

test("legacy formula without variables/hook still parses", () => {
  const r = VisualMapSchema.safeParse(
    guideBlock([{ kind: "formula", formula: "E = mc^2" }]),
  );
  assert.equal(r.success, true);
});

test("tree framework parses with 3 explicit levels", () => {
  const r = VisualMapSchema.safeParse(
    guideBlock([
      {
        kind: "tree",
        title: "Datentypen — Master Map",
        root: { label: "ALLE DATEN" },
        children: [
          {
            label: "Quantitativ",
            sub: "Zahlen",
            children: [
              { label: "Diskret", sub: "zählbar" },
              { label: "Stetig", sub: "messbar" },
            ],
          },
          { label: "Qualitativ", sub: "Kategorien" },
        ],
      },
    ]),
  );
  assert.equal(r.success, true);
});

test("checklist framework parses (numbered default + lettered)", () => {
  const numbered = VisualMapSchema.safeParse(
    guideBlock([
      {
        kind: "checklist",
        title: "Prüfungsschema c.i.c.",
        items: [
          { text: "Anwendbarkeit", detail: "Kein Vorrang des Kaufrechts" },
          { text: "Schuldverhältnis", detail: "§ 311 Abs. 2 Nr. 1 BGB" },
        ],
      },
    ]),
  );
  assert.equal(numbered.success, true);
  const lettered = VisualMapSchema.safeParse(
    guideBlock([
      {
        kind: "checklist",
        style: "lettered",
        items: [{ text: "A" }, { text: "B" }],
      },
    ]),
  );
  assert.equal(lettered.success, true);
});

test("existing demo fixture still parses (backward compat)", () => {
  const r = VisualMapSchema.safeParse(DEMO_VISUAL_MAP_V2);
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
