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
});

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
