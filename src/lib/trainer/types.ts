import { z } from "zod";

export const McpSlotSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(120),
  name: z.string().min(1).max(300),
  points: z.number().nonnegative().max(10_000).optional(),
  choiceGroup: z.string().max(120).optional(),
  frequency: z.string().max(200).optional(),
});

export const McpExamPartSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(300),
  points: z.number().nonnegative().max(10_000).optional(),
  slots: z.array(McpSlotSchema).max(100).optional(),
});

export const McpCourseTopicSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(300),
  slotIds: z.array(z.string().max(120)).max(50).optional(),
  expectedPoints: z.number().nonnegative().max(10_000).optional(),
  points: z.number().nonnegative().max(10_000).optional(),
  tier: z.number().int().min(1).max(3).optional(),
  why: z.string().max(1_000).optional(),
  effort: z.string().max(200).optional(),
  pairWith: z.string().max(120).optional(),
  sources: z.string().max(1_000).optional(),
});

export const McpCourseProfileSchema = z.object({
  schema: z.literal("lernly.kurs/1"),
  id: z.string().max(120).optional(),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(500).optional(),
  language: z.string().max(32).optional(),
  subjectType: z.string().max(64).optional(),
  exam: z
    .object({
      date: z.string().max(64).optional(),
      time: z.string().max(64).optional(),
      durationMin: z.number().positive().max(1_440).optional(),
      totalPoints: z.number().positive().max(10_000).optional(),
      aids: z.string().max(500).optional(),
      format: z.string().max(1_000).optional(),
      fidelity: z.enum(["strict", "likely", "broad"]).optional(),
      parts: z.array(McpExamPartSchema).max(30).optional(),
    })
    .optional(),
  strategy: z.string().max(10_000).optional(),
  topics: z.array(McpCourseTopicSchema).min(1).max(100),
  notation: z.string().max(2_000).optional(),
  updatedAt: z.string().max(64).optional(),
});

export const McpBlockSchema = z.object({
  type: z.enum([
    "simple",
    "example",
    "text",
    "heading",
    "remember",
    "steps",
    "formula",
    "table",
    "figure",
    "model_answer",
    "more",
    "html",
  ]),
  md: z.string().max(150_000).optional(),
  html: z.string().max(250_000).optional(),
  text: z.string().max(5_000).optional(),
  title: z.string().max(500).optional(),
  items: z.array(z.string().max(20_000)).max(150).optional(),
  tex: z.array(z.string().max(5_000)).max(100).optional(),
  note: z.string().max(5_000).optional(),
  head: z.array(z.string().max(1_000)).max(30).optional(),
  rows: z.array(z.array(z.string().max(5_000)).max(30)).max(300).optional(),
  sumRows: z.array(z.number().int().nonnegative()).max(50).optional(),
  svg: z.string().max(200_000).optional(),
  caption: z.string().max(2_000).optional(),
});

export const McpDrillFieldSchema = z.object({
  label: z.string().min(1).max(300),
  answer: z.number(),
  rel: z.number().positive().max(1).optional(),
  tol: z.number().positive().max(1_000_000).optional(),
  unit: z.string().max(64).optional(),
});

export const McpDrillChoiceSchema = z.object({
  label: z.string().min(1).max(300),
  options: z.array(z.string().max(500)).min(2).max(20),
  answer: z.string().min(1).max(500),
});

export const McpDrillVariantSchema = z.object({
  text: z.string().min(1).max(20_000),
  fields: z.array(McpDrillFieldSchema).min(1).max(30),
  choice: McpDrillChoiceSchema.optional(),
  solution: z.array(McpBlockSchema).max(60).optional(),
});

const TaskDidacticFields = {
  caseTitle: z.string().max(500).optional(),
  caseHtml: z.string().max(250_000).optional(),
  whyHtml: z.string().max(150_000).optional(),
  merke: z.string().max(20_000).optional(),
  trap: z.string().max(20_000).optional(),
  fullAnswerHtml: z.string().max(250_000).optional(),
};

export const McpDrillTaskSchema = z.object({
  kind: z.literal("drill"),
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(500),
  origin: z.string().max(100).optional(),
  originLabel: z.string().max(200).optional(),
  hint: z.string().max(5_000).optional(),
  variants: z.array(McpDrillVariantSchema).min(1).max(30),
  ...TaskDidacticFields,
});

export const McpEssayChecklistItemSchema = z.object({
  text: z.string().min(1).max(5_000),
  points: z.number().positive().max(1_000),
});

export const McpEssayTaskSchema = z.object({
  kind: z.literal("essay"),
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(500),
  origin: z.string().max(100).optional(),
  originLabel: z.string().max(200).optional(),
  hint: z.string().max(5_000).optional(),
  points: z.number().positive().max(1_000),
  question: z.string().min(1).max(40_000),
  checklist: z.array(McpEssayChecklistItemSchema).min(1).max(50),
  modelAnswer: z.array(McpBlockSchema).max(60).optional(),
  ...TaskDidacticFields,
});

export const McpMcQuestionSchema = z.object({
  q: z.string().min(1).max(10_000),
  options: z.array(z.string().max(2_000)).min(2).max(12),
  answer: z.number().int().nonnegative().max(11),
  explain: z.string().max(10_000).optional(),
});

export const McpMcTaskSchema = z.object({
  kind: z.literal("mc"),
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(500),
  origin: z.string().max(100).optional(),
  originLabel: z.string().max(200).optional(),
  hint: z.string().max(5_000).optional(),
  questions: z.array(McpMcQuestionSchema).min(1).max(60),
  ...TaskDidacticFields,
});

export const McpTaskSchema = z.discriminatedUnion("kind", [
  McpDrillTaskSchema,
  McpEssayTaskSchema,
  McpMcTaskSchema,
]);

export const McpCardSchema = z.object({
  id: z.string().min(1).max(120),
  front: z.string().min(1).max(20_000),
  back: z.string().min(1).max(50_000),
  topicId: z.string().max(120).optional(),
  hint: z.string().max(5_000).optional(),
  merke: z.string().max(20_000).optional(),
  isHtml: z.boolean().optional(),
});

export const McpTopicContentSchema = z.object({
  schema: z.literal("lernly.thema/1"),
  id: z.string().min(1).max(120),
  caseTitle: z.string().max(500).optional(),
  caseHtml: z.string().max(250_000).optional(),
  appendixHtml: z.string().max(500_000).optional(),
  theory: z.array(McpBlockSchema).max(200).default([]),
  standardAnswer: z.array(McpBlockSchema).max(60).optional(),
  tasks: z.array(McpTaskSchema).max(300).default([]),
  cards: z.array(McpCardSchema).max(300).default([]),
  mistakes: z.array(z.string().max(5_000)).max(50).optional(),
  hook: z.string().max(10_000).optional(),
  source: z.string().max(2_000).optional(),
});

export const McpMockExamItemSchema = z.object({
  id: z.string().min(1).max(120),
  no: z.string().max(200).optional(),
  partId: z.string().max(120).optional(),
  topicId: z.string().max(120).optional(),
  taskId: z.string().max(120).optional(),
  points: z.number().nonnegative().max(1_000),
  type: z.enum(["open", "mc"]).default("open"),
  question: z.string().min(1).max(40_000),
  checklist: z.array(McpEssayChecklistItemSchema).max(50).optional(),
  solution: z.array(McpBlockSchema).max(60).optional(),
  questions: z.array(McpMcQuestionSchema).max(60).optional(),
  whyHtml: z.string().max(150_000).optional(),
});

export const McpMockExamPartSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(500),
  topicId: z.string().max(120).optional(),
  caseHtml: z.string().max(250_000).optional(),
  items: z.array(McpMockExamItemSchema).min(1).max(100),
});

export const McpMockExamSchema = z.object({
  schema: z.string().max(64).optional(),
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(300),
  subtitle: z.string().max(500).optional(),
  durationMin: z.number().positive().max(1_440).default(90),
  totalPoints: z.number().nonnegative().max(10_000),
  items: z.array(McpMockExamItemSchema).max(150).default([]),
  parts: z.array(McpMockExamPartSchema).max(50).optional(),
});

export const McpCheatsheetSectionSchema = z.object({
  title: z.string().min(1).max(300),
  blocks: z.array(McpBlockSchema).max(200).default([]),
});

export const McpCheatsheetSchema = z.object({
  schema: z.string().max(64).optional(),
  title: z.string().max(300).optional(),
  html: z.string().max(1_500_000).optional(),
  sections: z.array(McpCheatsheetSectionSchema).max(100).optional(),
});

export type McpCourseTopic = z.infer<typeof McpCourseTopicSchema>;
export type McpCourseProfile = z.infer<typeof McpCourseProfileSchema>;
export type McpBlock = z.infer<typeof McpBlockSchema>;
export type McpDrillField = z.infer<typeof McpDrillFieldSchema>;
export type McpDrillTask = z.infer<typeof McpDrillTaskSchema>;
export type McpEssayTask = z.infer<typeof McpEssayTaskSchema>;
export type McpMcTask = z.infer<typeof McpMcTaskSchema>;
export type McpTask = z.infer<typeof McpTaskSchema>;
export type McpCard = z.infer<typeof McpCardSchema>;
export type McpTopicContent = z.infer<typeof McpTopicContentSchema>;
export type McpMockExamItem = z.infer<typeof McpMockExamItemSchema>;
export type McpMockExamPart = z.infer<typeof McpMockExamPartSchema>;
export type McpMockExam = z.infer<typeof McpMockExamSchema>;
export type McpCheatsheet = z.infer<typeof McpCheatsheetSchema>;

export type TrainerRating = 0 | 1 | 2 | 3;

export type TrainerMockHistoryEntry = {
  id: string;
  mockId: string;
  mockName: string;
  score: number;
  total: number;
  dateIso: string;
};

export type TrainerBundle = {
  course: McpCourseProfile;
  topics: Record<string, McpTopicContent>;
  mocks?: McpMockExam[];
  cheatsheet?: McpCheatsheet;
  artifactHtml?: string;
};

export const TrainerBundleSchema = z.object({
  course: McpCourseProfileSchema,
  topics: z.record(z.string().max(120), McpTopicContentSchema),
  mocks: z.array(McpMockExamSchema).max(30).optional(),
  cheatsheet: McpCheatsheetSchema.optional(),
  artifactHtml: z.string().max(5_000_000).optional(),
});

export const SavedTrainerPackSchema = z.object({
  schema: z.literal("lernly.saved_trainer/1"),
  bundle: TrainerBundleSchema,
});

export type TrainerProgressState = {
  version: 1;
  solvedDrills: Record<string, boolean>;
  checkedChecklist: Record<string, number[]>;
  knownCards: Record<string, boolean>;
  taskRatings: Record<string, TrainerRating>;
  cardRatings: Record<string, TrainerRating>;
  /** SM-2 schedule per flashcard (due date, interval, ease). */
  cardSchedule: Record<string, import("./sm2").CardSchedule>;
  readTopics: Record<string, boolean>;
  mockHistory: TrainerMockHistoryEntry[];
};
