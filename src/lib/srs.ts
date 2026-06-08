// =========================================================================
// SM-2-lite — spaced-repetition scheduler
// =========================================================================
// Maps the flashcards' existing 3-stage rating onto an Anki-style interval
// schedule. Deliberately simple (a clean, debuggable SM-2 variant — not the
// full algorithm): the 3 buttons are the only input signal.
//
//   Nochmal  (again) → reps reset, ease down, due again ~1 day
//   Fast     (almost / "good") → reps+1, ease flat, first 3d then × ease
//   Kann ich (known / "easy") → reps+1, ease up, first 5d then × (ease+bonus)
//
// Pure + deterministic: the caller passes `now`, so the server action stays
// trivially testable and there is no hidden clock dependency.
// =========================================================================

/** interval_days >= this counts as "beherrscht" (mastered) for the pack hub. */
export const MASTERY_INTERVAL_DAYS = 7;

const EASE_DEFAULT = 2.5;
const EASE_MIN = 1.3;
const EASE_MAX = 3.0;

export type Rating = "again" | "almost" | "known";

export type ReviewState = {
  ease: number;
  intervalDays: number;
  reps: number;
  dueAt: Date;
};

/** Prior persisted state, or null for the very first rating of a card. */
export type PrevReview = {
  ease: number;
  intervalDays: number;
  reps: number;
} | null;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const addDays = (now: Date, days: number) =>
  new Date(now.getTime() + days * 86_400_000);

/**
 * Compute the next review state from the previous state and a rating.
 * `now` is the moment of rating; the returned `dueAt` is relative to it.
 */
export function computeNextReview(
  prev: PrevReview,
  rating: Rating,
  now: Date,
): ReviewState {
  const ease = prev?.ease ?? EASE_DEFAULT;
  const intervalDays = prev?.intervalDays ?? 0;
  const reps = prev?.reps ?? 0;

  if (rating === "again") {
    // Lapse: drop ease a notch, reset the streak of successful reps, and make
    // the card due again tomorrow. (In-session repetition is handled by the
    // deck's existing "Nur falsche wiederholen" loop.)
    return {
      ease: clamp(ease - 0.2, EASE_MIN, EASE_MAX),
      intervalDays: 1,
      reps: 0,
      dueAt: addDays(now, 1),
    };
  }

  if (rating === "almost") {
    // Good: ease unchanged. First success = 3 days, then grow by ease.
    const nextInterval =
      reps === 0 ? 3 : Math.max(3, Math.round(intervalDays * ease));
    return {
      ease,
      intervalDays: nextInterval,
      reps: reps + 1,
      dueAt: addDays(now, nextInterval),
    };
  }

  // known — Easy: nudge ease up. First success = 5 days, then grow by a bonus.
  const nextEase = clamp(ease + 0.05, EASE_MIN, EASE_MAX);
  const nextInterval =
    reps === 0 ? 5 : Math.max(5, Math.round(intervalDays * (nextEase + 0.15)));
  return {
    ease: nextEase,
    intervalDays: nextInterval,
    reps: reps + 1,
    dueAt: addDays(now, nextInterval),
  };
}
