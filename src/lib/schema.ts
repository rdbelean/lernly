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

export const StudyPackSchema = z.object({
  courseTitle: z.string(),
  examType: z.enum(["essay", "multiple_choice", "oral", "open_book"]),
  flashcards: z.array(FlashcardSchema),
  essayBlueprint: EssayBlueprintSchema,
  simulator: SimulatorSchema,
  overview: OverviewSchema,
  authors: z.array(AuthorSchema),
  schedule: ScheduleSchema,
  quizletExport: z.string(),
});

export type StudyPack = z.infer<typeof StudyPackSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type SimulatorQuestion = z.infer<typeof SimulatorQuestionSchema>;

export type ExamType = StudyPack["examType"];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  essay: "Essay (Klausur)",
  multiple_choice: "Multiple Choice",
  oral: "Mündliche Prüfung",
  open_book: "Open Book / Take-Home",
};
