import { z } from "zod";
import type {
  CalcExercise,
  CalcParameter,
  CalcStep,
  DailyPlanItem,
  StudyCourseSeed,
  StudyFlashcard,
  StudyTopic,
  TopicStatus,
} from "./types";

// =========================================================================
// Unified course importer for Phase 5 (Hybrid):
// 1) Claude Desktop / MCP `_lernly/` bundle (`kurs.json` + `themen/*.json`)
// 2) Native Lernly Study JSON (`lernly.study/1` or direct StudyCourseSeed)
// =========================================================================

const McpKursTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  expectedPoints: z.number().positive().optional(),
  points: z.number().positive().optional(),
  tier: z.number().int().min(1).max(3).optional(),
  why: z.string().optional(),
});

const McpKursSchema = z.object({
  schema: z.literal("lernly.kurs/1"),
  id: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  exam: z
    .object({
      date: z.string().optional(),
      totalPoints: z.number().positive().optional(),
      fidelity: z.enum(["strict", "likely", "broad"]).optional(),
    })
    .optional(),
  topics: z.array(McpKursTopicSchema).min(1),
});

const McpBlockSchema = z.object({
  type: z.string(),
  md: z.string().optional(),
  text: z.string().optional(),
  items: z.array(z.string()).optional(),
  head: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
  tex: z.array(z.string()).optional(),
});

const McpDrillFieldSchema = z.object({
  label: z.string().min(1),
  answer: z.number(),
  rel: z.number().positive().optional(),
  tol: z.number().positive().optional(),
  unit: z.string().optional(),
});

const McpDrillVariantSchema = z.object({
  text: z.string().min(1),
  fields: z.array(McpDrillFieldSchema).min(1),
  solution: z.array(McpBlockSchema).optional(),
});

const McpTaskSchema = z.object({
  kind: z.string(),
  id: z.string().min(1),
  name: z.string().min(1),
  variants: z.array(McpDrillVariantSchema).optional(),
});

const McpCardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
});

const McpThemaSchema = z.object({
  schema: z.literal("lernly.thema/1"),
  id: z.string().min(1),
  cards: z.array(McpCardSchema).optional(),
  tasks: z.array(McpTaskSchema).optional(),
  mistakes: z.array(z.string()).optional(),
});

export const NativeStudyTopicSchema = z.object({
  id: z.string().min(1),
  order: z.string().optional(),
  name: z.string().min(1),
  shortName: z.string().optional(),
  points: z.number().positive(),
  estimated: z.boolean().optional(),
  mastery: z.number().min(0).max(100).optional(),
  status: z.enum(["sicher", "laeuft", "dran"]).optional(),
});

export const NativeStudyCardSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  topicLabel: z.string().optional(),
  topicStatus: z.enum(["sicher", "laeuft", "dran"]).optional(),
  pointValue: z.number().positive().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  formula: z.string().optional(),
});

export const NativeCalcExerciseSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  topicLabel: z.string().optional(),
  headlineLine1: z.string().min(1),
  headlineLine2: z.string().min(1),
  parameters: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .min(1),
  unit: z.string(),
  correctAnswer: z.number(),
  tolerance: z.number().positive().optional(),
  formattedAnswer: z.string().optional(),
  mistakes: z
    .array(
      z.object({
        match: z.number(),
        tolerance: z.number().positive().optional(),
        message: z.string().min(1),
      }),
    )
    .optional(),
  genericError: z.string().optional(),
  steps: z
    .array(z.object({ num: z.number().int().positive(), text: z.string().min(1) }))
    .min(1),
});

export const NativeStudyCourseSchema = z.object({
  schema: z.literal("lernly.study/1").optional(),
  courseName: z.string().min(1),
  dateLabel: z.string().optional(),
  examDate: z.string().optional(),
  examCountdownLabel: z.string().optional(),
  initialStreakDays: z.number().int().min(0).optional(),
  topics: z.array(NativeStudyTopicSchema).min(1),
  flashcards: z.array(NativeStudyCardSchema).default([]),
  exercises: z.array(NativeCalcExerciseSchema).default([]),
});

export type ImportFileInput = {
  name: string;
  content: string;
};

export type ImportCourseResult =
  | {
      ok: true;
      sourceKind: "mcp-bundle" | "native-json";
      course: StudyCourseSeed;
      summary: {
        topics: number;
        totalPoints: number;
        flashcards: number;
        exercises: number;
      };
    }
  | { ok: false; error: string };

const GERMAN_WEEKDAYS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const GERMAN_MONTHS = [
  "JANUAR",
  "FEBRUAR",
  "MÄRZ",
  "APRIL",
  "MAI",
  "JUNI",
  "JULI",
  "AUGUST",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DEZEMBER",
];

export function formatGermanDateHeader(now: Date = new Date()): string {
  const wd = GERMAN_WEEKDAYS[now.getDay()] ?? "MO";
  const day = now.getDate();
  const month = GERMAN_MONTHS[now.getMonth()] ?? "JANUAR";
  return `${wd}, ${day}. ${month}`;
}

export function formatExamCountdown(
  examDateIso: string | undefined,
  now: Date = new Date(),
): string {
  if (!examDateIso) return "KLAUSURPLAN AKTIV";
  let startOfExam: number | null = null;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(examDateIso.trim());
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === month - 1 &&
      candidate.getUTCDate() === day
    ) {
      startOfExam = candidate.getTime();
    }
  } else {
    const parsed = new Date(examDateIso);
    if (!Number.isNaN(parsed.getTime())) {
      startOfExam = Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      );
    }
  }
  if (startOfExam === null) return "KLAUSURPLAN AKTIV";
  const startOfToday = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const diffDays = Math.round((startOfExam - startOfToday) / 86_400_000);
  if (diffDays < 0) return "KLAUSUR VORBEI";
  if (diffDays === 0) return "KLAUSUR HEUTE";
  if (diffDays === 1) return "KLAUSUR MORGEN";
  return `KLAUSUR IN ${diffDays} TAGEN`;
}

function makeShortName(name: string): string {
  const trimmed = name.split("→")[0]?.trim() || name.trim();
  if (trimmed.length <= 13) return trimmed;
  return `${trimmed.slice(0, 11).trimEnd()}.`;
}

function cleanInlineMath(raw: string): string {
  return raw
    .replace(/==([^=]+)==/g, "**$1**")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) ÷ ($2)")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\cdot/g, "×")
    .replace(/\\times/g, "×")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatGermanNumber(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100;
  const str = String(rounded).replace(".", ",");
  return unit ? `${str} ${unit}`.trim() : str;
}

function buildDailyPlan(
  topics: readonly StudyTopic[],
  flashcards: readonly StudyFlashcard[],
  exercises: readonly CalcExercise[],
): DailyPlanItem[] {
  const primary = topics[0];
  const items: DailyPlanItem[] = [];

  if (primary) {
    items.push({
      id: `plan-${primary.id}`,
      order: "01",
      title: `${primary.name} · Fokus`,
      minutes: 25,
      href: `/karten?topic=${encodeURIComponent(primary.id)}`,
      topicId: primary.id,
    });
  }

  if (flashcards.length > 0) {
    items.push({
      id: "plan-cards",
      order: String(items.length + 1).padStart(2, "0"),
      title: `${flashcards.length} Karten wiederholen`,
      minutes: Math.max(5, Math.min(20, Math.round(flashcards.length * 0.7))),
      href: "/karten",
      topicId: primary?.id ?? flashcards[0].topicId,
    });
  }

  if (exercises.length > 0) {
    const firstEx = exercises[0];
    items.push({
      id: "plan-calc",
      order: String(items.length + 1).padStart(2, "0"),
      title: `${firstEx.headlineLine2} · ${exercises.length} ${exercises.length === 1 ? "Rechenaufgabe" : "Rechenaufgaben"}`,
      minutes: Math.min(25, exercises.length * 10),
      href: "/rechnen",
      topicId: firstEx.topicId,
    });
  }

  return items;
}

function extractStepsFromBlocks(
  blocks: readonly z.infer<typeof McpBlockSchema>[] | undefined,
): CalcStep[] {
  if (!blocks || blocks.length === 0) return [];
  const steps: CalcStep[] = [];

  for (const block of blocks) {
    if (block.type === "steps" && block.items) {
      for (const item of block.items) {
        steps.push({ num: steps.length + 1, text: cleanInlineMath(item) });
      }
    } else if (block.type === "table" && block.rows) {
      for (const row of block.rows) {
        const line = row
          .map((cell) => cleanInlineMath(cell))
          .filter(Boolean)
          .join(": ");
        if (line) {
          steps.push({ num: steps.length + 1, text: line });
        }
      }
    } else if (block.md) {
      steps.push({ num: steps.length + 1, text: cleanInlineMath(block.md) });
    }
  }

  return steps.slice(0, 8);
}

function extractParametersFromText(text: string): CalcParameter[] {
  const cleaned = cleanInlineMath(text);
  const sentences = cleaned
    .split(/(?:\n+|\.\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const params: CalcParameter[] = [];
  for (const sentence of sentences.slice(0, 5)) {
    const colonIdx = sentence.indexOf(":");
    if (colonIdx > 0 && colonIdx < 36) {
      params.push({
        label: sentence.slice(0, colonIdx).trim(),
        value: sentence.slice(colonIdx + 1).trim(),
      });
    } else {
      params.push({
        label: `Angabe ${params.length + 1}`,
        value: sentence,
      });
    }
  }

  return params.length > 0
    ? params
    : [{ label: "Aufgabe", value: cleaned.slice(0, 200) }];
}

function convertMcpBundle(
  kurs: z.infer<typeof McpKursSchema>,
  themen: readonly z.infer<typeof McpThemaSchema>[],
  now: Date,
): StudyCourseSeed {
  const estimatedAll = kurs.exam?.fidelity === "broad";
  const sortedTopics = [...kurs.topics].sort(
    (a, b) => (b.expectedPoints ?? b.points ?? 10) - (a.expectedPoints ?? a.points ?? 10),
  );

  const topics: StudyTopic[] = sortedTopics.map((raw, idx) => {
    const points = Math.max(1, Math.round(raw.expectedPoints ?? raw.points ?? 10));
    const status: TopicStatus = idx === 0 ? "dran" : "laeuft";
    return {
      id: raw.id,
      order: String(idx + 1).padStart(2, "0"),
      name: raw.title.split("→")[0]?.trim() || raw.title,
      shortName: makeShortName(raw.title),
      points,
      estimated: estimatedAll || undefined,
      mastery: 0,
      status,
    };
  });

  const topicById = new Map(topics.map((t) => [t.id, t]));
  const flashcards: StudyFlashcard[] = [];
  const exercises: CalcExercise[] = [];

  for (const thema of themen) {
    const topic = topicById.get(thema.id) ?? topics[0];
    const topicLabel = topic
      ? `${topic.shortName} · ${topic.estimated ? "≈" : ""}${topic.points} P`
      : thema.id.toUpperCase();
    const topicStatus: TopicStatus = topic?.status ?? "laeuft";

    if (thema.cards) {
      const pointPerCard = topic
        ? Math.max(0.5, Math.round((topic.points / Math.max(thema.cards.length, 4)) * 10) / 10)
        : 1.5;

      for (const card of thema.cards) {
        flashcards.push({
          id: card.id,
          topicId: topic?.id ?? thema.id,
          topicLabel,
          topicStatus,
          pointValue: pointPerCard,
          question: cleanInlineMath(card.front),
          answer: cleanInlineMath(card.back),
        });
      }
    }

    if (thema.tasks) {
      for (const task of thema.tasks) {
        if (task.kind !== "drill" || !task.variants || task.variants.length === 0) {
          continue;
        }
        const variant = task.variants[0];
        const field = variant.fields[0];
        const unit = field.unit ?? "";
        const tolerance =
          field.tol ??
          (field.rel ? Math.max(0.01, Math.abs(field.answer * field.rel)) : 0.05);
        const steps = extractStepsFromBlocks(variant.solution);

        exercises.push({
          id: task.id,
          topicId: topic?.id ?? thema.id,
          topicLabel,
          headlineLine1: "Berechne",
          headlineLine2: cleanInlineMath(field.label),
          parameters: extractParametersFromText(variant.text),
          unit,
          correctAnswer: field.answer,
          tolerance,
          formattedAnswer: formatGermanNumber(field.answer, unit),
          mistakes: [],
          genericError:
            thema.mistakes?.[0]
              ? `**Noch nicht ganz.** Achte auf: ${cleanInlineMath(thema.mistakes[0])}`
              : "**Noch nicht ganz.** Prüfe deinen Rechenweg Schritt für Schritt.",
          steps:
            steps.length > 0
              ? steps
              : [
                  {
                    num: 1,
                    text: `Zielwert: **${formatGermanNumber(field.answer, unit)}**`,
                  },
                ],
        });
      }
    }
  }

  return {
    courseName: kurs.title,
    dateLabel: formatGermanDateHeader(now),
    examCountdownLabel: formatExamCountdown(kurs.exam?.date, now),
    initialStreakDays: 1,
    topics,
    dailyPlan: buildDailyPlan(topics, flashcards, exercises),
    flashcards,
    exercises,
  };
}

export function normalizeNativeStudyCourse(
  raw: unknown,
  now: Date = new Date(),
): ImportCourseResult {
  const parsed = NativeStudyCourseSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `Ungültiges Kurs-JSON (${issue?.path.join(".") || "root"}: ${issue?.message ?? "Prüfung fehlgeschlagen"}).`,
    };
  }

  const data = parsed.data;
  const sortedTopics = [...data.topics].sort((a, b) => b.points - a.points);
  const topics: StudyTopic[] = sortedTopics.map((topic, idx) => {
    const mastery = Math.round(topic.mastery ?? 0);
    const status: TopicStatus =
      topic.status ??
      (mastery >= 90 ? "sicher" : idx === 0 ? "dran" : "laeuft");
    return {
      id: topic.id,
      order: topic.order ?? String(idx + 1).padStart(2, "0"),
      name: topic.name,
      shortName: topic.shortName ?? makeShortName(topic.name),
      points: Math.max(1, Math.round(topic.points)),
      estimated: topic.estimated,
      mastery,
      status,
    };
  });

  const topicById = new Map(topics.map((t) => [t.id, t]));

  const flashcards: StudyFlashcard[] = data.flashcards.map((card) => {
    const topic = topicById.get(card.topicId) ?? topics[0];
    return {
      id: card.id,
      topicId: topic.id,
      topicLabel:
        card.topicLabel ??
        `${topic.shortName} · ${topic.estimated ? "≈" : ""}${topic.points} P`,
      topicStatus: card.topicStatus ?? topic.status,
      pointValue: card.pointValue ?? 1.5,
      question: card.question,
      answer: card.answer,
      visual: card.formula
        ? {
            kind: "formula",
            caption: topic.name,
            formula: card.formula,
          }
        : undefined,
    };
  });

  const exercises: CalcExercise[] = data.exercises.map((ex) => {
    const topic = topicById.get(ex.topicId) ?? topics[0];
    return {
      id: ex.id,
      topicId: topic.id,
      topicLabel:
        ex.topicLabel ??
        `${topic.shortName} · ${topic.estimated ? "≈" : ""}${topic.points} P`,
      headlineLine1: ex.headlineLine1,
      headlineLine2: ex.headlineLine2,
      parameters: ex.parameters,
      unit: ex.unit,
      correctAnswer: ex.correctAnswer,
      tolerance: ex.tolerance ?? 0.05,
      formattedAnswer:
        ex.formattedAnswer ?? formatGermanNumber(ex.correctAnswer, ex.unit),
      mistakes: ex.mistakes ?? [],
      genericError:
        ex.genericError ??
        "**Noch nicht ganz.** Prüfe deinen Rechenweg Schritt für Schritt.",
      steps: ex.steps,
    };
  });

  const course: StudyCourseSeed = {
    courseName: data.courseName,
    dateLabel: data.dateLabel ?? formatGermanDateHeader(now),
    examCountdownLabel:
      data.examCountdownLabel ?? formatExamCountdown(data.examDate, now),
    initialStreakDays: data.initialStreakDays ?? 1,
    topics,
    dailyPlan: buildDailyPlan(topics, flashcards, exercises),
    flashcards,
    exercises,
  };

  return {
    ok: true,
    sourceKind: "native-json",
    course,
    summary: {
      topics: topics.length,
      totalPoints: topics.reduce((sum, t) => sum + t.points, 0),
      flashcards: flashcards.length,
      exercises: exercises.length,
    },
  };
}

export function importCourseFromJsonFiles(
  files: readonly ImportFileInput[],
  now: Date = new Date(),
): ImportCourseResult {
  if (files.length === 0) {
    return { ok: false, error: "Bitte wähle mindestens eine JSON-Datei aus." };
  }

  const parsedItems: { name: string; data: unknown }[] = [];
  for (const file of files) {
    try {
      parsedItems.push({ name: file.name, data: JSON.parse(file.content) });
    } catch {
      return {
        ok: false,
        error: `Die Datei „${file.name}“ enthält kein gültiges JSON.`,
      };
    }
  }

  let mcpKurs: z.infer<typeof McpKursSchema> | null = null;
  const mcpThemen: z.infer<typeof McpThemaSchema>[] = [];
  let nativeCandidate: unknown = null;

  for (const item of parsedItems) {
    const obj = item.data as { schema?: unknown } | null;
    if (obj && typeof obj === "object" && obj.schema === "lernly.kurs/1") {
      const res = McpKursSchema.safeParse(obj);
      if (!res.success) {
        return {
          ok: false,
          error: `kurs.json („${item.name}“) ist unvollständig: ${res.error.issues[0]?.message ?? "Fehler"}.`,
        };
      }
      mcpKurs = res.data;
    } else if (
      obj &&
      typeof obj === "object" &&
      obj.schema === "lernly.thema/1"
    ) {
      const res = McpThemaSchema.safeParse(obj);
      if (!res.success) {
        return {
          ok: false,
          error: `Themendatei „${item.name}“ ist unvollständig: ${res.error.issues[0]?.message ?? "Fehler"}.`,
        };
      }
      mcpThemen.push(res.data);
    } else if (obj && typeof obj === "object" && "topics" in obj && "courseName" in obj) {
      nativeCandidate = obj;
    }
  }

  if (mcpKurs) {
    const course = convertMcpBundle(mcpKurs, mcpThemen, now);
    return {
      ok: true,
      sourceKind: "mcp-bundle",
      course,
      summary: {
        topics: course.topics.length,
        totalPoints: course.topics.reduce((sum, t) => sum + t.points, 0),
        flashcards: course.flashcards.length,
        exercises: course.exercises.length,
      },
    };
  }

  // Single thema file dropped without kurs.json: wrap into a minimal course
  if (mcpThemen.length > 0) {
    const syntheticKurs: z.infer<typeof McpKursSchema> = {
      schema: "lernly.kurs/1",
      title: mcpThemen.length === 1 ? mcpThemen[0].id.toUpperCase() : "Importierter Kurs",
      exam: { fidelity: "broad" },
      topics: mcpThemen.map((t) => ({
        id: t.id,
        title: t.id.toUpperCase(),
        expectedPoints: Math.round(100 / mcpThemen.length),
      })),
    };
    const course = convertMcpBundle(syntheticKurs, mcpThemen, now);
    return {
      ok: true,
      sourceKind: "mcp-bundle",
      course,
      summary: {
        topics: course.topics.length,
        totalPoints: course.topics.reduce((sum, t) => sum + t.points, 0),
        flashcards: course.flashcards.length,
        exercises: course.exercises.length,
      },
    };
  }

  if (nativeCandidate) {
    return normalizeNativeStudyCourse(nativeCandidate, now);
  }

  return {
    ok: false,
    error:
      "Format nicht erkannt. Bitte lade eine kurs.json + themen/*.json aus dem Claude-Connector oder eine Lernly-Kursdatei hoch.",
  };
}

export function serializeCourseForExport(course: StudyCourseSeed): string {
  return JSON.stringify(
    {
      schema: "lernly.study/1",
      ...course,
    },
    null,
    2,
  );
}
