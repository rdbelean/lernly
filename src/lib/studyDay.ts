import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Berlin-local calendar date ("YYYY-MM-DD"). Mirrors berlinDate() in
// dashboard/review/actions.ts so the runtime write path matches the migration
// backfill ((ts at time zone 'Europe/Berlin')::date).
export function berlinDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

// Mark today (Berlin) as a study day for `userId`, incrementing the action
// count via the bump_study_day RPC. Fire-and-forget: NEVER throws — a failed
// write must not break a study session (same contract as recordCardReview /
// saveQuizAttempt). Takes the SERVICE client because bump_study_day is granted
// to service_role only (the caller has already authenticated the user).
export async function markStudyDay(
  svc: SupabaseClient,
  userId: string,
  now: Date,
): Promise<void> {
  const { error } = await svc.rpc("bump_study_day", {
    p_user: userId,
    p_day: berlinDay(now),
  });
  if (error) console.error("[markStudyDay] failed", error);
}
