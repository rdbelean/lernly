import { z } from "zod";

export const FlashcardSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const BlueprintParagraphSchema = z.object({
  label: z.string(),
  instruction: z.string(),
  template: z.string(),
  references: z.array(z.string()),
});

export const BlueprintPartSchema = z.object({
  title: z.string(),
  words: z.number().int(),
  minutes: z.number().int(),
  paragraphs: z.array(BlueprintParagraphSchema),
});

export const EssayBlueprintSchema = z.object({
  totalWords: z.number().int(),
  timeMinutes: z.number().int(),
  parts: z.array(BlueprintPartSchema),
  checklist: z.array(z.string()),
});

export const SimulatorQuestionSchema = z.object({
  id: z.string(),
  scenario: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().int(),
  explanation: z.string(),
  category: z.string().optional(),
  // Point value mirroring the Altklausur's point logic. Only emitted when
  // the exam profile shows point evidence; old packs parse without it.
  points: z.number().int().positive().optional(),
});

export const SimulatorSchema = z.object({
  questions: z.array(SimulatorQuestionSchema),
});

export const ConceptSchema = z.object({
  term: z.string(),
  definition: z.string(),
  author: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  examRelevance: z.string().optional(),
  essence: z.string().optional(),
  // Short marker set by the generator when an Altklausur-derived relevance
  // brief is active. Values: "kam dran" (past_exam evidence), "Prof-Hinweis"
  // (instructor hint), or "beides" (both). Rendered as a chip in the Übersicht.
  relevanceTag: z.string().optional(),
});

export const TopicSchema = z.object({
  name: z.string(),
  concepts: z.array(ConceptSchema),
});

export const OverviewSchema = z.object({
  topics: z.array(TopicSchema),
});

export const AuthorSchema = z.object({
  name: z.string(),
  theory: z.string(),
  useInExam: z.string(),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int(),
  label: z.string(),
  tasks: z.array(z.string()),
});

export const ScheduleSchema = z.object({
  daysUntilExam: z.number().int(),
  days: z.array(ScheduleDaySchema),
});

export const VisualBlockColorSchema = z.enum([
  "blue",
  "cyan",
  "green",
  "amber",
  "violet",
  "rose",
]);

export const FlowFrameworkSchema = z.object({
  kind: z.literal("flow"),
  title: z.string(),
  boxes: z
    .array(
      z.object({
        label: z.string(),
        sub: z.string().optional(),
        accent: VisualBlockColorSchema.optional(),
      }),
    )
    .min(2),
  arrows: z.enum(["right", "bidirectional", "plus"]).optional(),
  explanation: z.string().optional(),
});

export const Matrix2x2CellSchema = z.object({
  x: z.enum(["low", "high"]),
  y: z.enum(["low", "high"]),
  title: z.string(),
  sub: z.string().optional(),
  highlight: z.boolean().optional(),
});

export const Matrix2x2FrameworkSchema = z.object({
  kind: z.literal("matrix2x2"),
  title: z.string(),
  xAxis: z.object({ label: z.string(), low: z.string(), high: z.string() }),
  yAxis: z.object({ label: z.string(), low: z.string(), high: z.string() }),
  cells: z.array(Matrix2x2CellSchema),
  explanation: z.string().optional(),
});

export const ComparisonFrameworkSchema = z.object({
  kind: z.literal("comparison"),
  title: z.string(),
  left: z.object({
    label: z.string(),
    tone: z.enum(["pro", "con", "neutral"]).optional(),
    items: z.array(z.string()),
  }),
  right: z.object({
    label: z.string(),
    tone: z.enum(["pro", "con", "neutral"]).optional(),
    items: z.array(z.string()),
  }),
  explanation: z.string().optional(),
});

export const FormulaFrameworkSchema = z.object({
  kind: z.literal("formula"),
  title: z.string().optional(),
  formula: z.string(),
  sub: z.string().optional(),
  // Study-guide formula pattern: every formula ships a variable-explanation
  // table (Y = …, a = …, b = …) + a memory hook. Optional so legacy packs
  // (formula + sub only) keep parsing.
  variables: z
    .array(z.object({ symbol: z.string(), meaning: z.string() }))
    .optional(),
  hook: z.string().optional(),
});

// Hierarchy / taxonomy master-map ("ALLE DATEN → Quantitativ → Diskret…").
// Deliberately a FIXED 3-level shape (root → children → leaf children) rather
// than a recursive schema: keeps model output bounded and rendering simple.
export const TreeLeafSchema = z.object({
  label: z.string(),
  sub: z.string().optional(),
});

export const TreeChildSchema = z.object({
  label: z.string(),
  sub: z.string().optional(),
  children: z.array(TreeLeafSchema).optional(),
});

export const TreeFrameworkSchema = z.object({
  kind: z.literal("tree"),
  title: z.string(),
  root: z.object({ label: z.string(), sub: z.string().optional() }),
  children: z.array(TreeChildSchema).min(2),
  explanation: z.string().optional(),
});

// Ordered step list — Prüfungsschema steps, diagnostics checklists, remedy
// lists. style "numbered" (1,2,3 — default) or "lettered" (A,B,C).
export const ChecklistFrameworkSchema = z.object({
  kind: z.literal("checklist"),
  title: z.string().optional(),
  style: z.enum(["numbered", "lettered"]).optional(),
  items: z
    .array(z.object({ text: z.string(), detail: z.string().optional() }))
    .min(2),
  explanation: z.string().optional(),
});

export const MnemonicFrameworkSchema = z.object({
  kind: z.literal("mnemonic"),
  title: z.string(),
  acronym: z.string(),
  expansion: z.array(
    z.object({ letter: z.string(), meaning: z.string() }),
  ),
  hook: z.string().optional(),
});

export const LinkNoteFrameworkSchema = z.object({
  kind: z.literal("link_note"),
  fromTopic: z.string(),
  toTopic: z.string(),
  explanation: z.string(),
});

export const CalloutToneSchema = z.enum([
  "definition",
  "warning",
  "insight",
  "neutral",
]);

export const CalloutFrameworkSchema = z.object({
  kind: z.literal("callout"),
  tone: CalloutToneSchema.optional(),
  title: z.string().optional(),
  body: z.string(),
});

export const TableFrameworkSchema = z.object({
  kind: z.literal("table"),
  title: z.string().optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).min(1),
  caption: z.string().optional(),
});

export const ConceptCardSchema = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
  accent: VisualBlockColorSchema.optional(),
});

export const ConceptGridFrameworkSchema = z.object({
  kind: z.literal("concept_grid"),
  title: z.string().optional(),
  cards: z.array(ConceptCardSchema).min(2),
  accentEdge: z.enum(["top", "left"]).optional(),
});

export const VisualFrameworkSchema = z.discriminatedUnion("kind", [
  FlowFrameworkSchema,
  Matrix2x2FrameworkSchema,
  ComparisonFrameworkSchema,
  FormulaFrameworkSchema,
  MnemonicFrameworkSchema,
  LinkNoteFrameworkSchema,
  CalloutFrameworkSchema,
  TableFrameworkSchema,
  ConceptGridFrameworkSchema,
  TreeFrameworkSchema,
  ChecklistFrameworkSchema,
]);

export const VisualBlockPrioritySchema = z.enum([
  "highest",
  "high",
  "moderate",
  "quick_win",
]);

export const VisualBlockSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  color: VisualBlockColorSchema,
  icon: z.string().optional(),
  priority: VisualBlockPrioritySchema.optional(),
  timeMinutes: z.number().int().positive().optional(),
  frameworks: z.array(VisualFrameworkSchema),
});

export const VisualMapSchema = z.object({
  blocks: z.array(VisualBlockSchema),
});

export const OpenQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  modelAnswer: z.string(),
  keyPoints: z.array(z.string()),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  category: z.string().optional(),
});

export const OpenQuestionsSchema = z.object({
  questions: z.array(OpenQuestionSchema),
});

export const QuizQuestionTypeSchema = z.enum([
  "definition",
  "apply",
  "whats_missing",
  "compare",
  "true_false",
]);

export const QuizQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  conceptRef: z.string().optional(),
  type: QuizQuestionTypeSchema,
  category: z.string().optional(),
});

export const QuizSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});

export const EssayPredictionSchema = z.object({
  id: z.string(),
  question: z.string(),
  thesis: z.string(),
  structure: z.array(z.string()).min(3).max(5),
  paragraphCues: z.array(z.string()),
  examples: z.array(z.string()),
});

export const EssayPredictionsSchema = z.object({
  predictions: z.array(EssayPredictionSchema),
});

// Deterministic Altklausur-provenance snapshot, copied from the validated
// exam profile at generation time (never LLM-echoed). Drives the
// "Kam in {x} von {y} Altklausuren dran" badges and the frequency re-rank.
export const ExamLensSchema = z.object({
  examCount: z.number().int().positive(),
  topics: z.array(
    z.object({
      name: z.string(),
      appearances: z.number().int().positive(),
    }),
  ),
});
export type ExamLens = z.infer<typeof ExamLensSchema>;

export const StudyPackSchema = z.object({
  courseTitle: z.string(),
  examType: z.enum(["essay", "multiple_choice", "oral", "open_book", "open_questions"]),
  flashcards: z.array(FlashcardSchema),
  essayBlueprint: EssayBlueprintSchema.optional(),
  simulator: SimulatorSchema.optional(),
  overview: OverviewSchema,
  authors: z.array(AuthorSchema),
  schedule: ScheduleSchema,
  quizletExport: z.string(),
  visualMap: VisualMapSchema.optional(),
  openQuestions: OpenQuestionsSchema.optional(),
  quiz: QuizSchema.optional(),
  essayPredictions: EssayPredictionsSchema.optional(),
  // Verbatim "Zusatzinfos" the user typed at pack creation. Persisted so
  // the original steering input is recoverable (e.g. for future regen).
  extraInfo: z.string().optional(),
  // Detected material language at generation time. Persisted so re-practice
  // / regeneration features can drive the LANGUAGE LOCK without re-detecting.
  materialLanguage: z.enum(["de", "en"]).optional(),
  // Altklausur-provenance snapshot — absent on packs generated without a
  // profile (old packs keep parsing; UI degrades to the honest hint).
  examLens: ExamLensSchema.optional(),
});

// =========================================================================
// Exam-Relevance Engine — Altklausur-derived profile (the "lens")
// =========================================================================

export const FidelitySchema = z.enum(["strict", "likely", "broad"]);
export type Fidelity = z.infer<typeof FidelitySchema>;

// Schema tolerance: `formats` and `topics` are structurally required —
// without them the lens has nothing to weight by. Everything else is
// optional + defaulted, so a slightly-incomplete model output (missing
// `notes`, no `recurring_patterns`, etc.) still validates and persists as
// a usable lens instead of silently falling back to no profile at all.
export const ExamProfileSchema = z.object({
  formats: z.array(
    z.object({
      type: z.enum(["mc", "essay", "short_answer", "calculation", "case"]),
      share: z.number().min(0).max(1),
    }),
  ),
  topics: z.array(
    z.object({
      name: z.string(),
      weight: z.number().min(0).max(1),
      evidence: z.string().optional().default(""),
      // 1-based indices of the Altklausuren this topic appeared in, as
      // numbered in the merge call. Absent on legacy single-exam profiles.
      sources: z.array(z.number().int().positive()).optional(),
      // Count of distinct Altklausuren the topic appeared in. Derived in
      // code from `sources` (clamped to [1, exam_count]) — never trusted
      // raw from the model.
      appearances: z.number().int().positive().optional(),
    }),
  ),
  depth: z.enum(["recall", "apply", "analyze"]).optional().default("apply"),
  recurring_patterns: z.array(z.string()).optional().default([]),
  phrasing_style: z.string().optional().default(""),
  structure: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  // ---- multi-Altklausur additions (all optional: legacy profiles parse) ----
  // Number of Altklausuren aggregated into this profile.
  exam_count: z.number().int().positive().optional(),
  // One entry per analyzed Altklausur, in the same 1-based order `sources`
  // refers to. `year` is model-detected ("2023", "WS 2022/23"), best-effort.
  per_exam: z
    .array(z.object({ filename: z.string(), year: z.string().optional() }))
    .optional(),
  // Verbatim question excerpts (each ≤300 chars) — style templates for the
  // generator. On single-exam profiles this comes straight from the analyzer.
  example_questions: z.array(z.string()).optional(),
  // Detected year of THIS exam — only set on per-exam (pre-merge) profiles.
  year: z.string().optional(),
});
export type ExamProfile = z.infer<typeof ExamProfileSchema>;

export type StudyPack = z.infer<typeof StudyPackSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type SimulatorQuestion = z.infer<typeof SimulatorQuestionSchema>;
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type EssayPrediction = z.infer<typeof EssayPredictionSchema>;

export type ExamType = StudyPack["examType"];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  essay: "Essay (Klausur)",
  multiple_choice: "Multiple Choice",
  oral: "Mündliche Prüfung",
  open_book: "Open Book / Take-Home",
  open_questions: "Offene Fragen",
};
