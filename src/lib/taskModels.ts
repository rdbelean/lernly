import type { GenTaskKey } from "./examTasks";

export const SONNET = "claude-sonnet-4-6";
export const HAIKU = "claude-haiku-4-5-20251001";

// Cheaper Haiku for extractive tasks; Sonnet for the quality-critical ones.
export const MODEL_FOR: Record<GenTaskKey, string> = {
  cards: HAIKU,
  meta: HAIKU,
  simulator: SONNET,
  blueprint: SONNET,
  visualMap: SONNET,
  openQuestions: SONNET,
};
