"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deletePack(id: string) {
  const supabase = await createClient();
  // Explicit auth gate (defense-in-depth on top of RLS): never run the mutation
  // for an unauthenticated caller. RLS (study_packs_delete_own) still scopes the
  // delete to the owner's rows, so this can only ever delete the caller's pack.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Nicht angemeldet.");
  }
  const { error } = await supabase.from("study_packs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
}

// =========================================================================
// quiz attempt persistence — the retention loop
// =========================================================================
// Called by QuizView when the user hits "Alle Antworten prüfen". Records the
// attempt so weak topics survive across sessions and so future features (a
// real SRS scheduler, per-pack progress dashboards, "letztes Mal: Topic X
// schwach"-style hints) have data to build on. V1 doesn't display any of it
// — just writes — but architecting the persistence now is what makes the
// loop work later.

export type SaveQuizAttemptInput = {
  packId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  perTopic: Record<
    string,
    { correct: number; wrong: number; skipped: number }
  >;
  questionIds: string[];
  isRePractice: boolean;
};

export async function saveQuizAttempt(input: SaveQuizAttemptInput): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    // Silently skip — anonymous users see the breakdown UI but nothing to
    // persist against. Not an error; logged for visibility only.
    console.warn("[saveQuizAttempt] no auth user, skipping persistence");
    return;
  }
  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: data.user.id,
    pack_id: input.packId,
    total_questions: input.totalQuestions,
    correct_count: input.correctCount,
    wrong_count: input.wrongCount,
    skipped_count: input.skippedCount,
    per_topic: input.perTopic,
    question_ids: input.questionIds,
    is_re_practice: input.isRePractice,
  });
  if (error) {
    // Don't throw — failing to log an attempt mustn't break the user's flow.
    console.error("[saveQuizAttempt] failed to persist", error);
  }
}
