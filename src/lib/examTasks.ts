import type { ExamType } from "./schema";

export type GenTaskKey =
  | "cards"
  | "simulator"
  | "blueprint"
  | "meta"
  | "visualMap"
  | "quiz";

// Exactly one format-specific trainer per exam type.
export const TRAINER_FOR: Record<ExamType, GenTaskKey> = {
  essay: "blueprint",
  open_book: "blueprint",
  multiple_choice: "simulator",
  open_questions: "quiz",
  oral: "quiz",
};

// Always the universal core, plus the one matching trainer.
export function activeTasksFor(examType: ExamType): GenTaskKey[] {
  return ["cards", "meta", "visualMap", TRAINER_FOR[examType]];
}
