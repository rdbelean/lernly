"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { computeNextReview, type Rating } from "@/lib/srs";

// =========================================================================
// recordCardReview — persists one flashcard rating into the SRS schedule.
// =========================================================================
// Called fire-and-forget by FlashcardDeck on every 3-stage rating. Mirrors
// saveQuizAttempt's contract: auth-gated, and NEVER throws — a failed write
// must not break the study session. Anonymous decks (landing/demo) pass no
// packId, so this is never reached for them; the auth gate is defense in depth.
// =========================================================================

/** Berlin-local calendar date ("YYYY-MM-DD"), for streak day-boundary logic. */
function berlinDate(d: Date): string {
  // en-CA renders ISO-style YYYY-MM-DD; the timeZone shifts to Europe/Berlin so
  // a late-night (post-midnight UTC) study session still counts as "today" for
  // a DACH student.
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

export async function recordCardReview(
  packId: string,
  cardId: string,
  rating: Rating,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // anonymous — nothing to persist

  const now = new Date();

  // Read the current schedule for this card (RLS-scoped). null on first rating.
  const { data: prev } = await supabase
    .from("card_reviews")
    .select("ease, interval_days, reps")
    .eq("user_id", user.id)
    .eq("pack_id", packId)
    .eq("card_id", cardId)
    .maybeSingle();

  const next = computeNextReview(
    prev
      ? {
          ease: prev.ease as number,
          intervalDays: prev.interval_days as number,
          reps: prev.reps as number,
        }
      : null,
    rating,
    now,
  );

  const { error } = await supabase.from("card_reviews").upsert(
    {
      user_id: user.id,
      pack_id: packId,
      card_id: cardId,
      ease: next.ease,
      interval_days: next.intervalDays,
      reps: next.reps,
      due_at: next.dueAt.toISOString(),
      last_rated_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id,pack_id,card_id" },
  );
  if (error) {
    // Don't throw — losing one rating mustn't break the deck.
    console.error("[recordCardReview] failed to persist", error);
  }

  await bumpStreak(user.id, now);
}

// Streak = consecutive Berlin-days with at least one rating. Only the first
// rating of a new day writes. Uses the service client scoped to the user's own
// id (we already authenticated above) so it doesn't depend on a users
// UPDATE-own RLS policy — the same pattern the app uses for user-row writes.
async function bumpStreak(userId: string, now: Date): Promise<void> {
  const today = berlinDate(now);
  const yesterday = berlinDate(new Date(now.getTime() - 86_400_000));
  const svc = createServiceClient();

  const { data: u, error: readErr } = await svc
    .from("users")
    .select("srs_streak, srs_last_review_date")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) {
    console.error("[recordCardReview] streak read failed", readErr);
    return;
  }

  const last = (u?.srs_last_review_date as string | null) ?? null;
  if (last === today) return; // already counted today

  const nextStreak = last === yesterday ? (u?.srs_streak ?? 0) + 1 : 1;
  const { error: writeErr } = await svc
    .from("users")
    .update({ srs_streak: nextStreak, srs_last_review_date: today })
    .eq("id", userId);
  if (writeErr) console.error("[recordCardReview] streak write failed", writeErr);
}
