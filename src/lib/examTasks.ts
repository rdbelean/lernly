import type { ExamType } from "./schema";

export type GenTaskKey =
  | "cards"
  | "simulator"
  | "blueprint"
  | "meta"
  | "visualMap"
  | "quiz"
  | "essayPredictions";

// Exactly one format-specific trainer per exam type.
export const TRAINER_FOR: Record<ExamType, GenTaskKey> = {
  essay: "essayPredictions",
  open_book: "blueprint",
  multiple_choice: "simulator",
  open_questions: "quiz",
  oral: "quiz",
};

// Always the universal core, plus the one matching trainer.
export function activeTasksFor(examType: ExamType): GenTaskKey[] {
  return ["cards", "meta", "visualMap", TRAINER_FOR[examType]];
}

// A pack MUST have these: the flashcards, and the meta that fills the schema's
// required courseTitle/overview/authors/schedule. Everything else (the format
// trainer + the visual map) is best-effort — if it times out or fails, we drop
// it and still ship a usable pack instead of discarding the whole generation.
export const REQUIRED_TASKS: GenTaskKey[] = ["cards", "meta"];

export function isRequiredTask(key: GenTaskKey): boolean {
  return REQUIRED_TASKS.includes(key);
}
