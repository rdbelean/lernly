import { z } from "zod";

export const McpSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  name: z.string().min(1),
  points: z.number().nonnegative().optional(),
  choiceGroup: z.string().optional(),
  frequency: z.string().optional(),
});

export const McpExamPartSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  points: z.number().nonnegative().optional(),
  slots: z.array(McpSlotSchema).optional(),
});

export const McpCourseTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slotIds: z.array(z.string()).optional(),
  expectedPoints: z.number().nonnegative().optional(),
  points: z.number().nonnegative().optional(),
  tier: z.number().int().min(1).max(3).optional(),
  why: z.string().optional(),
  effort: z.string().optional(),
  pairWith: z.string().optional(),
  sources: z.string().optional(),
});

export const McpCourseProfileSchema = z.object({
  schema: z.literal("lernly.kurs/1"),
  id: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  language: z.string().optional(),
  subjectType: z.string().optional(),
  exam: z
    .object({
      date: z.string().optional(),
      time: z.string().optional(),
      durationMin: z.number().positive().optional(),
      totalPoints: z.number().positive().optional(),
      aids: z.string().optional(),
      format: z.string().optional(),
      fidelity: z.enum(["strict", "likely", "broad"]).optional(),
      parts: z.array(McpExamPartSchema).optional(),
    })
    .optional(),
  strategy: z.string().optional(),
  topics: z.array(McpCourseTopicSchema).min(1),
  notation: z.string().optional(),
  updatedAt: z.string().optional(),
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
  md: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  items: z.array(z.string()).optional(),
  tex: z.array(z.string()).optional(),
  note: z.string().optional(),
  head: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
  sumRows: z.array(z.number().int().nonnegative()).optional(),
  svg: z.string().optional(),
  caption: z.string().optional(),
});

export const McpDrillFieldSchema = z.object({
  label: z.string().min(1),
  answer: z.number(),
  rel: z.number().positive().optional(),
  tol: z.number().positive().optional(),
  unit: z.string().optional(),
});

export const McpDrillChoiceSchema = z.object({
  label: z.string().min(1),
  options: z.array(z.string()).min(2),
  answer: z.string().min(1),
});

export const McpDrillVariantSchema = z.object({
  text: z.string().min(1),
  fields: z.array(McpDrillFieldSchema).min(1),
  choice: McpDrillChoiceSchema.optional(),
  solution: z.array(McpBlockSchema).optional(),
});

const TaskDidacticFields = {
  caseTitle: z.string().optional(),
  caseHtml: z.string().optional(),
  whyHtml: z.string().optional(),
  merke: z.string().optional(),
  trap: z.string().optional(),
  fullAnswerHtml: z.string().optional(),
};

export const McpDrillTaskSchema = z.object({
  kind: z.literal("drill"),
  id: z.string().min(1),
  name: z.string().min(1),
  origin: z.string().optional(),
  originLabel: z.string().optional(),
  hint: z.string().optional(),
  variants: z.array(McpDrillVariantSchema).min(1),
  ...TaskDidacticFields,
});

export const McpEssayChecklistItemSchema = z.object({
  text: z.string().min(1),
  points: z.number().positive(),
});

export const McpEssayTaskSchema = z.object({
  kind: z.literal("essay"),
  id: z.string().min(1),
  name: z.string().min(1),
  origin: z.string().optional(),
  originLabel: z.string().optional(),
  hint: z.string().optional(),
  points: z.number().positive(),
  question: z.string().min(1),
  checklist: z.array(McpEssayChecklistItemSchema).min(1),
  modelAnswer: z.array(McpBlockSchema).optional(),
  ...TaskDidacticFields,
});

export const McpMcQuestionSchema = z.object({
  q: z.string().min(1),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  explain: z.string().optional(),
});

export const McpMcTaskSchema = z.object({
  kind: z.literal("mc"),
  id: z.string().min(1),
  name: z.string().min(1),
  origin: z.string().optional(),
  originLabel: z.string().optional(),
  hint: z.string().optional(),
  questions: z.array(McpMcQuestionSchema).min(1),
  ...TaskDidacticFields,
});

export const McpTaskSchema = z.discriminatedUnion("kind", [
  McpDrillTaskSchema,
  McpEssayTaskSchema,
  McpMcTaskSchema,
]);

export const McpCardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  topicId: z.string().optional(),
  hint: z.string().optional(),
  merke: z.string().optional(),
  isHtml: z.boolean().optional(),
});

export const McpTopicContentSchema = z.object({
  schema: z.literal("lernly.thema/1"),
  id: z.string().min(1),
  caseTitle: z.string().optional(),
  caseHtml: z.string().optional(),
  appendixHtml: z.string().optional(),
  theory: z.array(McpBlockSchema).default([]),
  standardAnswer: z.array(McpBlockSchema).optional(),
  tasks: z.array(McpTaskSchema).default([]),
  cards: z.array(McpCardSchema).default([]),
  mistakes: z.array(z.string()).optional(),
  hook: z.string().optional(),
  source: z.string().optional(),
});

export const McpMockExamItemSchema = z.object({
  id: z.string().min(1),
  no: z.string().optional(),
  partId: z.string().optional(),
  topicId: z.string().optional(),
  taskId: z.string().optional(),
  points: z.number().nonnegative(),
  type: z.enum(["open", "mc"]).default("open"),
  question: z.string().min(1),
  checklist: z.array(McpEssayChecklistItemSchema).optional(),
  solution: z.array(McpBlockSchema).optional(),
  questions: z.array(McpMcQuestionSchema).optional(),
  whyHtml: z.string().optional(),
});

export const McpMockExamPartSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  topicId: z.string().optional(),
  caseHtml: z.string().optional(),
  items: z.array(McpMockExamItemSchema).min(1),
});

export const McpMockExamSchema = z.object({
  schema: z.string().optional(),
  id: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().optional(),
  durationMin: z.number().positive().default(90),
  totalPoints: z.number().nonnegative(),
  items: z.array(McpMockExamItemSchema).default([]),
  parts: z.array(McpMockExamPartSchema).optional(),
});

export const McpCheatsheetSectionSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(McpBlockSchema).default([]),
});

export const McpCheatsheetSchema = z.object({
  schema: z.string().optional(),
  title: z.string().optional(),
  html: z.string().optional(),
  sections: z.array(McpCheatsheetSectionSchema).optional(),
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
  topics: z.record(z.string(), McpTopicContentSchema),
  mocks: z.array(McpMockExamSchema).optional(),
  cheatsheet: McpCheatsheetSchema.optional(),
  artifactHtml: z.string().optional(),
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
