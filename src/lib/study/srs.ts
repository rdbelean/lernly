import type { CardReviewState, RatingQuality } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DEFAULT_EASE = 2.5;

function clampEase(value: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(value * 100) / 100));
}

export function scheduleStudyCard(
  previous: CardReviewState | undefined,
  rating: RatingQuality,
  nowMs: number = Date.now(),
): CardReviewState {
  const ease = previous?.easeFactor ?? DEFAULT_EASE;
  const reps = previous?.reps ?? 0;
  const prevInterval = previous?.intervalDays ?? 0;

  if (rating === 1) {
    const nextEase = clampEase(ease - 0.2);
    return {
      intervalDays: 1,
      easeFactor: nextEase,
      reps: 0,
      lastRating: 1,
      nextDueAt: nowMs + DAY_MS,
    };
  }

  if (rating === 2) {
    const nextReps = reps + 1;
    const intervalDays =
      reps === 0
        ? 3
        : Math.max(3, Math.round(prevInterval * Math.max(1.4, ease * 0.8)));
    return {
      intervalDays,
      easeFactor: clampEase(ease),
      reps: nextReps,
      lastRating: 2,
      nextDueAt: nowMs + intervalDays * DAY_MS,
    };
  }

  // rating === 3 (Leicht)
  const nextEase = clampEase(ease + 0.15);
  const nextReps = reps + 1;
  const intervalDays =
    reps === 0 ? 8 : Math.max(8, Math.round(prevInterval * nextEase));
  return {
    intervalDays,
    easeFactor: nextEase,
    reps: nextReps,
    lastRating: 3,
    nextDueAt: nowMs + intervalDays * DAY_MS,
  };
}

export function previewStudyIntervals(
  previous: CardReviewState | undefined,
): Record<RatingQuality, number> {
  return {
    1: scheduleStudyCard(previous, 1, 0).intervalDays,
    2: scheduleStudyCard(previous, 2, 0).intervalDays,
    3: scheduleStudyCard(previous, 3, 0).intervalDays,
  };
}

export function formatIntervalLabel(days: number): string {
  if (days <= 1) return "morgen";
  return `in ${days} Tagen`;
}
