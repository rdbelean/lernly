// SM-2 style spaced repetition for trainer flashcards (Anki-like 4 buttons).
// Pure functions; the store persists the resulting schedule per card.
import type { TrainerRating } from "./types";

export type CardSchedule = {
  ease: number;
  /** 0 = relearn within the session (due in 1 minute). */
  intervalDays: number;
  reps: number;
  lapses: number;
  /** ISO timestamp when the card is due again. */
  due: string;
};

const START_EASE = 2.5;
const MIN_EASE = 1.3;
const DAY_MS = 86_400_000;
const RELEARN_MS = 60_000;
/** First-review intervals for Schwer / Gut / Leicht. */
const NEW_INTERVALS: Record<1 | 2 | 3, number> = { 1: 1, 2: 3, 3: 7 };

function nextInterval(prev: CardSchedule | undefined, rating: TrainerRating): { days: number; ease: number } {
  const ease = prev?.ease ?? START_EASE;
  if (rating === 0) return { days: 0, ease: Math.max(MIN_EASE, ease - 0.2) };
  if (!prev || prev.reps === 0) {
    const e = rating === 1 ? ease - 0.15 : rating === 3 ? ease + 0.15 : ease;
    return { days: NEW_INTERVALS[rating], ease: Math.max(MIN_EASE, e) };
  }
  const I = prev.intervalDays;
  if (rating === 1) return { days: Math.max(I + 1, Math.round(I * 1.2)), ease: Math.max(MIN_EASE, ease - 0.15) };
  if (rating === 2) return { days: Math.max(I + 1, Math.round(I * ease)), ease };
  return { days: Math.max(I + 2, Math.round(I * ease * 1.3)), ease: ease + 0.15 };
}

export function scheduleCard(
  prev: CardSchedule | undefined,
  rating: TrainerRating,
  now: Date,
): CardSchedule {
  const { days, ease } = nextInterval(prev, rating);
  const due = new Date(now.getTime() + (days === 0 ? RELEARN_MS : days * DAY_MS));
  return {
    ease: Math.round(ease * 100) / 100,
    intervalDays: days,
    reps: rating === 0 ? 0 : (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (rating === 0 && prev ? 1 : 0),
    due: due.toISOString(),
  };
}

export function formatInterval(days: number): string {
  if (days <= 0) return "< 1 Min";
  if (days === 1) return "1 Tag";
  if (days < 31) return `${days} Tage`;
  return `${Math.round(days / 30)} Mon.`;
}

/** Button labels for Nochmal / Schwer / Gut / Leicht given the current schedule. */
export function previewIntervals(prev: CardSchedule | undefined): [string, string, string, string] {
  return ([0, 1, 2, 3] as TrainerRating[]).map((r) => formatInterval(nextInterval(prev, r).days)) as [
    string,
    string,
    string,
    string,
  ];
}

export function isCardDue(schedule: CardSchedule | undefined, now: Date): boolean {
  if (!schedule) return true;
  return Date.parse(schedule.due) <= now.getTime();
}
