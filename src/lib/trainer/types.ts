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
  ]),
  md: z.string().optional(),
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

export const McpDrillTaskSchema = z.object({
  kind: z.literal("drill"),
  id: z.string().min(1),
  name: z.string().min(1),
  origin: z.string().optional(),
  originLabel: z.string().optional(),
  hint: z.string().optional(),
  variants: z.array(McpDrillVariantSchema).min(1),
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
});

export const McpTopicContentSchema = z.object({
  schema: z.literal("lernly.thema/1"),
  id: z.string().min(1),
  theory: z.array(McpBlockSchema).default([]),
  standardAnswer: z.array(McpBlockSchema).optional(),
  tasks: z.array(McpTaskSchema).default([]),
  cards: z.array(McpCardSchema).default([]),
  mistakes: z.array(z.string()).optional(),
  hook: z.string().optional(),
  source: z.string().optional(),
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

export type TrainerBundle = {
  course: McpCourseProfile;
  topics: Record<string, McpTopicContent>;
};

export type TrainerProgressState = {
  version: 1;
  solvedDrills: Record<string, boolean>;
  checkedChecklist: Record<string, number[]>;
  knownCards: Record<string, boolean>;
};
