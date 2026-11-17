import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  formatExamCountdown,
  importCourseFromJsonFiles,
  normalizeNativeStudyCourse,
  serializeCourseForExport,
} from "./importCourse";
import { CORPORATE_FINANCE_SEED } from "./seed";

const FIXED_NOW = new Date(2026, 10, 17); // 17 Nov 2026

test("imports Claude MCP kurs.json + real beispiel-dcf.json fixture", () => {
  const kursJson = JSON.stringify({
    schema: "lernly.kurs/1",
    id: "corporate-finance",
    title: "Corporate Finance & Valuation",
    exam: {
      date: "2026-11-23",
      totalPoints: 60,
      fidelity: "strict",
    },
    topics: [
      { id: "dcf", title: "DCF → equity value → buy or sell", expectedPoints: 22, tier: 1 },
      { id: "wacc", title: "WACC", expectedPoints: 16, tier: 1 },
      { id: "agency", title: "Agency conflicts", expectedPoints: 10, tier: 2 },
    ],
  });

  const dcfPath = join(
    process.cwd(),
    "plugin/lernly/skills/lernly-trainer-bauen/references/beispiel-dcf.json",
  );
  const dcfJson = readFileSync(dcfPath, "utf-8");

  const result = importCourseFromJsonFiles(
    [
      { name: "kurs.json", content: kursJson },
      { name: "themen/dcf.json", content: dcfJson },
    ],
    FIXED_NOW,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.sourceKind, "mcp-bundle");
  assert.equal(result.course.courseName, "Corporate Finance & Valuation");
  assert.equal(result.course.examCountdownLabel, "KLAUSUR IN 6 TAGEN");
  assert.equal(result.course.topics.length, 3);
  assert.equal(result.course.topics[0].id, "dcf");
  assert.equal(result.course.topics[0].status, "dran");
  assert.equal(result.course.flashcards.length, 4);
  assert.equal(result.course.exercises.length, 2);
  assert.equal(result.course.exercises[0].correctAnswer, 150.52);
  assert.ok(result.course.dailyPlan.length === 3);
});

test("round-trips native StudyCourseSeed JSON via export + import", () => {
  const exported = serializeCourseForExport(CORPORATE_FINANCE_SEED);
  const result = importCourseFromJsonFiles(
    [{ name: "corporate-finance.json", content: exported }],
    FIXED_NOW,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.sourceKind, "native-json");
  assert.equal(result.summary.topics, 7);
  assert.equal(result.summary.totalPoints, 100);
  assert.equal(result.summary.flashcards, 12);
  assert.equal(result.summary.exercises, 3);
});

test("rejects invalid JSON or unknown schemas with clear German errors", () => {
  const broken = importCourseFromJsonFiles([{ name: "kaputt.json", content: "{" }]);
  assert.equal(broken.ok, false);
  if (!broken.ok) assert.match(broken.error, /kein gültiges JSON/);

  const unknown = importCourseFromJsonFiles([
    { name: "other.json", content: JSON.stringify({ hello: "world" }) },
  ]);
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.match(unknown.error, /Format nicht erkannt/);
});

test("normalizeNativeStudyCourse fills sensible defaults for AI-extracted courses", () => {
  const res = normalizeNativeStudyCourse(
    {
      courseName: "Investition & Finanzierung",
      examDate: "2026-11-27",
      topics: [
        { id: "npv", name: "Kapitalwertmethode", points: 35 },
        { id: "irr", name: "Interner Zinsfuß", points: 25 },
      ],
      flashcards: [
        {
          id: "npv-1",
          topicId: "npv",
          question: "Wann ist eine Investition nach NPV vorteilhaft?",
          answer: "Wenn der Kapitalwert größer als 0 ist.",
        },
      ],
      exercises: [],
    },
    FIXED_NOW,
  );

  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.course.examCountdownLabel, "KLAUSUR IN 10 TAGEN");
  assert.equal(res.course.topics[0].order, "01");
  assert.equal(res.course.topics[0].status, "dran");
  assert.equal(res.course.flashcards[0].topicLabel, "Kapitalwert. · 35 P");
});

test("formatExamCountdown handles today, tomorrow, future and missing dates", () => {
  assert.equal(formatExamCountdown("2026-11-17", FIXED_NOW), "KLAUSUR HEUTE");
  assert.equal(formatExamCountdown("2026-11-18", FIXED_NOW), "KLAUSUR MORGEN");
  assert.equal(formatExamCountdown("2026-11-23", FIXED_NOW), "KLAUSUR IN 6 TAGEN");
  assert.equal(formatExamCountdown(undefined, FIXED_NOW), "KLAUSURPLAN AKTIV");
});
